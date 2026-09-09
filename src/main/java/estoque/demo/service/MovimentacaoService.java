package com.estoque.demo.service;

import com.estoque.demo.dto.MovimentacaoHistoricoGeralResponse;
import com.estoque.demo.dto.MovimentacaoHistoricoResponse;
import com.estoque.demo.dto.MovimentacaoResultadoResponse;
import com.estoque.demo.exception.ProdutoNaoEncontradoException;
import com.estoque.demo.model.CadastroProduto;
import com.estoque.demo.model.EstoqueMaximo;
import com.estoque.demo.model.EstoqueMinimo;
import com.estoque.demo.model.MovimentacaoEstoque;
import com.estoque.demo.model.TipoMovimentacao;
import com.estoque.demo.repository.CadastroProdutoRepository;
import com.estoque.demo.repository.EstoqueMaximoRepository;
import com.estoque.demo.repository.EstoqueMinimoRepository;
import com.estoque.demo.repository.MovimentacaoEstoqueRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/*
 * Porta a logica de ConsultasMovimentacao do projeto original: registra uma
 * movimentacao (entrada/saida) e atualiza a quantidade do produto na MESMA
 * transacao, rejeitando saidas que ultrapassem o estoque atual. O extrato
 * por produto (consultarHistoricoPorProduto) e exposto por
 * MovimentacaoController e consumido pela tela de Movimentacao
 * (movimentacao.js).
 *
 * A cada movimentacao registrada com sucesso, o status de estoque critico
 * (EstoqueMinimo.isEstoqueCritico) e superlotado (EstoqueMaximo.isSuperlotado)
 * e recalculado automaticamente - ninguem precisa lembrar de chamar isso
 * separadamente depois de uma compra ou venda.
 */
@Service
public class MovimentacaoService {

    private final CadastroProdutoRepository produtoRepository;
    private final MovimentacaoEstoqueRepository movimentacaoRepository;
    private final EstoqueMinimoRepository estoqueMinimoRepository;
    private final EstoqueMaximoRepository estoqueMaximoRepository;

    public MovimentacaoService(CadastroProdutoRepository produtoRepository,
                                MovimentacaoEstoqueRepository movimentacaoRepository,
                                EstoqueMinimoRepository estoqueMinimoRepository,
                                EstoqueMaximoRepository estoqueMaximoRepository) {
        this.produtoRepository = produtoRepository;
        this.movimentacaoRepository = movimentacaoRepository;
        this.estoqueMinimoRepository = estoqueMinimoRepository;
        this.estoqueMaximoRepository = estoqueMaximoRepository;
    }

    @Transactional
    public MovimentacaoResultadoResponse registrarMovimentacao(long produtoId, TipoMovimentacao tipo, int quantidade) {
        if (quantidade <= 0) {
            return MovimentacaoResultadoResponse.falha("Quantidade deve ser maior que zero.");
        }

        // findByIdParaAtualizacao (SELECT ... FOR UPDATE) em vez de findById: a
        // linha do produto fica travada ate o fim desta transacao, entao uma
        // segunda saida concorrente para o mesmo produto so le a quantidade
        // depois que esta commitar - eliminando a corrida em que ambas viam o
        // mesmo estoque, ambas passavam na checagem abaixo e o estoque ficava
        // negativo.
        CadastroProduto produto = produtoRepository.findByIdParaAtualizacao(produtoId).orElse(null);
        if (produto == null) {
            return MovimentacaoResultadoResponse.falha("Produto nao encontrado.");
        }

        if (tipo == TipoMovimentacao.SAIDA && quantidade > produto.getQuantidade()) {
            // Estoque insuficiente para a saida solicitada; rejeita a movimentacao.
            return MovimentacaoResultadoResponse.falha("Estoque insuficiente para esta saida.");
        }

        int novaQuantidade = tipo == TipoMovimentacao.ENTRADA
                ? produto.getQuantidade() + quantidade
                : produto.getQuantidade() - quantidade;
        produto.setQuantidade(novaQuantidade);
        produtoRepository.save(produto);

        movimentacaoRepository.save(new MovimentacaoEstoque(produto, tipo, quantidade));

        return avaliarStatusEstoque(produto);
    }

    /**
     * Recalcula o status de estoque (critico / superlotado) de um produto a
     * partir da quantidade atual ja persistida. Chamado automaticamente ao
     * final de registrarMovimentacao(); tambem pode ser chamado isoladamente
     * (ex: uma tela de consulta) sem duplicar a logica de decisao.
     */
    @Transactional(readOnly = true)
    public MovimentacaoResultadoResponse avaliarStatusEstoque(CadastroProduto produto) {
        EstoqueMinimo minimo = estoqueMinimoRepository.findByProduto_Id(produto.getId()).orElse(null);
        EstoqueMaximo maximo = estoqueMaximoRepository.findByProduto_Id(produto.getId()).orElse(null);

        boolean critico = minimo != null && minimo.isEstoqueCritico();
        boolean superlotado = maximo != null && maximo.isSuperlotado();

        String alertaCritico = minimo != null ? minimo.verificarAlerta() : null;
        String alertaSuperlotado = maximo != null ? maximo.verificarAlerta() : null;

        return new MovimentacaoResultadoResponse(
                true,
                null,
                produto.getQuantidade(),
                critico,
                superlotado,
                alertaCritico,
                alertaSuperlotado);
    }

    /**
     * Extrato de movimentacoes de um produto, mais recente primeiro -
     * exposto por GET /api/estoque/produtos/{id}/movimentacoes
     * (MovimentacaoController). Lanca ProdutoNaoEncontradoException (404)
     * se o id nao existir, em vez de devolver uma lista vazia - assim o
     * front consegue distinguir "produto sem nenhuma movimentacao ainda"
     * de "esse id nem existe".
     */
    @Transactional(readOnly = true)
    public List<MovimentacaoHistoricoResponse> consultarHistoricoPorProduto(long produtoId) {
        if (!produtoRepository.existsById(produtoId)) {
            throw new ProdutoNaoEncontradoException(produtoId);
        }
        return movimentacaoRepository.findByProduto_IdOrderByDataMovimentacaoDesc(produtoId).stream()
                .map(m -> new MovimentacaoHistoricoResponse(
                        m.getId(),
                        m.getTipo(),
                        m.getQuantidade(),
                        MovimentacaoHistoricoResponse.formatarData(m.getDataMovimentacao())))
                .toList();
    }

    /**
     * Historico GERAL de movimentacoes - TODOS os produtos, mais recente
     * primeiro. Equivalente a "SELECT * FROM movimentacao_estoque ORDER BY
     * data_movimentacao DESC", so que ja juntando o nome do produto de cada
     * linha (produto.getNomeProduto()) para a tela nao precisar de uma
     * segunda consulta por item. Exposto por GET /api/estoque/historico
     * (MovimentacaoController) e carregado pela tela de Movimentacao assim
     * que ela abre, alem de recarregado apos cada movimentacao confirmada.
     */
    @Transactional(readOnly = true)
    public List<MovimentacaoHistoricoGeralResponse> consultarHistoricoGeral() {
        return movimentacaoRepository.findAllByOrderByDataMovimentacaoDesc().stream()
                .map(m -> new MovimentacaoHistoricoGeralResponse(
                        m.getId(),
                        m.getProduto().getId(),
                        m.getProduto().getNomeProduto(),
                        m.getTipo(),
                        m.getQuantidade(),
                        MovimentacaoHistoricoResponse.formatarData(m.getDataMovimentacao())))
                .toList();
    }
}
