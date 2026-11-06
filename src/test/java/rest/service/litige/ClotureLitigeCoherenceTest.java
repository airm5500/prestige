package rest.service.litige;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Cloture d'un litige tiers payant (regle de test du 05/11) : des milliers de clotures tirees au hasard (graine fixe),
 * verifiees par leurs regles : accorde + ecart = part, ecart jamais negatif, abandon = toute la part ; encours et
 * restant de facture diminues de l'ecart, jamais negatifs ; montant accorde entier entre 1 et la part, sinon refuse.
 */
class ClotureLitigeCoherenceTest {

    private static final long GRAINE = 20261105L;
    private static final int CLOTURES = 20000;

    /** part : 1 a 500 000, avec des parts de 1 F ; accorde : 0 (abandon) a la part, bornes comprises */
    private static int[] partEtAccorde(Random r) {
        int part = r.nextInt(10) == 0 ? 1 + r.nextInt(3) : 1 + r.nextInt(500000);
        int tirage = r.nextInt(6);
        int accorde = tirage == 0 ? 0 : tirage == 1 ? part : tirage == 2 ? 1 : r.nextInt(part + 1);
        return new int[] { part, accorde };
    }

    @Test
    void accordePlusEcartEgalLaPart() {
        Random r = new Random(GRAINE);
        for (int k = 0; k < CLOTURES; k++) {
            int[] c = partEtAccorde(r);
            int ecart = ClotureLitige.ecart(c[0], c[1]);
            assertEquals(c[0], c[1] + ecart, "part " + c[0] + " accorde " + c[1]);
            assertTrue(ecart >= 0, "part " + c[0] + " accorde " + c[1]);
            if (c[1] == 0) {
                assertEquals(c[0], ecart, "abandon : toute la part est perdue");
            }
            if (c[1] == c[0]) {
                assertEquals(0, ecart, "tout accorde : aucun ecart");
            }
        }
    }

    /** encours : sans encours (null), plus petit que l'ecart, egal, plus grand */
    @Test
    void encoursDiminueDeLEcartJamaisNegatif() {
        Random r = new Random(GRAINE + 1);
        for (int k = 0; k < CLOTURES; k++) {
            int[] c = partEtAccorde(r);
            int ecart = ClotureLitige.ecart(c[0], c[1]);
            int tirage = r.nextInt(4);
            Integer conso = tirage == 0 ? null
                    : tirage == 1 ? ecart : tirage == 2 ? r.nextInt(ecart + 1) : ecart + r.nextInt(2000000);
            int apres = ClotureLitige.encours(conso, ecart);
            int avant = conso == null ? 0 : conso;
            assertTrue(apres >= 0, "conso " + conso + " ecart " + ecart);
            assertTrue(apres <= avant, "l'encours ne monte jamais : conso " + conso + " ecart " + ecart);
            assertEquals(Math.max(0, avant - ecart), apres, "conso " + conso + " ecart " + ecart);
            if (avant >= ecart) {
                assertEquals(avant - ecart, apres, "diminue exactement de l'ecart");
            }
        }
    }

    @Test
    void compteUtilisableSousLePlafond() {
        Random r = new Random(GRAINE + 2);
        for (int k = 0; k < CLOTURES; k++) {
            int encours = r.nextInt(1000000);
            Integer plafond = r.nextInt(5) == 0 ? null : r.nextBoolean() ? encours : r.nextInt(1000000);
            assertEquals(encours <= (plafond == null ? 0 : plafond), ClotureLitige.utilisable(encours, plafond),
                    "encours " + encours + " plafond " + plafond);
        }
        assertTrue(ClotureLitige.utilisable(0, null), "encours nul : utilisable meme sans plafond");
    }

    /** facture deja emise : restant (ligne et facture) diminue de l'ecart, jamais negatif */
    @Test
    void restantDeFactureJamaisNegatif() {
        Random r = new Random(GRAINE + 3);
        for (int k = 0; k < CLOTURES; k++) {
            int[] c = partEtAccorde(r);
            int ecart = ClotureLitige.ecart(c[0], c[1]);
            int tirage = r.nextInt(4);
            Double restant = tirage == 0 ? null : tirage == 1 ? (double) c[0] : (double) r.nextInt(2000000);
            double apres = ClotureLitige.restant(restant, ecart);
            double avant = restant == null ? 0d : restant;
            assertTrue(apres >= 0d, "restant " + restant + " ecart " + ecart);
            assertEquals(Math.max(0d, avant - ecart), apres, 0d, "restant " + restant + " ecart " + ecart);
            if (restant != null && restant == c[0]) {
                assertEquals(c[1], apres, 0d, "facture de la seule part : il reste le montant accorde");
            }
        }
    }

    /** saisies de l'ecran : entiers dans et hors de la part, 0, negatifs, decimaux, vides, texte */
    @Test
    void montantAccordeEntierEntreUnEtLaPart() {
        Random r = new Random(GRAINE + 4);
        for (int k = 0; k < CLOTURES; k++) {
            int part = 1 + r.nextInt(500000);
            int tirage = r.nextInt(7);
            int v = tirage == 0 ? 0 : tirage == 1 ? -1 - r.nextInt(1000)
                    : tirage == 2 ? part + 1 + r.nextInt(1000) : tirage == 3 ? part : 1 + r.nextInt(part);
            String saisie = (r.nextBoolean() ? " " : "") + v + (r.nextBoolean() ? " " : "");
            Integer lu = ClotureLitige.montantAccorde(saisie);
            assertEquals(Integer.valueOf(v), lu, "saisie '" + saisie + "'");
            assertEquals(v >= 1 && v <= part, ClotureLitige.accordeValide(lu, part), "accorde " + v + " part " + part);
        }
        for (String s : new String[] { null, "", "  ", "12.5", "12,5", "1e3", "abc", "1 000", "99999999999" }) {
            assertNull(ClotureLitige.montantAccorde(s), "saisie '" + s + "' refusee");
        }
        assertFalse(ClotureLitige.accordeValide(0, 0), "part nulle : rien ne peut etre accorde");
    }
}
