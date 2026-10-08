-- Retours du 08/10 (11) : messages deposes par le grossiste et recuperes au vidage (specification CSRP v4.8).
-- Bon de livraison valorise (BON_LIVRAISON, § 3.2.4) : rattache a la commande par Ref_Cde_Client, il pre-remplit la
-- saisie du bon de livraison (numero, date, montants) et les quantites recues. Informations reglementaires urgentes
-- et alertes commerciales (§ 3.2.6, 3.2.7) : affichees jusqu'a prise de connaissance, produits en stock signales.
CREATE TABLE IF NOT EXISTS `t_pharmaml_blv` (
  `lg_ID` VARCHAR(40) NOT NULL,
  `lg_GROSSISTE_ID` VARCHAR(40) NOT NULL,
  `lg_ORDER_ID` VARCHAR(40) NULL,
  `str_REF_MESSAGE` VARCHAR(40) NULL,
  `str_REF_DOCUMENT` VARCHAR(40) NULL,
  `str_REF_LIVRAISON` VARCHAR(40) NULL,
  `str_DATE_LIVRAISON` VARCHAR(20) NULL,
  `str_REF_FACTURE` VARCHAR(40) NULL,
  `str_DATE_FACTURE` VARCHAR(20) NULL,
  `str_REF_CDE` VARCHAR(40) NULL,
  `str_TOURNEE` VARCHAR(40) NULL,
  `int_MONTANT_HT` BIGINT NULL,
  `int_MONTANT_TAXES` BIGINT NULL,
  `int_MONTANT_TTC` BIGINT NULL,
  `int_LIGNES` INT NOT NULL DEFAULT 0,
  `str_ARCHIVE` VARCHAR(150) NULL,
  `lg_BON_LIVRAISON_ID` VARCHAR(40) NULL,
  `dt_RECU` DATETIME NOT NULL,
  `dt_UTILISE` DATETIME NULL,
  PRIMARY KEY (`lg_ID`),
  KEY `idx_pml_blv_order` (`lg_ORDER_ID`),
  KEY `idx_pml_blv_gros` (`lg_GROSSISTE_ID`, `dt_RECU`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE IF NOT EXISTS `t_pharmaml_blv_ligne` (
  `lg_ID` VARCHAR(40) NOT NULL,
  `lg_BLV_ID` VARCHAR(40) NOT NULL,
  `int_NUM` INT NOT NULL DEFAULT 0,
  `str_CODE_PRODUIT` VARCHAR(20) NULL,
  `str_DESIGNATION` VARCHAR(100) NULL,
  `lg_FAMILLE_ID` VARCHAR(40) NULL,
  `str_REF_CDE` VARCHAR(40) NULL,
  `int_QTE_CDE` INT NOT NULL DEFAULT 0,
  `int_QTE_LIVREE` INT NOT NULL DEFAULT 0,
  `int_QTE_FACTUREE` INT NOT NULL DEFAULT 0,
  `int_PRIX` BIGINT NULL,
  `str_NATURE_PRIX` VARCHAR(5) NULL,
  `dbl_TAUX_TVA` DECIMAL(6,3) NULL,
  `str_COMMENTAIRE` VARCHAR(255) NULL,
  PRIMARY KEY (`lg_ID`),
  KEY `idx_pml_blv_ligne` (`lg_BLV_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE IF NOT EXISTS `t_pharmaml_alerte` (
  `lg_ID` VARCHAR(40) NOT NULL,
  `lg_GROSSISTE_ID` VARCHAR(40) NOT NULL,
  `str_TYPE` VARCHAR(15) NOT NULL,
  `str_NUMERO` VARCHAR(40) NULL,
  `str_MOTIF` VARCHAR(255) NULL,
  `str_DESIGNATION` VARCHAR(255) NULL,
  `b_ARRET_IMMEDIAT` TINYINT(1) NOT NULL DEFAULT 0,
  `b_RENVOI` TINYINT(1) NOT NULL DEFAULT 0,
  `str_DATE_LIMITE` VARCHAR(20) NULL,
  `str_INSTRUCTIONS` TEXT NULL,
  `str_ANNEXE` TEXT NULL,
  `str_REF_MESSAGE` VARCHAR(40) NULL,
  `str_ARCHIVE` VARCHAR(150) NULL,
  `dt_RECU` DATETIME NOT NULL,
  `dt_LU` DATETIME NULL,
  `str_LU_PAR` VARCHAR(100) NULL,
  PRIMARY KEY (`lg_ID`),
  KEY `idx_pml_alerte_lu` (`dt_LU`, `dt_RECU`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE IF NOT EXISTS `t_pharmaml_alerte_produit` (
  `lg_ID` VARCHAR(40) NOT NULL,
  `lg_ALERTE_ID` VARCHAR(40) NOT NULL,
  `str_CODE_PRODUIT` VARCHAR(20) NULL,
  `str_DESIGNATION` VARCHAR(100) NULL,
  `str_FABRICANT` VARCHAR(100) NULL,
  `str_LOTS` VARCHAR(1000) NULL,
  `lg_FAMILLE_ID` VARCHAR(40) NULL,
  PRIMARY KEY (`lg_ID`),
  KEY `idx_pml_alerte_produit` (`lg_ALERTE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
