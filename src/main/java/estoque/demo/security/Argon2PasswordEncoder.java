package com.estoque.demo.security;

/*
 * Adapta a MESMA logica de hashing Argon2id do projeto original (mesmos
 * parametros: 10 iteracoes, 65536 KB de memoria, 4 threads, salt de 32
 * bytes, hash de 64 bytes) para a interface PasswordEncoder do Spring
 * Security, em vez de trocar por BCrypt (padrao do Spring Security).
 */

import de.mkammerer.argon2.Argon2;
import de.mkammerer.argon2.Argon2Factory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class Argon2PasswordEncoder implements PasswordEncoder {

    private final Argon2 argon2 = Argon2Factory.create(Argon2Factory.Argon2Types.ARGON2id, 32, 64);

    @Override
    public String encode(CharSequence rawPassword) {
        char[] senha = toCharArray(rawPassword);
        try {
            return argon2.hash(10, 65536, 4, senha);
        } finally {
            argon2.wipeArray(senha);
        }
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        if (encodedPassword == null || encodedPassword.isBlank()) {
            return false;
        }
        char[] senha = toCharArray(rawPassword);
        try {
            return argon2.verify(encodedPassword, senha);
        } finally {
            argon2.wipeArray(senha);
        }
    }

    private char[] toCharArray(CharSequence value) {
        char[] chars = new char[value.length()];
        for (int i = 0; i < value.length(); i++) {
            chars[i] = value.charAt(i);
        }
        return chars;
    }
}

























