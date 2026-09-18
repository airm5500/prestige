package rest.service.impl;

import org.apache.commons.lang3.StringUtils;

/**
 * Requetes du menu de pilotage (evolution 6, point 1).
 *
 * <p>
 * Un principe, et un seul : <b>les definitions sont celles que le logiciel utilise deja</b>. Le chiffre d'affaires est
 * calcule comme le tableau de bord le calcule, la marge comme l'ecran de marge la calcule, les achats comme le controle
 * des achats les compte. Deux calculs finissent toujours par diverger, et un ecran de pilotage qui annonce un chiffre
 * d'affaires different de celui de la balance ne sert plus a rien - il devient la source d'une reunion sur le chiffre
 * plutot que sur l'activite.
 *
 * <p>
 * Tout est agrege PAR MOIS en une seule passe, et non mois par mois : trois ans d'historique feraient sinon 36 requetes
 * par onglet, et le pool de connexions de l'officine ne le supporterait pas.
 *
 * <p>
 * Les filtres communs, repris a l'identique du tableau de bord existant : vente cloturee, non annulee, montant positif,
 * et le type de vente 5 (les depots) exclu.
 */
public final class PilotageSql {

    /** Type de vente exclu partout : c'est le choix deja fait par le tableau de bord et la balance. */
    public static final String TYPE_VENTE_EXCLU = "5";

    /**
     * Conditions communes aux ventes. Ecrites une fois : si l'officine change un jour de definition, elle change au
     * meme endroit pour le chiffre d'affaires, la marge et le mix de reglement.
     */
    private static final String VENTES_OU = " p.int_PRICE > 0 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0"
            + " AND p.lg_TYPE_VENTE_ID <> :typeExclu AND p.dt_UPDATED >= :debut AND p.dt_UPDATED < :fin ";

    private PilotageSql() {
    }

    /**
     * Ventes agregees par mois : chiffre d'affaires net, nombre de ventes, remises, part client et part tiers payant.
     *
     * <p>
     * Le CA est {@code int_PRICE - int_PRICE_REMISE}, exactement comme le tableau de bord : c'est le chiffre que
     * l'officine lit tous les matins, et il ne doit pas y en avoir deux.
     */
    public static String ventesParMois() {
        return "SELECT DATE_FORMAT(p.dt_UPDATED, '%Y-%m') AS mois,"
                + " SUM(p.int_PRICE - COALESCE(p.int_PRICE_REMISE, 0)) AS caTTC," + " COUNT(*) AS nbVentes,"
                + " SUM(COALESCE(p.int_PRICE_REMISE, 0)) AS remises,"
                + " SUM(CASE WHEN p.str_TYPE_VENTE = 'VO' THEN 1 ELSE 0 END) AS nbVO,"
                /*
                 * Part tiers payant : ce que le client ne paie pas au comptoir. C'est la definition de l'ecran des
                 * tiers payants (prix total moins part client), et non un calcul de plus.
                 */
                + " SUM(CASE WHEN p.str_TYPE_VENTE = 'VO'"
                + "     THEN (p.int_PRICE - COALESCE(p.int_CUST_PART, 0)) ELSE 0 END) AS partTiersPayant"
                + " FROM t_preenregistrement p" + " WHERE" + VENTES_OU + " GROUP BY mois ORDER BY mois ASC";
    }

    /**
     * Marge par mois, au niveau du DETAIL de vente : chiffre d'affaires hors taxes et cout d'achat.
     *
     * <p>
     * La formule est celle de l'ecran existant : le hors taxes est obtenu en retirant la TVA du produit ligne a ligne
     * ({@code prix / (1 + taux)}), et le cout d'achat est le prix d'achat du referentiel multiplie par la quantite
     * vendue. Le taux de marge se calcule ensuite sur le hors taxes.
     *
     * <p>
     * C'est la requete la plus lourde de l'ecran : elle passe par le detail des ventes. Elle est donc bornee a la
     * fenetre demandee et agregee en une seule passe.
     */
    public static String margeParMois() {
        return "SELECT DATE_FORMAT(p.dt_UPDATED, '%Y-%m') AS mois,"
                + " SUM((d.int_PRICE - COALESCE(d.int_PRICE_REMISE, 0)) / (1 + (v.int_VALUE / 100))) AS caHT,"
                + " SUM(f.int_PAF * d.int_QUANTITY) AS coutAchat" + " FROM t_preenregistrement_detail d"
                + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
                + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                + " JOIN t_code_tva v ON v.lg_CODE_TVA_ID = f.lg_CODE_TVA_ID" + " WHERE" + VENTES_OU
                + " GROUP BY mois ORDER BY mois ASC";
    }

