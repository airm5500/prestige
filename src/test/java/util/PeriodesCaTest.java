package util;

import static org.junit.jupiter.api.Assertions.assertEquals;
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

    @Test
    public void troisSemainesBorneesAAujourdhui() {
        List<Tranche> t = PeriodesCa.tranches(Type.TROIS_SEMAINES, null, null, AUJOURDHUI);
        assertEquals(3, t.size());
        assertEquals(LocalDate.of(2026, 8, 17), t.get(0).getDebut());
        assertEquals(LocalDate.of(2026, 8, 23), t.get(0).getFin());
        assertEquals("2026-W34", t.get(0).getCle());
        assertEquals(LocalDate.of(2026, 8, 31), t.get(2).getDebut());
        assertEquals(AUJOURDHUI, t.get(2).getFin());
        assertEquals("2026-W36", t.get(2).getCle());
        assertEquals("S36 (31/08-02/09)", t.get(2).getLibelle());
    }

    @Test
    public void troisEtSixMoisCommencentAuPremierDuMois() {
        List<Tranche> trois = PeriodesCa.tranches(Type.TROIS_MOIS, null, null, AUJOURDHUI);
        assertEquals(3, trois.size());
        assertEquals("2026-07", trois.get(0).getCle());
        assertEquals(LocalDate.of(2026, 7, 1), trois.get(0).getDebut());
        assertEquals(LocalDate.of(2026, 7, 31), trois.get(0).getFin());
        assertEquals("09/2026", trois.get(2).getLibelle());
        assertEquals(AUJOURDHUI, trois.get(2).getFin());
        List<Tranche> six = PeriodesCa.tranches(Type.SIX_MOIS, null, null, AUJOURDHUI);
        assertEquals(6, six.size());
        assertEquals("2026-04", six.get(0).getCle());
    }

    @Test
    public void troisAnneesCiviles() {
        List<Tranche> t = PeriodesCa.tranches(Type.TROIS_ANS, null, null, AUJOURDHUI);
        assertEquals(3, t.size());
        assertEquals("2024", t.get(0).getCle());
        assertEquals(LocalDate.of(2024, 1, 1), t.get(0).getDebut());
        assertEquals(LocalDate.of(2024, 12, 31), t.get(0).getFin());
        assertEquals(AUJOURDHUI, t.get(2).getFin());
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
