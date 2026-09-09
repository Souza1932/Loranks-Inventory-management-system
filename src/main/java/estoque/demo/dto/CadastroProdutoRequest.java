package com.estoque.demo.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

// Espelha exatamente o objeto montado em ModalCadastroProduto._lerFormulario() em cadastro.js.
// "id" nao entra aqui de proposito - e gerado pelo backend.
public record CadastroProdutoRequest(
        String marca,

        @NotBlank(message = "Nome do produto e obrigatorio")
        String nomeProduto,

        @NotNull(message = "Quantidade e obrigatoria")
        @Min(value = 0, message = "Quantidade nao pode ser negativa")
        Integer quantidade,

        @NotBlank(message = "Codigo e obrigatorio")
        String codigo,

        // Vem como "aaaa-mm-dd" (o JS ja converte dd/mm/aaaa -> ISO antes de enviar).
        @NotNull(message = "Data e obrigatoria")
        LocalDate data,

        @NotBlank(message = "Tipo e obrigatorio")
        String tipo,

        String fornecedor,

        @NotBlank(message = "Unidade de medida e obrigatoria")
        String unidadeMedida,

        Double precoCusto,
        Double precoVenda,

        // Opcionais: se informados, o backend cria os registros de
        // EstoqueMinimo/EstoqueMaximo associados ao produto. Se ficarem em
        // branco, o produto simplesmente não entra na checagem de
        // crítico/superlotado (nenhum registro é criado para ele).
        @Min(value = 0, message = "Estoque mínimo não pode ser negativo")
        Integer estoqueMinimo,

        @Min(value = 0, message = "Estoque máximo não pode ser negativo")
        Integer estoqueMaximo) {
}
