package com.estoque.demo.dto;

// Alimenta a lista de contas na tela de Privilégios (GET
// /api/administracao/usuarios) - só o necessário para montar o seletor
// "quem eu quero promover/rebaixar", nada sensível (sem senha, sem hash,
// sem resposta de segurança).
public record UsuarioResumoResponse(String usuario, String nomeCompleto, boolean administrador) {
}
