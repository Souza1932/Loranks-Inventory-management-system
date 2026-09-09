package com.estoque.demo.model;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class EstoqueMinimoTest {

    private CadastroProduto produtoComQuantidade(int quantidade) {
        CadastroProduto produto = new CadastroProduto();
        produto.setId(1L);
        produto.setNomeProduto("Parafuso M6");
        produto.setQuantidade(quantidade);
        return produto;
    }

    @Test
    void isEstoqueCritico_semProdutoAssociado_retornaFalse() {
        EstoqueMinimo minimo = new EstoqueMinimo(null, 10, 10);

        assertThat(minimo.isEstoqueCritico()).isFalse();
    }

    @Test
    void isEstoqueCritico_quantidadeAbaixoDoMinimo_retornaTrue() {
        CadastroProduto produto = produtoComQuantidade(5);
        EstoqueMinimo minimo = new EstoqueMinimo(produto, 10, 10);

        assertThat(minimo.isEstoqueCritico()).isTrue();
    }

    @Test
    void isEstoqueCritico_quantidadeIgualAoMinimo_retornaFalse() {
        // Regra é "<", não "<=" - igual ao mínimo ainda não é crítico.
        CadastroProduto produto = produtoComQuantidade(10);
        EstoqueMinimo minimo = new EstoqueMinimo(produto, 10, 10);

        assertThat(minimo.isEstoqueCritico()).isFalse();
    }

    @Test
    void precisaDeReposicao_dentroDaFaixaEntreMinimoEReposicao_retornaTrue() {
        CadastroProduto produto = produtoComQuantidade(8);
        EstoqueMinimo minimo = new EstoqueMinimo(produto, 5, 12);

        assertThat(minimo.precisaDeReposicao()).isTrue();
    }

    @Test
    void precisaDeReposicao_abaixoDoMinimo_retornaFalse() {
        // Já é crítico, não é mais "precisa de reposição em breve" - são
        // estados diferentes.
        CadastroProduto produto = produtoComQuantidade(2);
        EstoqueMinimo minimo = new EstoqueMinimo(produto, 5, 12);

        assertThat(minimo.precisaDeReposicao()).isFalse();
    }

    @Test
    void precisaDeReposicao_semProdutoAssociado_retornaFalse() {
        EstoqueMinimo minimo = new EstoqueMinimo(null, 5, 12);

        assertThat(minimo.precisaDeReposicao()).isFalse();
    }

    @Test
    void verificarAlerta_naoCritico_retornaNull() {
        CadastroProduto produto = produtoComQuantidade(50);
        EstoqueMinimo minimo = new EstoqueMinimo(produto, 10, 10);

        assertThat(minimo.verificarAlerta()).isNull();
    }

    @Test
    void verificarAlerta_critico_mencionaNomeQuantidadeEMinimo() {
        CadastroProduto produto = produtoComQuantidade(3);
        EstoqueMinimo minimo = new EstoqueMinimo(produto, 10, 10);

        assertThat(minimo.verificarAlerta())
                .contains("Parafuso M6")
                .contains("3")
                .contains("10");
    }

    @Test
    void verificarAlerta_semProdutoAssociado_retornaMensagemDeInconsistencia() {
        EstoqueMinimo minimo = new EstoqueMinimo(null, 10, 10);

        assertThat(minimo.verificarAlerta()).isNotNull();
    }
}
