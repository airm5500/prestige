package filter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Rapport d'exploitation du 13/11, point 10 : le guetteur signalait 134 fois une meme impression bloquee 7 h 09, sans
 * dire quand elle finissait.
 * <p>
 * Test de COHERENCE sur 2 000 journees simulees (graine fixe) : de 1 a 12 requetes, durees de 0,5 s a 8 h, debuts
 * etales, passages du guetteur toutes les 20 s. Regles : au plus un DEBUT par requete ; une FIN seulement apres un
 * DEBUT, une seule ; duree de la FIN entre la duree reelle et la duree reelle + 20 s ; aucun signal pour une requete de
 * moins de 20 s ; deux DEBUT espaces d'au moins 5 min ; toute requete signalee et terminee dans la journee a sa FIN.
 * </p>
 */
class SuiviBlocagesCoherenceTest {

    private static final long SEUIL = 20_000L;
    private static final long DELAI = 300_000L;
    private static final long PAS = 20_000L;

    @Test
    @DisplayName("Le 13/11 rejoue : impression bloquee 7 h 09, un debut et une fin, et non 134 rapports")
    void impressionDu13() {
        SuiviBlocages s = new SuiviBlocages(SEUIL, DELAI);
        long debut = 1_000_000L;
        long fin = debut + (7 * 3600 + 9 * 60) * 1000L;
        SlowRequestFilter.RequeteEnCours r = new SlowRequestFilter.RequeteEnCours("GET",
                "/prestige/api/v1/caisse/ticke-mvt-caisse", debut, "http-thread-pool::http-listener-1(3)");
        int debuts = 0;
        int fins = 0;
        String dureeFin = null;
        for (long t = debut; t <= fin + 120_000L; t += PAS) {
            List<SlowRequestFilter.RequeteEnCours> enCours = new ArrayList<>();
            if (t < fin) {
                enCours.add(r);
            }
            for (SuiviBlocages.Signal sg : s.passage(enCours, t)) {
                if (sg.nature == SuiviBlocages.Nature.DEBUT) {
                    debuts++;
                } else {
                    fins++;
                    dureeFin = SuiviBlocages.duree(sg.dureeMs);
                }
            }
        }
        assertEquals(1, debuts, "un seul rapport de blocage");
        assertEquals(1, fins, "un avis de fin");
        assertEquals("7 h 09 min", dureeFin);
    }

    @Test
    @DisplayName("2 000 journees : un debut et une fin par blocage, duree juste a 20 s pres")
    void journees() {
        Random rnd = new Random(20261113L);
        for (int j = 0; j < 2000; j++) {
            SuiviBlocages s = new SuiviBlocages(SEUIL, DELAI);
            int n = 1 + rnd.nextInt(12);
            List<SlowRequestFilter.RequeteEnCours> reqs = new ArrayList<>();
            Map<String, Long> finDe = new HashMap<>();
            for (int i = 0; i < n; i++) {
                long d = (long) rnd.nextInt(36_000) * 1000L + rnd.nextInt(1000);
                long duree;
                switch (rnd.nextInt(4)) {
                case 0:
                    duree = 500 + rnd.nextInt(19_000); // jamais bloquee
                    break;
                case 1:
                    duree = 20_000 + rnd.nextInt(60_000);
                    break;
                case 2:
                    duree = 60_000 + (long) rnd.nextInt(3_600_000);
                    break;
                default:
                    duree = (long) rnd.nextInt(8 * 3_600_000);
                }
                SlowRequestFilter.RequeteEnCours r = new SlowRequestFilter.RequeteEnCours(
                        rnd.nextBoolean() ? "GET" : "POST", "/prestige/api/v1/x/" + rnd.nextInt(5), d,
                        "t" + rnd.nextInt(4));
                reqs.add(r);
                finDe.put(SuiviBlocages.cle(r), d + duree);
            }
            Map<String, Integer> debuts = new HashMap<>();
            Map<String, Integer> fins = new HashMap<>();
            long dernierDebut = Long.MIN_VALUE / 2;
            long finJournee = 48L * 3_600_000L;
            for (long t = 0; t <= finJournee; t += PAS) {
                List<SlowRequestFilter.RequeteEnCours> enCours = new ArrayList<>();
                for (SlowRequestFilter.RequeteEnCours r : reqs) {
                    if (r.debutMs <= t && t < finDe.get(SuiviBlocages.cle(r))) {
                        enCours.add(r);
                    }
                }
                for (SuiviBlocages.Signal sg : s.passage(enCours, t)) {
                    String k = SuiviBlocages.cle(sg.requete);
                    String quoi = "journee " + j + " t=" + t + " " + k;
                    long reelle = finDe.get(k) - sg.requete.debutMs;
                    if (sg.nature == SuiviBlocages.Nature.DEBUT) {
                        debuts.merge(k, 1, Integer::sum);
                        assertTrue(sg.dureeMs >= SEUIL, quoi + " : debut avant le seuil");
                        assertTrue(t - dernierDebut >= DELAI, quoi + " : deux rapports trop rapproches");
                        dernierDebut = t;
                    } else {
                        fins.merge(k, 1, Integer::sum);
                        assertEquals(1, debuts.getOrDefault(k, 0), quoi + " : fin sans debut");
                        assertTrue(sg.dureeMs >= reelle && sg.dureeMs <= reelle + PAS,
                                quoi + " : duree " + sg.dureeMs + " / reelle " + reelle);
                    }
                }
            }
            for (SlowRequestFilter.RequeteEnCours r : reqs) {
                String k = SuiviBlocages.cle(r);
                long reelle = finDe.get(k) - r.debutMs;
                assertTrue(debuts.getOrDefault(k, 0) <= 1,
                        "journee " + j + " " + k + " signalee " + debuts.get(k) + " fois");
                if (reelle < SEUIL - PAS) {
                    assertEquals(0, debuts.getOrDefault(k, 0), "journee " + j + " : requete courte signalee");
                }
                assertEquals(debuts.getOrDefault(k, 0), fins.getOrDefault(k, 0),
                        "journee " + j + " " + k + " : debut sans fin");
            }
        }
    }

    @Test
    void dureeLisible() {
        assertEquals("42 s", SuiviBlocages.duree(42_900));
        assertEquals("3 min 05 s", SuiviBlocages.duree(185_000));
        assertEquals("7 h 09 min", SuiviBlocages.duree(25_746_464));
        assertEquals("0 s", SuiviBlocages.duree(-5));
    }
}
