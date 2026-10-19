package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

import dal.Garde;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

/** Decision 39 du pharmacien : le calcul d'une garde est reutilise par les pages suivantes, jamais perime. */
class CalculGardeCacheTest {

    private static Garde garde(String id, int jourFin) {
        Garde g = new Garde();
        g.setId(id);
        g.setDateDebut(LocalDateTime.of(2026, 9, 1, 8, 0));
        g.setDateFin(LocalDateTime.of(2026, 9, jourFin, 8, 0));
        return g;
    }

    private static CalculGardeCache.Calcul calcul(AtomicInteger n) {
        n.incrementAndGet();
        return new CalculGardeCache.Calcul(new ArrayList<>(), new ArrayList<>(), null, null);
    }

    @Test
    void pages_suivantes_sans_nouveau_calcul() {
        AtomicInteger n = new AtomicInteger();
        Garde g = garde("T-CACHE-1", 15);
        CalculGardeCache.Calcul a = CalculGardeCache.obtenir(g, 2, () -> calcul(n));
        CalculGardeCache.Calcul b = CalculGardeCache.obtenir(g, 2, () -> calcul(n));
        assertSame(a, b);
        assertEquals(1, n.get());
    }

    @Test
    void autres_dates_ou_tranches_ou_oubli_recalculent() {
        AtomicInteger n = new AtomicInteger();
        CalculGardeCache.obtenir(garde("T-CACHE-2", 15), 2, () -> calcul(n));
        CalculGardeCache.obtenir(garde("T-CACHE-2", 3), 2, () -> calcul(n));
        CalculGardeCache.obtenir(garde("T-CACHE-2", 3), 4, () -> calcul(n));
        assertEquals(3, n.get());
        CalculGardeCache.oublier("T-CACHE-2");
        CalculGardeCache.obtenir(garde("T-CACHE-2", 3), 4, () -> calcul(n));
        assertEquals(4, n.get());
    }

    @Test
    void nombre_de_calculs_gardes_borne() {
        AtomicInteger n = new AtomicInteger();
        for (int i = 0; i < CalculGardeCache.MAX_ENTREES + 10; i++) {
            CalculGardeCache.obtenir(garde("T-CACHE-B" + i, 15), 2, () -> calcul(n));
        }
        assertEquals(CalculGardeCache.MAX_ENTREES + 10, n.get());
        assertEquals(true, CalculGardeCache.taille() <= CalculGardeCache.MAX_ENTREES);
    }
}
