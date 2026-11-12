package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;

/**
 * Lenteurs d'appaul (12/11) : les ruptures du tableau de bord ne sont calculees qu'une fois quand les tuiles et les
 * alertes les demandent ensemble.
 */
class CalculPartageTest {

    @Test
    void deuxDemandesSimultaneesUnSeulCalcul() throws Exception {
        CalculPartage<String> partage = new CalculPartage<>(20_000L);
        AtomicInteger calculs = new AtomicInteger();
        CountDownLatch depart = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(8);
        try {
            List<Future<String>> f = new ArrayList<>();
            for (int i = 0; i < 8; i++) {
                f.add(pool.submit(() -> {
                    depart.await();
                    return partage.obtenir("7|1|2026-11-12", () -> {
                        calculs.incrementAndGet();
                        try {
                            Thread.sleep(200); // la requete des ruptures
                        } catch (InterruptedException e) {
                            Thread.currentThread().interrupt();
                        }
                        return "622";
                    });
                }));
            }
            depart.countDown();
            for (Future<String> x : f) {
                assertEquals("622", x.get(10, TimeUnit.SECONDS));
            }
        } finally {
            pool.shutdownNow();
        }
        assertEquals(1, calculs.get(), "les tuiles et les alertes partagent un seul calcul");
    }

    @Test
    void coherenceSurDesMilliersDeCas() {
        // regles : meme cle et moins de dureeMs -> resultat repris ; sinon -> recalcul ; jamais une valeur d'une autre
        // cle
        Random r = new Random(20261112L);
        AtomicLong horloge = new AtomicLong(1_000_000L);
        CalculPartage<String> partage = new CalculPartage<>(20_000L, horloge::get);
        String derniereCle = null;
        long dernierCalcul = Long.MIN_VALUE;
        int calculsAttendus = 0;
        AtomicInteger calculs = new AtomicInteger();
        for (int i = 0; i < 5000; i++) {
            horloge.addAndGet(r.nextInt(3) == 0 ? r.nextInt(60_000) : r.nextInt(5_000));
            // quatre fois sur cinq la meme demande (tuiles puis alertes), sinon une autre periode, un autre poste, un
            // autre jour
            String cle = derniereCle != null && r.nextInt(5) > 0 ? derniereCle
                    : (1 + r.nextInt(3)) + "|" + (r.nextBoolean() ? "1" : "2") + "|2026-11-" + (10 + r.nextInt(2));
            boolean repris = cle.equals(derniereCle) && horloge.get() - dernierCalcul < 20_000L;
            String v = partage.obtenir(cle, () -> {
                calculs.incrementAndGet();
                return "valeur de " + cle;
            });
            assertEquals("valeur de " + cle, v);
            if (!repris) {
                calculsAttendus++;
                derniereCle = cle;
                dernierCalcul = horloge.get();
            }
            assertEquals(calculsAttendus, calculs.get(), "cas " + i);
        }
        assertTrue(calculsAttendus > 500 && calculsAttendus < 4500, "jeu varie : " + calculsAttendus);
    }

    @Test
    void horlogeQuiRecule() {
        AtomicLong horloge = new AtomicLong(50_000L);
        CalculPartage<Integer> partage = new CalculPartage<>(20_000L, horloge::get);
        AtomicInteger n = new AtomicInteger();
        partage.obtenir("a", n::incrementAndGet);
        horloge.set(10_000L); // changement d'heure du poste
        assertEquals(2, partage.obtenir("a", n::incrementAndGet).intValue());
    }
}
