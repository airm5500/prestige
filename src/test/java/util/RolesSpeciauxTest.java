package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

/**
 * Connexion juste apres un deploiement (05/11) : la reconnaissance des profils speciaux, faite a chaque connexion,
 * passait par la factory EclipseLink des anciens ecrans (dal.dataManager). Pendant son prechauffage (3,4 s sur machine
 * calme, plus de 20 s sous charge), le verrou de dal.dataManager est tenu : l'acceptation des identifiants attendait
 * derriere (2,1 a 2,5 s mesures, contre 0,05 s ensuite).
 */
class RolesSpeciauxTest {

    @AfterEach
    void remettre() {
        RolesSpeciaux.lecteur = RolesSpeciaux.LECTEUR_SERVEUR;
        RolesSpeciaux.oublier();
    }

    @Test
    void laLectureDesProfilsNAttendPasLaFactoryDesAnciensEcrans() throws Exception {
        RolesSpeciaux.oublier();
        CountDownLatch tenu = new CountDownLatch(1);
        CountDownLatch liberer = new CountDownLatch(1);
        Thread prechauffage = new Thread(() -> {
            synchronized (dal.dataManager.class) {
                tenu.countDown();
                try {
                    liberer.await(30, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        }, "simule-prechauffage-factory");
        prechauffage.setDaemon(true);
        prechauffage.start();
        assertTrue(tenu.await(5, TimeUnit.SECONDS));
        ExecutorService ex = Executors.newSingleThreadExecutor();
        try {
            Future<Set<String>> f = ex.submit(() -> RolesSpeciaux.roles(RolesSpeciaux.P_SUPER_ADMIN));
            /* hors serveur la source est absente : liste vide, mais rendue tout de suite, sans attendre le verrou */
            assertEquals(Set.of(RolesSpeciaux.AUCUN), f.get(2, TimeUnit.SECONDS));
        } finally {
            liberer.countDown();
            ex.shutdownNow();
        }
    }

    @Test
    void lesProfilsLusSontRangesParDroit_casAuHasard() {
        Random r = new Random(20261105L);
        String[] marques = { RolesSpeciaux.P_SUPER_ADMIN, RolesSpeciaux.P_ADMIN, RolesSpeciaux.P_PHARMACIEN };
        for (int essai = 0; essai < 3000; essai++) {
            List<Object[]> lignes = new ArrayList<>();
            Map<String, Set<String>> attendu = new HashMap<>();
            int n = r.nextInt(12);
            for (int i = 0; i < n; i++) {
                String m = marques[r.nextInt(3)];
                String role = "R" + r.nextInt(6);
                lignes.add(new Object[] { m, role });
                attendu.computeIfAbsent(m, k -> new HashSet<>()).add(role);
            }
            RolesSpeciaux.lecteur = () -> lignes;
            RolesSpeciaux.oublier();
            for (String m : marques) {
                Set<String> lu = RolesSpeciaux.roles(m);
                Set<String> voulu = attendu.getOrDefault(m, Set.of());
                assertEquals(voulu.isEmpty() ? Set.of(RolesSpeciaux.AUCUN) : voulu, lu, "essai " + essai + " " + m);
                for (int k = 0; k < 6; k++) {
                    assertEquals(voulu.contains("R" + k), RolesSpeciaux.a("R" + k, m), "essai " + essai);
                }
                assertFalse(RolesSpeciaux.a(null, m));
            }
        }
    }

    @Test
    void uneLectureEnEchecGardeLaDerniereListeConnue() {
        List<Object[]> lignes = new ArrayList<>();
        lignes.add(new Object[] { RolesSpeciaux.P_ADMIN, "R1" });
        RolesSpeciaux.lecteur = () -> lignes;
        RolesSpeciaux.oublier();
        assertTrue(RolesSpeciaux.a("R1", RolesSpeciaux.P_ADMIN));
        RolesSpeciaux.lecteur = () -> {
            throw new IllegalStateException("base illisible");
        };
        RolesSpeciaux.oublier();
        assertTrue(RolesSpeciaux.a("R1", RolesSpeciaux.P_ADMIN));
    }
}
