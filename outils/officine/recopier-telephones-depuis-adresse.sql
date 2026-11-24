-- Recopie dans « Téléphone » des numéros saisis autrefois dans « Adresse » (plan du 21/11, point 7).
--
-- Avant le point 7, la fiche d'un client assuré n'avait pas de champ Téléphone : le numéro était souvent tapé dans
-- l'Adresse. Ce script le recopie dans le Téléphone, sans rien effacer.
--
-- Une fiche est recopiée seulement si :
--   - le client est actif ;
--   - son Téléphone est vide ;
--   - son Adresse est un numéro mobile ivoirien conforme, selon exactement la même règle que l'écran : dix chiffres commençant
--     par 01, 05 ou 07. Les espaces, points, tirets, parenthèses, « +225 » et « 00225 » sont tolérés, et le zéro de
--     tête perdu dans un tableur est rétabli ;
--   - aucun autre client actif du même type n'a déjà ce numéro (dans son Téléphone ou son Adresse) : un numéro est
--     unique par type de client. Les doublons sont écartés et comptés, jamais recopiés.
-- L'Adresse d'origine n'est pas modifiée. Le numéro est écrit sous la forme locale à dix chiffres.
-- Le script n'affiche AUCUN numéro ni aucun nom : seulement des nombres de fiches.
--
-- Usage : mariadb -u <utilisateur> -p <base> < recopier-telephones-depuis-adresse.sql
--   1. Lancer tel quel (@ecrire = 0) : aperçu, rien n'est écrit.
--   2. Après accord de la pharmacie, passer @ecrire à 1 et relancer : recopie, puis contrôle.
-- Le script peut être relancé : une fiche déjà recopiée a son Téléphone rempli et n'est plus visée.

SET @ecrire = 0;   -- 0 : aperçu seulement ; 1 : recopie

-- Numéro lu dans l'Adresse, ramené à dix chiffres (NULL s'il n'est pas conforme)
DROP TEMPORARY TABLE IF EXISTS rta_adresse;
CREATE TEMPORARY TABLE rta_adresse AS
SELECT c.lg_CLIENT_ID AS id, COALESCE(c.lg_TYPE_CLIENT_ID, '') AS type_client,
       (c.str_TELEPHONE IS NULL OR TRIM(c.str_TELEPHONE) = '') AS telephone_vide,
       (c.str_ADRESSE IS NOT NULL AND TRIM(c.str_ADRESSE) <> '') AS adresse_remplie,
       REGEXP_REPLACE(COALESCE(c.str_ADRESSE, ''), '[ \\t\\n\\r\\f\\x0B.()-]', '') AS n1
FROM t_client c
WHERE c.str_STATUT = 'enable';

ALTER TABLE rta_adresse ADD COLUMN n2 VARCHAR(60) NULL, ADD COLUMN n3 VARCHAR(60) NULL, ADD COLUMN numero VARCHAR(20) NULL;
UPDATE rta_adresse SET n2 = IF(LEFT(n1, 1) = '+', SUBSTRING(n1, 2), n1);
UPDATE rta_adresse SET n3 = CASE
    WHEN n2 NOT REGEXP '^[0-9]+$' THEN NULL
    WHEN n2 LIKE '00225%' THEN SUBSTRING(n2, 6)
    WHEN n2 LIKE '225%' AND CHAR_LENGTH(n2) = 13 THEN SUBSTRING(n2, 4)
    ELSE n2 END;
UPDATE rta_adresse SET numero = CASE
    WHEN n1 REGEXP '^[157][0-9]{8}$' THEN CONCAT('0', n1)   -- zéro de tête perdu (tableur)
    WHEN n3 REGEXP '^0[157][0-9]{8}$' THEN n3
    ELSE NULL END;

-- Même règle pour le Téléphone des autres fiches (recherche des doublons)
DROP TEMPORARY TABLE IF EXISTS rta_telephone;
CREATE TEMPORARY TABLE rta_telephone AS
SELECT c.lg_CLIENT_ID AS id, COALESCE(c.lg_TYPE_CLIENT_ID, '') AS type_client,
       REGEXP_REPLACE(COALESCE(c.str_TELEPHONE, ''), '[ \\t\\n\\r\\f\\x0B.()-]', '') AS n1
FROM t_client c
WHERE c.str_STATUT = 'enable' AND c.str_TELEPHONE IS NOT NULL AND TRIM(c.str_TELEPHONE) <> '';

