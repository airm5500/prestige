-- =====================================================================
-- Rattrapage de la casse des ayants droit (Clementine).
--
-- Défaut de l'ancienne version : à la création d'un client assuré, le nom de l'ayant droit principal était recopié
-- tel que tapé, alors que celui de l'assuré était passé en majuscules. Corrigé depuis le 07/09/2026.
--
-- Principe : le nom et le prénom des ayants droit qui ne sont pas en majuscules passent en majuscules, comme le fait
-- l'écran « Modifier infos client ». Rien d'autre n'est touché : ni les numéros, ni les dates, ni les ventes.
-- Sur la copie du 24/11 : 178 ayants droit, dont 176 ayants droit principaux.
--
-- À EXÉCUTER : une seule fois, après une sauvegarde. Prestige peut rester ouvert.
-- La création de la table de trace échoue si le script a déjà été joué : c'est voulu.
-- =====================================================================

-- 1. Table de trace : le nom d'avant, pour le retour arrière.
CREATE TABLE rattrapage_casse_ayants_droit_20261126 (
    lg_AYANTS_DROITS_ID VARCHAR(40) NOT NULL PRIMARY KEY,
    lg_CLIENT_ID        VARCHAR(40) NULL,
    prenom_avant        VARCHAR(50) NULL,
    nom_avant           VARCHAR(50) NULL,
    principal           TINYINT NOT NULL,
    dt_rattrapage       DATETIME NOT NULL
);

INSERT INTO rattrapage_casse_ayants_droit_20261126
SELECT a.lg_AYANTS_DROITS_ID, a.lg_CLIENT_ID, a.str_FIRST_NAME, a.str_LAST_NAME,
       IFNULL(a.str_NUMERO_SECURITE_SOCIAL = c.str_NUMERO_SECURITE_SOCIAL, 0), NOW()
FROM t_ayant_droit a
LEFT JOIN t_client c ON c.lg_CLIENT_ID = a.lg_CLIENT_ID
WHERE BINARY CONCAT(IFNULL(a.str_FIRST_NAME, ''), IFNULL(a.str_LAST_NAME, ''))
   <> BINARY UPPER(CONCAT(IFNULL(a.str_FIRST_NAME, ''), IFNULL(a.str_LAST_NAME, '')));

-- 2. Contrôle avant écriture (sur la copie du 24/11 : 178, dont 176 principaux).
SELECT COUNT(*) AS a_corriger, SUM(principal) AS dont_principaux
FROM rattrapage_casse_ayants_droit_20261126;

START TRANSACTION;

-- 3. Nom et prénom en majuscules.
UPDATE t_ayant_droit a
JOIN rattrapage_casse_ayants_droit_20261126 r ON r.lg_AYANTS_DROITS_ID = a.lg_AYANTS_DROITS_ID
SET a.str_FIRST_NAME = UPPER(a.str_FIRST_NAME),
    a.str_LAST_NAME  = UPPER(a.str_LAST_NAME);

COMMIT;

-- 4. Contrôles après écriture : les deux valeurs doivent être 0.
SELECT (SELECT COUNT(*) FROM t_ayant_droit a
         WHERE BINARY CONCAT(IFNULL(a.str_FIRST_NAME, ''), IFNULL(a.str_LAST_NAME, ''))
            <> BINARY UPPER(CONCAT(IFNULL(a.str_FIRST_NAME, ''), IFNULL(a.str_LAST_NAME, '')))) AS restes_pas_en_majuscules,
       (SELECT COUNT(*) FROM rattrapage_casse_ayants_droit_20261126 r
          JOIN t_ayant_droit a ON a.lg_AYANTS_DROITS_ID = r.lg_AYANTS_DROITS_ID
         WHERE NOT (a.str_FIRST_NAME <=> r.prenom_avant AND a.str_LAST_NAME <=> r.nom_avant)) AS noms_changes_autrement_que_par_la_casse;

-- Retour arrière, si besoin :
--   UPDATE t_ayant_droit a JOIN rattrapage_casse_ayants_droit_20261126 r
--     ON r.lg_AYANTS_DROITS_ID = a.lg_AYANTS_DROITS_ID
--   SET a.str_FIRST_NAME = r.prenom_avant, a.str_LAST_NAME = r.nom_avant;
--   DROP TABLE rattrapage_casse_ayants_droit_20261126;
