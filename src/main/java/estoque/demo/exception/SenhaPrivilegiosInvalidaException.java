package com.estoque.demo.exception;

public class SenhaPrivilegiosInvalidaException extends RuntimeException {
    public SenhaPrivilegiosInvalidaException() {
        super("Senha de privilégios incorreta.");
    }
}
