package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Tests de coherence (proprietes) des parts par ligne du ticket assurance : au lieu de quelques exemples choisis, des
 * milliers de ventes tirees au hasard (graine fixe : un echec se rejoue a l'identique) avec des taux differents d'une
 * ligne a l'autre, et pour chacune les regles qui doivent toujours tenir. Le ticket 2912673621 du 05/11 (taux 80 %
 * affiche, montant au prorata) aurait echoue a la premiere propriete.
 */
class CreditLigneCoherenceTest {

    private static final long GRAINE = 20261105L;
    private static final int VENTES = 5000;

    private static int brut(int base, int taux) {
        return BigDecimal.valueOf(base).multiply(BigDecimal.valueOf(taux))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP).intValue();
    }

    private static final class Vente {
        final List<Integer> bases = new ArrayList<>();
        final List<Integer> taux = new ArrayList<>();
        final List<Integer> bruts = new ArrayList<>();
        int somme;

        Vente(Random r) {
            int n = 1 + r.nextInt(8);
            int tauxOrganisme = 10 * (1 + r.nextInt(10));
            for (int i = 0; i < n; i++) {
                int base = (1 + r.nextInt(60)) * 5 * (1 + r.nextInt(3));
                // une ligne sur trois avec son propre taux (taux modifie a l'ecran de vente)
                int t = r.nextInt(3) == 0 ? 5 * r.nextInt(21) : tauxOrganisme;
                bases.add(base);
                taux.add(t);
                bruts.add(brut(base, t));
                somme += bruts.get(i);
            }
        }

        String decrire() {
            return "bases " + bases + " taux " + taux;
        }
    }

    @Test
    void sansPlafondChaqueLigneVautBaseFoisSonTaux() {
        Random r = new Random(GRAINE);
        for (int k = 0; k < VENTES; k++) {
            Vente v = new Vente(r);
            List<Integer> parts = CreditLigne.parts(v.bases, v.taux, v.somme);
            assertEquals(v.bruts, parts, "vente " + k + " : " + v.decrire());
        }
    }

    /**
     * Regles communes a toute repartition : la somme vaut la part de l'organisme, une ligne a 0 % reste a 0, et une
     * seule ligne au plus s'ecarte de sa part attendue (elle porte l'arrondi), d'au plus le nombre de lignes.
     */
    private static void verifier(String vente, List<Integer> attendues, List<Integer> bruts, List<Integer> parts,
            int total) {
        assertEquals(total, parts.stream().mapToInt(Integer::intValue).sum(), "somme, " + vente);
        int ecarts = 0;
        for (int i = 0; i < parts.size(); i++) {
            assertTrue(parts.get(i) >= 0, "part negative, ligne " + i + ", " + vente);
            if (bruts.get(i) == 0) {
                assertEquals(0, parts.get(i).intValue(), "ligne a 0 % avec une part, ligne " + i + ", " + vente);
            }
            int d = Math.abs(parts.get(i) - attendues.get(i));
            if (d > 0) {
                ecarts++;
                assertTrue(d <= parts.size(), "ecart de " + d + " ligne " + i + ", " + vente);
            }
        }
        assertTrue(ecarts <= 1, ecarts + " lignes s'ecartent de leur part, " + vente + " " + parts);
    }

    @Test
    void unEcartDArrondiNeTouchePasLesAutresLignes() {
        Random r = new Random(GRAINE + 1);
        for (int k = 0; k < VENTES; k++) {
            Vente v = new Vente(r);
            int ecart = r.nextInt(2 * v.bases.size() + 1) - v.bases.size();
            int total = Math.max(0, v.somme + ecart);
            if (total == 0 || v.somme == 0) {
                // toutes les lignes a 0 % : l'organisme ne paie rien, aucun ecart possible
                continue;
            }
            verifier("vente " + k + " : " + v.decrire(), v.bruts, v.bruts, CreditLigne.parts(v.bases, v.taux, total),
                    total);
        }
    }

    @Test
    void unPlafondReduitToutesLesLignesDansLaMemeProportion() {
        Random r = new Random(GRAINE + 2);
        for (int k = 0; k < VENTES; k++) {
            Vente v = new Vente(r);
            if (v.somme < 100) {
                continue;
            }
            int total = (int) (v.somme * (0.2 + 0.7 * r.nextDouble()));
            List<Integer> attendues = new ArrayList<>();
            for (Integer b : v.bruts) {
                attendues.add(BigDecimal.valueOf(b).multiply(BigDecimal.valueOf(total))
                        .divide(BigDecimal.valueOf(v.somme), 0, RoundingMode.HALF_UP).intValue());
            }
            verifier("vente " + k + " : " + v.decrire(), attendues, v.bruts, CreditLigne.parts(v.bases, v.taux, total),
                    total);
        }
    }

    @Test
    void aucunePartNegativeNiAuDelaDeSaBase() {
        Random r = new Random(GRAINE + 3);
        for (int k = 0; k < VENTES; k++) {
            Vente v = new Vente(r);
            int total = r.nextInt(v.somme + 1);
            List<Integer> parts = CreditLigne.parts(v.bases, v.taux, total);
            for (int i = 0; i < parts.size(); i++) {
                assertTrue(parts.get(i) >= 0 && parts.get(i) <= v.bases.get(i) + v.bases.size(),
                        "ligne " + i + " de la vente " + k + " : " + parts.get(i) + " ; " + v.decrire());
            }
        }
    }

    @Test
    void lesTauxAffichesNeDepassentJamaisCentNiLeTauxReel() {
        Random r = new Random(GRAINE + 4);
        for (int k = 0; k < VENTES; k++) {
            List<Integer> taux = new ArrayList<>();
            int n = 1 + r.nextInt(3);
            for (int i = 0; i < n; i++) {
                taux.add(5 * r.nextInt(21));
            }
            List<Integer> affiches = CreditLigne.tauxAffiches(taux);
            assertTrue(affiches.stream().mapToInt(Integer::intValue).sum() <= 100, taux + " -> " + affiches);
            for (int i = 0; i < n; i++) {
                assertTrue(
                        affiches.get(i) >= 0 && affiches.get(i) <= Math.max(taux.get(i), 100 - sommeAvant(affiches, i)),
                        taux + " -> " + affiches);
            }
            assertEquals(taux.get(0), affiches.get(0), "le premier organisme garde toujours son taux : " + taux);
        }
    }

    private static int sommeAvant(List<Integer> l, int i) {
        int s = 0;
        for (int j = 0; j < i; j++) {
            s += l.get(j);
        }
        return s;
    }
}
