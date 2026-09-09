package com.estoque.demo.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.estoque.demo.dto.CadastroProdutoRequest;
import com.estoque.demo.dto.ProdutoAbaixoDoMinimoResponse;
import com.estoque.demo.dto.ProdutoCompletoResponse;
import com.estoque.demo.dto.ProdutoEmEstoqueResponse;
import com.estoque.demo.exception.ProdutoNaoEncontradoException;
import com.estoque.demo.model.CadastroProduto;
import com.estoque.demo.model.EstoqueMaximo;
import com.estoque.demo.model.EstoqueMinimo;
import com.estoque.demo.model.StatusEstoque;
import com.estoque.demo.repository.CadastroProdutoRepository;
import com.estoque.demo.repository.EstoqueMaximoRepository;
import com.estoque.demo.repository.EstoqueMinimoRepository;
import com.estoque.demo.repository.MovimentacaoEstoqueRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProdutoServiceTest {

    @Mock
    private CadastroProdutoRepository produtoRepository;
    @Mock
    private EstoqueMinimoRepository estoqueMinimoRepository;
    @Mock
    private EstoqueMaximoRepository estoqueMaximoRepository;
    @Mock
    private MovimentacaoEstoqueRepository movimentacaoEstoqueRepository;

    private ProdutoService service;

    @BeforeEach
    void montarService() {
        service = new ProdutoService(produtoRepository, estoqueMinimoRepository,
                estoqueMaximoRepository, movimentacaoEstoqueRepository);
    }

    private CadastroProdutoRequest requestPadrao(Double precoCusto, Double precoVenda,
                                                  Integer estoqueMinimo, Integer estoqueMaximo) {
        return new CadastroProdutoRequest(
                "Marca X",
                "Produto Teste",
                10,
                "COD-001",
                LocalDate.of(2026, 1, 1),
                "Tipo A",
                "Fornecedor Y",
                "un",
                precoCusto,
                precoVenda,
                estoqueMinimo,
                estoqueMaximo);
    }

    // ---------------------------------------------------------------
    // excluir()
    // ---------------------------------------------------------------
    @Nested
    class Excluir {

        @Test
        void produtoNaoEncontrado_lancaExcecaoENaoTocaEmNada() {
            when(produtoRepository.findById(1L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.excluir(1L))
                    .isInstanceOf(ProdutoNaoEncontradoException.class);

            verify(movimentacaoEstoqueRepository, never()).deleteByProduto_Id(anyLong());
            verify(produtoRepository, never()).delete(any());
        }

        /**
         * Comportamento atual (sem barreira nenhuma): mesmo um produto com
         * movimentacoes registradas e excluido normalmente - o historico
         * associado e apagado junto via deleteByProduto_Id, ja que
         * MovimentacaoEstoque.produto e uma FK NOT NULL sem cascade e o
         * DELETE do produto falharia por violacao de integridade se as
         * movimentacoes nao fossem removidas antes.
         */
        @Test
        void produtoComMovimentacoes_excluiProdutoEHistoricoJunto() {
            CadastroProduto produto = new CadastroProduto();
            produto.setId(1L);
            when(produtoRepository.findById(1L)).thenReturn(Optional.of(produto));
            when(estoqueMinimoRepository.findByProduto_Id(1L)).thenReturn(Optional.empty());
            when(estoqueMaximoRepository.findByProduto_Id(1L)).thenReturn(Optional.empty());

            service.excluir(1L);

            verify(movimentacaoEstoqueRepository).deleteByProduto_Id(1L);
            verify(produtoRepository).delete(produto);
        }

        @Test
        void produtoComLimitesCadastrados_removeEstoqueMinimoEMaximoTambem() {
            CadastroProduto produto = new CadastroProduto();
            produto.setId(2L);
            EstoqueMinimo minimo = new EstoqueMinimo(produto, 5, 5);
            EstoqueMaximo maximo = new EstoqueMaximo(produto, 100);

            when(produtoRepository.findById(2L)).thenReturn(Optional.of(produto));
            when(estoqueMinimoRepository.findByProduto_Id(2L)).thenReturn(Optional.of(minimo));
            when(estoqueMaximoRepository.findByProduto_Id(2L)).thenReturn(Optional.of(maximo));

            service.excluir(2L);

            verify(estoqueMinimoRepository).delete(minimo);
            verify(estoqueMaximoRepository).delete(maximo);
            verify(produtoRepository).delete(produto);
        }
    }

    // ---------------------------------------------------------------
    // cadastrar()
    // ---------------------------------------------------------------
    @Nested
    class Cadastrar {

        @Test
        void admin_gravaPrecoCustoESalvaProduto() {
            CadastroProdutoRequest request = requestPadrao(40.0, 60.0, 5, 50);
            when(produtoRepository.save(any(CadastroProduto.class)))
                    .thenAnswer(chamada -> chamada.getArgument(0));
            when(estoqueMinimoRepository.findByProduto_Id(0L)).thenReturn(Optional.empty());
            when(estoqueMaximoRepository.findByProduto_Id(0L)).thenReturn(Optional.empty());

            CadastroProduto resultado = service.cadastrar(request, true);

            assertThat(resultado.getNomeProduto()).isEqualTo("Produto Teste");
            assertThat(resultado.getPrecoCusto()).isEqualTo(40.0);
            assertThat(resultado.getPrecoVenda()).isEqualTo(60.0);
            verify(produtoRepository).save(any(CadastroProduto.class));
        }

        @Test
        void usuarioComum_nuncaGravaPrecoCusto() {
            CadastroProdutoRequest request = requestPadrao(40.0, 60.0, null, null);
            when(produtoRepository.save(any(CadastroProduto.class)))
                    .thenAnswer(chamada -> chamada.getArgument(0));

            CadastroProduto resultado = service.cadastrar(request, false);

            assertThat(resultado.getPrecoCusto()).isNull();
            // precoVenda e permitido para usuario comum no cadastro (ver
            // aplicarPrecoVenda): so a edicao tem a restricao adicional.
            assertThat(resultado.getPrecoVenda()).isEqualTo(60.0);
        }

        @Test
        void comLimitesInformados_criaEstoqueMinimoEMaximo() {
            CadastroProdutoRequest request = requestPadrao(40.0, 60.0, 5, 50);
            when(produtoRepository.save(any(CadastroProduto.class)))
                    .thenAnswer(chamada -> chamada.getArgument(0));
            when(estoqueMinimoRepository.findByProduto_Id(0L)).thenReturn(Optional.empty());
            when(estoqueMaximoRepository.findByProduto_Id(0L)).thenReturn(Optional.empty());

            service.cadastrar(request, true);

            ArgumentCaptor<EstoqueMinimo> minimoCapturado = ArgumentCaptor.forClass(EstoqueMinimo.class);
            verify(estoqueMinimoRepository).save(minimoCapturado.capture());
            assertThat(minimoCapturado.getValue().getEstoqueMinimo()).isEqualTo(5);

            ArgumentCaptor<EstoqueMaximo> maximoCapturado = ArgumentCaptor.forClass(EstoqueMaximo.class);
            verify(estoqueMaximoRepository).save(maximoCapturado.capture());
            assertThat(maximoCapturado.getValue().getEstoqueMaximo()).isEqualTo(50);
        }
    }

    // ---------------------------------------------------------------
    // atualizar()
    // ---------------------------------------------------------------
    @Nested
    class Atualizar {

        @Test
        void produtoNaoEncontrado_lancaExcecao() {
            when(produtoRepository.findById(99L)).thenReturn(Optional.empty());
            CadastroProdutoRequest request = requestPadrao(40.0, 60.0, null, null);

            assertThatThrownBy(() -> service.atualizar(99L, request, true))
                    .isInstanceOf(ProdutoNaoEncontradoException.class);
        }

        @Test
        void usuarioComum_naoApagaPrecoCustoExistente() {
            CadastroProduto existente = new CadastroProduto();
            existente.setId(3L);
            existente.setPrecoCusto(99.0);
            when(produtoRepository.findById(3L)).thenReturn(Optional.of(existente));
            when(produtoRepository.save(any(CadastroProduto.class)))
                    .thenAnswer(chamada -> chamada.getArgument(0));
            when(estoqueMinimoRepository.findByProduto_Id(3L)).thenReturn(Optional.empty());
            when(estoqueMaximoRepository.findByProduto_Id(3L)).thenReturn(Optional.empty());

            CadastroProdutoRequest request = requestPadrao(null, null, null, null);
            CadastroProduto resultado = service.atualizar(3L, request, false);

            // precoCusto nao veio no request (null) e quem edita nao e admin:
            // aplicarCampos nem toca no campo, entao o valor antigo permanece.
            assertThat(resultado.getPrecoCusto()).isEqualTo(99.0);
        }

        @Test
        void semLimitesNoRequest_removeEstoqueMinimoEMaximoExistentes() {
            CadastroProduto existente = new CadastroProduto();
            existente.setId(4L);
            EstoqueMinimo minimoExistente = new EstoqueMinimo(existente, 5, 5);
            EstoqueMaximo maximoExistente = new EstoqueMaximo(existente, 50);

            when(produtoRepository.findById(4L)).thenReturn(Optional.of(existente));
            when(produtoRepository.save(any(CadastroProduto.class)))
                    .thenAnswer(chamada -> chamada.getArgument(0));
            when(estoqueMinimoRepository.findByProduto_Id(4L)).thenReturn(Optional.of(minimoExistente));
            when(estoqueMaximoRepository.findByProduto_Id(4L)).thenReturn(Optional.of(maximoExistente));

            CadastroProdutoRequest request = requestPadrao(null, null, null, null);
            service.atualizar(4L, request, true);

            verify(estoqueMinimoRepository).delete(minimoExistente);
            verify(estoqueMaximoRepository).delete(maximoExistente);
        }
    }

    // ---------------------------------------------------------------
    // Consultas (paineis / planilha)
    // ---------------------------------------------------------------
    @Nested
    class Consultas {

        @Test
        void listarProdutosEmEstoque_mapeiaNomeEQuantidade() {
            CadastroProduto produto = new CadastroProduto();
            produto.setNomeProduto("Caneta");
            produto.setQuantidade(30);
            when(produtoRepository.findAllByOrderByNomeProdutoAsc()).thenReturn(List.of(produto));

            List<ProdutoEmEstoqueResponse> resultado = service.listarProdutosEmEstoque();

            assertThat(resultado).containsExactly(new ProdutoEmEstoqueResponse("Caneta", 30));
        }

        @Test
        void listarProdutosCriticos_mapeiaDadosDoMinimo() {
            CadastroProduto produto = new CadastroProduto();
            produto.setNomeProduto("Caderno");
            produto.setUnidadeMedida("un");
            produto.setQuantidade(2);
            EstoqueMinimo minimo = new EstoqueMinimo(produto, 5, 5);
            when(estoqueMinimoRepository.findTodosComEstoqueCritico()).thenReturn(List.of(minimo));

            List<ProdutoAbaixoDoMinimoResponse> resultado = service.listarProdutosCriticos();

            assertThat(resultado).containsExactly(
                    new ProdutoAbaixoDoMinimoResponse("Caderno", "un", 2, 5));
        }

        @Test
        void listarProdutosCompletos_admin_incluiPrecos() {
            CadastroProduto produto = new CadastroProduto();
            produto.setId(5L);
            produto.setNomeProduto("Mouse");
            produto.setQuantidade(10);
            produto.setPrecoCusto(20.0);
            produto.setPrecoVenda(35.0);
            when(produtoRepository.findAllByOrderByNomeProdutoAsc()).thenReturn(List.of(produto));
            when(estoqueMinimoRepository.findByProduto_Id(5L)).thenReturn(Optional.empty());
            when(estoqueMaximoRepository.findByProduto_Id(5L)).thenReturn(Optional.empty());

            List<ProdutoCompletoResponse> resultado = service.listarProdutosCompletos(true);

            assertThat(resultado).hasSize(1);
            ProdutoCompletoResponse resposta = resultado.get(0);
            assertThat(resposta.precoCusto()).isEqualTo(20.0);
            assertThat(resposta.precoVenda()).isEqualTo(35.0);
            assertThat(resposta.statusEstoque()).isEqualTo(StatusEstoque.NORMAL);
        }

        @Test
        void listarProdutosCompletos_usuarioComum_escondePrecos() {
            CadastroProduto produto = new CadastroProduto();
            produto.setId(6L);
            produto.setNomeProduto("Teclado");
            produto.setQuantidade(0);
            produto.setPrecoCusto(20.0);
            produto.setPrecoVenda(35.0);
            when(produtoRepository.findAllByOrderByNomeProdutoAsc()).thenReturn(List.of(produto));
            when(estoqueMinimoRepository.findByProduto_Id(6L)).thenReturn(Optional.empty());
            when(estoqueMaximoRepository.findByProduto_Id(6L)).thenReturn(Optional.empty());

            List<ProdutoCompletoResponse> resultado = service.listarProdutosCompletos(false);

            ProdutoCompletoResponse resposta = resultado.get(0);
            assertThat(resposta.precoCusto()).isNull();
            assertThat(resposta.precoVenda()).isNull();
            // quantidade 0 -> ESGOTADO, independente de minimo/maximo.
            assertThat(resposta.statusEstoque()).isEqualTo(StatusEstoque.ESGOTADO);
        }
    }
}
































