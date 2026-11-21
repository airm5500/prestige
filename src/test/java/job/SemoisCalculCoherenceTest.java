package job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.junit.jupiter.api.Test;

/**
 * Seuils SEMOIS (Moaye, 21/11) : la consommation par semaine est divisee par les mois reellement retenus (et non par
 * Q3), et les produits actifs sans vente sont traites (seuil et quantite a zero) au lieu de garder d'anciennes valeurs.
 * Coherence sur des milliers de cas tires au hasard (graine fixe) : regles de calcul, jamais negatif, et identite avec
 * l'ancien calcul des que l'historique couvre Q3 mois (aucune regression pour les officines installees).
 */
class SemoisCalculCoherenceTest {

    private static final LocalDate OCTOBRE = LocalDate.of(2026, 10, 1);

    private static List<LocalDate> mois(int n) {
        List<LocalDate> l = new ArrayList<>();
        for (int i = n - 1; i >= 0; i--) {
            l.add(OCTOBRE.minusMonths(i));
        }
        return l;
    }

    private static String ym(LocalDate m) {
        return String.format("%04d-%02d", m.getYear(), m.getMonthValue());
    }

    @Test
    void moayeUnSeulMoisDivisePar4Semaines() {
        Map<String, Double> ventes = new HashMap<>();
        ventes.put("2026-10", 336d);
        SemoisService.Calcul c = SemoisService.calculProduit(ventes, mois(1), 2, 2, 3, false);
        assertEquals(1, c.mois);
        assertEquals(168, c.seuil, "336 boites en octobre, Q1 2 : 336 / 4 x 2 (avant : 336 / 12 x 2 = 56)");
        assertEquals(168, c.qte);
    }

    @Test
    void produitSansVenteAZero() {
        for (boolean jour : new boolean[] { false, true }) {
            SemoisService.Calcul c = SemoisService.calculProduit(null, mois(3), 2, 2, 3, jour);
            assertEquals(0, c.seuil);
            assertEquals(0, c.qte);
            c = SemoisService.calculProduit(new HashMap<>(), mois(1), 4, 2, 3, jour);
            assertEquals(0, c.seuil);
            assertEquals(0, c.qte);
        }
    }

    @Test
    void moisCouvertsDuPremierAuDernier() {
        assertEquals(1, SemoisService.moisCouverts(mois(1)));
        assertEquals(3, SemoisService.moisCouverts(mois(3)));
        /* un mois sans calendrier au milieu : ses ventes sont lues (requete du premier au dernier mois), il compte */
        assertEquals(3, SemoisService.moisCouverts(Arrays.asList(OCTOBRE.minusMonths(2), OCTOBRE)));
        assertEquals(13,
                SemoisService.moisCouverts(Arrays.asList(OCTOBRE.minusMonths(12), OCTOBRE.withDayOfMonth(20))));
    }

    @Test
    void coherenceSurTirages() {
        Random r = new Random(2111);
        int casCourts = 0;
        for (int i = 0; i < 20000; i++) {
            int n = 1 + r.nextInt(12);
            List<LocalDate> moisAsc = mois(n);
            Map<String, Double> ventes = null;
            if (r.nextInt(8) != 0) {
                ventes = new HashMap<>();
                for (LocalDate m : moisAsc) {
                    if (r.nextInt(4) != 0) {
                        ventes.put(ym(m), r.nextInt(5) == 0 ? r.nextInt(40) / 7d
                                : (double) r.nextInt(r.nextBoolean() ? 30 : 2000));
                    }
                }
                ventes.put(ym(OCTOBRE.minusMonths(n + 1)), 99999d); // hors fenetre : jamais compte
            }
            int q1 = r.nextInt(6), q2 = r.nextInt(6), q3 = 1 + r.nextInt(12);
            boolean jour = r.nextInt(4) == 0;
            SemoisService.Calcul c = SemoisService.calculProduit(ventes, moisAsc, q1, q2, q3, jour);

            int attendus = Math.min(q3, n);
            List<LocalDate> fenetre = moisAsc.subList(n - attendus, n);
            double total = 0;
            long jours = 0;
            for (LocalDate m : fenetre) {
                total += ventes == null ? 0 : ventes.getOrDefault(ym(m), 0d);
                jours += m.lengthOfMonth();
            }
            String cas = "n=" + n + " q=" + q1 + "/" + q2 + "/" + q3 + " jour=" + jour + " ventes=" + ventes;
            assertEquals(attendus, c.mois, cas);
            assertEquals(total, c.consoTotale, 1e-9, cas);
            double conso = jour ? total / jours : total / (attendus * 4d);
            assertEquals(conso, c.conso, 1e-9, cas);
            assertEquals((int) Math.ceil(conso * q1), c.seuil, cas);
            assertEquals((int) Math.ceil(conso * q2), c.qte, cas);
            assertTrue(c.seuil >= 0 && c.qte >= 0, cas);
            if (total == 0) {
                assertEquals(0, c.seuil + c.qte, cas);
            }
            if (n >= q3) {
                /* historique complet : identique a l'ancien calcul (diviseur Q3 x 4) */
                double ancien = jour ? total / jours : total / (q3 * 4d);
                assertEquals((int) Math.ceil(ancien * q1), c.seuil, "regression " + cas);
                assertEquals((int) Math.ceil(ancien * q2), c.qte, "regression " + cas);
            } else {
                casCourts++;
            }
        }
        assertTrue(casCourts > 2000, "assez de cas a historique court : " + casCourts);
    }

    @Test
    void produitsATraiterVendusPuisActifsSansDoublon() {
        Random r = new Random(21);
        for (int i = 0; i < 3000; i++) {
            List<String> vendus = new ArrayList<>(), actifs = new ArrayList<>();
            for (int k = r.nextInt(30); k > 0; k--) {
                String id = "P" + r.nextInt(40);
                if (!vendus.contains(id)) {
                    vendus.add(id);
                }
            }
            for (int k = r.nextInt(60); k > 0; k--) {
                actifs.add("P" + r.nextInt(80));
            }
            List<String> ids = SemoisService.produitsATraiter(vendus, actifs);
            if (vendus.isEmpty()) {
                assertTrue(ids.isEmpty(), "aucune vente lue sur des mois actifs : situation anormale, rien a traiter");
                continue;
            }
            assertEquals(new HashSet<>(ids).size(), ids.size(), "sans doublon");
            assertEquals(vendus, ids.subList(0, vendus.size()), "vendus d'abord, dans leur ordre");
            assertTrue(ids.containsAll(actifs), "tous les actifs");
            HashSet<String> union = new HashSet<>(vendus);
            union.addAll(actifs);
            assertEquals(union.size(), ids.size());
        }
    }
}
