-- =====================================================================
-- TEMPS DE SAISIE DES BONS DE LIVRAISON (lecture seule)
-- Dans Prestige, les lignes sont saisies dans la COMMANDE, puis le BL est cree et cloture.
--   debut saisie   : creation de la commande (t_order.dt_CREATED)
--   entree du BL   : creation du BL (reference, date, montant)
--   fin            : cloture du BL (derniere ligne mise a jour)
-- Ecartes : plus de @max_sec entre commande et cloture (commande preparee a l'avance,
--           ex. PharmaML envoyee la veille : le debut reel de saisie n'est pas connu).
-- Jours travailles : jours ou au moins une vente a ete encaissee (6 jours sur 7 => 6).
-- =====================================================================
SET @debut = '2026-09-01', @fin = '2026-10-31', @max_sec = 4 * 3600;

-- 1) SYNTHESE
SELECT (SELECT COUNT(DISTINCT DATE(COALESCE(p.completion_date, p.dt_UPDATED))) FROM t_preenregistrement p
         WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0
           AND COALESCE(p.completion_date, p.dt_UPDATED) >= @debut
           AND COALESCE(p.completion_date, p.dt_UPDATED) < @fin + INTERVAL 1 DAY)  AS jours_travailles,
       COUNT(DISTINCT DATE(b.fin))                                                  AS jours_avec_bl,
       COUNT(*)                                                                     AS bl,
       SUM(b.total > @max_sec OR b.total < 0)                                       AS bl_ecartes,
       SUM(IF(b.ok, b.lignes, 0))                                                   AS lignes,
       ROUND(AVG(IF(b.ok, b.lignes, NULL)), 1)                                      AS lignes_par_bl,
       SEC_TO_TIME(ROUND(AVG(IF(b.ok, b.total, NULL))))                             AS temps_moyen_par_bl,
       SEC_TO_TIME(ROUND(AVG(IF(b.ok, b.saisie_lignes, NULL))))                     AS dont_saisie_lignes,
       SEC_TO_TIME(ROUND(AVG(IF(b.ok, b.validation, NULL))))                        AS dont_entree_et_cloture_bl,
       SEC_TO_TIME(ROUND(SUM(IF(b.ok, b.total, 0)) / NULLIF(SUM(IF(b.ok, b.lignes, 0)), 0))) AS temps_par_ligne,
       SEC_TO_TIME(ROUND(SUM(IF(b.ok, b.total, 0)) / NULLIF(COUNT(DISTINCT IF(b.ok, DATE(b.fin), NULL)), 0))) AS temps_bl_par_jour_avec_bl
FROM (SELECT x.*, x.total BETWEEN 0 AND @max_sec AS ok
      FROM (SELECT bl.lg_BON_LIVRAISON_ID, MAX(d.dt_UPDATED) AS fin, COUNT(*) AS lignes,
                   TIMESTAMPDIFF(SECOND, o.dt_CREATED, MAX(d.dt_UPDATED))  AS total,
                   TIMESTAMPDIFF(SECOND, o.dt_CREATED, bl.dt_CREATED)      AS saisie_lignes,
                   TIMESTAMPDIFF(SECOND, bl.dt_CREATED, MAX(d.dt_UPDATED)) AS validation
            FROM t_bon_livraison bl
            JOIN t_order o ON o.lg_ORDER_ID = bl.lg_ORDER_ID
            JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_ID = bl.lg_BON_LIVRAISON_ID
            WHERE bl.str_STATUT = 'is_Closed' AND bl.dt_CREATED >= @debut AND bl.dt_CREATED < @fin + INTERVAL 1 DAY
            GROUP BY bl.lg_BON_LIVRAISON_ID) x) b;

-- 2) PAR GROSSISTE
SELECT g.str_LIBELLE AS grossiste, COUNT(*) AS bl, ROUND(AVG(b.lignes), 1) AS lignes_par_bl,
       SEC_TO_TIME(ROUND(AVG(b.total)))                AS temps_moyen_par_bl,
       SEC_TO_TIME(ROUND(SUM(b.total) / SUM(b.lignes))) AS temps_par_ligne
FROM (SELECT bl.lg_BON_LIVRAISON_ID, o.lg_GROSSISTE_ID, COUNT(*) AS lignes,
             TIMESTAMPDIFF(SECOND, o.dt_CREATED, MAX(d.dt_UPDATED)) AS total
      FROM t_bon_livraison bl
      JOIN t_order o ON o.lg_ORDER_ID = bl.lg_ORDER_ID
      JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_ID = bl.lg_BON_LIVRAISON_ID
      WHERE bl.str_STATUT = 'is_Closed' AND bl.dt_CREATED >= @debut AND bl.dt_CREATED < @fin + INTERVAL 1 DAY
      GROUP BY bl.lg_BON_LIVRAISON_ID
      HAVING total BETWEEN 0 AND @max_sec) b
JOIN t_grossiste g ON g.lg_GROSSISTE_ID = b.lg_GROSSISTE_ID
GROUP BY g.lg_GROSSISTE_ID ORDER BY bl DESC;

-- 3) PAR OPERATEUR (celui qui a entre le BL)
SELECT CONCAT(u.str_FIRST_NAME, ' ', u.str_LAST_NAME) AS operateur, COUNT(*) AS bl, SUM(b.lignes) AS lignes,
       SEC_TO_TIME(ROUND(AVG(b.total)))                AS temps_moyen_par_bl,
       SEC_TO_TIME(ROUND(SUM(b.total) / SUM(b.lignes))) AS temps_par_ligne
FROM (SELECT bl.lg_BON_LIVRAISON_ID, bl.lg_USER_ID, COUNT(*) AS lignes,
             TIMESTAMPDIFF(SECOND, o.dt_CREATED, MAX(d.dt_UPDATED)) AS total
      FROM t_bon_livraison bl
      JOIN t_order o ON o.lg_ORDER_ID = bl.lg_ORDER_ID
      JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_ID = bl.lg_BON_LIVRAISON_ID
      WHERE bl.str_STATUT = 'is_Closed' AND bl.dt_CREATED >= @debut AND bl.dt_CREATED < @fin + INTERVAL 1 DAY
      GROUP BY bl.lg_BON_LIVRAISON_ID
      HAVING total BETWEEN 0 AND @max_sec) b
JOIN t_user u ON u.lg_USER_ID = b.lg_USER_ID
GROUP BY b.lg_USER_ID ORDER BY bl DESC;

-- 4) DELAI entre la livraison (date portee sur le BL) et sa saisie dans Prestige
SELECT ROUND(AVG(DATEDIFF(bl.dt_CREATED, bl.dt_DATE_LIVRAISON)), 1) AS jours_moyens_avant_saisie,
       SUM(DATEDIFF(bl.dt_CREATED, bl.dt_DATE_LIVRAISON) = 0)  AS saisis_le_jour_meme,
       SUM(DATEDIFF(bl.dt_CREATED, bl.dt_DATE_LIVRAISON) = 1)  AS saisis_le_lendemain,
       SUM(DATEDIFF(bl.dt_CREATED, bl.dt_DATE_LIVRAISON) >= 2) AS saisis_2_jours_ou_plus_apres
FROM t_bon_livraison bl
WHERE bl.str_STATUT = 'is_Closed' AND bl.dt_CREATED >= @debut AND bl.dt_CREATED < @fin + INTERVAL 1 DAY;
