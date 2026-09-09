package com.estoque.demo.repository;

import com.estoque.demo.model.EstoqueMinimo;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface EstoqueMinimoRepository extends JpaRepository<EstoqueMinimo, Long> {

    Optional<EstoqueMinimo> findByProduto_Id(long produtoId);

    // Traz, numa unica consulta, todos os produtos cujo estoque atual esta
    // abaixo do minimo cadastrado - usado no card "Produtos que Exigem Atencao".
    @Query("SELECT em FROM EstoqueMinimo em JOIN FETCH em.produto p "
            + "WHERE p.quantidade < em.estoqueMinimo ORDER BY p.nomeProduto")
    List<EstoqueMinimo> findTodosComEstoqueCritico();
}
