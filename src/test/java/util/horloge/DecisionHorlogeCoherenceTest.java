package util.horloge;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.EnumSet;
import java.util.Random;
import org.junit.jupiter.api.Test;
import util.horloge.DecisionHorloge.Cause;
import util.horloge.DecisionHorloge.Entree;
import util.horloge.DecisionHorloge.Resultat;

/**
 * Cahier des charges du 24/11, point 1 : décision de blocage de l'application sur la date et l'heure du serveur.
 * <p>
 * Constat du 24/11 : 28 opérations de caisse datées de 2174 à 2189 (horloge partie dans le futur au démarrage, pile de
 * la carte mère). Règles : blocage si l'écart avec Internet dépasse le seuil (30 min par défaut), si l'horloge recule
 * au-delà du seuil (30 min) par rapport à l'heure réelle estimée par le serveur, ou si elle saute dans le futur ;
 * régularisation à date passée bornée (paramètre à 0 par défaut, 24 h, 7 jours) ; aucun faux blocage (Internet coupé,
 * redémarrage, première installation, fuseau, base restaurée).
 * <p>
 * Tests de cohérence : des milliers de cas tirés avec une graine fixe, vérifiés par leurs règles, puis les cas du
 * terrain.
 */
class DecisionHorlogeCoherenceTest {

    private static final long GRAINE = 20261124L;
    private static final int CAS = 20000;
    private static final long MIN = 60_000L, H = 60 * MIN, J = 24 * H;
    /** 24/11/2026 10:00 UTC */
    private static final long T0 = LocalDateTime.of(2026, 11, 24, 10, 0).toInstant(ZoneOffset.UTC).toEpochMilli();
    private static final long PLAFOND = LocalDateTime.of(2029, 1, 1, 0, 0).toInstant(ZoneOffset.UTC).toEpochMilli();

    private static Entree base() {
        Entree e = new Entree();
        e.maintenantMs = T0;
        e.estimationMs = T0;
        e.ecartInternetMs = null;
        e.demarrage = false;
        e.plafondMs = PLAFOND;
        e.seuilEcartMin = 30;
        e.seuilReculMin = 30;
        e.regularisation = 0;
        e.regularisationOuvertureMs = null;
        e.regularisationDureeH = 24;
        e.regularisationReculMaxJours = 7;
        return e;
    }

    private static Entree copie(Entree s) {
        Entree e = new Entree();
        e.maintenantMs = s.maintenantMs;
        e.estimationMs = s.estimationMs;
        e.ecartInternetMs = s.ecartInternetMs;
        e.demarrage = s.demarrage;
        e.plafondMs = s.plafondMs;
        e.seuilEcartMin = s.seuilEcartMin;
        e.seuilReculMin = s.seuilReculMin;
        e.regularisation = s.regularisation;
        e.regularisationOuvertureMs = s.regularisationOuvertureMs;
        e.regularisationDureeH = s.regularisationDureeH;
        e.regularisationReculMaxJours = s.regularisationReculMaxJours;
        return e;
    }

    private static String decrire(Entree e) {
        return "maintenant=" + e.maintenantMs + " estimation=" + e.estimationMs + " ecart=" + e.ecartInternetMs
                + " demarrage=" + e.demarrage + " seuils=" + e.seuilEcartMin + "/" + e.seuilReculMin + " regul="
                + e.regularisation + " ouverture=" + e.regularisationOuvertureMs + " duree=" + e.regularisationDureeH
                + " reculMax=" + e.regularisationReculMaxJours;
    }

    /** Écart tiré parmi des valeurs proches des seuils et des valeurs extrêmes. */
    private static long ecartTire(Random r) {
        switch (r.nextInt(6)) {
        case 0:
            return (r.nextInt(121) - 60) * MIN; // ± 1 h, autour du seuil de 30 min
        case 1:
            return (r.nextInt(61) - 30) * MIN + (r.nextInt(3) - 1) * 1000L; // au seuil près d'une seconde
        case 2:
            return r.nextInt(10 * 24) * H; // serveur en retard jusqu'à 10 jours (régularisation)
        case 3:
            return (long) (r.nextDouble() * 170 * 365) * J; // saut jusqu'à 2189
        case 4:
            return 0;
        default:
            return (r.nextInt(2001) - 1000) * 1000L; // ± 17 min : toujours juste
        }
    }

