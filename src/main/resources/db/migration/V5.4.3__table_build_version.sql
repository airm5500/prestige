
CREATE TABLE IF NOT EXISTS `build_version` (
	`build_date` VARCHAR(50) NOT NULL,
	`builder` VARCHAR(100) NOT NULL,
	`version` VARCHAR(10) NOT NULL,
	`jdkVersion` VARCHAR(50) NOT NULL,
        `created_at` DATETIME NOT NULL,
	PRIMARY KEY (`build_date`)
)
COLLATE='utf8_general_ci'
ENGINE=InnoDB
;

