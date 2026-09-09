package com.estoque.demo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.estoque.demo.dto.MovimentacaoHistoricoResponse;
import com.estoque.demo.dto.MovimentacaoResultadoResponse;
import com.estoque.demo.exception.ProdutoNaoEncontradoException;
import com.estoque.demo.model.CadastroProduto;
import com.estoque.demo.model.EstoqueMaximo;
import com.estoque.demo.model.EstoqueMinimo;
import com.estoque.demo.model.MovimentacaoEstoque;
import com.estoque.demo.model.TipoMovimentacao;
import com.estoque.demo.repository.CadastroProdutoRepository;
import com.estoque.demo.repository.EstoqueMaximoRepository;
import com.estoque.demo.repository.EstoqueMinimoRepository;
import com.estoque.demo.repository.MovimentacaoEstoqueRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * Cobre a regra de negócio mais sensível do sistema: registrar uma
 * movimentação de estoque tem que atualizar a quantidade do produto e
 * rejeitar saídas que ultrapassem o estoque atual, sem deixar o banco
 * inconsistente (ver comentário no topo de MovimentacaoService).
 */
@ExtendWith(MockitoExtension.class)
class MovimentacaoServiceTest {

    @Mock
    private CadastroProdutoRepository produtoRepository;
    @Mock
    private MovimentacaoEstoqueRepository movimentacaoRepository;
    @Mock
    private EstoqueMinimoRepository estoqueMinimoRepository;
    @Mock
    private EstoqueMaximoRepository estoqueMaximoRepository;

    private MovimentacaoService service;

    @BeforeEach
    void configurar() {
        service = new MovimentacaoService(produtoRepository, movimentacaoRepository,
                estoqueMinimoRepository, estoqueMaximoRepository);
    }

    private CadastroProduto produtoComQuantidade(long id, int quantidade) {
        CadastroProduto produto = new CadastroProduto();
        produto.setId(id);
        produto.setNomeProduto("Produto de teste");
        produto.setQuantidade(quantidade);
        return produto;
    }

    @Test
    void registrarMovimentacao_quantidadeZero_retornaFalhaSemConsultarProduto() {
        MovimentacaoResultadoResponse resultado = service.registrarMovimentacao(1L, TipoMovimentacao.ENTRADA, 0);

        assertThat(resultado.sucesso()).isFalse();
        assertThat(resultado.mensagemErro()).isNotBlank();
        verifyNoInteractions(produtoRepository, movimentacaoRepository);
    }

    @Test
    void registrarMovimentacao_quantidadeNegativa_retornaFalhaSemConsultarProduto() {
        MovimentacaoResultadoResponse resultado = service.registrarMovimentacao(1L, TipoMovimentacao.ENTRADA, -3);

        assertThat(resultado.sucesso()).isFalse();
        verifyNoInteractions(produtoRepository, movimentacaoRepository);
    }

    @Test
    void registrarMovimentacao_produtoNaoEncontrado_retornaFalha() {
        when(produtoRepository.findById(99L)).thenReturn(Optional.empty());

        MovimentacaoResultadoResponse resultado = service.registrarMovimentacao(99L, TipoMovimentacao.ENTRADA, 5);

        assertThat(resultado.sucesso()).isFalse();
        assertThat(resultado.mensagemErro()).isNotBlank();
        verify(movimentacaoRepository, never()).save(any());
    }

    @Test
    void registrarMovimentacao_entrada_aumentaQuantidadeERegistraHistorico() {
        CadastroProduto produto = produtoComQuantidade(1L, 10);
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(produto));
        when(estoqueMinimoRepository.findByProduto_Id(1L)).thenReturn(Optional.empty());
        when(estoqueMaximoRepository.findByProduto_Id(1L)).thenReturn(Optional.empty());

        MovimentacaoResultadoResponse resultado = service.registrarMovimentacao(1L, TipoMovimentacao.ENTRADA, 5);

