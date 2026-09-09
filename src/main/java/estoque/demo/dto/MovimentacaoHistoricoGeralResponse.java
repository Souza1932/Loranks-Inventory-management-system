package com.estoque.demo.dto;

import com.estoque.demo.model.TipoMovimentacao;

// Um item do historico GERAL de movimentacoes (GET /api/estoque/historico) -
// equivalente a um "SELECT * FROM movimentacao_estoque ORDER BY
// data_movimentacao DESC" trazendo TODOS os produtos, nao so um. Usado pela
// tela de Movimentacao (movimentacao.js) para mostrar a tabela de historico
// assim que a pagina abre, sem precisar bipar nenhum codigo antes.
//
// Mesma convencao de MovimentacaoHistoricoResponse (extrato por produto):
// "dataMovimentacao" ja sai formatada em ISO, o front so exibe.
public record MovimentacaoHistoricoGeralResponse(
        long id,
        long produtoId,
        String nomeProduto,
        TipoMovimentacao tipo,
        int quantidade,
        String dataMovimentacao) {
}
