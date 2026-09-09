package com.estoque.demo.repository;

import com.estoque.demo.model.CadastroProduto;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CadastroProdutoRepository extends JpaRepository<CadastroProduto, Long> {

    List<CadastroProduto> findAllByOrderByNomeProdutoAsc();

    // Usado por MovimentacaoService.registrarMovimentacao: SELECT ... FOR UPDATE
    // no produto, mantido ate o commit da transacao. Sem isso, duas saidas
    // concorrentes para o mesmo produto podem ler a mesma quantidade, ambas
    // passarem na checagem de "estoque suficiente" e o estoque terminar
    // negativo - o findById() comum nao oferece nenhuma exclusao entre
    // transacoes simultaneas.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from CadastroProduto p where p.id = :id")
    Optional<CadastroProduto> findByIdParaAtualizacao(@Param("id") long id);

    // Equivalente ao ConsultasProduto.consultarPorNome (busca parcial, case-insensitive).
    List<CadastroProduto> findByNomeProdutoContainingIgnoreCaseOrderByNomeProdutoAsc(String nomeProduto);

    // Busca exata por codigo de barras - usada tanto pela bipagem (leitor USB)
    // quanto pela digitacao manual do codigo.
    Optional<CadastroProduto> findByCodigo(String codigo);

    // Equivalente ao ConsultasProduto.consultarPorNomePaginado.
    Page<CadastroProduto> findByNomeProdutoContainingIgnoreCase(String nomeProduto, Pageable pageable);
}
