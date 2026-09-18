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
public final class DepotStockSql {

    static final String P_DEPOT = "depot";
    static final String P_RECHERCHE = "recherche";
    static final String P_FAMILLE = "famille";
    static final String P_ZONE = "zone";

    /**
     * Filtre sur le stock, premiere forme (retour du 17/09) : trois categories correspondant aux trois couleurs de la
     * liste - rouge pour un stock negatif, violet pour un stock a zero, normal pour un stock positif.
     *
     * <p>
     * Conservees : l'officine a demande le 18/09 un OPERATEUR et une valeur, ce qui les englobe (« &lt; 0 », « = 0 », «
     * &gt; 0 »), mais des appels et des editions existants les emploient encore. Elles sont traduites en couple
     * (operateur, valeur) a l'entree, et le SQL ne connait plus que ce couple : une seule facon de filtrer, donc une
     * seule facon de se tromper.
     */
    static final String TOUS = "TOUS";
    static final String NEGATIF = "NEGATIF";
    static final String ZERO = "ZERO";
    static final String POSITIF = "POSITIF";

    /**
     * Operateurs de comparaison du filtre de stock (retour du 18/09 : « le filtre stock doit avoir un operateur et une
     * zone de stock a filtrer »).
     *
     * <p>
     * Les libelles sont des CODES et non les signes eux-memes : un « &lt; » qui voyage dans une URL puis dans du SQL
     * est une porte ouverte, et un code refuse toute valeur qui n'est pas dans cette liste.
     */
    static final String OP_EGAL = "EQ";
    static final String OP_DIFFERENT = "NE";
    static final String OP_INFERIEUR = "LT";
    static final String OP_INFERIEUR_EGAL = "LE";
    static final String OP_SUPERIEUR = "GT";
    static final String OP_SUPERIEUR_EGAL = "GE";

    /** Le signe SQL d'un operateur, ou null si l'operateur n'est pas reconnu. Aucune autre valeur n'atteint le SQL. */
    static String signe(String operateur) {
        if (operateur == null) {
            return null;
        }
        switch (operateur.trim().toUpperCase()) {
        case OP_EGAL:
            return "=";
        case OP_DIFFERENT:
            return "<>";
        case OP_INFERIEUR:
            return "<";
        case OP_INFERIEUR_EGAL:
            return "<=";
        case OP_SUPERIEUR:
            return ">";
        case OP_SUPERIEUR_EGAL:
            return ">=";
        default:
            return null;
        }
    }

    /** Libelle lisible du filtre, pour le rappel des criteres d'une edition. */
    static String libelleOperateur(String operateur) {
        String s = signe(operateur);
        return s == null ? "" : s;
    }

    private static final String COLONNES = "SELECT f.lg_FAMILLE_ID AS id, CAST(f.int_CIP AS CHAR) AS cip,"
            + " f.str_NAME AS nom, fa.str_LIBELLE AS famille, z.str_LIBELLEE AS emplacement,"
            + " s.int_NUMBER_AVAILABLE AS stock, f.int_PAF AS prixAchat, f.int_PRICE AS prixVente ";

    private static final String JOINTURES = " FROM t_famille_stock s"
            + " JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID"
            + " LEFT JOIN t_famillearticle fa ON fa.lg_FAMILLEARTICLE_ID = f.lg_FAMILLEARTICLE_ID"
            + " LEFT JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID ";

    private DepotStockSql() {
    }

    /** Filtre reellement applique : une valeur inconnue vaut « tous », jamais une erreur SQL. */
    static String normaliserFiltre(String filtreStock) {
        if (StringUtils.isBlank(filtreStock)) {
            return TOUS;
        }
        String f = filtreStock.trim().toUpperCase();
        if (NEGATIF.equals(f) || ZERO.equals(f) || POSITIF.equals(f)) {
            return f;
        }
        return TOUS;
    }

