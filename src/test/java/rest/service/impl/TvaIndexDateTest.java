package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Field;
import java.lang.reflect.Proxy;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.persistence.EntityManager;
import javax.persistence.Query;

import org.junit.jupiter.api.Test;

import rest.service.dto.BalanceParamsDTO;

/**
 * Retour support du 18/11 (R8) : « v3/tvas » du 01/11 au 16/11, 5,6 s a appaul (3,2 s sur la copie). MariaDB partait
 * des utilisateurs et lisait toutes leurs ventes avant de filtrer la date ; avec l'index (statut, date) : 0,28 s, memes
 * lignes, jamais plus lent de 1 jour a 3 ans (mesures du rapport).
 *
 * <p>
 * Par le vrai point d'entree {@code statistiqueTvaView} (route v3/tvas), avec une base simulee qui garde chaque requete
 * : pour l'officine, la requete des TVA lit les ventes par l'index de date, dans toutes ses variantes (par jour ou non,
 * ventes au comptant seules ou toutes) ; pour un depot d'extension, rien ne change ; aucun repere {indexDate} ne reste.
 */
public class TvaIndexDateTest {

    private static List<String> requetes(boolean depot, boolean parJour, boolean vnoSeul) throws Exception {
        List<String> sqls = new ArrayList<>();
        EntityManager em = (EntityManager) Proxy.newProxyInstance(TvaIndexDateTest.class.getClassLoader(),
                new Class<?>[] { EntityManager.class }, (proxy, m, args) -> {
                    switch (m.getName()) {
                    case "find":
                        return null;
                    case "createNativeQuery":
                        String sql = (String) args[0];
                        sqls.add(sql);
                        Map<Integer, Object> p = new HashMap<>();
                        return Proxy.newProxyInstance(TvaIndexDateTest.class.getClassLoader(),
                                new Class<?>[] { Query.class }, (q, qm, qa) -> {
                                    switch (qm.getName()) {
                                    case "setParameter":
                                        p.put((Integer) qa[0], qa[1]);
                                        return q;
                                    case "getSingleResult":
                                        // t_emplacement : depot d'extension ou non ; mvttransaction : un mouvement
                                        return sql.contains("t_emplacement") ? BigDecimal.valueOf(depot ? 1 : 0)
                                                : Integer.valueOf(1);
                                    case "getResultList":
                                        return new ArrayList<>();
                                    case "setMaxResults":
                                        return q;
                                    default:
                                        throw new UnsupportedOperationException(qm.getName());
                                    }
                                });
                    default:
                        throw new UnsupportedOperationException(m.getName());
                    }
                });
        BalanceServiceImpl s = new BalanceServiceImpl();
        Field f = BalanceServiceImpl.class.getDeclaredField("em");
        f.setAccessible(true);
        f.set(s, em);
        BalanceParamsDTO params = BalanceParamsDTO.builder().dtStart("2026-11-01").dtEnd("2026-11-16")
                .emplacementId(depot ? "DEPOT1" : "1").vnoOnly(vnoSeul).byDay(parJour).build();
        if (parJour) {
            s.statistiqueTvaGroupingByDay(params);
        } else {
            s.statistiqueTvaView(params);
        }
        return sqls;
    }

    private static String requeteTva(List<String> sqls) {
        return sqls.stream().filter(x -> x.contains("d.valeurTva AS valeurTva")).findFirst()
                .orElseThrow(() -> new AssertionError("requete des TVA non envoyee : " + sqls));
    }

    @Test
    public void officineLesVentesSontLuesParLIndexDeDate() throws Exception {
        String sql = requeteTva(requetes(false, false, false));
        assertTrue(sql.contains("t_preenregistrement p FORCE INDEX (idx_preenr_statut_date)"), sql);
    }

    @Test
    public void toutesLesVariantesDeLOfficine() throws Exception {
        int n = 0;
        for (boolean parJour : new boolean[] { false, true }) {
            for (boolean vno : new boolean[] { false, true }) {
                String sql = requeteTva(requetes(false, parJour, vno));
                assertTrue(sql.contains("FORCE INDEX (idx_preenr_statut_date)"), parJour + "/" + vno + " : " + sql);
                assertFalse(sql.contains("{"), "aucun repere laisse : " + sql);
                assertEquals(vno, sql.contains("m.`typeTransaction` =0"), "ventes au comptant seules");
                n++;
            }
        }
        assertEquals(4, n);
    }

    @Test
    public void unDepotGardeLaRequeteDAvant() throws Exception {
        for (boolean parJour : new boolean[] { false, true }) {
            String sql = requeteTva(requetes(true, parJour, false));
            assertFalse(sql.contains("FORCE INDEX"), sql);
            assertFalse(sql.contains("{"), "aucun repere laisse : " + sql);
            assertTrue(sql.contains("FROM t_preenregistrement_detail d,t_preenregistrement p,t_user u"), sql);
        }
    }
}
