package com.estoque.demo.model;

/*
 * Fonte unica da verdade para o "status" visual de um produto (usado na
 * coluna de selo da Planilha). Deliberadamente NAO reimplementa as
 * comparacoes de estoque minimo/maximo aqui - delega para
 * EstoqueMinimo.isEstoqueCritico() e EstoqueMaximo.isSuperlotado(), que ja
 * sao usados (e validados) pelo MovimentacaoService e pelo card "Produtos
 * que Exigem Atencao". Duas implementacoes da mesma regra de negocio em
 * lugares diferentes é como esse tipo de bug (a "correcao" que so
 * corrige um dos dois lugares) costuma nascer.
 */
public enum StatusEstoque {
    ESGOTADO,
    CRITICO,
    SUPERLOTADO,
    NORMAL;

    public static StatusEstoque calcular(CadastroProduto produto, EstoqueMinimo minimo, EstoqueMaximo maximo) {
        if (produto.getQuantidade() <= 0) {
            return ESGOTADO;
        }
        if (minimo != null && minimo.isEstoqueCritico()) {
            return CRITICO;
        }
        if (maximo != null && maximo.isSuperlotado()) {
            return SUPERLOTADO;
        }
        return NORMAL;
    }
}
