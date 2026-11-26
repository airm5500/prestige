-- Clients assurés dont le nom est en majuscules alors que leur ayant droit principal est en minuscules
-- (lecture seule). Constaté sur la base clementine : 176 clients, créés du 11/05/2026 au 10/09/2026.
--
-- L'ayant droit principal est celui qui porte le même numéro (matricule) que l'assuré, chez le même client.
-- La comparaison de casse se fait en BINARY : la base compare sans tenir compte de la casse par défaut.

-- 1. Liste détaillée (colonnes nominatives : à lancer par une personne habilitée).
SELECT c.str_CODE_INTERNE                       AS code_client,
       c.str_NUMERO_SECURITE_SOCIAL             AS matricule,
       CONCAT_WS(' ', c.str_FIRST_NAME, c.str_LAST_NAME) AS assure,
       CONCAT_WS(' ', a.str_FIRST_NAME, a.str_LAST_NAME) AS ayant_droit_principal,
       IF(BINARY CONCAT(a.str_FIRST_NAME, a.str_LAST_NAME) = BINARY LOWER(CONCAT(a.str_FIRST_NAME, a.str_LAST_NAME)),
          'tout en minuscules', 'casse melangee')        AS casse_ayant_droit,
       DATE(c.dt_CREATED)                       AS client_cree_le,
       (SELECT COUNT(*) FROM t_preenregistrement p
         WHERE p.lg_AYANTS_DROITS_ID = a.lg_AYANTS_DROITS_ID AND p.str_STATUT = 'is_Closed') AS ventes
FROM t_client c
JOIN t_ayant_droit a
       ON a.lg_CLIENT_ID = c.lg_CLIENT_ID
      AND a.str_NUMERO_SECURITE_SOCIAL = c.str_NUMERO_SECURITE_SOCIAL
WHERE c.lg_TYPE_CLIENT_ID = '1'
  AND BINARY CONCAT(c.str_FIRST_NAME, c.str_LAST_NAME) = BINARY UPPER(CONCAT(c.str_FIRST_NAME, c.str_LAST_NAME))
  AND BINARY CONCAT(a.str_FIRST_NAME, a.str_LAST_NAME) <> BINARY UPPER(CONCAT(a.str_FIRST_NAME, a.str_LAST_NAME))
ORDER BY c.dt_CREATED;

-- 2. Décompte par mois de création, sans aucun nom.
SELECT DATE_FORMAT(c.dt_CREATED, '%Y-%m') AS mois, COUNT(*) AS clients
FROM t_client c
JOIN t_ayant_droit a
       ON a.lg_CLIENT_ID = c.lg_CLIENT_ID
      AND a.str_NUMERO_SECURITE_SOCIAL = c.str_NUMERO_SECURITE_SOCIAL
WHERE c.lg_TYPE_CLIENT_ID = '1'
  AND BINARY CONCAT(a.str_FIRST_NAME, a.str_LAST_NAME) <> BINARY UPPER(CONCAT(a.str_FIRST_NAME, a.str_LAST_NAME))
GROUP BY mois ORDER BY mois;

-- 3. Autres ayants droit en minuscules (ni même nom ni même numéro que l'assuré) : 2 sur clementine.
SELECT a.lg_AYANTS_DROITS_ID, a.lg_CLIENT_ID, DATE(a.dt_CREATED) AS cree_le
FROM t_ayant_droit a
JOIN t_client c ON c.lg_CLIENT_ID = a.lg_CLIENT_ID
WHERE BINARY CONCAT(a.str_FIRST_NAME, a.str_LAST_NAME) <> BINARY UPPER(CONCAT(a.str_FIRST_NAME, a.str_LAST_NAME))
  AND NOT (a.str_NUMERO_SECURITE_SOCIAL <=> c.str_NUMERO_SECURITE_SOCIAL);
