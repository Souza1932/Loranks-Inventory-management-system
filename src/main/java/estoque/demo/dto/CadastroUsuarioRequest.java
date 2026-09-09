package com.estoque.demo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/*
 * Corpo de POST /api/auth/cadastro. Espelha exatamente os campos e limites
 * ja validados no cliente por criar-conta.js (RULES.nomeCompleto/username/
 * password) - a validacao aqui e OBRIGATORIA e independente da do cliente:
 * conforme as Secure Coding Guidelines for Java SE da Oracle (Guideline 2-2,
 * "Defend in depth" / nunca confiar em validacao feita so no lado do
 * cliente), toda entrada e revalidada no servidor antes de tocar o banco.
 *
 * @Size define tambem um teto (maxLength) para os tres campos, evitando que
 * um payload artificialmente gigante seja hasheado (Argon2) ou persistido
 * sem necessidade - uma forma simples de nega de recurso (DoS) por entrada
 * nao limitada.
 *
 * IMPORTANTE (dados sensiveis): "senha" so existe como String aqui porque
 * a desserializacao JSON do Spring e a assinatura de PasswordEncoder#encode
 * exigem CharSequence/String - nao ha como usar char[] nesse ponto sem um
 * desserializador customizado. Para compensar, o toString() abaixo NUNCA
 * inclui o valor de "senha" (records geram toString() automatico com todos
 * os campos por padrao, o que vazaria a senha em qualquer log acidental de
 * excecao/objeto) e a senha e descartada assim que o Argon2PasswordEncoder
 * termina o hash (ver Argon2PasswordEncoder.encode, que usa char[] + wipeArray).
 */
public record CadastroUsuarioRequest(

        @NotBlank(message = "Nome completo e obrigatorio")
        @Size(max = 150, message = "Nome completo deve ter no maximo 150 caracteres")
        String nomeCompleto,

        @NotBlank(message = "Usuario e obrigatorio")
        @Size(min = 3, max = 40, message = "Usuario deve ter entre 3 e 40 caracteres")
        String usuario,

        @NotBlank(message = "Senha e obrigatoria")
        @Size(min = 6, max = 64, message = "Senha deve ter entre 6 e 64 caracteres")
        String senha,

        // Unico mecanismo de "esqueci minha senha" do sistema (sem e-mail
        // cadastrado): obrigatorio em toda conta nova. Contas criadas antes
        // desta funcionalidade existir simplesmente nao tem esses dois campos
        // preenchidos (ver comentario em Cadastro.perguntaSeguranca) e, por
        // enquanto, continuam sem forma de recuperacao automatizada.
        @NotBlank(message = "Pergunta de seguranca e obrigatoria")
        @Size(min = 5, max = 200, message = "Pergunta de seguranca deve ter entre 5 e 200 caracteres")
        String perguntaSeguranca,

        @NotBlank(message = "Resposta de seguranca e obrigatoria")
        @Size(min = 2, max = 100, message = "Resposta de seguranca deve ter entre 2 e 100 caracteres")
        String respostaSeguranca) {

    @Override
    public String toString() {
        // Mascara deliberada: nunca serializar a senha (nem a resposta de
        // seguranca, que e uma credencial tao sensivel quanto) em texto
        // puro, nem em logs de depuracao, nem em mensagens de excecao que
        // incluam este objeto (ex.: falha de bind/serializacao do Spring).
        return "CadastroUsuarioRequest[nomeCompleto=%s, usuario=%s, senha=****, perguntaSeguranca=%s, respostaSeguranca=****]"
                .formatted(nomeCompleto, usuario, perguntaSeguranca);
    }
}
