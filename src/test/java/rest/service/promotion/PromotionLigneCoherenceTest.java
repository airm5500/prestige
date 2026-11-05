package rest.service.promotion;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Tests de coherence (proprietes) du calcul d'une ligne en promotion (audit 05 PR-01) : des milliers de lignes tirees
 * au hasard (graine fixe : un echec se rejoue a l'identique), prix, quantites, seuils et remises differents d'une ligne
 * a l'autre, zero compris. Les attendus sont calcules autrement que par le code teste (boites comptees une a une,
 * BigDecimal).
 */
class PromotionLigneCoherenceTest {

    private static final long GRAINE = 20261105L;
    private static final int LIGNES = 20000;

    /** Oracle : boites prises une a une ; apres s boites payees, les n suivantes sont offertes, et ainsi de suite. */
    private static int offertesBoiteParBoite(int quantite, int s, int n) {
        int offertes = 0;
        int rang = 0;
        for (int i = 0; i < quantite; i++) {
            if (rang >= s) {
                offertes++;
            }
            rang = (rang + 1) % (s + n);
        }
        return offertes;
    }

    private static int prixRemise(int prix, int remise) {
        return BigDecimal.valueOf(prix).multiply(BigDecimal.valueOf(100 - remise))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP).intValue();
    }

    @Test
    void unitesGratuitesApresSBoitesLesNSuivantesSontOffertes() {
        Random r = new Random(GRAINE);
        for (int k = 0; k < LIGNES; k++) {
            int s = 1 + r.nextInt(10);
            int n = 1 + r.nextInt(5);
            int q = r.nextInt(4 * (s + n) + 1);
            int off = PromotionLigne.unitesOffertes(q, s, n);
            String cas = "quantite " + q + ", " + n + " offertes a partir de " + s;
            assertEquals(offertesBoiteParBoite(q, s, n), off, cas);
            assertTrue(off >= 0 && off <= q, "offertes hors de [0, quantite], " + cas);
        }
    }

    @Test
    void prendreUneBoiteDePlusNeCouteJamaisMoins() {
        Random r = new Random(GRAINE + 1);
        for (int k = 0; k < LIGNES; k++) {
            int s = 1 + r.nextInt(10);
            int n = 1 + r.nextInt(5);
            int pu = 5 * (1 + r.nextInt(2000));
            int q = r.nextInt(4 * (s + n));
            int avant = PromotionLigne.montant(pu, q, PromotionLigne.unitesOffertes(q, s, n));
            int apres = PromotionLigne.montant(pu, q + 1, PromotionLigne.unitesOffertes(q + 1, s, n));
            assertTrue(apres >= avant, (q + 1) + " boites a " + apres + " contre " + q + " boites a " + avant + " (" + n
                    + " offertes a partir de " + s + ")");
        }
    }

    @Test
    void montantDeLigneJamaisNegatifNiAuDessusDuPrixPublic() {
        Random r = new Random(GRAINE + 2);
        for (int k = 0; k < LIGNES; k++) {
            int s = r.nextInt(6); // 0 : promotion mal saisie, aucune unite offerte
            int n = r.nextInt(4);
            int pu = 5 * r.nextInt(2000);
            int q = r.nextInt(50);
            int off = PromotionLigne.unitesOffertes(q, s, n);
            int montant = PromotionLigne.montant(pu, q, off);
            String cas = "pu " + pu + ", quantite " + q + ", seuil " + s + ", offertes " + n;
            assertTrue(montant >= 0 && montant <= pu * q, cas + " : " + montant);
            assertEquals(pu * (q - off), montant, cas);
            if (s <= 0 || n <= 0) {
                assertEquals(0, off, "promotion sans seuil ou sans offerte : rien d'offert, " + cas);
            }
        }
    }

    /** La remise s'applique au prix de la ligne au moment de la vente, meme si le prix public a change depuis. */
    @Test
    void remiseEnPourcentageSurLePrixDuJour() {
        Random r = new Random(GRAINE + 3);
        for (int k = 0; k < LIGNES; k++) {
            int remise = 1 + r.nextInt(99);
            int prixCreation = 5 * (1 + r.nextInt(4000));
            // le prix public a change (hausse ou baisse) une fois sur deux depuis la creation de la promotion
            int prixJour = r.nextBoolean() ? prixCreation : 5 * (1 + r.nextInt(4000));
            double enregistre = Math.round(prixCreation * (100 - remise) / 100.0);
            Integer prix = PromotionLigne.prixUnitaire(PromotionLigne.REMISE, remise, enregistre, prixJour);
            int attendu = prixRemise(prixJour, remise);
            String cas = remise + " % ; prix a la creation " + prixCreation + ", prix du jour " + prixJour;
            if (attendu > 0 && attendu < prixJour) {
                assertEquals(Integer.valueOf(attendu), prix, cas);
            } else {
                assertNull(prix, cas);
            }
        }
    }

    @Test
    void prixSpecialSeulementSIlBaisseLePrix() {
        Random r = new Random(GRAINE + 4);
        for (int k = 0; k < LIGNES; k++) {
            int prixJour = 5 * r.nextInt(4000);
            double special = r.nextInt(5) == 0 ? 0 : 5 * r.nextInt(4500);
            Integer prix = PromotionLigne.prixUnitaire(PromotionLigne.PRIX_SPECIAL, 0, special, prixJour);
            String cas = "prix special " + special + ", prix du jour " + prixJour;
            if (special > 0 && special < prixJour) {
                assertEquals(Integer.valueOf((int) special), prix, cas);
            } else {
                assertNull(prix, cas);
            }
        }
    }

    @Test
    void unitesGratuitesNeChangentPasLePrixUnitaire() {
        Random r = new Random(GRAINE + 5);
        for (int k = 0; k < 1000; k++) {
            int prixJour = 5 * (1 + r.nextInt(4000));
            assertNull(PromotionLigne.prixUnitaire(PromotionLigne.UNITES_GRATUITES, 0, (double) prixJour, prixJour));
            assertNull(
                    PromotionLigne.prixUnitaire(PromotionLigne.UNITES_GRATUITES, 0, (double) prixJour / 2, prixJour));
        }
    }
}
