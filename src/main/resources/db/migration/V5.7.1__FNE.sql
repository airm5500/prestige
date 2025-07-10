CREATE TABLE IF NOT EXISTS `fne_invoice` (
	`id` VARCHAR(70) NOT NULL ,
	`mvt_date` DATETIME NOT NULL,
	`response` LONGTEXT NULL DEFAULT NULL COLLATE 'utf8mb4_bin',
	`facture_id` VARCHAR(40) NOT NULL COLLATE 'utf8mb3_general_ci',
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `FKh88avxjkq113wyni5q86wdkpq` (`facture_id`) USING BTREE,
	CONSTRAINT `FKh88avxjkq113wyni5q86wdkpq` FOREIGN KEY (`facture_id`) REFERENCES `t_facture` (`lg_FACTURE_ID`) ON UPDATE RESTRICT ON DELETE RESTRICT,
	CONSTRAINT `response` CHECK (json_valid(`response`))
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
;
