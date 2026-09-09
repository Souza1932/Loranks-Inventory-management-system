package com.estoque.demo.security;

import com.estoque.demo.model.Cadastro;
import com.estoque.demo.repository.CadastroRepository;
import java.util.ArrayList;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class UsuarioDetailsService implements UserDetailsService {

    private final CadastroRepository cadastroRepository;

    public UsuarioDetailsService(CadastroRepository cadastroRepository) {
        this.cadastroRepository = cadastroRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String usuario) throws UsernameNotFoundException {
        Cadastro cadastro = cadastroRepository.findByUsuario(usuario)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario nao encontrado: " + usuario));

        // Toda conta tem ROLE_USER; ROLE_ADMIN é adicional, só para quem
        // tem o flag "administrador" = true (ver Cadastro.isAdministrador()).
        List<GrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
        if (cadastro.isAdministrador()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        }

        return new User(cadastro.getUsuario(), cadastro.getSenha(), authorities);
    }
}