    private static Entree tirer(Random r) {
        Entree e = base();
        e.maintenantMs = T0 + (r.nextInt(2) == 0 ? 0 : ecartTire(r));
        e.estimationMs = r.nextInt(15) == 0 ? null : e.maintenantMs - ecartTire(r);
        e.ecartInternetMs = r.nextInt(3) == 0 ? null : ecartTire(r);
        e.demarrage = r.nextInt(4) == 0;
        int[] seuils = { 0, -5, 1, 5, 30, 30, 30, 60, 120 };
        e.seuilEcartMin = seuils[r.nextInt(seuils.length)];
        e.seuilReculMin = seuils[r.nextInt(seuils.length)];
        e.regularisation = new int[] { 0, 0, 1, 1, 2, -1 }[r.nextInt(6)];
        e.regularisationOuvertureMs = r.nextInt(6) == 0 ? null
                : (e.estimationMs != null ? e.estimationMs : e.maintenantMs) - r.nextInt(30 * 60) * MIN;
        e.regularisationDureeH = new int[] { 0, 1, 24, 24, 48 }[r.nextInt(5)];
        e.regularisationReculMaxJours = new int[] { 0, 1, 7, 7, 30 }[r.nextInt(5)];
        return e;
    }

    private static long seuil(int min) {
        return (min > 0 ? min : 30) * MIN;
    }

    @Test
    void lesReglesTiennentPourDesMilliersDeCas() {
        Random r = new Random(GRAINE);
        int bloques = 0, regulations = 0, sansInternet = 0;
        for (int i = 0; i < CAS; i++) {
            Entree e = tirer(r);
            Resultat res = DecisionHorloge.decider(copie(e));
            String cas = "cas " + i + " : " + decrire(e) + " -> " + res.causes;
            assertNotNull(res.causes, cas);

            // bloqué si et seulement si au moins une cause, nommée
            assertEquals(!res.causes.isEmpty(), res.bloque, cas);
            if (res.bloque) {
                bloques++;
            }

            if (e.ecartInternetMs == null) {
                sansInternet++;
                // sans Internet, jamais de blocage sur l'écart
                assertFalse(res.causes.contains(Cause.ECART), cas);
            } else {
                // avec Internet, l'heure d'Internet fait foi : ni recul, ni saut, ni plafond mesurés sur l'estimation
                assertFalse(res.causes.contains(Cause.RECUL), cas);
                assertFalse(res.causes.contains(Cause.SAUT), cas);
                assertFalse(res.causes.contains(Cause.PLAFOND), cas);
                long ecart = e.ecartInternetMs;
                boolean horsSeuil = Math.abs(ecart) > seuil(e.seuilEcartMin);
                boolean couvert = res.regularisationEnCours && ecart > 0
                        && ecart <= (e.regularisationReculMaxJours > 0 ? e.regularisationReculMaxJours : 7) * J;
                assertEquals(horsSeuil && !couvert, res.causes.contains(Cause.ECART), cas);
                // la régularisation n'excuse jamais une avance du serveur (Internet en retard sur lui)
                if (-ecart > seuil(e.seuilEcartMin)) {
                    assertTrue(res.bloque, cas);
                }
                // l'estimation est corrigée par l'heure d'Internet
                assertEquals(Long.valueOf(e.maintenantMs + ecart), res.estimationRetenueMs, cas);
            }

            if (e.ecartInternetMs == null && e.estimationMs != null) {
                long recul = e.estimationMs - e.maintenantMs;
                // l'estimation de l'heure réelle ne recule jamais sans Internet : un recul ne peut pas être « blanchi »
                assertNotNull(res.estimationRetenueMs, cas);
                assertTrue(res.estimationRetenueMs >= e.estimationMs, cas);
                if (recul > seuil(e.seuilReculMin)) {
                    boolean couvert = res.regularisationEnCours
                            && recul <= (e.regularisationReculMaxJours > 0 ? e.regularisationReculMaxJours : 7) * J;
                    assertEquals(!couvert, res.causes.contains(Cause.RECUL), cas);
                } else {
                    assertFalse(res.causes.contains(Cause.RECUL), cas);
                }
                // saut dans le futur pendant le fonctionnement : bloqué, régularisation ou non
                boolean saut = !e.demarrage && -recul > seuil(e.seuilReculMin);
                assertEquals(saut, res.causes.contains(Cause.SAUT), cas);
            }

            if (e.ecartInternetMs == null) {
                assertEquals(e.maintenantMs > e.plafondMs, res.causes.contains(Cause.PLAFOND), cas);
            }

            // régularisation : en cours seulement si le paramètre vaut 1, ouverte, et le délai non écoulé
            if (e.regularisation != 1) {
                assertFalse(res.regularisationEnCours, cas);
                assertFalse(res.regularisationExpiree, cas);
            }
            assertFalse(res.regularisationEnCours && res.regularisationExpiree, cas);
            if (res.regularisationEnCours) {
                regulations++;
            }
        }
        // le tirage couvre bien tous les cas
        assertTrue(bloques > CAS / 10 && bloques < CAS * 9 / 10, "bloqués : " + bloques);
        assertTrue(regulations > CAS / 50, "régularisations : " + regulations);
        assertTrue(sansInternet > CAS / 5, "sans Internet : " + sansInternet);
    }

