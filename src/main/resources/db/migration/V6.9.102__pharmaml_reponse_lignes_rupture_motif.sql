-- Retours du 08/10 :
-- 1) reponse du grossiste lisible a l'ecran (sans ouvrir le XML) : une ligne par produit de la reponse PharmaML.
CREATE TABLE IF NOT EXISTS `t_pharmaml_reponse_ligne` (
  `lg_ID` VARCHAR(40) NOT NULL,
  `lg_GROSSISTE_ID` VARCHAR(40) NOT NULL,
  `str_SOURCE` VARCHAR(10) NOT NULL,
  `lg_SOURCE_ID` VARCHAR(40) NOT NULL,
  `lg_ORDER_ID` VARCHAR(40) NULL,
  `lg_FAMILLE_ID` VARCHAR(40) NULL,
  `str_CODE_PRODUIT` VARCHAR(20) NULL,
  `int_QTE_COMMANDEE` INT NOT NULL DEFAULT 0,
  `int_QTE_LIVREE` INT NOT NULL DEFAULT 0,
  `int_PRIX_ACHAT` INT NULL,
  `int_PRIX_VENTE` INT NULL,
  `str_CODE_REPONSE` VARCHAR(10) NULL,
  `str_MOTIF` VARCHAR(255) NULL,
  `str_REMPLACANT` VARCHAR(200) NULL,
  `dt_REPONSE` DATETIME NOT NULL,
  PRIMARY KEY (`lg_ID`),
  KEY `idx_pml_rep_source` (`lg_SOURCE_ID`),
  KEY `idx_pml_rep_order` (`lg_ORDER_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
-- 2) liste des ruptures : heure de creation (la date existante reste la date du filtre) et motif de chaque produit.
ALTER TABLE `rupture` ADD COLUMN IF NOT EXISTS `dtHeure` DATETIME NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE `rupture_detail` ADD COLUMN IF NOT EXISTS `motif` VARCHAR(255) NULL;
