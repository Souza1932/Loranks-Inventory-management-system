package com.estoque.demo.controller;

import com.estoque.demo.dto.CadastroProdutoRequest;
import com.estoque.demo.dto.ProdutoAbaixoDoMinimoResponse;
import com.estoque.demo.dto.ProdutoCompletoResponse;
import com.estoque.demo.dto.ProdutoEmEstoqueResponse;
import com.estoque.demo.model.CadastroProduto;
import com.estoque.demo.service.ProdutoService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

// Os tres caminhos abaixo sao exatamente os citados nos comentarios
// TODO(integracao) de painel.js, cadastro.js e planilha.js.
@RestController
@RequestMapping("/api/estoque")
public class EstoqueController {

    private static final Logger log = LoggerFactory.getLogger(EstoqueController.class);

    private final ProdutoService produtoService;

    public EstoqueController(ProdutoService produtoService) {
        this.produtoService = produtoService;
    }

    // ROLE_ADMIN só existe pra quem tem Cadastro.administrador = true (ver
    // UsuarioDetailsService) - usado para decidir se preco de custo entra
    // na resposta/gravação (produtos-completos, cadastrar, atualizar). A
    // exclusão em si (DELETE) já é barrada antes de chegar aqui, pelo
    // SecurityConfig (.hasRole("ADMIN")) - não precisa checar de novo.
    private boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_ADMIN"::equals);
    }

    @GetMapping("/produtos")
    public List<ProdutoEmEstoqueResponse> produtosEmEstoque() {
        return produtoService.listarProdutosEmEstoque();
    }

    @GetMapping("/produtos-criticos")
    public List<ProdutoAbaixoDoMinimoResponse> produtosCriticos() {
        return produtoService.listarProdutosCriticos();
    }

    @GetMapping("/produtos-completos")
    public List<ProdutoCompletoResponse> produtosCompletos(Authentication authentication) {
        return produtoService.listarProdutosCompletos(isAdmin(authentication));
    }

    @PostMapping("/produtos")
    public ResponseEntity<Void> cadastrarProduto(@Valid @RequestBody CadastroProdutoRequest request,
                                                  Authentication authentication) {
        // Log de diagnostico: se esta linha NAO aparecer no terminal ao
        // clicar em "Salvar" no modal de cadastro de produto, a requisicao
        // nao esta chegando ao backend (problema no navegador: sessao
        // expirada, CSRF, erro de JS antes do fetch, etc.) - nao no Java.
        log.info("POST /api/estoque/produtos recebido: nomeProduto='{}', quantidade={}",
                request.nomeProduto(), request.quantidade());
        CadastroProduto salvo = produtoService.cadastrar(request, isAdmin(authentication));
        log.info("Produto salvo com sucesso: id={}, nomeProduto='{}'", salvo.getId(), salvo.getNomeProduto());
        return ResponseEntity.created(URI.create("/api/estoque/produtos/" + salvo.getId())).build();
    }

    @PutMapping("/produtos/{id}")
    public ResponseEntity<Void> atualizarProduto(@PathVariable long id, @Valid @RequestBody CadastroProdutoRequest request,
                                                  Authentication authentication) {
        log.info("PUT /api/estoque/produtos/{} recebido: nomeProduto='{}'", id, request.nomeProduto());
        produtoService.atualizar(id, request, isAdmin(authentication));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/produtos/{id}")
    public ResponseEntity<Void> excluirProduto(@PathVariable long id) {
        log.info("DELETE /api/estoque/produtos/{} recebido", id);
        produtoService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
