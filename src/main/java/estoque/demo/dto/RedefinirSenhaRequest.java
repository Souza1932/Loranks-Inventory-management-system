package com.estoque.demo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Corpo de POST /api/auth/recuperar-senha/redefinir: { usuario, resposta, novaSenha }
public record RedefinirSenhaRequest(

        @NotBlank(message = "Usuario e obrigatorio")
        String usuario,

        @NotBlank(message = "Resposta de seguranca e obrigatoria")
        String resposta,

        @NotBlank(message = "Nova senha e obrigatoria")
        @Size(min = 6, max = 64, message = "Nova senha deve ter entre 6 e 64 caracteres")
        String novaSenha) {

    @Override
    public String toString() {
        // Mesma mascara de CadastroUsuarioRequest/LoginRequest: nunca vazar
        // a resposta de seguranca nem a nova senha em log/excecao acidental.
        return "RedefinirSenhaRequest[usuario=%s, resposta=****, novaSenha=****]".formatted(usuario);
    }
}
