package job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Random;
import javax.ejb.Schedule;
import org.junit.jupiter.api.Test;

/**
 * Journaux de Pontmain et de leana (18/11) : serveur eteint chaque nuit, purge de 03:45 et veille de 04:15 jamais
 * faites a leur heure. Le rattrapage au demarrage n'agissait qu'apres 30 h sans passage : le 18/11 a 07:35, le dernier
 * passage (17/11 04:15) n'avait que 27 h, rien n'etait rattrape, et le moniteur signalait le retard toutes les heures
 * de 10:10 a 23:10. Regle attendue : un job quotidien est rattrape des que son heure du jour est passee sans qu'il ait
 * tourne depuis.
 */
class RattrapageQuotidienTest {

    private static final long TRENTE_HEURES = 1800;
    private static final long VINGT_QUATRE_HEURES = 24 * 60;

    private static LocalDateTime t(String s) {
        return LocalDateTime.parse(s);
    }

    @Test
    void pontmainLe18AuDemarrageLaVeilleEtLaPurgeSontRattrapees() {
        LocalDateTime demarrage = t("2026-11-18T07:35:00");
        assertTrue(SupportNightlyCatchUp.rattrapageDu("COHERENCE_SUPPORT", t("2026-11-17T04:15:00"), demarrage,
                TRENTE_HEURES));
        assertTrue(SupportNightlyCatchUp.rattrapageDu("PURGE_SUPPORT", t("2026-11-17T03:45:00"), demarrage,
                TRENTE_HEURES));
    }

    @Test
    void rattrapageDeLaVeilleALaMemeHeureEstRefaitLeLendemain() {
        // passe en rattrapage hier a 07:35 : aujourd'hui a 07:35, 24 h pile, toujours en dessous de 30 h
        assertTrue(SupportNightlyCatchUp.rattrapageDu("COHERENCE_SUPPORT", t("2026-11-17T07:35:00"),
                t("2026-11-18T07:35:00"), TRENTE_HEURES));
        // ventes en attente de 00:10 : 23 h 58 apres le rattrapage d'hier, la journee n'est pas expiree
        assertTrue(SupportNightlyCatchUp.rattrapageDu(VenteAttenteExpiration.CODE_JOB, t("2026-11-17T07:37:00"),
                t("2026-11-18T07:35:00"), VINGT_QUATRE_HEURES));
    }

    @Test
    void dejaPasseAujourdhuiRienARattraper() {
        // job de 04:15 passe a son heure, serveur redemarre a 10:00
        assertFalse(SupportNightlyCatchUp.rattrapageDu("COHERENCE_SUPPORT", t("2026-11-18T04:15:00"),
                t("2026-11-18T10:00:00"), TRENTE_HEURES));
        // rattrape ce matin a 07:35, redemarrage a 14:00
        assertFalse(SupportNightlyCatchUp.rattrapageDu("PURGE_SUPPORT", t("2026-11-18T07:35:00"),
                t("2026-11-18T14:00:00"), TRENTE_HEURES));
    }

    @Test
    void demarrageJusteAvantLHeurePrevueLaisseFaireLeJobPlanifie() {
        // serveur allume a 04:10 : le job de 04:15 va tourner, le rattrapage de 04:15 ne doit pas le doubler
        assertFalse(SupportNightlyCatchUp.rattrapageDu("COHERENCE_SUPPORT", t("2026-11-17T04:15:00"),
                t("2026-11-18T04:15:00"), TRENTE_HEURES));
        assertFalse(SupportNightlyCatchUp.rattrapageDu("COHERENCE_SUPPORT", t("2026-11-17T04:15:00"),
                t("2026-11-18T05:10:00"), TRENTE_HEURES));
    }

    @Test
    void jamaisPasseOuTropVieuxToujoursRattrape() {
        assertTrue(
                SupportNightlyCatchUp.rattrapageDu("COHERENCE_SUPPORT", null, t("2026-11-18T07:35:00"), TRENTE_HEURES));
        assertTrue(SupportNightlyCatchUp.rattrapageDu("COHERENCE_SUPPORT", t("2026-11-10T04:15:00"),
                t("2026-11-18T07:35:00"), TRENTE_HEURES));
    }