    @Test
    void leParametreARegularisationA0IgnoreSesBornes() {
        Random r = new Random(GRAINE + 1);
        for (int i = 0; i < CAS / 4; i++) {
            Entree e = tirer(r);
            e.regularisation = 0;
            Resultat a = DecisionHorloge.decider(copie(e));
            Entree f = copie(e);
            f.regularisationOuvertureMs = e.maintenantMs;
            f.regularisationDureeH = 1 + r.nextInt(100);
            f.regularisationReculMaxJours = 1 + r.nextInt(100);
            Resultat b = DecisionHorloge.decider(f);
            assertEquals(a.causes, b.causes, decrire(e));
            assertEquals(a.estimationRetenueMs, b.estimationRetenueMs, decrire(e));
        }
    }

    @Test
    void uneRegularisationExpireeVautUnParametreA0() {
        Random r = new Random(GRAINE + 2);
        int expirees = 0;
        for (int i = 0; i < CAS / 4; i++) {
            Entree e = tirer(r);
            e.regularisation = 1;
            Resultat res = DecisionHorloge.decider(copie(e));
            Entree zero = copie(e);
            zero.regularisation = 0;
            Resultat ref = DecisionHorloge.decider(zero);
            if (res.regularisationExpiree) {
                expirees++;
                assertEquals(ref.causes, res.causes, decrire(e));
            }
            // une régularisation en cours ne fait que lever des causes, jamais en ajouter
            assertTrue(ref.causes.containsAll(res.causes), decrire(e));
        }
        assertTrue(expirees > 100, "expirées : " + expirees);
    }

    @Test
    void plusLEcartEstGrandPlusOnBloque() {
        Random r = new Random(GRAINE + 3);
        for (int i = 0; i < CAS / 4; i++) {
            Entree e = tirer(r);
            e.regularisation = 0;
            e.demarrage = false;
            if (e.ecartInternetMs != null && DecisionHorloge.decider(copie(e)).bloque) {
                Entree f = copie(e);
                f.ecartInternetMs = e.ecartInternetMs + Long.signum(e.ecartInternetMs) * (1 + r.nextInt(1000)) * MIN;
                assertTrue(DecisionHorloge.decider(f).bloque, decrire(f));
            }
            if (e.ecartInternetMs == null && e.estimationMs != null && e.maintenantMs <= PLAFOND
                    && DecisionHorloge.decider(copie(e)).bloque) {
                Entree f = copie(e);
                long d = e.estimationMs - e.maintenantMs;
                f.maintenantMs = e.maintenantMs - Long.signum(d) * (1 + r.nextInt(1000)) * MIN;
                if (f.maintenantMs <= PLAFOND) {
                    assertTrue(DecisionHorloge.decider(f).bloque, decrire(f));
                }
            }
        }
    }

