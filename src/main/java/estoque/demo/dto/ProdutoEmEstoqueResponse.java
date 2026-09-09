package com.estoque.demo.dto;

// Espelha exatamente os campos consumidos por `new ProdutoEmEstoque(nome, quantidadeArmazenada)` em painel.js.
public record ProdutoEmEstoqueResponse(String nome, int quantidadeArmazenada) {
}
