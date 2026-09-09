package com.estoque.demo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.estoque.demo.exception.ExclusaoDaPropriaContaException;
import com.estoque.demo.exception.SenhaPrivilegiosInvalidaException;
import com.estoque.demo.model.Cadastro;
import com.estoque.demo.repository.CadastroRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

/**
 * PrivilegioService é a única porta pra virar administrador no sistema -
 * ver comentário no topo da classe sobre por que isso exige uma segunda
 * senha (só do servidor) em vez de bastar estar logado. Esses testes
 * cobrem tanto o caminho feliz quanto o bloqueio por força bruta, que é a
 * parte fácil de quebrar sem perceber numa refatoração futura.
 */
@ExtendWith(MockitoExtension.class)
class PrivilegioServiceTest {

    private static final String SENHA_PRIVILEGIOS = "segredo-do-servidor";

    @Mock
    private CadastroRepository cadastroRepository;

    private PrivilegioService service;

    @BeforeEach
    void configurar() {
        service = new PrivilegioService(cadastroRepository, SENHA_PRIVILEGIOS);
    }

    @Test
    void atribuir_senhaCorreta_promoveUsuarioAlvo() {
        Cadastro alvo = new Cadastro();
        alvo.setUsuario("joao");
        when(cadastroRepository.findByUsuario("joao")).thenReturn(Optional.of(alvo));

        service.atribuir("admin-logado", "joao", true, SENHA_PRIVILEGIOS);

        assertThat(alvo.getAdministrador()).isTrue();
        verify(cadastroRepository).saveAndFlush(alvo);
    }

    @Test
    void atribuir_senhaCorreta_rebaixaUsuarioAlvo() {
        Cadastro alvo = new Cadastro();
        alvo.setUsuario("joao");
        alvo.setAdministrador(true);
        when(cadastroRepository.findByUsuario("joao")).thenReturn(Optional.of(alvo));

        service.atribuir("admin-logado", "joao", false, SENHA_PRIVILEGIOS);

        assertThat(alvo.getAdministrador()).isFalse();
    }

    @Test
    void atribuir_senhaErrada_lancaExcecaoENaoConsultaUsuarioAlvo() {
        assertThatThrownBy(() -> service.atribuir("admin-logado", "joao", true, "senha-errada"))
                .isInstanceOf(SenhaPrivilegiosInvalidaException.class);

        // A senha de privilégios é checada ANTES de sequer buscar o alvo -
        // não vaza se "joao" existe ou não pra quem não sabe o segredo.
        verify(cadastroRepository, never()).findByUsuario(anyString());
    }

    @Test
    void atribuir_usuarioAlvoNaoEncontrado_lancaUsernameNotFoundException() {
        when(cadastroRepository.findByUsuario("fulano")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.atribuir("admin-logado", "fulano", true, SENHA_PRIVILEGIOS))
                .isInstanceOf(UsernameNotFoundException.class);
    }

    @Test
    void atribuir_aposCincoTentativasErradas_bloqueiaMesmoComSenhaCorreta() {
        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> service.atribuir("atacante", "joao", true, "senha-errada"))
                    .isInstanceOf(SenhaPrivilegiosInvalidaException.class);
        }

        // 6ª tentativa, agora com a senha CERTA - deve continuar bloqueada,
        // porque o bloqueio é por quem está tentando (janela de 15min),
        // não zerado só por acertar a senha depois.
        assertThatThrownBy(() -> service.atribuir("atacante", "joao", true, SENHA_PRIVILEGIOS))
                .isInstanceOf(SenhaPrivilegiosInvalidaException.class);

        verify(cadastroRepository, never()).findByUsuario(anyString());
    }

    @Test
    void atribuir_tentativasErradasDeUsuariosDiferentes_naoSeMisturam() {
        // O contador é por "usuarioAtuando" - alguém errando a senha não
        // pode bloquear a tentativa de outra pessoa que sabe o segredo.
        assertThatThrownBy(() -> service.atribuir("atacante", "joao", true, "senha-errada"))
                .isInstanceOf(SenhaPrivilegiosInvalidaException.class);

        Cadastro alvo = new Cadastro();
        alvo.setUsuario("joao");
        when(cadastroRepository.findByUsuario("joao")).thenReturn(Optional.of(alvo));

        service.atribuir("outro-admin", "joao", true, SENHA_PRIVILEGIOS);

        assertThat(alvo.getAdministrador()).isTrue();
    }

    @Test
    void excluirConta_senhaCorreta_excluiContaAlvo() {
        Cadastro alvo = new Cadastro();
        alvo.setUsuario("joao");
        when(cadastroRepository.findByUsuario("joao")).thenReturn(Optional.of(alvo));

        service.excluirConta("admin-logado", "joao", SENHA_PRIVILEGIOS);

        verify(cadastroRepository).delete(alvo);
    }

    @Test
    void excluirConta_senhaErrada_lancaExcecaoENaoExclui() {
        assertThatThrownBy(() -> service.excluirConta("admin-logado", "joao", "senha-errada"))
                .isInstanceOf(SenhaPrivilegiosInvalidaException.class);

        verify(cadastroRepository, never()).findByUsuario(anyString());
        verify(cadastroRepository, never()).delete(any());
    }

    @Test
    void excluirConta_propriaConta_lancaExcecaoENaoExclui() {
        // "admin-logado" tentando excluir "admin-logado" - mesmo login,
        // já validado que a senha bate, ainda assim tem que ser bloqueado.
        Cadastro proprioUsuario = new Cadastro();
        proprioUsuario.setUsuario("admin-logado");
        when(cadastroRepository.findByUsuario("admin-logado")).thenReturn(Optional.of(proprioUsuario));

        assertThatThrownBy(() -> service.excluirConta("admin-logado", "admin-logado", SENHA_PRIVILEGIOS))
                .isInstanceOf(ExclusaoDaPropriaContaException.class);

        verify(cadastroRepository, never()).delete(any());
    }

    @Test
    void excluirConta_usuarioAlvoNaoEncontrado_lancaUsernameNotFoundException() {
        when(cadastroRepository.findByUsuario("fulano")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.excluirConta("admin-logado", "fulano", SENHA_PRIVILEGIOS))
                .isInstanceOf(UsernameNotFoundException.class);
    }

    @Test
    void excluirConta_compartilhaContadorDeTentativasComAtribuir() {
        // Mesmo contador (chaveado por usuarioAtuando) usado nos dois
        // métodos - 5 tentativas erradas em excluirConta também bloqueiam
        // uma chamada seguinte a atribuir(), e vice-versa.
        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> service.excluirConta("atacante-2", "joao", "senha-errada"))
                    .isInstanceOf(SenhaPrivilegiosInvalidaException.class);
        }

        assertThatThrownBy(() -> service.atribuir("atacante-2", "joao", true, SENHA_PRIVILEGIOS))
                .isInstanceOf(SenhaPrivilegiosInvalidaException.class);
    }
}
