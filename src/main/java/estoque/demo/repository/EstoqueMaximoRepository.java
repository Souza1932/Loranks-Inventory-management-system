package com.estoque.demo.repository;

import com.estoque.demo.model.EstoqueMaximo;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EstoqueMaximoRepository extends JpaRepository<EstoqueMaximo, Long> {

    Optional<EstoqueMaximo> findByProduto_Id(long produtoId);
}
