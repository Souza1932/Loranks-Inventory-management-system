package com.estoque.demo.exception;

/*
 * Bloqueia a pessoa de excluir a própria conta enquanto está autenticada
 * com ela - evita o auto-lockout acidental (ou malicioso, por uma sessão
 * sequestrada) de "cliquei errado e me excluí do sistema". Quem quiser
 * mesmo sair do sistema precisa que OUTRA conta (com a senha de
 * privilégios) faça essa exclusão.
 */
public class ExclusaoDaPropriaContaException extends RuntimeException {
    public ExclusaoDaPropriaContaException() {
        super("Você não pode excluir sua própria conta enquanto estiver autenticado com ela. "
                + "Peça para outra pessoa com a senha de privilégios fazer isso.");
    }
}
