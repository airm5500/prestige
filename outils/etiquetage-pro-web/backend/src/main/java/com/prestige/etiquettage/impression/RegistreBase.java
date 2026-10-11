package com.prestige.etiquettage.impression;

import etiquetagepro.RegistreCodes;
import etiquetagepro.RegistreLocal;
import java.security.SecureRandom;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Codes propres aux etiquettes 2D (DataMatrix+, QR+), jamais redonnes : table code_etiquette (cle primaire = garde contre
 * les doublons). Meme forme que l'application autonome : prefixe de 2 caracteres tire a la premiere impression puis
 * garde (reglage {@value #PREFIXE}), 5 caracteres en tout, puis 6, 7, 8 quand une longueur est prise a 90 %.
 */
@Component
public class RegistreBase implements RegistreCodes {

    public static final String PREFIXE = "codes.prefixe";
    private static final String ALPHABET = RegistreLocal.ALPHABET;
    private final JdbcTemplate jdbc;
    private final Reglages reglages;
    private final SecureRandom hasard = new SecureRandom();

    public RegistreBase(JdbcTemplate jdbc, Reglages reglages) {
        this.jdbc = jdbc;
        this.reglages = reglages;
    }

    public synchronized String prefixe() {
        String p = reglages.lire(PREFIXE);
        if (!RegistreLocal.prefixeValide(p)) {
            p = "" + ALPHABET.charAt(hasard.nextInt(ALPHABET.length())) + ALPHABET.charAt(hasard.nextInt(ALPHABET.length()));
            reglages.ecrire(PREFIXE, p);
        }
        return p;
    }

    static long capacite(int longueur) {
        long c = 1;
        for (int i = 2; i < longueur; i++) {
            c *= ALPHABET.length();
        }
        return c;
    }

    /** Longueur en cours et codes deja pris a cette longueur (compte une fois, puis tenu a jour). */
    private String prefixeCompte;
    private int longueur;
    private long pris;

    private long compter(String p, int l) {
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM code_etiquette WHERE CHAR_LENGTH(code) = ? AND code LIKE ?",
                Long.class, l, p + "%");
        return n == null ? 0 : n;
    }

    @Override
    public synchronized String attribuer(String cip) {
        String p = prefixe();
        if (!p.equals(prefixeCompte)) {
            prefixeCompte = p;
            longueur = 5;
            pris = compter(p, longueur);
        }
        while (longueur < 8 && pris >= capacite(longueur) * 9 / 10) {
            longueur++;
            pris = compter(p, longueur);
        }
        for (int essai = 0; essai < 200; essai++) {
            StringBuilder b = new StringBuilder(p);
            for (int i = 2; i < longueur; i++) {
                b.append(ALPHABET.charAt(hasard.nextInt(ALPHABET.length())));
            }
            try {
                jdbc.update("INSERT INTO code_etiquette (code, cip) VALUES (?, ?)", b.toString(), cip);
                pris++;
                return b.toString();
            } catch (DuplicateKeyException deja) {
                // code deja donne : on tire de nouveau
            }
        }
        return null;
    }
}
