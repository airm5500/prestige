package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

/**
 * Evolution 5, point 1 : stock d'un depot d'extension. Le stock d'un depot est {@code t_famille_stock} pour son
 * emplacement : la liste, son comptage et sa valorisation doivent porter exactement sur les memes lignes.
 */
public class DepotStockSqlTest {

    @Test
    public void toutPartDuStockDeLEmplacementDuDepot() {
        for (String sql : new String[] { DepotStockSql.liste("", "", false), DepotStockSql.comptage("", "", false),
                DepotStockSql.valorisation("", "", false) }) {
            assertTrue(sql.contains("FROM t_famille_stock s"), sql);
            assertTrue(sql.contains("s.lg_EMPLACEMENT_ID = :" + DepotStockSql.P_DEPOT), sql);
            assertTrue(sql.contains("s.str_STATUT = 'enable'"), sql);
            assertTrue(sql.contains("f.str_STATUT = 'enable'"), sql);
        }
    }

    @Test
    public void listeComptageEtValorisationPartagentLesMemesPredicats() {
        String liste = DepotStockSql.liste("DOLI", "FAM1", true);
        String predicats = liste.substring(liste.indexOf(" WHERE "), liste.lastIndexOf(" ORDER BY"));
        assertTrue(DepotStockSql.comptage("DOLI", "FAM1", true).endsWith(predicats));
        assertTrue(DepotStockSql.valorisation("DOLI", "FAM1", true).endsWith(predicats));
    }

    @Test
    public void unFiltreAbsentNAjoutePasSonParametre() {
        String sql = DepotStockSql.liste("", "", false);
        assertFalse(sql.contains(":" + DepotStockSql.P_RECHERCHE), sql);
        assertFalse(sql.contains(":" + DepotStockSql.P_FAMILLE), sql);
        assertFalse(sql.contains("int_NUMBER_AVAILABLE <> 0"), sql);
        assertTrue(sql.contains(":" + DepotStockSql.P_DEPOT), sql);
    }

    @Test
    public void chaqueFiltrePosePreciseSaClause() {
        assertTrue(DepotStockSql.liste("DOLI", "", false).contains("f.str_NAME LIKE :" + DepotStockSql.P_RECHERCHE));
        assertTrue(DepotStockSql.liste("", "FAM1", false)
                .contains("f.lg_FAMILLEARTICLE_ID = :" + DepotStockSql.P_FAMILLE));
        assertTrue(DepotStockSql.liste("", "", true).contains("s.int_NUMBER_AVAILABLE <> 0"));
    }

    @Test
    public void laValorisationEstCalculeeParLaBaseSurToutesLesLignes() {
        // Additionner la page affichee donnerait un total faux des la deuxieme page.
        String sql = DepotStockSql.valorisation("", "", true);
        assertTrue(sql.contains("SUM(s.int_NUMBER_AVAILABLE * f.int_PAF)"), sql);
        assertTrue(sql.contains("SUM(s.int_NUMBER_AVAILABLE * f.int_PRICE)"), sql);
        assertTrue(sql.contains("COALESCE"), "un depot vide doit rendre zero et non null");
    }

    @Test
    public void aucunParametreOrdinalNEstUtilise() {
        // Les clauses etant optionnelles, des parametres ordinaux laisseraient des trous dans la
        // numerotation et Hibernate refuserait la requete.
        for (String sql : new String[] { DepotStockSql.liste("DOLI", "FAM1", true),
                DepotStockSql.comptage("", "FAM1", false), DepotStockSql.valorisation("DOLI", "", true) }) {
            assertFalse(sql.matches("(?s).*\\?\\d.*"), sql);
        }
    }

    @Test
    public void laListeEstOrdonneeParLibelle() {
        assertTrue(DepotStockSql.liste("", "", false).endsWith("ORDER BY f.str_NAME"));
    }

    @Test
    public void lesLibellesDeFamilleEtDEmplacementSontJointsSansExclureLesArticlesQuiEnManquent() {
        String sql = DepotStockSql.liste("", "", false);
        assertTrue(sql.contains("LEFT JOIN t_famillearticle"), sql);
        assertTrue(sql.contains("LEFT JOIN t_zone_geographique"), sql);
        assertEquals(2, sql.split("LEFT JOIN", -1).length - 1, sql);
    }
}
