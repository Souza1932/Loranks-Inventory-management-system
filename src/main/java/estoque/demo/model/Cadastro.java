package com.estoque.demo.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "cadastro")
public class Cadastro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nome_completo", nullable = false, length = 255)
    private String nomeCompleto;

    @Column(name = "usuario", nullable = false, unique = true, length = 100)
    private String usuario;

    @Column(name = "senha", nullable = false, length = 255)
    private String senha;

    // Idioma preferido da interface (default pt-BR)
    @Column(name = "idioma", length = 10)
    private String idioma = "pt-BR";

    // Pergunta de segurança escolhida livremente pelo usuário no cadastro,
    // usada como único mecanismo de "esqueci minha senha" (sem e-mail).
    // NAO declarada "nullable = false" de proposito: contas criadas ANTES
    // desta funcionalidade existir nao tem esses dois campos preenchidos, e
    // uma constraint NOT NULL quebraria o spring.jpa.hibernate.ddl-auto=update
    // (ALTER TABLE ... NOT NULL falha em tabela com linhas existentes sem
    // DEFAULT). A obrigatoriedade em cadastros NOVOS e garantida em
    // CadastroUsuarioRequest (@NotBlank), nao aqui no schema.
    @Column(name = "pergunta_seguranca", length = 200)
    private String perguntaSeguranca;

    // Hash Argon2id da resposta (nunca texto puro) - mesmo encoder da senha.
    @Column(name = "resposta_seguranca_hash", length = 255)
    private String respostaSegurancaHash;

    // Flag de administrador: só quem tem isto = true pode excluir produto e
    // ver/editar preço de custo. NAO declarada "nullable = false" pelo
    // mesmo motivo de perguntaSeguranca acima (ALTER TABLE NOT NULL falha
    // em tabela com linhas existentes) - contas antigas ficam com null,
    // tratado como "não é administrador" em toda a aplicação (nunca
    // comparar diretamente com true, sempre via Boolean.TRUE.equals(...)
    // ou o helper isAdministrador() abaixo).
    @Column(name = "administrador")
    private Boolean administrador;

    public Cadastro() {}

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNomeCompleto() {
        return nomeCompleto;
    }

    public void setNomeCompleto(String nomeCompleto) {
        this.nomeCompleto = nomeCompleto;
    }

    public String getUsuario() {
        return usuario;
    }

    public void setUsuario(String usuario) {
        this.usuario = usuario;
    }

    public String getSenha() {
        return senha;
    }

    public void setSenha(String senha) {
        this.senha = senha;
    }

    public String getIdioma() {
        return idioma;
    }

    public void setIdioma(String idioma) {
        this.idioma = idioma;
    }

    public String getPerguntaSeguranca() {
        return perguntaSeguranca;
    }

    public void setPerguntaSeguranca(String perguntaSeguranca) {
        this.perguntaSeguranca = perguntaSeguranca;
    }

    public String getRespostaSegurancaHash() {
        return respostaSegurancaHash;
    }

    public void setRespostaSegurancaHash(String respostaSegurancaHash) {
        this.respostaSegurancaHash = respostaSegurancaHash;
    }

    public Boolean getAdministrador() {
        return administrador;
    }

    public void setAdministrador(Boolean administrador) {
        this.administrador = administrador;
    }

    /** Trata null (contas antigas, ou nunca promovidas) como "não é administrador". */
    public boolean isAdministrador() {
        return Boolean.TRUE.equals(administrador);
    }
}


















