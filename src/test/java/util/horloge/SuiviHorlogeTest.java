package util.horloge;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;
import util.horloge.DecisionHorloge.Cause;
import util.horloge.SuiviHorloge.Evenement;
import util.horloge.SuiviHorloge.Passage;

/**
 * Cahier des charges du 24/11, point 1 : le serveur suit lui-même l'heure réelle, chaque minute, avec l'horloge
 * monotone de la machine (le temps réellement écoulé), sans jamais croire l'horloge murale. Une horloge reculée ou
 * avancée à la main pendant le fonctionnement se voit, et la remise à l'heure lève le blocage sans faux « recul ».
 * Chaque apparition, changement et levée du blocage est un événement à tracer, une seule fois.
 */
class SuiviHorlogeTest {

    private static final long MIN = 60_000L, H = 60 * MIN, J = 24 * H, NS = 1_000_000L;
    private static final long T0 = LocalDateTime.of(2026, 11, 24, 10, 0).toInstant(ZoneOffset.UTC).toEpochMilli();
    private static final long PLAFOND = LocalDateTime.of(2029, 1, 1, 0, 0).toInstant(ZoneOffset.UTC).toEpochMilli();

    private static DecisionHorloge.Entree entree(long maintenant, Long ecart) {
        DecisionHorloge.Entree e = new DecisionHorloge.Entree();
        e.maintenantMs = maintenant;
        e.ecartInternetMs = ecart;
        e.plafondMs = PLAFOND;
        return e;
    }

    @Test
    void redemarrageApresUnWeekEndPuisFonctionnementNormal() {
        SuiviHorloge s = new SuiviHorloge();
        Passage p = s.passer(entree(T0 + 3 * J, null), 0, T0);
        assertFalse(p.resultat.bloque);
        assertEquals(Collections.emptyList(), p.evenements);
        assertEquals(Long.valueOf(T0 + 3 * J), p.estimationMs);
        p = s.passer(entree(T0 + 3 * J + MIN, null), 60_000 * NS, null);
        assertFalse(p.resultat.bloque);
        assertEquals(Long.valueOf(T0 + 3 * J + MIN), p.estimationMs);
    }

    @Test
    void horlogeRecuLeeDeDeuxHeuresPuisRemiseALHeure() {
        SuiviHorloge s = new SuiviHorloge();
        s.passer(entree(T0, null), 0, T0);
        Passage p = s.passer(entree(T0 + MIN - 2 * H, null), 60_000 * NS, null);
        assertTrue(p.resultat.causes.contains(Cause.RECUL));
        assertEquals(List.of(Evenement.APPARITION), p.evenements);
        // toujours bloqué : aucun nouvel événement
        p = s.passer(entree(T0 + 2 * MIN - 2 * H, null), 120_000 * NS, null);
        assertTrue(p.resultat.bloque);
        assertEquals(Collections.emptyList(), p.evenements);
        // l'heure réelle a continué d'avancer : remise à l'heure juste, blocage levé
        p = s.passer(entree(T0 + 3 * MIN, null), 180_000 * NS, null);
        assertFalse(p.resultat.bloque);
        assertEquals(List.of(Evenement.LEVEE), p.evenements);
        assertEquals(Long.valueOf(T0 + 3 * MIN), p.estimationMs);
    }

    @Test
    void horlogePartieEn2189PendantLeFonctionnement() {
        SuiviHorloge s = new SuiviHorloge();
        s.passer(entree(T0, null), 0, T0);
        long l2189 = LocalDateTime.of(2189, 1, 1, 8, 0).toInstant(ZoneOffset.UTC).toEpochMilli();
        Passage p = s.passer(entree(l2189, null), 60_000 * NS, null);
        assertTrue(p.resultat.causes.contains(Cause.SAUT));
        assertTrue(p.resultat.causes.contains(Cause.PLAFOND));
        assertEquals(Long.valueOf(T0 + MIN), p.estimationMs, "l'heure fausse n'est jamais retenue");
        p = s.passer(entree(T0 + 2 * MIN, null), 120_000 * NS, null);
        assertFalse(p.resultat.bloque, String.valueOf(p.resultat.causes));
        assertEquals(List.of(Evenement.LEVEE), p.evenements);
    }

    @Test
    void changementDeCausePendantLeBlocage() {
        SuiviHorloge s = new SuiviHorloge();
        s.passer(entree(T0, null), 0, T0);
        assertEquals(List.of(Evenement.APPARITION), s.passer(entree(T0 - H, null), 60_000 * NS, null).evenements);
        assertEquals(List.of(Evenement.CHANGEMENT), s.passer(entree(T0 + 3 * H, null), 120_000 * NS, null).evenements);
    }

    @Test
    void lApercuNeChangeRien() {
        SuiviHorloge s = new SuiviHorloge();
        s.passer(entree(T0, null), 0, T0);
        DecisionHorloge.Resultat a = s.apercu(entree(T0 - 2 * H, null), 30_000 * NS);
        assertTrue(a.bloque);
        // le passage suivant voit toujours un poste qui n'était pas bloqué : l'apparition est tracée une fois
        Passage p = s.passer(entree(T0 + MIN - 2 * H, null), 60_000 * NS, null);
        assertEquals(List.of(Evenement.APPARITION), p.evenements);
        assertEquals(Long.valueOf(T0 + MIN), p.estimationMs);
    }

