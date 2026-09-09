package com.estoque.demo.dto;

// Resultado de registrarMovimentacao(): alem de sucesso/falha, ja carrega os
// alertas de estoque critico e superlotado calculados na mesma chamada, para
// quem consumir (controller, dashboard, etc.) nao precisar consultar de novo.
public record MovimentacaoResultadoResponse(
        boolean sucesso,
        String mensagemErro,
        int quantidadeAtual,
        boolean estoqueCritico,
        boolean estoqueSuperlotado,
        String alertaCritico,
        String alertaSuperlotado) {

    public static MovimentacaoResultadoResponse falha(String mensagemErro) {
        return new MovimentacaoResultadoResponse(false, mensagemErro, 0, false, false, null, null);
    }
}
