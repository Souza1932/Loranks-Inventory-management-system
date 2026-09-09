package com.estoque.demo.dto;

import jakarta.validation.constraints.NotBlank;

// Corpo de POST /api/auth/recuperar-senha/verificar-resposta: { usuario, resposta }
// Usado pelo botão "Confirmar" da etapa 2 de esqueci-senha.html, ANTES de
// mostrar os campos de nova senha - só confere a resposta, não altera nada.
public record VerificarRespostaSegurancaRequest(

        @NotBlank(message = "Usuario e obrigatorio")
        String usuario,

        @NotBlank(message = "Resposta de seguranca e obrigatoria")
        String resposta) {

    @Override
    public String toString() {
        // Mesma mascara das demais requisicoes deste fluxo: nunca vazar a
        // resposta de seguranca em log/excecao acidental.
        return "VerificarRespostaSegurancaRequest[usuario=%s, resposta=****]".formatted(usuario);
    }
}
