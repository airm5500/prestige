-- =====================================================================
-- TEMPS DE SAISIE DES VENTES (lecture seule)
-- Debut d'une vente  : creation de la vente (1re ligne scannee)
-- Fin de saisie      : derniere ligne ajoutee ou modifiee
-- Fin de la vente    : encaissement (completion_date)
-- Jours travailles   : jours ou au moins une vente a ete encaissee
--                      (6 jours sur 7 travailles => on divise par 6)
-- Ventes ecartees    : plus de 60 min (vente oubliee ouverte) ou duree negative
-- =====================================================================
SET @debut = '2026-09-01', @fin = '2026-10-31', @max_sec = 3600;

-- 1) SYNTHESE de la periode (vente directe / prevente encaissee plus tard)
SELECT m.type_vente,
       (SELECT COUNT(DISTINCT DATE(COALESCE(p.completion_date, p.dt_UPDATED))) FROM t_preenregistrement p
         WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'
           AND COALESCE(p.completion_date, p.dt_UPDATED) >= @debut
           AND COALESCE(p.completion_date, p.dt_UPDATED) < @fin + INTERVAL 1 DAY)  AS jours_travailles,
       COUNT(*)                                                    AS ventes,
       SUM(m.duree > @max_sec OR m.duree < 0)                      AS ventes_ecartees,
       ROUND(AVG(IF(m.duree BETWEEN 0 AND @max_sec, m.lignes, NULL)), 1)            AS lignes_par_vente,
       SEC_TO_TIME(ROUND(AVG(IF(m.duree BETWEEN 0 AND @max_sec, m.saisie, NULL))))  AS saisie_moyenne,
       SEC_TO_TIME(ROUND(AVG(IF(m.duree BETWEEN 0 AND @max_sec, m.duree, NULL))))   AS vente_moyenne_jusqu_encaissement,
       SEC_TO_TIME(ROUND(AVG(IF(m.duree BETWEEN 0 AND @max_sec, m.saisie / m.lignes, NULL)))) AS saisie_par_ligne
FROM (SELECT IF(p.lg_USER_CAISSIER_ID IS NULL OR p.lg_USER_CAISSIER_ID = p.lg_USER_ID, 'directe', 'prevente') AS type_vente,
             COUNT(d.lg_PREENREGISTREMENT_DETAIL_ID) AS lignes,
             TIMESTAMPDIFF(SECOND, p.dt_CREATED, MAX(d.dt_UPDATED))                              AS saisie,
             TIMESTAMPDIFF(SECOND, p.dt_CREATED, COALESCE(p.completion_date, p.dt_UPDATED))     AS duree
      FROM t_preenregistrement p
      JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
      WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'
        AND COALESCE(p.completion_date, p.dt_UPDATED) >= @debut
        AND COALESCE(p.completion_date, p.dt_UPDATED) < @fin + INTERVAL 1 DAY
      GROUP BY p.lg_PREENREGISTREMENT_ID) m
GROUP BY m.type_vente;

-- 2) PAR JOUR TRAVAILLE : nombre de ventes et temps cumule passe a saisir
SELECT j.jour, DAYNAME(j.jour) AS jour_semaine, j.ventes,
       SEC_TO_TIME(j.saisie_totale)                 AS temps_saisie_cumule,
       SEC_TO_TIME(ROUND(j.saisie_totale / j.ventes)) AS saisie_moyenne
FROM (SELECT DATE(COALESCE(p.completion_date, p.dt_UPDATED)) AS jour, COUNT(*) AS ventes,
             SUM(x.saisie) AS saisie_totale
      FROM t_preenregistrement p
      JOIN (SELECT d.lg_PREENREGISTREMENT_ID, TIMESTAMPDIFF(SECOND, MIN(pp.dt_CREATED), MAX(d.dt_UPDATED)) AS saisie
            FROM t_preenregistrement_detail d JOIN t_preenregistrement pp ON pp.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID
            WHERE COALESCE(pp.completion_date, pp.dt_UPDATED) >= @debut
              AND COALESCE(pp.completion_date, pp.dt_UPDATED) < @fin + INTERVAL 1 DAY
            GROUP BY d.lg_PREENREGISTREMENT_ID) x ON x.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
      WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'
        AND x.saisie BETWEEN 0 AND @max_sec
      GROUP BY jour) j
ORDER BY j.jour;

-- 3) PAR OPERATEUR (qui a saisi) : ventes par jour travaille et vitesse
SELECT CONCAT(u.str_FIRST_NAME, ' ', u.str_LAST_NAME) AS operateur,
       COUNT(DISTINCT o.jour)                          AS jours_presents,
       COUNT(*)                                        AS ventes,
       ROUND(COUNT(*) / COUNT(DISTINCT o.jour), 1)     AS ventes_par_jour,
       ROUND(AVG(o.lignes), 1)                         AS lignes_par_vente,
       SEC_TO_TIME(ROUND(AVG(o.saisie)))               AS saisie_moyenne,
       SEC_TO_TIME(ROUND(AVG(o.saisie / o.lignes)))    AS saisie_par_ligne
FROM (SELECT p.lg_USER_ID, DATE(COALESCE(p.completion_date, p.dt_UPDATED)) AS jour,
             COUNT(*) AS lignes, TIMESTAMPDIFF(SECOND, p.dt_CREATED, MAX(d.dt_UPDATED)) AS saisie
      FROM t_preenregistrement p
      JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
      WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'
        AND COALESCE(p.completion_date, p.dt_UPDATED) >= @debut
        AND COALESCE(p.completion_date, p.dt_UPDATED) < @fin + INTERVAL 1 DAY
      GROUP BY p.lg_PREENREGISTREMENT_ID
      HAVING saisie BETWEEN 0 AND @max_sec) o
JOIN t_user u ON u.lg_USER_ID = o.lg_USER_ID
GROUP BY o.lg_USER_ID
ORDER BY ventes DESC;

-- 4) PAR HEURE : affluence et vitesse (les heures chargees ralentissent-elles la saisie ?)
SELECT HOUR(p.dt_CREATED) AS heure, COUNT(DISTINCT p.lg_PREENREGISTREMENT_ID) AS ventes,
       SEC_TO_TIME(ROUND(AVG(s.saisie))) AS saisie_moyenne
FROM t_preenregistrement p
JOIN (SELECT p2.lg_PREENREGISTREMENT_ID, TIMESTAMPDIFF(SECOND, p2.dt_CREATED, MAX(d2.dt_UPDATED)) AS saisie
      FROM t_preenregistrement p2 JOIN t_preenregistrement_detail d2 ON d2.lg_PREENREGISTREMENT_ID = p2.lg_PREENREGISTREMENT_ID
      WHERE p2.dt_CREATED >= @debut AND p2.dt_CREATED < @fin + INTERVAL 1 DAY
      GROUP BY p2.lg_PREENREGISTREMENT_ID) s ON s.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'
  AND s.saisie BETWEEN 0 AND @max_sec
GROUP BY heure ORDER BY heure;
