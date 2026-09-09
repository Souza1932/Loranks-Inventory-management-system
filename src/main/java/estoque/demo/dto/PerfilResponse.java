package com.estoque.demo.dto;

// Espelha o shape lido por `new PerfilUsuario(dados)` em perfil.js.
// administrador: usado pelo frontend só pra decidir o que MOSTRAR (ex.:
// esconder o campo de preço de custo, esconder o botão de excluir) - a
// aplicação real da regra é sempre no servidor (ver EstoqueController/
// ProdutoService), então mesmo que alguém falsifique esse valor no
// navegador, não ganha nenhum acesso de verdade com isso.
public record PerfilResponse(String nomeUsuario, String idioma, boolean administrador) {
}
