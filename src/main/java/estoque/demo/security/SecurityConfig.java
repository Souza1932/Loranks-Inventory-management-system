package com.estoque.demo.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.LogoutConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf
                // Cookie legivel por JS (XSRF-TOKEN) para que as chamadas fetch() do
                // dashboard enviem o header X-XSRF-TOKEN nas requisicoes que alteram
                // estado (ex.: /api/estoque/**, /api/perfil).
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                // IMPORTANTE: por padrao (Spring Security 6+), o handler e o
                // XorCsrfTokenRequestAttributeHandler, que ofusca (XOR) o valor do
                // token a cada requisicao como protecao extra contra ataques BREACH.
                // Isso e pensado para o padrao "token embutido no HTML pelo servidor
                // e devolvido uma unica vez" (ex.: campo hidden de formulario
                // Thymeleaf) - nao para o padrao usado aqui, onde o JS le o cookie
                // diretamente e o reenvia como header em requisicoes subsequentes.
                // Com o handler padrao, o valor gravado no cookie nao bate mais com
                // o que o servidor espera de volta, e toda requisicao cai em 403
                // mesmo com o cookie e o header presentes e aparentemente corretos.
                // CsrfTokenRequestAttributeHandler (sem o Xor) resolve o token em
                // texto plano, compativel com o padrao cookie->header do JS.
                .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                // /api/auth/login e /api/auth/cadastro sao isentos de CSRF: nao existe
                // sessao autenticada previa para um ataque CSRF sequestrar nesses dois
                // endpoints (o usuario ainda nem esta logado), entao a protecao aqui nao
                // agrega seguranca real - so adiciona uma dependencia a mais (cookie
                // XSRF-TOKEN precisar existir ANTES do primeiro POST) que pode falhar
                // silenciosamente. O restante da API continua protegido normalmente.
                // Mesmo raciocinio para as duas rotas de recuperacao de senha: quem
                // chama ainda nao tem sessao autenticada.
                .ignoringRequestMatchers(
                        "/api/auth/login", "/api/auth/cadastro",
                        "/api/auth/recuperar-senha/pergunta", "/api/auth/recuperar-senha/verificar-resposta",
                        "/api/auth/recuperar-senha/redefinir"))
            // Forca a resolucao do token CSRF em toda requisicao, para que o
            // cookie XSRF-TOKEN seja escrito mesmo em paginas estaticas
            // (ver javadoc de CsrfCookieFilter).
            .addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/", "/loranks", "/index.html", "/style.css", "/script.js", "/autenticacao.js",
                    "/criar-conta.html", "/criar-conta.js",
                    "/api/auth/login", "/api/auth/cadastro",
                    "/api/auth/recuperar-senha/pergunta", "/api/auth/recuperar-senha/verificar-resposta",
                    "/api/auth/recuperar-senha/redefinir",
                    "/login", "/esqueci-senha", "/css/**", "/estilo.css", "/auth.css", "/api.js", "/recuperar-senha.js", "/i18n.js"
                ).permitAll()
                // Só administrador exclui ou edita produto (cadastrar um
                // produto NOVO continua aberto a qualquer funcionário -
                // só a exclusão e a edição de um já existente exigem
                // admin). Precisa vir ANTES do .anyRequest().authenticated()
                // abaixo - o Spring avalia as regras na ordem declarada e
                // usa a primeira que casar.
                .requestMatchers(HttpMethod.DELETE, "/api/estoque/produtos/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/estoque/produtos/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            // Sem isto, um 403 de autorização (ex.: DELETE de produto por
            // não-admin) cai no tratamento padrão do Spring Security -
            // fora do @RestControllerAdvice da aplicação, sem o corpo JSON
            // { erro: "..." } que todo o resto da API devolve. Aqui a
            // gente escreve esse mesmo formato manualmente, porque
            // exceção de autorização é resolvida no filtro de segurança,
            // antes de chegar no controller/ApiExceptionHandler.
            .exceptionHandling(handling -> handling
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setStatus(HttpStatus.FORBIDDEN.value());
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.getWriter().write("{\"erro\":\"Apenas administradores podem realizar esta ação.\"}");
                }))
            .formLogin(form -> form
                .loginPage("/login")
                .loginProcessingUrl("/login")
                .usernameParameter("usuario")
                .passwordParameter("senha")
                .defaultSuccessUrl("/", true)
                .failureUrl("/login?erro"))
            .logout(LogoutConfigurer::permitAll);

        return http.build();
    }

    // Usado pelo AutenticacaoApiController (POST /api/auth/login) para validar
    // usuario/senha manualmente, fora do fluxo padrao de formLogin.
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}









































