-- Retrait des accents dans les noms des DCI existantes (t_dci.str_NAME).
--
-- Chaque lettre accentuee est remplacee par la meme lettre sans accent, en gardant majuscule ou minuscule :
--   A <- À Â Ä   E <- É È Ê Ë   I <- Î Ï   O <- Ô Ö   U <- Ù Û Ü   C <- Ç   Y <- Ÿ   (et leurs minuscules)
-- Seul le nom change : le code, l'identifiant et les produits rattaches restent les memes.
-- Rejouable sans effet. SQL simple, compatible avec les anciens serveurs. Fichier en UTF-8 : l'ouvrir en UTF-8 dans
-- HeidiSQL (sinon les lettres accentuees du script seraient mal lues).

SET NAMES utf8;

-- 1. Apercu : DCI dont le nom porte un accent, avant / apres.
SELECT str_CODE, str_NAME AS nom_actuel, REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(str_NAME, 'À', 'A'), 'Â', 'A'), 'Ä', 'A'), 'É', 'E'), 'È', 'E'), 'Ê', 'E'), 'Ë', 'E'), 'Î', 'I'), 'Ï', 'I'), 'Ô', 'O'), 'Ö', 'O'), 'Ù', 'U'), 'Û', 'U'), 'Ü', 'U'), 'Ç', 'C'), 'Ÿ', 'Y'), 'à', 'a'), 'â', 'a'), 'ä', 'a'), 'é', 'e'), 'è', 'e'), 'ê', 'e'), 'ë', 'e'), 'î', 'i'), 'ï', 'i'), 'ô', 'o'), 'ö', 'o'), 'ù', 'u'), 'û', 'u'), 'ü', 'u'), 'ç', 'c'), 'ÿ', 'y') AS nom_sans_accent, str_STATUT
FROM t_dci
WHERE BINARY str_NAME <> BINARY REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(str_NAME, 'À', 'A'), 'Â', 'A'), 'Ä', 'A'), 'É', 'E'), 'È', 'E'), 'Ê', 'E'), 'Ë', 'E'), 'Î', 'I'), 'Ï', 'I'), 'Ô', 'O'), 'Ö', 'O'), 'Ù', 'U'), 'Û', 'U'), 'Ü', 'U'), 'Ç', 'C'), 'Ÿ', 'Y'), 'à', 'a'), 'â', 'a'), 'ä', 'a'), 'é', 'e'), 'è', 'e'), 'ê', 'e'), 'ë', 'e'), 'î', 'i'), 'ï', 'i'), 'ô', 'o'), 'ö', 'o'), 'ù', 'u'), 'û', 'u'), 'ü', 'u'), 'ç', 'c'), 'ÿ', 'y')
ORDER BY str_NAME;

-- 2. Sauvegarde des noms actuels (une seule fois : un second passage ne l'ecrase pas).
CREATE TABLE IF NOT EXISTS t_dci_sauvegarde_accents AS SELECT * FROM t_dci;

-- 3. Retrait des accents.
UPDATE t_dci
SET str_NAME = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(str_NAME, 'À', 'A'), 'Â', 'A'), 'Ä', 'A'), 'É', 'E'), 'È', 'E'), 'Ê', 'E'), 'Ë', 'E'), 'Î', 'I'), 'Ï', 'I'), 'Ô', 'O'), 'Ö', 'O'), 'Ù', 'U'), 'Û', 'U'), 'Ü', 'U'), 'Ç', 'C'), 'Ÿ', 'Y'), 'à', 'a'), 'â', 'a'), 'ä', 'a'), 'é', 'e'), 'è', 'e'), 'ê', 'e'), 'ë', 'e'), 'î', 'i'), 'ï', 'i'), 'ô', 'o'), 'ö', 'o'), 'ù', 'u'), 'û', 'u'), 'ü', 'u'), 'ç', 'c'), 'ÿ', 'y'), dt_UPDATED = NOW()
WHERE BINARY str_NAME <> BINARY REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(str_NAME, 'À', 'A'), 'Â', 'A'), 'Ä', 'A'), 'É', 'E'), 'È', 'E'), 'Ê', 'E'), 'Ë', 'E'), 'Î', 'I'), 'Ï', 'I'), 'Ô', 'O'), 'Ö', 'O'), 'Ù', 'U'), 'Û', 'U'), 'Ü', 'U'), 'Ç', 'C'), 'Ÿ', 'Y'), 'à', 'a'), 'â', 'a'), 'ä', 'a'), 'é', 'e'), 'è', 'e'), 'ê', 'e'), 'ë', 'e'), 'î', 'i'), 'ï', 'i'), 'ô', 'o'), 'ö', 'o'), 'ù', 'u'), 'û', 'u'), 'ü', 'u'), 'ç', 'c'), 'ÿ', 'y');

-- 4. Verification : doit renvoyer 0.
SELECT COUNT(*) AS dci_encore_accentuees FROM t_dci WHERE BINARY str_NAME <> BINARY REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(str_NAME, 'À', 'A'), 'Â', 'A'), 'Ä', 'A'), 'É', 'E'), 'È', 'E'), 'Ê', 'E'), 'Ë', 'E'), 'Î', 'I'), 'Ï', 'I'), 'Ô', 'O'), 'Ö', 'O'), 'Ù', 'U'), 'Û', 'U'), 'Ü', 'U'), 'Ç', 'C'), 'Ÿ', 'Y'), 'à', 'a'), 'â', 'a'), 'ä', 'a'), 'é', 'e'), 'è', 'e'), 'ê', 'e'), 'ë', 'e'), 'î', 'i'), 'ï', 'i'), 'ô', 'o'), 'ö', 'o'), 'ù', 'u'), 'û', 'u'), 'ü', 'u'), 'ç', 'c'), 'ÿ', 'y');

-- RETOUR EN ARRIERE (uniquement si besoin) : rend aux DCI leur nom d'avant.
-- UPDATE t_dci d JOIN t_dci_sauvegarde_accents s ON s.lg_DCI_ID = d.lg_DCI_ID
-- SET d.str_NAME = s.str_NAME, d.dt_UPDATED = s.dt_UPDATED
-- WHERE BINARY d.str_NAME <> BINARY s.str_NAME;
-- Une fois le resultat valide : DROP TABLE t_dci_sauvegarde_accents;
