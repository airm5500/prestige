-- ============================================================================
-- CONFIRMATION DES DIAGNOSTICS — REQUETES DG-01 a DG-07
-- ============================================================================
-- A exécuter sur la base de PRODUCTION ACTUELLE (non corrigée), de préférence
-- sur une COPIE. Toutes les requêtes sont en LECTURE SEULE.
--
-- But : prouver que les anomalies diagnostiquées existent déjà dans les données,
-- AVANT tout déploiement du correctif. Chaque requête correspond à une fiche du
-- cahier « confirmation_diagnostics_differes.xlsx ».
--
-- Dialecte : MySQL / MariaDB.
-- ============================================================================


-- ============================================================================
-- DG-01 — PAIEMENTS ENCAISSES MAIS JAMAIS / PARTIELLEMENT IMPUTES
-- ----------------------------------------------------------------------------
-- Dossiers de règlement de différé dont le montant payé dépasse la somme
-- réellement imputée aux dettes (reliquat > 0). PREUVE du « client qui a payé
-- mais doit encore ». Toute ligne = un paiement dont une partie n'a soldé
-- aucune dette.
-- ============================================================================
SELECT t.*
FROM (
    SELECT d.lg_DOSSIER_REGLEMENT_ID                              AS dossier_id,
           d.str_ORGANISME_ID                                    AS client_id,
           CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME)        AS client,
           d.dt_CREATED                                          AS enregistre_le,
           d.dbl_AMOUNT                                          AS montant_paye,
           COALESCE(SUM(dd.dbl_AMOUNT),0)                        AS montant_impute,
           d.dbl_AMOUNT - COALESCE(SUM(dd.dbl_AMOUNT),0)         AS reliquat_non_impute
    FROM t_dossier_reglement d
    LEFT JOIN t_dossier_reglement_detail dd
           ON dd.lg_DOSSIER_REGLEMENT_ID = d.lg_DOSSIER_REGLEMENT_ID
    LEFT JOIN t_client cl ON cl.lg_CLIENT_ID = d.str_ORGANISME_ID
    WHERE d.str_NATURE_DOSSIER = 'DIFFERE'
    GROUP BY d.lg_DOSSIER_REGLEMENT_ID, d.str_ORGANISME_ID, client, d.dt_CREATED, d.dbl_AMOUNT
) t
WHERE t.reliquat_non_impute > 0
ORDER BY t.reliquat_non_impute DESC;

-- Total cumulé (chiffre à retenir pour la synthèse)
SELECT COUNT(*) AS nb_dossiers, SUM(t.reliquat_non_impute) AS total_encaisse_non_impute
FROM (
    SELECT d.lg_DOSSIER_REGLEMENT_ID,
           d.dbl_AMOUNT - COALESCE(SUM(dd.dbl_AMOUNT),0) AS reliquat_non_impute
    FROM t_dossier_reglement d
    LEFT JOIN t_dossier_reglement_detail dd ON dd.lg_DOSSIER_REGLEMENT_ID = d.lg_DOSSIER_REGLEMENT_ID
    WHERE d.str_NATURE_DOSSIER = 'DIFFERE'
    GROUP BY d.lg_DOSSIER_REGLEMENT_ID, d.dbl_AMOUNT
) t
WHERE t.reliquat_non_impute > 0;


-- ============================================================================
-- DG-02 — DETTES EFFACEES AU-DELA DU MONTANT ENCAISSE
-- ----------------------------------------------------------------------------
-- Mêmes dossiers, mais reliquat NEGATIF : on a soldé plus de dettes que
-- d'argent reçu. PREUVE d'une perte pour la pharmacie.
-- ============================================================================
SELECT t.*
FROM (
    SELECT d.lg_DOSSIER_REGLEMENT_ID                              AS dossier_id,
           d.str_ORGANISME_ID                                    AS client_id,
           CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME)        AS client,
           d.dt_CREATED                                          AS enregistre_le,
           d.dbl_AMOUNT                                          AS montant_paye,
           COALESCE(SUM(dd.dbl_AMOUNT),0)                        AS montant_impute,
           COALESCE(SUM(dd.dbl_AMOUNT),0) - d.dbl_AMOUNT         AS efface_en_trop
    FROM t_dossier_reglement d
    LEFT JOIN t_dossier_reglement_detail dd
           ON dd.lg_DOSSIER_REGLEMENT_ID = d.lg_DOSSIER_REGLEMENT_ID
    LEFT JOIN t_client cl ON cl.lg_CLIENT_ID = d.str_ORGANISME_ID
    WHERE d.str_NATURE_DOSSIER = 'DIFFERE'
    GROUP BY d.lg_DOSSIER_REGLEMENT_ID, d.str_ORGANISME_ID, client, d.dt_CREATED, d.dbl_AMOUNT
) t
WHERE t.efface_en_trop > 0
ORDER BY t.efface_en_trop DESC;


