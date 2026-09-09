-- Diagnostic (retour des tests du 09/09, point 4) : pourquoi la garde affichait plus que la balance vente / caisse.
-- Lecture seule. Remplacer les bornes et l'emplacement par ceux de la garde comparee.
SET @debut = '2026-08-29 00:00:00';
SET @fin   = '2026-09-05 23:59:59';
SET @emplacement = '1';

-- 1. Les ventes cloturees de la periode, ventilees selon ce qui les ecarte de la balance :
--    site different de l'utilisateur, vente importee, vente exclue des etats.
SELECT up.lg_EMPLACEMENT_ID AS emplacement, p.imported,
       (p.lg_PREENREGISTREMENT_ID IN (SELECT v.preenregistrement_id FROM vente_exclu v)) AS exclue,
       COUNT(*) AS ventes, SUM(p.int_PRICE) AS montant
FROM t_preenregistrement p
JOIN t_user up ON up.lg_USER_ID = p.lg_USER_ID
WHERE p.dt_UPDATED >= @debut AND p.dt_UPDATED <= @fin
  AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3;

-- 2. Ancien perimetre de la garde (toutes ventes) contre le perimetre aligne (emplacement, non importees, non exclues).
SELECT 'ancienne garde' AS perimetre, COUNT(DISTINCT p.lg_PREENREGISTREMENT_ID) AS ventes, COUNT(*) AS lignes, SUM(pd.int_PRICE) AS ca
FROM t_preenregistrement p
JOIN t_preenregistrement_detail pd ON pd.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.dt_UPDATED >= @debut AND p.dt_UPDATED <= @fin
  AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'
UNION ALL
SELECT 'garde alignee', COUNT(DISTINCT p.lg_PREENREGISTREMENT_ID), COUNT(*), SUM(pd.int_PRICE)
FROM t_preenregistrement p
JOIN t_user up ON up.lg_USER_ID = p.lg_USER_ID
JOIN t_preenregistrement_detail pd ON pd.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.dt_UPDATED >= @debut AND p.dt_UPDATED <= @fin
  AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'
  AND up.lg_EMPLACEMENT_ID = @emplacement AND p.imported = 0
  AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v)
UNION ALL
SELECT 'balance (net TTC, lignes comptees dans le CA)', COUNT(DISTINCT p.lg_PREENREGISTREMENT_ID), COUNT(*), SUM(pd.int_PRICE)
FROM t_preenregistrement p
JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID
JOIN t_preenregistrement_detail pd ON pd.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.dt_UPDATED >= @debut AND p.dt_UPDATED < DATE_ADD(DATE(@fin), INTERVAL 1 DAY)
  AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> '5' AND p.imported = 0
  AND m.lg_EMPLACEMENT_ID = @emplacement AND pd.bool_ACCOUNT
  AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v);
