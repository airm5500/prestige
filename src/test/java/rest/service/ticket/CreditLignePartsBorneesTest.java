package rest.service.ticket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Retours du 10/11 (tickets 5842772163 et 1750418138) : sur une ligne, un organisme ne prend que ce qui reste apres
 * ceux qui passent avant lui, comme dans le moteur ; le ticket ne « retrouve » plus une part par prorata (« MUGEFCI ·
 * Taux 0 % : 190 » alors que MUGEFCI n'avait rien pris sur la ligne). Et un organisme a part nulle n'est plus imprime
 * quand la vente en a plusieurs.
 */
class CreditLignePartsBorneesTest {

    private static List<List<Integer>> matrice(Integer[]... lignes) {
        List<List<Integer>> m = new ArrayList<>();
        for (Integer[] l : lignes) {
            m.add(Arrays.asList(l));
        }
        return m;
    }

    @Test
    void ticket5842772163LeComplementaireNePrendRienSurLaLigneDejaCouverte() {
        // lignes : A PAR AEROSOL 18 210 (sans reference), TEST GROSSESSE 1 000 (CNAM a 100 % sur sa reference)
        // organismes par ordre de passage : CNAM 80 % (15 568), MUGEFCI 20 % (3 642)
        List<List<Integer>> parts = CreditLigne.partsBornees(matrice(new Integer[] { 18210, 1000 }, // bases CNAM
                new Integer[] { 18210, 1000 }), // bases MUGEFCI
                matrice(new Integer[] { 80, 100 }, new Integer[] { 20, 20 }), Arrays.asList(18210, 1000),
                matrice(new Integer[] { 0, 1 }, new Integer[] { 0, 1 }), Arrays.asList(15568, 3642));
        assertEquals(Arrays.asList(14568, 1000), parts.get(0));
        assertEquals(Arrays.asList(3642, 0), parts.get(1));
    }

    @Test
    void ticket1750418138UneSeuleLigneLePremierCouvreTout() {
        List<List<Integer>> parts = CreditLigne.partsBornees(matrice(new Integer[] { 1000 }, new Integer[] { 1000 }),
                matrice(new Integer[] { 100 }, new Integer[] { 20 }), Arrays.asList(1000),
                matrice(new Integer[] { 0, 1 }), Arrays.asList(1000, 0));
        assertEquals(Arrays.asList(1000), parts.get(0));
        assertEquals(Arrays.asList(0), parts.get(1));
    }

    @Test
    void lOrdreDePassageDeLaLigneDecide() {
        // ligne a 1 000 : le second organisme passe en premier (prise en charge totale sur sa reference 800), le
        // premier prend ensuite 80 % de 1 000 borne au reste
        List<List<Integer>> parts = CreditLigne.partsBornees(matrice(new Integer[] { 1000 }, new Integer[] { 800 }),
                matrice(new Integer[] { 80 }, new Integer[] { 100 }), Arrays.asList(1000),
                matrice(new Integer[] { 1, 0 }), Arrays.asList(200, 800));
        assertEquals(Arrays.asList(200), parts.get(0));
        assertEquals(Arrays.asList(800), parts.get(1));
    }

    @Test
    void unSeulOrganismeRienNeChange() {
        // 6 725 et 3 145 a 70 % -> 4 708 et 2 201 (l'ecart d'arrondi sur la derniere ligne, comme avant)
        List<List<Integer>> parts = CreditLigne.partsBornees(matrice(new Integer[] { 6725, 3145 }),
                matrice(new Integer[] { 70, 70 }), Arrays.asList(6725, 3145),
                matrice(new Integer[] { 0 }, new Integer[] { 0 }), Arrays.asList(6909));
        assertEquals(CreditLigne.parts(Arrays.asList(6725, 3145), 70, 6909), parts.get(0));
    }

    @Test
    void unPlafondResteReparti() {
        // plafond de l'organisme a 3 000 : les parts restent proportionnelles a base x taux de chaque ligne
        List<List<Integer>> parts = CreditLigne.partsBornees(matrice(new Integer[] { 3885, 2685, 200 }),
                matrice(new Integer[] { 80, 70, 80 }), Arrays.asList(3885, 2685, 200),
                matrice(new Integer[] { 0 }, new Integer[] { 0 }, new Integer[] { 0 }), Arrays.asList(3000));
        assertEquals(Arrays.asList(1811, 1096, 93), parts.get(0));
    }

    @Test
    void uneLigneDontLaBaseEstUnPrixDeReferenceBorneSurCetteBase() {
        // regle du minimum (parametre a 0) : base 800 pour une ligne a 1 000, A a 100 % la couvre, B n'a plus rien
        List<List<Integer>> parts = CreditLigne.partsBornees(matrice(new Integer[] { 800 }, new Integer[] { 800 }),
                matrice(new Integer[] { 100 }, new Integer[] { 20 }), Arrays.asList(800),
                matrice(new Integer[] { 0, 1 }), Arrays.asList(800, 0));
        assertEquals(Arrays.asList(800), parts.get(0));
        assertEquals(Arrays.asList(0), parts.get(1));
    }

    @Test
    void partNulleMasqueeSeulementAvecPlusieursOrganismes() {
        assertTrue(CreditLigne.masquerPartNulle(0, 2));
        assertFalse(CreditLigne.masquerPartNulle(190, 2));
        assertFalse(CreditLigne.masquerPartNulle(0, 1)); // un seul organisme : ticket d'aujourd'hui
        assertFalse(CreditLigne.masquerPartNulle(-500, 2)); // vente annulee : montant negatif, jamais masque
    }

    /** Coherence : 5 000 ventes tirees au hasard, sans plafond d'organisme (totaux = somme des parts bornees). */
    @Test
    void coherenceSommeParLigneJamaisAuDelaDuPlafondEtSommeParOrganismeEgaleAuTotal() {
        Random r = new Random(20261110L);
        for (int k = 0; k < 5000; k++) {
            int nbTp = 1 + r.nextInt(3), nbLignes = 1 + r.nextInt(5);
            Integer[][] bases = new Integer[nbTp][nbLignes], taux = new Integer[nbTp][nbLignes];
            Integer[][] ordres = new Integer[nbLignes][nbTp];
            List<Integer> plafonds = new ArrayList<>();
            for (int i = 0; i < nbLignes; i++) {
                int prix = r.nextInt(8) == 0 ? 0 : (1 + r.nextInt(300)) * 25 * (1 + r.nextInt(3));
                plafonds.add(prix);
                List<Integer> ordre = new ArrayList<>();
                for (int t = 0; t < nbTp; t++) {
                    bases[t][i] = r.nextInt(3) == 0 ? (int) (prix * (0.4 + 0.6 * r.nextDouble())) : prix;
                    taux[t][i] = 5 * r.nextInt(21);
                    ordre.add(t);
                }
                if (nbTp > 1 && r.nextInt(4) == 0) {
                    ordre.add(0, ordre.remove(nbTp - 1)); // le dernier passe en premier sur cette ligne
                }
                ordres[i] = ordre.toArray(new Integer[0]);
            }
            // totaux attendus : ce que donne la regle elle-meme, calculee ici independamment
            int[] totaux = new int[nbTp];
            int[][] attendues = new int[nbTp][nbLignes];
            for (int i = 0; i < nbLignes; i++) {
                int reste = plafonds.get(i);
                for (Integer t : ordres[i]) {
                    int p = Math.min(Math.max(reste, 0), (int) Math.round(bases[t][i] * taux[t][i] / 100.0));
                    attendues[t][i] = p;
                    reste -= p;
                    totaux[t] += p;
                }
            }
            List<Integer> tot = new ArrayList<>();
            for (int x : totaux) {
                tot.add(x);
            }
            List<List<Integer>> parts = CreditLigne.partsBornees(matrice(bases), matrice(taux), plafonds,
                    matrice(ordres), tot);
            for (int i = 0; i < nbLignes; i++) {
                int somme = 0;
                for (int t = 0; t < nbTp; t++) {
                    int p = parts.get(t).get(i);
                    assertTrue(p >= 0, "part negative, vente " + k);
                    assertEquals(attendues[t][i], p, "vente " + k + " ligne " + i + " organisme " + t);
                    somme += p;
                }
                assertTrue(somme <= plafonds.get(i), "ligne " + i + " au-dela de son plafond, vente " + k);
            }
            for (int t = 0; t < nbTp; t++) {
                assertEquals(totaux[t], parts.get(t).stream().mapToInt(Integer::intValue).sum(), "total, vente " + k);
            }
        }
    }
}
