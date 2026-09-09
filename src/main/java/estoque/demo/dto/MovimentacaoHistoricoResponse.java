package com.estoque.demo.dto;

import com.estoque.demo.model.TipoMovimentacao;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

// Um item do extrato de movimentacoes de um produto (GET
// /api/estoque/produtos/{id}/movimentacoes). Cada registro e imutavel -
// so leitura, nunca editado (ver MovimentacaoEstoque, o modelo original).
// "dataMovimentacao" sai ja formatada em ISO (mesma convencao de
// ProdutoCompletoResponse.formatarData) - o front so precisa exibir, nao
// fazer nenhum calculo com ela.
public record MovimentacaoHistoricoResponse(
        long id,
        TipoMovimentacao tipo,
        int quantidade,
        String dataMovimentacao) {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public static String formatarData(LocalDateTime data) {
        return data == null ? "" : data.format(ISO);
    }
}
