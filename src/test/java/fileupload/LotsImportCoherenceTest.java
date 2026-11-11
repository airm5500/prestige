package fileupload;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.OrderDetailLot;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Random;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Retour du 11/11 (BL R20285250, base de Tiassale) : un produit present plusieurs fois dans le fichier du grossiste.
 * Test de coherence : sur des milliers d'imports tires au hasard (graine fixe), lignes repetees ou non, avec ou sans
 * numero de lot et date, quantites de 0 a 9, on verifie :
 * <ul>
 * <li>la quantite totale des lots = somme des quantites du fichier ;</li>
 * <li>jamais deux lots de meme numero et de meme date (vides compris : un vide, une chaine blanche et null valent
 * pareil) ;</li>
 * <li>chaque lot = somme des lignes du fichier qui portent son numero et sa date ;</li>
 * <li>les lots restent dans l'ordre de leur premiere apparition ; des lots differents restent separes.</li>
 * </ul>
 */
class LotsImportCoherenceTest {

    private static final long GRAINE = 20261111L;
    private static final String[] NUMEROS = { null, "", "  ", "L1", "L2", "987586522" };
    private static final String[] DATES = { null, "", "2028-10-01", "2029-02-01" };

    @Test
    @DisplayName("Cas du BL R20285250 : DEPOFEM 2 + 2 sans lot ni date donne un seul lot de 4")
    void casDuSignalement() {
        List<OrderDetailLot> lots = new ArrayList<>();
        LotsImport.ajouter(lots, null, null, 2);
        LotsImport.ajouter(lots, null, null, 2);
        assertEquals(1, lots.size());
        assertEquals(4, lots.get(0).getQuantity());
    }

    @Test
    @DisplayName("Deux lots differents du fichier restent deux lots")
    void lotsDifferents() {
        List<OrderDetailLot> lots = new ArrayList<>();
        LotsImport.ajouter(lots, "L1", "2028-10-01", 3);
        LotsImport.ajouter(lots, "L2", "2028-10-01", 1);
        LotsImport.ajouter(lots, "L1", "2029-02-01", 2);
        LotsImport.ajouter(lots, "L1", "2028-10-01", 5);
        assertEquals(3, lots.size());
        assertEquals(8, lots.get(0).getQuantity());
        assertEquals(1, lots.get(1).getQuantity());
        assertEquals(2, lots.get(2).getQuantity());
    }

    @Test
    @DisplayName("Imports tires au hasard : quantites conservees, aucun lot en double, ordre d'apparition")
    void hasard() {
        Random r = new Random(GRAINE);
        for (int essai = 0; essai < 20000; essai++) {
            List<OrderDetailLot> lots = new ArrayList<>();
            Map<String, Integer> attendu = new LinkedHashMap<>();
            int total = 0;
            int n = 1 + r.nextInt(6);
            for (int i = 0; i < n; i++) {
                String num = NUMEROS[r.nextInt(NUMEROS.length)], date = DATES[r.nextInt(DATES.length)];
                int q = r.nextInt(10);
                LotsImport.ajouter(lots, num, date, q);
                attendu.merge(cle(num, date), q, Integer::sum);
                total += q;
            }
            final int t = total;
            assertEquals(t, lots.stream().mapToInt(OrderDetailLot::getQuantity).sum(),
                    "quantite totale, essai " + essai);
            Set<String> vus = new HashSet<>();
            List<String> ordre = new ArrayList<>();
            for (OrderDetailLot l : lots) {
                String k = cle(l.getNumeroLot(), l.getDatePeremption());
                assertTrue(vus.add(k), "lot en double " + k + ", essai " + essai);
                assertEquals(attendu.get(k), Integer.valueOf(l.getQuantity()),
                        "quantite du lot " + k + ", essai " + essai);
                ordre.add(k);
            }
            assertEquals(new ArrayList<>(attendu.keySet()), ordre, "ordre d'apparition, essai " + essai);
        }
    }

    private static String cle(String num, String date) {
        return Objects.toString(vide(num)) + "|" + Objects.toString(vide(date));
    }

    private static String vide(String s) {
        return s == null || s.trim().isEmpty() ? null : s.trim();
    }
}
