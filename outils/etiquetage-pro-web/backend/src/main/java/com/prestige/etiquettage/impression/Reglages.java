package com.prestige.etiquettage.impression;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Reglages de l'application (table reglage : cle -> valeur). */
@Repository
public class Reglages {

    private final JdbcTemplate jdbc;

    public Reglages(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public String lire(String cle) {
        List<String> l = jdbc.queryForList("SELECT valeur FROM reglage WHERE cle = ?", String.class, cle);
        return l.isEmpty() ? null : l.get(0);
    }

    public Map<String, String> tous() {
        Map<String, String> m = new LinkedHashMap<>();
        jdbc.query("SELECT cle, valeur FROM reglage ORDER BY cle", rs -> {
            m.put(rs.getString("cle"), rs.getString("valeur"));
        });
        return m;
    }

    /** Ecrit la valeur ; vide ou null : le reglage est retire (valeur par defaut). */
    public void ecrire(String cle, String valeur) {
        if (valeur == null || valeur.isBlank()) {
            jdbc.update("DELETE FROM reglage WHERE cle = ?", cle);
        } else {
            jdbc.update("INSERT INTO reglage (cle, valeur) VALUES (?, ?) ON DUPLICATE KEY UPDATE valeur = VALUES(valeur)",
                    cle, valeur.strip());
        }
    }
}
