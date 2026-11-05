package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.TLot;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Tests de coherence de la quantite entree en stock a la cloture d'un BL, sur des milliers de lignes tirees au hasard
 * (graine fixe : un echec se rejoue a l'identique). Chaque ligne a ses lots saisis (statuts varies, quantites et unites
 * gratuites differentes, parfois aucun lot, parfois zero), et parfois les lots d'un BL annule portant le meme numero
 * (retour complet puis ressaisie sous ce numero, analyse du 30/10).
 */
class LotsBonLivraisonCoherenceTest {

    private static final long GRAINE = 20261105L;
    private static final int LIGNES = 5000;
    private static final String[] STATUTS_ACTIFS = { "enable", "is_Closed", "perime", "encours_peremption", null };

    private static TLot lot(int nombre, int gratuit, String statut) {
        TLot l = new TLot();
        l.setIntNUMBER(nombre);
        l.setIntNUMBERGRATUIT(gratuit);
        l.setStrSTATUT(statut);
        return l;
    }

    private static final class Ligne {
        final int cmde;
        final int ug;
        final List<TLot> saisis = new ArrayList<>();
        final List<TLot> annules = new ArrayList<>();
        int totalSaisi;

        Ligne(Random r) {
            cmde = 1 + r.nextInt(12);
            ug = r.nextInt(4) == 0 ? r.nextInt(3) : 0;
            int n = r.nextInt(4); // 0 : aucun lot saisi
            for (int i = 0; i < n; i++) {
                int nombre = r.nextInt(7); // zero compris
                saisis.add(lot(nombre, r.nextInt(3), STATUTS_ACTIFS[r.nextInt(STATUTS_ACTIFS.length)]));
                totalSaisi += nombre;
            }
            int a = r.nextInt(3) == 0 ? 1 + r.nextInt(3) : 0; // lots d'un BL annule homonyme
            for (int i = 0; i < a; i++) {
                annules.add(lot(1 + r.nextInt(9), r.nextInt(2), "delete"));
            }
        }

        List<TLot> tous() {
            List<TLot> l = new ArrayList<>(saisis);
            l.addAll(annules);
            Collections.shuffle(l, new Random(cmde * 31L + ug));
            return l;
        }

        String decrire() {
            return "cmde " + cmde + " ug " + ug + " saisi " + totalSaisi + " (" + saisis.size() + " lots), annules "
                    + annules.size();
        }
    }

    /** Les lots d'un BL annule ne changent jamais la quantite entree ni le refus. */
    @Test
    void lesLotsDUnBlAnnuleNeComptentPas() {
        Random r = new Random(GRAINE);
        for (int k = 0; k < LIGNES; k++) {
            Ligne l = new Ligne(r);
            assertEquals(LotsBonLivraison.quantiteEntree(l.saisis, l.cmde, l.ug),
                    LotsBonLivraison.quantiteEntree(l.tous(), l.cmde, l.ug), "ligne " + k + " : " + l.decrire());
            assertEquals(l.saisis.size(), LotsBonLivraison.actifs(l.tous()).size(), "ligne " + k + " : " + l.decrire());
            assertEquals(l.totalSaisi, LotsBonLivraison.saisi(l.tous()), "ligne " + k + " : " + l.decrire());
        }
    }

    /**
     * Regles de la cloture : sans lot saisi, la quantite commandee ; lots en dessous de la commande, refus ; sinon le
     * total des lots, jamais plus que commande + UG, jamais moins que la commande, jamais negatif.
     */
    @Test
    void reglesDeLaQuantiteEntree() {
        Random r = new Random(GRAINE + 1);
        int refus = 0, sansLot = 0, bornes = 0;
        for (int k = 0; k < LIGNES; k++) {
            Ligne l = new Ligne(r);
            Integer q = LotsBonLivraison.quantiteEntree(l.tous(), l.cmde, l.ug);
            String d = "ligne " + k + " : " + l.decrire() + " -> " + q;
            if (l.saisis.isEmpty()) {
                assertEquals(Integer.valueOf(l.cmde), q, d);
                sansLot++;
            } else if (l.totalSaisi < l.cmde) {
                assertEquals(null, q, d);
                refus++;
            } else {
                assertEquals(Integer.valueOf(Math.min(l.totalSaisi, l.cmde + l.ug)), q, d);
                assertTrue(q >= l.cmde && q <= l.cmde + l.ug, d);
                if (l.totalSaisi > l.cmde + l.ug) {
                    bornes++;
                }
            }
            assertTrue(q == null || q >= 0, d);
        }
        // le jeu couvre bien les trois issues et le plafond
        assertTrue(refus > 100 && sansLot > 100 && bornes > 10,
                refus + " refus, " + sansLot + " sans lot, " + bornes + " bornes");
    }
}
