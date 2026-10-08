-- Retours du 08/10 (10) : avancement des commandes PharmaML (demande d'etat REQ_ETAT_COMMANDE, reponse
-- SUIVI_COMMANDE, specification CSRP v4.8 § 3.1.2 et § 3.2.2, codes du tableau 11). Une ligne par produit et par
-- reponse ; la derniere reponse donne l'etat affiche dans la liste des commandes.
CREATE TABLE IF NOT EXISTS `t_pharmaml_avancement` (
  `lg_ID` VARCHAR(40) NOT NULL,
  `lg_ORDER_ID` VARCHAR(40) NOT NULL,
  `lg_GROSSISTE_ID` VARCHAR(40) NOT NULL,
  `str_REF_MESSAGE` VARCHAR(40) NULL,
  `str_CODE_PRODUIT` VARCHAR(20) NULL,
  `lg_FAMILLE_ID` VARCHAR(40) NULL,
  `int_QTE` INT NOT NULL DEFAULT 0,
  `str_CODE_STATUT` VARCHAR(10) NULL,
  `str_LIBELLE` VARCHAR(100) NULL,
  `str_DATE_LIVRAISON` VARCHAR(20) NULL,
  `str_COMMENTAIRE` VARCHAR(255) NULL,
  `dt_REPONSE` DATETIME NOT NULL,
  PRIMARY KEY (`lg_ID`),
  KEY `idx_pml_avanc_order` (`lg_ORDER_ID`, `dt_REPONSE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
