package com.estoque.demo.controller;

import com.estoque.demo.exception.ExclusaoDaPropriaContaException;
import com.estoque.demo.exception.ProdutoNaoEncontradoException;
import com.estoque.demo.exception.SenhaPrivilegiosInvalidaException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> tratarValidacao(MethodArgumentNotValidException ex) {
        Map<String, String> erros = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(erro ->
                erros.put(erro.getField(), erro.getDefaultMessage()));
        return ResponseEntity.badRequest().body(erros);
    }

    @ExceptionHandler(UsernameNotFoundException.class)
    public ResponseEntity<Map<String, String>> tratarUsuarioNaoEncontrado(UsernameNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("erro", ex.getMessage()));
    }

    @ExceptionHandler(ProdutoNaoEncontradoException.class)
    public ResponseEntity<Map<String, String>> tratarProdutoNaoEncontrado(ProdutoNaoEncontradoException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("erro", ex.getMessage()));
    }

    @ExceptionHandler(SenhaPrivilegiosInvalidaException.class)
    public ResponseEntity<Map<String, String>> tratarSenhaPrivilegiosInvalida(SenhaPrivilegiosInvalidaException ex) {
        // 403 (não 401): a pessoa já está autenticada normalmente - só não
        // sabe (ou errou) o segredo extra exigido para esta ação específica.
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("erro", ex.getMessage()));
    }

    @ExceptionHandler(ExclusaoDaPropriaContaException.class)
    public ResponseEntity<Map<String, String>> tratarExclusaoDaPropriaConta(ExclusaoDaPropriaContaException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("erro", ex.getMessage()));
    }
}
