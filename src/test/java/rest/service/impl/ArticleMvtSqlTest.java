package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import rest.service.dto.ArticleMvtFilter;

/**
 * Ecran "Articles en mouvement" (evolution 5, point 8) : une seule ligne par article, un filtre sur le mode de
 * mouvement, sur l'emplacement et sur la famille, et le meme perimetre pour la liste, le comptage et l'inventaire.
 */
public class ArticleMvtSqlTest {

    private static ArticleMvtFilter filtre(String typeMvt, String emplacement, String famille, String recherche) {
        return ArticleMvtFilter.builder().dtStart("2026-09-01").dtEnd("2026-09-15").typeMvt(typeMvt)
                .emplacementId(emplacement).familleId(famille).query(recherche).build();
    }

    private static ArticleMvtFilter sansFiltre() {
        return filtre(null, null, null, null);
    }

    @Test
    public void toutesLesRequetesPartentDeLArticleEtInterrogentLesMouvementsParExists() {
        // Si les mouvements etaient joints a plat, un article ayant bouge dix fois sortirait dix fois :
        // c'est exactement ce que l'ecran ne doit pas faire.
        for (String sql : new String[] { ArticleMvtSql.liste(sansFiltre()), ArticleMvtSql.comptage(sansFiltre()),
                ArticleMvtSql.identifiants(sansFiltre()) }) {
            assertTrue(sql.contains("FROM t_famille f"), sql);
            assertTrue(sql.contains("WHERE EXISTS ( SELECT 1 FROM hmvtproduit h"), sql);
            assertFalse(sql.contains("JOIN hmvtproduit h ON"), "les mouvements ne doivent jamais etre joints a plat");
        }
    }

    @Test
    public void listeComptageEtIdentifiantsPartagentExactementLesMemesPredicats() {
        ArticleMvtFilter f = filtre("4", "ZONE1", "FAM1", "DOLI");
        String liste = ArticleMvtSql.liste(f);
        String comptage = ArticleMvtSql.comptage(f);
        String identifiants = ArticleMvtSql.identifiants(f);

        // lastIndexOf : un "ORDER BY" figure deja dans le GROUP_CONCAT des types de mouvement.
        String predicats = liste.substring(liste.indexOf(" WHERE EXISTS"), liste.lastIndexOf(" ORDER BY"));
        assertTrue(comptage.endsWith(predicats), comptage);
        assertTrue(identifiants.contains(predicats), identifiants);
    }

    @Test
    public void lesTypesDeMouvementSontConcatenesPourTenirSurUneLigne() {
        String sql = ArticleMvtSql.liste(sansFiltre());
        assertTrue(sql.contains("GROUP_CONCAT(DISTINCT tm.description"), sql);
        assertTrue(sql.contains("AS typesMvt"), sql);
        assertTrue(sql.contains("JOIN typemvtproduit tm ON tm.ID = ht.typeMvt"), sql);
    }

    @Test
    public void lesColonnesEtFiltresEmplacementEtFamilleUtilisentLesBonnesTables() {
        String sql = ArticleMvtSql.liste(sansFiltre());
        assertTrue(sql.contains("LEFT JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID"), sql);
        assertTrue(sql.contains("LEFT JOIN t_famillearticle fa ON fa.lg_FAMILLEARTICLE_ID = f.lg_FAMILLEARTICLE_ID"),
                sql);
        assertTrue(sql.contains("z.str_LIBELLEE AS emplacement"), sql);
        assertTrue(sql.contains("fa.str_LIBELLE AS famille"), sql);
    }

    @Test
    public void unFiltreAbsentNAjoutePasSonParametre() {
        String sql = ArticleMvtSql.liste(sansFiltre());
        assertFalse(sql.contains(":" + ArticleMvtSql.P_TYPE_MVT), sql);
        assertFalse(sql.contains(":" + ArticleMvtSql.P_EMPLACEMENT), sql);
        assertFalse(sql.contains(":" + ArticleMvtSql.P_FAMILLE), sql);
        assertFalse(sql.contains(":" + ArticleMvtSql.P_RECHERCHE), sql);
        // Les bornes de periode, elles, sont toujours presentes.
        assertTrue(sql.contains(":" + ArticleMvtSql.P_DEBUT), sql);
        assertTrue(sql.contains(":" + ArticleMvtSql.P_FIN), sql);
    }

