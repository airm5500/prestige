package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;

import util.PeriodesCa.Granularite;
import util.PeriodesCa.Tranche;
import util.PeriodesCa.Type;

public class PeriodesCaTest {

    /** Mercredi 2 septembre 2026 (semaine ISO 36). */
    private static final LocalDate AUJOURDHUI = LocalDate.of(2026, 9, 2);

    /*
     * « 3 dernieres X » designe les trois X REVOLUS, et la periode en cours est rappelee EN PLUS, marquee comme telle.
     * On attend donc quatre tranches, pas trois.
     *
     * L'erreur que ces tests empechent est celle qui ne se voit pas : compter la periode en cours comme une periode
     * complete. Le mois entame passerait alors pour un mois entier, et l'officine lirait un effondrement du chiffre
     * d'affaires le 2 du mois -- un chiffre faux, mais parfaitement plausible.
     */

    @Test
    public void troisSemainesRevoluesPlusLaSemaineEnCours() {
        List<Tranche> t = PeriodesCa.tranches(Type.TROIS_SEMAINES, null, null, AUJOURDHUI);

        assertEquals(4, t.size(), "trois semaines completes, plus celle en cours");
        assertEquals(LocalDate.of(2026, 8, 10), t.get(0).getDebut());
        assertEquals(LocalDate.of(2026, 8, 16), t.get(0).getFin());
        assertEquals("2026-W33", t.get(0).getCle());
        assertEquals(LocalDate.of(2026, 8, 24), t.get(2).getDebut());
        assertEquals(LocalDate.of(2026, 8, 30), t.get(2).getFin());
        // la semaine en cours : du lundi a aujourd'hui, et signalee
        assertEquals(LocalDate.of(2026, 8, 31), t.get(3).getDebut());
        assertEquals(AUJOURDHUI, t.get(3).getFin());
        assertEquals("2026-W36", t.get(3).getCle());
        assertEquals("S36 (31/08-02/09)", t.get(3).getLibelle());
    }

    @Test
    public void lesPeriodesRevoluesSontCompletes() {
        List<Tranche> t = PeriodesCa.tranches(Type.TROIS_MOIS, null, null, AUJOURDHUI);

        for (int i = 0; i < 3; i++) {
            assertFalse(t.get(i).isEnCours(), t.get(i) + " doit etre une periode revolue");
            assertEquals(t.get(i).getDebut().withDayOfMonth(1), t.get(i).getDebut(), "commence le 1er");
            assertEquals(t.get(i).getDebut().plusMonths(1).minusDays(1), t.get(i).getFin(), "finit le dernier jour");
        }
        assertTrue(t.get(3).isEnCours(), "seule la derniere est en cours");
    }

    @Test
    public void troisEtSixMoisRevolusPlusLeMoisEnCours() {
        List<Tranche> trois = PeriodesCa.tranches(Type.TROIS_MOIS, null, null, AUJOURDHUI);

        assertEquals(4, trois.size(), "juin, juillet, aout, plus septembre en cours");
        assertEquals("2026-06", trois.get(0).getCle());
        assertEquals(LocalDate.of(2026, 6, 1), trois.get(0).getDebut());
        assertEquals(LocalDate.of(2026, 6, 30), trois.get(0).getFin());
        assertEquals("2026-08", trois.get(2).getCle());
        assertEquals(LocalDate.of(2026, 8, 31), trois.get(2).getFin(), "aout est complet");
        assertEquals("09/2026", trois.get(3).getLibelle());
        assertEquals(LocalDate.of(2026, 9, 1), trois.get(3).getDebut());
        assertEquals(AUJOURDHUI, trois.get(3).getFin());

        List<Tranche> six = PeriodesCa.tranches(Type.SIX_MOIS, null, null, AUJOURDHUI);
        assertEquals(7, six.size(), "six mois complets, plus celui en cours");
        assertEquals("2026-03", six.get(0).getCle());
        assertEquals("2026-09", six.get(6).getCle());
        assertTrue(six.get(6).isEnCours());
    }

    @Test
    public void troisAnneesRevoluesPlusLAnneeEnCours() {
        List<Tranche> t = PeriodesCa.tranches(Type.TROIS_ANS, null, null, AUJOURDHUI);

        assertEquals(4, t.size(), "2023, 2024, 2025, plus 2026 en cours");
        assertEquals("2023", t.get(0).getCle());
        assertEquals(LocalDate.of(2023, 1, 1), t.get(0).getDebut());
        assertEquals(LocalDate.of(2023, 12, 31), t.get(0).getFin());
        assertEquals("2025", t.get(2).getCle());
        assertEquals(LocalDate.of(2025, 12, 31), t.get(2).getFin(), "2025 est complete");
        assertEquals("2026", t.get(3).getCle());
        assertEquals(AUJOURDHUI, t.get(3).getFin());
        assertTrue(t.get(3).isEnCours());
    }

    @Test
    public void lePremierJourDeLaPeriodeLaTrancheEnCoursExisteQuandMeme() {
        // Le 1er septembre : on EST dans septembre, c'est ce que l'officine veut voir. C'est le
        // marquage, et non l'absence de la colonne, qui dit qu'elle n'est pas comparable.
        List<Tranche> t = PeriodesCa.tranches(Type.TROIS_MOIS, null, null, LocalDate.of(2026, 9, 1));

        assertEquals(4, t.size());
        assertEquals("2026-09", t.get(3).getCle());
        assertEquals(LocalDate.of(2026, 9, 1), t.get(3).getDebut());
        assertEquals(LocalDate.of(2026, 9, 1), t.get(3).getFin());
        assertTrue(t.get(3).isEnCours());
    }

