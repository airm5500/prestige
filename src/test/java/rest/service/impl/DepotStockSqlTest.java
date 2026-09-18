package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import rest.service.impl.DepotStockSql.Criteres;

/**
 * Evolution 5, point 1 : stock d'un depot d'extension. Le stock d'un depot est {@code t_famille_stock} pour son
 * emplacement : la liste, son comptage et sa valorisation doivent porter exactement sur les memes lignes.
 *
 * <p>
 * Retour du 17/09 : s'ajoutent un filtre sur l'emplacement de l'article, un filtre sur le stock, et le fait que la case
 * « masquer les articles a 0 » n'est plus cochee par defaut. Trois occasions de rendre deux requetes discordantes -
 * c'est justement ce que ces tests interdisent.
 */
public class DepotStockSqlTest {

    private static Criteres c(String recherche, String famille, String zone, String filtre, boolean masquerZeros) {
        return new Criteres(recherche, famille, zone, filtre, masquerZeros);
    }

    private static Criteres vide() {
        return c("", "", "", null, false);
    }

    /**
     * Seule la clause WHERE, sans les colonnes ni l'ordre.
     *
     * <p>
     * Indispensable pour verifier une ABSENCE : {@code int_NUMBER_AVAILABLE} figure de toute facon dans les colonnes
     * selectionnees et dans les sommes de la valorisation. Chercher sa presence dans le SQL entier ne dirait rien du
     * filtre applique.
     */
    private static String predicatsDe(String sql) {
        int debut = sql.indexOf(" WHERE ");
        int fin = sql.indexOf(" ORDER BY ");
        if (fin < 0) {
            fin = sql.indexOf(" GROUP BY ");
        }
        return fin < 0 ? sql.substring(debut) : sql.substring(debut, fin);
    }

    @Test
    public void toutPartDuStockDeLEmplacementDuDepot() {
        for (String sql : new String[] { DepotStockSql.liste(vide()), DepotStockSql.comptage(vide()),
                DepotStockSql.valorisation(vide()), DepotStockSql.valorisationParEmplacement(vide()) }) {
            assertTrue(sql.contains("FROM t_famille_stock s"), sql);
            assertTrue(sql.contains("s.lg_EMPLACEMENT_ID = :" + DepotStockSql.P_DEPOT), sql);
            assertTrue(sql.contains("s.str_STATUT = 'enable'"), sql);
            assertTrue(sql.contains("f.str_STATUT = 'enable'"), sql);
        }
    }

    @Test
    public void listeComptageEtValorisationPartagentLesMemesPredicats() {
        Criteres criteres = c("DOLI", "FAM1", "ZONE1", DepotStockSql.POSITIF, true);
        String liste = DepotStockSql.liste(criteres);
        String predicats = liste.substring(liste.indexOf(" WHERE "), liste.lastIndexOf(" ORDER BY"));
        assertTrue(DepotStockSql.comptage(criteres).endsWith(predicats));
        assertTrue(DepotStockSql.valorisation(criteres).endsWith(predicats));
        // La ventilation par emplacement aussi : c'est ce qui fait que la somme de ses lignes egale le total.
        assertTrue(DepotStockSql.valorisationParEmplacement(criteres).contains(predicats));
    }

    @Test
    public void unFiltreAbsentNAjoutePasSonParametre() {
        String sql = DepotStockSql.liste(vide());
        assertFalse(sql.contains(":" + DepotStockSql.P_RECHERCHE), sql);
        assertFalse(sql.contains(":" + DepotStockSql.P_FAMILLE), sql);
        assertFalse(sql.contains(":" + DepotStockSql.P_ZONE), sql);
        assertFalse(predicatsDe(sql).contains("int_NUMBER_AVAILABLE"), sql);
        assertTrue(sql.contains(":" + DepotStockSql.P_DEPOT), sql);
    }

