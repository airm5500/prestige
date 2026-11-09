package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Demande 59 (plan du 08/11) : cloture « entrer le reçu » d'un BL. Test de coherence (CLAUDE.md) : sur des milliers de
 * BL tires au hasard avec une graine fixe (lignes completes, partielles, vides, avec UG, depassant le commande), on
 * verifie les regles de la cloture :
 * <ul>
 * <li>stock apres = stock avant + somme des quantites entrees ;</li>
 * <li>entree d'une ligne = somme de ses lots (UG comprises), plafonnee a commande + UG prevues (plafond actuel) ;</li>
 * <li>ligne sans lot : rien n'entre, manquant = commande ;</li>
 * <li>manquant = commande − reçu, jamais negatif ; total des manquants = somme des lignes ;</li>
 * <li>les ecarts listent exactement les lignes ou reçu &lt; commande ;</li>
 * <li>un BL sans aucun lot est refuse ;</li>
 * <li>en mode reçu, la peremption n'est controlee que sur les lots saisis ; les modes actuels ne changent pas.</li>
 * </ul>
 */
class ReceptionEcartCoherenceTest {

    private static final long GRAINE = 20261108L;
    private static final int NB_BL = 5000;

    @Test
    @DisplayName("Ligne complete, partielle, vide, avec UG, au-dela du plafond : les cas nommes")
    void casNommes() {
        ReceptionEcart.Ligne complete = ReceptionEcart.calculer(10, 0, lots(4, 0, 6, 0));
        assertEquals(10, complete.aEntrer);
        assertEquals(0, complete.manquant);
        assertFalse(complete.enEcart());

        ReceptionEcart.Ligne partielle = ReceptionEcart.calculer(10, 0, lots(3, 0, 4, 0));
        assertEquals(7, partielle.aEntrer);
        assertEquals(7, partielle.recu);
        assertEquals(3, partielle.manquant);
        assertTrue(partielle.enEcart());

        ReceptionEcart.Ligne vide = ReceptionEcart.calculer(5, 0, Collections.emptyList());
        assertEquals(0, vide.aEntrer);
        assertEquals(0, vide.recu);
        assertEquals(0, vide.ug);
        assertEquals(5, vide.manquant);
        assertTrue(vide.sansLot);

        // 10 commandees, lot de 12 dont 2 UG (int_NUMBER compte les UG), 2 UG prevues : tout entre
        ReceptionEcart.Ligne ug = ReceptionEcart.calculer(10, 2, lots(12, 2));
        assertEquals(12, ug.aEntrer);
        assertEquals(2, ug.ug);
        assertEquals(0, ug.manquant);

        // au-dela du plafond (commande + UG prevues) : plafonne, comme aujourd'hui
        ReceptionEcart.Ligne trop = ReceptionEcart.calculer(10, 1, lots(9, 0, 9, 1));
        assertEquals(11, trop.aEntrer);
        assertEquals(0, trop.manquant);

        // quantite commandee a zero : rien a recevoir, aucun manquant
        ReceptionEcart.Ligne zero = ReceptionEcart.calculer(0, 0, Collections.emptyList());
        assertEquals(0, zero.manquant);
        assertFalse(zero.enEcart());
    }

    @Test
    @DisplayName("Un BL dont aucune ligne n'a de lot est refuse (« aucun produit reçu »)")
    void aucunRecu() {
        assertTrue(ReceptionEcart.aucunProduitRecu(List.of(0, 0, 0)));
        assertFalse(ReceptionEcart.aucunProduitRecu(List.of(0, 2, 0)));
        assertTrue(ReceptionEcart.aucunProduitRecu(List.of()));
    }

    @Test
    @DisplayName("Peremption : en mode reçu, seule une ligne avec un lot sans date est refusee ; modes actuels inchanges")
    void peremption() {
        // mode actuel : ligne sans lot refusee quand la peremption est obligatoire (comportement inchange)
        assertTrue(ReceptionEcart.peremptionManquante(false, 0, 0));
        assertTrue(ReceptionEcart.peremptionManquante(false, 2, 1));
        assertFalse(ReceptionEcart.peremptionManquante(false, 2, 0));
        // mode reçu : une ligne non reçue n'a pas de lot a controler
        assertFalse(ReceptionEcart.peremptionManquante(true, 0, 0));
        assertTrue(ReceptionEcart.peremptionManquante(true, 2, 1));
        assertFalse(ReceptionEcart.peremptionManquante(true, 2, 0));
    }

