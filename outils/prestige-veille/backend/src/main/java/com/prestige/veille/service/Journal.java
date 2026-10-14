package com.prestige.veille.service;

import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Journal des actions (connexions, reglages, vidages, redemarrages, alertes). */
@Service
public class Journal {

    private final JdbcTemplate jdbc;

    public Journal(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void noter(String utilisateur, String action, String resultat) {
        jdbc.update("INSERT INTO journal (quand, utilisateur, action, resultat) VALUES (?, ?, ?, ?)",
                new Timestamp(System.currentTimeMillis()), utilisateur, action,
                resultat == null ? "" : resultat.substring(0, Math.min(500, resultat.length())));
    }

    public List<Map<String, Object>> derniers(int n) {
        return jdbc.queryForList("SELECT quand, utilisateur, action, resultat FROM journal ORDER BY id DESC LIMIT ?",
                Math.max(1, Math.min(500, n)));
    }
}