    @Test
    void desSeuilsA0OuNegatifsValentLeDefautDe30Minutes() {
        Random r = new Random(GRAINE + 4);
        for (int i = 0; i < CAS / 4; i++) {
            Entree e = tirer(r);
            Entree trente = copie(e);
            trente.seuilEcartMin = 30;
            trente.seuilReculMin = 30;
            Entree zero = copie(e);
            zero.seuilEcartMin = r.nextBoolean() ? 0 : -1;
            zero.seuilReculMin = r.nextBoolean() ? 0 : -7;
            assertEquals(DecisionHorloge.decider(trente).causes, DecisionHorloge.decider(zero).causes, decrire(e));
        }
    }

    // ---------------------------------------------------------------- cas du terrain

    private static long an(int annee) {
        return LocalDateTime.of(annee, 1, 1, 8, 15).toInstant(ZoneOffset.UTC).toEpochMilli();
    }

    @Test
    void horlogeEn2189AuDemarrageSansInternetBloque() {
        Entree e = base();
        e.demarrage = true;
        e.maintenantMs = an(2189);
        Resultat r = DecisionHorloge.decider(e);
        assertTrue(r.bloque);
        assertEquals(EnumSet.of(Cause.PLAFOND), r.causes);
        // l'heure fausse n'est pas retenue : une fois l'heure remise, aucun faux « recul »
        assertEquals(Long.valueOf(T0), r.estimationRetenueMs);
        Entree remise = base();
        remise.maintenantMs = T0 + 5 * MIN;
        remise.estimationMs = r.estimationRetenueMs + 5 * MIN;
        assertFalse(DecisionHorloge.decider(remise).bloque);
    }

    @Test
    void horlogeEn2174PremiereInstallationSansInternetBloque() {
        Entree e = base();
        e.demarrage = true;
        e.estimationMs = null;
        e.maintenantMs = an(2174);
        Resultat r = DecisionHorloge.decider(e);
        assertEquals(EnumSet.of(Cause.PLAFOND), r.causes);
        assertEquals(null, r.estimationRetenueMs);
    }

    @Test
    void horlogeEn2189AvecInternetBloqueSurLEcart() {
        Entree e = base();
        e.demarrage = true;
        e.maintenantMs = an(2189);
        e.ecartInternetMs = T0 - an(2189);
        Resultat r = DecisionHorloge.decider(e);
        assertEquals(EnumSet.of(Cause.ECART), r.causes);
        assertEquals(Long.valueOf(T0), r.estimationRetenueMs);
    }

    @Test
    void sautDansLeFuturPendantLeFonctionnementBloque() {
        Entree e = base();
        e.maintenantMs = T0 + 31 * MIN;
        assertEquals(EnumSet.of(Cause.SAUT), DecisionHorloge.decider(e).causes);
        e.maintenantMs = T0 + 29 * MIN;
        assertFalse(DecisionHorloge.decider(e).bloque);
    }

    @Test
    void reculDeTrenteEtUneMinutesBloqueTrenteNon() {
        Entree e = base();
        e.maintenantMs = T0 - 31 * MIN;
        assertEquals(EnumSet.of(Cause.RECUL), DecisionHorloge.decider(e).causes);
        e.maintenantMs = T0 - 30 * MIN;
        assertFalse(DecisionHorloge.decider(e).bloque);
    }

    @Test
    void redemarrageApresUnLongWeekEndSansInternetNeBloquePas() {
        Entree e = base();
        e.demarrage = true;
        e.maintenantMs = T0 + 3 * J;
        Resultat r = DecisionHorloge.decider(e);
        assertFalse(r.bloque, String.valueOf(r.causes));
        assertEquals(Long.valueOf(T0 + 3 * J), r.estimationRetenueMs);
    }

    @Test
    void premiereInstallationSansInternetNeBloquePas() {
        Entree e = base();
        e.demarrage = true;
        e.estimationMs = null;
        Resultat r = DecisionHorloge.decider(e);
        assertFalse(r.bloque);
        assertEquals(Long.valueOf(T0), r.estimationRetenueMs);
    }

    @Test
    void baseRestaureeDUneVieilleSauvegardeNeBloquePas() {
        Entree e = base();
        e.demarrage = true;
        e.estimationMs = T0 - 400 * J;
        assertFalse(DecisionHorloge.decider(e).bloque);
    }

