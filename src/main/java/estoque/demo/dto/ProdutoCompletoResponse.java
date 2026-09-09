package com.estoque.demo.dto;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import com.estoque.demo.model.StatusEstoque;

// Espelha exatamente os campos consumidos pelo construtor de `ProdutoCompleto`
// em planilha.js. `data` sai ja formatada como "aaaa-mm-dd" (ISO), como o
// comentario do JS espera ("ja chega formatada do backend").
public record ProdutoCompletoResponse(
        long id,
        String marca,
        String nomeProduto,
        int quantidade,
        String codigo,
        String data,
        String tipo,
        String fornecedor,
        String unidadeMedida,
        Double precoCusto,
        Double precoVenda,
        Integer estoqueMinimo,
        Integer estoqueMaximo,
        StatusEstoque statusEstoque) {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE;

    public static String formatarData(LocalDate data) {
        return data == null ? "" : data.format(ISO);
    }
}



















