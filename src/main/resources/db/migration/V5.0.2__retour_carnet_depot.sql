CREATE TABLE IF NOT EXISTS `motif_retour_carnet` (
	`id` int(11) NOT NULL AUTO_INCREMENT,
	`libelle` VARCHAR(250) NOT NULL,
	PRIMARY KEY (`id`),
UNIQUE INDEX `idx_motif_retout_carnet` (`libelle`)
)
COLLATE='utf8_general_ci'
ENGINE=InnoDB
;

CREATE TABLE IF NOT EXISTS `retour_carnet` (
	`id` int(11) NOT NULL AUTO_INCREMENT,
	`libelle` VARCHAR(250) NOT NULL,
`user_id` VARCHAR(40) NOT NULL,
`tierspayant_id` VARCHAR(40) NOT NULL,
	`created_at` DATETIME NOT NULL,
`status` VARCHAR(40) NOT NULL,
	PRIMARY KEY (`id`),
INDEX `FK1kuavf8xietwd64719uyvs89j` (`tierspayant_id`),
	INDEX `FKi8n805f0245mh7m206md2mq9x` (`user_id`),
	CONSTRAINT `FK1kuavf8xietwd64719uyvs89j` FOREIGN KEY (`tierspayant_id`) REFERENCES `t_tiers_payant` (`lg_TIERS_PAYANT_ID`),
	CONSTRAINT `FKi8n805f0245mh7m206md2mq9x` FOREIGN KEY (`user_id`) REFERENCES `t_user` (`lg_USER_ID`)
)
COLLATE='utf8_general_ci'
ENGINE=InnoDB
;

CREATE TABLE IF NOT EXISTS `retour_carnet_detail` (
	`id` int(11) NOT NULL AUTO_INCREMENT,
	`motif_retour_carnet_id` int(11) NOT NULL,
`retour_carnet_id` int(11) NOT NULL,
	`created_at` DATETIME NOT NULL,
`produit_id` VARCHAR(40) NOT NULL,
`stock_init` int(11) NOT NULL,
`stock_final` int(11) NOT NULL,
`qty_retour` int(11) NOT NULL,
 `prix_uni` int(11) NOT NULL,
	PRIMARY KEY (`id`),
	INDEX `FK8ymt9v9ag1r4jv3if15haajdg` (`motif_retour_carnet_id`),
	INDEX `FK5mxijsvja9my2ooo7gmv8v4hg` (`produit_id`),
	INDEX `FKnq3rnu7974fkr8hij9mgepc4h` (`retour_carnet_id`),
	CONSTRAINT `FK5mxijsvja9my2ooo7gmv8v4hg` FOREIGN KEY (`produit_id`) REFERENCES `t_famille` (`lg_FAMILLE_ID`),
	CONSTRAINT `FK8ymt9v9ag1r4jv3if15haajdg` FOREIGN KEY (`motif_retour_carnet_id`) REFERENCES `motif_retour_carnet` (`id`),
	CONSTRAINT `FKnq3rnu7974fkr8hij9mgepc4h` FOREIGN KEY (`retour_carnet_id`) REFERENCES `retour_carnet` (`id`)
)
COLLATE='utf8_general_ci'
ENGINE=InnoDB
;
