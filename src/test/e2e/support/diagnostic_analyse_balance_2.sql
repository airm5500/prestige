-- Diagnostic 2 de la lenteur de l'analyse comparative : ou passe le temps, et la taille du cache InnoDB.
-- A executer sur la base de l'officine :  mysql -u... -p mbadon < diagnostic_analyse_balance_2.sql > resultat2.txt
-- Rien n'est ecrit. Duree totale attendue : une trentaine de secondes.

SET @empl := COALESCE((SELECT u.lg_EMPLACEMENT_ID FROM t_user u WHERE u.str_STATUT = 'enable' AND u.lg_EMPLACEMENT_ID IS NOT NULL GROUP BY u.lg_EMPLACEMENT_ID ORDER BY COUNT(*) DESC LIMIT 1),
                      (SELECT e.lg_EMPLACEMENT_ID FROM t_emplacement e LIMIT 1));
SET @depot := '5';
SET @d1 := '2025-01-01'; SET @d2 := '2025-12-31';

-- 1. le serveur : version, cache InnoDB, memoire des tris et jointures
SELECT 'serveur' AS etape;
SHOW VARIABLES WHERE Variable_name IN ('version', 'innodb_buffer_pool_size', 'innodb_buffer_pool_instances', 'innodb_flush_method',
  'join_buffer_size', 'sort_buffer_size', 'tmp_table_size', 'max_heap_table_size', 'optimizer_switch', 'innodb_io_capacity');
SELECT 'cache innodb : pages lues sur disque vs demandees' AS etape;
SHOW GLOBAL STATUS WHERE Variable_name IN ('Innodb_buffer_pool_reads', 'Innodb_buffer_pool_read_requests', 'Innodb_buffer_pool_pages_total',
  'Innodb_buffer_pool_pages_data', 'Innodb_buffer_pool_pages_free', 'Innodb_pages_read', 'Created_tmp_disk_tables', 'Created_tmp_tables', 'Uptime');

-- 2. la taille des tables concernees (donnees + index), en Mo
SELECT 'tailles' AS etape;
SELECT TABLE_NAME, TABLE_ROWS, ROUND(DATA_LENGTH / 1048576, 1) AS donnees_mo, ROUND(INDEX_LENGTH / 1048576, 1) AS index_mo, ENGINE, ROW_FORMAT
  FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('t_preenregistrement', 't_preenregistrement_detail', 'mvttransaction', 'vente_reglement', 'vente_exclu', 't_type_reglement');
SELECT 'taille totale de la base (Mo)' AS etape, ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1048576, 1) AS mo FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE();

-- 3. ou passe le temps dans la balance d'une annee : ANALYZE execute la requete et mesure chaque table
SELECT '3 ANALYZE balance 2025 (r_total_time_ms par table)' AS etape;
ANALYZE FORMAT=JSON SELECT m.typeTransaction AS typeVente, m.typeReglementId AS typeReglement, SUM(m.montant) AS montantTTC, SUM(m.montantNet) AS montantNet, SUM(sqlQ.montantAChat) AS montantAChat, SUM(CASE WHEN p.int_PRICE < 0 OR p.b_IS_CANCEL = 1 THEN 0 ELSE 1 END) AS totalVente
 FROM mvttransaction m, t_preenregistrement p, (SELECT d.lg_PREENREGISTREMENT_ID AS idVente, SUM(d.int_PRICE) AS montantTTCDetatilReal, SUM(d.int_QUANTITY*d.prixAchat) AS montantAChat
   FROM t_preenregistrement_detail d JOIN t_preenregistrement p2 ON p2.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID
   WHERE p2.dt_UPDATED >= @d1 AND p2.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY) GROUP BY d.lg_PREENREGISTREMENT_ID) AS sqlQ
 WHERE sqlQ.idVente = p.lg_PREENREGISTREMENT_ID AND m.pkey = p.lg_PREENREGISTREMENT_ID AND p.dt_UPDATED >= @d1 AND p.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY)
   AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND m.lg_EMPLACEMENT_ID = @empl AND p.imported = 0
   AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) GROUP BY typeVente, typeReglement\G

-- 4. le meme passage sans les details ni le mouvement : le simple parcours des ventes de l'annee
SELECT '4a parcours des ventes seules 2025' AS etape;
SET @t := NOW(6);
SELECT COUNT(*) AS ventes, SUM(p.int_PRICE) AS total FROM t_preenregistrement p
 WHERE p.dt_UPDATED >= @d1 AND p.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY) AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND p.imported = 0;
SELECT '4a duree ms' AS etape, TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000 AS ms;

SELECT '4b ventes + mouvement (sans les details)' AS etape;
SET @t := NOW(6);
SELECT COUNT(*) AS ventes, SUM(m.montant) AS total FROM t_preenregistrement p JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID
 WHERE p.dt_UPDATED >= @d1 AND p.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY) AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND m.lg_EMPLACEMENT_ID = @empl AND p.imported = 0;
SELECT '4b duree ms' AS etape, TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000 AS ms;

SELECT '4c ventes + details (sans le mouvement)' AS etape;
SET @t := NOW(6);
SELECT COUNT(*) AS lignes, SUM(d.int_PRICE) AS total FROM t_preenregistrement p JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
 WHERE p.dt_UPDATED >= @d1 AND p.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY) AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND p.imported = 0;
SELECT '4c duree ms' AS etape, TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000 AS ms;

-- 5. la meme balance jouee une seconde fois de suite : si le cache est suffisant, elle doit etre nettement plus rapide
SELECT '5 balance 2025 rejouee' AS etape;
SET @t := NOW(6);
SELECT COUNT(*) AS lignes FROM (SELECT m.typeTransaction AS typeVente, m.typeReglementId AS typeReglement, SUM(m.montant) AS montantTTC, SUM(sqlQ.montantAChat) AS montantAChat
 FROM mvttransaction m, t_preenregistrement p, (SELECT d.lg_PREENREGISTREMENT_ID AS idVente, SUM(d.int_QUANTITY*d.prixAchat) AS montantAChat
   FROM t_preenregistrement_detail d JOIN t_preenregistrement p2 ON p2.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID
   WHERE p2.dt_UPDATED >= @d1 AND p2.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY) GROUP BY d.lg_PREENREGISTREMENT_ID) AS sqlQ
 WHERE sqlQ.idVente = p.lg_PREENREGISTREMENT_ID AND m.pkey = p.lg_PREENREGISTREMENT_ID AND p.dt_UPDATED >= @d1 AND p.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY)
   AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND m.lg_EMPLACEMENT_ID = @empl AND p.imported = 0
   AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) GROUP BY typeVente, typeReglement) x;
SELECT '5 duree ms' AS etape, TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000 AS ms;
SHOW GLOBAL STATUS WHERE Variable_name IN ('Innodb_buffer_pool_reads', 'Innodb_buffer_pool_read_requests');