    @Test
    void internetCoupeEtHeureJusteNeBloquePas() {
        Entree e = base();
        e.maintenantMs = T0 + 2 * MIN;
        assertFalse(DecisionHorloge.decider(e).bloque);
    }

    @Test
    void ecartAvecInternetAuSeuil() {
        Entree e = base();
        e.ecartInternetMs = 30 * MIN;
        assertFalse(DecisionHorloge.decider(e).bloque);
        e.ecartInternetMs = 30 * MIN + 1000;
        assertEquals(EnumSet.of(Cause.ECART), DecisionHorloge.decider(e).causes);
        e.ecartInternetMs = -(30 * MIN + 1000);
        assertEquals(EnumSet.of(Cause.ECART), DecisionHorloge.decider(e).causes);
        e.seuilEcartMin = 60;
        assertFalse(DecisionHorloge.decider(e).bloque);
    }

    @Test
    void regularisationDeTroisJoursOuverteIlYAUneHeure() {
        Entree e = base();
        e.regularisation = 1;
        e.regularisationOuvertureMs = T0 - H;
        e.maintenantMs = T0 - 3 * J;
        Resultat r = DecisionHorloge.decider(e);
        assertTrue(r.regularisationEnCours);
        assertFalse(r.bloque, String.valueOf(r.causes));
        // la même chose avec Internet : l'écart est couvert
        e.ecartInternetMs = 3 * J;
        r = DecisionHorloge.decider(e);
        assertFalse(r.bloque, String.valueOf(r.causes));
        assertEquals(Long.valueOf(T0), r.estimationRetenueMs);
    }

    @Test
    void regularisationAuDelaDeSeptJoursBloque() {
        Entree e = base();
        e.regularisation = 1;
        e.regularisationOuvertureMs = T0 - H;
        e.maintenantMs = T0 - 8 * J;
        Resultat r = DecisionHorloge.decider(e);
        assertTrue(r.regularisationEnCours);
        assertEquals(EnumSet.of(Cause.RECUL), r.causes);
    }

    @Test
    void regularisationExpireeApres24hBloqueEtSeReferme() {
        Entree e = base();
        e.regularisation = 1;
        e.regularisationOuvertureMs = T0 - 24 * H;
        e.maintenantMs = T0 - 3 * J;
        Resultat r = DecisionHorloge.decider(e);
        assertTrue(r.regularisationExpiree);
        assertFalse(r.regularisationEnCours);
        assertEquals(EnumSet.of(Cause.RECUL), r.causes);
        // le délai se compte en heure réelle, pas avec l'horloge reculée
        e.regularisationOuvertureMs = T0 - 23 * H;
        assertTrue(DecisionHorloge.decider(e).regularisationEnCours);
    }

    @Test
    void regularisationSansDateDOuvertureNEstPasOuverte() {
        Entree e = base();
        e.regularisation = 1;
        e.maintenantMs = T0 - 3 * J;
        Resultat r = DecisionHorloge.decider(e);
        assertFalse(r.regularisationEnCours);
        assertTrue(r.bloque);
    }

    @Test
    void regularisationNExcuseJamaisUneAvance() {
        Entree e = base();
        e.regularisation = 1;
        e.regularisationOuvertureMs = T0 - H;
        e.maintenantMs = T0 + 2 * J;
        assertEquals(EnumSet.of(Cause.SAUT), DecisionHorloge.decider(e).causes);
        e.ecartInternetMs = -2 * J;
        assertEquals(EnumSet.of(Cause.ECART), DecisionHorloge.decider(e).causes);
    }

    @Test
    void laDecisionNeDependQueDesInstantsPasDuFuseau() {
        java.util.TimeZone avant = java.util.TimeZone.getDefault();
        try {
            Entree e = base();
            e.maintenantMs = T0 - 31 * MIN;
            java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("Asia/Tokyo"));
            Resultat tokyo = DecisionHorloge.decider(copie(e));
            java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("Africa/Abidjan"));
            assertEquals(DecisionHorloge.decider(copie(e)).causes, tokyo.causes);
        } finally {
            java.util.TimeZone.setDefault(avant);
        }
    }
}
