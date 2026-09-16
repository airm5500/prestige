package rest.service.impl;

import org.apache.commons.lang3.StringUtils;

/**
 * Construction du SQL du stock d'un depot d'extension (evolution 5, point 1).
 *
 * <p>
 * Le stock d'un depot, c'est {@code t_famille_stock} pour l'emplacement du depot : la meme table que le stock de
 * l'officine, distinguee par son emplacement. Rien n'est donc a inventer sur le modele de donnees ; ce qui manquait,
 * c'est un ecran qui presente ce stock depot par depot, avec sa valorisation.
 * </p>
 *
 * <p>
 * Parametres <b>nommes</b> et non ordinaux : les clauses etant optionnelles, des parametres ordinaux laisseraient des
 * trous dans la numerotation, ce que Hibernate refuse.
 * </p>
 */
final class DepotStockSql {

    static final String P_DEPOT = "depot";
    static final String P_RECHERCHE = "recherche";
    static final String P_FAMILLE = "famille";

    private static final String COLONNES = "SELECT f.lg_FAMILLE_ID AS id, CAST(f.int_CIP AS CHAR) AS cip,"
            + " f.str_NAME AS nom, fa.str_LIBELLE AS famille, z.str_LIBELLEE AS emplacement,"
            + " s.int_NUMBER_AVAILABLE AS stock, f.int_PAF AS prixAchat, f.int_PRICE AS prixVente ";

    private static final String JOINTURES = " FROM t_famille_stock s"
            + " JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID"
            + " LEFT JOIN t_famillearticle fa ON fa.lg_FAMILLEARTICLE_ID = f.lg_FAMILLEARTICLE_ID"
            + " LEFT JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID ";

    private DepotStockSql() {
    }

    /**
     * Clauses communes a la liste, au comptage et a la valorisation : c'est ce qui garantit que le total affiche porte
     * exactement sur les lignes affichees.
     */
    private static String predicats(String recherche, String familleId, boolean seulementEnStock) {
        StringBuilder sb = new StringBuilder(" WHERE s.lg_EMPLACEMENT_ID = :" + P_DEPOT
                + " AND s.str_STATUT = 'enable' AND f.str_STATUT = 'enable' ");
        if (StringUtils.isNotBlank(recherche)) {
            sb.append(" AND ( CAST(f.int_CIP AS CHAR) LIKE :").append(P_RECHERCHE).append(" OR f.str_NAME LIKE :")
                    .append(P_RECHERCHE).append(" ) ");
        }
        if (StringUtils.isNotBlank(familleId)) {
            sb.append(" AND f.lg_FAMILLEARTICLE_ID = :").append(P_FAMILLE).append(' ');
        }
        if (seulementEnStock) {
            // Un depot d'extension partage le referentiel articles de l'officine : sans ce filtre, la
            // liste sortirait les milliers d'articles que le depot ne detient pas.
            sb.append(" AND s.int_NUMBER_AVAILABLE <> 0 ");
        }
        return sb.toString();
    }

    static String liste(String recherche, String familleId, boolean seulementEnStock) {
        return COLONNES + JOINTURES + predicats(recherche, familleId, seulementEnStock) + " ORDER BY f.str_NAME";
    }

    static String comptage(String recherche, String familleId, boolean seulementEnStock) {
        return "SELECT COUNT(1) " + JOINTURES + predicats(recherche, familleId, seulementEnStock);
    }

    /**
     * Valorisation du stock du depot : nombre d'articles, quantite detenue, et valeur au prix d'achat comme au prix de
     * vente. Calculee par la base sur l'ensemble des lignes, et non par addition de la page affichee.
     */
    static String valorisation(String recherche, String familleId, boolean seulementEnStock) {
        return "SELECT COUNT(1) AS articles, COALESCE(SUM(s.int_NUMBER_AVAILABLE), 0) AS quantite,"
                + " COALESCE(SUM(s.int_NUMBER_AVAILABLE * f.int_PAF), 0) AS valeurAchat,"
                + " COALESCE(SUM(s.int_NUMBER_AVAILABLE * f.int_PRICE), 0) AS valeurVente " + JOINTURES
                + predicats(recherche, familleId, seulementEnStock);
    }

    /**
     * Meme valorisation, mais ventilee par EMPLACEMENT des articles.
     *
     * <p>
     * « Emplacement » designe ici l'emplacement de l'article - son rayon, {@code t_zone_geographique} - et non le depot
     * : le depot, lui, est deja choisi. C'est le sens qu'a deja « valorisation par EMPLACEMENT » dans l'edition de
     * valorisation de l'officine, et le vocabulaire de la maison est garde tel quel.
     *
     * <p>
     * Les articles sans rayon renseigne sont regroupes sous un libelle explicite plutot que d'etre perdus : leur valeur
     * compte dans le total du depot, elle doit donc apparaitre ici aussi, sinon la somme des lignes ne ferait pas le
     * total.
     */
    static String valorisationParEmplacement(String recherche, String familleId, boolean seulementEnStock) {
        return "SELECT COALESCE(NULLIF(TRIM(z.str_LIBELLEE), ''), 'Sans emplacement') AS emplacement,"
                + " COUNT(1) AS articles, COALESCE(SUM(s.int_NUMBER_AVAILABLE), 0) AS quantite,"
                + " COALESCE(SUM(s.int_NUMBER_AVAILABLE * f.int_PAF), 0) AS valeurAchat,"
                + " COALESCE(SUM(s.int_NUMBER_AVAILABLE * f.int_PRICE), 0) AS valeurVente " + JOINTURES
                + predicats(recherche, familleId, seulementEnStock)
                + " GROUP BY emplacement ORDER BY valeurAchat DESC, emplacement";
    }
}