    /**
     * Clauses communes a la liste, au comptage et a la valorisation : c'est ce qui garantit que le total affiche porte
     * exactement sur les lignes affichees.
     */
    private static String predicats(Criteres c) {
        StringBuilder sb = new StringBuilder(" WHERE s.lg_EMPLACEMENT_ID = :" + P_DEPOT
                + " AND s.str_STATUT = 'enable' AND f.str_STATUT = 'enable' ");
        if (StringUtils.isNotBlank(c.recherche)) {
            sb.append(" AND ( CAST(f.int_CIP AS CHAR) LIKE :").append(P_RECHERCHE).append(" OR f.str_NAME LIKE :")
                    .append(P_RECHERCHE).append(" ) ");
        }
        if (StringUtils.isNotBlank(c.familleId)) {
            sb.append(" AND f.lg_FAMILLEARTICLE_ID = :").append(P_FAMILLE).append(' ');
        }
        if (StringUtils.isNotBlank(c.zoneGeoId)) {
            // Emplacement de l'ARTICLE (son rayon), pas le depot : le depot est deja choisi en haut de l'ecran.
            sb.append(" AND f.lg_ZONE_GEO_ID = :").append(P_ZONE).append(' ');
        }
        /*
         * Un SEUL chemin pour le filtre de stock : le couple (operateur, valeur). Les trois anciennes categories y sont
         * traduites a l'entree (cf. DepotExtensionService.criteresDe), il n'y a donc pas deux facons de filtrer qui
         * pourraient diverger.
         *
         * Le signe vient de signe() et jamais de l'appelant : une valeur inconnue rend null et le filtre est simplement
         * ignore. La valeur comparee est un ENTIER deja converti, elle ne peut pas porter de SQL.
         */
        String operateur = signe(c.operateurStock);
        if (operateur != null) {
            sb.append(" AND s.int_NUMBER_AVAILABLE ").append(operateur).append(' ')
                    .append(c.valeurStock == null ? 0 : c.valeurStock.intValue()).append(' ');
        } else if (c.masquerLesZeros) {
            // Un depot d'extension partage le referentiel articles de l'officine : avec cette case,
            // la liste ne sort pas les milliers d'articles que le depot ne detient pas. Un stock
            // NEGATIF reste visible, c'est une anomalie a voir.
            //
            // La case n'a d'effet que quand le filtre de stock est sur « tous » : les deux se
            // contrediraient sinon (masquer les zeros ET ne garder que les zeros ne ramenerait
            // jamais rien), et l'ecran grise la case des qu'un filtre est choisi.
            sb.append(" AND s.int_NUMBER_AVAILABLE <> 0 ");
        }
        return sb.toString();
    }

    /**
     * Criteres de la valorisation, portes ensemble : ils doivent etre identiques d'une requete a l'autre - liste,
     * comptage, valorisation, ventilation, Excel et PDF. C'est ce qui garantit qu'un total correspond bien aux lignes
     * affichees, et que l'edition dit la meme chose que l'ecran.
     *
     * <p>
     * Publique parce que la couche REST la transporte, immuable parce qu'elle traverse plusieurs requetes.
     */
    public static final class Criteres {
        public final String recherche;
        public final String familleId;
        public final String zoneGeoId;
        /** Ancienne forme du filtre (TOUS / NEGATIF / ZERO / POSITIF), conservee pour le rappel des criteres. */
        public final String filtreStock;
        /** Operateur de comparaison du stock (EQ, NE, LT, LE, GT, GE), ou null pour aucun filtre. */
        public final String operateurStock;
        /** Valeur comparee, entiere. Null vaut zero. */
        public final Integer valeurStock;
        public final boolean masquerLesZeros;

