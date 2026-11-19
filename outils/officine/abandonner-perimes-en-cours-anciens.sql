-- Abandon des saisies de périmés restées « en cours » (pending) depuis longtemps.
-- Cas d'appaul : 99 lignes de 2022, souvent sans stock initial.
--
-- Effet : les lignes sortent de l'écran « Saisie des périmés ».
-- Elles passent au statut « disable » (abandonnées) et sont conservées en base.
-- Le stock, les lots et les mouvements ne sont PAS touchés, contrairement à « Terminer ».
-- int_NUMBER_DELETE reste vide : les lignes n'apparaissent pas comme des périmés sortis.
--
-- Usage : mysql -u <utilisateur> -p <base> < abandonner-perimes-en-cours-anciens.sql
-- Commencer par lancer seulement l'ÉTAPE 1 et vérifier la liste avec la pharmacie.

SET @date_limite = '2023-01-01';   -- les lignes créées avant cette date sont abandonnées

-- ÉTAPE 1 : aperçu (aucune écriture)
SELECT YEAR(w.dt_CREATED) AS annee, COUNT(*) AS lignes,
       SUM(w.stock_initial IS NULL) AS sans_stock_initial, SUM(w.int_NUMBER) AS quantite
FROM t_warehouse w
WHERE w.str_STATUT = 'pending' AND w.dt_CREATED < @date_limite
GROUP BY YEAR(w.dt_CREATED);

SELECT w.lg_WAREHOUSE_ID, w.dt_CREATED, f.int_CIP, f.str_NAME, w.int_NUM_LOT, w.int_NUMBER, w.stock_initial
FROM t_warehouse w JOIN t_famille f ON f.lg_FAMILLE_ID = w.lg_FAMILLE_ID
WHERE w.str_STATUT = 'pending' AND w.dt_CREATED < @date_limite
ORDER BY w.dt_CREATED;

-- ÉTAPE 2 : copie de sauvegarde des lignes visées, puis abandon
START TRANSACTION;

CREATE TABLE IF NOT EXISTS t_warehouse_perimes_abandonnes AS
SELECT * FROM t_warehouse WHERE 1 = 0;

INSERT INTO t_warehouse_perimes_abandonnes
SELECT * FROM t_warehouse WHERE str_STATUT = 'pending' AND dt_CREATED < @date_limite;

UPDATE t_warehouse
SET str_STATUT = 'disable', dt_UPDATED = NOW()
WHERE str_STATUT = 'pending' AND dt_CREATED < @date_limite;

SELECT ROW_COUNT() AS lignes_abandonnees;   -- doit être égal au total de l'étape 1

COMMIT;

-- ÉTAPE 3 : contrôle (doit afficher 0)
SELECT COUNT(*) AS encore_en_cours FROM t_warehouse
WHERE str_STATUT = 'pending' AND dt_CREATED < @date_limite;

-- RETOUR ARRIÈRE (si besoin) :
-- UPDATE t_warehouse w JOIN t_warehouse_perimes_abandonnes a ON a.lg_WAREHOUSE_ID = w.lg_WAREHOUSE_ID
-- SET w.str_STATUT = 'pending', w.dt_UPDATED = a.dt_UPDATED;
