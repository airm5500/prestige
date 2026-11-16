package bll.tierspayantManagement;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.Random;

import org.junit.jupiter.api.Test;

/**
 * Fiche tiers payant : enregistrer sans modifier ne reecrit rien, une vraie modification passe toujours (demande du
 * 15/11). Milliers d'etats tires au hasard (graine fixe) : la valeur de la base, presentee par la fiche puis renvoyee
 * telle quelle, revient a l'identique ; une valeur differente (de sens different) est posee.
 */
class ConservationFicheTiersPayantCoherenceTest {

    private static final long GRAINE = 20261115L;
    private static final int CAS = 5000;

    /* presentation par la liste et la fiche (TiersPayantServiceImpl, add.js) */
    private static String ficheTexte(String base) {
        return base == null ? "" : base;
    }

    private static int ficheDelai(Integer base) {
        return base == null ? 0 : base;
    }

    private static int ficheLimite(Integer base) {
        return base != null && base > 0 ? base : 0;
    }

    private static Integer entierOuNull(Random r) {
        switch (r.nextInt(5)) {
        case 0:
            return null;
        case 1:
            return -1;
        case 2:
            return 0;
        default:
            return 1 + r.nextInt(r.nextBoolean() ? 60 : 500000);
        }
    }

    private static String texteOuNull(Random r) {
        switch (r.nextInt(4)) {
        case 0:
            return null;
        case 1:
            return "";
        default:
            return "C" + r.nextInt(100000);
        }
    }

    @Test
    void sansModificationRienNeChange() {
        Random r = new Random(GRAINE);
        for (int i = 0; i < CAS; i++) {
            String code = texteOuNull(r);
            assertEquals(code, ConservationFicheTiersPayant.texte(ficheTexte(code), code), "code paiement, cas " + i);

            Integer delai = entierOuNull(r);
            if (delai != null && delai < 0) {
                delai = null;
            }
            assertEquals(delai, ConservationFicheTiersPayant.delai(ficheDelai(delai), delai), "delai, cas " + i);

            Integer nb = entierOuNull(r), montant = entierOuNull(r);
            assertEquals(nb, ConservationFicheTiersPayant.limite(ficheLimite(nb), nb), "nombre de bons, cas " + i);
            assertEquals(montant, ConservationFicheTiersPayant.limite(ficheLimite(montant), montant),
                    "montant, cas " + i);

            String bordereau = texteOuNull(r), modele = "M" + r.nextInt(5);
            assertEquals(bordereau, ConservationFicheTiersPayant.codeBordereau("V" + modele, bordereau, modele, modele),
                    "code bordereau, modele inchange, cas " + i);
        }
    }

    @Test
    void uneVraieModificationEstPosee() {
        Random r = new Random(GRAINE + 1);
        for (int i = 0; i < CAS; i++) {
            String code = texteOuNull(r), nouveauCode = "N" + r.nextInt(1000);
            assertEquals(nouveauCode, ConservationFicheTiersPayant.texte(nouveauCode, code), "code paiement, cas " + i);
            if (code != null) {
                // vider un code existant reste possible
                assertEquals("", ConservationFicheTiersPayant.texte("", code), "code vide, cas " + i);
            }

            Integer delai = entierOuNull(r);
            int nouveauDelai = r.nextInt(120);
            Integer attenduDelai = nouveauDelai == 0 && delai == null ? null : nouveauDelai;
            assertEquals(attenduDelai, ConservationFicheTiersPayant.delai(nouveauDelai, delai), "delai, cas " + i);

            Integer nb = entierOuNull(r);
            int nouveauNb = 1 + r.nextInt(50);
            assertEquals(Integer.valueOf(nouveauNb), ConservationFicheTiersPayant.limite(nouveauNb, nb),
                    "nombre de bons, cas " + i);
            if (nb != null && nb > 0) {
                // retirer la limite (0) reste possible
                assertEquals(Integer.valueOf(0), ConservationFicheTiersPayant.limite(0, nb),
                        "retrait de limite, cas " + i);
            }

            String bordereau = texteOuNull(r);
            int a = r.nextInt(5), b = (a + 1 + r.nextInt(4)) % 5;
            assertEquals("VM" + b, ConservationFicheTiersPayant.codeBordereau("VM" + b, bordereau, "M" + a, "M" + b),
                    "code bordereau, modele change, cas " + i);
        }
    }

    @Test
    void sensDesLimites() {
        // pour la facturation, -1, 0 et NULL veulent tous dire « aucune limite » ; un positif est une limite
        Random r = new Random(GRAINE + 2);
        for (int i = 0; i < CAS; i++) {
            Integer base = entierOuNull(r), recu = entierOuNull(r);
            Integer pose = ConservationFicheTiersPayant.limite(recu, base);
            assertEquals(ConservationFicheTiersPayant.sansLimite(recu), ConservationFicheTiersPayant.sansLimite(pose),
                    "le sens de la valeur recue est toujours celui de la valeur posee, cas " + i);
            if (!ConservationFicheTiersPayant.sansLimite(recu)) {
                assertEquals(recu, pose, "limite posee telle quelle, cas " + i);
            }
        }
        assertNull(ConservationFicheTiersPayant.limite(0, null));
        assertEquals(Integer.valueOf(-1), ConservationFicheTiersPayant.limite(0, -1));
        assertNull(ConservationFicheTiersPayant.codeBordereau("", null, null, null));
        assertEquals("X", ConservationFicheTiersPayant.codeBordereau("X", "Y", "M1", null));
    }
}
