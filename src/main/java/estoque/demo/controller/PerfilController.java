package com.estoque.demo.controller;

import com.estoque.demo.dto.PerfilResponse;
import com.estoque.demo.dto.PerfilUpdateRequest;
import com.estoque.demo.service.PerfilService;
import jakarta.validation.Valid;
import java.security.Principal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/perfil")
public class PerfilController {

    private final PerfilService perfilService;

    public PerfilController(PerfilService perfilService) {
        this.perfilService = perfilService;
    }

    @GetMapping
    public PerfilResponse obterPerfil(Principal principal) {
        return perfilService.obterPerfil(principal.getName());
    }

    @PutMapping
    public PerfilResponse atualizarPerfil(Principal principal, @Valid @RequestBody PerfilUpdateRequest request) {
        return perfilService.atualizarPerfil(principal.getName(), request);
    }
}