    @Test
    public void chaqueFiltrePosePreciseSaClause() {
        assertTrue(DepotStockSql.liste(c("DOLI", "", "", null, false))
                .contains("f.str_NAME LIKE :" + DepotStockSql.P_RECHERCHE));
        assertTrue(DepotStockSql.liste(c("", "FAM1", "", null, false))
                .contains("f.lg_FAMILLEARTICLE_ID = :" + DepotStockSql.P_FAMILLE));
        assertTrue(DepotStockSql.liste(c("", "", "ZONE1", null, false))
                .contains("f.lg_ZONE_GEO_ID = :" + DepotStockSql.P_ZONE));
        assertTrue(DepotStockSql.liste(c("", "", "", null, true)).contains("s.int_NUMBER_AVAILABLE <> 0"));
    }

    /**
     * Le filtre d'emplacement porte sur le RAYON de l'article, pas sur le depot : le depot est deja choisi en haut de
     * l'ecran, et confondre les deux rendrait une liste systematiquement vide.
     */
    @Test
    public void leFiltreEmplacementPorteSurLeRayonDeLArticleEtNonSurLeDepot() {
        String sql = DepotStockSql.liste(c("", "", "ZONE1", null, false));
        assertTrue(sql.contains("f.lg_ZONE_GEO_ID = :" + DepotStockSql.P_ZONE), sql);
        assertFalse(sql.contains("s.lg_EMPLACEMENT_ID = :" + DepotStockSql.P_ZONE), sql);
        // Le depot reste filtre par son propre parametre, une seule fois.
        assertEquals(1, predicatsDe(sql).split("lg_EMPLACEMENT_ID", -1).length - 1, sql);
    }

    @Test
    public void leFiltreDeStockCouvreLesTroisCasDeLEcran() {
        assertTrue(DepotStockSql.liste(c("", "", "", DepotStockSql.NEGATIF, false))
                .contains("s.int_NUMBER_AVAILABLE < 0"));
        assertTrue(
                DepotStockSql.liste(c("", "", "", DepotStockSql.ZERO, false)).contains("s.int_NUMBER_AVAILABLE = 0"));
        assertTrue(DepotStockSql.liste(c("", "", "", DepotStockSql.POSITIF, false))
                .contains("s.int_NUMBER_AVAILABLE > 0"));
    }

    /**
     * « Masquer les articles a 0 » et « ne garder que les stocks a zero » se contrediraient : la liste serait toujours
     * vide et l'utilisateur chercherait longtemps pourquoi. Le filtre l'emporte, l'ecran grise la case.
     */
    @Test
    public void leFiltreDeStockLEmporteSurLaCaseMasquerLesZeros() {
        String predicats = predicatsDe(DepotStockSql.liste(c("", "", "", DepotStockSql.ZERO, true)));
        assertTrue(predicats.contains("s.int_NUMBER_AVAILABLE = 0"), predicats);
        assertFalse(predicats.contains("s.int_NUMBER_AVAILABLE <> 0"), predicats);
    }

    @Test
    public void aucunFiltreDeStockNeLaissePasserLesArticlesAZeroSaufSiOnLeDemande() {
        // C'est le defaut depuis le retour du 17/09 : la case est decochee, donc tout est visible.
        assertFalse(predicatsDe(DepotStockSql.liste(vide())).contains("int_NUMBER_AVAILABLE"),
                "aucun filtre implicite");
    }

    @Test
    public void unFiltreDeStockInconnuVautTousEtNeCasseRien() {
        assertEquals(DepotStockSql.TOUS, DepotStockSql.normaliserFiltre(null));
        assertEquals(DepotStockSql.TOUS, DepotStockSql.normaliserFiltre("   "));
        assertEquals(DepotStockSql.TOUS, DepotStockSql.normaliserFiltre("DROP TABLE t_famille"));
        assertEquals(DepotStockSql.NEGATIF, DepotStockSql.normaliserFiltre("negatif"));
        assertFalse(predicatsDe(DepotStockSql.liste(c("", "", "", "n'importe quoi", false)))
                .contains("int_NUMBER_AVAILABLE"));
    }

