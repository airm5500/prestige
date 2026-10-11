package com.prestige.etiquettage.impression;

import etiquetagepro.disposition.Disposition;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.json.JSONObject;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Dispositions personnalisees enregistrees (une par type de code et dimension d'etiquette). */
@Repository
public class Dispositions {

    private final JdbcTemplate jdbc;

    public Dispositions(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static Disposition lire(String json) {
        try {
            return Disposition.lire(new JSONObject(json));
        } catch (RuntimeException e) {
            /* disposition illisible : dessin d'origine, l'impression n'est pas bloquee */
            return null;
        }
    }

    /** Disposition enregistree pour ce type et cette dimension, sinon null (dessin d'origine). */
    public Disposition pour(String type, float largeur, float hauteur) {
        List<String> l = jdbc.queryForList("SELECT contenu FROM disposition WHERE cle = ?", String.class,
                Disposition.cle(type, largeur, hauteur));
        return l.isEmpty() ? null : lire(l.get(0));
    }

    /** Dispositions du meme type (autres dimensions), la plus recente d'abord. */
    public List<Disposition> duType(String type) {
        List<Disposition> r = new ArrayList<>();
        for (String c : jdbc.queryForList("SELECT contenu FROM disposition WHERE type_code = ? ORDER BY modifie_le DESC",
                String.class, type)) {
            Disposition d = lire(c);
            if (d != null) {
                r.add(d);
            }
        }
        return r;
    }

    public List<Map<String, Object>> liste() {
        return jdbc.queryForList("SELECT cle, type_code AS type, largeur_mm AS largeur, hauteur_mm AS hauteur,"
                + " DATE_FORMAT(modifie_le, '%d/%m/%Y %H:%i') AS modifieLe, modifie_par AS modifiePar"
                + " FROM disposition ORDER BY type_code, largeur_mm, hauteur_mm");
    }

    public void enregistrer(Disposition d, String qui) {
        jdbc.update("INSERT INTO disposition (cle, type_code, largeur_mm, hauteur_mm, contenu, modifie_par)"
                + " VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE contenu = VALUES(contenu), modifie_le = NOW(),"
                + " modifie_par = VALUES(modifie_par)", d.cle(), d.getTypeCode(), d.getLargeur(), d.getHauteur(),
                d.json().toString(), qui);
    }

    public boolean supprimer(String type, float largeur, float hauteur) {
        return jdbc.update("DELETE FROM disposition WHERE cle = ?", Disposition.cle(type, largeur, hauteur)) > 0;
    }
}
