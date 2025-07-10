CREATE TABLE IF NOT EXISTS  `vente_exclu` (
	`id` VARCHAR(255) NOT NULL,
	`created_at` DATETIME NOT NULL,
	`modified_at` DATETIME NOT NULL,
	`status` VARCHAR(255) NOT NULL,
	`montant_client` INT(11) NOT NULL,
	`montantPaye` INT(11) NOT NULL,
	`montantRegle` INT(11) NOT NULL,
	`montantRemise` INT(11) NULL DEFAULT NULL,
	`montantTiersPayant` INT(11) NOT NULL,
	`montantVente` INT(11) NOT NULL,
	`mvtDate` DATE NOT NULL,
	`mvt_transaction_key` VARCHAR(255) NOT NULL,
	`type_tiers_payant` VARCHAR(40) NOT NULL,
	`client_id` VARCHAR(40) NULL DEFAULT NULL,
	`preenregistrement_id` VARCHAR(40) NOT NULL,
	`tiersPayant_id` VARCHAR(40) NOT NULL,
	`type_reglement_id` VARCHAR(40) NOT NULL,
	PRIMARY KEY (`id`),
	INDEX `VenteExclus_mvt_transaction_key` (`mvt_transaction_key`),
	INDEX `FK9a6rvy6uanclf50fvv59jbmd6` (`client_id`),
	INDEX `FKb3oruc73omm3jfqc1hrvxqv5b` (`preenregistrement_id`),
	INDEX `FK5b9oib1pb7bwd1sm70pcs49s5` (`tiersPayant_id`),
	INDEX `FK3rwtc6308eypgyewbfgsi94op` (`type_reglement_id`),
	CONSTRAINT `FK3rwtc6308eypgyewbfgsi94op` FOREIGN KEY (`type_reglement_id`) REFERENCES `t_type_reglement` (`lg_TYPE_REGLEMENT_ID`),
	CONSTRAINT `FK5b9oib1pb7bwd1sm70pcs49s5` FOREIGN KEY (`tiersPayant_id`) REFERENCES `t_tiers_payant` (`lg_TIERS_PAYANT_ID`),
	CONSTRAINT `FK9a6rvy6uanclf50fvv59jbmd6` FOREIGN KEY (`client_id`) REFERENCES `t_client` (`lg_CLIENT_ID`),
	CONSTRAINT `FKb3oruc73omm3jfqc1hrvxqv5b` FOREIGN KEY (`preenregistrement_id`) REFERENCES `t_preenregistrement` (`lg_PREENREGISTREMENT_ID`)
)
COLLATE='utf8_general_ci'
ENGINE=InnoDB
;

ALTER TABLE  `reglement_carnet` ADD COLUMN IF NOT EXISTS type_tiers_payant VARCHAR (30);
ALTER TABLE  `reglement_carnet` ADD INDEX  `reglement_carnet_type_tiers_payant` (`type_tiers_payant`);