package com.prestige.etiquettage.securite;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Premier lancement : compte admin / admin (chiffre), marque « mot de passe par defaut » tant qu'il n'est pas change. */
@Component
public class CompteParDefaut implements ApplicationRunner {

    private final JdbcTemplate jdbc;
    private final PasswordEncoder chiffrement;

    public CompteParDefaut(JdbcTemplate jdbc, PasswordEncoder chiffrement) {
        this.jdbc = jdbc;
        this.chiffrement = chiffrement;
    }

    @Override
    public void run(ApplicationArguments args) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM utilisateur", Integer.class);
        if (n != null && n == 0) {
            jdbc.update("INSERT INTO utilisateur (login, mot_de_passe, mdp_par_defaut) VALUES ('admin', ?, 1)",
                    chiffrement.encode("admin"));
        }
    }
}
