CREATE TABLE `prix_reference` (
	`id` VARCHAR(70) NOT NULL ,
	`type_prix` VARCHAR(20) NOT NULL ,
	`valeur` INT(8) NOT NULL,
	`produit_id` VARCHAR(70) NOT NULL,
	`tiersPayant_id` VARCHAR(70) NOT NULL ,
	`enabled` BIT(1) NOT NULL,
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `UK2011lfmf4strqpfcqs6pdhfb1` (`tiersPayant_id`, `produit_id`) USING BTREE,
	INDEX `FKpd7yhm20h1gx3g2odplau83qo` (`produit_id`) USING BTREE,
	CONSTRAINT `FKervvnnr98c5r74dhwmdll6r1` FOREIGN KEY (`tiersPayant_id`) REFERENCES `t_tiers_payant` (`lg_TIERS_PAYANT_ID`) ON UPDATE RESTRICT ON DELETE RESTRICT,
	CONSTRAINT `FKpd7yhm20h1gx3g2odplau83qo` FOREIGN KEY (`produit_id`) REFERENCES `t_famille` (`lg_FAMILLE_ID`) ON UPDATE RESTRICT ON DELETE RESTRICT
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
;
CREATE TABLE `prix_reference_vente` (
	`id` VARCHAR(70) NOT NULL ,
	`montant` INT(11) NOT NULL,
	`prix_uni` INT(8) NOT NULL,
	`produit_id` VARCHAR(70) NOT NULL ,
	`compte_client_tiers_payant_id` VARCHAR(70) NOT NULL, 
	`preenregistrement_detail_id` VARCHAR(40) NOT NULL ,
	`prix_reference_id` VARCHAR(70) NOT NULL ,
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `UKgs4m94ftfw6babs4qytvfogy7` (`preenregistrement_detail_id`, `produit_id`, `compte_client_tiers_payant_id`) USING BTREE,
	INDEX `FKbtrf4lh85jvfe5cx71epwnp4u` (`prix_reference_id`) USING BTREE,
	CONSTRAINT `FKbtrf4lh85jvfe5cx71epwnp4u` FOREIGN KEY (`prix_reference_id`) REFERENCES `prix_reference` (`id`) ON UPDATE RESTRICT ON DELETE RESTRICT,
	CONSTRAINT `FKpkfufwvrqtfsanl7v30i5sld8` FOREIGN KEY (`preenregistrement_detail_id`) REFERENCES `t_preenregistrement_detail` (`lg_PREENREGISTREMENT_DETAIL_ID`) ON UPDATE RESTRICT ON DELETE RESTRICT
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
;
ALTER TABLE `t_preenregistrement_detail` DROP COLUMN `cmu_price`;
ALTER TABLE `t_preenregistrement` DROP COLUMN `cmu_amount`;
ALTER TABLE `mvttransaction` DROP COLUMN `cmu_amount`;
ALTER TABLE `t_tiers_payant` DROP COLUMN `is_cmus`;
ALTER TABLE `t_preenregistrement` ADD COLUMN `type_prix` VARCHAR(20)  NULL DEFAULT NULL;
