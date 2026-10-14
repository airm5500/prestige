package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

/** Retours du 13/10 (point 4) : intervalle d'evolution de l'analyse des perimes. */
class AnalysePerimesIntervalleTest {

    @Test
    void intervallesProposes() {
        assertEquals("DATE_FORMAT(x, '%x-S%v')", AnalysePerimesService.periode("semaine", "x"));
        assertEquals("DATE_FORMAT(x, '%Y-%m')", AnalysePerimesService.periode("mois", "x"));
        assertEquals("CONCAT(YEAR(x), '-T', QUARTER(x))", AnalysePerimesService.periode("trimestre", "x"));
        assertEquals("CAST(YEAR(x) AS CHAR)", AnalysePerimesService.periode("annee", "x"));
    }

    @Test
    void intervalleInconnuOuAbsent_parMois() {
        assertEquals("mois", AnalysePerimesService.pas(null));
        assertEquals("mois", AnalysePerimesService.pas("jour'; DROP"));
        assertEquals("trimestre", AnalysePerimesService.pas("trimestre"));
    }
}
