-- Produits retires d'une suggestion, recuperables (plan d'octobre, section 1.4). Chaque suppression de ligne (bouton
-- supprimer, nettoyage, retrait des produits couverts par un equivalent DCI) est copiee ici AVANT la suppression,
-- dans la meme transaction. Ajout pur : aucune table existante n'est modifiee.
CREATE TABLE IF NOT EXISTS `t_suggestion_ligne_retiree` (
  `lg_ID` VARCHAR(40) NOT NULL,
  `lg_SUGGESTION_ORDER_ID` VARCHAR(40) NOT NULL,
  `lg_FAMILLE_ID` VARCHAR(40) NOT NULL,
  `int_NUMBER` INT NOT NULL DEFAULT 0,
  `int_PAF_DETAIL` INT NULL,
  `int_PRICE_DETAIL` INT NULL,
  `str_MOTIF` VARCHAR(40) NOT NULL,
  `lg_USER_ID` VARCHAR(40) NULL,
  `lg_RELIQUAT_SUGGESTION_ID` VARCHAR(40) NULL,
  `dt_RETRAIT` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `dt_RAMENE` DATETIME NULL,
  PRIMARY KEY (`lg_ID`),
  KEY `idx_sugg_retiree_suggestion` (`lg_SUGGESTION_ORDER_ID`, `dt_RAMENE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
