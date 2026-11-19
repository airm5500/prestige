package util.horloge;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/**
 * Retour support du 18/11 : « horloge/etat » bloqué de 27 s à 1 min 02 (serveur, 17/11 10:46), photographie des fils
 * arrêtée dans InetAddress.getByName (ReferenceTemps.ecartNtp). La mesure de l'heure d'Internet se faisait pendant la
 * requête de l'écran, et la résolution du nom du serveur de temps n'a pas de délai. Chaque poste appelle cette route
 * toutes les 5 minutes : un fil HTTP immobilisé à chaque fois.
 */
class ReferenceTempsTest {

    @AfterEach
    void remettre() {
        ReferenceTemps.mesureur = ReferenceTemps::mesurerMaintenant;
        ReferenceTemps.oublier();
    }

    @Test
    void lEcranNAttendJamaisLaMesure() throws Exception {
        CountDownLatch libere = new CountDownLatch(1);
        AtomicInteger mesures = new AtomicInteger();
        ReferenceTemps.oublier();
        ReferenceTemps.mesureur = () -> {
            mesures.incrementAndGet();
            try {
                libere.await(30, TimeUnit.SECONDS); // résolution DNS qui n'aboutit pas
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return new ReferenceTemps.Mesure(1234, "ntp:essai", System.currentTimeMillis());
        };
        ExecutorService ecrans = Executors.newFixedThreadPool(20);
        try {
            List<Future<Long>> durees = new ArrayList<>();
            for (int i = 0; i < 20; i++) {
                durees.add(ecrans.submit(() -> {
                    long t0 = System.nanoTime();
                    ReferenceTemps.mesurer();
                    return (System.nanoTime() - t0) / 1_000_000L;
                }));
            }
            for (Future<Long> d : durees) {
                long ms = d.get(5, TimeUnit.SECONDS);
                assertTrue(ms < 200, "un écran a attendu la mesure " + ms + " ms");
            }
            assertEquals(1, mesures.get(), "20 écrans simultanés : une seule mesure");
        } finally {
            libere.countDown();
            ecrans.shutdownNow();
        }
        // la mesure terminée, l'écran suivant la reçoit (cache de quelques minutes)
        long fin = System.currentTimeMillis() + 5000;
        ReferenceTemps.Mesure m = null;
        while (System.currentTimeMillis() < fin && (m = ReferenceTemps.mesurer()) == null) {
            Thread.sleep(20);
        }
        assertNotNull(m, "la mesure faite en tâche de fond est rendue");
        assertEquals(1234, m.ecartMs);
        assertEquals(1, mesures.get(), "pas de nouvelle mesure tant que la dernière est fraîche");
    }

    /**
     * Cohérence (graine fixe, 10 000 cas) : écart = t1 − (émission + aller-retour / 2) ; un aller-retour nul donne
     * l'écart brut ; une horloge locale juste donne un écart nul à la demi-milliseconde près.
     */
    @Test
    void ecartSurDesMilliersDeCas() {
        Random r = new Random(20261118L);
        for (int i = 0; i < 10_000; i++) {
            long t0 = 1_794_000_000_000L + r.nextInt(1_000_000_000);
            long allerRetour = r.nextInt(4000);
            long t1 = t0 + allerRetour;
            long decalage = r.nextInt(7_200_000) - 3_600_000; // horloge locale fausse de ±1 h
            long emission = t0 + allerRetour / 2 - decalage; // le serveur a émis à mi-chemin, à l'heure juste
            long e = ReferenceTemps.ecart(t0, t1, emission);
            assertTrue(Math.abs(e - decalage) <= 1, "cas " + i + " : " + e + " au lieu de " + decalage);
            assertEquals(t1 - emission, ReferenceTemps.ecart(t1, t1, emission), "aller-retour nul");
        }
    }
}
