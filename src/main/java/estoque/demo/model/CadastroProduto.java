package com.estoque.demo.model;

/*
 * Contem os dados de um produto cadastrado. Mesmos campos do projeto
 * original; compareTo() preservado (ordena por nome, depois por id).
 */

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import java.time.LocalDate;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
public class CadastroProduto implements Comparable<CadastroProduto> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;
    private String marca;
    private String nomeProduto;
    private int quantidade;
    private String codigo;
    private LocalDate data;
    private String tipo;
    private String fornecedor;
    private Double precoCusto;
    private Double precoVenda;
    private String unidadeMedida;

    @Override
    public int compareTo(CadastroProduto o) {
        if (this.nomeProduto == null && o.getNomeProduto() == null) {
            return Long.compare(this.id, o.getId());
        }
        if (this.nomeProduto == null) {
            return -1;
        }
        if (o.getNomeProduto() == null) {
            return 1;
        }
        int comparacaoNome = this.nomeProduto.compareToIgnoreCase(o.getNomeProduto());
        if (comparacaoNome != 0) {
            return comparacaoNome;
        }
        return Long.compare(this.id, o.getId());
    }
}
