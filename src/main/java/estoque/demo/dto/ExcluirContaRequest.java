package com.estoque.demo.dto;

import jakarta.validation.constraints.NotBlank;

// Corpo de POST /api/administracao/usuarios/excluir.
// senhaPrivilegios e o MESMO segredo de servidor usado em
// AtribuirPrivilegioRequest - excluir uma conta e pelo menos tao sensivel
// quanto promover uma, entao exige a mesma protecao (ver PrivilegioService).
public record ExcluirContaRequest(

        @NotBlank(message = "Usuario e obrigatorio")
        String usuario,

        @NotBlank(message = "Senha de privilegios e obrigatoria")
        String senhaPrivilegios) {

    @Override
    public String toString() {
        // Mesma mascara de sempre: nunca vazar a senha de privilegios em
        // log/excecao acidental.
        return "ExcluirContaRequest[usuario=%s, senhaPrivilegios=****]".formatted(usuario);
    }
}
