package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.Random;

import org.junit.jupiter.api.Test;

/**
 * Retour du 15/11 (suivi des bons lent) : la periode des ventes a tiers payant n'est plus ecrite DATE(dt) BETWEEN debut
 * AND fin, mais dt >= debut 0 h AND dt < lendemain de fin 0 h. Regle verifiee sur des milliers de dates de vente et de
 * periodes tirees au hasard (graine fixe) : les deux ecritures retiennent exactement les memes ventes, y compris a
 * minuit, a 23:59:59.999, le jour meme, un jour sur deux mois ou deux annees, un 29 fevrier et une periode vide (fin
 * avant debut).
 */
class BornesJoursCoherenceTest {

    private static final long GRAINE = 20261115L;

    private static boolean ancienne(LocalDateTime vente, LocalDate debut, LocalDate fin) {
        LocalDate jour = vente.toLocalDate();
        return !jour.isBefore(debut) && !jour.isAfter(fin);
    }

    private static boolean nouvelle(LocalDateTime vente, LocalDate debut, LocalDate fin) {
        Date[] b = ClientServiceImpl.bornesJours(debut.toString(), fin.toString());
        Date v = java.sql.Timestamp.valueOf(vente);
        return !v.before(b[0]) && v.before(b[1]);
    }

    @Test
    void memesVentesQueDateBetween() {
        Random r = new Random(GRAINE);
        LocalDate origine = LocalDate.of(2023, 12, 1);
        int retenues = 0, ecartees = 0;
        for (int i = 0; i < 20000; i++) {
            LocalDate debut = origine.plusDays(r.nextInt(1100));
            int duree = r.nextInt(10) == 0 ? -1 - r.nextInt(3) : r.nextInt(5) == 0 ? 0 : r.nextInt(400);
            LocalDate fin = debut.plusDays(duree);
            /* vente autour de la periode, souvent sur une borne */
            LocalDate jour = debut.plusDays(r.nextInt(Math.max(1, duree + 3)) - 1);
            LocalDateTime vente;
            switch (r.nextInt(5)) {
            case 0:
                vente = jour.atStartOfDay();
                break;
            case 1:
                vente = jour.atTime(23, 59, 59, 999_000_000);
                break;
            case 2:
                vente = (r.nextBoolean() ? fin.plusDays(1) : debut).atStartOfDay();
                break;
            default:
                vente = jour.atStartOfDay().plusSeconds(r.nextInt(86400));
            }
            boolean a = ancienne(vente, debut, fin);
            assertEquals(a, nouvelle(vente, debut, fin), vente + " dans " + debut + " .. " + fin);
            if (a) {
                retenues++;
            } else {
                ecartees++;
            }
        }
        assertTrue(retenues > 4000 && ecartees > 4000, retenues + " / " + ecartees);
    }

    @Test
    void bornesDUnJourEtDUnFevrierBissextile() {
        Date[] b = ClientServiceImpl.bornesJours("2024-02-28", "2024-02-29");
        assertEquals(java.sql.Timestamp.valueOf("2024-02-28 00:00:00"), b[0]);
        assertEquals(java.sql.Timestamp.valueOf("2024-03-01 00:00:00"), b[1]);
        Date[] j = ClientServiceImpl.bornesJours("2026-12-31", "2026-12-31");
        assertEquals(java.sql.Timestamp.valueOf("2027-01-01 00:00:00"), j[1]);
    }
}
