package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Retour du 11/11 (BL R20285250) : le refus d'entree en stock pour une date de peremption manquante nomme les produits.
 * Test de coherence sur des milliers de BL tires au hasard (graine fixe) : produits suivis ou non, avec 0 a 3 lots dont
 * 0 a tous sans date, lignes repetees, mode reçu ou non. On verifie que la liste contient exactement les produits
 * suivis pour lesquels {@link ReceptionEcart#peremptionManquante} est vrai, une fois chacun, dans l'ordre du BL, avec
 * le bon detail, et que le message commence comme avant.
 */
class PeremptionProduitsCoherenceTest {

    private static final long GRAINE = 20261111L;

    @Test
    @DisplayName("Cas du BL R20285250 : DEPOFEM nomme, avec « 1 lot sans date sur 2 »")
    void casDuSignalement() {
        List<ReceptionEcart.LignePeremption> l = new ArrayList<>();
        l.add(new ReceptionEcart.LignePeremption("p1", "8594690", "AKEROL SIROP FL60ML", true, 1, 0));
        l.add(new ReceptionEcart.LignePeremption("p2", "2481817", "DEPOFEM 150MG/ML SUSP INJ BT 1", true, 2, 1));
        l.add(new ReceptionEcart.LignePeremption("p3", "3396837", "EOSINE SOL AQ 2PC 10DX2ML CPF", false, 2, 1));
        List<String> s = ReceptionEcart.sansPeremption(l, false);
        assertEquals(List.of("2481817 DEPOFEM 150MG/ML SUSP INJ BT 1 (1 lot sans date sur 2)"), s);
        assertEquals("Certaines dates de péremptions ne sont pas renseignées : 2481817 DEPOFEM 150MG/ML SUSP INJ BT 1"
                + " (1 lot sans date sur 2).", ReceptionEcart.messagePeremption(s));
    }

    @Test
    @DisplayName("BL tires au hasard : exactement les produits qui bloquent, une fois, dans l'ordre")
    void hasard() {
        Random r = new Random(GRAINE);
        for (int essai = 0; essai < 20000; essai++) {
            boolean modeRecu = r.nextBoolean();
            int nbProduits = 1 + r.nextInt(6);
            boolean[] suivi = new boolean[nbProduits];
            int[] nbLots = new int[nbProduits], sansDate = new int[nbProduits];
            for (int p = 0; p < nbProduits; p++) {
                suivi[p] = r.nextBoolean();
                nbLots[p] = r.nextInt(4);
                sansDate[p] = nbLots[p] == 0 ? 0 : r.nextInt(nbLots[p] + 1);
            }
            List<ReceptionEcart.LignePeremption> lignes = new ArrayList<>();
            List<Integer> ordre = new ArrayList<>();
            int nbLignes = nbProduits + r.nextInt(3);
            for (int i = 0; i < nbLignes; i++) {
                int p = i < nbProduits ? i : r.nextInt(nbProduits); // lignes repetees
                ordre.add(p);
                lignes.add(new ReceptionEcart.LignePeremption("id" + p, "C" + p, "Produit " + p, suivi[p], nbLots[p],
                        sansDate[p]));
            }
            Set<Integer> attendu = new LinkedHashSet<>();
            for (int p : ordre) {
                boolean bloque = suivi[p] && (nbLots[p] == 0 ? !modeRecu : sansDate[p] > 0);
                if (bloque) {
                    attendu.add(p);
                }
            }
            List<String> obtenu = ReceptionEcart.sansPeremption(lignes, modeRecu);
            assertEquals(attendu.size(), obtenu.size(), "nombre de produits, essai " + essai);
            int k = 0;
            for (int p : attendu) {
                String detail = nbLots[p] == 0 ? "aucun lot"
                        : sansDate[p] + (sansDate[p] > 1 ? " lots sans date sur " : " lot sans date sur ") + nbLots[p];
                assertEquals("C" + p + " Produit " + p + " (" + detail + ")", obtenu.get(k++), "essai " + essai);
            }
            if (!obtenu.isEmpty()) {
                String msg = ReceptionEcart.messagePeremption(obtenu);
                assertTrue(msg.startsWith(ReceptionEcart.MSG_PEREMPTION + " : "), msg);
                obtenu.forEach(x -> assertTrue(msg.contains(x), x));
            }
        }
    }
}
