package com.estoque.demo.exception;

public class ProdutoNaoEncontradoException extends RuntimeException {
    public ProdutoNaoEncontradoException(long id) {
        super("Produto não encontrado: id=" + id);
    }
}
