CREATE TABLE `ligne_resume_caisse` (
	`id` BIGINT(20) NOT NULL,
	`montant` BIGINT(20) NOT NULL,
	`type_ligne` INT(11) NOT NULL,
	`resume_caisse_id` VARCHAR(40) NOT NULL COLLATE 'utf8_general_ci',
	`type_reglement_id` VARCHAR(40) NOT NULL COLLATE 'utf8_general_ci',
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `FKb54xdmwt7tnf2g5q15ct3ixac` (`resume_caisse_id`) USING BTREE,
	INDEX `FKh09kest51rqmfsdagoa7hprqu` (`type_reglement_id`) USING BTREE,
	CONSTRAINT `FKb54xdmwt7tnf2g5q15ct3ixac` FOREIGN KEY (`resume_caisse_id`) REFERENCES `t_resume_caisse` (`ld_CAISSE_ID`) ON UPDATE RESTRICT ON DELETE RESTRICT,
	CONSTRAINT `FKh09kest51rqmfsdagoa7hprqu` FOREIGN KEY (`type_reglement_id`) REFERENCES `t_type_reglement` (`lg_TYPE_REGLEMENT_ID`) ON UPDATE RESTRICT ON DELETE RESTRICT
)
COLLATE='utf8_general_ci'
ENGINE=InnoDB
;