    /**
     * Retour du 18/09 : « le filtre stock doit avoir un operateur et une zone de stock a filtrer ». Les six operateurs
     * doivent produire exactement leur comparaison, et la valeur comparee apparaitre telle quelle.
     */
    @Test
    public void lesSixOperateursProduisentLeurComparaison() {
        assertEquals("=", DepotStockSql.signe("EQ"));
        assertEquals("<>", DepotStockSql.signe("NE"));
        assertEquals("<", DepotStockSql.signe("LT"));
        assertEquals("<=", DepotStockSql.signe("LE"));
        assertEquals(">", DepotStockSql.signe("GT"));
        assertEquals(">=", DepotStockSql.signe("GE"));
        // la casse et les espaces ne doivent pas faire perdre le filtre
        assertEquals(">=", DepotStockSql.signe(" ge "));
    }

    @Test
    public void laValeurComparteeApparaitDansLaClause() {
        String predicats = predicatsDe(
                DepotStockSql.liste(new Criteres("", "", "", null, DepotStockSql.OP_SUPERIEUR_EGAL, 10, false)));

        assertTrue(predicats.contains("s.int_NUMBER_AVAILABLE >= 10"), predicats);
    }

    /** Un stock negatif est une valeur legitime a comparer : l'anomalie est justement ce qu'on cherche. */
    @Test
    public void uneValeurNegativeEstAcceptee() {
        String predicats = predicatsDe(
                DepotStockSql.liste(new Criteres("", "", "", null, DepotStockSql.OP_INFERIEUR, -5, false)));

        assertTrue(predicats.contains("s.int_NUMBER_AVAILABLE < -5"), predicats);
    }

    /**
     * AUCUN operateur inconnu n'atteint le SQL. C'est le point sensible : le signe vient d'une table de correspondance
     * et jamais de l'appelant, sans quoi le filtre serait une porte d'entree.
     */
    @Test
    public void unOperateurInconnuEstIgnoreEtNAtteintPasLeSql() {
        assertNull(DepotStockSql.signe("OR 1=1 --"));
        assertNull(DepotStockSql.signe(""));
        assertNull(DepotStockSql.signe(null));

        String predicats = predicatsDe(DepotStockSql.liste(new Criteres("", "", "", null, "OR 1=1 --", 0, false)));
        assertFalse(predicats.contains("1=1"), predicats);
        assertFalse(predicats.contains("int_NUMBER_AVAILABLE"), predicats);
    }

    /** Une valeur nulle vaut zero : « > » sans valeur saisie doit rester une comparaison valide. */
    @Test
    public void uneValeurAbsenteVautZero() {
        String predicats = predicatsDe(
                DepotStockSql.liste(new Criteres("", "", "", null, DepotStockSql.OP_SUPERIEUR, null, false)));

        assertTrue(predicats.contains("s.int_NUMBER_AVAILABLE > 0"), predicats);
    }

    /**
     * NON-REGRESSION : les trois anciennes categories sont traduites en operateur DANS LE CONSTRUCTEUR, donc pour tout
     * appelant - un service, une edition, un test. Les traduire plus haut seulement aurait fait perdre le filtre a ces
     * appels, silencieusement, en rendant simplement plus de lignes qu'attendu.
     */
    @Test
    public void lesAnciennesCategoriesDonnentExactementLesMemesClauses() {
        assertTrue(predicatsDe(DepotStockSql.liste(c("", "", "", DepotStockSql.NEGATIF, false)))
                .contains("s.int_NUMBER_AVAILABLE < 0"));
        assertTrue(predicatsDe(DepotStockSql.liste(c("", "", "", DepotStockSql.ZERO, false)))
                .contains("s.int_NUMBER_AVAILABLE = 0"));
        assertTrue(predicatsDe(DepotStockSql.liste(c("", "", "", DepotStockSql.POSITIF, false)))
                .contains("s.int_NUMBER_AVAILABLE > 0"));
    }