    @Test
    public void chaqueFiltrePosePreciseSaClause() {
        assertTrue(
                ArticleMvtSql.liste(filtre("4", null, null, null)).contains("h.typeMvt = :" + ArticleMvtSql.P_TYPE_MVT),
                "le mode de mouvement se filtre dans l EXISTS, pas apres");
        assertTrue(ArticleMvtSql.liste(filtre(null, "ZONE1", null, null))
                .contains("f.lg_ZONE_GEO_ID = :" + ArticleMvtSql.P_EMPLACEMENT));
        assertTrue(ArticleMvtSql.liste(filtre(null, null, "FAM1", null))
                .contains("f.lg_FAMILLEARTICLE_ID = :" + ArticleMvtSql.P_FAMILLE));
        assertTrue(ArticleMvtSql.liste(filtre(null, null, null, "DOLI"))
                .contains("f.str_NAME LIKE :" + ArticleMvtSql.P_RECHERCHE));
    }

    @Test
    public void aucunParametreOrdinalNEstUtilise() {
        // Les clauses etant optionnelles, des parametres ordinaux laisseraient des trous dans la
        // numerotation et Hibernate refuserait la requete ("Unexpected gap in ordinal parameter labels").
        for (String sql : new String[] { ArticleMvtSql.liste(filtre("4", "ZONE1", null, null)),
                ArticleMvtSql.comptage(filtre(null, null, "FAM1", "DOLI")) }) {
            assertFalse(sql.matches("(?s).*\\?\\d.*"), sql);
        }
    }

    @Test
    public void lEntreeTousEquivautALAbsenceDeFiltre() {
        ArticleMvtFilter f = filtre(ArticleMvtFilter.TOUS, ArticleMvtFilter.TOUS, ArticleMvtFilter.TOUS, "  ");
        assertNull(f.typeMvtOuNull());
        assertNull(f.emplacementOuNull());
        assertNull(f.familleOuNull());
        assertNull(f.rechercheLike());
        assertEquals(ArticleMvtSql.liste(sansFiltre()), ArticleMvtSql.liste(f));
    }

    @Test
    public void unePeriodeVideVautLaJourneeDuJour() {
        // Le bouton Reinitialiser vide les deux champs de date : la periode doit alors valoir la journee
        // du jour, faute de quoi le libelle de l inventaire cree et le nom du fichier exporte seraient vides.
        ArticleMvtFilter vide = ArticleMvtFilter.builder().build();
        assertEquals(java.time.LocalDate.now(), vide.debut());
        assertEquals(vide.debut(), vide.fin());
        assertEquals(java.time.LocalDate.now().toString(), vide.debutTexte());
    }

    @Test
    public void uneDateDeFinManquanteVautLaDateDeDebut() {
        ArticleMvtFilter f = ArticleMvtFilter.builder().dtStart("2026-09-01").build();
        assertEquals("2026-09-01", f.debutTexte());
        assertEquals("2026-09-01", f.finTexte());
    }

    @Test
    public void laRechercheEncadreLeTermeDeJokers() {
        assertEquals("%DOLI%", filtre(null, null, null, " DOLI ").rechercheLike());
    }

    @Test
    public void laListeEtLesIdentifiantsSontOrdonnesParLibelle() {
        assertTrue(ArticleMvtSql.liste(sansFiltre()).endsWith("ORDER BY f.str_NAME"));
        assertTrue(ArticleMvtSql.identifiants(sansFiltre()).endsWith("ORDER BY f.str_NAME"));
        assertTrue(ArticleMvtSql.identifiants(sansFiltre()).startsWith("SELECT f.lg_FAMILLE_ID "));
    }
}
