package rest.service.impl;

/**
 * Ordres SQL de la cloture d'inventaire, ecrits une fois pour tout l'inventaire (retour du 13/09).
 *
 * <p>
 * Ils reprennent, ligne pour ligne, ce que faisait la procedure stockee {@code proc_clotureinentaire} de l'ancien ecran
 * : stock rayon, stock par type, date du dernier inventaire du produit, mouvement du jour cumule ({@code t_mouvement},
 * action INVENTAIRE) et instantane du jour ({@code t_mouvement_snapshot}), lignes avec ecart passees a « is_Closed ».
 * S'y ajoute l'historique {@code HMvtProduit} que les ecrans REST lisent. Tout est ensembliste : la duree ne depend
 * plus du nombre de lignes traitees une par une.
 * </p>
 *
 * <p>
 * Parametres nommes : :inventaire, :emplacement, :utilisateur, :typeStock (les ordres n'en posent que ceux qu'ils
 * citent). « Ligne avec ecart » = ligne retenue ({@code bool_INVENTAIRE = 1}) dont la quantite comptee differe de la
 * quantite initiale.
 * </p>
 */
public final class ClotureInventaireSql {

    private ClotureInventaireSql() {
    }

    private static final String LIGNES_AVEC_ECART = " i.lg_INVENTAIRE_ID = :inventaire AND i.bool_INVENTAIRE = 1"
            + " AND i.int_NUMBER <> i.int_NUMBER_INIT";

    /** Stock rayon des lignes avec ecart : quantite comptee. */
    public static final String STOCK_RAYON = "UPDATE t_famille_stock s JOIN t_inventaire_famille i"
            + " ON i.lg_FAMILLE_STOCK_ID = s.lg_FAMILLE_STOCK_ID"
            + " SET s.int_NUMBER = i.int_NUMBER, s.int_NUMBER_AVAILABLE = i.int_NUMBER, s.dt_UPDATED = NOW()" + " WHERE"
            + LIGNES_AVEC_ECART;

    /**
     * Stock par type (:typeStock : 1 rayon officine, 3 rayon autre emplacement, 2 reserve) de l'emplacement
     * :emplacement.
     */
    public static final String STOCK_PAR_TYPE = "UPDATE t_type_stock_famille t JOIN t_inventaire_famille i"
            + " ON i.lg_FAMILLE_ID = t.lg_FAMILLE_ID" + " SET t.int_NUMBER = i.int_NUMBER, t.dt_UPDATED = NOW()"
            + " WHERE" + LIGNES_AVEC_ECART
            + " AND t.lg_TYPE_STOCK_ID = :typeStock AND t.lg_EMPLACEMENT_ID = :emplacement"
            + " AND t.str_STATUT = 'enable'";

    /** Date du dernier inventaire du produit, comme la procedure. */
    public static final String DERNIER_INVENTAIRE = "UPDATE t_famille f JOIN t_inventaire_famille i"
            + " ON i.lg_FAMILLE_ID = f.lg_FAMILLE_ID SET f.dt_LAST_INVENTAIRE = NOW() WHERE" + LIGNES_AVEC_ECART;

    /**
     * Historique lu par les ecrans REST : une ligne par ligne retenue, comme avant (:emplacement emplacement,
     * :utilisateur user).
     */
    public static final String HISTORIQUE = "INSERT INTO HMvtProduit (uuid, checked, createdAt, mvtdate, pkey,"
            + " prixAchat, prixUn, qteDebut, qteFinale, qteMvt, valeurTva, lg_EMPLACEMENT_ID, lg_FAMILLE_ID,"
            + " lg_USER_ID, typeMvt, ug)"
            + " SELECT UUID(), 1, NOW(), CURDATE(), CAST(i.lg_INVENTAIRE_FAMILLE_ID AS CHAR),"
            + " IFNULL(f.int_PAF, 0), IFNULL(f.int_PRICE, 0), i.int_NUMBER_INIT, i.int_NUMBER, i.int_NUMBER, 0,"
            + " :emplacement, i.lg_FAMILLE_ID, :utilisateur, '04', 0"
            + " FROM t_inventaire_famille i JOIN t_famille f ON f.lg_FAMILLE_ID = i.lg_FAMILLE_ID"
            + " WHERE i.lg_INVENTAIRE_ID = :inventaire AND i.bool_INVENTAIRE = 1";