    /** L'operateur explicite l'emporte sur la categorie : c'est le controle que l'utilisateur vient de poser. */
    @Test
    public void lOperateurExpliciteLEmporteSurLAncienneCategorie() {
        String predicats = predicatsDe(DepotStockSql
                .liste(new Criteres("", "", "", DepotStockSql.NEGATIF, DepotStockSql.OP_SUPERIEUR_EGAL, 100, false)));

        assertTrue(predicats.contains("s.int_NUMBER_AVAILABLE >= 100"), predicats);
        assertFalse(predicats.contains("< 0"), predicats);
    }

    @Test
    public void laValorisationEstCalculeeParLaBaseSurToutesLesLignes() {
        // Additionner la page affichee donnerait un total faux des la deuxieme page.
        String sql = DepotStockSql.valorisation(c("", "", "", null, true));
        assertTrue(sql.contains("SUM(s.int_NUMBER_AVAILABLE * f.int_PAF)"), sql);
        assertTrue(sql.contains("SUM(s.int_NUMBER_AVAILABLE * f.int_PRICE)"), sql);
        assertTrue(sql.contains("COALESCE"), "un depot vide doit rendre zero et non null");
    }

    @Test
    public void aucunParametreOrdinalNEstUtilise() {
        // Les clauses etant optionnelles, des parametres ordinaux laisseraient des trous dans la
        // numerotation et Hibernate refuserait la requete.
        for (String sql : new String[] { DepotStockSql.liste(c("DOLI", "FAM1", "ZONE1", DepotStockSql.NEGATIF, true)),
                DepotStockSql.comptage(c("", "FAM1", "", null, false)),
                DepotStockSql.valorisation(c("DOLI", "", "", DepotStockSql.ZERO, true)),
                DepotStockSql.valorisationParEmplacement(c("", "", "ZONE1", DepotStockSql.POSITIF, false)) }) {
            assertFalse(sql.matches("(?s).*\\?\\d.*"), sql);
        }
    }

    /**
     * Retour du 17/09 sur les editions : on releve un stock rayon par rayon, pas en parcourant l'officine dans l'ordre
     * alphabetique des medicaments. Les articles sans rayon passent en dernier, sinon leur libelle vide les placerait
     * en tete.
     */
    @Test
    public void laListeEstOrdonneeParEmplacementPuisParDesignation() {
        String sql = DepotStockSql.liste(vide());
        int ordre = sql.indexOf(" ORDER BY ");
        assertTrue(ordre > 0, sql);
        String fin = sql.substring(ordre);
        assertTrue(fin.contains("z.str_LIBELLEE"), fin);
        assertTrue(fin.contains("f.str_NAME"), fin);
        assertTrue(fin.indexOf("z.str_LIBELLEE") < fin.indexOf("f.str_NAME"), "emplacement d'abord : " + fin);
        assertTrue(fin.contains("THEN 1 ELSE 0 END"), "les articles sans rayon passent en dernier : " + fin);
    }

    @Test
    public void laVentilationParEmplacementNePerdAucunArticle() {
        String sql = DepotStockSql.valorisationParEmplacement(vide());
        // Un article sans rayon compte dans le total du depot : il doit donc apparaitre ici aussi.
        assertTrue(sql.contains("'Sans emplacement'"), sql);
        assertTrue(sql.contains("GROUP BY emplacement"), sql);
    }

    @Test
    public void lesLibellesDeFamilleEtDEmplacementSontJointsSansExclureLesArticlesQuiEnManquent() {
        String sql = DepotStockSql.liste(vide());
        assertTrue(sql.contains("LEFT JOIN t_famillearticle"), sql);
        assertTrue(sql.contains("LEFT JOIN t_zone_geographique"), sql);
        assertEquals(2, sql.split("LEFT JOIN", -1).length - 1, sql);
    }
}