ALTER TABLE rta_telephone ADD COLUMN n2 VARCHAR(60) NULL, ADD COLUMN n3 VARCHAR(60) NULL, ADD COLUMN numero VARCHAR(20) NULL;
UPDATE rta_telephone SET n2 = IF(LEFT(n1, 1) = '+', SUBSTRING(n1, 2), n1);
UPDATE rta_telephone SET n3 = CASE
    WHEN n2 NOT REGEXP '^[0-9]+$' THEN NULL
    WHEN n2 LIKE '00225%' THEN SUBSTRING(n2, 6)
    WHEN n2 LIKE '225%' AND CHAR_LENGTH(n2) = 13 THEN SUBSTRING(n2, 4)
    ELSE n2 END;
UPDATE rta_telephone SET numero = CASE
    WHEN n1 REGEXP '^[157][0-9]{8}$' THEN CONCAT('0', n1)   -- zéro de tête perdu (tableur)
    WHEN n3 REGEXP '^0[157][0-9]{8}$' THEN n3
    ELSE NULL END;

-- Fiches visées : Téléphone vide, Adresse conforme, numéro libre dans le type
DROP TEMPORARY TABLE IF EXISTS rta_cible;
CREATE TEMPORARY TABLE rta_cible AS
SELECT a.id, a.numero,
       (EXISTS (SELECT 1 FROM rta_adresse b WHERE b.type_client = a.type_client AND b.numero = a.numero AND b.id <> a.id)
        OR EXISTS (SELECT 1 FROM rta_telephone t WHERE t.type_client = a.type_client AND t.numero = a.numero AND t.id <> a.id)) AS doublon
FROM rta_adresse a
WHERE a.telephone_vide = 1 AND a.numero IS NOT NULL;

-- ÉTAPE 1 : aperçu (aucune écriture)
SELECT
    (SELECT COUNT(*) FROM rta_cible WHERE doublon = 0) AS fiches_a_recopier,
    (SELECT COUNT(*) FROM rta_cible WHERE doublon = 1) AS ecartees_numero_deja_pris_dans_le_type,
    (SELECT COUNT(*) FROM rta_adresse WHERE telephone_vide = 1 AND adresse_remplie = 1 AND numero IS NULL) AS adresse_non_conforme,
    (SELECT COUNT(*) FROM rta_adresse WHERE telephone_vide = 0) AS telephone_deja_rempli;

-- ÉTAPE 2 : recopie (seulement si @ecrire = 1), avec copie des fiches visées pour le retour arrière
START TRANSACTION;

CREATE TABLE IF NOT EXISTS t_client_telephone_recopie (
    lg_CLIENT_ID VARCHAR(40) NOT NULL,
    ancien_telephone VARCHAR(30) NULL,
    ancien_dt_updated DATETIME NULL,
    dt_recopie DATETIME NOT NULL,
    PRIMARY KEY (lg_CLIENT_ID, dt_recopie)
);

SET @maintenant = NOW();

INSERT INTO t_client_telephone_recopie (lg_CLIENT_ID, ancien_telephone, ancien_dt_updated, dt_recopie)
SELECT c.lg_CLIENT_ID, c.str_TELEPHONE, c.dt_UPDATED, @maintenant
FROM t_client c JOIN rta_cible r ON r.id = c.lg_CLIENT_ID
WHERE r.doublon = 0 AND @ecrire = 1;

UPDATE t_client c JOIN rta_cible r ON r.id = c.lg_CLIENT_ID
SET c.str_TELEPHONE = r.numero, c.dt_UPDATED = @maintenant
WHERE r.doublon = 0 AND @ecrire = 1
  AND (c.str_TELEPHONE IS NULL OR TRIM(c.str_TELEPHONE) = '');

SELECT IF(@ecrire = 1, ROW_COUNT(), 0) AS fiches_recopiees;   -- doit être égal à fiches_a_recopier

COMMIT;

-- ÉTAPE 3 : contrôle (après recopie : doit afficher 0)
SELECT IF(@ecrire = 1, COUNT(*), NULL) AS encore_a_recopier
FROM rta_cible r JOIN t_client c ON c.lg_CLIENT_ID = r.id
WHERE r.doublon = 0 AND (c.str_TELEPHONE IS NULL OR TRIM(c.str_TELEPHONE) = '');

DROP TEMPORARY TABLE IF EXISTS rta_cible;
DROP TEMPORARY TABLE IF EXISTS rta_telephone;
DROP TEMPORARY TABLE IF EXISTS rta_adresse;

-- RETOUR ARRIÈRE (si besoin), pour une recopie donnée (date affichée par : SELECT DISTINCT dt_recopie FROM t_client_telephone_recopie) :
-- UPDATE t_client c JOIN t_client_telephone_recopie s ON s.lg_CLIENT_ID = c.lg_CLIENT_ID
-- SET c.str_TELEPHONE = s.ancien_telephone, c.dt_UPDATED = s.ancien_dt_updated
-- WHERE s.dt_recopie = '<date>';
