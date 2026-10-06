-- Statuts de suggestion (plan d'octobre 1.3) : « Clôturée » (dernier produit traité) et « Commandée » (preuve que la
-- commande a ete passee : date, mode, utilisateur, commande creee). Colisage du produit (6, rappele dans la grille de
-- la suggestion ; informatif). Colonnes nullable : rien d'existant n'est modifie.
ALTER TABLE `t_suggestion_order`
  ADD COLUMN IF NOT EXISTS `dt_CLOTURE` DATETIME NULL,
  ADD COLUMN IF NOT EXISTS `dt_COMMANDEE` DATETIME NULL,
  ADD COLUMN IF NOT EXISTS `lg_USER_COMMANDE_ID` VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS `str_MODE_COMMANDE` VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS `lg_ORDER_ID` VARCHAR(40) NULL;

ALTER TABLE `t_famille` ADD COLUMN IF NOT EXISTS `int_COLISAGE` INT NULL;