    /**
     * Mouvement du jour deja present pour le produit : cumul, comme la procedure (:emplacement emplacement,
     * :utilisateur user).
     */
    public static final String MOUVEMENT_CUMUL = "UPDATE t_mouvement m"
            + " JOIN (SELECT MIN(x.lg_MOUVEMENT_ID) AS id, x.lg_FAMILLE_ID FROM t_mouvement x"
            + "       WHERE x.dt_DAY = CURDATE() AND x.lg_USER_ID = :utilisateur AND x.str_ACTION = 'INVENTAIRE'"
            + "       AND x.lg_EMPLACEMENT_ID = :emplacement GROUP BY x.lg_FAMILLE_ID) p ON p.id = m.lg_MOUVEMENT_ID"
            + " JOIN t_inventaire_famille i ON i.lg_FAMILLE_ID = p.lg_FAMILLE_ID"
            + " SET m.int_NUMBERTRANSACTION = m.int_NUMBERTRANSACTION + 1, m.int_NUMBER = m.int_NUMBER + i.int_NUMBER,"
            + " m.dt_UPDATED = NOW()" + " WHERE" + LIGNES_AVEC_ECART;

    /** Mouvement du jour absent pour le produit : creation, comme la procedure. */
    public static final String MOUVEMENT_CREATION = "INSERT INTO t_mouvement (lg_MOUVEMENT_ID, lg_FAMILLE_ID,"
            + " lg_USER_ID, P_KEY, str_TYPE_ACTION, str_ACTION, dt_DAY, dt_CREATED, str_STATUT, int_NUMBER,"
            + " int_NUMBERTRANSACTION, lg_EMPLACEMENT_ID)"
            + " SELECT UUID(), i.lg_FAMILLE_ID, :utilisateur, '', 'OTHER', 'INVENTAIRE', CURDATE(), NOW(), 'enable',"
            + " i.int_NUMBER, 1, :emplacement FROM t_inventaire_famille i WHERE" + LIGNES_AVEC_ECART
            + " AND NOT EXISTS (SELECT 1 FROM t_mouvement m WHERE m.dt_DAY = CURDATE()"
            + " AND m.lg_FAMILLE_ID = i.lg_FAMILLE_ID AND m.lg_USER_ID = :utilisateur AND m.str_ACTION = 'INVENTAIRE'"
            + " AND m.lg_EMPLACEMENT_ID = :emplacement)";

    /** Instantane du jour deja present : stock du jour = quantite comptee, comme la procedure. */
    public static final String INSTANTANE_MAJ = "UPDATE t_mouvement_snapshot m"
            + " JOIN (SELECT MIN(x.lg_MOUVEMENT_SNAPSHOT_ID) AS id, x.lg_FAMILLE_ID FROM t_mouvement_snapshot x"
            + "       WHERE x.dt_DAY = CURDATE() AND x.lg_EMPLACEMENT_ID = :emplacement GROUP BY x.lg_FAMILLE_ID) p"
            + " ON p.id = m.lg_MOUVEMENT_SNAPSHOT_ID"
            + " JOIN t_inventaire_famille i ON i.lg_FAMILLE_ID = p.lg_FAMILLE_ID"
            + " SET m.int_NUMBERTRANSACTION = m.int_NUMBERTRANSACTION + 1, m.dt_UPDATED = NOW(),"
            + " m.int_STOCK_JOUR = i.int_NUMBER" + " WHERE" + LIGNES_AVEC_ECART;

    /** Instantane du jour absent : creation, comme la procedure. */
    public static final String INSTANTANE_CREATION = "INSERT INTO t_mouvement_snapshot (lg_MOUVEMENT_SNAPSHOT_ID,"
            + " lg_FAMILLE_ID, dt_DAY, dt_CREATED, str_STATUT, int_NUMBERTRANSACTION, lg_EMPLACEMENT_ID,"
            + " int_STOCK_JOUR, int_STOCK_DEBUT)"
            + " SELECT UUID(), i.lg_FAMILLE_ID, CURDATE(), NOW(), 'enable', 1, :emplacement, i.int_NUMBER, i.int_NUMBER_INIT"
            + " FROM t_inventaire_famille i WHERE" + LIGNES_AVEC_ECART
            + " AND NOT EXISTS (SELECT 1 FROM t_mouvement_snapshot m WHERE m.dt_DAY = CURDATE()"
            + " AND m.lg_FAMILLE_ID = i.lg_FAMILLE_ID AND m.lg_EMPLACEMENT_ID = :emplacement)";

    /** Lignes avec ecart passees a « is_Closed » ; le nombre de lignes touchees est le compte annonce. */
    public static final String LIGNES_CLOTUREES = "UPDATE t_inventaire_famille i"
            + " SET i.str_STATUT = 'is_Closed', i.dt_UPDATED = NOW() WHERE" + LIGNES_AVEC_ECART;

    /** Le type de stock rayon de l'emplacement, comme la procedure : 1 pour l'officine, 3 ailleurs. */
    public static String typeStockRayon(String emplacementId) {
        return "1".equals(emplacementId) ? "1" : "3";
    }
}
