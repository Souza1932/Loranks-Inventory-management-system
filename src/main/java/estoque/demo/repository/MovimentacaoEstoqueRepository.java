package com.estoque.demo.repository;

import com.estoque.demo.model.MovimentacaoEstoque;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MovimentacaoEstoqueRepository extends JpaRepository<MovimentacaoEstoque, Long> {

    // Equivalente ao ConsultasMovimentacao.consultarHistoricoPorProduto.
    List<MovimentacaoEstoque> findByProduto_IdOrderByDataMovimentacaoDesc(long produtoId);

    // Historico GERAL (todos os produtos) - equivalente a
    // "SELECT * FROM movimentacao_estoque ORDER BY data_movimentacao DESC".
    // Usado pela tela de Movimentacao para mostrar o extrato completo assim
    // que a pagina abre, e de novo apos cada nova movimentacao confirmada.
    List<MovimentacaoEstoque> findAllByOrderByDataMovimentacaoDesc();

    // Usado por ProdutoService.excluir(): apaga o historico de movimentacoes
    // do produto ANTES de apagar o produto em si. Necessario porque
    // MovimentacaoEstoque.produto tem @JoinColumn(nullable = false) sem
    // cascade - sem isso, o DELETE do produto falharia com violacao de
    // FK sempre que ele tivesse alguma movimentacao registrada.
    long deleteByProduto_Id(long produtoId);
}
