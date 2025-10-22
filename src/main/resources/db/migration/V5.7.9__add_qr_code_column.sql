ALTER TABLE  t_mode_reglement ADD COLUMN IF NOT EXISTS `qr_code` MEDIUMBLOB NULL DEFAULT NULL;



INSERT  IGNORE  INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`) 
	VALUES ('19102025', 'Mode de règlements', NULL, 'Mode de règlements', 'modereglementview', '10', 1, NULL, 'enable', 'P_SM_MODE_REGLEMENT_VIEW', NOW(), NOW(), '');
INSERT IGNORE  INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`) 
	VALUES ('19102025', 'P_SM_MODE_REGLEMENT_VIEW', 'CUSTOMER', 'Mode de règlements', NULL, NOW(), NULL, NOW(), NULL, 'enable');



