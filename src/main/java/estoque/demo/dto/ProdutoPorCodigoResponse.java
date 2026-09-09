package com.estoque.demo.dto;

// Retorno da busca de produto por codigo (GET /api/estoque/produtos/codigo/{codigo}).
// Usado tanto pelo fluxo de bipagem quanto pela digitacao manual do codigo:
// o frontend mostra esses dados para o usuario confirmar antes de registrar
// a movimentacao (evita bipar/digitar errado e dar saida no produto trocado).
public record ProdutoPorCodigoResponse(
        long id,
        String nomeProduto,
        String marca,
        String codigo,
        int quantidadeAtual,
        String unidadeMedida) {
}
