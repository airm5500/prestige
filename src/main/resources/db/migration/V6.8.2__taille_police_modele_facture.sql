-- Taille de police des lignes du createur de modeles de facture.
--
-- Jusqu'ici la taille etait figee dans le code : 8 points pour la ligne du bon, 7 pour les
-- lignes de produit. Sur une facture aux colonnes nombreuses, un nom un peu long passait a la
-- ligne sans que l'officine puisse rien y faire.
--
-- int_TAILLE_POLICE vaut 8 par defaut : les modeles deja crees gardent EXACTEMENT la
-- presentation qu'ils ont aujourd'hui.
--
-- Bloc garde et rejouable (aucun echec si la colonne existe deja).

SET @existe := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'model_facture_dynamique'
       AND COLUMN_NAME = 'int_TAILLE_POLICE');
SET @sql := IF(@existe = 0,
    'ALTER TABLE `model_facture_dynamique` ADD COLUMN `int_TAILLE_POLICE` INT NOT NULL DEFAULT 8',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Securite : une taille absente ou aberrante revient a la valeur d'origine.
UPDATE `model_facture_dynamique` SET `int_TAILLE_POLICE` = 8
 WHERE `int_TAILLE_POLICE` IS NULL OR `int_TAILLE_POLICE` < 5 OR `int_TAILLE_POLICE` > 12;
