CREATE TABLE `motif_reglement` (
	`id` INT(11) NOT NULL AUTO_INCREMENT,
	`libelle` VARCHAR(255) NOT NULL,
	PRIMARY KEY (`id`)
)
COLLATE='utf8_general_ci'
ENGINE=InnoDB;

ALTER TABLE `reglement_carnet` ADD COLUMN `motifReglement_id` INT(11) NULL DEFAULT NULL;
ALTER TABLE `reglement_carnet` ADD COLUMN `type_reglement` VARCHAR(30) NULL DEFAULT NULL;
ALTER TABLE `reglement_carnet`  ADD CONSTRAINT `FKas6vrogr3487l957ay651ot3bCUSM` FOREIGN KEY (`motifReglement_id`) REFERENCES `motif_reglement` (`id`);