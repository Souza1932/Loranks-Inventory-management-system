package com.estoque.demo.service;

import com.estoque.demo.exception.ExclusaoDaPropriaContaException;
import com.estoque.demo.exception.SenhaPrivilegiosInvalidaException;
import com.estoque.demo.model.Cadastro;
import com.estoque.demo.repository.CadastroRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/*
 * Ações administrativas sensíveis sobre contas de usuário: promover/
 * rebaixar administrador e excluir uma conta. A ideia central: qualquer
 * uma delas exige uma SEGUNDA senha (app.seguranca.senha-privilegios,
 * configurada só no servidor - nunca salva no cadastro de ninguém),
 * separada da senha de login. Isso evita o problema óbvio de "quem pode
 * conceder admin (ou apagar uma conta)?": se bastasse já estar logado,
 * qualquer conta comprometida (ou qualquer funcionário) poderia se
 * autopromover ou apagar colegas. Com a senha de servidor, só quem tem
 * acesso à configuração do servidor consegue mexer nisso - inclusive para
 * o primeiro admin, sem precisar de acesso direto ao banco.
 *
 * Mesma proteção de tentativas usada em RecuperacaoSenhaService: aqui
 * chaveada pelo LOGIN DE QUEM ESTÁ TENTANDO (não pelo usuário alvo), já
 * que o que está sendo testado por força bruta é a senha de privilégios,
 * uma única senha compartilhada por todo o sistema.
 */
@Service
public class PrivilegioService {

    private static final int MAX_TENTATIVAS = 5;
    private static final long BLOQUEIO_MINUTOS = 15;

    private final CadastroRepository cadastroRepository;
    private final String senhaPrivilegios;

    private final ConcurrentHashMap<String, TentativasInfo> tentativasPorUsuario = new ConcurrentHashMap<>();

    private static final class TentativasInfo {
        int quantidade = 0;
        Instant bloqueadoAte = null;
    }

    public PrivilegioService(CadastroRepository cadastroRepository,
                              @Value("${app.seguranca.senha-privilegios}") String senhaPrivilegios) {
        this.cadastroRepository = cadastroRepository;
        this.senhaPrivilegios = senhaPrivilegios;
    }

    @Transactional(readOnly = true)
    public List<Cadastro> listarContas() {
        return cadastroRepository.findAll();
    }

    /**
     * @param usuarioAtuando login de quem está fazendo a chamada (para o
     *     limite de tentativas da senha de privilégios - ver classe acima)
     * @param usuarioAlvo login da conta que vai ser promovida/rebaixada
     */
    @Transactional
    public void atribuir(String usuarioAtuando, String usuarioAlvo, boolean administrador, String senhaInformada) {
        Cadastro cadastro = validarSenhaEBuscarAlvo(usuarioAtuando, usuarioAlvo, senhaInformada);
        cadastro.setAdministrador(administrador);
        cadastroRepository.saveAndFlush(cadastro);
    }

    /**
     * Exclui definitivamente a conta de um usuário - mesma senha de
     * servidor exigida por {@link #atribuir}, já que apagar uma conta é
     * pelo menos tão sensível quanto promovê-la (e reaproveita o MESMO
     * contador de tentativas, chaveado por usuarioAtuando: um ataque de
     * força bruta contra qualquer uma das duas ações consome o mesmo
     * limite). Bloqueia auto-exclusão (ver ExclusaoDaPropriaContaException)
     * - só depois de validar a senha, pra não vazar pra quem não sabe o
     * segredo se "usuarioAlvo" é ou não a própria conta de quem chamou.
     *
     * Não há nenhuma movimentação, produto ou outro registro vinculado a
     * uma conta de usuário (ver MovimentacaoEstoque - não guarda quem
     * registrou), então a exclusão aqui é definitiva mesmo, sem o mesmo
     * bloqueio de "tem histórico" que existe para produtos.
     */
    @Transactional
    public void excluirConta(String usuarioAtuando, String usuarioAlvo, String senhaInformada) {
        Cadastro cadastro = validarSenhaEBuscarAlvo(usuarioAtuando, usuarioAlvo, senhaInformada);

        if (usuarioAtuando.trim().equalsIgnoreCase(usuarioAlvo.trim())) {
            throw new ExclusaoDaPropriaContaException();
        }

        cadastroRepository.delete(cadastro);
    }

    /**
     * Passo comum a atribuir()/excluirConta(): checa bloqueio por
     * tentativas, valida a senha de privilégios (registrando/zerando a
     * tentativa conforme o resultado) e busca a conta alvo. Levantado para
     * fora dos dois métodos só depois que excluirConta precisou do mesmo
     * fluxo - evita reimplementar a checagem de bloqueio/senha duas vezes
     * de formas que puderiam divergir com o tempo.
     */
    private Cadastro validarSenhaEBuscarAlvo(String usuarioAtuando, String usuarioAlvo, String senhaInformada) {
        TentativasInfo tentativas = tentativasPorUsuario.computeIfAbsent(usuarioAtuando, k -> new TentativasInfo());

        synchronized (tentativas) {
            if (estaBloqueado(tentativas)) {
                throw new SenhaPrivilegiosInvalidaException();
            }
        }

        if (!senhaBate(senhaInformada)) {
            registrarTentativaErrada(tentativas);
            throw new SenhaPrivilegiosInvalidaException();
        }

        synchronized (tentativas) {
            tentativas.quantidade = 0;
            tentativas.bloqueadoAte = null;
        }

        return cadastroRepository.findByUsuario(usuarioAlvo.trim())
                .orElseThrow(() -> new UsernameNotFoundException("Usuario nao encontrado: " + usuarioAlvo));
    }

    private boolean estaBloqueado(TentativasInfo tentativas) {
        if (tentativas.bloqueadoAte == null) {
            return false;
        }
        if (Instant.now().isBefore(tentativas.bloqueadoAte)) {
            return true;
        }
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

    /**
     * Comparação em tempo constante (MessageDigest.isEqual) - evita que a
     * diferença de tempo de resposta entre "errou no primeiro caractere" e
     * "errou no último" vaze informação sobre a senha correta. Detalhe que
     * só importa de verdade num segredo comparado com frequência/exposto
     * remotamente, como este.
     */
    private boolean senhaBate(String senhaInformada) {
        byte[] esperado = senhaPrivilegios.getBytes(StandardCharsets.UTF_8);
        byte[] recebido = senhaInformada.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(esperado, recebido);
    }
}
