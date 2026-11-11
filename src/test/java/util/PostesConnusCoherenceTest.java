package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.Test;

/**
 * Plan du 09/11, point 7 : postes connus verifies par leurs regles sur des milliers de journaux de connexions tires au
 * hasard (graine fixe) : postes vides, noms qui ne different que par la casse, connexions a la meme seconde, plusieurs
 * utilisateurs par poste, limite atteinte ou non.
 */
class PostesConnusCoherenceTest {

    private static final String[] NOMS = { "Caisse 1", "caisse 1", "CAISSE 1", "Caisse 2", "Comptoir", "192.168.1.8",
            "Sunmi é", "RM", "Réserve", "  Caisse 2  ", "", "   ", null };
    private static final String[] UTIL = { "Awa Diallo", "Jean Kouassi", "  Marie Ble  ", "" };

    @Test
    void reglesSurDesMilliersDeJournaux() {
        Random r = new Random(20261111L);
        for (int essai = 0; essai < 4000; essai++) {
            int n = r.nextInt(60);
            List<PostesConnus.Connexion> c = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                String debut = String.format("2026-%02d-%02d %02d:%02d:%02d", 1 + r.nextInt(3), 1 + r.nextInt(3),
                        r.nextInt(2), r.nextInt(2), r.nextInt(2));
                c.add(new PostesConnus.Connexion(NOMS[r.nextInt(NOMS.length)], debut,
                        String.format("id%04d", r.nextInt(10000)), UTIL[r.nextInt(UTIL.length)],
                        "10.0.0." + r.nextInt(5)));
            }
            int limite = r.nextBoolean() ? PostesConnus.LIMITE : 1 + r.nextInt(4);
            List<Map<String, Object>> l = PostesConnus.regrouper(c, limite);

            /* reference independante */
            Map<String, Integer> nombre = new HashMap<>();
            Map<String, PostesConnus.Connexion> derniere = new HashMap<>();
            int valides = 0;
            for (PostesConnus.Connexion x : c) {
                if (x.poste == null || x.poste.trim().isEmpty()) {
                    continue;
                }
                valides++;
                String k = x.poste.trim().toLowerCase(Locale.ROOT);
                nombre.merge(k, 1, Integer::sum);
                PostesConnus.Connexion d = derniere.get(k);
                if (d == null || x.debut.compareTo(d.debut) > 0
                        || (x.debut.equals(d.debut) && x.id.compareTo(d.id) > 0)) {
                    derniere.put(k, x);
                }
            }
            assertEquals(Math.min(limite, nombre.size()), l.size(), "une ligne par poste, limite respectee");
            Set<String> vus = new HashSet<>();
            int somme = 0;
            String precedent = null;
            for (Map<String, Object> m : l) {
                String poste = (String) m.get("poste");
                String k = poste.toLowerCase(Locale.ROOT);
                assertTrue(vus.add(k), "jamais deux fois le meme poste");
                assertEquals(poste.trim(), poste);
                assertTrue(!poste.isEmpty());
                PostesConnus.Connexion d = derniere.get(k);
                assertEquals(d.debut, m.get("derniere"), "derniere connexion = la plus recente");
                assertEquals(d.utilisateur, m.get("utilisateur"), "utilisateur de la derniere connexion");
                assertEquals(d.ip, m.get("ip"));
                assertEquals(d.poste.trim(), poste, "nom tel qu'a la derniere connexion");
                int nb = (Integer) m.get("connexions");
                assertEquals((int) nombre.get(k), nb);
                assertTrue(nb >= 1);
                somme += nb;
                if (precedent != null) {
                    assertTrue(precedent.compareTo((String) m.get("derniere")) >= 0, "du plus recent au plus ancien");
                }
                precedent = (String) m.get("derniere");
            }
            if (limite >= nombre.size()) {
                assertEquals(valides, somme, "somme des connexions = connexions avec un poste");
            }
        }
    }

    @Test
    void casDeBase() {
        List<Map<String, Object>> l = PostesConnus
                .regrouper(Arrays.asList(new PostesConnus.Connexion("Caisse 1", "2026-11-10 08:00:00", "a", "Awa", "1"),
                        new PostesConnus.Connexion("caisse 1", "2026-11-10 09:00:00", "b", "Jean", "2"),
                        new PostesConnus.Connexion("", "2026-11-10 10:00:00", "c", "Marie", "3"),
                        new PostesConnus.Connexion(null, "2026-11-10 10:00:00", "d", "Marie", "3"),
                        new PostesConnus.Connexion("Comptoir", "2026-11-09 07:00:00", "e", "Awa", "4")), 200);
        assertEquals(2, l.size());
        assertEquals("caisse 1", l.get(0).get("poste"));
        assertEquals("Jean", l.get(0).get("utilisateur"));
        assertEquals(2, l.get(0).get("connexions"));
        assertEquals("Comptoir", l.get(1).get("poste"));
        assertEquals(0, PostesConnus.regrouper(new ArrayList<>(), 200).size());
    }
}
