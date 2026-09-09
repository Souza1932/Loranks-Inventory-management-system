package com.estoque.demo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Espelha o payload montado em FormularioPerfil._validarEMontarPayload() em perfil.js:
// { nomeUsuario, idioma, novaSenha? } - novaSenha so vem quando o campo foi preenchido.
public record PerfilUpdateRequest(
        @NotBlank(message = "Nome de usuario e obrigatorio")
        String nomeUsuario,

        @NotBlank(message = "Idioma e obrigatorio")
        String idioma,

        // Opcional: null/ausente quando o usuario nao quis trocar a senha - por isso
        // @Size (nao @NotBlank): a Bean Validation nao valida @Size quando o valor e
        // null, entao a troca continua opcional. Mesmo limite de CadastroUsuarioRequest
        // e RedefinirSenhaRequest: sem isso, um usuario autenticado podia setar senha
        // de 1 caractere (furando a politica aplicada em todo o resto do sistema) ou
        // mandar uma string gigante para o Argon2 hashear por requisicao (DoS barato
        // para quem ja tem conta comum).
        @Size(min = 6, max = 64, message = "Nova senha deve ter entre 6 e 64 caracteres")
        String novaSenha) {

    @Override
    public String toString() {
        // Mesma mascara aplicada em todo DTO com campo de senha no sistema
        // (CadastroUsuarioRequest, AutenticacaoApiController.LoginRequest
        // etc.) - sem isso, o toString() automatico de record incluiria a
        // nova senha em texto puro em qualquer log/excecao acidental que
        // serialize este objeto.
        return "PerfilUpdateRequest[nomeUsuario=%s, idioma=%s, novaSenha=%s]"
                .formatted(nomeUsuario, idioma, novaSenha == null ? "null" : "****");
    }
}
