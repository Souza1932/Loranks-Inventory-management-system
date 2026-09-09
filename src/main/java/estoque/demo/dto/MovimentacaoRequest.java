package com.estoque.demo.dto;

import com.estoque.demo.model.TipoMovimentacao;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

// Corpo do POST /api/estoque/movimentacoes. produtoId vem do passo anterior
// (busca por codigo, seja via bipagem ou digitacao manual) - aqui so falta
// tipo (ENTRADA/SAIDA) e a quantidade.
public record MovimentacaoRequest(
        @NotNull long produtoId,
        @NotNull TipoMovimentacao tipo,
        @Positive int quantidade) {
}
