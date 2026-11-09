package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Random;
import org.junit.jupiter.api.Test;

/**
 * Plan du 08/11, point 11.6 : barre d'information de la suggestion. VMJ = prevu du mois / 30 (la meme que la fenetre
 * Prevision, a deux decimales) ; couverture = (rayon + reserve) / VMJ en jours entiers (arrondi inferieur), -1 si rien
 * ne se vend, absente sans prevision. Regles verifiees sur 20 000 cas (graine fixe) : bornes, monotonie, reserve
 * comptee, stocks negatifs ramenes a 0.
 */
class ReapproCouvertureTest {

    @Test
    void couvertureParSesRegles() {
        Random h = new Random(116_0811L);
        for (int cas = 0; cas < 20_000; cas++) {
            int rayon = h.nextInt(10) == 0 ? -h.nextInt(20) : h.nextInt(5000);
            int reserve = h.nextInt(4) == 0 ? 0 : h.nextInt(5000);
            double prevuMois = h.nextInt(6) == 0 ? 0 : Math.round(h.nextDouble() * 30000) / 10.0;
            double vmj = prevuMois / 30.0;
            Integer c = OrderServiceImpl.couvertureReappro(rayon, reserve, vmj);
            String cle = "cas " + cas + " rayon=" + rayon + " reserve=" + reserve + " vmj=" + vmj;
            if (vmj <= 0) {
                assertEquals(-1, c.intValue(), cle + " : rien ne se vend");
                continue;
            }
            int stock = Math.max(0, rayon) + Math.max(0, reserve);
            assertTrue(c >= 0, cle + " : jamais negative");
            /* c jours couverts, pas c + 1 : c * vmj <= stock < (c + 1) * vmj */
            assertTrue(c * vmj <= stock + 1e-6 && stock < (c + 1) * vmj + 1e-6, cle + " -> " + c);
            /* la reserve compte : plus de reserve, jamais moins de couverture */
            assertTrue(OrderServiceImpl.couvertureReappro(rayon, reserve + 1 + h.nextInt(100), vmj) >= c, cle);
            /* plus de ventes, jamais plus de couverture */
            assertTrue(OrderServiceImpl.couvertureReappro(rayon, reserve, vmj * 2) <= c, cle);
            double affichee = OrderServiceImpl.vmjAffichee(vmj);
            assertTrue(Math.abs(affichee - vmj) <= 0.005 + 1e-9, cle + " : VMJ a deux decimales");
            assertEquals(Math.round(affichee * 100), affichee * 100, 1e-6, cle);
        }
        assertNull(OrderServiceImpl.couvertureReappro(10, 10, null), "sans prevision : pas de couverture");
        assertEquals(10, OrderServiceImpl.couvertureReappro(26, 4, 3.0).intValue(), "26 + 4 = 30 a 3 par jour");
        assertEquals(176, OrderServiceImpl.couvertureReappro(26, 502, 3.0).intValue(),
                "exemple du 08/11 : 26 + 502 a 3/j");
    }
}
