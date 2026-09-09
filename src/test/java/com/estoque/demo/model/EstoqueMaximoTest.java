package com.estoque.demo.model;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class EstoqueMaximoTest {

    private CadastroProduto produtoComQuantidade(int quantidade) {
        CadastroProduto produto = new CadastroProduto();
        produto.setId(1L);
        produto.setNomeProduto("Caixa de embalagem");
        produto.setQuantidade(quantidade);
        return produto;
    }

    @Test
    void isSuperlotado_semProdutoAssociado_retornaFalse() {
        EstoqueMaximo maximo = new EstoqueMaximo(null, 100);

        assertThat(maximo.isSuperlotado()).isFalse();
    }

    @Test
    void isSuperlotado_quantidadeAcimaDoMaximo_retornaTrue() {
        CadastroProduto produto = produtoComQuantidade(150);
        EstoqueMaximo maximo = new EstoqueMaximo(produto, 100);

        assertThat(maximo.isSuperlotado()).isTrue();
    }

    @Test
    void isSuperlotado_quantidadeIgualAoMaximo_retornaFalse() {
        // Regra é ">", não ">=" - igual ao máximo ainda não é superlotado.
        CadastroProduto produto = produtoComQuantidade(100);
        EstoqueMaximo maximo = new EstoqueMaximo(produto, 100);

        assertThat(maximo.isSuperlotado()).isFalse();
    }

    @Test
    void verificarAlerta_naoSuperlotado_retornaNull() {
        CadastroProduto produto = produtoComQuantidade(50);
        EstoqueMaximo maximo = new EstoqueMaximo(produto, 100);

        assertThat(maximo.verificarAlerta()).isNull();
    }

    @Test
    void verificarAlerta_superlotado_mencionaNomeQuantidadeEMaximo() {
        CadastroProduto produto = produtoComQuantidade(150);
        EstoqueMaximo maximo = new EstoqueMaximo(produto, 100);

        assertThat(maximo.verificarAlerta())
                .contains("Caixa de embalagem")
                .contains("150")
                .contains("100");
    }

    @Test
    void verificarAlerta_semProdutoAssociado_retornaMensagemDeInconsistencia() {
        EstoqueMaximo maximo = new EstoqueMaximo(null, 100);

        assertThat(maximo.verificarAlerta()).isNotNull();
    }
}