        assertThat(resultado.sucesso()).isTrue();
        assertThat(resultado.quantidadeAtual()).isEqualTo(15);
        assertThat(produto.getQuantidade()).isEqualTo(15);
        verify(produtoRepository).save(produto);
        verify(movimentacaoRepository).save(any(MovimentacaoEstoque.class));
    }

    @Test
    void registrarMovimentacao_saidaComEstoqueSuficiente_diminuiQuantidade() {
        CadastroProduto produto = produtoComQuantidade(1L, 10);
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(produto));
        when(estoqueMinimoRepository.findByProduto_Id(1L)).thenReturn(Optional.empty());
        when(estoqueMaximoRepository.findByProduto_Id(1L)).thenReturn(Optional.empty());

        MovimentacaoResultadoResponse resultado = service.registrarMovimentacao(1L, TipoMovimentacao.SAIDA, 4);

        assertThat(resultado.sucesso()).isTrue();
        assertThat(resultado.quantidadeAtual()).isEqualTo(6);
        verify(produtoRepository).save(produto);
        verify(movimentacaoRepository).save(any(MovimentacaoEstoque.class));
    }

    @Test
    void registrarMovimentacao_saidaComEstoqueInsuficiente_rejeitaSemAlterarNada() {
        CadastroProduto produto = produtoComQuantidade(1L, 3);
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(produto));

        MovimentacaoResultadoResponse resultado = service.registrarMovimentacao(1L, TipoMovimentacao.SAIDA, 5);

        assertThat(resultado.sucesso()).isFalse();
        assertThat(resultado.mensagemErro()).isNotBlank();
        assertThat(produto.getQuantidade()).isEqualTo(3); // inalterado
        verify(produtoRepository, never()).save(any());
        verify(movimentacaoRepository, never()).save(any());
    }

    @Test
    void registrarMovimentacao_saidaIgualAoEstoqueAtual_ePermitida() {
        // Zerar o estoque via saída é o caminho oficial pra "descontinuar"
        // um produto sem excluí-lo (ver ProdutoComMovimentacoesException) -
        // saída == estoque atual precisa ser aceita, não só saída < atual.
        CadastroProduto produto = produtoComQuantidade(1L, 5);
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(produto));
        when(estoqueMinimoRepository.findByProduto_Id(1L)).thenReturn(Optional.empty());
        when(estoqueMaximoRepository.findByProduto_Id(1L)).thenReturn(Optional.empty());

        MovimentacaoResultadoResponse resultado = service.registrarMovimentacao(1L, TipoMovimentacao.SAIDA, 5);

        assertThat(resultado.sucesso()).isTrue();
        assertThat(resultado.quantidadeAtual()).isZero();
    }

    @Test
    void registrarMovimentacao_saidaQueDeixaEstoqueAbaixoDoMinimo_retornaAlertaCritico() {
        CadastroProduto produto = produtoComQuantidade(1L, 10);
        // EstoqueMinimo real (não mockado) associado ao MESMO objeto
        // produto - isEstoqueCritico() reage sozinho à quantidade
        // atualizada por registrarMovimentacao(), sem precisar simular
        // isso manualmente.
        EstoqueMinimo minimo = new EstoqueMinimo(produto, 8, 8);
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(produto));
        when(estoqueMinimoRepository.findByProduto_Id(1L)).thenReturn(Optional.of(minimo));
        when(estoqueMaximoRepository.findByProduto_Id(1L)).thenReturn(Optional.empty());

        MovimentacaoResultadoResponse resultado = service.registrarMovimentacao(1L, TipoMovimentacao.SAIDA, 5);

        assertThat(resultado.sucesso()).isTrue();
        assertThat(resultado.quantidadeAtual()).isEqualTo(5);
        assertThat(resultado.estoqueCritico()).isTrue();
        assertThat(resultado.estoqueSuperlotado()).isFalse();
        assertThat(resultado.alertaCritico()).contains("Produto de teste");
        assertThat(resultado.alertaSuperlotado()).isNull();
    }

    @Test
    void registrarMovimentacao_entradaQueDeixaEstoqueAcimaDoMaximo_retornaAlertaSuperlotado() {
        CadastroProduto produto = produtoComQuantidade(1L, 90);
        EstoqueMaximo maximo = new EstoqueMaximo(produto, 100);
        when(produtoRepository.findById(1L)).thenReturn(Optional.of(produto));
        when(estoqueMinimoRepository.findByProduto_Id(1L)).thenReturn(Optional.empty());
        when(estoqueMaximoRepository.findByProduto_Id(1L)).thenReturn(Optional.of(maximo));

        MovimentacaoResultadoResponse resultado = service.registrarMovimentacao(1L, TipoMovimentacao.ENTRADA, 20);

        assertThat(resultado.estoqueSuperlotado()).isTrue();
        assertThat(resultado.alertaSuperlotado()).contains("Produto de teste");
    }

    @Test
    void consultarHistoricoPorProduto_produtoInexistente_lancaExcecao() {
        when(produtoRepository.existsById(404L)).thenReturn(false);

        assertThatThrownBy(() -> service.consultarHistoricoPorProduto(404L))
                .isInstanceOf(ProdutoNaoEncontradoException.class);
    }

    @Test
    void consultarHistoricoPorProduto_retornaExtratoMapeadoDoRepositorio() {
        CadastroProduto produto = produtoComQuantidade(1L, 10);
        MovimentacaoEstoque entrada = new MovimentacaoEstoque(produto, TipoMovimentacao.ENTRADA, 10);
        MovimentacaoEstoque saida = new MovimentacaoEstoque(produto, TipoMovimentacao.SAIDA, 3);

        when(produtoRepository.existsById(1L)).thenReturn(true);
        when(movimentacaoRepository.findByProduto_IdOrderByDataMovimentacaoDesc(1L))
                .thenReturn(List.of(saida, entrada));

        List<MovimentacaoHistoricoResponse> historico = service.consultarHistoricoPorProduto(1L);

        assertThat(historico).hasSize(2);
        assertThat(historico.get(0).tipo()).isEqualTo(TipoMovimentacao.SAIDA);
        assertThat(historico.get(0).quantidade()).isEqualTo(3);
        assertThat(historico.get(1).tipo()).isEqualTo(TipoMovimentacao.ENTRADA);
        assertThat(historico.get(1).quantidade()).isEqualTo(10);
        // dataMovimentacao precisa sair formatada (String), não como
        // objeto - e continuar parseável de volta pro mesmo instante.
        historico.forEach(item -> {
            assertThat(item.dataMovimentacao()).isNotBlank();
            assertThat(LocalDateTime.parse(item.dataMovimentacao())).isNotNull();
        });
    }

    @Test
    void avaliarStatusEstoque_semLimitesCadastrados_retornaNormalENenhumAlerta() {
        CadastroProduto produto = produtoComQuantidade(1L, 50);
        when(estoqueMinimoRepository.findByProduto_Id(1L)).thenReturn(Optional.empty());
        when(estoqueMaximoRepository.findByProduto_Id(1L)).thenReturn(Optional.empty());

        MovimentacaoResultadoResponse resultado = service.avaliarStatusEstoque(produto);

        assertThat(resultado.sucesso()).isTrue();
        assertThat(resultado.estoqueCritico()).isFalse();
        assertThat(resultado.estoqueSuperlotado()).isFalse();
        assertThat(resultado.alertaCritico()).isNull();
        assertThat(resultado.alertaSuperlotado()).isNull();
    }
}
