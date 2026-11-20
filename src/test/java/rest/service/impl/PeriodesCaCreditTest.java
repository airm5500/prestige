package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
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
 * Retour de l'application Prestige Pharmacien sur la demande 67 (20/11) : la periode lue pour {@code ca-credit} pagine.
 * <ul>
 * <li>duree glissante : chaque page servie prolonge la periode de 60 s ; sans page pendant 60 s, la base est relue
 * ;</li>
 * <li>{@code luLe} : le repere ne change pas tant que la meme lecture sert, et change a chaque relecture ;</li>
 * <li>lecture partagee : deux premieres pages en meme temps sur la meme periode ne lisent la base qu'une fois ;</li>
 * <li>une lecture en echec n'est pas gardee : la suivante relit.</li>
 * </ul>
 */
class PeriodesCaCreditTest {

    private static final long DUREE = PeriodesCaCredit.DUREE;

    @Test
    void dureeGlissanteEtRepere() {
        AtomicLong horloge = new AtomicLong(1_000_000L);
        AtomicInteger lectures = new AtomicInteger();
        PeriodesCaCredit<Integer> p = new PeriodesCaCredit<>(horloge::get);
        PeriodesCaCredit.Lecture<Integer> l0 = p.lire("a", true, () -> Arrays.asList(lectures.incrementAndGet()));
        assertEquals(1, lectures.get());
        assertEquals(1_000_000L, l0.luLe);
        // une page toutes les 50 s pendant 10 minutes : jamais de relecture (duree glissante)
        for (int i = 0; i < 12; i++) {
            horloge.addAndGet(DUREE - 10_000L);
            PeriodesCaCredit.Lecture<Integer> l = p.lire("a", false, () -> Arrays.asList(lectures.incrementAndGet()));
            assertEquals(1, lectures.get(), "page " + i + " : pas de relecture");
            assertEquals(l0.luLe, l.luLe);
            assertSame(l0.lignes, l.lignes);
        }
        // 60 s sans page : relecture, nouveau repere
        horloge.addAndGet(DUREE);
        PeriodesCaCredit.Lecture<Integer> l2 = p.lire("a", false, () -> Arrays.asList(lectures.incrementAndGet()));
        assertEquals(2, lectures.get());
        assertNotEquals(l0.luLe, l2.luLe);
        // relire (premiere page, tirer pour rafraichir) : relecture meme dans les 60 s
        horloge.addAndGet(1_000L);
        PeriodesCaCredit.Lecture<Integer> l3 = p.lire("a", true, () -> Arrays.asList(lectures.incrementAndGet()));
        assertEquals(3, lectures.get());
        assertEquals(horloge.get(), l3.luLe);
        // autre periode : sa propre lecture, sans toucher a la premiere
        p.lire("b", false, () -> Arrays.asList(lectures.incrementAndGet()));
        assertEquals(4, lectures.get());
        assertEquals(Collections.singletonList(3), p.lire("a", false, () -> Arrays.asList(-1)).lignes);
    }

    @Test
    void reglesSurDesSuitesTireesAuHasard() {
        Random r = new Random(20261120L);
        for (int cas = 0; cas < 2_000; cas++) {
            AtomicLong horloge = new AtomicLong(r.nextInt(1_000_000));
            AtomicInteger lectures = new AtomicInteger();
            PeriodesCaCredit<Integer> p = new PeriodesCaCredit<>(horloge::get);
            String[] cles = { "x", "y", "z" };
            long[] dernierService = new long[3];
            long[] repere = { -1, -1, -1 };
            for (int pas = 0; pas < 40; pas++) {
                horloge.addAndGet(r.nextInt(3) == 0 ? r.nextInt(2 * (int) DUREE) : r.nextInt(5_000));
                int k = r.nextInt(3);
                boolean relire = r.nextInt(6) == 0;
                int avant = lectures.get();
                PeriodesCaCredit.Lecture<Integer> l = p.lire(cles[k], relire,
                        () -> Arrays.asList(lectures.incrementAndGet()));
                boolean relue = relire || repere[k] < 0 || horloge.get() - dernierService[k] >= DUREE;
                assertEquals(relue ? avant + 1 : avant, lectures.get(), "cas " + cas + " pas " + pas);
                if (relue) {
                    assertEquals(horloge.get(), l.luLe);
                    repere[k] = l.luLe;
                } else {
                    assertEquals(repere[k], l.luLe, "meme lecture, meme repere");
                }
                assertTrue(l.luLe <= horloge.get());
                dernierService[k] = horloge.get();
            }
        }
    }

    @Test
    void deuxPremieresPagesEnMemeTempsUneSeuleLecture() throws Exception {
        PeriodesCaCredit<Integer> p = new PeriodesCaCredit<>(System::currentTimeMillis);
        AtomicInteger lectures = new AtomicInteger();
        CountDownLatch dansLaLecture = new CountDownLatch(1);
        CountDownLatch liberer = new CountDownLatch(1);
        ExecutorService ex = Executors.newFixedThreadPool(4);
        try {
            Future<PeriodesCaCredit.Lecture<Integer>> f1 = ex.submit(() -> p.lire("m", true, () -> {
                lectures.incrementAndGet();
                dansLaLecture.countDown();
                attendre(liberer);
                return Arrays.asList(42);
            }));
            assertTrue(dansLaLecture.await(5, TimeUnit.SECONDS));
            List<Future<PeriodesCaCredit.Lecture<Integer>>> autres = new ArrayList<>();
            for (int i = 0; i < 3; i++) {
                autres.add(ex.submit(() -> p.lire("m", true, () -> {
                    lectures.incrementAndGet();
                    return Arrays.asList(-1);
                })));
            }
            Thread.sleep(200);
            liberer.countDown();
            PeriodesCaCredit.Lecture<Integer> l1 = f1.get(5, TimeUnit.SECONDS);
            for (Future<PeriodesCaCredit.Lecture<Integer>> f : autres) {
                PeriodesCaCredit.Lecture<Integer> l = f.get(5, TimeUnit.SECONDS);
                assertSame(l1.lignes, l.lignes);
                assertEquals(l1.luLe, l.luLe);
            }
            assertEquals(1, lectures.get(), "une seule lecture de la base");
            // la lecture finie, un nouveau « relire » relit
            p.lire("m", true, () -> Arrays.asList(lectures.incrementAndGet()));
            assertEquals(2, lectures.get());
        } finally {
            ex.shutdownNow();
        }
    }

    @Test
    void uneLectureEnEchecNEstPasGardee() {
        AtomicLong horloge = new AtomicLong(5_000L);
        PeriodesCaCredit<Integer> p = new PeriodesCaCredit<>(horloge::get);
        assertThrows(IllegalStateException.class, () -> p.lire("e", false, () -> {
            throw new IllegalStateException("base indisponible");
        }));
        AtomicInteger lectures = new AtomicInteger();
        assertEquals(Collections.singletonList(1),
                p.lire("e", false, () -> Arrays.asList(lectures.incrementAndGet())).lignes);
    }

    private static void attendre(CountDownLatch l) {
        try {
            l.await(5, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
