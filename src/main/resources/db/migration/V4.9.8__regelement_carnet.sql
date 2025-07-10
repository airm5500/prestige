CREATE TABLE IF NOT EXISTS `reglement_carnet` (
	`id` int(11) NOT NULL AUTO_INCREMENT,
	`description` VARCHAR(250)  NULL,
        `montant_paye` INT(11) NOT NULL,
`montant_a_payer` INT(11) NOT NULL,
`montant_restant` INT(11) NOT NULL,
reference INT(8) NOT NULL,
`tierspayant_id` VARCHAR(40) NOT NULL,
`user_id` VARCHAR(40) NOT NULL,
`createdAt` DATETIME NOT NULL,
	PRIMARY KEY (`id`)

)
COLLATE='utf8_general_ci'
ENGINE=InnoDB
;

ALTER TABLE reglement_carnet ADD CONSTRAINT `reglement_carnet_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES t_user (`lg_USER_ID`);
ALTER TABLE reglement_carnet ADD CONSTRAINT `tierspayant_id_fk` FOREIGN KEY (`tierspayant_id`) REFERENCES t_tiers_payant (`lg_TIERS_PAYANT_ID`);
INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`) 
	VALUES ('EXCLUSION_TIERS6PAYANT_CARNET', '0', 'EXCLUSION TIERS6PAYANT CARNET', 'CUSTOMER', 'enable', NULL, NULL, NULL, NULL);
 