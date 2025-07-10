CREATE TABLE IF NOT EXISTS  `product_state` (
	`id` BIGINT(20) NOT NULL AUTO_INCREMENT,
	`state` VARCHAR(25) NOT NULL,
	`updated` DATETIME NULL DEFAULT NULL,
	`produit_id` VARCHAR(40) NOT NULL,
	PRIMARY KEY (`id`),
	INDEX `state_index` (`state`),
	INDEX `FKn387af0y8ro0ko3nf34deiv3q` (`produit_id`),
	CONSTRAINT `FKn387af0y8ro0ko3nf34deiv3q` FOREIGN KEY (`produit_id`) REFERENCES `t_famille` (`lg_FAMILLE_ID`)
)
COLLATE='utf8_general_ci'
ENGINE=InnoDB
;