    @Test
    void jobsMensuelsGardentLeurDelai() {
        // purge du releve (le 2 a 02:30, tolerance 45 jours) : pas rejouee chaque jour
        assertFalse(SupportNightlyCatchUp.rattrapageDu("PURGE_VALORISATION", t("2026-11-02T02:30:00"),
                t("2026-11-18T07:35:00"), 45L * 24 * 60));
        assertFalse(SupportNightlyCatchUp.rattrapageDu("VALORISATION_PDF", t("2026-11-01T01:20:00"),
                t("2026-11-18T07:35:00"), 50400));
    }

    /** L'heure retenue pour chaque job quotidien est celle de son @Schedule : pas de copie qui diverge. */
    @Test
    void heuresDuRattrapageIdentiquesAuxSchedule() throws Exception {
        assertEquals(heureDu(SupportPurgeScheduler.class), SupportNightlyCatchUp.heureQuotidienne("PURGE_SUPPORT"));
        assertEquals(heureDu(SupportCoherenceScheduler.class),
                SupportNightlyCatchUp.heureQuotidienne("COHERENCE_SUPPORT"));
        assertEquals(heureDu(VenteAttenteExpiration.class),
                SupportNightlyCatchUp.heureQuotidienne(VenteAttenteExpiration.CODE_JOB));
    }

    private static LocalTime heureDu(Class<?> c) {
        for (Method m : c.getDeclaredMethods()) {
            Schedule s = m.getAnnotation(Schedule.class);
            if (s != null) {
                return LocalTime.of(Integer.parseInt(s.hour()), Integer.parseInt(s.minute()));
            }
        }
        return null;
    }

    /**
     * Coherence sur 20 000 cas tires au hasard (graine fixe) : le rattrapage est du si et seulement si aucun passage
     * n'a eu lieu depuis la derniere echeance franchie (heure du jour + 1 h de marge), ou si l'ancienne regle des 30 h
     * le demande ; jamais deux rattrapages pour la meme echeance ; un passage simule apres chaque rattrapage le rend
     * inutile jusqu'a l'echeance suivante.
     */
    @Test
    void coherenceSurVingtMilleCas() {
        Random r = new Random(20261120L);
        String[] codes = { "PURGE_SUPPORT", "COHERENCE_SUPPORT", VenteAttenteExpiration.CODE_JOB };
        LocalDateTime base = t("2026-01-01T00:00:00");
        for (int i = 0; i < 20000; i++) {
            String code = codes[r.nextInt(codes.length)];
            LocalTime heure = SupportNightlyCatchUp.heureQuotidienne(code);
            assertNotNull(heure, code);
            long age = code.equals(VenteAttenteExpiration.CODE_JOB) ? VINGT_QUATRE_HEURES : TRENTE_HEURES;
            LocalDateTime now = base.plusMinutes(r.nextInt(300 * 24 * 60));
            LocalDateTime dernier = r.nextInt(20) == 0 ? null : now.minusMinutes(r.nextInt(4 * 24 * 60));
            LocalDateTime echeance = now.toLocalDate().atTime(heure);
            if (now.isBefore(echeance.plusHours(1))) {
                echeance = echeance.minusDays(1);
            }
            boolean attendu = dernier == null || dernier.isBefore(echeance)
                    || java.time.temporal.ChronoUnit.MINUTES.between(dernier, now) > age;
            boolean du = SupportNightlyCatchUp.rattrapageDu(code, dernier, now, age);
            assertEquals(attendu, du, code + " dernier=" + dernier + " now=" + now);
            if (du) {
                // le rattrapage enregistre son passage : relance quelques minutes plus tard, plus rien a faire
                assertFalse(SupportNightlyCatchUp.rattrapageDu(code, now, now.plusMinutes(1 + r.nextInt(60)), age),
                        code + " rattrape deux fois a " + now);
            }
        }
    }
}
