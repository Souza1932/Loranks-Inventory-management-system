package com.estoque.demo.controller;

import com.estoque.demo.dto.BuscarPerguntaSegurancaRequest;
import com.estoque.demo.dto.RedefinirSenhaRequest;
import com.estoque.demo.dto.VerificarRespostaSegurancaRequest;
import com.estoque.demo.service.RecuperacaoSenhaService;
import jakarta.validation.Valid;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/*
 * Fluxo de "esqueci minha senha" chamado por esqueci-senha.html, em tres
 * etapas (o sistema nao coleta e-mail - ver justificativa completa em
 * RecuperacaoSenhaService):
 *
 *   POST /api/auth/recuperar-senha/pergunta            { usuario }
 *     -> 200 { pergunta }  ou 404 { erro }
 *
 *   POST /api/auth/recuperar-senha/verificar-resposta  { usuario, resposta }
 *     -> 200 (vazio)  ou 401 { erro }  ou 404 { erro }  ou 429 { erro }
 *     So confere a resposta e libera (ou nega) a tela de nova senha - nao
 *     alcanca a senha em si. Chamado pelo botao "Confirmar".
 *
 *   POST /api/auth/recuperar-senha/redefinir           { usuario, resposta, novaSenha }
 *     -> 200 (vazio)  ou 401 { erro }  ou 429 { erro }
 *     Reconfere a resposta (nunca confia so na chamada anterior) e, se
 *     bater, grava a nova senha.
 *
 * Mesmas praticas de AutenticacaoApiController: validacao Bean Validation
 * no servidor, nenhuma senha/resposta logada ou devolvida ao cliente,
 * codigos HTTP como constantes.
 */
@RestController
@RequestMapping("/api/auth/recuperar-senha")
public class RecuperacaoSenhaApiController {

    private static final String CAMPO_ERRO = "erro";
    private static final Logger log = LoggerFactory.getLogger(RecuperacaoSenhaApiController.class);

    private final RecuperacaoSenhaService recuperacaoSenhaService;

    public RecuperacaoSenhaApiController(RecuperacaoSenhaService recuperacaoSenhaService) {
        this.recuperacaoSenhaService = recuperacaoSenhaService;
    }

    @PostMapping("/pergunta")
    public ResponseEntity<?> buscarPergunta(@Valid @RequestBody BuscarPerguntaSegurancaRequest request) {
        RecuperacaoSenhaService.RespostaPergunta resposta =
                recuperacaoSenhaService.buscarPergunta(request.usuario());

        return switch (resposta.resultado()) {
            case ENCONTRADA -> ResponseEntity.ok(Map.of("pergunta", resposta.pergunta()));
            case USUARIO_NAO_ENCONTRADO -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(CAMPO_ERRO, "Usuário não encontrado."));
            case SEM_PERGUNTA_CADASTRADA -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(CAMPO_ERRO,
                            "Esta conta não tem pergunta de segurança cadastrada. Fale com o administrador do sistema."));
        };
    }

    @PostMapping("/verificar-resposta")
    public ResponseEntity<?> verificarResposta(@Valid @RequestBody VerificarRespostaSegurancaRequest request) {
        RecuperacaoSenhaService.ResultadoVerificacao resultado =
                recuperacaoSenhaService.verificarResposta(request.usuario(), request.resposta());

        return switch (resultado) {
            case CORRETA -> ResponseEntity.ok().build();
            case USUARIO_NAO_ENCONTRADO -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(CAMPO_ERRO, "Usuário não encontrado."));
            case SEM_PERGUNTA_CADASTRADA -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(CAMPO_ERRO,
                            "Esta conta não tem pergunta de segurança cadastrada. Fale com o administrador do sistema."));
            case RESPOSTA_INCORRETA -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(CAMPO_ERRO, "Resposta incorreta."));
            case BLOQUEADO_TEMPORARIAMENTE -> ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of(CAMPO_ERRO, "Muitas tentativas incorretas. Tente novamente em alguns minutos."));
        };
    }

    @PostMapping("/redefinir")
    public ResponseEntity<?> redefinir(@Valid @RequestBody RedefinirSenhaRequest request) {
        log.info("POST /api/auth/recuperar-senha/redefinir recebido: {}", request);

        RecuperacaoSenhaService.ResultadoRedefinicao resultado = recuperacaoSenhaService
                .verificarRespostaERedefinir(request.usuario(), request.resposta(), request.novaSenha());

        return switch (resultado) {
            case SUCESSO -> ResponseEntity.ok().build();
            case USUARIO_NAO_ENCONTRADO -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(CAMPO_ERRO, "Usuário não encontrado."));
            case SEM_PERGUNTA_CADASTRADA -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(CAMPO_ERRO,
                            "Esta conta não tem pergunta de segurança cadastrada. Fale com o administrador do sistema."));
            case RESPOSTA_INCORRETA -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(CAMPO_ERRO, "Resposta incorreta."));
            case BLOQUEADO_TEMPORARIAMENTE -> ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of(CAMPO_ERRO, "Muitas tentativas incorretas. Tente novamente em alguns minutos."));
        };
    }
}
