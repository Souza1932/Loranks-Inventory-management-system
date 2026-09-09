package com.estoque.demo.service;

import com.estoque.demo.model.Cadastro;
import com.estoque.demo.repository.CadastroRepository;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/*
 * Fluxo de "esqueci minha senha" do Loranks: NAO usa e-mail (o sistema nao
 * coleta e-mail de ninguem - so login/usuario). Em vez disso, cada conta
 * define uma pergunta de seguranca de texto livre no cadastro
 * (CadastroUsuarioRequest.perguntaSeguranca/respostaSeguranca), e a resposta
 * e guardada com hash Argon2id (mesmo encoder da senha) - nunca em texto
 * puro.
 *
 * Por ser um mecanismo mais fraco que confirmacao por e-mail (a resposta
 * pode ser adivinhada por alguem que conheca a vitima), este service aplica
 * um limite de tentativas por usuario: MAX_TENTATIVAS respostas erradas
 * dentro da janela de BLOQUEIO_MINUTOS bloqueiam novas tentativas ate a
 * janela expirar. O contador fica em memoria (nao sobrevive a reinicio do
 * processo) - suficiente para um unico servidor; se o Loranks um dia rodar
 * em varias instancias, isso precisa virar uma tabela/Redis compartilhado.
 */
@Service
public class RecuperacaoSenhaService {

    private static final int MAX_TENTATIVAS = 5;
    private static final long BLOQUEIO_MINUTOS = 15;

    private final CadastroRepository cadastroRepository;
    private final PasswordEncoder passwordEncoder;

    // usuario (login) -> estado das tentativas de resposta
    private final ConcurrentHashMap<String, TentativasInfo> tentativasPorUsuario = new ConcurrentHashMap<>();

    private static final class TentativasInfo {
        int quantidade = 0;
        Instant bloqueadoAte = null;
    }

