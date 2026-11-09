package rest.service.presaisie;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Locale;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Pre-saisie des BL (plan avoir du 08/11, point 6) : regles verifiees sur des milliers de saisies tirees au hasard
 * (graine fixe) : TTC = HT + TVA, jamais negatif ; numero range comme la creation du BL ; unicite par grossiste et
 * numero ; etats et transitions.
 */
class PresaisieBlReglesCoherenceTest {

    private static final LocalDate AUJ = LocalDate.of(2026, 11, 9);
    private static final String[] GROSSISTES = { "G-LABOREX", "G-COPHARMED", "G-TEDIS", "G-DPCI" };
    private static final String CARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-/. ";

    /** Normalisation de la creation du BL (OrderServiceImpl.creerBonLivraison), recopiee ici comme reference. */
    private static String commeCreerBl(String ref) {
        return ref == null ? null : ref.trim().toUpperCase(Locale.FRENCH);
    }

    private static String numeroAuHasard(Random r) {
        StringBuilder b = new StringBuilder();
        int n = 1 + r.nextInt(24);
        for (int i = 0; i < n; i++) {
            b.append(CARS.charAt(r.nextInt(CARS.length())));
        }
        return (r.nextInt(4) == 0 ? "  " : "") + b + (r.nextInt(4) == 0 ? " " : "");
    }

    @Test
    @DisplayName("5 000 saisies au hasard : TTC = HT + TVA, montants jamais negatifs, numero = numero de creerbl")
    void saisiesAuHasard() {
        Random r = new Random(20261108L);
        int acceptees = 0;
        int refusees = 0;
        for (int i = 0; i < 5000; i++) {
            String g = GROSSISTES[r.nextInt(GROSSISTES.length)];
            String num = numeroAuHasard(r);
            LocalDate d = AUJ.minusDays(r.nextInt(400) - 5);
            Object ht;
            Object tva;
            switch (r.nextInt(5)) {
            case 0:
                ht = 0;
                tva = 0;
                break;
            case 1:
                ht = String.valueOf(r.nextInt(5_000_000));
                tva = String.valueOf(r.nextInt(900_000));
                break;
            case 2:
                ht = -1 - r.nextInt(1000);
                tva = r.nextInt(1000);
                break;
            case 3:
                ht = r.nextInt(3_000_000) + 0.5;
                tva = 0;
                break;
            default:
                ht = (long) r.nextInt(Integer.MAX_VALUE);
                tva = (long) r.nextInt(200_000_000);
            }
            String seq = r.nextInt(3) == 0 ? null : String.valueOf(r.nextInt(100));
            PresaisieBlRegles.Saisie s = PresaisieBlRegles.controler(g, num, d.toString(), ht, tva, seq,
                    r.nextBoolean() ? null : "CMD-" + i, AUJ);
            String attendu = commeCreerBl(num);
            boolean numeroValide = !attendu.isEmpty() && attendu.length() <= 20;
            boolean dateValide = !d.isAfter(AUJ);
            boolean montantsValides = !(ht instanceof Integer && (Integer) ht < 0) && !(ht instanceof Double)
                    && !(ht instanceof Long && (Long) ht > PresaisieBlRegles.MONTANT_MAX)
                    && !(tva instanceof Long && (Long) tva > PresaisieBlRegles.MONTANT_MAX);
            assertEquals(numeroValide && dateValide && montantsValides, s.erreur == null,
                    "cas " + i + " : " + num + " / " + d + " / " + ht + " / " + tva + " -> " + s.erreur);
            if (s.erreur == null) {
                acceptees++;
                assertEquals(attendu, s.numero, "numero range comme creerbl");
                assertTrue(s.ht >= 0 && s.tva >= 0, "jamais negatif");
                assertEquals(s.ht + s.tva, s.ttc(), "TTC = HT + TVA");
                assertTrue(s.ttc() <= 2 * PresaisieBlRegles.MONTANT_MAX && s.ttc() <= Integer.MAX_VALUE,
                        "le TTC tient dans la colonne INT");
                assertEquals(s.numero, PresaisieBlRegles.normaliserNumero(s.numero), "normalisation idempotente");
            } else {
                refusees++;
            }
        }
        assertTrue(acceptees > 1000 && refusees > 500, acceptees + " acceptees / " + refusees + " refusees");
    }

