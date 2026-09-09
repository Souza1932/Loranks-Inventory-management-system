package com.estoque.demo.service;

import com.estoque.demo.dto.PerfilResponse;
import com.estoque.demo.dto.PerfilUpdateRequest;
import com.estoque.demo.model.Cadastro;
import com.estoque.demo.repository.CadastroRepository;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PerfilService {

    private final CadastroRepository cadastroRepository;
    private final PasswordEncoder passwordEncoder;

    public PerfilService(CadastroRepository cadastroRepository, PasswordEncoder passwordEncoder) {
        this.cadastroRepository = cadastroRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public PerfilResponse obterPerfil(String usuarioLogado) {
        Cadastro cadastro = buscar(usuarioLogado);
        return new PerfilResponse(cadastro.getNomeCompleto(), cadastro.getIdioma(), cadastro.isAdministrador());
    }

    @Transactional
    public PerfilResponse atualizarPerfil(String usuarioLogado, PerfilUpdateRequest request) {
        Cadastro cadastro = buscar(usuarioLogado);

        if (request.nomeUsuario() != null && !request.nomeUsuario().isBlank()) {
            cadastro.setNomeCompleto(request.nomeUsuario().trim());
        }

        // Antes, o idioma escolhido no formulário nunca era persistido aqui
        // - a troca "funcionava" só na sessão atual (aplicada no navegador
        // pelo perfil.js, que não depende do que o backend devolve), mas
        // se perdia a cada F5/novo login, porque na próxima vez que a tela
        // de Perfil carregava, buscava um idioma que nunca tinha sido
        // salvo de verdade.
        if (request.idioma() != null && !request.idioma().isBlank()) {
            cadastro.setIdioma(request.idioma().trim());
        }

        // Atualização da senha via Argon2id gerenciado pelo Spring Security
        if (request.novaSenha() != null && !request.novaSenha().isBlank()) {
            cadastro.setSenha(passwordEncoder.encode(request.novaSenha()));
        }

        cadastroRepository.saveAndFlush(cadastro);
        return new PerfilResponse(cadastro.getNomeCompleto(), cadastro.getIdioma(), cadastro.isAdministrador());
    }

    private Cadastro buscar(String usuario) {
        return cadastroRepository.findByUsuario(usuario)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado: " + usuario));
    }
}




















































