-- =====================================================================
-- Audit (lecture seule) du rattrapage des clotures d'inventaire REST
-- ---------------------------------------------------------------------
-- A executer avant ou apres la migration
-- outils/scripts-manuels/rattrapage_cloture_inventaire_rest.sql (ancienne migration V6.9.36) pour voir ce qu'elle a
-- fait, ou ce qu'il resterait a faire. Ce script N'ECRIT RIEN.
--
--   mysql <base> < audit_cloture_inventaire_rest.sql
-- =====================================================================

-- 1. Inventaires qu'il reste a rattraper (0 ligne = rien a faire).
SELECT 'A RATTRAPER' AS etat, i.`lg_INVENTAIRE_ID`, i.`str_NAME`, i.`dt_UPDATED` AS cloture,
       i.`lg_EMPLACEMENT_ID` AS emplacement,
       (SELECT COUNT(*) FROM `t_inventaire_famille` f
         WHERE f.`lg_INVENTAIRE_ID` = i.`lg_INVENTAIRE_ID` AND f.`bool_INVENTAIRE` = 1
           AND f.`int_NUMBER` <> f.`int_NUMBER_INIT`) AS lignes_en_ecart
FROM `t_inventaire` i
WHERE i.`str_STATUT` = 'is_Closed'
  AND i.`dt_UPDATED` IS NOT NULL
  AND IFNULL(i.`str_TYPE`, '') <> 'reserve'
  AND EXISTS (SELECT 1 FROM `t_inventaire_famille` f
               WHERE f.`lg_INVENTAIRE_ID` = i.`lg_INVENTAIRE_ID` AND f.`bool_INVENTAIRE` = 1
                 AND f.`int_NUMBER` <> f.`int_NUMBER_INIT`)
  AND EXISTS (SELECT 1 FROM `t_inventaire_famille` f
               JOIN `HMvtProduit` h ON h.`pkey` = CAST(f.`lg_INVENTAIRE_FAMILLE_ID` AS CHAR)
                    AND h.`typeMvt` = '04'
               WHERE f.`lg_INVENTAIRE_ID` = i.`lg_INVENTAIRE_ID`)
  AND NOT EXISTS (SELECT 1 FROM `t_inventaire_famille` f
                   JOIN `t_mouvement` m ON m.`lg_FAMILLE_ID` = f.`lg_FAMILLE_ID`
                        AND m.`str_ACTION` = 'INVENTAIRE'
                        AND m.`dt_DAY` = DATE(i.`dt_UPDATED`)
                        AND m.`lg_EMPLACEMENT_ID` = i.`lg_EMPLACEMENT_ID`
                   WHERE f.`lg_INVENTAIRE_ID` = i.`lg_INVENTAIRE_ID` AND f.`bool_INVENTAIRE` = 1
                     AND f.`int_NUMBER` <> f.`int_NUMBER_INIT`)
ORDER BY i.`dt_UPDATED` DESC;

-- 2. Inventaires deja rattrapes, et ce qui a ete ecrit pour chacun.
SELECT 'RATTRAPE' AS etat, `lg_INVENTAIRE_ID`, `str_NAME`, `dt_CLOTURE` AS cloture,
       `lg_EMPLACEMENT_ID` AS emplacement, `nbre_lignes_ecart` AS lignes_en_ecart,
       `nbre_mouvements` AS mouvements_du_jour, `nbre_snapshots` AS instantanes,
       `nbre_dates_produit` AS dates_produit, `nbre_type_stock` AS stock_par_type_aligne,
       `dt_RATTRAPAGE` AS rattrape_le
FROM `rattrapage_cloture_inventaire`
ORDER BY `dt_CLOTURE` DESC;

-- 3. Vue d'ensemble : inventaires clotures par annee-mois, et ceux qui
--    portent leur mouvement du jour.
SELECT DATE_FORMAT(i.`dt_UPDATED`, '%Y-%m') AS mois, COUNT(*) AS inventaires_clotures,
       SUM(EXISTS (SELECT 1 FROM `t_inventaire_famille` f
                    JOIN `t_mouvement` m ON m.`lg_FAMILLE_ID` = f.`lg_FAMILLE_ID`
                         AND m.`str_ACTION` = 'INVENTAIRE' AND m.`dt_DAY` = DATE(i.`dt_UPDATED`)
                    WHERE f.`lg_INVENTAIRE_ID` = i.`lg_INVENTAIRE_ID`)) AS avec_mouvement_du_jour
FROM `t_inventaire` i
WHERE i.`str_STATUT` = 'is_Closed' AND i.`dt_UPDATED` IS NOT NULL
GROUP BY DATE_FORMAT(i.`dt_UPDATED`, '%Y-%m')
ORDER BY mois DESC;
