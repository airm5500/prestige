package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Field;
import java.lang.reflect.Proxy;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import javax.persistence.EntityManager;
import javax.persistence.Query;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

import rest.service.MotifVenteService;

/**
 * Retour support du 18/11 (R8) : « vente-motifs/recap » d'UN jour prenait 3 a 5 s a appaul (2,9 a 5 s sur la copie). Le
 * denominateur du taux d'annulation (ventes encaissees par caissiere) filtrait la periode sur COALESCE(completion_date,
 * dt_UPDATED) : aucun index, 985 000 lignes lues pour un jour.
 *
 * <p>
 * Jusqu'a 186 jours, la periode s'ecrit en deux branches disjointes, chacune sur sa colonne indexee ; au-dela, la
 * requete d'origine (plus rapide sur une longue periode). Le test passe par le vrai point d'entree {@code recap}, avec
 * une base simulee qui garde la requete envoyee et ses parametres, puis verifie la regle des deux branches sur des
 * milliers de ventes tirees au hasard : memes ventes retenues que COALESCE, chacune une seule fois.
 */
public class MotifVenteVentesEncaisseesTest {

    /** Requetes envoyees, avec leurs parametres. */
    static final class Envoi {
        String sql;
        Map<Integer, Object> p = new HashMap<>();
    }

    private static List<Envoi> recap(LocalDate debut, LocalDate fin) throws Exception {
        List<Envoi> envois = new ArrayList<>();
        EntityManager em = (EntityManager) Proxy.newProxyInstance(MotifVenteVentesEncaisseesTest.class.getClassLoader(),
                new Class<?>[] { EntityManager.class }, (proxy, m, args) -> {
                    if (!"createNativeQuery".equals(m.getName())) {
                        throw new UnsupportedOperationException(m.getName());
                    }
                    Envoi e = new Envoi();
                    e.sql = (String) args[0];
                    envois.add(e);
                    return Proxy.newProxyInstance(MotifVenteVentesEncaisseesTest.class.getClassLoader(),
                            new Class<?>[] { Query.class }, (q, qm, qa) -> {
                                switch (qm.getName()) {
                                case "setParameter":
                                    e.p.put((Integer) qa[0], qa[1]);
                                    return q;
                                case "getResultList":
                                    List<Object[]> l = new ArrayList<>();
                                    if (e.sql.contains("vente_motif")) {
                                        l.add(new Object[] { MotifVenteService.ANNULATION, "Erreur de saisie", "v1",
                                                "Vendeur", "Operateur", "REF1", "", "16/11/2026 10:00", 1500, "c1",
                                                "Caissiere" });
                                    } else {
                                        l.add(new Object[] { "c1", 40L });
                                    }
                                    return l;
                                default:
                                    throw new UnsupportedOperationException(qm.getName());
                                }
                            });
                });
        MotifVenteServiceImpl s = new MotifVenteServiceImpl();
        Field f = MotifVenteServiceImpl.class.getDeclaredField("em");
        f.setAccessible(true);
        f.set(s, em);
        JSONObject o = s.recap(debut.toString(), fin.toString(), MotifVenteService.ANNULATION, "");
        JSONArray c = o.getJSONArray("classementAnnulations");
        assertEquals(1, c.length());
        assertEquals(40L, c.getJSONObject(0).getLong("ventes"), "le denominateur lu est bien celui de la requete");
        assertEquals(2.5, c.getJSONObject(0).getDouble("taux"), 1e-9, "1 annulation pour 40 ventes");
        return envois;
    }

    private static Envoi denominateur(List<Envoi> envois) {
        return envois.stream().filter(e -> e.sql.contains("lg_USER_CAISSIER_ID, COUNT(*)")).findFirst().get();
    }

