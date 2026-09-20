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

    /** Mode de reglement « especes », tel que le logiciel le code (util.Constant.MODE_ESP). */
    private static final String MODE_ESPECES = "1";

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
    /**
     * Le GROUPE d'un grossiste, quand il en a un.
     *
     * <p>
     * Le referentiel rattache les fournisseurs a un groupe ({@code t_grossiste.groupeId} vers
     * {@code groupefournisseur}) : les cinq agences LABOREX sont un seul fournisseur du point de vue de l'officine, et
     * elles occupaient cinq colonnes dans le detail mensuel. Elles n'en occupent plus qu'une.
     *
     * <p>
     * Un grossiste SANS groupe reste lui-meme : on ne l'oblige pas a entrer dans un ensemble qui n'existe pas dans le
     * referentiel. La cle d'affichage est donc le groupe s'il y en a un, le grossiste sinon.
     */
    private static final String CLE_GROUPE = " COALESCE(CONCAT('GRP', gf.id), g.lg_GROSSISTE_ID)";

    private static final String LIBELLE_GROUPE = " COALESCE(gf.libelle, g.str_LIBELLE)";

    public static String achatsParMoisEtGrossiste(String grossisteId) {
        return "SELECT DATE_FORMAT(b.dt_UPDATED, '%Y-%m') AS mois," + CLE_GROUPE + " AS grossisteId," + LIBELLE_GROUPE
                + " AS grossiste,"
                + " GROUP_CONCAT(DISTINCT g.str_LIBELLE ORDER BY g.str_LIBELLE SEPARATOR ', ') AS membres,"
                + " SUM(b.int_HTTC) AS montant, COUNT(*) AS nbBons" + " FROM t_bon_livraison b"
                + " JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID"
                + " JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID"
                + " LEFT JOIN groupefournisseur gf ON gf.id = g.groupeId" + " WHERE" + ACHATS_OU
                /* Le filtre parle la MEME langue que l'ecran : il accepte une agence ou un groupe. */
                + (StringUtils.isBlank(grossisteId) ? ""
                        : " AND (g.lg_GROSSISTE_ID = :grossiste OR CONCAT('GRP', gf.id) = :grossiste) ")
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
                + " COALESCE(CONCAT('GRP', gf.id), g.lg_GROSSISTE_ID, 'SANS') AS grossisteId,"
                + " COALESCE(gf.libelle, g.str_LIBELLE, 'Sans grossiste') AS grossiste,"
                + " GROUP_CONCAT(DISTINCT g.str_LIBELLE ORDER BY g.str_LIBELLE SEPARATOR ', ') AS membres,"
                + " SUM(d.int_PAF * d.int_QTE_RECUE) AS montant, COUNT(DISTINCT b.lg_BON_LIVRAISON_ID) AS nbBons"
                + " FROM t_bon_livraison_detail d"
                + " JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID"
                + " LEFT JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                + " LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = d.lg_GROSSISTE_ID"
                + " LEFT JOIN groupefournisseur gf ON gf.id = g.groupeId" + " WHERE" + ACHATS_OU
                + (StringUtils.isBlank(grossisteId) ? ""
                        : " AND (d.lg_GROSSISTE_ID = :grossiste OR CONCAT('GRP', gf.id) = :grossiste) ")
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

    /*
     * STOCK ET QUALITE D'EXPLOITATION (vague 3)
     *
     * Ce que le logiciel sait du stock : ce qu'il vaut AUJOURD'HUI. Ce qu'il ne garde pas : ce qu'il valait le mois
     * dernier. Les tables d'historique de mouvements de cette officine sont vides (HMvtProduit, t_mouvement,
     * t_mouvement_snapshot, stock_snapshot), il n'y a donc rien a reconstituer a partir d'elles.
     *
     * Deux chemins, dans cet ordre de preference :
     *
     * 1. la PHOTO du mois, si elle a ete prise (pilotage_stock_mensuel) : c'est une mesure ; 2. sinon la RECONSTITUTION
     * a rebours depuis l'etat du jour, avec les entrees (lignes de bons) et les sorties (lignes de ventes) du mois -
     * toutes deux presentes. Les regularisations d'inventaire n'y figurent pas, et l'ecran le dit.
     */

    /** Emplacement de l'officine : le stock du pilotage est celui de l'officine, pas des depots d'extension. */
    public static final String EMPLACEMENT_OFFICINE = "1";

    /** Etat du stock aujourd'hui : unites, valeur d'achat, valeur de vente, ruptures, negatifs, sous seuil. */
    public static String etatStock() {
        return "SELECT COUNT(*) AS lignes, COALESCE(SUM(s.int_NUMBER_AVAILABLE), 0) AS unites,"
                /*
                 * LA VALEUR DU STOCK EST CELLE DU LOGICIEL, pas une definition de plus : articles actifs et stock
                 * positif, exactement comme la valorisation quotidienne (stock_daily_value, ecrite chaque nuit). Sans
                 * cela, l'onglet annoncerait une valeur du jour qui ne retomberait pas sur la courbe des mois
                 * precedents, qui vient, elle, de cette valorisation.
                 */
                + " COALESCE(SUM(CASE WHEN f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 0"
                + "     THEN s.int_NUMBER_AVAILABLE * f.int_PAF ELSE 0 END), 0) AS valeurAchat,"
                + " COALESCE(SUM(CASE WHEN f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 0"
                + "     THEN s.int_NUMBER_AVAILABLE * f.int_PRICE ELSE 0 END), 0) AS valeurVente,"
                + " SUM(CASE WHEN s.int_NUMBER_AVAILABLE = 0 THEN 1 ELSE 0 END) AS ruptures,"
                + " SUM(CASE WHEN s.int_NUMBER_AVAILABLE < 0 THEN 1 ELSE 0 END) AS negatifs,"
                /*
                 * « Sous le seuil » ne compte QUE les articles dont le seuil est reellement parametre : compter ceux
                 * dont le seuil vaut 0 mettrait tout le referentiel sous le seuil et l'alerte ne voudrait plus rien
                 * dire. Le nombre d'articles sans seuil est donne a part, comme un chantier a mener.
                 */
                + " SUM(CASE WHEN f.int_SEUIL_MIN > 0 AND s.int_NUMBER_AVAILABLE < f.int_SEUIL_MIN"
                + "     THEN 1 ELSE 0 END) AS sousSeuil,"
                + " SUM(CASE WHEN f.int_SEUIL_MIN IS NULL OR f.int_SEUIL_MIN = 0 THEN 1 ELSE 0 END) AS sansSeuil"
                + " FROM t_famille_stock s" + " JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID"
                + " WHERE s.lg_EMPLACEMENT_ID = :emplacement";
    }

    /** Entrees de stock par mois, valorisees au prix d'achat de la ligne du bon. */
    public static String entreesStockParMois() {
        return "SELECT DATE_FORMAT(b.dt_UPDATED, '%Y-%m') AS mois,"
                + " COALESCE(SUM(d.int_PAF * d.int_QTE_RECUE), 0) AS montant,"
                + " COALESCE(SUM(d.int_QTE_RECUE), 0) AS unites" + " FROM t_bon_livraison_detail d"
                + " JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID" + " WHERE" + ACHATS_OU
                + " GROUP BY mois ORDER BY mois ASC";
    }

    /** Sorties de stock par mois : les quantites vendues, valorisees au prix d'achat du referentiel. */
    public static String sortiesStockParMois() {
        return "SELECT DATE_FORMAT(p.dt_UPDATED, '%Y-%m') AS mois,"
                + " COALESCE(SUM(f.int_PAF * d.int_QUANTITY), 0) AS montant,"
                + " COALESCE(SUM(d.int_QUANTITY), 0) AS unites" + " FROM t_preenregistrement_detail d"
                + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
                + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID" + " WHERE" + VENTES_OU
                + " GROUP BY mois ORDER BY mois ASC";
    }

    /** Photos mensuelles deja prises. */
    /**
     * Valorisation du stock a la fin de chaque mois, prise dans la VALORISATION QUOTIDIENNE du logiciel.
     *
     * <p>
     * {@code stock_daily_value} est ecrite chaque nuit a 00h05 par le travail planifie du stock (StockDailyScheduler),
     * avec rattrapage au demarrage du serveur. Elle porte donc l'historique reel de la valeur du stock, sans que
     * personne n'ait a ouvrir un ecran - c'est exactement ce que l'onglet Stock cherchait a reconstituer.
     *
     * <p>
     * Sa cle est la date au format AAAAMMJJ ; on garde, pour chaque mois, la DERNIERE journee relevee.
     */
    public static String valeurStockParMois() {
        return "SELECT DATE_FORMAT(STR_TO_DATE(CAST(v.id AS CHAR), '%Y%m%d'), '%Y-%m') AS mois,"
                + " v.valeur_achat AS valeurAchat, v.valeur_vente AS valeurVente, v.id AS jour"
                + " FROM stock_daily_value v"
                + " JOIN (SELECT MAX(id) AS dernier FROM stock_daily_value WHERE id >= :jourDebut AND id < :jourFin"
                + "     GROUP BY FLOOR(id / 100)) d ON d.dernier = v.id" + " ORDER BY v.id ASC";
    }

    public static String photosStock() {
        return "SELECT p.str_MOIS AS mois, p.int_UNITES AS unites, p.int_VALEUR_ACHAT AS valeurAchat,"
                + " p.int_VALEUR_VENTE AS valeurVente, p.int_REFERENCES AS refs, p.int_RUPTURES AS ruptures,"
                + " p.int_NEGATIFS AS negatifs, p.int_SOUS_SEUIL AS sousSeuil" + " FROM pilotage_stock_mensuel p"
                + " WHERE p.lg_EMPLACEMENT_ID = :emplacement AND p.str_MOIS >= :moisDebut"
                + " AND p.str_MOIS <= :moisFin ORDER BY p.str_MOIS ASC";
    }

    /**
     * Stock dormant : en stock, et pas une seule vente depuis la date donnee.
     *
     * <p>
     * C'est l'argent qui dort sur les etageres. La requete ne compte que ce qui a du stock : un article a zero qui ne
     * se vend pas n'immobilise rien.
     */
    public static String stockDormant() {
        return "SELECT COUNT(*) AS lignes, COALESCE(SUM(s.int_NUMBER_AVAILABLE * f.int_PAF), 0) AS valeurAchat"
                + " FROM t_famille_stock s" + " JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID"
                + " WHERE s.lg_EMPLACEMENT_ID = :emplacement AND s.int_NUMBER_AVAILABLE > 0"
                + " AND NOT EXISTS (SELECT 1 FROM t_preenregistrement_detail d"
                + "     JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
                + "     WHERE d.lg_FAMILLE_ID = s.lg_FAMILLE_ID AND p.str_STATUT = 'is_Closed'"
                + "     AND p.b_IS_CANCEL = 0 AND p.dt_UPDATED >= :depuis)";
    }

    /**
     * Produits dont un lot en stock perime dans les six mois qui viennent.
     *
     * <p>
     * La meme lecture que la cloche de notifications, ramenee a un seul nombre : combien de REFERENCES ont, en rayon,
     * un lot qui tourne a la date. Un lot deja perime n'est plus une echeance mais une perte, et il est compte ailleurs
     * ; on ne retient donc que ce qui expire entre aujourd'hui et six mois.
     *
     * <p>
     * La quantite se lit comme partout ailleurs dans le logiciel : le stock suivi du lot s'il existe, le nombre recu
     * sinon.
     */
    public static String peremptionsProches() {
        return "SELECT COUNT(DISTINCT l.lg_FAMILLE_ID) AS produits, COUNT(*) AS lots,"
                + " COALESCE(SUM(IFNULL(l.current_stock, l.int_NUMBER) * f.int_PAF), 0) AS valeurAchat"
                + " FROM t_lot l" + " JOIN t_famille f ON f.lg_FAMILLE_ID = l.lg_FAMILLE_ID"
                + " WHERE l.str_STATUT = 'enable' AND l.dt_PEREMPTION IS NOT NULL"
                + " AND IFNULL(l.current_stock, l.int_NUMBER) > 0" + " AND DATE(l.dt_PEREMPTION) >= CURDATE()"
                + " AND DATE(l.dt_PEREMPTION) < DATE_ADD(CURDATE(), INTERVAL 6 MONTH)";
    }

    /**
     * Anomalies de referentiel qui salissent les chiffres : pas de prix, pas de rayon, pas de seuil.
     *
     * <p>
     * Un article en stock sans prix d'achat fausse toute valorisation ; sans rayon, il echappe aux inventaires
     * tournants ; sans seuil, il n'entre dans aucune suggestion de reappro. Ce sont trois chantiers concrets.
     */
    public static String anomaliesReferentiel() {
        return "SELECT" + " SUM(CASE WHEN f.int_PAF IS NULL OR f.int_PAF = 0 THEN 1 ELSE 0 END) AS sansPrixAchat,"
                + " SUM(CASE WHEN f.int_PRICE IS NULL OR f.int_PRICE = 0 THEN 1 ELSE 0 END) AS sansPrixVente,"
                + " SUM(CASE WHEN f.lg_ZONE_GEO_ID IS NULL OR f.lg_ZONE_GEO_ID = '' THEN 1 ELSE 0 END)"
                + "     AS sansRayon,"
                + " SUM(CASE WHEN f.int_SEUIL_MIN IS NULL OR f.int_SEUIL_MIN = 0 THEN 1 ELSE 0 END) AS sansSeuil,"
                + " COUNT(*) AS enStock" + " FROM t_famille_stock s"
                + " JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID"
                + " WHERE s.lg_EMPLACEMENT_ID = :emplacement AND s.int_NUMBER_AVAILABLE > 0";
    }

    /**
     * Ventes annulees par mois : nombre et montant.
     *
     * <p>
     * Les annulations ne sont pas une anomalie en soi - une vente se corrige - mais leur part dans l'activite se
     * surveille : elle monte quand une caisse tatonne ou qu'un parcours coince.
     */
    /*
     * VENTES ANNULEES : la definition est celle de l'etat « LISTE DES VENTES ANNULEES » du logiciel, et non une
     * definition de plus. Trois points, et ils expliquent a eux seuls l'ecart constate par l'officine le 19/09 :
     *
     * - une annulation compte dans le mois de sa DATE D'ANNULATION (dt_ANNULER), pas dans celui de la vente : une vente
     * de juillet annulee en aout est une annulation d'aout ; - seules les ventes CLOTUREES sont comptees (str_STATUT =
     * 'is_Closed'), comme dans l'etat ; - le MONTANT ANNULE est le montant de la vente (int_PRICE, soit VO + VNO du
     * pied de l'etat). Le « MONTANT ESPECE » de l'etat est autre chose : la part reglee en especes, donc ce qui sort
     * reellement du tiroir. Les deux sont rendus, l'un a cote de l'autre, pour que l'ecran et l'etat se rapprochent
     * ligne a ligne.
     *
     * Une annulation sans date d'annulation enregistree n'est comptee dans aucun mois - c'est deja le comportement de
     * l'etat, et en changer ici ferait diverger les deux.
     */
    private static final String ANNULATIONS_OU = " p.b_IS_CANCEL = 1 AND p.str_STATUT = 'is_Closed'"
            + " AND p.dt_ANNULER >= :debut AND p.dt_ANNULER < :fin ";

    public static String annulationsParMois() {
        return "SELECT DATE_FORMAT(p.dt_ANNULER, '%Y-%m') AS mois, COUNT(*) AS nbAnnulees,"
                + " COALESCE(SUM(p.int_PRICE), 0) AS montantAnnule" + " FROM t_preenregistrement p" + " WHERE"
                + ANNULATIONS_OU + " GROUP BY mois ORDER BY mois ASC";
    }

    /**
     * CONTROLE D'INTEGRITE des agregats : le nombre de ventes et le chiffre d'affaires de chaque mois, en une seule
     * lecture.
     *
     * <p>
     * Un mois clos ne change plus... tant que personne n'y touche. Or l'officine corrige : une vente annulee apres
     * coup, un bon d'assurance saisi en retard, une vente d'un jour passe modifiee. Un agregat calcule la veille serait
     * alors faux, et rien ne le dirait.
     *
     * <p>
     * Cette requete est le garde-fou : elle rend, pour chaque mois de la fenetre, ce que la base dit AUJOURD'HUI. Le
     * service la compare aux agregats enregistres et ne recalcule que les mois qui ont bouge. Une seule lecture
     * agregee, sur l'index de dates - la ou le calcul complet d'un mois en demande huit.
     *
     * <p>
     * Ce qu'elle voit : une vente ajoutee, supprimee, annulee, ou dont le montant a change. Ce qu'elle ne voit pas :
     * une correction qui ne touche ni le nombre de ventes ni le chiffre d'affaires - un mode de reglement change, par
     * exemple. Pour celles-la, il reste la reprise quotidienne des deux derniers mois clos et le bouton « Recalculer ».
     */
    public static String empreinteParMois() {
        return "SELECT DATE_FORMAT(p.dt_UPDATED, '%Y-%m') AS mois, COUNT(*) AS nbVentes,"
                + " SUM(p.int_PRICE - COALESCE(p.int_PRICE_REMISE, 0)) AS caTTC" + " FROM t_preenregistrement p"
                + " WHERE" + VENTES_OU + " GROUP BY mois ORDER BY mois ASC";
    }

    /** Meme controle, mais journee par journee : c'est ainsi que le mois en cours est verifie. */
    public static String empreinteParJour() {
        return "SELECT DATE(p.dt_UPDATED) AS jour, COUNT(*) AS nbVentes,"
                + " SUM(p.int_PRICE - COALESCE(p.int_PRICE_REMISE, 0)) AS caTTC" + " FROM t_preenregistrement p"
                + " WHERE" + VENTES_OU + " GROUP BY jour ORDER BY jour ASC";
    }

    public static String totalAnnulations() {
        return "SELECT COUNT(*) AS nbAnnulees, COALESCE(SUM(p.int_PRICE), 0) AS montantAnnule"
                + " FROM t_preenregistrement p" + " WHERE" + ANNULATIONS_OU;
    }

    /**
     * Part des annulations reglee en ESPECES : le « MONTANT ESPECE » du pied de l'etat des ventes annulees.
     *
     * <p>
     * C'est l'argent qui sort reellement du tiroir quand une vente est annulee ; le montant annule, lui, comprend aussi
     * le tiers payant et les reglements qui ne passent pas par la caisse. Les confondre, c'est se demander pourquoi
     * l'ecran et l'etat ne disent pas la meme chose.
     */
    public static String totalAnnulationsEspece() {
        return "SELECT COALESCE(SUM(m.montantPaye), 0) AS montantEspece" + " FROM mvttransaction m"
                + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = m.pkey" + " WHERE" + ANNULATIONS_OU
                + " AND m.montantPaye > 0 AND m.typeReglementId = '" + MODE_ESPECES + "'";
    }

    /*
     * COMPARATEUR ET KPI (vague 4)
     *
     * Deux besoins exprimes le 18/09 : « 2 periodes et aussi 2 objets, ce sera au choix - je peux par exemple comparer
     * les achats aux ventes sur une periode », et « on devra avoir tous les KPI cochables ; celui qui est coche fera
     * l'objet de l'analyse sur le selecteur de periode choisi et on verra sa courbe d'evolution ».
     *
     * Le comparateur d'objets se ramene a une seule question : la MEME grandeur, sur la meme periode, restreinte a deux
     * perimetres differents. Une seule requete parametree suffit donc, et c'est la garantie que les deux colonnes
     * comparees sont calculees de la meme facon - comparer deux chiffres obtenus par deux requetes differentes est le
     * meilleur moyen de conclure a un ecart qui n'existe pas.
     */

    /**
     * Ventes par mois, restreintes a une famille ou a un rayon.
     *
     * <p>
     * Au niveau du DETAIL de vente, seul endroit ou l'on sait quel article a ete vendu : l'en-tete de vente ne porte ni
     * famille ni rayon. Le chiffre d'affaires est donc la somme des lignes, ce qui est exactement la grandeur
     * comparable entre deux familles.
     */
    public static String ventesLignesParMois(String familleId, String rayonId) {
        return "SELECT DATE_FORMAT(p.dt_UPDATED, '%Y-%m') AS mois,"
                + " COALESCE(SUM(d.int_PRICE - COALESCE(d.int_PRICE_REMISE, 0)), 0) AS caTTC,"
                + " COALESCE(SUM(d.int_QUANTITY), 0) AS unites,"
                + " COALESCE(SUM((d.int_PRICE - COALESCE(d.int_PRICE_REMISE, 0)) / (1 + (v.int_VALUE / 100))"
                + "     - (f.int_PAF * d.int_QUANTITY)), 0) AS marge" + " FROM t_preenregistrement_detail d"
                + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
                + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                + " JOIN t_code_tva v ON v.lg_CODE_TVA_ID = f.lg_CODE_TVA_ID" + " WHERE" + VENTES_OU
                + (StringUtils.isBlank(familleId) ? "" : " AND f.lg_FAMILLEARTICLE_ID = :famille ")
                + (StringUtils.isBlank(rayonId) ? "" : " AND f.lg_ZONE_GEO_ID = :emplacement ")
                + " GROUP BY mois ORDER BY mois ASC";
    }

    /**
     * Frequentation horaire : les ventes et le chiffre d'affaires par heure de la journee, sur la periode.
     *
     * <p>
     * Le seul indicateur de cet ecran qui ne se lit pas par mois : il repond a « a quelle heure les gens viennent-ils
     * », et sert a placer les equipes. Le decouper par mois n'aurait aucun sens ; il porte donc sur la periode entiere.
     */
    public static String frequentationHoraire() {
        return "SELECT HOUR(p.dt_UPDATED) AS heure, COUNT(*) AS nbVentes,"
                + " COALESCE(SUM(p.int_PRICE - COALESCE(p.int_PRICE_REMISE, 0)), 0) AS caTTC"
                + " FROM t_preenregistrement p WHERE" + VENTES_OU + " GROUP BY heure ORDER BY heure ASC";
    }

    /**
     * Grossistes proposes au filtre : ceux qui ont reellement livre sur la periode regardee, GROUPES.
     *
     * <p>
     * La liste doit nommer les memes fournisseurs que les colonnes du detail mensuel : proposer « LABOREX-CI YOP »
     * alors que le tableau affiche « LABOREX-CI » ferait choisir une agence et croire a un filtre sans effet.
     */
    public static String grossistesDeLaPeriode() {
        return "SELECT DISTINCT" + CLE_GROUPE + " AS id," + LIBELLE_GROUPE + " AS libelle" + " FROM t_bon_livraison b"
                + " JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID"
                + " JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID"
                + " LEFT JOIN groupefournisseur gf ON gf.id = g.groupeId" + " WHERE" + ACHATS_OU
                + " ORDER BY libelle ASC";
    }

    public static String totauxAchats() {
        return "SELECT SUM(b.int_HTTC) AS achatTTC, COUNT(*) AS nbBons FROM t_bon_livraison b"
                + " WHERE b.str_STATUT = 'is_Closed' AND b.dt_UPDATED >= :debut AND b.dt_UPDATED < :fin";
    }
}
