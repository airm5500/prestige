package rest.service.impl;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import rest.service.AnomalieService;
import rest.service.dto.AnomalieDTO;
import rest.service.impl.activite.AnomalieRegles;
import util.Constant;

/**
 * Anomalies par employe (retour du 24/10). Une ligne par occurrence, ecrite seulement quand une anomalie survient
 * (jamais pendant le travail normal) ; plafond par employe et par heure contre une boucle d'erreurs ; purge des
 * anomalies de plus de {@link Constant#ANOMALIE_CONSERVATION_JOURS} jours, une fois par jour.
 */
@Stateless
public class AnomalieServiceImpl implements AnomalieService {

    /** employe -> {heure, nombre} */
    private static final Map<String, long[]> PAR_HEURE = new ConcurrentHashMap<>();
    private static volatile LocalDate dernierePurge;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public boolean enregistrer(String userId, String poste, AnomalieDTO brute) {
        AnomalieDTO a = AnomalieRegles.nettoyer(brute);
        if (a == null || StringUtils.isBlank(userId) || !sousLePlafond(userId)) {
            return false;
        }
        em.createNativeQuery(
                "INSERT INTO t_anomalie_employe (created_at, lg_USER_ID, famille, code, message, ecran, poste,"
                        + " fil) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)")
                .setParameter(1, Timestamp.valueOf(LocalDateTime.now())).setParameter(2, userId)
                .setParameter(3, a.getFamille()).setParameter(4, a.getCode()).setParameter(5, a.getMessage())
                .setParameter(6, a.getEcran())
                .setParameter(7, StringUtils.abbreviate(StringUtils.defaultString(poste), 160))
                .setParameter(8, new JSONArray(a.getFil()).toString()).executeUpdate();
        purgerUneFoisParJour();
        return true;
    }

    private static boolean sousLePlafond(String userId) {
        long heure = System.currentTimeMillis() / 3_600_000L;
        long[] c = PAR_HEURE.compute(userId,
                (k, v) -> v == null || v[0] != heure ? new long[] { heure, 1 } : new long[] { heure, v[1] + 1 });
        return c[1] <= Constant.ANOMALIE_MAX_PAR_HEURE;
    }

    private void purgerUneFoisParJour() {
        LocalDate aujourdhui = LocalDate.now();
        if (aujourdhui.equals(dernierePurge)) {
            return;
        }
        dernierePurge = aujourdhui;
        em.createNativeQuery("DELETE FROM t_anomalie_employe WHERE created_at < ?1")
                .setParameter(1,
                        Timestamp.valueOf(aujourdhui.minusDays(Constant.ANOMALIE_CONSERVATION_JOURS).atStartOfDay()))
                .executeUpdate();
    }
}
