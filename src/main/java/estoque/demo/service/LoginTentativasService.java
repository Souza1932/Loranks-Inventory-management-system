package com.estoque.demo.service;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

/*
 * Protecao de forca bruta para POST /api/auth/login - MESMO padrao (limite
 * de tentativas + bloqueio temporario) ja usado em PrivilegioService e
 * RecuperacaoSenhaService (MAX_TENTATIVAS/BLOQUEIO_MINUTOS identicos, de
 * proposito - um unico "numero certo" para o sistema todo, nao um valor
 * arbitrario novo so para o login). Chaveado pelo USUARIO INFORMADO no
 * corpo do login: diferente de PrivilegioService (que chaveia por
 * usuarioAtuando, ja autenticado), aqui quem chama ainda nao provou nada,
 * entao o unico identificador disponivel e o login que ele digitou.
 *
 * LIMITACAO CONHECIDA (mesma natureza da ja documentada em
 * RecuperacaoSenhaService): por ser chaveado pelo login tentado, alguem que
 * saiba um usuario valido pode "trancar" essa conta de proposito por
 * BLOQUEIO_MINUTOS so errando a senha MAX_TENTATIVAS vezes - nega o acesso
 * ao dono legitimo, sem nunca precisar acertar a senha (um DoS
 * direcionado, nao uma quebra de confidencialidade). E a mesma troca que
 * qualquer politica classica de "lockout por usuario" aceita. A alternativa
 * seria chavear por IP (evita o lockout direcionado, mas um atacante
 * distribuido por varios IPs volta a nao ter limite nenhum) ou por
 * usuario+IP combinados - fica como evolucao futura se isso virar um
 * problema real; por ora, o objetivo aqui e so fechar a lacuna mais obvia
 * (login sem limite NENHUM de tentativas).
 *
 * Contador em memoria (ConcurrentHashMap) - mesma ressalva de escala das
 * outras duas classes: nao sobrevive a reinicio do processo nem e
 * compartilhado entre instancias, se a aplicacao um dia rodar em mais de
 * uma. Suficiente para um unico servidor.
 */
@Service
public class LoginTentativasService {

    private static final int MAX_TENTATIVAS = 5;
    private static final long BLOQUEIO_MINUTOS = 15;

    private final ConcurrentHashMap<String, TentativasInfo> tentativasPorUsuario = new ConcurrentHashMap<>();

    private static final class TentativasInfo {
        int quantidade = 0;
        Instant bloqueadoAte = null;
    }

    /**
     * Chamado ANTES de tentar autenticar - se true, a tentativa nem chega a
     * validar usuario/senha (evita continuar "gastando" tentativas de
     * adivinhacao contra uma conta ja bloqueada, e responde mais rapido).
     */
    public boolean estaBloqueado(String usuario) {
        TentativasInfo tentativas = obterOuCriar(usuario);
        synchronized (tentativas) {
            if (tentativas.bloqueadoAte == null) {
                return false;
            }
            if (Instant.now().isBefore(tentativas.bloqueadoAte)) {
                return true;
            }
            // Janela de bloqueio expirou: reseta o contador para este usuario.
            tentativas.quantidade = 0;
            tentativas.bloqueadoAte = null;
            return false;
        }
    }

    /** Login confirmado pelo AuthenticationManager: zera o contador deste usuario. */
    public void registrarSucesso(String usuario) {
        TentativasInfo tentativas = obterOuCriar(usuario);
        synchronized (tentativas) {
            tentativas.quantidade = 0;
            tentativas.bloqueadoAte = null;
        }
    }

    /** Usuario ou senha invalidos: conta mais uma tentativa errada, bloqueando ao atingir o limite. */
    public void registrarFalha(String usuario) {
        TentativasInfo tentativas = obterOuCriar(usuario);
        synchronized (tentativas) {
            tentativas.quantidade++;
            if (tentativas.quantidade >= MAX_TENTATIVAS) {
                tentativas.bloqueadoAte = Instant.now().plusSeconds(BLOQUEIO_MINUTOS * 60);
            }
        }
    }

    private TentativasInfo obterOuCriar(String usuario) {
        return tentativasPorUsuario.computeIfAbsent(normalizar(usuario), k -> new TentativasInfo());
    }

    // trim + minusculas: mesma normalizacao usada em RecuperacaoSenhaService,
    // para "Ana" e "ana" contarem como a MESMA chave de bloqueio (o login em
    // si ja e tratado sem distincao de caixa no restante do sistema).
    // Nulo (corpo malformado) cai numa unica chave "" compartilhada - pior
    // caso e um bloqueio compartilhado entre requisicoes sem usuario nenhum,
    // nunca uma excecao.
    private String normalizar(String usuario) {
        return usuario == null ? "" : usuario.trim().toLowerCase();
    }
}
