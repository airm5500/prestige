package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Random;

import org.junit.jupiter.api.Test;

/**
 * Coherence de la periode de l'etat de controle des achats (journal du support du 03/11) : liste, nombre, impression et
 * export lisent la meme periode.
 *
 * <p>
 * Regles verifiees sur des milliers de cas tires au hasard (graine fixe) :
 * <ul>
 * <li>une date vide, blanche ou absente vaut la date du jour ; une date saisie, entouree ou non d'espaces, vaut
 * elle-meme ;</li>
 * <li>les bornes vont du debut du premier jour (inclus) au debut du lendemain du dernier (exclu) : exactement (fin -
 * debut + 1) jours, aucun instant du dernier jour perdu, aucun du lendemain pris ;</li>
 * <li>la periode imprimee en tete de l'etat est celle des bornes, jamais une date vide.</li>
 * </ul>
 */
class EtatControlBonPeriodeCoherenceTest {

    private static final long GRAINE = 20261105L;
    private static final int CAS = 5000;
    private static final String[] VIDES = { null, "", " ", "  ", "\t", " \n", "\r\n " };
    private static final String[] ENTOURAGES = { "", " ", "  ", "\t", "\n" };

    private static LocalDate auHasard(Random r) {
        return LocalDate.of(2015, 1, 1).plusDays(r.nextInt(365 * 20));
    }

    private static String saisie(Random r, LocalDate d) {
        return ENTOURAGES[r.nextInt(ENTOURAGES.length)] + d + ENTOURAGES[r.nextInt(ENTOURAGES.length)];
    }

    @Test
    void uneDateVideVautLeJourEtUneDateSaisieVautElleMeme() {
        Random r = new Random(GRAINE);
        for (int i = 0; i < CAS; i++) {
            String vide = VIDES[r.nextInt(VIDES.length)];
            assertEquals(LocalDate.now(), EtatControlBonServiceImpl.jour(vide), "cas " + i + " : [" + vide + "]");
            LocalDate d = auHasard(r);
            String s = saisie(r, d);
            assertEquals(d, EtatControlBonServiceImpl.jour(s), "cas " + i + " : [" + s + "]");
        }
    }

    @Test
    void lesBornesCouvrentExactementLesJoursDeLaPeriode() {
        Random r = new Random(GRAINE + 1);
        for (int i = 0; i < CAS; i++) {
            LocalDate debut = auHasard(r);
            // debut = fin, periode courte, periode longue
            LocalDate fin = debut.plusDays(i % 3 == 0 ? 0 : r.nextInt(i % 3 == 1 ? 31 : 3 * 365));
            Date[] b = EtatControlBonServiceImpl.bornes(debut, fin);
            LocalDateTime de = ((Timestamp) b[0]).toLocalDateTime();
            LocalDateTime a = ((Timestamp) b[1]).toLocalDateTime();
            String cas = "cas " + i + " : " + debut + " .. " + fin;

            assertEquals(debut.atStartOfDay(), de, cas);
            assertEquals(ChronoUnit.DAYS.between(debut, fin) + 1, ChronoUnit.DAYS.between(de, a), cas);
            assertTrue(de.isBefore(a), cas);

            LocalDateTime dernierInstant = fin.atTime(23, 59, 59, 999_000_000);
            assertTrue(!dernierInstant.isBefore(de) && dernierInstant.isBefore(a), cas + " : dernier instant perdu");
            assertFalse(fin.plusDays(1).atStartOfDay().isBefore(a), cas + " : lendemain pris");
            assertTrue(debut.atStartOfDay().minusNanos(1_000_000).isBefore(de), cas + " : veille prise");
            LocalDateTime auMilieu = debut.atStartOfDay()
                    .plusMinutes(r.nextInt((int) ChronoUnit.MINUTES.between(de, a)));
            assertTrue(!auMilieu.isBefore(de) && auMilieu.isBefore(a), cas + " : " + auMilieu + " perdu");
        }
    }

    @Test
    void laPeriodeImprimeeEstCelleDeLaListe() {
        Random r = new Random(GRAINE + 2);
        for (int i = 0; i < CAS; i++) {
            // les quatre combinaisons : deux dates, debut vide, fin vide, deux vides
            String debut = (i & 1) == 0 ? saisie(r, auHasard(r)) : VIDES[r.nextInt(VIDES.length)];
            String fin = (i & 2) == 0 ? saisie(r, auHasard(r)) : VIDES[r.nextInt(VIDES.length)];
            String periode = EtatControlBonServiceImpl.periode(debut, fin);
            String cas = "cas " + i + " : [" + debut + "] [" + fin + "]";
            assertEquals("Période du " + EtatControlBonServiceImpl.jour(debut) + " au "
                    + EtatControlBonServiceImpl.jour(fin), periode, cas);
            assertTrue(periode.matches("Période du \\d{4}-\\d{2}-\\d{2} au \\d{4}-\\d{2}-\\d{2}"),
                    cas + " : " + periode);
        }
    }
}
