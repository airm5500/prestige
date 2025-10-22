ALTER TABLE  `prix_reference` ADD COLUMN IF NOT EXISTS `valeur_taux` FLOAT NULL DEFAULT NULL;

DROP  TABLE IF EXISTS prix_reference_vente;

CREATE TABLE IF NOT EXISTS  `taux_produit` (
	`id` VARCHAR(70) NOT NULL ,
	`compte_tiers_payant_id` VARCHAR(70) NOT NULL ,
	`sale_iem_id` VARCHAR(70) NOT NULL  ,
	`taux` FLOAT NOT NULL,
	PRIMARY KEY (`id`) USING BTREE
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
;


ALTER TABLE t_preenregistrement_detail ADD COLUMN IF NOT EXISTS calculation_base_price INT(8) NULL DEFAULT NULL;
ALTER TABLE t_preenregistrement DROP COLUMN IF EXISTS  type_prix ;
ALTER TABLE t_preenregistrement ADD COLUMN IF NOT EXISTS  `has_price_option` BIT(1) NULL DEFAULT NULL;