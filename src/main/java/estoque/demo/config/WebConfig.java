package com.estoque.demo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // "/" -> nova tela de login estatica (index.html), porta de entrada
        // publica do sistema. "/login" (Thymeleaf) continua existindo como
        // fallback, usado pelo formLogin do Spring Security.
        registry.addRedirectViewController("/", "/index.html");

        // "/loranks" -> mesmo destino, endereco curto pedido para acesso direto.
        registry.addRedirectViewController("/loranks", "/index.html");

        // "/login" -> template Thymeleaf com o formulario de login.
        registry.addViewController("/login").setViewName("login");

        // "/esqueci-senha" -> pagina placeholder (link "Esqueci minha senha" do login).
        registry.addViewController("/esqueci-senha").setViewName("esqueci-senha");
    }
}
