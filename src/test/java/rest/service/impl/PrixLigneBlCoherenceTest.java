package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Plan du 12/11, « Modifier Article » d'un BL : coherence du montant du bon apres des modifications successives des
 * prix d'achat de ses lignes. Des milliers de bons tires au hasard (graine fixe), de 1 a 30 lignes, quantites de 0 a
 * 50, PAF de 0 a 20 000, TVA nulle ou non, puis 1 a 20 modifications au hasard (meme ligne plusieurs fois, PAF
 * inchange, en hausse, en baisse, a 0). Regles :
 * <ul>
 * <li>montant HT = somme des PAF x quantite commandee des lignes, apres chaque modification ;</li>
 * <li>TTC - HT = TVA de depart, toujours ;</li>
 * <li>remettre l'ancien PAF rend exactement le montant de depart ;</li>
 * <li>un prix absent ou negatif est refuse, un prix a 0 est accepte.</li>
 * </ul>
 */
class PrixLigneBlCoherenceTest {

    private static final long GRAINE = 20261113L;
    private static final int BONS = 5000;

    @Test
    void leMontantDuBonSuitLesPrixDesLignes() {
        Random r = new Random(GRAINE);
        for (int b = 0; b < BONS; b++) {
            int n = 1 + r.nextInt(30);
            int[] qte = new int[n];
            int[] paf = new int[n];
            int ht = 0;
            for (int i = 0; i < n; i++) {
                qte[i] = r.nextInt(51);
                paf[i] = r.nextInt(5) == 0 ? 0 : r.nextInt(20001);
                ht += qte[i] * paf[i];
            }
            int tva = r.nextBoolean() ? 0 : r.nextInt(5000);
            int ttc = ht + tva;
            int htDepart = ht;
            int[] pafDepart = paf.clone();
            int modifs = 1 + r.nextInt(20);
            for (int m = 0; m < modifs; m++) {
                int i = r.nextInt(n);
                int nouveau;
                switch (r.nextInt(4)) {
                case 0:
                    nouveau = paf[i];
                    break;
                case 1:
                    nouveau = paf[i] + 1 + r.nextInt(1000);
                    break;
                case 2:
                    nouveau = Math.max(0, paf[i] - 1 - r.nextInt(1000));
                    break;
                default:
                    nouveau = 0;
                }
                ht = PrixLigneBl.montantApres(ht, paf[i], nouveau, qte[i]);
                ttc = PrixLigneBl.montantApres(ttc, paf[i], nouveau, qte[i]);
                paf[i] = nouveau;
                int somme = 0;
                for (int k = 0; k < n; k++) {
                    somme += qte[k] * paf[k];
                }
                assertEquals(somme, ht, "bon " + b + ", modification " + m);
                assertEquals(tva, ttc - ht, "bon " + b + ", modification " + m);
            }
            for (int i = 0; i < n; i++) {
                ht = PrixLigneBl.montantApres(ht, paf[i], pafDepart[i], qte[i]);
            }
            assertEquals(htDepart, ht, "bon " + b + " : retour aux prix de depart");
        }
    }

    @Test
    void lesPrixAbsentsOuNegatifsSontRefuses() {
        Random r = new Random(GRAINE + 1);
        for (int t = 0; t < BONS; t++) {
            Integer[] prix = new Integer[4];
            boolean refuse = false;
            for (int i = 0; i < 4; i++) {
                int tirage = r.nextInt(10);
                if (tirage == 0) {
                    prix[i] = null;
                    refuse = true;
                } else if (tirage == 1) {
                    prix[i] = -1 - r.nextInt(1000);
                    refuse = true;
                } else if (tirage == 2) {
                    prix[i] = 0;
                } else {
                    prix[i] = r.nextInt(50000);
                }
            }
            String message = PrixLigneBl.refus(prix[0], prix[1], prix[2], prix[3]);
            if (refuse) {
                assertNotNull(message, "tirage " + t);
            } else {
                assertNull(message, "tirage " + t);
            }
        }
    }
}
