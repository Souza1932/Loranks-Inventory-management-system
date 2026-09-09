package com.estoque.demo.controller;

import com.estoque.demo.dto.AtribuirPrivilegioRequest;
import com.estoque.demo.dto.ExcluirContaRequest;
import com.estoque.demo.dto.UsuarioResumoResponse;
import com.estoque.demo.service.PrivilegioService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/*
 * Tela "Privilégios": lista contas, permite promover/rebaixar administrador
 * e excluir uma conta. Acessível a qualquer usuário AUTENTICADO (não exige
 * ROLE_ADMIN) de propósito - ver PrivilegioService para o motivo (senha de
 * servidor separada é quem realmente protege isto, não a role de quem
 * chama; sem isso, ninguém conseguiria criar o primeiro admin do sistema).
 */
@RestController
@RequestMapping("/api/administracao")
public class PrivilegiosApiController {

    private final PrivilegioService privilegioService;

    public PrivilegiosApiController(PrivilegioService privilegioService) {
        this.privilegioService = privilegioService;
    }

    @GetMapping("/usuarios")
    public List<UsuarioResumoResponse> listarUsuarios() {
        return privilegioService.listarContas().stream()
                .map(c -> new UsuarioResumoResponse(c.getUsuario(), c.getNomeCompleto(), c.isAdministrador()))
                .toList();
    }

    @PostMapping("/privilegios")
    public ResponseEntity<Void> atribuirPrivilegio(@Valid @RequestBody AtribuirPrivilegioRequest request,
                                                    Authentication authentication) {
        privilegioService.atribuir(authentication.getName(), request.usuario(), request.administrador(),
                request.senhaPrivilegios());
        return ResponseEntity.noContent().build();
    }

    /**
     * Exclui definitivamente a conta de um usuário. Mesma observação de
     * acesso da classe: qualquer autenticado pode CHAMAR este endpoint -
     * quem protege de verdade é a senha de privilégios exigida no corpo
     * (ver PrivilegioService.excluirConta), igual à atribuição de admin
     * acima.
     */
    @PostMapping("/usuarios/excluir")
    public ResponseEntity<Void> excluirConta(@Valid @RequestBody ExcluirContaRequest request,
                                              Authentication authentication) {
        privilegioService.excluirConta(authentication.getName(), request.usuario(), request.senhaPrivilegios());
        return ResponseEntity.noContent().build();
    }
}
