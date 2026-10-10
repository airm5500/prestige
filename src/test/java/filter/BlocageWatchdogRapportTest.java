package filter;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.management.ManagementFactory;
import java.lang.management.ThreadInfo;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import org.junit.jupiter.api.Test;

/**
 * Retours du 10/10 : la photographie des threads d'un blocage doit montrer en tete le thread de la requete bloquee et
 * celui qui detient le verrou qu'il attend, et regrouper les threads au repos (le debut tient dans la cellule Excel).
 */
class BlocageWatchdogRapportTest {

    private static final Object VERROU = new Object();

    @Test
    void threadDeLaRequeteEtDetenteurDuVerrouEnTete() throws Exception {
        CountDownLatch tenu = new CountDownLatch(1);
        CountDownLatch liberer = new CountDownLatch(1);
        Thread detenteur = new Thread(() -> {
            synchronized (VERROU) {
                tenu.countDown();
                try {
                    liberer.await();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        }, "e2e-detenteur-verrou");
        Thread requete = new Thread(() -> {
            synchronized (VERROU) {
                VERROU.hashCode();
            }
        }, "http-thread-pool::http-listener-1(7)");
        List<Thread> repos = new ArrayList<>();
        CountDownLatch finRepos = new CountDownLatch(1);
        for (int i = 0; i < 30; i++) {
            Thread t = new Thread(() -> {
                try {
                    finRepos.await();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }, "e2e-repos-" + i);
            t.start();
            repos.add(t);
        }
        detenteur.start();
        tenu.await();
        requete.start();
        for (int i = 0; i < 100 && requete.getState() != Thread.State.BLOCKED; i++) {
            Thread.sleep(20);
        }
        try {
            ThreadInfo[] infos = ManagementFactory.getThreadMXBean().dumpAllThreads(true, true);
            long maintenant = System.currentTimeMillis();
            String r = BlocageWatchdog.rapport(
                    Collections.singletonList(new SlowRequestFilter.RequeteEnCours("POST",
                            "/prestige/api/v1/vente/ticket/vo", maintenant - 27_000, requete.getName())),
                    infos, null, maintenant);
            String debut = r.substring(0, Math.min(4000, r.length()));
            assertTrue(debut.contains("27s  POST /prestige/api/v1/vente/ticket/vo"), debut);
            assertTrue(debut.contains("\"http-thread-pool::http-listener-1(7)\" BLOCKED"), debut);
            assertTrue(debut.contains("detenu par \"e2e-detenteur-verrou\""), debut);
            assertTrue(debut.contains("=== DETENTEURS DES VERROUS ATTENDUS (1) ===\n\"e2e-detenteur-verrou\""), debut);
            assertTrue(debut.indexOf("BlocageWatchdogRapportTest") > 0, "la pile du thread fautif est dans le debut");
            assertTrue(r.contains("30 threads identiques WAITING : e2e-repos-"), "threads au repos regroupes");
            assertTrue(r.indexOf("THREADS QUI TRAITENT") < r.indexOf("AUTRES THREADS ("), "ordre des sections");
        } finally {
            liberer.countDown();
            finRepos.countDown();
            requete.join(2000);
            detenteur.join(2000);
            for (Thread t : repos) {
                t.join(2000);
            }
        }
    }
}
