package com.prestige.veille.sonde;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Historique des mesures (base de la veille). */
@Repository
public class Mesures {

    private final JdbcTemplate jdbc;

    public Mesures(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void enregistrer(Mesure m) {
        jdbc.update("INSERT INTO mesure (quand, cible, sonde, ok, ms, memoire_pct, cpu_serveur, cpu_machine, ram_libre_mo,"
                + " ram_totale_mo, disque_libre_mo, fils_http, pool_ms, bdd_connexions, bdd_pic, appel_moyen_ms, ecran_moyen_ms,"
                + " erreurs, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                Timestamp.valueOf(m.quand), m.cible, m.sonde, m.ok, m.ms, m.memoirePct, m.cpuServeur, m.cpuMachine,
                m.ramLibreMo, m.ramTotaleMo, m.disqueLibreMo, m.filsHttp, m.poolMs, m.bddConnexions, m.bddPic,
                m.appelMoyenMs, m.ecranMoyenMs, m.erreurs,
                m.detail == null ? null : m.detail.substring(0, Math.min(500, m.detail.length())));
    }

    /** Derniere mesure de chaque cible. */
    public List<Map<String, Object>> dernieres() {
        return jdbc.queryForList("SELECT m.* FROM mesure m JOIN (SELECT cible, MAX(id) AS id FROM mesure"
                + " WHERE quand >= ? GROUP BY cible) d ON d.id = m.id ORDER BY m.sonde, m.cible",
                Timestamp.valueOf(LocalDateTime.now().minusHours(2)));
    }

    /** Serie d'une cible sur les dernieres heures (au plus 2 000 points). */
    public List<Map<String, Object>> serie(String cible, int heures) {
        return jdbc.queryForList("SELECT quand, ok, ms, memoire_pct, cpu_serveur, cpu_machine, ram_libre_mo, ram_totale_mo,"
                + " disque_libre_mo, fils_http, pool_ms, bdd_connexions, bdd_pic, appel_moyen_ms, ecran_moyen_ms, erreurs"
                + " FROM mesure WHERE cible = ? AND quand >= ? ORDER BY quand", cible,
                Timestamp.valueOf(LocalDateTime.now().minusHours(Math.max(1, Math.min(24 * 31, heures)))));
    }

    /** Disponibilite (%) de chaque cible sur les dernieres heures. */
    public List<Map<String, Object>> disponibilite(int heures) {
        return jdbc.queryForList("SELECT cible, COUNT(*) AS mesures, SUM(CASE WHEN ok THEN 1 ELSE 0 END) * 100.0 / COUNT(*)"
                + " AS disponibilite, AVG(ms) AS ms_moyen FROM mesure WHERE quand >= ? GROUP BY cible ORDER BY cible",
                Timestamp.valueOf(LocalDateTime.now().minusHours(heures)));
    }

    public int purger(int jours) {
        return jdbc.update("DELETE FROM mesure WHERE quand < ?", Timestamp.valueOf(LocalDateTime.now().minusDays(jours)));
    }
}
