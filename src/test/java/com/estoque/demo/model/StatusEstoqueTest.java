package com.estoque.demo.model;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/**
 * StatusEstoque.calcular() é a fonte única da verdade pro selo de status na
 * Planilha (ver comentário na própria classe) - qualquer regressão aqui
 * quebra silenciosamente a cor/texto exibido pra cada produto. A ordem de
 * prioridade (ESGOTADO > CRITICO > SUPERLOTADO > NORMAL) é o comportamento
 * mais importante a proteger contra regressão futura.
 */
class StatusEstoqueTest {

    private CadastroProduto produtoComQuantidade(int quantidade) {
        CadastroProduto produto = new CadastroProduto();
        produto.setId(1L);
        produto.setNomeProduto("Produto de teste");
        produto.setQuantidade(quantidade);
        return produto;
    }

    @Test
    void quantidadeZero_eEsgotadoMesmoSemLimitesCadastrados() {
        CadastroProduto produto = produtoComQuantidade(0);

        assertThat(StatusEstoque.calcular(produto, null, null)).isEqualTo(StatusEstoque.ESGOTADO);
    }

    @Test
    void quantidadeNegativa_eEsgotado() {
        // Não deveria acontecer via API (validação impede), mas a regra de
        // negócio (<=0) precisa continuar cobrindo esse caso também.
        CadastroProduto produto = produtoComQuantidade(-1);

        assertThat(StatusEstoque.calcular(produto, null, null)).isEqualTo(StatusEstoque.ESGOTADO);
    }

    @Test
    void esgotadoTemPrioridadeSobreCriticoESuperlotado() {
        // Um produto com quantidade 0 tecnicamente também está abaixo do
        // mínimo E não superlotado - ESGOTADO precisa vencer mesmo assim.
        CadastroProduto produto = produtoComQuantidade(0);
        EstoqueMinimo minimo = new EstoqueMinimo(produto, 5, 5);
        EstoqueMaximo maximo = new EstoqueMaximo(produto, 100);

        assertThat(StatusEstoque.calcular(produto, minimo, maximo)).isEqualTo(StatusEstoque.ESGOTADO);
    }

    @Test
    void abaixoDoMinimo_eCritico() {
        CadastroProduto produto = produtoComQuantidade(3);
        EstoqueMinimo minimo = new EstoqueMinimo(produto, 10, 10);

        assertThat(StatusEstoque.calcular(produto, minimo, null)).isEqualTo(StatusEstoque.CRITICO);
    }

    @Test
    void criticoTemPrioridadeSobreSuperlotado() {
        // Cenário artificial (min > max não faria sentido cadastrado de
        // verdade), só para garantir a ordem de checagem do método.
        CadastroProduto produto = produtoComQuantidade(3);
        EstoqueMinimo minimo = new EstoqueMinimo(produto, 10, 10);
        EstoqueMaximo maximo = new EstoqueMaximo(produto, 2);

        assertThat(StatusEstoque.calcular(produto, minimo, maximo)).isEqualTo(StatusEstoque.CRITICO);
    }

    @Test
    void acimaDoMaximo_eSuperlotado() {
        CadastroProduto produto = produtoComQuantidade(500);
        EstoqueMaximo maximo = new EstoqueMaximo(produto, 100);

        assertThat(StatusEstoque.calcular(produto, null, maximo)).isEqualTo(StatusEstoque.SUPERLOTADO);
    }

    @Test
    void dentroDosLimites_eNormal() {
        CadastroProduto produto = produtoComQuantidade(50);
        EstoqueMinimo minimo = new EstoqueMinimo(produto, 10, 10);
        EstoqueMaximo maximo = new EstoqueMaximo(produto, 100);

        assertThat(StatusEstoque.calcular(produto, minimo, maximo)).isEqualTo(StatusEstoque.NORMAL);
    }

    @Test
    void semLimitesCadastrados_eNormal() {
        CadastroProduto produto = produtoComQuantidade(50);

        assertThat(StatusEstoque.calcular(produto, null, null)).isEqualTo(StatusEstoque.NORMAL);
    }
}
