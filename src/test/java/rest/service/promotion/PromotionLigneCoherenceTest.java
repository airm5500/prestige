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

    /**
     * Oracle « a partir de s » (plan du 06/11, point 3.2, choix du 07/11) : boites prises une a une ; apres s boites
     * payees, les n suivantes sont offertes, UNE SEULE FOIS ; les suivantes sont payees.
     */
    private static int offertesBoiteParBoite(int quantite, int s, int n) {
        int offertes = 0;
        for (int i = 0; i < quantite; i++) {
            if (i >= s && i < s + n) {
                offertes++;
            }
        }
        return offertes;
    }

    /** Oracle « par palier de s » : boites payees comptees une a une ; chaque palier complet de s donne n offertes. */
    private static int offertesPalierBoiteParBoite(int payees, int s, int n) {
        int offertes = 0;
        int compte = 0;
        for (int i = 0; i < payees; i++) {
            if (++compte == s) {
                offertes += n;
                compte = 0;
            }
        }
        return offertes;
    }

    private static int prixRemise(int prix, int remise) {
        return BigDecimal.valueOf(prix).multiply(BigDecimal.valueOf(100 - remise))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP).intValue();
    }

    @Test
    void unitesGratuitesAPartirDeSOffertesUneSeuleFois() {
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

    /**
     * Par palier de s (demande du 07/11) : les offertes s'AJOUTENT aux boites payees ; 9 payees par palier de 4, 1
     * offerte : 2 offertes, 11 boites, 9 payees, « PROMOTION 8+2 OFFERT(S) ».
     */
    @Test
    void parPalierLesOffertesSAjoutentAuxBoitesPayees() {
        assertEquals(2, PromotionLigne.offertesParPalier(9, 4, 1));
        assertEquals("PROMOTION 8+2 OFFERT(S)",
                PromotionLigne.mention(PromotionLigne.UNITES_GRATUITES, PromotionLigne.MODE_PALIER, 4, 1, 2));
        Random r = new Random(GRAINE + 6);
        for (int k = 0; k < LIGNES; k++) {
            int s = r.nextInt(11); // 0 : promotion mal saisie, rien d'offert
            int n = r.nextInt(6);
            int payees = r.nextInt(5 * (s + 1) + 1);
            int pu = 5 * (1 + r.nextInt(2000));
            int off = PromotionLigne.offertesParPalier(payees, s, n);
            String cas = payees + " payees, " + n + " offertes par palier de " + s;
            assertEquals(s <= 0 || n <= 0 ? 0 : offertesPalierBoiteParBoite(payees, s, n), off, cas);
            assertTrue(off >= 0, cas);
            // ligne : quantite = payees + offertes, montant = prix x payees
            assertEquals(pu * payees, PromotionLigne.montant(pu, payees + off, off), cas);
            // une boite payee de plus ne coute jamais moins et ne donne jamais moins d'offertes
            int off2 = PromotionLigne.offertesParPalier(payees + 1, s, n);
            assertTrue(off2 >= off && PromotionLigne.montant(pu, payees + 1 + off2, off2) > PromotionLigne.montant(pu,
                    payees + off, off), cas);
        }
    }

    /** Mention du ticket et de l'ecran : « PROMOTION x+n OFFERT(S) », x = boites qui ouvrent droit aux offertes. */
    @Test
    void mentionPromotionXPlusNOffertes() {
        assertEquals("PROMOTION 5+1 OFFERT(S)",
                PromotionLigne.mention(PromotionLigne.UNITES_GRATUITES, PromotionLigne.MODE_A_PARTIR, 5, 1, 1));
        assertEquals("PROMOTION", PromotionLigne.mention(PromotionLigne.REMISE, null, null, null, 0));
        assertEquals("PROMOTION", PromotionLigne.mention(PromotionLigne.PRIX_SPECIAL, null, null, null, 0));
        // ligne d'avant la copie de la promotion sur la ligne : ancien texte
        assertEquals("PROMOTION DONT 2 OFFERTE(S)", PromotionLigne.mention(null, null, null, null, 2));
        assertEquals("PROMOTION", PromotionLigne.mention(null, null, null, null, 0));
        Random r = new Random(GRAINE + 7);
        for (int k = 0; k < LIGNES; k++) {
            int s = 1 + r.nextInt(10);
            int n = 1 + r.nextInt(5);
            boolean palier = r.nextBoolean();
            int q = r.nextInt(5 * (s + n) + 1);
            int off = palier ? PromotionLigne.offertesParPalier(q, s, n) : PromotionLigne.unitesOffertes(q, s, n);
            String m = PromotionLigne.mention(PromotionLigne.UNITES_GRATUITES,
                    palier ? PromotionLigne.MODE_PALIER : PromotionLigne.MODE_A_PARTIR, s, n, off);
            String cas = (palier ? "par palier de " : "a partir de ") + s + ", " + n + " offertes, quantite " + q;
            if (off == 0) {
                assertEquals("PROMOTION", m, cas);
                continue;
            }
            java.util.regex.Matcher x = java.util.regex.Pattern.compile("^PROMOTION (\\d+)\\+(\\d+) OFFERT\\(S\\)$")
                    .matcher(m);
            assertTrue(x.matches(), cas + " : " + m);
            int ouvrent = Integer.parseInt(x.group(1));
            assertEquals(off, Integer.parseInt(x.group(2)), cas);
            // x est un multiple du seuil, jamais plus que les boites payees
            assertEquals(0, ouvrent % s, cas);
            assertEquals(palier ? (off / n) * s : s, ouvrent, cas);
            assertTrue(ouvrent <= (palier ? q : q - off), cas);
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
