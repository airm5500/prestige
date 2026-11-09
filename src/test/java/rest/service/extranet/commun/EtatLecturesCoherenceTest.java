package rest.service.extranet.commun;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

/**
 * Lectures en arriere-plan (08/11) : sur des milliers d'operations tirees au hasard (graine fixe) et comparees a un
 * modele simple, une seule lecture a la fois par liste, un second lancement suit la lecture en cours, la fin garde le
 * resultat, une fin tardive d'une lecture remplacee est ignoree, le resultat expire apres GARDE_SECONDES ; la duree
 * affichee = fin (ou maintenant) - debut, jamais negative. Concurrence : 32 lancements simultanes = une seule lecture.
 */
class EtatLecturesCoherenceTest {

    /** Horloge reglable. */
    private static final class Horloge extends Clock {
        Instant t = Instant.parse("2026-11-08T08:00:00Z");

        @Override
        public ZoneId getZone() {
            return ZoneId.of("UTC");
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return t;
        }
    }

    @Test
    void modeleSurDesMilliersDOperations() {
        Random r = new Random(20261108L);
        Horloge h = new Horloge();
        EtatLectures e = new EtatLectures(h);
        String[] cles = { EtatLectures.cle("ubipharm", "promotions"), EtatLectures.cle(" DPCI ", "dpci_offres"),
                EtatLectures.cle("copharmed", "COPHARMED_CATALOGUE") };
        Map<String, EtatLectures.Lecture> courante = new HashMap<>();
        List<EtatLectures.Lecture> anciennes = new ArrayList<>();
        int lancees = 0, suivies = 0, finies = 0, ignorees = 0, expirees = 0;
        for (int op = 0; op < 20000; op++) {
            String cle = cles[r.nextInt(cles.length)];
            EtatLectures.Lecture m = courante.get(cle);
            switch (r.nextInt(5)) {
            case 0:
            case 1: {
                EtatLectures.Lecture l = e.demarrer(cle, "u" + r.nextInt(3));
                if (m != null && m.enCours()) {
                    assertNull(l, "une lecture tourne deja");
                    suivies++;
                } else {
                    assertNotNull(l);
                    assertTrue(l.enCours());
                    assertEquals(h.t, l.debut);
                    if (m != null) {
                        anciennes.add(m);
                    }
                    courante.put(cle, l);
                    lancees++;
                }
                break;
            }
            case 2:
                if (m != null && m.enCours()) {
                    JSONObject res = new JSONObject().put("success", r.nextBoolean()).put("n", op);
                    e.terminer(m, res);
                    assertFalse(m.enCours());
                    assertSame(res, m.toJson(h.t).getJSONObject("resultat"));
                    finies++;
                }
                break;
            case 3:
                if (!anciennes.isEmpty()) {
                    /* fin tardive d'une lecture deja remplacee : sans effet sur la courante */
                    EtatLectures.Lecture vieille = anciennes.get(r.nextInt(anciennes.size()));
                    boolean avant = m != null && m.enCours();
                    e.terminer(vieille, new JSONObject().put("tardive", true));
                    assertEquals(avant, m != null && m.enCours());
                    ignorees++;
                }
                break;
            default:
                h.t = h.t.plusSeconds(r.nextInt(r.nextInt(10) == 0 ? 4000 : 120));
            }
            EtatLectures.Lecture vue = e.etat(cle);
            if (m == null && courante.get(cle) == null) {
                assertNull(vue);
            } else {
                EtatLectures.Lecture c = courante.get(cle);
                boolean expiree = !c.enCours() && c.toJson(h.t).getString("fin") != null && Instant
                        .parse(c.toJson(h.t).getString("fin")).plusSeconds(EtatLectures.GARDE_SECONDES).isBefore(h.t);
                if (expiree) {
                    assertNull(vue);
                    courante.remove(cle);
                    expirees++;
                } else {
                    assertSame(c, vue);
                    JSONObject j = vue.toJson(h.t);
                    assertEquals(vue.enCours(), j.getBoolean("enCours"));
                    long attendu = java.time.Duration
                            .between(vue.debut, vue.enCours() ? h.t : Instant.parse(j.getString("fin"))).getSeconds();
                    assertEquals(attendu, j.getLong("secondes"));
                    assertTrue(j.getLong("secondes") >= 0);
                }
            }
        }
        assertTrue(lancees > 1000 && suivies > 1000 && finies > 1000 && ignorees > 500 && expirees > 10,
                lancees + "/" + suivies + "/" + finies + "/" + ignorees + "/" + expirees);
        assertEquals("ubipharm/PROMOTIONS", EtatLectures.cle(" Ubipharm ", " promotions "));
    }

    @Test
    void lancementsSimultanesUneSeuleLecture() throws Exception {
        EtatLectures e = new EtatLectures(Clock.systemUTC());
        ExecutorService x = Executors.newFixedThreadPool(32);
        try {
            for (int tour = 0; tour < 50; tour++) {
                String cle = EtatLectures.cle("dpci", "DPCI_OFFRES" + tour);
                CountDownLatch depart = new CountDownLatch(1);
                List<Future<EtatLectures.Lecture>> f = new ArrayList<>();
                for (int i = 0; i < 32; i++) {
                    f.add(x.submit(() -> {
                        depart.await();
                        return e.demarrer(cle, "poste");
                    }));
                }
                depart.countDown();
                int lancees = 0;
                EtatLectures.Lecture gagnante = null;
                for (Future<EtatLectures.Lecture> y : f) {
                    EtatLectures.Lecture l = y.get(10, TimeUnit.SECONDS);
                    if (l != null) {
                        lancees++;
                        gagnante = l;
                    }
                }
                assertEquals(1, lancees, "tour " + tour);
                assertSame(gagnante, e.etat(cle));
            }
        } finally {
            x.shutdownNow();
        }
    }
}
