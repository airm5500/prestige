package com.prestige.etiquettage.securite;

import com.prestige.etiquettage.base.BaseEmbarquee;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Premier lancement : compte admin / admin (chiffre), marque « mot de passe par defaut » tant qu'il n'est pas change. */
@Component
public class CompteParDefaut implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(CompteParDefaut.class);

    private final JdbcTemplate jdbc;
    private final PasswordEncoder chiffrement;

    public CompteParDefaut(JdbcTemplate jdbc, PasswordEncoder chiffrement) {
        this.jdbc = jdbc;
        this.chiffrement = chiffrement;
    }

    /** Fichier (vide) a deposer dans le dossier des donnees pour remettre admin / admin au lancement suivant. */
    public static final String REINITIALISER = "reinitialiser-admin.txt";

    @Override
    public void run(ApplicationArguments args) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM utilisateur", Integer.class);
        if (n != null && n == 0) {
            jdbc.update("INSERT INTO utilisateur (login, mot_de_passe, mdp_par_defaut) VALUES ('admin', ?, 1)",
                    chiffrement.encode("admin"));
        }
        reinitialiserSiDemande(BaseEmbarquee.dossierDonnees());
    }

    /**
     * Mot de passe oublie : le fichier {@value #REINITIALISER} depose dans le dossier des donnees de l'utilisateur
     * Windows (acces au poste et a sa session exige) remet admin / admin, actif ; le fichier est ensuite retire.
     */
    public boolean reinitialiserSiDemande(Path dossier) {
        Path f = dossier.resolve(REINITIALISER);
        if (!Files.exists(f)) {
            return false;
        }
        String hash = chiffrement.encode("admin");
        if (jdbc.update("UPDATE utilisateur SET mot_de_passe = ?, mdp_par_defaut = 1, actif = 1 WHERE login = 'admin'",
                hash) == 0) {
            jdbc.update("INSERT INTO utilisateur (login, mot_de_passe, mdp_par_defaut) VALUES ('admin', ?, 1)", hash);
        }
        try {
            Files.delete(f);
        } catch (IOException e) {
            LOG.warn("Fichier {} non retire : le compte admin sera remis a chaque lancement.", f);
        }
        LOG.warn("Compte admin remis a admin / admin (fichier {}).", REINITIALISER);
        return true;
    }
}