    /**
     * Achats par mois : bons de livraison clotures.
     *
     * <p>
     * {@code int_HTTC} et le statut cloture, comme le compte le tableau de bord. Les bons en cours ne sont pas des
     * achats : les compter ferait apparaitre des achats qui peuvent encore etre annules.
     */
    public static String achatsParMois() {
        return "SELECT DATE_FORMAT(b.dt_UPDATED, '%Y-%m') AS mois, SUM(b.int_HTTC) AS achatTTC," + " COUNT(*) AS nbBons"
                + " FROM t_bon_livraison b"
                + " WHERE b.str_STATUT = 'is_Closed' AND b.dt_UPDATED >= :debut AND b.dt_UPDATED < :fin"
                + " GROUP BY mois ORDER BY mois ASC";
    }

    /**
     * Mix de reglement par mois : ce que chaque mode de reglement represente dans l'encaisse.
     *
     * <p>
     * La source est {@code vente_reglement}, celle-la meme que la balance et le ticket Z : le mix affiche additionne
     * donc exactement ce que la caisse a encaisse.
     */
    public static String reglementsParMois() {
        return "SELECT DATE_FORMAT(p.dt_UPDATED, '%Y-%m') AS mois, r.str_NAME AS mode," + " SUM(vr.montant) AS montant"
                + " FROM vente_reglement vr" + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = vr.vente_id"
                + " JOIN t_type_reglement r ON r.lg_TYPE_REGLEMENT_ID = vr.type_regelement" + " WHERE" + VENTES_OU
                + " GROUP BY mois, mode ORDER BY mois ASC, mode ASC";
    }

    /**
     * Totaux d'une periode, sans decoupage mensuel : c'est ce qui alimente les tuiles et leur variation.
     *
     * <p>
     * Une seule requete plutot que la somme des mois : une periode personnalisee ne commence pas forcement un 1er, et
     * additionner des mois entiers aurait fausse le total dans ce cas precis.
     */
    public static String totauxVentes() {
        return "SELECT SUM(p.int_PRICE - COALESCE(p.int_PRICE_REMISE, 0)) AS caTTC, COUNT(*) AS nbVentes,"
                + " SUM(COALESCE(p.int_PRICE_REMISE, 0)) AS remises," + " SUM(CASE WHEN p.str_TYPE_VENTE = 'VO'"
                + "     THEN (p.int_PRICE - COALESCE(p.int_CUST_PART, 0)) ELSE 0 END) AS partTiersPayant"
                + " FROM t_preenregistrement p WHERE" + VENTES_OU;
    }

    public static String totauxMarge() {
        return "SELECT SUM((d.int_PRICE - COALESCE(d.int_PRICE_REMISE, 0)) / (1 + (v.int_VALUE / 100))) AS caHT,"
                + " SUM(f.int_PAF * d.int_QUANTITY) AS coutAchat" + " FROM t_preenregistrement_detail d"
                + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
                + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                + " JOIN t_code_tva v ON v.lg_CODE_TVA_ID = f.lg_CODE_TVA_ID" + " WHERE" + VENTES_OU;
    }

    /*
     * ACHATS (vague 2)
     *
     * Deux bases de calcul, et il faut savoir laquelle on regarde :
     *
     * - SANS filtre de famille ni d'emplacement, le montant est celui de l'EN-TETE du bon (int_HTTC), comme le tableau
     * de bord et comme la tuile Achats de la synthese. Exact et comparable.
     *
     * - AVEC un filtre de famille ou d'emplacement, l'en-tete ne peut plus servir : il porte le bon entier. On
     * additionne alors les LIGNES retenues (prix d'achat x quantite recue). Mesure au banc sur un mois : 55 746 822 en
     * en-tete contre 53 385 542 en lignes, soit 4 % d'ecart - taxes et frais du bon. L'ecran DIT laquelle des deux
     * bases il affiche, faute de quoi l'officine croirait avoir perdu 4 % de ses achats en posant un filtre.
     */

    /** Conditions communes aux bons de livraison. */
    private static final String ACHATS_OU = " b.str_STATUT = 'is_Closed' AND b.dt_UPDATED >= :debut"
            + " AND b.dt_UPDATED < :fin ";

    /**
     * Achats par mois et par grossiste, au montant de l'en-tete.
     *
     * <p>
     * Le grossiste se lit par la commande ({@code t_order}), comme le fait l'ecran « Achats mensuels par grossiste » :
     * c'est la seule chaine qui relie un bon a son fournisseur.
     */
    public static String achatsParMoisEtGrossiste(String grossisteId) {
        return "SELECT DATE_FORMAT(b.dt_UPDATED, '%Y-%m') AS mois, g.lg_GROSSISTE_ID AS grossisteId,"
                + " g.str_LIBELLE AS grossiste, SUM(b.int_HTTC) AS montant, COUNT(*) AS nbBons"
                + " FROM t_bon_livraison b" + " JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID"
                + " JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID" + " WHERE" + ACHATS_OU
                + (StringUtils.isBlank(grossisteId) ? "" : " AND g.lg_GROSSISTE_ID = :grossiste ")
                + " GROUP BY mois, grossisteId, grossiste ORDER BY mois ASC, montant DESC";
    }