    /** Le cas d'appaul : un jour, plus de COALESCE sur la periode, deux branches indexees. */
    @Test
    public void unJourNePorteJamaisSurCoalesce() throws Exception {
        LocalDate j = LocalDate.of(2026, 11, 16);
        Envoi e = denominateur(recap(j, j));
        assertFalse(e.sql.contains("COALESCE(p.completion_date, p.dt_UPDATED) >="),
                "la periode d'un jour ne doit plus porter sur COALESCE (aucun index) : " + e.sql);
        assertTrue(e.sql.contains("p.completion_date >= ?1 AND p.completion_date < ?2"));
        assertTrue(e.sql.contains("p.completion_date IS NULL AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2"));
        assertEquals(java.sql.Date.valueOf(j), e.p.get(1));
        assertEquals(java.sql.Date.valueOf(j.plusDays(1)), e.p.get(2), "borne haute exclue : lendemain");
    }

    /** Choix de la requete selon la duree, sur 3 000 periodes tirees au hasard (graine fixe). */
    @Test
    public void laRequeteDependDeLaDuree() throws Exception {
        Random rnd = new Random(20261119L);
        int courtes = 0;
        int longues = 0;
        for (int i = 0; i < 3000; i++) {
            LocalDate d = LocalDate.of(2024, 1, 1).plusDays(rnd.nextInt(1000));
            int jours = rnd.nextInt(4) == 0 ? 180 + rnd.nextInt(14) : 1 + rnd.nextInt(400);
            LocalDate f = d.plusDays(jours - 1);
            Envoi e = denominateur(recap(d, f));
            boolean court = ChronoUnit.DAYS.between(d, f) + 1 <= MotifVenteServiceImpl.JOURS_DEUX_BRANCHES;
            assertEquals(court, e.sql.contains("UNION ALL"), jours + " jours");
            assertEquals(!court, e.sql.contains("COALESCE(p.completion_date, p.dt_UPDATED) >= ?1"), jours + " jours");
            assertEquals(java.sql.Date.valueOf(d), e.p.get(1));
            assertEquals(java.sql.Date.valueOf(f.plusDays(1)), e.p.get(2));
            if (court) {
                courtes++;
            } else {
                longues++;
            }
        }
        assertTrue(courtes > 500 && longues > 500, courtes + " / " + longues);
    }

    /**
     * Regle des deux branches : sur 20 000 ventes tirees au hasard (date d'encaissement absente une fois sur trois,
     * avant, egale ou apres la mise a jour, aux bornes de la periode), chaque vente est retenue par COALESCE si et
     * seulement si elle l'est par exactement une des deux branches.
     */
    @Test
    public void lesDeuxBranchesRetiennentLesMemesVentesQueCoalesce() {
        Random rnd = new Random(20261119L);
        LocalDateTime a = LocalDateTime.of(2026, 11, 16, 0, 0);
        LocalDateTime b = a.plusDays(1 + rnd.nextInt(3));
        int retenues = 0;
        for (int i = 0; i < 20000; i++) {
            LocalDateTime maj = a.plusMinutes(rnd.nextInt(6 * 24 * 60) - 2 * 24 * 60);
            if (rnd.nextInt(20) == 0) {
                maj = rnd.nextBoolean() ? a : b; // bornes exactes
            }
            LocalDateTime enc = rnd.nextInt(3) == 0 ? null : maj.plusMinutes(rnd.nextInt(3 * 24 * 60) - 24 * 60);
            if (enc != null && rnd.nextInt(20) == 0) {
                enc = rnd.nextBoolean() ? a : b;
            }
            LocalDateTime c = enc != null ? enc : maj;
            boolean coalesce = !c.isBefore(a) && c.isBefore(b);
            boolean branche1 = enc != null && !enc.isBefore(a) && enc.isBefore(b);
            boolean branche2 = enc == null && !maj.isBefore(a) && maj.isBefore(b);
            assertFalse(branche1 && branche2, "une vente ne compte jamais deux fois");
            assertEquals(coalesce, branche1 || branche2, "vente " + i + " : encaissement " + enc + ", maj " + maj);
            retenues += coalesce ? 1 : 0;
        }
        assertTrue(retenues > 2000 && retenues < 18000, "jeu varie : " + retenues + " ventes retenues");
    }
}
