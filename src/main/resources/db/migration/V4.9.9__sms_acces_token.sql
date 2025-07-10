CREATE TABLE IF NOT EXISTS `sms_token` (
	`id` VARCHAR(16) NOT NULL,
	`access_token` VARCHAR(200) NOT NULL,
	`expires_in` INT(11) NOT NULL,
	`app_header` VARCHAR(1000) NOT NULL,
         `create_date` DATETIME NOT NULL,

	PRIMARY KEY (`id`),
	UNIQUE INDEX `sms_token_un` (`access_token`),
	INDEX `sms_token_index` (`access_token`)
)
COLLATE='utf8_general_ci'
ENGINE=InnoDB
;
