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
 * Plan du 06/11, point 5.2 : la ligne prix/taux sous un produit ne sort que si la ligne a quelque chose de propre (prix
 * de reference different du prix de vente, taux saisi different de celui de l'organisme, base propre d'un organisme
 * differente du prix de vente). Une ligne au taux de l'assurance n'imprime rien sous le produit.
 */
class CreditLigneAffichageTest {

    @Test
    void ligneAuTauxDeLAssuranceSansRienDeSaisi() {
        assertFalse(CreditLigne.afficherLigne(null, 2500, Arrays.asList((Integer) null), Arrays.asList(70),
                Arrays.asList((Integer) null)));
        assertFalse(CreditLigne.afficherLigne(0, 2500, null, Arrays.asList(70), null));
        // prix de reference egal au prix de vente : rien de propre
        assertFalse(CreditLigne.afficherLigne(2500, 2500, null, Arrays.asList(70), null));
        // taux saisi egal a celui de l'organisme : rien de propre
        assertFalse(CreditLigne.afficherLigne(null, 2500, Arrays.asList(70), Arrays.asList(70), null));
        // deux organismes, rien de saisi
        assertFalse(CreditLigne.afficherLigne(null, 1800, Arrays.asList(null, null), Arrays.asList(70, 30),
                Arrays.asList(null, null)));
    }

    @Test
    void ligneAvecQuelqueChoseDePropre() {
        assertTrue(CreditLigne.afficherLigne(2400, 2500, null, Arrays.asList(70), null), "prix de reference");
        assertTrue(CreditLigne.afficherLigne(null, 2500, Arrays.asList(60), Arrays.asList(70), null), "taux saisi");
        assertTrue(CreditLigne.afficherLigne(null, 1800, Arrays.asList(null, 20), Arrays.asList(70, 30), null),
                "taux saisi sur le second organisme seulement");
        assertTrue(CreditLigne.afficherLigne(null, 1800, null, Arrays.asList(70, 30), Arrays.asList(null, 1500)),
                "base propre d'un organisme (lot Q2.5)");
    }

    /** 10 000 lignes tirees au hasard (graine fixe) : la decision suit exactement la regle, et seulement elle. */
    @Test
    void coherenceSurDixMilleLignes() {
        Random r = new Random(20261107L);
        int affichees = 0;
        for (int n = 0; n < 10_000; n++) {
            int pv = r.nextInt(5) == 0 ? 0 : 50 + r.nextInt(40_000);
            int nb = 1 + r.nextInt(3);
            List<Integer> org = new ArrayList<>(), saisis = new ArrayList<>(), bases = new ArrayList<>();
            boolean propre = false;
            for (int t = 0; t < nb; t++) {
                int to = r.nextInt(101);
                org.add(to);
                switch (r.nextInt(3)) {
                case 0:
                    saisis.add(null);
                    break;
                case 1:
                    saisis.add(to);
                    break;
                default:
                    int autre = (to + 1 + r.nextInt(100)) % 101;
                    saisis.add(autre);
                    propre = true;
                }
                switch (r.nextInt(4)) {
                case 0:
                    int b = 1 + r.nextInt(40_000);
                    bases.add(b);
                    propre |= b != pv;
                    break;
                case 1:
                    bases.add(pv);
                    break;
                default:
                    bases.add(null);
                }
            }
            Integer ref;
            switch (r.nextInt(4)) {
            case 0:
                ref = null;
                break;
            case 1:
                ref = pv;
                break;
            case 2:
                ref = 0;
                break;
            default:
                ref = 1 + r.nextInt(40_000);
                propre |= ref != pv;
            }
            boolean res = CreditLigne.afficherLigne(ref, pv, saisis, org, bases);
            assertEquals(propre, res, "cas " + n + " : ref " + ref + ", pv " + pv + ", saisis " + saisis
                    + ", organismes " + org + ", bases " + bases);
            affichees += res ? 1 : 0;
        }
        // jeu varie : les deux issues sont largement representees
        assertTrue(affichees > 2_000 && affichees < 9_500, "lignes affichees : " + affichees);
    }
}
