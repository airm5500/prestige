package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.util.Arrays;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rest.service.dto.AnalyseTiersPayantDTO;

/**
 * Regles de l'analyse tiers payants qui se decident hors de la base : la periode retenue quand l'ecran n'en fournit pas
 * d'utilisable, le taux de marge, et la mise en forme du fichier exporte.
 *
 * Ces regles decident de ce qui s'affiche : une periode mal interpretee donne un ecran vide sans explication, et un
 * libelle mal echappe decale toutes les colonnes du tableur.
 */
class AnalyseTiersPayantTest {

    // ------------------------------------------------------------------ periode

    @Test
    @DisplayName("Periode fournie : reprise telle quelle")
    void periodeFournie() {
        String[] p = AnalyseTiersPayantServiceImpl.periodeOuMoisEnCours("2026-03-01", "2026-03-31");

        assertEquals("2026-03-01", p[0]);
        assertEquals("2026-03-31", p[1]);
    }

    @Test
    @DisplayName("Periode absente : mois en cours, du 1er a aujourd'hui")
    void periodeAbsente() {
        LocalDate aujourdhui = LocalDate.now();
        String premier = aujourdhui.withDayOfMonth(1).toString();

        for (String[] bornes : Arrays.asList(new String[] { null, null }, new String[] { "", "" },
                new String[] { "   ", "   " })) {
            String[] p = AnalyseTiersPayantServiceImpl.periodeOuMoisEnCours(bornes[0], bornes[1]);
            assertEquals(premier, p[0]);
            assertEquals(aujourdhui.toString(), p[1]);
        }
    }

    @Test
    @DisplayName("Date illisible : mois en cours plutot qu'un ecran vide")
    void periodeIllisible() {
        LocalDate aujourdhui = LocalDate.now();

        // Une seule borne fautive suffit : on ne devine pas l'autre, on repart du mois en cours.
        String[] p = AnalyseTiersPayantServiceImpl.periodeOuMoisEnCours("01/03/2026", "2026-03-31");

        assertEquals(aujourdhui.withDayOfMonth(1).toString(), p[0]);
        assertEquals(aujourdhui.toString(), p[1]);
    }

    @Test
    @DisplayName("Bornes inversees : remises dans l'ordre plutot que de ne rien renvoyer")
    void periodeInversee() {
        String[] p = AnalyseTiersPayantServiceImpl.periodeOuMoisEnCours("2026-03-31", "2026-03-01");

        assertEquals("2026-03-01", p[0]);
        assertEquals("2026-03-31", p[1]);
    }

    @Test
    @DisplayName("Recherche : motif contenant, une recherche vide n'exclut rien")
    void motifRecherche() {
        assertEquals("%OLEA%", AnalyseTiersPayantServiceImpl.motifRecherche("OLEA"));
        assertEquals("%OLEA%", AnalyseTiersPayantServiceImpl.motifRecherche("  OLEA  "));
        assertEquals("%%", AnalyseTiersPayantServiceImpl.motifRecherche(null));
        assertEquals("%%", AnalyseTiersPayantServiceImpl.motifRecherche(""));
    }

    // ------------------------------------------------------------------ taux de marge

    @Test
    @DisplayName("Taux de marge : marge rapportee au chiffre d'affaires hors taxes")
    void tauxMarge() {
        assertEquals(34.02d, AnalyseTiersPayantDTO.tauxMarge(104601L, 307440L), 0.005d);
        assertEquals(50d, AnalyseTiersPayantDTO.tauxMarge(500L, 1000L), 0.005d);
        // Vente a perte : le taux suit le signe de la marge.
        assertEquals(-10d, AnalyseTiersPayantDTO.tauxMarge(-100L, 1000L), 0.005d);
    }

    @Test
    @DisplayName("Taux de marge : chiffre d'affaires nul, pas de division")
    void tauxMargeSansBase() {
        // Sans base, tout taux serait invente ; et une division par zero interromprait l'analyse.
        assertEquals(0d, AnalyseTiersPayantDTO.tauxMarge(500L, 0L), 0.005d);
        assertEquals(0d, AnalyseTiersPayantDTO.tauxMarge(0L, 0L), 0.005d);
    }

    @Test
    @DisplayName("Part client : ce que la vente encaisse hors part du tiers payant")
    void partClient() {
        AnalyseTiersPayantDTO dto = new AnalyseTiersPayantDTO();
        dto.setCaTtc(289415L);
        dto.setPartTiersPayant(188128L);

        assertEquals(101287L, dto.getPartClient());
    }
}