-- ============================================================================
-- DG-03 — DETTES FANTOMES SUR VENTES ANNULEES
-- ----------------------------------------------------------------------------
-- Lignes de différé avec un reste > 0 alors que la vente est annulée.
-- PREUVE de dettes insoldables par l'écran de règlement.
-- ============================================================================
SELECT CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME)       AS client,
       p.str_REF                                            AS ref_vente,
       o.str_STATUT                                         AS statut_ligne,
       p.b_IS_CANCEL                                        AS vente_annulee,
       p.dt_ANNULER                                         AS annulee_le,
       o.int_PRICE                                          AS montant_differe,
       o.int_PRICE_RESTE                                    AS reste_fantome
FROM t_preenregistrement_compte_client o
JOIN t_compte_client cp ON cp.lg_COMPTE_CLIENT_ID = o.lg_COMPTE_CLIENT_ID
JOIN t_client cl        ON cl.lg_CLIENT_ID        = cp.lg_CLIENT_ID
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = o.lg_PREENREGISTREMENT_ID
WHERE o.int_PRICE_RESTE > 0 AND p.b_IS_CANCEL = 1
ORDER BY o.int_PRICE_RESTE DESC;


-- ============================================================================
-- DG-04 — SOLDE DIFFERENT SELON L'ECRAN CONSULTE
-- ----------------------------------------------------------------------------
-- Pour chaque client, le solde « fiche client » (toutes lignes) vs le solde
-- « écran de règlement » (clôturé, non annulé, reste > 0). Toute ligne = un
-- client qui affiche deux soldes différents.
-- ============================================================================
SELECT t.*
FROM (
    SELECT cl.lg_CLIENT_ID                                        AS client_id,
           CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME)        AS client,
           SUM(o.int_PRICE_RESTE)                                AS solde_fiche_client,
           SUM(CASE WHEN o.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0 AND o.int_PRICE_RESTE>0
                    THEN o.int_PRICE_RESTE ELSE 0 END)           AS solde_ecran_reglement,
           SUM(CASE WHEN o.str_STATUT<>'is_Closed' THEN o.int_PRICE_RESTE ELSE 0 END) AS restes_non_clotures,
           SUM(CASE WHEN p.b_IS_CANCEL=1 THEN o.int_PRICE_RESTE ELSE 0 END)            AS restes_ventes_annulees
    FROM t_preenregistrement_compte_client o
    JOIN t_compte_client cp ON cp.lg_COMPTE_CLIENT_ID = o.lg_COMPTE_CLIENT_ID
    JOIN t_client cl        ON cl.lg_CLIENT_ID        = cp.lg_CLIENT_ID
    JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = o.lg_PREENREGISTREMENT_ID
    GROUP BY cl.lg_CLIENT_ID, client
) t
WHERE t.solde_fiche_client <> t.solde_ecran_reglement
ORDER BY ABS(t.solde_fiche_client - t.solde_ecran_reglement) DESC;


-- ============================================================================
-- DG-05 — RESTES NEGATIFS D'ARRONDI (AVOIRS INVISIBLES)
-- ----------------------------------------------------------------------------
-- Lignes à reste négatif sur un différé positif : minorent le solde net mais
-- n'apparaissent nulle part à l'écran (filtre reste > 0).
-- ============================================================================
SELECT CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME)       AS client,
       p.str_REF                                            AS ref_vente,
       o.int_PRICE                                          AS montant_differe,
       o.int_PRICE_RESTE                                    AS reste_negatif,
       o.dt_CREATED                                         AS creee_le