    /** Essai du 24/11 : un blocage de moins d'une minute doit être tracé dès qu'un poste le voit. */
    @Test
    void unChangementVuParUnPosteDemandeLePassageToutDeSuite() {
        SuiviHorloge s = new SuiviHorloge();
        assertTrue(s.changeraitLaTrace(s.apercuInitial(entree(T0 - 2 * H, null), T0)), "bloqué avant le 1er passage");
        assertFalse(s.changeraitLaTrace(s.apercuInitial(entree(T0, null), T0)));
        s.passer(entree(T0, null), 0, T0);
        assertFalse(s.changeraitLaTrace(s.apercu(entree(T0 + 10_000, null), 10_000 * NS)), "rien de neuf");
        DecisionHorloge.Resultat recul = s.apercu(entree(T0 + 10_000 - 2 * H, null), 10_000 * NS);
        assertTrue(s.changeraitLaTrace(recul), "apparition vue entre deux passages");
        assertEquals(List.of(Evenement.APPARITION),
                s.passer(entree(T0 + 11_000 - 2 * H, null), 11_000 * NS, null).evenements);
        assertFalse(s.changeraitLaTrace(s.apercu(entree(T0 + 12_000 - 2 * H, null), 12_000 * NS)), "déjà tracée");
        assertTrue(s.changeraitLaTrace(s.apercu(entree(T0 + 13_000 + 2 * H, null), 13_000 * NS)), "cause changée");
        assertFalse(s.changeraitLaTrace(s.apercu(entree(T0 + 14_000 - 2 * H, null), 14_000 * NS)), "même cause");
        assertTrue(s.changeraitLaTrace(s.apercu(entree(T0 + 15_000, null), 15_000 * NS)),
                "levée vue entre deux passages");
    }

    @Test
    void lApercuAvantLePremierPassageUtiliseLEstimationStockee() {
        SuiviHorloge s = new SuiviHorloge();
        assertTrue(s.apercuInitial(entree(T0 - 2 * H, null), T0).bloque);
        assertFalse(s.apercuInitial(entree(T0 + 3 * J, null), T0).bloque);
    }

    @Test
    void regularisationExpireeSignaleeUneFois() {
        SuiviHorloge s = new SuiviHorloge();
        DecisionHorloge.Entree e = entree(T0 - 2 * J, null);
        e.regularisation = 1;
        e.regularisationOuvertureMs = T0 - 25 * H;
        Passage p = s.passer(e, 0, T0);
        assertTrue(p.evenements.contains(Evenement.REGULARISATION_EXPIREE));
        assertTrue(p.evenements.contains(Evenement.APPARITION));
    }

    /**
     * 10 000 minutes de fonctionnement sans Internet, l'horloge murale déréglée au hasard : l'heure réelle suivie est
     * toujours exactement le départ plus le temps écoulé, et les événements alternent sans jamais se répéter.
     */
    @Test
    void longFonctionnementAvecHorlogeDereglee() {
        Random r = new Random(20261124L);
        SuiviHorloge s = new SuiviHorloge();
        s.passer(entree(T0, null), 0, T0);
        boolean bloque = false;
        long derive = 0;
        int apparitions = 0, levees = 0;
        for (int m = 1; m <= 10_000; m++) {
            int tirage = r.nextInt(100);
            if (tirage < 3) {
                derive = (r.nextInt(2001) - 1000) * MIN; // l'horloge murale est changée
            } else if (tirage < 8) {
                derive = 0; // remise à l'heure
            } else if (tirage < 10) {
                derive = (r.nextInt(61) - 30) * 1000L; // petite dérive
            }
            long nanos = m * 60_000L * NS + r.nextInt(1000) * 1000L;
            Passage p = s.passer(entree(T0 + m * MIN + derive, null), nanos, null);
            assertEquals(Long.valueOf(T0 + nanos / NS), p.estimationMs, "minute " + m);
            assertEquals(Math.abs(derive) > 30 * MIN, p.resultat.bloque, "minute " + m + " dérive " + derive);
            if (p.resultat.bloque && !bloque) {
                assertEquals(List.of(Evenement.APPARITION), p.evenements, "minute " + m);
                apparitions++;
            } else if (!p.resultat.bloque && bloque) {
                assertEquals(List.of(Evenement.LEVEE), p.evenements, "minute " + m);
                levees++;
            } else {
                assertFalse(p.evenements.contains(Evenement.APPARITION) || p.evenements.contains(Evenement.LEVEE),
                        "minute " + m);
            }
            bloque = p.resultat.bloque;
        }
        assertTrue(apparitions > 50 && levees > 50, apparitions + " / " + levees);
    }

    @Test
    void lesParametresSontBornes() {
        DecisionHorloge.Entree e = entree(T0, null);
        int[][] cas = { // saisi, attendu : seuils (1..120, défaut 30)
                { 0, 30 }, { -4, 30 }, { 1, 1 }, { 30, 30 }, { 120, 120 }, { 121, 120 }, { 100000, 120 } };
        for (int[] c : cas) {
            assertEquals(c[1], SuiviHorloge.bornerSeuil(c[0]), "seuil " + c[0]);
        }
        int[][] durees = { { 0, 24 }, { -1, 24 }, { 1, 1 }, { 24, 24 }, { 25, 24 }, { 999, 24 } };
        for (int[] c : durees) {
            assertEquals(c[1], SuiviHorloge.bornerDureeH(c[0]), "durée " + c[0]);
        }
        int[][] reculs = { { 0, 7 }, { -1, 7 }, { 1, 1 }, { 7, 7 }, { 8, 7 }, { 365, 7 } };
        for (int[] c : reculs) {
            assertEquals(c[1], SuiviHorloge.bornerReculJours(c[0]), "recul " + c[0]);
        }
        assertEquals(30, e.seuilEcartMin);
    }
}
