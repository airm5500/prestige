package job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.lang.reflect.Field;
import java.util.List;
import java.util.Random;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import rest.service.impl.PilotageAgregats;
import rest.service.impl.PilotageSuiviService;

/**
 * Lenteurs d'appaul (12/11) : le deploiement attendait le precalcul des courbes « A suivre » du Pilotage (4 min 11 a 4
 * min 40 sur la copie d'appaul, photos des threads : PilotageSuiviService.evolution). Les agregats mensuels restent
 * calcules avant l'ouverture ; les courbes, simple cache en memoire, sont calculees en tache de fond.
 */
class PilotageAgregatSchedulerDemarrageTest {

    private static final class Agregats extends PilotageAgregats {
        final List<String> trace;

        Agregats(List<String> trace) {
            this.trace = trace;
        }

        @Override
        public int prechauffer() {
            trace.add("agregats");
            return 0;
        }
    }

    private static final class Suivi extends PilotageSuiviService {
        final List<String> trace;
        final long dureeMs;
        final CountDownLatch fini = new CountDownLatch(1);

        Suivi(List<String> trace, long dureeMs) {
            this.trace = trace;
            this.dureeMs = dureeMs;
        }

        @Override
        public void prechauffer() {
            try {
                Thread.sleep(dureeMs); // les courbes de 4 annees, toutes grandeurs
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            trace.add("courbes");
            fini.countDown();
        }
    }

    private static void poser(Object cible, String champ, Object valeur) throws Exception {
        Field f;
        try {
            f = PilotageAgregatScheduler.class.getDeclaredField(champ);
        } catch (NoSuchFieldException absent) {
            return; // ancien code, sans executeur : le test echoue alors sur la duree
        }
        f.setAccessible(true);
        f.set(cible, valeur);
    }

    private static PilotageAgregatScheduler planificateur(List<String> trace, Suivi suivi,
            java.util.concurrent.Executor executeur) throws Exception {
        PilotageAgregatScheduler s = new PilotageAgregatScheduler();
        poser(s, "agregats", new Agregats(trace));
        poser(s, "suivi", suivi);
        poser(s, "executeur", executeur);
        return s;
    }

    @Test
    void leDemarrageNAttendPlusLesCourbes() throws Exception {
        List<String> trace = new CopyOnWriteArrayList<>();
        Suivi suivi = new Suivi(trace, 1500);
        ExecutorService ex = Executors.newSingleThreadExecutor();
        try {
            PilotageAgregatScheduler s = planificateur(trace, suivi, ex);
            long t0 = System.nanoTime();
            s.runOnStartup();
            long ms = (System.nanoTime() - t0) / 1_000_000;
            assertTrue(ms < 500, "le deploiement attend les courbes : " + ms + " ms");
            assertEquals(List.of("agregats"), trace, "les agregats mensuels restent calcules avant l'ouverture");
            assertTrue(suivi.fini.await(10, TimeUnit.SECONDS), "les courbes sont bien calculees ensuite");
            assertEquals(List.of("agregats", "courbes"), trace, "une seule fois, apres les agregats qu'elles lisent");
        } finally {
            ex.shutdownNow();
        }
    }

    @Test
    void sansExecuteurOuRefusLesCourbesSontQuandMemeCalculees() throws Exception {
        // regle : jamais de courbes perdues ; sans executeur (ou s'il refuse), calcul sur place comme avant
        Random r = new Random(20261112L);
        for (int i = 0; i < 200; i++) {
            List<String> trace = new CopyOnWriteArrayList<>();
            Suivi suivi = new Suivi(trace, 0);
            int cas = r.nextInt(3);
            java.util.concurrent.Executor e = cas == 0 ? null : cas == 1 ? x -> {
                throw new RejectedExecutionException("arret du serveur");
            } : Runnable::run;
            planificateur(trace, suivi, e).runOnStartup();
            assertEquals(List.of("agregats", "courbes"), trace, "cas " + i + " (executeur " + cas + ")");
        }
    }
}