    /**
     * Achats par mois calcules sur les LIGNES, avec les filtres de famille et d'emplacement.
     *
     * <p>
     * La quantite retenue est la quantite RECUE : une ligne commandee mais non livree n'est pas un achat.
     */
    public static String achatsLignesParMois(String grossisteId, String familleId, String emplacementId) {
        return "SELECT DATE_FORMAT(b.dt_UPDATED, '%Y-%m') AS mois,"
                + " COALESCE(g.lg_GROSSISTE_ID, 'SANS') AS grossisteId,"
                + " COALESCE(g.str_LIBELLE, 'Sans grossiste') AS grossiste,"
                + " SUM(d.int_PAF * d.int_QTE_RECUE) AS montant, COUNT(DISTINCT b.lg_BON_LIVRAISON_ID) AS nbBons"
                + " FROM t_bon_livraison_detail d"
                + " JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID"
                + " LEFT JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                + " LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = d.lg_GROSSISTE_ID" + " WHERE" + ACHATS_OU
                + (StringUtils.isBlank(grossisteId) ? "" : " AND d.lg_GROSSISTE_ID = :grossiste ")
                + (StringUtils.isBlank(familleId) ? "" : " AND f.lg_FAMILLEARTICLE_ID = :famille ")
                + (StringUtils.isBlank(emplacementId) ? "" : " AND f.lg_ZONE_GEO_ID = :emplacement ")
                + " GROUP BY mois, grossisteId, grossiste ORDER BY mois ASC, montant DESC";
    }

    /*
     * CAISSE ET TIERS-PAYANT (vague 2)
     *
     * Trois grandeurs, trois sources, et aucune n'est recalculee :
     *
     * - le TIERS PAYANT FACTURE vient des ventes (ce que le client n'a pas paye au comptoir) ; - le TIERS PAYANT REGLE
     * vient des reglements de dossiers, a leur date de reglement ; - l'ENCAISSE vient de vente_reglement, la meme
     * source que la balance et le ticket Z.
     *
     * Le CREDIT du mois est alors le chiffre d'affaires moins l'encaisse : ce qui n'a pas ete paye au comptoir, quelle
     * qu'en soit la raison. Verifie au banc : l'ecart avec la seule part tiers payant est de 0,06 % (arrondis et
     * avoirs), ce qui confirme que les deux lectures decrivent bien la meme chose.
     */

    /** Ce que la caisse a reellement encaisse, par mois, tous modes confondus. */
    public static String encaisseParMois() {
        return "SELECT DATE_FORMAT(p.dt_UPDATED, '%Y-%m') AS mois, SUM(vr.montant) AS encaisse"
                + " FROM vente_reglement vr" + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = vr.vente_id"
                + " WHERE" + VENTES_OU + " GROUP BY mois ORDER BY mois ASC";
    }

    public static String totalEncaisse() {
        return "SELECT SUM(vr.montant) AS encaisse FROM vente_reglement vr"
                + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = vr.vente_id WHERE" + VENTES_OU;
    }

    /**
     * Tiers payant REGLE par mois, a la date du reglement.
     *
     * <p>
     * A la date du reglement et non a celle de la facture : c'est la question posee (« combien les organismes nous
     * ont-ils verse ce mois-ci »), et c'est ce que la tresorerie constate.
     */
    public static String tiersPayantRegleParMois() {
        return "SELECT DATE_FORMAT(r.dt_REGLEMENT, '%Y-%m') AS mois, SUM(r.dbl_AMOUNT) AS regle,"
                + " COUNT(*) AS nbReglements" + " FROM t_dossier_reglement r"
                + " WHERE r.dt_REGLEMENT >= :debut AND r.dt_REGLEMENT < :fin" + " GROUP BY mois ORDER BY mois ASC";
    }

    public static String totalTiersPayantRegle() {
        return "SELECT SUM(r.dbl_AMOUNT) AS regle, COUNT(*) AS nbReglements FROM t_dossier_reglement r"
                + " WHERE r.dt_REGLEMENT >= :debut AND r.dt_REGLEMENT < :fin";
    }

    /** Grossistes proposes au filtre : ceux qui ont reellement livre sur la periode regardee. */
    public static String grossistesDeLaPeriode() {
        return "SELECT DISTINCT g.lg_GROSSISTE_ID AS id, g.str_LIBELLE AS libelle" + " FROM t_bon_livraison b"
                + " JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID"
                + " JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID" + " WHERE" + ACHATS_OU
                + " ORDER BY libelle ASC";
    }

    public static String totauxAchats() {
        return "SELECT SUM(b.int_HTTC) AS achatTTC, COUNT(*) AS nbBons FROM t_bon_livraison b"
                + " WHERE b.str_STATUT = 'is_Closed' AND b.dt_UPDATED >= :debut AND b.dt_UPDATED < :fin";
    }
}
