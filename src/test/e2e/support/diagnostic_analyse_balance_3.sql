-- Diagnostic 3 : mesurer la balance d'une annee SANS la sous-requete de detail « lateral » (executee une fois par vente).
-- A executer sur la base de l'officine :  mysql -u... -p mbadon < diagnostic_analyse_balance_3.sql > resultat3.txt
-- Rien n'est ecrit. Duree attendue : moins d'une minute. Les montants doivent etre IDENTIQUES entre A, B et C.

SET @empl := COALESCE((SELECT u.lg_EMPLACEMENT_ID FROM t_user u WHERE u.str_STATUT = 'enable' AND u.lg_EMPLACEMENT_ID IS NOT NULL GROUP BY u.lg_EMPLACEMENT_ID ORDER BY COUNT(*) DESC LIMIT 1),
                      (SELECT e.lg_EMPLACEMENT_ID FROM t_emplacement e LIMIT 1));
SET @depot := '5';
SET @d1 := '2025-01-01'; SET @d2 := '2025-12-31';

-- A. telle que l'application l'ecrit (rappel)
SELECT 'A balance 2025 ACTUEL' AS etape;
SET @t := NOW(6);
SELECT m.typeTransaction AS typeVente, m.typeReglementId AS typeReglement, SUM(m.montant) AS montantTTC, SUM(m.montantNet) AS montantNet, SUM(sqlQ.montantAChat) AS montantAChat, SUM(sqlQ.montantTTCDetatil) AS montantTTCDetatil, SUM(CASE WHEN p.int_PRICE < 0 OR p.b_IS_CANCEL = 1 THEN 0 ELSE 1 END) AS totalVente
 FROM mvttransaction m, t_preenregistrement p, (SELECT d.lg_PREENREGISTREMENT_ID AS idVente, SUM(d.int_QUANTITY*d.prixAchat) AS montantAChat, SUM(CASE WHEN d.bool_ACCOUNT THEN d.int_PRICE ELSE 0 END) AS montantTTCDetatil
   FROM t_preenregistrement_detail d JOIN t_preenregistrement p2 ON p2.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID
   WHERE p2.dt_UPDATED >= @d1 AND p2.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY) GROUP BY d.lg_PREENREGISTREMENT_ID) AS sqlQ
 WHERE sqlQ.idVente = p.lg_PREENREGISTREMENT_ID AND m.pkey = p.lg_PREENREGISTREMENT_ID AND p.dt_UPDATED >= @d1 AND p.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY)
   AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND m.lg_EMPLACEMENT_ID = @empl AND p.imported = 0
   AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) GROUP BY typeVente, typeReglement;
SELECT 'A duree ms' AS etape, TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000 AS ms;

-- B. la meme requete, mais la sous-requete de detail est calculee UNE fois pour l'annee (split_materialized coupe)
SELECT 'B balance 2025 sans lateral (split_materialized=off)' AS etape;
SET SESSION optimizer_switch = 'split_materialized=off';
EXPLAIN SELECT m.typeTransaction AS typeVente, m.typeReglementId AS typeReglement, SUM(m.montant) AS montantTTC, SUM(sqlQ.montantAChat) AS montantAChat
 FROM mvttransaction m, t_preenregistrement p, (SELECT d.lg_PREENREGISTREMENT_ID AS idVente, SUM(d.int_QUANTITY*d.prixAchat) AS montantAChat
   FROM t_preenregistrement_detail d JOIN t_preenregistrement p2 ON p2.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID
   WHERE p2.dt_UPDATED >= @d1 AND p2.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY) GROUP BY d.lg_PREENREGISTREMENT_ID) AS sqlQ
 WHERE sqlQ.idVente = p.lg_PREENREGISTREMENT_ID AND m.pkey = p.lg_PREENREGISTREMENT_ID AND p.dt_UPDATED >= @d1 AND p.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY)
   AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND m.lg_EMPLACEMENT_ID = @empl AND p.imported = 0
   AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) GROUP BY typeVente, typeReglement;
SET @t := NOW(6);
SELECT m.typeTransaction AS typeVente, m.typeReglementId AS typeReglement, SUM(m.montant) AS montantTTC, SUM(m.montantNet) AS montantNet, SUM(sqlQ.montantAChat) AS montantAChat, SUM(sqlQ.montantTTCDetatil) AS montantTTCDetatil, SUM(CASE WHEN p.int_PRICE < 0 OR p.b_IS_CANCEL = 1 THEN 0 ELSE 1 END) AS totalVente
 FROM mvttransaction m, t_preenregistrement p, (SELECT d.lg_PREENREGISTREMENT_ID AS idVente, SUM(d.int_QUANTITY*d.prixAchat) AS montantAChat, SUM(CASE WHEN d.bool_ACCOUNT THEN d.int_PRICE ELSE 0 END) AS montantTTCDetatil
   FROM t_preenregistrement_detail d JOIN t_preenregistrement p2 ON p2.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID
   WHERE p2.dt_UPDATED >= @d1 AND p2.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY) GROUP BY d.lg_PREENREGISTREMENT_ID) AS sqlQ
 WHERE sqlQ.idVente = p.lg_PREENREGISTREMENT_ID AND m.pkey = p.lg_PREENREGISTREMENT_ID AND p.dt_UPDATED >= @d1 AND p.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY)
   AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND m.lg_EMPLACEMENT_ID = @empl AND p.imported = 0
   AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) GROUP BY typeVente, typeReglement;
SELECT 'B duree ms' AS etape, TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000 AS ms;
SET SESSION optimizer_switch = 'split_materialized=on';

-- C. deux passages sans sous-requete : les montants du mouvement, puis ceux des lignes de detail, groupes de la meme facon
SELECT 'C1 mouvements 2025 (sans detail)' AS etape;
SET @t := NOW(6);
SELECT m.typeTransaction AS typeVente, m.typeReglementId AS typeReglement, SUM(m.montant) AS montantTTC, SUM(m.montantNet) AS montantNet, SUM(CASE WHEN p.int_PRICE < 0 OR p.b_IS_CANCEL = 1 THEN 0 ELSE 1 END) AS totalVente
 FROM t_preenregistrement p JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID
 WHERE p.dt_UPDATED >= @d1 AND p.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY)
   AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND m.lg_EMPLACEMENT_ID = @empl AND p.imported = 0
   AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) GROUP BY typeVente, typeReglement;
SELECT 'C1 duree ms' AS etape, TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000 AS ms;
SELECT 'C2 lignes de detail 2025, groupees par type de vente et mode' AS etape;
SET @t := NOW(6);
SELECT m.typeTransaction AS typeVente, m.typeReglementId AS typeReglement, SUM(d.int_QUANTITY*d.prixAchat) AS montantAChat, SUM(CASE WHEN d.bool_ACCOUNT THEN d.int_PRICE ELSE 0 END) AS montantTTCDetatil
 FROM t_preenregistrement p JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
 WHERE p.dt_UPDATED >= @d1 AND p.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY)
   AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND m.lg_EMPLACEMENT_ID = @empl AND p.imported = 0
   AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) GROUP BY typeVente, typeReglement;
SELECT 'C2 duree ms' AS etape, TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000 AS ms;

-- D. le nombre de coeurs du serveur (pour la parallelisation)
SELECT 'D coeurs' AS etape;
SHOW VARIABLES WHERE Variable_name IN ('thread_pool_size', 'innodb_read_io_threads', 'max_connections');
SHOW GLOBAL STATUS WHERE Variable_name IN ('Threads_connected', 'Threads_running', 'Max_used_connections');
