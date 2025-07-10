CREATE TABLE `caution` (
	`id` VARCHAR(255) NOT NULL COLLATE 'utf8mb3_general_ci',
	`montant` INT(11) NOT NULL,
	`mvt_date` DATETIME NOT NULL,
	`tiersPayant_id` VARCHAR(40) NOT NULL COLLATE 'utf8mb3_general_ci',
	`user_id` VARCHAR(40) NOT NULL COLLATE 'utf8mb3_general_ci',
	`conso` INT(11) NOT NULL,
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `UK_3lpgnu10pl3uefrfbo8yroydf` (`tiersPayant_id`) USING BTREE,
	INDEX `FK6gacmsgk048580yuqre8w73cy` (`user_id`) USING BTREE,
	CONSTRAINT `FK6gacmsgk048580yuqre8w73cy` FOREIGN KEY (`user_id`) REFERENCES `t_user` (`lg_USER_ID`) ON UPDATE RESTRICT ON DELETE RESTRICT,
	CONSTRAINT `FKnxak1kan7fuftickp4xqdor06` FOREIGN KEY (`tiersPayant_id`) REFERENCES `t_tiers_payant` (`lg_TIERS_PAYANT_ID`) ON UPDATE RESTRICT ON DELETE RESTRICT
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
;


CREATE TABLE `caution_historique` (
	`id` VARCHAR(100) NOT NULL COLLATE 'utf8mb3_general_ci',
	`montant` INT(11) NOT NULL,
	`mvt_date` DATETIME NOT NULL,
        `mvt_update` DATETIME NOT NULL,
	`caution_id` VARCHAR(255) NOT NULL COLLATE 'utf8mb3_general_ci',
	`user_id` VARCHAR(40) NOT NULL COLLATE 'utf8mb3_general_ci',
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `FKlm5tlk7ca58rng2xcjpqp2d9q` (`caution_id`) USING BTREE,
	INDEX `FK40fuhjajhcvvw35ignrqsr2ld` (`user_id`) USING BTREE,
	CONSTRAINT `FK40fuhjajhcvvw35ignrqsr2ld` FOREIGN KEY (`user_id`) REFERENCES `t_user` (`lg_USER_ID`) ON UPDATE RESTRICT ON DELETE RESTRICT,
	CONSTRAINT `FKlm5tlk7ca58rng2xcjpqp2d9q` FOREIGN KEY (`caution_id`) REFERENCES `caution` (`id`) ON UPDATE RESTRICT ON DELETE RESTRICT
)
COLLATE='utf8mb3_general_ci'
ENGINE=InnoDB
;

ALTER TABLE t_preenregistrement ADD COLUMN `caution_id` VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8mb3_general_ci';
ALTER TABLE t_preenregistrement ADD INDEX `FK37vi39vy91lmj4v1u6wsqiyrq` (`caution_id`) USING BTREE;
ALTER TABLE t_preenregistrement ADD CONSTRAINT `FK37vi39vy91lmj4v1u6wsqiyrq` FOREIGN KEY (`caution_id`) REFERENCES `caution` (`id`) ON UPDATE RESTRICT ON DELETE RESTRICT