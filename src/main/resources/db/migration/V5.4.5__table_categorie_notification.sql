CREATE TABLE IF NOT EXISTS  `categorie_notification` (
	`id` INT(11) NOT NULL,
	`canal` VARCHAR(18) NOT NULL COLLATE 'utf8_general_ci',
	`libelle` VARCHAR(255) NOT NULL COLLATE 'utf8_general_ci',
	`name` VARCHAR(255) NOT NULL COLLATE 'utf8_general_ci',
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `UK_j4d9r6sbnrreitp39y1et12p1` (`name`) USING BTREE
)
COLLATE='utf8_general_ci'
ENGINE=InnoDB
;


INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(0,'EMAIL','Deconditionnement de produit','DECONDITIONNEMENT');
INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(1,'EMAIL','Modification prix de vente de produit','MODIFICATION_PRIX_VENTE_PRODUIT');
INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(2,'EMAIL','Annulation de ventet','ANNULATION_DE_VENTE');
INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(3,'EMAIL','Suppression de facture','SUPPRESION_DE_FACTURE');
INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(4,'EMAIL','Desactivation de produit','DESACTIVATION_DE_PRODUIT');
INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(5,'EMAIL','Suppression de produit','SUPPRESSION_DE_PRODUIT');
INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(6,'EMAIL','Activation de produit','ACTIVATION_DE_PRODUIT');
INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(7,'EMAIL','Ajustement de produit','AJUSTEMENT_DE_PRODUIT');
INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(8,'EMAIL','Validation de caisse','VALIDATION_DE_CAISSE');
INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(9,'EMAIL','Annulation de caisse','ANNULATION_DE_CAISSE');
INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(10,'EMAIL','Mouvement de caisse','MVT_DE_CAISSE');
INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(11,'EMAIL','Entree en stock de BL','ENTREE_EN_STOCK');
INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(12,'EMAIL','Cloture de caisse','CLOTURE_DE_CAISSE');
INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(13,'EMAIL','Annulation de cloture de caisse','ANNULATION_CLOTURE_DE_CAISSE');
INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(14,'SMS','Reception avoir','AVOIR_PRODUIT');
INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(15,'EMAIL','Entrée quantité UG','QUANTITE_UG');
INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(16,'EMAIL','Retour fournisseur','RETOUR_FOURNISSEUR');
INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(17,'EMAIL','Modification info produit à la commande','MODIFICATION_INFO_PRODUIT_COMMANDE');
INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(18,'EMAIL','Notification informationnelle','MASSE');
INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(19,'EMAIL','Modification de venete','MOTIFICATION_VENETE');
INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(20,'EMAIL','Saisis de périmés','SAISIS_PERIMES');
INSERT IGNORE  INTO  `categorie_notification` (`id`,`canal`,`libelle`,`name`) VALUES(21,'EMAIL','Ajout de nouveau produit','AJOUT_DE_NOUVEAU_PRODUIT');


DROP INDEX IF EXISTS `notificationIdex1` ON `notification`;
ALTER  TABLE `notification` ADD COLUMN IF NOT EXISTS  `entity_ref` VARCHAR(255)  NULL DEFAULT NULL;
ALTER  TABLE `notification` ADD COLUMN IF NOT EXISTS  `donnees` VARCHAR(255)  NULL DEFAULT NULL;
ALTER TABLE `notification` MODIFY COLUMN   `type_notification` INT(11) NOT NULL;
ALTER TABLE `notification` DROP  COLUMN IF  EXISTS `canal`;
ALTER TABLE `notification` ADD  CONSTRAINT  `FKjdm55fpgk704xpi0lthj2wynp` FOREIGN KEY  IF NOT EXISTS (`type_notification`)  REFERENCES `categorie_notification` (`id`) ;

