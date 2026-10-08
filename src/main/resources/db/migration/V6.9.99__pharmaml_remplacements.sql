-- PharmaML (08/10, point 5) : remplacements annonces par le grossiste dans sa reponse de commande.
-- EL (equivalent livre) et RL (remplacant livre) : deja livres, ajoutes a la commande comme avant ; notes ici.
-- EP (equivalent propose, non livre) : a accepter ou refuser dans l'ecran des ruptures. Accepte = la ligne de rupture
-- passe sur l'equivalent (le renvoi de la rupture le commande). Un choix peut etre memorise par couple de produits.
CREATE TABLE IF NOT EXISTS `t_pharmaml_remplacement` (
  `lg_ID` VARCHAR(40) NOT NULL,
  `lg_GROSSISTE_ID` VARCHAR(40) NOT NULL,
  `lg_ORDER_ID` VARCHAR(40) NULL,
  `str_REF_CDE` VARCHAR(70) NULL,
  `lg_FAMILLE_ID` VARCHAR(40) NOT NULL,
  `lg_RUPTURE_DETAIL_ID` VARCHAR(40) NULL,
  `str_TYPE` VARCHAR(2) NOT NULL,
  `str_CODE_REMPLACANT` VARCHAR(20) NOT NULL,
  `str_TYPE_CODIFICATION` VARCHAR(10) NULL,
  `str_DESIGNATION` VARCHAR(150) NULL,
  `int_QTE` INT NOT NULL DEFAULT 0,
  `int_PRIX_ACHAT` INT NOT NULL DEFAULT 0,
  `int_PRIX_VENTE` INT NOT NULL DEFAULT 0,
  `str_STATUT` VARCHAR(10) NOT NULL,
  `str_MODE` VARCHAR(8) NULL,
  `lg_USER_ID` VARCHAR(40) NULL,
  `dt_CREATED` DATETIME NOT NULL,
  `dt_DECISION` DATETIME NULL,
  PRIMARY KEY (`lg_ID`),
  KEY `idx_pml_rempl_statut` (`str_STATUT`, `dt_CREATED`),
  KEY `idx_pml_rempl_rupture` (`lg_RUPTURE_DETAIL_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE IF NOT EXISTS `t_pharmaml_equivalent_choix` (
  `lg_FAMILLE_ID` VARCHAR(40) NOT NULL,
  `str_CODE_REMPLACANT` VARCHAR(20) NOT NULL,
  `str_CHOIX` VARCHAR(8) NOT NULL,
  `lg_USER_ID` VARCHAR(40) NULL,
  `dt_UPDATED` DATETIME NOT NULL,
  PRIMARY KEY (`lg_FAMILLE_ID`, `str_CODE_REMPLACANT`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
