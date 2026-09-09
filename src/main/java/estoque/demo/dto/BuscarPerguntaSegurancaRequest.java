package com.estoque.demo.dto;

import jakarta.validation.constraints.NotBlank;

// Corpo de POST /api/auth/recuperar-senha/pergunta: { usuario }
public record BuscarPerguntaSegurancaRequest(

        @NotBlank(message = "Usuario e obrigatorio")
        String usuario) {
}
