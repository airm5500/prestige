-- PharmaML (plan d'octobre 1.2, decisions du 06/10 et Q-B) : version du protocole par grossiste, pour l'information
-- produit et pour l'envoi de commande ; 3.0.0.0 par defaut, 1.0.0.0 reste possible grossiste par grossiste.
ALTER TABLE `t_grossiste`
  ADD COLUMN IF NOT EXISTS `str_PHARMAML_VERSION_INFO` VARCHAR(10) NOT NULL DEFAULT '3.0.0.0',
  ADD COLUMN IF NOT EXISTS `str_PHARMAML_VERSION_CMDE` VARCHAR(10) NOT NULL DEFAULT '3.0.0.0';

-- Resultats des demandes d'information produit (disponibilite), historises : jamais une commande.
CREATE TABLE IF NOT EXISTS `t_disponibilite_produit` (
  `lg_ID` VARCHAR(40) NOT NULL,
  `lg_GROSSISTE_ID` VARCHAR(40) NOT NULL,
  `lg_FAMILLE_ID` VARCHAR(40) NOT NULL,
  `str_SOURCE` VARCHAR(20) NOT NULL,
  `lg_SOURCE_ID` VARCHAR(40) NOT NULL,
  `str_CODE_ENVOYE` VARCHAR(20) NULL,
  `str_STATUT` VARCHAR(10) NOT NULL,
  `str_CODE_REPONSE` VARCHAR(10) NULL,
  `str_LIBELLE` VARCHAR(255) NULL,
  `str_DATE_DISPO` VARCHAR(20) NULL,
  `int_QTE_DISPO` INT NULL,
  `str_REMPLACANT_CODE` VARCHAR(20) NULL,
  `str_REMPLACANT_NOM` VARCHAR(100) NULL,
  `int_PRIX` INT NULL,
  `str_REF_REQUETE` VARCHAR(40) NULL,
  `str_VERSION` VARCHAR(10) NULL,
  `lg_USER_ID` VARCHAR(40) NULL,
  `dt_CREATED` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`lg_ID`),
  KEY `idx_dispo_source` (`lg_SOURCE_ID`, `lg_FAMILLE_ID`, `dt_CREATED`),
  KEY `idx_dispo_grossiste` (`lg_GROSSISTE_ID`, `lg_FAMILLE_ID`, `dt_CREATED`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
