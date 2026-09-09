package com.estoque.demo.dto;

import jakarta.validation.constraints.NotBlank;

// Corpo de POST /api/administracao/privilegios.
// administrador=true promove a admin; administrador=false rebaixa a
// funcionário comum. senhaPrivilegios é o segredo do servidor (NAO a senha
// de login de ninguém) - ver PrivilegioService para a justificativa de
// existir uma segunda senha separada.
public record AtribuirPrivilegioRequest(

        @NotBlank(message = "Usuario e obrigatorio")
        String usuario,

        boolean administrador,

        @NotBlank(message = "Senha de privilegios e obrigatoria")
        String senhaPrivilegios) {

    @Override
    public String toString() {
        // Mesma mascara de sempre: nunca vazar a senha de privilegios em
        // log/excecao acidental.
        return "AtribuirPrivilegioRequest[usuario=%s, administrador=%s, senhaPrivilegios=****]"
                .formatted(usuario, administrador);
    }
}
