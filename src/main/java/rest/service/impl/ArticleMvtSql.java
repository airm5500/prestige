package rest.service.impl;

import rest.service.dto.ArticleMvtFilter;

/**
 * Construction du SQL de l'ecran "Articles en mouvement".
 *
 * <p>
 * Regle structurante : <b>une seule ligne par article</b>. Les mouvements ne sont donc jamais joints a plat, ils sont
 * interroges par EXISTS (filtrage) et par sous-requete correlee (libelles des types rencontres). Un article qui a eu
 * une vente, une entree et un ajustement sur la periode reste une ligne unique, avec ses trois types affiches.
 * </p>
 *
 * <p>
 * Les parametres sont <b>nommes</b> et non ordinaux : les clauses etant optionnelles, des parametres ordinaux
 * laisseraient des trous dans la numerotation, ce que Hibernate refuse ("Unexpected gap in ordinal parameter labels").
 * </p>
 */
final class ArticleMvtSql {

    static final String P_DEBUT = "dtStart";
    static final String P_FIN = "dtEnd";
    static final String P_RECHERCHE = "recherche";
    static final String P_TYPE_MVT = "typeMvt";
    static final String P_EMPLACEMENT = "emplacement";
    static final String P_FAMILLE = "famille";

    /** Sous-requete des types de mouvement rencontres, concatenes pour tenir sur la ligne unique de l'article. */
    private static final String TYPES_MVT = " (SELECT GROUP_CONCAT(DISTINCT tm.description ORDER BY tm.description"
            + " SEPARATOR ', ') FROM hmvtproduit ht JOIN typemvtproduit tm ON tm.ID = ht.typeMvt"
            + " WHERE ht.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND ht.mvtdate >= :" + P_DEBUT + " AND ht.mvtdate < :" + P_FIN
            + ") AS typesMvt ";

    private static final String COLONNES = "SELECT f.lg_FAMILLE_ID AS lgFamilleId,"
            + " CAST(f.int_CIP AS CHAR) AS codeCip, f.str_NAME AS strName, f.int_PRICE AS prixVente,"
            + " f.int_PAF AS prixAchat, z.str_LIBELLEE AS emplacement, fa.str_LIBELLE AS famille, " + TYPES_MVT;

    private static final String JOINTURES = " FROM t_famille f"
            + " LEFT JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID"
            + " LEFT JOIN t_famillearticle fa ON fa.lg_FAMILLEARTICLE_ID = f.lg_FAMILLEARTICLE_ID ";

    private ArticleMvtSql() {
    }

    /**
     * Clauses communes a la liste, au comptage et a la creation d'inventaire : c'est ce qui garantit que la liste
     * affichee, le total pagine et l'inventaire cree portent exactement sur le meme ensemble d'articles.
     */
    private static String predicats(ArticleMvtFilter filtre) {
        StringBuilder sb = new StringBuilder(" WHERE EXISTS ( SELECT 1 FROM hmvtproduit h"
                + " WHERE h.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND h.mvtdate >= :" + P_DEBUT + " AND h.mvtdate < :"
                + P_FIN);
        if (filtre.typeMvtOuNull() != null) {
            sb.append(" AND h.typeMvt = :").append(P_TYPE_MVT);
        }
        sb.append(" ) ");
        if (filtre.rechercheLike() != null) {
            sb.append(" AND ( CAST(f.int_CIP AS CHAR) LIKE :").append(P_RECHERCHE).append(" OR f.str_NAME LIKE :")
                    .append(P_RECHERCHE).append(" ) ");
        }
        if (filtre.emplacementOuNull() != null) {
            sb.append(" AND f.lg_ZONE_GEO_ID = :").append(P_EMPLACEMENT).append(' ');
        }
        if (filtre.familleOuNull() != null) {
            sb.append(" AND f.lg_FAMILLEARTICLE_ID = :").append(P_FAMILLE).append(' ');
        }
        return sb.toString();
    }

    static String liste(ArticleMvtFilter filtre) {
        return COLONNES + JOINTURES + predicats(filtre) + " ORDER BY f.str_NAME";
    }

    static String comptage(ArticleMvtFilter filtre) {
        return "SELECT COUNT(1) " + JOINTURES + predicats(filtre);
    }

    /** Identifiants seuls : utilise pour creer l'inventaire de toute la liste filtree, sans ramener les libelles. */
    static String identifiants(ArticleMvtFilter filtre) {
        return "SELECT f.lg_FAMILLE_ID " + JOINTURES + predicats(filtre) + " ORDER BY f.str_NAME";
    }
}