    @Test
    @DisplayName("Unicite : meme grossiste et meme numero (casse et espaces compris) = meme cle ; meme numero chez deux grossistes = permis")
    void unicite() {
        Random r = new Random(7L);
        Set<String> cles = new HashSet<>();
        int collisions = 0;
        for (int i = 0; i < 3000; i++) {
            String g = GROSSISTES[r.nextInt(GROSSISTES.length)];
            String num = String.valueOf(1000 + r.nextInt(400));
            String variante = r.nextBoolean() ? " " + num.toLowerCase(Locale.FRENCH) + " " : num;
            if (!cles.add(PresaisieBlRegles.cle(g, variante))) {
                collisions++;
                assertTrue(cles.contains(PresaisieBlRegles.cle(g, num)));
            }
        }
        assertTrue(collisions > 0);
        assertEquals(PresaisieBlRegles.cle("G1", " bl-12 "), PresaisieBlRegles.cle("G1", "BL-12"));
        assertFalse(PresaisieBlRegles.cle("G1", "BL-12").equals(PresaisieBlRegles.cle("G2", "BL-12")));
    }

    @Test
    @DisplayName("Etats : seul « A saisir » se modifie, se supprime ou passe a « Traite »")
    void etats() {
        assertTrue(PresaisieBlRegles.modifiable("A_SAISIR"));
        assertFalse(PresaisieBlRegles.modifiable("TRAITE"));
        assertFalse(PresaisieBlRegles.modifiable("SUPPRIME"));
        assertFalse(PresaisieBlRegles.modifiable(null));
        assertEquals("À saisir", PresaisieBlRegles.libelleEtat("A_SAISIR"));
        assertEquals("Traité", PresaisieBlRegles.libelleEtat("TRAITE"));
        assertEquals("Supprimé", PresaisieBlRegles.libelleEtat("SUPPRIME"));
    }

    @Test
    @DisplayName("Champs obligatoires, sequence et motif de suppression")
    void champs() {
        assertNotNull(PresaisieBlRegles.controler(null, "1", "2026-11-01", 1, 0, null, null, AUJ).erreur);
        assertNotNull(PresaisieBlRegles.controler("G", "   ", "2026-11-01", 1, 0, null, null, AUJ).erreur);
        assertNotNull(PresaisieBlRegles.controler("G", "1", "", 1, 0, null, null, AUJ).erreur);
        assertNotNull(PresaisieBlRegles.controler("G", "1", "01/11/2026", 1, 0, null, null, AUJ).erreur);
        assertNotNull(PresaisieBlRegles.controler("G", "1", "2026-11-10", 1, 0, null, null, AUJ).erreur);
        assertNotNull(PresaisieBlRegles.controler("G", "1", "2026-11-01", "12a", 0, null, null, AUJ).erreur);
        assertNotNull(PresaisieBlRegles.controler("G", "1", "2026-11-01", 1, 0, "<b>", null, AUJ).erreur);
        PresaisieBlRegles.Saisie vide = PresaisieBlRegles.controler("G", "1", "2026-11-09", null, "", " ", " ", AUJ);
        assertNull(vide.erreur);
        assertEquals(0, vide.ttc());
        assertNull(vide.sequence);
        assertNull(vide.commandeId);
        PresaisieBlRegles.Saisie espaces = PresaisieBlRegles.controler("G", "1", "2026-11-09", "1 250 000", "225 000",
                "48", null, AUJ);
        assertNull(espaces.erreur);
        assertEquals(1_475_000, espaces.ttc());
        assertNotNull(PresaisieBlRegles.controlerMotif(null));
        assertNotNull(PresaisieBlRegles.controlerMotif("  a "));
        assertNull(PresaisieBlRegles.controlerMotif("Saisi en double"));
        assertNotNull(PresaisieBlRegles.controlerMotif(new String(new char[201]).replace('\0', 'x')));
    }
}
