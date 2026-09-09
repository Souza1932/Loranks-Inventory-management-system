package com.estoque.demo.model;

/*
 * Regra de capacidade maxima de estoque de um produto especifico.
 * Logica de negocio (isSuperlotado, verificarAlerta) preservada identica
 * ao projeto original.
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
public class EstoqueMaximo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @OneToOne
    @JoinColumn(name = "produto_id")
    private CadastroProduto produto;

    private int estoqueMaximo;

    public EstoqueMaximo(CadastroProduto produto, int estoqueMaximo) {
        this.produto = produto;
        this.estoqueMaximo = estoqueMaximo;
    }

    public boolean isSuperlotado() {
        if (produto == null) {
            return false;
        }
        return produto.getQuantidade() > estoqueMaximo;
    }

    public String verificarAlerta() {
        if (produto == null) {
            return "ALERTA: Registro sem produto associado";
        }
        if (isSuperlotado()) {
            return "ALERTA: estoque superlotado para \"" + produto.getNomeProduto()
                    + "\" - atual: " + produto.getQuantidade()
                    + ", maximo permitido: " + estoqueMaximo
                    + " - nao repor.";
        }
        return null;
    }
}