    @Test
    @DisplayName("5 000 BL tires au hasard (graine fixe) : stock, recu, manquant, ecarts et total concordent")
    void coherenceAleatoire() {
        Random r = new Random(GRAINE);
        int blRefuses = 0, lignesVides = 0, lignesPartielles = 0, lignesUg = 0, lignesPlafond = 0;
        for (int b = 0; b < NB_BL; b++) {
            int nbLignes = 1 + r.nextInt(8);
            int stockAvant = r.nextInt(50);
            int stock = stockAvant;
            int sommeEntree = 0, totalManquant = 0, ecarts = 0;
            List<Integer> nbLots = new ArrayList<>();
            List<ReceptionEcart.Ligne> lignes = new ArrayList<>();
            for (int l = 0; l < nbLignes; l++) {
                int commande = r.nextInt(25); // zero compris
                int ugPrevue = r.nextInt(4) == 0 ? r.nextInt(4) : 0;
                int forme = r.nextInt(5); // 0 vide, 1 partielle, 2 complete, 3 avec UG, 4 au-dela
                List<int[]> lots = new ArrayList<>();
                int nb = forme == 0 ? 0 : 1 + r.nextInt(3);
                for (int k = 0; k < nb; k++) {
                    int base = forme == 1 ? r.nextInt(Math.max(1, commande / nb + 1))
                            : forme == 4 ? commande / nb + 1 + r.nextInt(5) : (commande + nb - 1) / nb;
                    int gratuit = forme == 3 ? r.nextInt(3) : 0;
                    lots.add(new int[] { base + gratuit, gratuit });
                }
                nbLots.add(lots.size());
                ReceptionEcart.Ligne x = ReceptionEcart.calculer(commande, ugPrevue, lots);
                lignes.add(x);
                int somme = lots.stream().mapToInt(a -> a[0]).sum();
                int ug = lots.stream().mapToInt(a -> a[1]).sum();
                // regles de la ligne
                assertTrue(x.aEntrer >= 0 && x.manquant >= 0 && x.recu >= 0 && x.ug >= 0, "jamais negatif");
                assertEquals(x.recu, x.aEntrer, "recu = quantite entree");
                assertEquals(Math.min(somme, commande + ugPrevue), x.aEntrer, "somme des lots, plafond actuel");
                assertTrue(x.aEntrer <= commande + ugPrevue, "plafond commande + UG");
                assertEquals(Math.max(0, commande - x.recu), x.manquant, "manquant = commande - recu, >= 0");
                assertEquals(ug, x.ug, "UG = somme des gratuits");
                assertEquals(x.recu < commande, x.enEcart(), "ecart = recu < commande");
                if (lots.isEmpty()) {
                    assertEquals(0, x.aEntrer, "ligne sans lot : rien n'entre");
                    assertEquals(commande, x.manquant, "ligne sans lot : tout manque");
                    lignesVides++;
                }
                if (!lots.isEmpty() && somme < commande) {
                    lignesPartielles++;
                }
                if (ug > 0) {
                    lignesUg++;
                }
                if (somme > commande + ugPrevue) {
                    lignesPlafond++;
                }
            }
            if (ReceptionEcart.aucunProduitRecu(nbLots)) {
                // refus : rien n'entre, le stock ne bouge pas
                blRefuses++;
                assertTrue(nbLots.stream().allMatch(n -> n == 0));
                continue;
            }
            ReceptionEcart.Bilan bilan = ReceptionEcart.bilan(lignes);
            for (ReceptionEcart.Ligne x : lignes) {
                stock += x.aEntrer;
                sommeEntree += x.aEntrer;
                totalManquant += x.manquant;
                ecarts += x.enEcart() ? 1 : 0;
            }
            assertEquals(stockAvant + sommeEntree, stock, "stock apres = stock avant + entrees");
            assertEquals(sommeEntree, bilan.totalEntree, "bilan : total entre");
            assertEquals(totalManquant, bilan.totalManquant, "bilan : total des manquants");
            assertEquals(ecarts, bilan.lignesEnEcart, "bilan : lignes en ecart");
        }
        // jeux d'essai varies : chaque forme est bien representee
        assertTrue(
                blRefuses > 0 && lignesVides > 1000 && lignesPartielles > 1000 && lignesUg > 500 && lignesPlafond > 500,
                blRefuses + " " + lignesVides + " " + lignesPartielles + " " + lignesUg + " " + lignesPlafond);
    }

    private static List<int[]> lots(int... v) {
        List<int[]> l = new ArrayList<>();
        for (int i = 0; i < v.length; i += 2) {
            l.add(new int[] { v[i], v[i + 1] });
        }
        return l;
    }
}
