package com.estoque.demo.dto;

// Espelha exatamente os campos consumidos por
// `new ProdutoAbaixoDoMinimo(nome, unidadeMedida, quantidadeAtual, quantidadeMinima)` em painel.js.
public record ProdutoAbaixoDoMinimoResponse(
        String nome,
        String unidadeMedida,
        int quantidadeAtual,
        int quantidadeMinima) {
}
