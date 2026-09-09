package com.estoque.demo.controller;

import com.estoque.demo.dto.CadastroUsuarioRequest;
import com.estoque.demo.model.Cadastro;
import com.estoque.demo.repository.CadastroRepository;
import com.estoque.demo.service.LoginTentativasService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/*
 * Espelha exatamente o contrato descrito nos comentarios TODO(integracao) de
 * autenticacao.js (index.html / dashboard):
 *
 *   POST /api/auth/login    { usuario, senha }              -> 200 { nomeUsuario }  ou 401/429
 *   POST /api/auth/cadastro { nomeCompleto, usuario, senha } -> 201 (vazio)          ou 400/409
 *
 * /login tem limite de tentativas por usuario (ver LoginTentativasService,
 * mesmo padrao de PrivilegioService/RecuperacaoSenhaService): 5 erradas
 * seguidas bloqueiam por 15 min, respondendo 429 mesmo com usuario/senha
 * corretos enquanto o bloqueio durar.
 *
 * Diferente do formLogin (/login, Thymeleaf, ja existente para
 * compatibilidade), aqui a autenticacao acontece via JSON e a sessao HTTP
 * resultante e a MESMA usada pelo resto da API (/api/estoque/**, /api/perfil) -
 * nao ha token separado, o cookie de sessao do Spring ja basta.
 *
 * Praticas de seguranca aplicadas (Oracle Secure Coding Guidelines for
 * Java SE - https://www.oracle.com/java/technologies/javase/seccodeguide.html):
 *  - Guideline 2-2 (Defend in depth): toda entrada e revalidada no servidor
 *    via Bean Validation (@Valid em CadastroUsuarioRequest), independente
 *    do que o cliente (criar-conta.js) ja validou.
 *  - Nenhuma senha, hash ou stack trace e devolvido ao cliente ou logado;
 *    as respostas de erro trazem só uma mensagem curta e generica.
 *  - Codigos HTTP expressos como constantes (HttpStatus), nao "magic numbers".
 *  - A checagem de usuario duplicado (findByUsuario) e best-effort: a
 *    garantia real vem da UNIQUE CONSTRAINT em Cadastro.usuario; uma
 *    condicao de corrida entre duas requisicoes concorrentes e tratada
 *    capturando DataIntegrityViolationException, evitando um TOCTOU
 *    (check-then-act) que resultaria em erro 500 ao inves de 409.
 */
@RestController
@RequestMapping("/api/auth")
public class AutenticacaoApiController {

    private static final String CAMPO_ERRO = "erro";
    private static final Logger log = LoggerFactory.getLogger(AutenticacaoApiController.class);

    private final AuthenticationManager authenticationManager;
    private final CadastroRepository cadastroRepository;
    private final PasswordEncoder passwordEncoder;
    private final LoginTentativasService loginTentativasService;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

    public AutenticacaoApiController(AuthenticationManager authenticationManager,
                                      CadastroRepository cadastroRepository,
                                      PasswordEncoder passwordEncoder,
                                      LoginTentativasService loginTentativasService) {
        this.authenticationManager = authenticationManager;
        this.cadastroRepository = cadastroRepository;
        this.passwordEncoder = passwordEncoder;
        this.loginTentativasService = loginTentativasService;
    }

    // toString() sobrescrito para nao vazar a senha em log/excecao acidental
    // (mesma justificativa de CadastroUsuarioRequest).
    public record LoginRequest(String usuario, String senha) {
        @Override
        public String toString() {
            return "LoginRequest[usuario=%s, senha=****]".formatted(usuario);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request,
                                    HttpServletRequest servletRequest,
                                    HttpServletResponse servletResponse) {
        // Checagem de bloqueio ANTES de tentar autenticar - mesmo padrao de
        // limite de tentativas ja usado em PrivilegioService/
        // RecuperacaoSenhaService (ver LoginTentativasService para o porque
        // de faltar aqui antes e a limitacao conhecida desse tipo de lockout).
        if (loginTentativasService.estaBloqueado(request.usuario())) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of(CAMPO_ERRO, "Muitas tentativas incorretas. Tente novamente em alguns minutos."));
        }

