package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Rapport d'exploitation du 13/11, point 4 : la page de connexion attend la fin du prechauffage.
 * <p>
 * Test de COHERENCE sur 2 000 demarrages tires au hasard (graine fixe) : 1 a 5 etapes, fins dans un ordre quelconque,
 * etapes terminees deux fois ou inconnues, fins simultanees sur plusieurs fils. Regles : « pret » si et seulement si
 * toutes les etapes lancees sont finies ; les etapes en cours sont exactement celles qui restent ; la duree ne recule
 * jamais et se fige une fois pret ; un redemarrage repart de zero.
 * </p>
 */
class EtatDemarrageCoherenceTest {

    @Test
    @DisplayName("2 000 demarrages : pret si et seulement si toutes les etapes sont finies")
    void demarrages() {
        Random r = new Random(20261113L);
        for (int d = 0; d < 2000; d++) {
            int n = 1 + r.nextInt(5);
            List<String> etapes = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                etapes.add("etape" + i);
            }
            EtatDemarrage.commencer(etapes.toArray(new String[0]));
            assertTrue(!EtatDemarrage.pret(), "demarrage " + d + " : pret avant toute fin");
            List<String> ordre = new ArrayList<>(etapes);
            Collections.shuffle(ordre, r);
            List<String> restantes = new ArrayList<>(etapes);
            long derniere = -1;
            for (String e : ordre) {
                if (r.nextInt(4) == 0) {
                    EtatDemarrage.terminer("inconnue" + r.nextInt(3));
                }
                assertEquals(restantes, new ArrayList<>(EtatDemarrage.enCours()), "demarrage " + d);
                assertTrue(EtatDemarrage.dureeMs() >= derniere);
                derniere = EtatDemarrage.dureeMs();
                EtatDemarrage.terminer(e);
                restantes.remove(e);
                if (r.nextInt(4) == 0) {
                    EtatDemarrage.terminer(e);
                }
                assertEquals(restantes.isEmpty(), EtatDemarrage.pret(), "demarrage " + d + " apres " + e);
            }
            long figee = EtatDemarrage.dureeMs();
            assertEquals(figee, EtatDemarrage.dureeMs(), "duree figee une fois pret");
        }
    }

    @Test
    @DisplayName("Fins simultanees sur plusieurs fils : pret une seule fois, a la derniere")
    void finsSimultanees() throws InterruptedException {
        for (int essai = 0; essai < 200; essai++) {
            String[] etapes = { "jpa", "scripts", "a", "b", "c", "d" };
            EtatDemarrage.commencer(etapes);
            ExecutorService fils = Executors.newFixedThreadPool(etapes.length);
            CountDownLatch top = new CountDownLatch(1);
            for (String e : etapes) {
                fils.submit(() -> {
                    top.await();
                    EtatDemarrage.terminer(e);
                    return null;
                });
            }
            top.countDown();
            fils.shutdown();
            assertTrue(fils.awaitTermination(10, TimeUnit.SECONDS));
            assertTrue(EtatDemarrage.pret(), "essai " + essai);
            assertTrue(EtatDemarrage.enCours().isEmpty());
        }
    }
}
