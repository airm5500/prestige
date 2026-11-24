package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dal.OrderDetailLot;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.json.JSONArray;
import org.junit.jupiter.api.Test;

/**
 * Plan du 21/11, point 16.1 : lots saisis en commande en cours. Coherence sur des milliers de saisies tirees au hasard
 * (graine fixe) : jamais deux lignes pour un meme lot, quantite d'un lot = somme de ses saisies, total des lots = total
 * saisi, refus des que la somme depasse la quantite de la ligne, quantites gratuites gardees, JSON relu = lots.
 */
class LotsCommandeCoherenceTest {

    @Test
    void unLotParNumeroEtQuantitesAdditionnees() {
        Random r = new Random(1612211L);
        for (int essai = 0; essai < 3000; essai++) {
            List<OrderDetailLot> lots = new ArrayList<>();
            if (r.nextBoolean()) {
                OrderDetailLot importe = new OrderDetailLot("IMP" + r.nextInt(3), "31/12/2027", 1 + r.nextInt(5));
                importe.setQuantityGratuit(r.nextInt(3));
                lots.add(importe);
            }
            Map<String, Integer> attendu = new HashMap<>();
            lots.forEach(x -> attendu.merge(x.getNumeroLot().toUpperCase(), x.getQuantity(), Integer::sum));
            int gratuit = lots.isEmpty() ? 0 : lots.get(0).getQuantityGratuit();
            int total = lots.stream().mapToInt(OrderDetailLot::getQuantity).sum();
            for (int k = 0, n = 1 + r.nextInt(8); k < n; k++) {
                String numero = (r.nextBoolean() ? "L" : "l") + r.nextInt(4);
                if (r.nextInt(5) == 0 && !lots.isEmpty()) {
                    numero = lots.get(0).getNumeroLot();
                }
                int q = 1 + r.nextInt(20);
                lots = LotsCommandeService.ajouter(lots, numero, "3" + r.nextInt(2) + "/01/2028", q);
                attendu.merge(numero.toUpperCase(), q, Integer::sum);
                total += q;
            }
            Set<String> vus = new HashSet<>();
            for (OrderDetailLot x : lots) {
                assertTrue(vus.add(x.getNumeroLot().toUpperCase()), "lot en double : " + x.getNumeroLot());
                assertEquals(attendu.get(x.getNumeroLot().toUpperCase()).intValue(), x.getQuantity(), x.getNumeroLot());
                assertTrue(x.getQuantity() > 0);
            }
            assertEquals(attendu.size(), lots.size());
            assertEquals(total, LotsCommandeService.somme(lots));
            if (gratuit > 0) {
                assertEquals(gratuit, lots.get(0).getQuantityGratuit(), "gratuit perdu");
            }
            /* somme et quantite de la ligne */
            assertNull(LotsCommandeService.controlerSomme(lots, total));
            assertNull(LotsCommandeService.controlerSomme(lots, total + r.nextInt(10)));
            String refus = LotsCommandeService.controlerSomme(lots, total - 1 - r.nextInt(Math.max(1, total)));
            assertNotNull(refus);
            assertTrue(refus.contains("(" + total + ")"), refus);
            /* JSON ecrit puis relu */
            JSONArray a = new JSONArray(LotsCommandeService.json(lots));
            assertEquals(lots.size(), a.length());
            for (int i = 0; i < a.length(); i++) {
                assertEquals(lots.get(i).getNumeroLot(), a.getJSONObject(i).getString("numeroLot"));
                assertEquals(lots.get(i).getQuantity(), a.getJSONObject(i).getInt("quantity"));
                assertEquals(lots.get(i).getDatePeremption(), a.getJSONObject(i).getString("datePeremption"));
                assertEquals(lots.get(i).getQuantityGratuit(), a.getJSONObject(i).getInt("quantityGratuit"));
            }
        }
    }

    @Test
    void numerosDeLot() {
        assertNotNull(LotsCommandeService.motifNumero(""));
        assertNotNull(LotsCommandeService.motifNumero("123456789012345678901"));
        assertNotNull(LotsCommandeService.motifNumero("A\u001dB"));
        assertNull(LotsCommandeService.motifNumero("A2341"));
        assertNull(LotsCommandeService.motifNumero("12345678901234567890"));
        assertEquals("[]", LotsCommandeService.json(new ArrayList<>()));
    }
}
