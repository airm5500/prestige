-- Mise en page de la facture, reglee sur la fiche du tiers payant.
--
-- Deux reglages, sous la liste de tri des bons :
--   int_NB_BONS_PAR_PAGE : nombre de bons imprimes par page.
--   int_TAILLE_POLICE    : taille de la police des lignes de bon.
--
-- Les deux valent 0 = « Automatique ». A 0, chaque modele imprime EXACTEMENT comme aujourd'hui :
-- la page se remplit d'elle-meme et chaque modele garde sa propre taille de police. Aucune
-- facture existante ne change de presentation tant que l'officine n'a rien saisi.
--
-- Meme reglage sur le createur de modeles de facture (nombre de bons par page ; la taille de
-- police y existe deja depuis V6.8.2).
--
-- Blocs gardes et rejouables (aucun echec si les colonnes existent deja).

SET @existe := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_tiers_payant'
       AND COLUMN_NAME = 'int_NB_BONS_PAR_PAGE');
SET @sql := IF(@existe = 0,
    'ALTER TABLE `t_tiers_payant` ADD COLUMN `int_NB_BONS_PAR_PAGE` INT NOT NULL DEFAULT 0',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_tiers_payant'
       AND COLUMN_NAME = 'int_TAILLE_POLICE');
SET @sql := IF(@existe = 0,
    'ALTER TABLE `t_tiers_payant` ADD COLUMN `int_TAILLE_POLICE` INT NOT NULL DEFAULT 0',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'model_facture_dynamique'
       AND COLUMN_NAME = 'int_NB_BONS_PAR_PAGE');
SET @sql := IF(@existe = 0,
    'ALTER TABLE `model_facture_dynamique` ADD COLUMN `int_NB_BONS_PAR_PAGE` INT NOT NULL DEFAULT 0',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Securite : une valeur absente ou aberrante revient a « Automatique ».
UPDATE `t_tiers_payant` SET `int_NB_BONS_PAR_PAGE` = 0
 WHERE `int_NB_BONS_PAR_PAGE` IS NULL OR `int_NB_BONS_PAR_PAGE` < 0 OR `int_NB_BONS_PAR_PAGE` > 500;
UPDATE `t_tiers_payant` SET `int_TAILLE_POLICE` = 0
 WHERE `int_TAILLE_POLICE` IS NULL OR `int_TAILLE_POLICE` < 0
    OR (`int_TAILLE_POLICE` > 0 AND (`int_TAILLE_POLICE` < 5 OR `int_TAILLE_POLICE` > 12));
UPDATE `model_facture_dynamique` SET `int_NB_BONS_PAR_PAGE` = 0
 WHERE `int_NB_BONS_PAR_PAGE` IS NULL OR `int_NB_BONS_PAR_PAGE` < 0 OR `int_NB_BONS_PAR_PAGE` > 500;
