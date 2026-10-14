-- Prestige : préparation de la COPIE DE TRAVAIL laborex_v1_db sur le poste local, pour Claude Code.
-- À lancer UNE FOIS en root, après avoir remplacé MOT_DE_PASSE_A_CHOISIR :
--     mariadb -u root -p < preparer-base.sql
-- Ne jamais lancer ce script sur une base de production.

-- 1. Utilisateur réservé à Claude, limité à la copie de travail (jamais root).
--    Les tests écrivent puis retirent leurs données : il faut donc l'écriture, mais sur cette base seulement.
CREATE USER IF NOT EXISTS 'claude_banc'@'localhost' IDENTIFIED BY 'MOT_DE_PASSE_A_CHOISIR';
GRANT ALL PRIVILEGES ON laborex_v1_db.* TO 'claude_banc'@'localhost';
-- mesures : requêtes en cours, statistiques par requête, état du moteur
GRANT PROCESS ON *.* TO 'claude_banc'@'localhost';
GRANT SELECT ON performance_schema.* TO 'claude_banc'@'localhost';
GRANT SELECT ON mysql.slow_log TO 'claude_banc'@'localhost';
GRANT SELECT ON mysql.general_log TO 'claude_banc'@'localhost';
FLUSH PRIVILEGES;

-- 2. Journal des requêtes lentes (au-delà d'1 s), écrit dans une table lisible par claude_banc.
--    Valable jusqu'au prochain redémarrage de MariaDB ; pour le garder, voir my.ini dans LISEZMOI.md.
SET GLOBAL log_output = 'TABLE';
SET GLOBAL long_query_time = 1;
SET GLOBAL log_slow_verbosity = 'query_plan,explain';
SET GLOBAL slow_query_log = 1;

-- 3. Vérification
SHOW GRANTS FOR 'claude_banc'@'localhost';
SELECT @@slow_query_log AS journal_lent, @@long_query_time AS seuil_s, @@log_output AS sortie,
       @@performance_schema AS performance_schema, @@innodb_buffer_pool_size / 1024 / 1024 AS buffer_pool_mo;
