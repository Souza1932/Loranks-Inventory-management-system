package com.estoque.demo.controller;

import com.estoque.demo.dto.MovimentacaoHistoricoGeralResponse;
import com.estoque.demo.dto.MovimentacaoHistoricoResponse;
import com.estoque.demo.dto.MovimentacaoRequest;
import com.estoque.demo.dto.MovimentacaoResultadoResponse;
import com.estoque.demo.dto.ProdutoPorCodigoResponse;
import com.estoque.demo.model.CadastroProduto;
import com.estoque.demo.repository.CadastroProdutoRepository;
import com.estoque.demo.service.MovimentacaoService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/*
 * Suporta tanto a bipagem (leitor USB de codigo de barras, que se comporta
 * como um teclado: digita o codigo e envia Enter sozinho) quanto a
 * digitacao manual do codigo - as duas caem no mesmo endpoint de busca.
 *
 * Fluxo do frontend: 1) GET /produtos/codigo/{codigo} para confirmar qual
 * produto foi identificado; 2) POST /movimentacoes com o produtoId retornado
 * para efetivar a entrada/saida.
 */
@RestController
@RequestMapping("/api/estoque")
public class MovimentacaoController {

    private final CadastroProdutoRepository produtoRepository;
    private final MovimentacaoService movimentacaoService;

    public MovimentacaoController(CadastroProdutoRepository produtoRepository,
                                   MovimentacaoService movimentacaoService) {
        this.produtoRepository = produtoRepository;
        this.movimentacaoService = movimentacaoService;
    }

    @GetMapping("/produtos/codigo/{codigo}")
    public ResponseEntity<ProdutoPorCodigoResponse> buscarPorCodigo(@PathVariable String codigo) {
        CadastroProduto produto = produtoRepository.findByCodigo(codigo).orElse(null);
        if (produto == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(new ProdutoPorCodigoResponse(
                produto.getId(),
                produto.getNomeProduto(),
                produto.getMarca(),
                produto.getCodigo(),
                produto.getQuantidade(),
                produto.getUnidadeMedida()));
    }

    @PostMapping("/movimentacoes")
    public ResponseEntity<MovimentacaoResultadoResponse> registrarMovimentacao(
            @Valid @RequestBody MovimentacaoRequest request) {
        MovimentacaoResultadoResponse resultado = movimentacaoService.registrarMovimentacao(
                request.produtoId(), request.tipo(), request.quantidade());

        if (!resultado.sucesso()) {
            return ResponseEntity.badRequest().body(resultado);
        }
        return ResponseEntity.ok(resultado);
    }

    /**
     * Extrato de movimentacoes do produto, mais recente primeiro. Chamado
     * pela tela de Movimentacao (movimentacao.js) depois que um produto e
     * encontrado (por bipagem ou digitacao manual) e de novo apos cada
     * nova movimentacao confirmada, para o extrato refletir na hora o que
     * acabou de ser registrado.
     */
    @GetMapping("/produtos/{id}/movimentacoes")
    public List<MovimentacaoHistoricoResponse> historicoDoProduto(@PathVariable long id) {
        return movimentacaoService.consultarHistoricoPorProduto(id);
    }

    /**
     * Historico GERAL de movimentacoes - TODOS os produtos, mais recente
     * primeiro (equivalente a "SELECT * FROM movimentacao_estoque ORDER BY
     * data_movimentacao DESC"). Chamado pela tela de Movimentacao assim que
     * ela abre - o usuario ve o extrato completo sem precisar bipar nada
     * antes - e de novo apos cada movimentacao confirmada, para refletir na
     * hora o que acabou de ser registrado.
     */
    @GetMapping("/historico")
    public List<MovimentacaoHistoricoGeralResponse> historicoGeral() {
        return movimentacaoService.consultarHistoricoGeral();
    }
}
