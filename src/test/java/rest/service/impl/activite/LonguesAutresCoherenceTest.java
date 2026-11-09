package rest.service.impl.activite;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rest.service.dto.ActiviteAnalysesDTO.Operateur;
import rest.service.impl.activite.AgregatsActivite.Vente;

/**
 * Graphique des ventes longues : au-delà de 15 opérateurs, les suivants sont regroupés dans « Autres ». Défaut corrigé
 * : le graphique gardait 15 opérateurs alors que la tuile les comptait tous (19 784 contre 19 783 sur la copie locale).
 * Règles vérifiées sur des milliers de jeux tirés au hasard (graine fixe), de 0 à 40 opérateurs et pour plusieurs
 * critères de durée : somme du graphique, « Autres » compris = tuile ; chaque opérateur compte une seule fois ; rien de
 * négatif ; au plus 16 barres.
 */
class LonguesAutresCoherenceTest {

    static final LocalDateTime J = LocalDateTime.of(2026, 11, 2, 8, 0);

    @Test
    @DisplayName("4 000 jeux, 0 à 40 opérateurs, 4 critères : graphique (Autres compris) = tuile, un opérateur une fois")
    void coherence() {
        Random r = new Random(20261109L);
        SeuilDuree[] seuils = { SeuilDuree.de("GT", 10), SeuilDuree.de("LT", 2), SeuilDuree.de("GE", 1),
                SeuilDuree.de("LE", 30) };
        int avecAutres = 0;
        for (int k = 0; k < 4000; k++) {
            int nbOps = r.nextInt(41);
            List<Vente> ventes = new ArrayList<>();
            for (int o = 0; o < nbOps; o++) {
                int n = 1 + r.nextInt(o % 7 == 0 ? 1 : 30);
                for (int i = 0; i < n; i++) {
                    LocalDateTime t = J.plusDays(r.nextInt(20)).plusMinutes(r.nextInt(600));
                    long duree = r.nextInt(5) == 0 ? r.nextInt(5000) : r.nextInt(900);
                    ventes.add(new Vente("E" + o, t, t.plusSeconds(Math.min(duree, 30)), t.plusSeconds(duree),
                            1 + r.nextInt(6), 100 + r.nextInt(50000)));
                }
            }
            SeuilDuree seuil = seuils[k % seuils.length];
            Map<String, String> noms = new HashMap<>();
            List<Operateur> ops = AgregatsActivite.operateurs(ventes, noms, seuil);
            long tuile = AgregatsActivite.totaux(ventes, List.of(), 0, seuil).longues;
            List<Operateur> g = AgregatsActivite.longues(ops, AgregatsActivite.LONGUES_MAX);

            long somme = 0, ventesGraphe = 0;
            Set<String> vus = new HashSet<>();
            for (Operateur o : g) {
                assertTrue(o.getVentesLongues() >= 0 && o.getVentes() >= 0, "jamais negatif");
                assertTrue(o.getVentesLongues() <= o.getVentes(), "pas plus de ventes longues que de ventes");
                assertTrue(vus.add(o.getId()), "une barre par operateur");
                somme += o.getVentesLongues();
                ventesGraphe += o.getVentes();
            }
            assertEquals(tuile, somme, "somme du graphique = tuile");
            assertEquals(ventes.size(), ventesGraphe, "chaque operateur compte une seule fois");
            assertEquals(Math.min(nbOps, AgregatsActivite.LONGUES_MAX) + (nbOps > AgregatsActivite.LONGUES_MAX ? 1 : 0),
                    g.size(), "15 operateurs au plus, puis Autres");
            for (int i = 0; i < Math.min(nbOps, AgregatsActivite.LONGUES_MAX); i++) {
                assertEquals(ops.get(i).getId(), g.get(i).getId(), "memes 15 premiers que la vitesse par operateur");
                assertEquals(ops.get(i).getVentesLongues(), g.get(i).getVentesLongues());
            }
            if (nbOps > AgregatsActivite.LONGUES_MAX) {
                avecAutres++;
                Operateur a = g.get(g.size() - 1);
                assertEquals(AgregatsActivite.ID_AUTRES, a.getId());
                int reste = nbOps - AgregatsActivite.LONGUES_MAX;
                assertEquals("Autres (" + reste + " opérateur" + (reste > 1 ? "s" : "") + ")", a.getNom());
                long attendu = 0;
                for (int i = AgregatsActivite.LONGUES_MAX; i < nbOps; i++) {
                    attendu += ops.get(i).getVentesLongues();
                }
                assertEquals(attendu, a.getVentesLongues(), "Autres = somme des operateurs suivants");
            } else {
                assertTrue(g.stream().noneMatch(o -> AgregatsActivite.ID_AUTRES.equals(o.getId())), "pas d'Autres");
            }
        }
        assertTrue(avecAutres > 1000, "jeux varies : plus de 15 operateurs souvent");
    }

    @Test
    @DisplayName("cas du défaut : 16 opérateurs, le 16e avec 1 vente longue -> tuile = graphique")
    void seiziemeOperateur() {
        List<Vente> ventes = new ArrayList<>();
        for (int o = 0; o < 16; o++) {
            for (int i = 0; i < (o == 15 ? 1 : 20 - o); i++) {
                ventes.add(new Vente("E" + o, J, J.plusSeconds(10), J.plusSeconds(60), 2, 1000));
            }
        }
        SeuilDuree moinsDe2 = SeuilDuree.de("LT", 2);
        List<Operateur> ops = AgregatsActivite.operateurs(ventes, Map.of(), moinsDe2);
        long tuile = AgregatsActivite.totaux(ventes, List.of(), 0, moinsDe2).longues;
        List<Operateur> g = AgregatsActivite.longues(ops, AgregatsActivite.LONGUES_MAX);
        assertEquals(tuile, g.stream().mapToLong(Operateur::getVentesLongues).sum());
        assertEquals("Autres (1 opérateur)", g.get(15).getNom());
        assertEquals(1, g.get(15).getVentesLongues());
        /* l'ancien graphique (15 premiers seuls) manquait cette vente */
        assertEquals(tuile - 1, ops.subList(0, 15).stream().mapToLong(Operateur::getVentesLongues).sum());
    }
}
