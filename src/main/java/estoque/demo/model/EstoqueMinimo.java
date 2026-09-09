package com.estoque.demo.model;

/*
 * Regra de estoque minimo e ponto de reposicao de um produto especifico.
 * Logica de negocio (isEstoqueCritico, precisaDeReposicao, verificarAlerta)
 * preservada identica ao projeto original.
 */

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class EstoqueMinimo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @OneToOne
    @JoinColumn(name = "produto_id")
    private CadastroProduto produto;

    private int estoqueMinimo;
    private int estoqueReposicao;

    public EstoqueMinimo(CadastroProduto produto, int estoqueMinimo, int estoqueReposicao) {
        this.produto = produto;
        this.estoqueMinimo = estoqueMinimo;
        this.estoqueReposicao = estoqueReposicao;
    }

    public boolean isEstoqueCritico() {
        if (produto == null) {
            return false;
        }
        return produto.getQuantidade() < estoqueMinimo;
    }

    public boolean precisaDeReposicao() {
        if (produto == null) {
            return false;
        }
        int atual = produto.getQuantidade();
        return atual <= estoqueReposicao && atual >= estoqueMinimo;
    }

    public String verificarAlerta() {
        if (produto == null) {
            return "ALERTA: Nao ha registros associado a este produto.";
        }
        if (isEstoqueCritico()) {
            return "ALERTA: estoque critico para \"" + produto.getNomeProduto()
                    + "\" - atual: " + produto.getQuantidade()
                    + ", minimo: " + estoqueMinimo
                    + ", reposicao sugerida: " + estoqueReposicao;
        }
        return null;
    }
}