        /**
         * Forme heritee : les categories TOUS / NEGATIF / ZERO / POSITIF.
         *
         * <p>
         * La traduction en couple (operateur, valeur) est faite ICI, dans le constructeur, et non seulement a l'entree
         * du service : tout appelant qui construit ses criteres directement - un test, une edition, un futur service -
         * obtient ainsi exactement le meme filtre. Les avoir traduites plus haut seulement aurait fait perdre le filtre
         * a ces appels, silencieusement, en rendant simplement plus de lignes.
         */
        public Criteres(String recherche, String familleId, String zoneGeoId, String filtreStock,
                boolean masquerLesZeros) {
            this(recherche, familleId, zoneGeoId, filtreStock, operateurDeLaCategorie(filtreStock),
                    valeurDeLaCategorie(filtreStock), masquerLesZeros);
        }

        private static String operateurDeLaCategorie(String filtreStock) {
            String categorie = normaliserFiltre(filtreStock);
            if (NEGATIF.equals(categorie)) {
                return OP_INFERIEUR;
            }
            if (ZERO.equals(categorie)) {
                return OP_EGAL;
            }
            if (POSITIF.equals(categorie)) {
                return OP_SUPERIEUR;
            }
            return null;
        }

        private static Integer valeurDeLaCategorie(String filtreStock) {
            return operateurDeLaCategorie(filtreStock) == null ? null : Integer.valueOf(0);
        }

        public Criteres(String recherche, String familleId, String zoneGeoId, String filtreStock, String operateurStock,
                Integer valeurStock, boolean masquerLesZeros) {
            this.recherche = recherche;
            this.familleId = familleId;
            this.zoneGeoId = zoneGeoId;
            this.filtreStock = filtreStock;
            this.operateurStock = operateurStock;
            this.valeurStock = valeurStock;
            this.masquerLesZeros = masquerLesZeros;
        }
    }

    /**
     * Ordre de la liste des articles : par emplacement puis par designation.
     *
     * <p>
     * Demande de l'officine sur les editions de reserve, reprise ici pour que l'ecran et l'edition disent la meme chose
     * : on releve un stock rayon par rayon, pas en parcourant l'officine dans l'ordre alphabetique des medicaments. Les
     * articles sans rayon passent en dernier, sinon leur libelle vide les placerait en tete.
     */
    private static final String ORDRE = " ORDER BY CASE WHEN TRIM(COALESCE(z.str_LIBELLEE, '')) = '' THEN 1 ELSE 0 END,"
            + " z.str_LIBELLEE, f.str_NAME ";

    static String liste(Criteres c) {
        return COLONNES + JOINTURES + predicats(c) + ORDRE;
    }

    static String comptage(Criteres c) {
        return "SELECT COUNT(1) " + JOINTURES + predicats(c);
    }

    /**
     * Valorisation du stock du depot : nombre d'articles, quantite detenue, et valeur au prix d'achat comme au prix de
     * vente. Calculee par la base sur l'ensemble des lignes, et non par addition de la page affichee.
     */
    static String valorisation(Criteres c) {
        return "SELECT COUNT(1) AS articles, COALESCE(SUM(s.int_NUMBER_AVAILABLE), 0) AS quantite,"
                + " COALESCE(SUM(s.int_NUMBER_AVAILABLE * f.int_PAF), 0) AS valeurAchat,"
                + " COALESCE(SUM(s.int_NUMBER_AVAILABLE * f.int_PRICE), 0) AS valeurVente " + JOINTURES + predicats(c);
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
    static String valorisationParEmplacement(Criteres c) {
        return "SELECT COALESCE(NULLIF(TRIM(z.str_LIBELLEE), ''), 'Sans emplacement') AS emplacement,"
                + " COUNT(1) AS articles, COALESCE(SUM(s.int_NUMBER_AVAILABLE), 0) AS quantite,"
                + " COALESCE(SUM(s.int_NUMBER_AVAILABLE * f.int_PAF), 0) AS valeurAchat,"
                + " COALESCE(SUM(s.int_NUMBER_AVAILABLE * f.int_PRICE), 0) AS valeurVente " + JOINTURES + predicats(c)
                + " GROUP BY emplacement ORDER BY valeurAchat DESC, emplacement";
    }
}
