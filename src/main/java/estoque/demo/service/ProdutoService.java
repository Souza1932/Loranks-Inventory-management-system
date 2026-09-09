package com.estoque.demo.service;

import com.estoque.demo.dto.CadastroProdutoRequest;
import com.estoque.demo.dto.ProdutoAbaixoDoMinimoResponse;
import com.estoque.demo.dto.ProdutoCompletoResponse;
import com.estoque.demo.dto.ProdutoEmEstoqueResponse;
import com.estoque.demo.exception.ProdutoNaoEncontradoException;
import com.estoque.demo.model.CadastroProduto;
import com.estoque.demo.model.EstoqueMaximo;
import com.estoque.demo.model.EstoqueMinimo;
import com.estoque.demo.model.StatusEstoque;
import com.estoque.demo.repository.CadastroProdutoRepository;
import com.estoque.demo.repository.EstoqueMaximoRepository;
import com.estoque.demo.repository.EstoqueMinimoRepository;
import com.estoque.demo.repository.MovimentacaoEstoqueRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProdutoService {

    private final CadastroProdutoRepository produtoRepository;
    private final EstoqueMinimoRepository estoqueMinimoRepository;
    private final EstoqueMaximoRepository estoqueMaximoRepository;
    private final MovimentacaoEstoqueRepository movimentacaoEstoqueRepository;

    public ProdutoService(CadastroProdutoRepository produtoRepository,
                           EstoqueMinimoRepository estoqueMinimoRepository,
                           EstoqueMaximoRepository estoqueMaximoRepository,
                           MovimentacaoEstoqueRepository movimentacaoEstoqueRepository) {
        this.produtoRepository = produtoRepository;
        this.estoqueMinimoRepository = estoqueMinimoRepository;
        this.estoqueMaximoRepository = estoqueMaximoRepository;
        this.movimentacaoEstoqueRepository = movimentacaoEstoqueRepository;
    }

    /** Alimenta o card "Distribuicao do Estoque por Produto" do painel. */
    @Transactional(readOnly = true)
    public List<ProdutoEmEstoqueResponse> listarProdutosEmEstoque() {
        return produtoRepository.findAllByOrderByNomeProdutoAsc().stream()
                .map(p -> new ProdutoEmEstoqueResponse(p.getNomeProduto(), p.getQuantidade()))
                .toList();
    }

    /** Alimenta o card "Produtos que Exigem Atencao" do painel. */
    @Transactional(readOnly = true)
    public List<ProdutoAbaixoDoMinimoResponse> listarProdutosCriticos() {
        return estoqueMinimoRepository.findTodosComEstoqueCritico().stream()
                .map(em -> new ProdutoAbaixoDoMinimoResponse(
                        em.getProduto().getNomeProduto(),
                        em.getProduto().getUnidadeMedida(),
                        em.getProduto().getQuantidade(),
                        em.getEstoqueMinimo()))
                .toList();
    }

    /** Alimenta a planilha de produtos (todas as colunas, incluindo os
     * limites de estoque mínimo/máximo, necessários para pré-preencher o
     * modal de edição). Faz uma consulta extra por produto para buscar os
     * limites (N+1) - aceitável na escala atual (dezenas/centenas de
     * produtos); numa base maior, valeria trocar por uma consulta única
     * com JOIN, como já foi feito em findTodosComEstoqueCritico().
     *
     * @param isAdmin quando false, precoCusto e precoVenda vem sempre null
     *     na resposta - preço de custo (margem) e preço de venda só são
     *     visíveis para administrador. Feito aqui (no servidor), não só
     *     escondido no frontend, porque um usuário comum inspecionando a
     *     rede ainda veria o JSON cru se a filtragem fosse só na tela.
     */
    @Transactional(readOnly = true)
    public List<ProdutoCompletoResponse> listarProdutosCompletos(boolean isAdmin) {
        return produtoRepository.findAllByOrderByNomeProdutoAsc().stream()
                .map(p -> {
                    EstoqueMinimo minimo = estoqueMinimoRepository.findByProduto_Id(p.getId()).orElse(null);
                    EstoqueMaximo maximo = estoqueMaximoRepository.findByProduto_Id(p.getId()).orElse(null);
                    return new ProdutoCompletoResponse(
                            p.getId(),
                            p.getMarca(),
                            p.getNomeProduto(),
                            p.getQuantidade(),
                            p.getCodigo(),
                            ProdutoCompletoResponse.formatarData(p.getData()),
                            p.getTipo(),
                            p.getFornecedor(),
                            p.getUnidadeMedida(),
                            isAdmin ? p.getPrecoCusto() : null,
                            isAdmin ? p.getPrecoVenda() : null,
                            minimo == null ? null : minimo.getEstoqueMinimo(),
                            maximo == null ? null : maximo.getEstoqueMaximo(),
                            StatusEstoque.calcular(p, minimo, maximo));
                })
                .toList();
    }

    /** Equivalente ao ConsultasProduto.cadastrar() do projeto original. */
    @Transactional
    public CadastroProduto cadastrar(CadastroProdutoRequest request, boolean isAdmin) {
        CadastroProduto produto = new CadastroProduto();
        aplicarCampos(produto, request, isAdmin);
        produto = produtoRepository.save(produto);
        sincronizarLimites(produto, request.estoqueMinimo(), request.estoqueMaximo());
        return produto;
    }

    /**
     * Atualiza um produto já existente. Reaproveita o mesmo formulário/DTO
     * do cadastro - único ponto de diferença é que aqui o produto já tem
     * id, então buscamos e atualizamos em vez de criar.
     */
    @Transactional
    public CadastroProduto atualizar(long id, CadastroProdutoRequest request, boolean isAdmin) {
        CadastroProduto produto = produtoRepository.findById(id)
                .orElseThrow(() -> new ProdutoNaoEncontradoException(id));
        aplicarCampos(produto, request, isAdmin);
        produto = produtoRepository.save(produto);
        sincronizarLimites(produto, request.estoqueMinimo(), request.estoqueMaximo());
        return produto;
    }

    /**
     * Exclui um produto, sem barreira alguma - inclusive quando ele ja tem
     * movimentacoes registradas. Isso APAGA o historico de entradas/saidas
     * desse produto junto (deleteByProduto_Id abaixo), porque
     * MovimentacaoEstoque.produto e uma FK NOT NULL sem cascade: o registro
     * so pode deixar de existir se a movimentacao que aponta pra ele deixar
     * de existir tambem. Ou seja, isto e destrutivo e IRREVERSIVEL - uma vez
     * excluido, nao ha extrato/auditoria pra recuperar sobre esse produto.
     */
    @Transactional
    public void excluir(long id) {
        CadastroProduto produto = produtoRepository.findById(id)
                .orElseThrow(() -> new ProdutoNaoEncontradoException(id));

        movimentacaoEstoqueRepository.deleteByProduto_Id(id);
        estoqueMinimoRepository.findByProduto_Id(id).ifPresent(estoqueMinimoRepository::delete);
        estoqueMaximoRepository.findByProduto_Id(id).ifPresent(estoqueMaximoRepository::delete);
        produtoRepository.delete(produto);
    }

    /**
     * @param isAdmin quando false, precoCusto NUNCA é tocado - nem para
     *     gravar um valor novo, nem para limpar. Motivo: o modal de
     *     edição de um usuário comum não recebe mais o preço de custo
     *     atual (ver listarProdutosCompletos), então o campo chegaria
     *     vazio/null aqui mesmo que o produto já tivesse um custo
     *     cadastrado por um admin - se aplicássemos esse null, apagaríamos
     *     silenciosamente um dado que o usuário sequer viu. Em vez disso,
     *     o valor existente é preservado (no cadastro de produto novo,
     *     isso significa que fica null até um admin definir depois).
     */
    private void aplicarCampos(CadastroProduto produto, CadastroProdutoRequest request, boolean isAdmin) {
        produto.setMarca(request.marca());
        produto.setNomeProduto(request.nomeProduto());
        produto.setQuantidade(request.quantidade());
        produto.setCodigo(request.codigo());
        produto.setData(request.data());
        produto.setTipo(request.tipo());
        produto.setFornecedor(request.fornecedor());
        produto.setUnidadeMedida(request.unidadeMedida());
        if (isAdmin) {
            produto.setPrecoCusto(request.precoCusto());
        }
        aplicarPrecoVenda(produto, request, isAdmin);
    }

    /**
     * precoVenda é diferente de precoCusto: o formulário de cadastro NÃO
     * esconde este campo de usuário comum (só o de custo), então ele pode
     * legitimamente informar um preço de venda ao CRIAR um produto - daí
     * não bloquear como fazemos com precoCusto.
     *
     * O risco é só na EDIÇÃO: como listarProdutosCompletos agora também
     * manda precoVenda null pra não-admin, o modal de edição de um usuário
     * comum pré-preenche esse campo vazio mesmo quando o produto já tem um
     * preço de venda cadastrado. Se aplicássemos esse null de volta,
     * apagaríamos silenciosamente um valor que o usuário sequer viu -
     * mesmo problema do precoCusto, só que aqui a solução não pode ser
     * "nunca aplicar para não-admin", porque isso bloquearia também o
     * cadastro legítimo de produto novo.
     *
     * Por isso o critério é: aplica se for admin (mesmo que o valor seja
     * null - permite ao admin limpar o preço de propósito), OU se o
     * request trouxer um valor não-null (usuário comum realmente
     * preencheu/alterou o campo, em vez de recebê-lo vazio por não ter
     * permissão de ver o atual).
     */
    private void aplicarPrecoVenda(CadastroProduto produto, CadastroProdutoRequest request, boolean isAdmin) {
        if (isAdmin || request.precoVenda() != null) {
            produto.setPrecoVenda(request.precoVenda());
        }
    }

    /**
     * Cria, atualiza ou remove os registros de EstoqueMinimo/EstoqueMaximo
     * de um produto, de acordo com o que veio no formulário. Sem isto, o
     * produto nunca aparece em "Produtos que Exigem Atenção" nem é pego
     * pelos alertas automáticos do MovimentacaoService, mesmo com estoque
     * baixo/alto de verdade - por isso é chamado tanto no cadastro quanto
     * na edição, nunca deixado como um passo à parte.
     */
    private void sincronizarLimites(CadastroProduto produto, Integer estoqueMinimo, Integer estoqueMaximo) {
        Optional<EstoqueMinimo> minimoExistente = estoqueMinimoRepository.findByProduto_Id(produto.getId());
        if (estoqueMinimo != null) {
            EstoqueMinimo minimo = minimoExistente.orElseGet(() -> new EstoqueMinimo(produto, estoqueMinimo, estoqueMinimo));
            // estoqueReposicao (ponto de reposição sugerido) simplificado
            // para ser igual ao mínimo, já que o formulário não pede esse
            // valor separadamente por enquanto.
            minimo.setEstoqueMinimo(estoqueMinimo);
            minimo.setEstoqueReposicao(estoqueMinimo);
            estoqueMinimoRepository.save(minimo);
        } else {
            minimoExistente.ifPresent(estoqueMinimoRepository::delete);
        }

        Optional<EstoqueMaximo> maximoExistente = estoqueMaximoRepository.findByProduto_Id(produto.getId());
        if (estoqueMaximo != null) {
            EstoqueMaximo maximo = maximoExistente.orElseGet(() -> new EstoqueMaximo(produto, estoqueMaximo));
            maximo.setEstoqueMaximo(estoqueMaximo);
            estoqueMaximoRepository.save(maximo);
        } else {
            maximoExistente.ifPresent(estoqueMaximoRepository::delete);
        }
    }
}
