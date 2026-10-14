package com.prestige.veille.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Reglages de la veille (table reglage). Les secrets ne sortent jamais vers le navigateur. */
@Service
public class Reglages {

    private final JdbcTemplate jdbc;

    public Reglages(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public String texte(String cle, String defaut) {
        List<String> l = jdbc.queryForList("SELECT valeur FROM reglage WHERE cle = ?", String.class, cle);
        return l.isEmpty() || l.get(0) == null ? defaut : l.get(0).trim();
    }

    public int entier(String cle, int defaut) {
        try {
            return Integer.parseInt(texte(cle, String.valueOf(defaut)));
        } catch (NumberFormatException e) {
            return defaut;
        }
    }

    public boolean oui(String cle) {
        return "1".equals(texte(cle, "0"));
    }

    /** Reglages pour l'ecran : un secret ne montre que s'il est renseigne. */
    public List<Map<String, Object>> pourEcran() {
        List<Map<String, Object>> l = new ArrayList<>();
        jdbc.query("SELECT cle, valeur, secret, libelle, groupe FROM reglage ORDER BY ordre", rs -> {
            Map<String, Object> m = new LinkedHashMap<>();
            boolean secret = rs.getBoolean("secret");
            m.put("cle", rs.getString("cle"));
            m.put("valeur", secret ? "" : rs.getString("valeur"));
            m.put("secret", secret);
            m.put("renseigne", !rs.getString("valeur").isEmpty());
            m.put("libelle", rs.getString("libelle"));
            m.put("groupe", rs.getString("groupe"));
            l.add(m);
        });
        return l;
    }

    /** Enregistrement : cles connues seulement ; un secret laisse vide garde sa valeur. */
    public int enregistrer(Map<String, String> valeurs) {
        int n = 0;
        for (Map.Entry<String, String> e : valeurs.entrySet()) {
            List<Boolean> secret = jdbc.queryForList("SELECT secret FROM reglage WHERE cle = ?", Boolean.class, e.getKey());
            if (secret.isEmpty()) {
                continue;
            }
            String v = e.getValue() == null ? "" : e.getValue().trim();
            if (Boolean.TRUE.equals(secret.get(0)) && v.isEmpty()) {
                continue;
            }
            if (v.length() > 2000) {
                throw new IllegalArgumentException("Valeur trop longue : " + e.getKey());
            }
            n += jdbc.update("UPDATE reglage SET valeur = ? WHERE cle = ?", v, e.getKey());
        }
        return n;
    }
}