FROM t_preenregistrement_compte_client o
JOIN t_compte_client cp ON cp.lg_COMPTE_CLIENT_ID = o.lg_COMPTE_CLIENT_ID
JOIN t_client cl        ON cl.lg_CLIENT_ID        = cp.lg_CLIENT_ID
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = o.lg_PREENREGISTREMENT_ID
WHERE o.int_PRICE_RESTE < 0
ORDER BY o.int_PRICE_RESTE ASC;


-- ============================================================================
-- DG-06 — ECART ENTRE ENCAISSEMENT EN CAISSE ET IMPUTATION AUX DETTES
-- ----------------------------------------------------------------------------
-- Mouvements de caisse de règlement de différé (type 2) dont le montant réglé
-- ne correspond pas à la somme imputée aux dettes du dossier.
-- ============================================================================
SELECT t.*
FROM (
    SELECT m.pkey                                                 AS dossier_id,
           m.organisme                                           AS client_id,
           m.mvtdate                                             AS date_mvt,
           m.montantRegle                                        AS encaisse_en_caisse,
           d.dbl_AMOUNT                                          AS montant_du_dossier,
           COALESCE(SUM(dd.dbl_AMOUNT),0)                        AS montant_impute_aux_dettes
    FROM mvttransaction m
    LEFT JOIN t_dossier_reglement d
           ON d.lg_DOSSIER_REGLEMENT_ID = m.pkey
    LEFT JOIN t_dossier_reglement_detail dd
           ON dd.lg_DOSSIER_REGLEMENT_ID = d.lg_DOSSIER_REGLEMENT_ID
    WHERE m.typeMvtCaisseId = '2'
    GROUP BY m.pkey, m.organisme, m.mvtdate, m.montantRegle, d.dbl_AMOUNT
) t
WHERE t.encaisse_en_caisse <> t.montant_impute_aux_dettes
   OR t.montant_du_dossier IS NULL
ORDER BY t.date_mvt DESC;


-- ============================================================================
-- DG-07 — DETAILS DE REGLEMENT INCOHERENTS
-- ----------------------------------------------------------------------------
-- 7a. Détails imputés sur une dette appartenant à un AUTRE client que celui du
--     dossier (aucun contrôle d'appartenance dans le code actuel).
-- ============================================================================
SELECT d.lg_DOSSIER_REGLEMENT_ID                              AS dossier_id,
       d.str_ORGANISME_ID                                     AS client_du_dossier,
       cl2.lg_CLIENT_ID                                       AS client_de_la_dette,
       CONCAT(cl2.str_FIRST_NAME,' ',cl2.str_LAST_NAME)       AS nom_client_de_la_dette,
       dd.dbl_AMOUNT                                          AS montant_impute,
       dd.dt_CREATED                                          AS date_imputation
FROM t_dossier_reglement d
JOIN t_dossier_reglement_detail dd
     ON dd.lg_DOSSIER_REGLEMENT_ID = d.lg_DOSSIER_REGLEMENT_ID
JOIN t_preenregistrement_compte_client o
     ON o.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID = dd.str_REF
JOIN t_compte_client cp2 ON cp2.lg_COMPTE_CLIENT_ID = o.lg_COMPTE_CLIENT_ID
JOIN t_client cl2        ON cl2.lg_CLIENT_ID        = cp2.lg_CLIENT_ID
WHERE d.str_NATURE_DOSSIER = 'DIFFERE'
  AND cl2.lg_CLIENT_ID <> d.str_ORGANISME_ID;

-- 7b. Détails orphelins : la référence ne correspond à aucune ligne de dette.
SELECT d.lg_DOSSIER_REGLEMENT_ID                              AS dossier_id,
       d.str_ORGANISME_ID                                     AS client_id,
       dd.str_REF                                             AS reference_introuvable,
       dd.dbl_AMOUNT                                          AS montant_impute,
       dd.dt_CREATED                                          AS date_imputation
FROM t_dossier_reglement d
JOIN t_dossier_reglement_detail dd
     ON dd.lg_DOSSIER_REGLEMENT_ID = d.lg_DOSSIER_REGLEMENT_ID
LEFT JOIN t_preenregistrement_compte_client o
     ON o.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID = dd.str_REF
WHERE d.str_NATURE_DOSSIER = 'DIFFERE'
  AND o.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID IS NULL;