        try {
            Authentication autenticacao = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.usuario(), request.senha()));

            SecurityContext contexto = SecurityContextHolder.createEmptyContext();
            contexto.setAuthentication(autenticacao);
            SecurityContextHolder.setContext(contexto);

            // Persiste o contexto na sessao HTTP - e essa mesma sessao (via
            // cookie JSESSIONID) que o restante da API vai reconhecer depois.
            securityContextRepository.saveContext(contexto, servletRequest, servletResponse);

            // Login confirmado: zera o contador de tentativas erradas deste
            // usuario (mesma logica de PrivilegioService apos senha correta).
            loginTentativasService.registrarSucesso(request.usuario());

            return ResponseEntity.ok(Map.of("nomeUsuario", autenticacao.getName()));
        } catch (BadCredentialsException ex) {
            // Conta como tentativa errada ANTES de responder - senao um
            // cliente que aborta a conexao logo apos o 401 (sem esperar o
            // corpo) nunca teria a falha contabilizada.
            loginTentativasService.registrarFalha(request.usuario());

            // Mensagem deliberadamente generica: nao revela se o problema foi
            // o usuario inexistente ou a senha errada (evita enumeracao de
            // contas validas por diferenca de resposta).
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(CAMPO_ERRO, "Usuário ou senha inválidos."));
        }
    }

    /*
     * Unico fluxo de criacao de conta do sistema (o antigo formulario
     * Thymeleaf em AutenticacaoController/cadastro-conta.html foi removido
     * por nao coletar pergunta/resposta de seguranca, deixando contas sem
     * forma de recuperar senha). Validacao de formato delegada a
     * CadastroUsuarioRequest (Bean Validation) para nao duplicar logica de
     * checagem manual aqui.
     */
    @PostMapping("/cadastro")
    @Transactional
    public ResponseEntity<?> cadastro(@Valid @RequestBody CadastroUsuarioRequest request) {
        // Log de diagnostico: nunca inclui a senha (CadastroUsuarioRequest.toString()
        // ja mascara isso). Se esta linha NAO aparecer no terminal ao submeter o
        // formulario, a requisicao nao esta chegando ao backend (problema no
        // navegador/rede, nao no Java).
        log.info("POST /api/auth/cadastro recebido: {}", request);

        String usuario = request.usuario().trim();
        String nomeCompleto = request.nomeCompleto().trim();

        if (cadastroRepository.findByUsuario(usuario).isPresent()) {
            log.info("Cadastro rejeitado: usuario '{}' ja existe.", usuario);
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(CAMPO_ERRO, "Este login de usuário já está em uso."));
        }

        try {
            Cadastro cadastro = new Cadastro();
            cadastro.setUsuario(usuario);
            cadastro.setNomeCompleto(nomeCompleto);
            // O hash Argon2id e gerado aqui; a String "senha" em si nunca e
            // persistida nem logada - so o hash resultante vai para o banco.
            cadastro.setSenha(passwordEncoder.encode(request.senha()));
            cadastro.setPerguntaSeguranca(request.perguntaSeguranca().trim());
            // Mesma normalizacao aplicada na verificacao (RecuperacaoSenhaService):
            // trim + minusculas ANTES de gerar o hash, para que a comparacao no
            // momento da recuperacao nao seja sensivel a caixa (ex.: "Rex" e "rex"
            // devem ser aceitos como a mesma resposta).
            String respostaNormalizada = request.respostaSeguranca().trim().toLowerCase();
            cadastro.setRespostaSegurancaHash(passwordEncoder.encode(respostaNormalizada));
            cadastroRepository.saveAndFlush(cadastro);
            log.info("Cadastro salvo com sucesso: id={}, usuario='{}'", cadastro.getId(), usuario);
        } catch (DataIntegrityViolationException ex) {
            // Corrida entre duas requisicoes concorrentes com o mesmo
            // "usuario": a checagem acima (findByUsuario) nao e atomica, mas
            // a UNIQUE CONSTRAINT do banco garante a integridade final -
            // aqui so traduzimos a violacao em uma resposta 409 apropriada
            // em vez de deixar um 500 generico chegar ao cliente.
            log.warn("Cadastro rejeitado por violacao de integridade (corrida concorrente) para usuario '{}'.", usuario);
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(CAMPO_ERRO, "Este login de usuário já está em uso."));
        }

        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}



















