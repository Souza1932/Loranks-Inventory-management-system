package com.estoque.demo.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;

/*
 * Desde o Spring Security 6, o CsrfToken e resolvido de forma "preguicosa"
 * (deferred): o cookie XSRF-TOKEN so e escrito na resposta se ALGO durante
 * a requisicao efetivamente ler o token (ex.: um template Thymeleaf usando
 * ${_csrf.token}). Paginas estaticas puras (index.html, dashboard-loranks.html)
 * nunca leem o token, entao sem este filtro o cookie NUNCA seria criado - e
 * o front-end (autenticacao.js, api.js) nao teria o que enviar no header
 * X-XSRF-TOKEN, fazendo toda chamada POST/PUT ser rejeitada com 403.
 *
 * Este filtro forca a leitura (csrfToken.getToken()) em toda requisicao,
 * garantindo que o cookie sempre seja escrito. E o padrao recomendado pela
 * propria documentacao do Spring Security para aplicacoes com front-end
 * em JavaScript.
 */
public class CsrfCookieFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        if (csrfToken != null) {
            csrfToken.getToken();
        }
        filterChain.doFilter(request, response);
    }
}
