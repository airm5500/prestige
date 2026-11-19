package util.paiements;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import commonTasks.dto.VenteReglementDTO;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Demande 62 (point 3b) : une prevente deja payee par mobile money se termine au comptoir avec ce paiement. Regles,
 * verifiees sur des milliers de clotures tirees au hasard (graine fixe) : la cloture est acceptee si et seulement si le
 * mode de l'operateur porte exactement le montant paye (somme de ses lignes, ou mode de la vente sans detail) ; un
 * complement dans un autre mode ne change rien ; le message de refus nomme l'operateur, le montant et le numero.
 */
public class ClotureComptoirCoherenceTest {

    private static final List<String> MODES = Arrays.asList("1", "2", "3", "5", "7", "8", "9", "10");

    private static VenteReglementDTO ligne(String mode, int montant) {
        return new VenteReglementDTO().setTypeReglement(mode).setMontant(montant);
    }

    @Test
    void reglesSurDesMilliersDeClotures() {
        Random r = new Random(20261119L);
        int acceptees = 0, refusees = 0, avecComplement = 0;
        for (int cas = 0; cas < 20000; cas++) {
            Operateur op = Operateur.values()[r.nextInt(Operateur.values().length)];
            int paye = (1 + r.nextInt(400)) * 25;
            String ref = r.nextBoolean() ? "SIM-" + r.nextInt(100000) : "";
            List<VenteReglementDTO> lignes = new ArrayList<>();
            String typeRegleId = MODES.get(r.nextInt(MODES.size()));
            int sansDetail = paye + (r.nextInt(3) == 0 ? (r.nextInt(5) - 2) * 50 : 0);
            long attenduDuMode;
            if (r.nextInt(4) == 0) {
                /* sans detail : le mode de la vente compte, pour le montant de la vente */
                if (r.nextBoolean()) {
                    typeRegleId = op.typeReglement;
                }
                attenduDuMode = op.typeReglement.equals(typeRegleId) ? sansDetail : 0;
            } else {
                int n = 1 + r.nextInt(3);
                attenduDuMode = 0;
                for (int i = 0; i < n; i++) {
                    String mode = r.nextInt(3) == 0 ? MODES.get(r.nextInt(MODES.size())) : op.typeReglement;
                    int montant = r.nextInt(3) == 0 ? (r.nextInt(200) + 1) * 25 : (n == 1 ? paye : paye / n);
                    lignes.add(ligne(r.nextInt(5) == 0 ? " " + mode + " " : mode, montant));
                    if (mode.equals(op.typeReglement)) {
                        attenduDuMode += montant;
                    }
                }
                if (lignes.stream().anyMatch(l -> !l.getTypeReglement().trim().equals(op.typeReglement))) {
                    avecComplement++;
                }
            }
            assertEquals(attenduDuMode,
                    ClotureComptoir.montantDuMode(op.typeReglement, typeRegleId, lignes, sansDetail), "cas " + cas);
            String refus = ClotureComptoir.refus(op, paye, ref, typeRegleId, lignes, sansDetail);
            if (attenduDuMode == paye) {
                assertNull(refus, "cas " + cas + " : le mode porte exactement le paiement");
                acceptees++;
            } else {
                assertNotNull(refus, "cas " + cas + " : " + attenduDuMode + " au lieu de " + paye);
                assertTrue(refus.contains(ClotureComptoir.libelle(op)) && refus.contains(paye + " F"), refus);
                assertTrue(ref.isEmpty() ? !refus.contains("n°") : refus.contains("n° " + ref), refus);
                refusees++;
            }
        }
        assertTrue(acceptees > 2000 && refusees > 2000 && avecComplement > 1000,
                acceptees + " / " + refusees + " / " + avecComplement);
    }

    @Test
    void casFixes() {
        /*
         * borne : Wave 3 000 F ; caisse « especes » : refus ; Wave 3 000 : accepte ; Wave 3 000 + especes 500 (net
         * augmente) : accepte ; Wave 2 500 : refus
         */
        assertNotNull(ClotureComptoir.refus(Operateur.WAVE, 3000, "W1", "1", Collections.emptyList(), 3000));
        assertNull(ClotureComptoir.refus(Operateur.WAVE, 3000, "W1", "10", Collections.emptyList(), 3000));
        assertNull(ClotureComptoir.refus(Operateur.WAVE, 3000, "W1", "10",
                Arrays.asList(ligne("10", 3000), ligne("1", 500)), 3500));
        assertNotNull(ClotureComptoir.refus(Operateur.WAVE, 3000, "W1", "10", Arrays.asList(ligne("10", 2500)), 2500));
        assertNotNull(ClotureComptoir.refus(Operateur.ORANGE, 1500, "", "10", Arrays.asList(ligne("10", 1500)), 1500),
                "Wave ne vaut pas Orange");
        /* sans paiement : rien a controler */
        assertNull(ClotureComptoir.refus(null, 3000, "", "1", null, 3000));
        assertNull(ClotureComptoir.refus(Operateur.MTN, 0, "", "1", null, 3000));
        assertEquals("Orange Money", ClotureComptoir.libelle(Operateur.ORANGE));
        assertEquals("Wave", ClotureComptoir.libelle(Operateur.WAVE));
    }

    /**
     * Demande 64 : refus d'une modification du panier, sur des milliers de paiements tires au hasard (graine fixe) : le
     * message nomme toujours l'operateur et le montant ; « deja payee » seulement pour un paiement recu, « en cours »
     * sinon ; jamais vide.
     */
    @Test
    void refusModificationPanierSurDesMilliersDeCas() {
        Random r = new Random(20261119L);
        Operateur[] ops = Operateur.values();
        int payes = 0, enCours = 0;
        for (int cas = 0; cas < 10000; cas++) {
            Operateur op = ops[r.nextInt(ops.length)];
            int montant = 5 * (1 + r.nextInt(40000));
            boolean paye = r.nextBoolean();
            String m = ClotureComptoir.refusModificationPanier(op, montant, paye);
            assertTrue(m != null && m.contains(ClotureComptoir.libelle(op)) && m.contains(montant + " F"),
                    "cas " + cas + " : " + m);
            assertEquals(paye, m.contains("déjà payée"), m);
            assertEquals(!paye, m.contains("en cours"), m);
            if (paye) {
                payes++;
            } else {
                enCours++;
            }
        }
        assertTrue(payes > 4000 && enCours > 4000, payes + " / " + enCours);
        String refus = ClotureComptoir.refusPaiement("la caisse de la borne est fermée.");
        assertTrue(
                refus.startsWith("Paiement mobile money impossible : la caisse") && refus.endsWith("paie à la caisse."),
                refus);
    }
}
