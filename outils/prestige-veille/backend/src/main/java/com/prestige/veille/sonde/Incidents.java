package com.prestige.veille.sonde;

import com.prestige.veille.regles.Regles;
import com.prestige.veille.service.Alertes;
import com.prestige.veille.service.Reglages;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Incidents : une cible injoignable N fois de suite ouvre un incident (PANNE), un seuil depasse en ouvre un autre
 * (SEUIL) ; chacun se ferme au premier retour a la normale. L'ouverture et la fermeture sont alertees.
 */
@Service
public class Incidents {

    private final JdbcTemplate jdbc;
    private final Reglages reglages;
    private final Alertes alertes;
    private final Map<String, Integer> echecs = new ConcurrentHashMap<>();

    public Incidents(JdbcTemplate jdbc, Reglages reglages, Alertes alertes) {
        this.jdbc = jdbc;
        this.reglages = reglages;
        this.alertes = alertes;
    }

    private Long ouvert(String cible, String nature) {
        List<Long> l = jdbc.queryForList("SELECT id FROM incident WHERE cible = ? AND nature = ? AND fin IS NULL", Long.class,
                cible, nature);
        return l.isEmpty() ? null : l.get(0);
    }

    /** Debut de la panne en cours d'une cible (null si elle repond). */
    public LocalDateTime panneDepuis(String cible) {
        List<Timestamp> l = jdbc.queryForList("SELECT debut FROM incident WHERE cible = ? AND nature = 'PANNE' AND fin IS NULL",
                Timestamp.class, cible);
        return l.isEmpty() ? null : l.get(0).toLocalDateTime();
    }

    public void evaluer(Mesure m) {
        int e = m.ok ? 0 : echecs.merge(m.cible, 1, Integer::sum);
        if (m.ok) {
            echecs.put(m.cible, 0);
        }
        Long id = ouvert(m.cible, "PANNE");
        switch (Regles.transition(m.ok, e, reglages.entier("seuil.echecs", 2), id != null)) {
        case OUVRIR:
            String msg = m.cible + " ne répond pas" + (m.detail == null ? "" : " : " + m.detail);
            jdbc.update("INSERT INTO incident (cible, nature, debut, message, gravite) VALUES (?, 'PANNE', ?, ?, 'CRITIQUE')",
                    m.cible, Timestamp.valueOf(m.quand.minusSeconds(30L * Math.max(0, e - 1))), msg);
            alertes.envoyer("Panne : " + m.cible, msg);
            break;
        case FERMER:
            jdbc.update("UPDATE incident SET fin = ? WHERE id = ?", Timestamp.valueOf(m.quand), id);
            alertes.envoyer("Rétabli : " + m.cible, m.cible + " répond de nouveau.");
            break;
        default:
            break;
        }
        if (m.ok) {
            String s = Regles.seuil(m.memoirePct, reglages.entier("seuil.memoire.pct", 90), m.disqueLibreMo,
                    reglages.entier("seuil.disque.mo", 2048), m.ramLibreMo, m.ramTotaleMo);
            Long seuil = ouvert(m.cible, "SEUIL");
            if (s != null && seuil == null) {
                jdbc.update("INSERT INTO incident (cible, nature, debut, message, gravite) VALUES (?, 'SEUIL', ?, ?, 'ATTENTION')",
                        m.cible, Timestamp.valueOf(m.quand), s);
                alertes.envoyer("Attention : " + m.cible, s);
            } else if (s == null && seuil != null) {
                jdbc.update("UPDATE incident SET fin = ? WHERE id = ?", Timestamp.valueOf(m.quand), seuil);
            }
        }
    }

    public List<Map<String, Object>> liste(int jours) {
        return jdbc.queryForList("SELECT id, cible, nature, debut, fin, message, gravite,"
                + " DATEDIFF('MINUTE', debut, COALESCE(fin, CURRENT_TIMESTAMP)) AS minutes FROM incident"
                + " WHERE debut >= ? OR fin IS NULL ORDER BY debut DESC LIMIT 500",
                Timestamp.valueOf(LocalDateTime.now().minusDays(Math.max(1, Math.min(90, jours)))));
    }

    public List<Map<String, Object>> ouverts() {
        return jdbc.queryForList("SELECT id, cible, nature, debut, message, gravite FROM incident WHERE fin IS NULL ORDER BY debut");
    }
}