    @Test
    public void laPeriodeEnCoursNeDeborreJamaisSurAujourdhui() {
        // Une tranche qui irait jusqu'au 30 septembre alors qu'on est le 2 compterait des ventes
        // qui n'existent pas encore, et le total du mois en cours serait tenu pour definitif.
        for (Type type : new Type[] { Type.TROIS_SEMAINES, Type.TROIS_MOIS, Type.SIX_MOIS, Type.TROIS_ANS }) {
            List<Tranche> t = PeriodesCa.tranches(type, null, null, AUJOURDHUI);
            assertEquals(AUJOURDHUI, t.get(t.size() - 1).getFin(), type + " : la derniere borne est aujourd'hui");
            assertTrue(t.get(t.size() - 1).isEnCours(), type + " : la derniere tranche est marquee en cours");
        }
    }

    @Test
    public void finDeMoisEtAnneeBissextileNeDecalentRien() {
        // Le 31 mars : reculer de trois mois ne doit pas tomber sur un 31 inexistant en fevrier.
        List<Tranche> t = PeriodesCa.tranches(Type.TROIS_MOIS, null, null, LocalDate.of(2024, 3, 31));

        assertEquals(4, t.size());
        assertEquals("2023-12", t.get(0).getCle());
        assertEquals("2024-02", t.get(2).getCle());
        assertEquals(LocalDate.of(2024, 2, 29), t.get(2).getFin(), "2024 est bissextile");
        assertEquals("2024-03", t.get(3).getCle());
    }

    @Test
    public void unePeriodeQuiChevaucheDeuxAnneesGardeSesCles() {
        // Le 5 janvier 2026 : les trois mois revolus sont octobre, novembre et decembre 2025.
        List<Tranche> t = PeriodesCa.tranches(Type.TROIS_MOIS, null, null, LocalDate.of(2026, 1, 5));

        assertEquals(4, t.size());
        assertEquals("2025-10", t.get(0).getCle());
        assertEquals("2025-12", t.get(2).getCle());
        assertEquals("2026-01", t.get(3).getCle());
    }

    @Test
    public void periodeLibreChoisitLaGranularite() {
        assertEquals(Granularite.JOUR,
                PeriodesCa.granularite(Type.LIBRE, LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31)));
        assertEquals(Granularite.SEMAINE,
                PeriodesCa.granularite(Type.LIBRE, LocalDate.of(2026, 6, 1), LocalDate.of(2026, 8, 31)));
        assertEquals(Granularite.MOIS,
                PeriodesCa.granularite(Type.LIBRE, LocalDate.of(2025, 1, 1), LocalDate.of(2026, 8, 31)));
        assertEquals(Granularite.ANNEE,
                PeriodesCa.granularite(Type.LIBRE, LocalDate.of(2021, 1, 1), LocalDate.of(2026, 8, 31)));
    }

    @Test
    public void periodeLibreParJourEtBornesInversees() {
        List<Tranche> t = PeriodesCa.tranches(Type.LIBRE, LocalDate.of(2026, 8, 5), LocalDate.of(2026, 8, 3),
                AUJOURDHUI);
        assertEquals(3, t.size());
        assertEquals("2026-08-03", t.get(0).getCle());
        assertEquals("05/08", t.get(2).getLibelle());
    }

    @Test
    public void periodeLibreParSemaineBorneeAuxExtremites() {
        List<Tranche> t = PeriodesCa.tranches(Type.LIBRE, LocalDate.of(2026, 8, 5), LocalDate.of(2026, 9, 10),
                AUJOURDHUI);
        assertEquals(LocalDate.of(2026, 8, 5), t.get(0).getDebut());
        assertEquals(LocalDate.of(2026, 8, 9), t.get(0).getFin());
        assertEquals(LocalDate.of(2026, 9, 10), t.get(t.size() - 1).getFin());
        assertEquals(6, t.size());
    }

    @Test
    public void cleSemaineIsoEnDebutDAnnee() {
        // Le 1er janvier 2027 (vendredi) appartient a la semaine 53 de 2026 : la cle suit l'annee ISO comme MySQL %x.
        assertEquals("2026-W53", PeriodesCa.cle(LocalDate.of(2027, 1, 1), Granularite.SEMAINE));
        assertEquals("2026-01", PeriodesCa.cle(LocalDate.of(2026, 1, 15), Granularite.MOIS));
        assertEquals("2026", PeriodesCa.cle(LocalDate.of(2026, 1, 15), Granularite.ANNEE));
    }

    @Test
    public void expressionSqlEtLectureDuType() {
        assertEquals("DATE_FORMAT(p.dt_UPDATED, '%x-W%v')", Granularite.SEMAINE.expressionSql("p.dt_UPDATED"));
        assertEquals(Type.TROIS_ANS, Type.de("trois_ans"));
        assertEquals(Type.TROIS_MOIS, Type.de("n'importe quoi"));
        assertEquals(Type.TROIS_MOIS, Type.de(null));
        assertTrue(PeriodesCa.decouper(null, null, Granularite.JOUR).isEmpty());
    }
}
