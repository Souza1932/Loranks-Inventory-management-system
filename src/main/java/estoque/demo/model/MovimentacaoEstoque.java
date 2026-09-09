package com.estoque.demo.model;

/*
 * Representa uma movimentacao de estoque (entrada ou saida) de um produto
 * especifico. Cada registro e um evento historico e imutavel: uma vez
 * registrado, nao deve ser editado, apenas consultado. A quantidade atual
 * do produto e obtida somando/subtraindo essas movimentacoes, em vez de ser
 * sobrescrita diretamente.
 */

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class MovimentacaoEstoque {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @ManyToOne
    @JoinColumn(name = "produto_id", nullable = false)
    private CadastroProduto produto;

    @Enumerated(EnumType.STRING)
    private TipoMovimentacao tipo;

    private int quantidade;

    @Column(name = "data_movimentacao", columnDefinition = "TIMESTAMP")
    private LocalDateTime dataMovimentacao;

    public MovimentacaoEstoque(CadastroProduto produto, TipoMovimentacao tipo, int quantidade) {
        this.produto = produto;
        this.tipo = tipo;
        this.quantidade = quantidade;
        this.dataMovimentacao = LocalDateTime.now();
    }

    // Construtor vazio exigido pelo Hibernate.
    protected MovimentacaoEstoque() {
    }
}
