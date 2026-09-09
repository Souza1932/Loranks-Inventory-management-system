package com.estoque.demo.repository;

import com.estoque.demo.model.Cadastro;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CadastroRepository extends JpaRepository<Cadastro, Long> {

    // Equivalente ao ConsultasCadastro.checar(login) do projeto original.
    // Reaproveitado também pelo fluxo de "esqueci minha senha" (RecuperacaoSenhaService),
    // que busca a pergunta de segurança e depois grava a nova senha pelo mesmo usuário.
    Optional<Cadastro> findByUsuario(String usuario);
}