    public RecuperacaoSenhaService(CadastroRepository cadastroRepository, PasswordEncoder passwordEncoder) {
        this.cadastroRepository = cadastroRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public enum ResultadoPergunta {
        ENCONTRADA, USUARIO_NAO_ENCONTRADO, SEM_PERGUNTA_CADASTRADA
    }

    public record RespostaPergunta(ResultadoPergunta resultado, String pergunta) {
        public static RespostaPergunta de(ResultadoPergunta resultado) {
            return new RespostaPergunta(resultado, null);
        }
    }

    /**
     * Primeira etapa: dado o login, devolve a pergunta de seguranca
     * cadastrada (sem revelar a resposta, obviamente).
     *
     * IMPORTANTE (limitacao conhecida): diferente do fluxo por e-mail (que
     * sempre responde "ok" para nao revelar se a conta existe), aqui e
     * IMPOSSIVEL evitar essa revelacao - o cliente precisa saber que
     * pergunta mostrar. Ou seja, este endpoint inevitavelmente confirma se
     * um login existe ou nao no sistema. E uma troca aceita ao optar por
     * pergunta de seguranca em vez de e-mail; se isso for um problema,
     * a alternativa seria voltar a exigir e-mail.
     */
    public RespostaPergunta buscarPergunta(String usuario) {
        Optional<Cadastro> cadastro = cadastroRepository.findByUsuario(usuario.trim());
        if (cadastro.isEmpty()) {
            return RespostaPergunta.de(ResultadoPergunta.USUARIO_NAO_ENCONTRADO);
        }
        String pergunta = cadastro.get().getPerguntaSeguranca();
        if (pergunta == null || pergunta.isBlank()) {
            // Conta criada antes desta funcionalidade existir.
            return RespostaPergunta.de(ResultadoPergunta.SEM_PERGUNTA_CADASTRADA);
        }
        return new RespostaPergunta(ResultadoPergunta.ENCONTRADA, pergunta);
    }

    public enum ResultadoVerificacao {
        CORRETA, USUARIO_NAO_ENCONTRADO, SEM_PERGUNTA_CADASTRADA, RESPOSTA_INCORRETA, BLOQUEADO_TEMPORARIAMENTE
    }

    /**
     * Segunda etapa (nova, isolada): SÓ confere se a resposta bate com o
     * hash guardado - não mexe na senha. É o que o botão "Confirmar" da
     * tela de recuperação chama, para liberar (ou negar) o acesso aos
     * campos de nova senha antes do usuário digitar qualquer coisa neles.
     *
     * Compartilha o mesmo contador de tentativas/bloqueio de
     * verificarRespostaERedefinir (mesmo ConcurrentHashMap, chave = usuario)
     * - ou seja, tentativas erradas aqui TAMBÉM contam para o bloqueio de
     * 15 min, senão esse botão vira uma forma de tentar a resposta sem
     * limite antes de ir para a etapa final.
     */
    public ResultadoVerificacao verificarResposta(String usuarioLogin, String resposta) {
        String usuario = usuarioLogin.trim();

        TentativasInfo tentativas = obterOuCriarTentativas(usuario);
        synchronized (tentativas) {
            if (estaBloqueado(tentativas)) {
                return ResultadoVerificacao.BLOQUEADO_TEMPORARIAMENTE;
            }
        }

        Optional<Cadastro> cadastroOpt = cadastroRepository.findByUsuario(usuario);
        if (cadastroOpt.isEmpty()) {
            return ResultadoVerificacao.USUARIO_NAO_ENCONTRADO;
        }

        String hashArmazenado = cadastroOpt.get().getRespostaSegurancaHash();
        if (hashArmazenado == null || hashArmazenado.isBlank()) {
            return ResultadoVerificacao.SEM_PERGUNTA_CADASTRADA;
        }

        if (!respostaBate(resposta, hashArmazenado)) {
            registrarTentativaErrada(tentativas);
            return ResultadoVerificacao.RESPOSTA_INCORRETA;
        }

        // Resposta correta: NÃO reseta o contador aqui de proposito. Só a
        // troca de senha de fato (verificarRespostaERedefinir) reseta,
        // porque é o único ponto que realmente "consome" a recuperação -
        // assim, mesmo confirmando a resposta certa, quem não completar a
        // troca de senha continua sujeito ao limite de tentativas.
        return ResultadoVerificacao.CORRETA;
    }

    public enum ResultadoRedefinicao {
        SUCESSO, USUARIO_NAO_ENCONTRADO, SEM_PERGUNTA_CADASTRADA, RESPOSTA_INCORRETA, BLOQUEADO_TEMPORARIAMENTE
    }

    /**
     * Etapa final: reconfirma a resposta (nunca confia apenas na validação
     * anterior de verificarResposta, que rodou numa requisição separada e
     * pode ter sido pulada/forjada pelo cliente) e, se bater, já grava a
     * nova senha (hash Argon2id) na mesma transação.
     */
    @Transactional
    public ResultadoRedefinicao verificarRespostaERedefinir(String usuarioLogin, String resposta, String novaSenha) {
        String usuario = usuarioLogin.trim();

        TentativasInfo tentativas = obterOuCriarTentativas(usuario);
        synchronized (tentativas) {
            if (estaBloqueado(tentativas)) {
                return ResultadoRedefinicao.BLOQUEADO_TEMPORARIAMENTE;
            }
        }

        Optional<Cadastro> cadastroOpt = cadastroRepository.findByUsuario(usuario);
        if (cadastroOpt.isEmpty()) {
            return ResultadoRedefinicao.USUARIO_NAO_ENCONTRADO;
        }

        Cadastro cadastro = cadastroOpt.get();
        String hashArmazenado = cadastro.getRespostaSegurancaHash();
        if (hashArmazenado == null || hashArmazenado.isBlank()) {
            return ResultadoRedefinicao.SEM_PERGUNTA_CADASTRADA;
        }

        if (!respostaBate(resposta, hashArmazenado)) {
            registrarTentativaErrada(tentativas);
            return ResultadoRedefinicao.RESPOSTA_INCORRETA;
        }

        // Resposta correta: agora sim reseta o contador de tentativas e
        // grava a nova senha.
        synchronized (tentativas) {
            tentativas.quantidade = 0;
            tentativas.bloqueadoAte = null;
        }
        cadastro.setSenha(passwordEncoder.encode(novaSenha));
        cadastroRepository.saveAndFlush(cadastro);

        return ResultadoRedefinicao.SUCESSO;
    }

    private TentativasInfo obterOuCriarTentativas(String usuario) {
        return tentativasPorUsuario.computeIfAbsent(usuario, k -> new TentativasInfo());
    }

    /** Deve ser chamado dentro de synchronized(tentativas). */
    private boolean estaBloqueado(TentativasInfo tentativas) {
        if (tentativas.bloqueadoAte == null) {
            return false;
        }
        if (Instant.now().isBefore(tentativas.bloqueadoAte)) {
            return true;
        }
        // Janela de bloqueio expirou: reseta o contador para essa conta.
        tentativas.quantidade = 0;
        tentativas.bloqueadoAte = null;
        return false;
    }

    private void registrarTentativaErrada(TentativasInfo tentativas) {
        synchronized (tentativas) {
            tentativas.quantidade++;
            if (tentativas.quantidade >= MAX_TENTATIVAS) {
                tentativas.bloqueadoAte = Instant.now().plusSeconds(BLOQUEIO_MINUTOS * 60);
            }
        }
    }

    /** Mesma normalizacao usada ao gravar a resposta no cadastro (trim + minusculas). */
    private boolean respostaBate(String respostaDigitada, String hashArmazenado) {
        String respostaNormalizada = respostaDigitada.trim().toLowerCase();
        return passwordEncoder.matches(respostaNormalizada, hashArmazenado);
    }
}
