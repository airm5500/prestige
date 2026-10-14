package com.prestige.veille.securite;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Premier lancement : compte admin / admin, a changer a la premiere connexion. */
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
        if (n == null || n == 0) {
            jdbc.update("INSERT INTO utilisateur (login, mot_de_passe, actif, mdp_par_defaut) VALUES ('admin', ?, TRUE, TRUE)",
                    chiffrement.encode("admin"));
        }
    }
}
