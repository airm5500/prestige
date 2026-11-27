-- Noms des clients en MAJUSCULES (t_client : str_FIRST_NAME et str_LAST_NAME).
--
-- Tous les clients, actifs ou non. Seules les lettres changent de casse : rien n'est ajoute, retire ni
-- deplace, et les accents sont gardes (« é » devient « É »). Le reste de la fiche ne change pas.
-- Ne sont pas modifies : les ayants droits (t_ayant_droit) ni les noms deja recopies dans les ventes passees.
-- Rejouable sans effet. SQL simple, compatible avec les anciens serveurs. Fichier en UTF-8.

SET NAMES utf8;

-- 1. Apercu : clients dont le nom changera (les 200 premiers).
SELECT c.lg_CLIENT_ID, c.str_FIRST_NAME AS prenom_actuel, UPPER(c.str_FIRST_NAME) AS prenom_majuscules,
       c.str_LAST_NAME AS nom_actuel, UPPER(c.str_LAST_NAME) AS nom_majuscules, c.str_STATUT
FROM t_client c
WHERE BINARY c.str_FIRST_NAME <> BINARY UPPER(c.str_FIRST_NAME)
   OR BINARY c.str_LAST_NAME <> BINARY UPPER(c.str_LAST_NAME)
ORDER BY c.str_LAST_NAME, c.str_FIRST_NAME
LIMIT 200;

SELECT COUNT(*) AS clients_a_modifier FROM t_client c
WHERE BINARY c.str_FIRST_NAME <> BINARY UPPER(c.str_FIRST_NAME)
   OR BINARY c.str_LAST_NAME <> BINARY UPPER(c.str_LAST_NAME);

-- 2. Sauvegarde des noms actuels (une seule fois : un second passage ne l'ecrase pas).
CREATE TABLE IF NOT EXISTS t_client_sauvegarde_noms AS
SELECT lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, dt_UPDATED FROM t_client;

-- 3. Mise en majuscules.
UPDATE t_client
SET str_FIRST_NAME = UPPER(str_FIRST_NAME), str_LAST_NAME = UPPER(str_LAST_NAME), dt_UPDATED = NOW()
WHERE BINARY str_FIRST_NAME <> BINARY UPPER(str_FIRST_NAME)
   OR BINARY str_LAST_NAME <> BINARY UPPER(str_LAST_NAME);

-- 4. Verification : doit renvoyer 0.
SELECT COUNT(*) AS clients_encore_en_minuscules FROM t_client c
WHERE BINARY c.str_FIRST_NAME <> BINARY UPPER(c.str_FIRST_NAME)
   OR BINARY c.str_LAST_NAME <> BINARY UPPER(c.str_LAST_NAME);

-- RETOUR EN ARRIERE (uniquement si besoin) : rend a chaque client ses noms d'avant.
-- UPDATE t_client c JOIN t_client_sauvegarde_noms s ON s.lg_CLIENT_ID = c.lg_CLIENT_ID
-- SET c.str_FIRST_NAME = s.str_FIRST_NAME, c.str_LAST_NAME = s.str_LAST_NAME, c.dt_UPDATED = s.dt_UPDATED
-- WHERE NOT (BINARY c.str_FIRST_NAME <=> BINARY s.str_FIRST_NAME)
--    OR NOT (BINARY c.str_LAST_NAME <=> BINARY s.str_LAST_NAME);
-- Une fois le resultat valide : DROP TABLE t_client_sauvegarde_noms;
