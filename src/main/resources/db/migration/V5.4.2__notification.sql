INSERT  IGNORE  INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`) 
	VALUES ('20240310', 'Menu notification ', NULL, 'Menu notifications', 'menunotification', '55201374824233416764', 5, NULL, 'enable', 'P_SM_NOTIFICATION_SMS_EMAIL', NOW(), NOW(), '');

INSERT IGNORE  INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, 
`dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`) 
	VALUES ('20240310', 'P_SM_NOTIFICATION_SMS_EMAIL', 'CUSTOMER', 'Menu notifications', NULL, NOW(), NOW(), NULL,NULL, 'enable');

INSERT IGNORE INTO t_user (`lg_USER_ID`, `lg_EMPLACEMENT_ID`, `str_IDS`, `str_LOGIN`, `str_TYPE`, `str_PASSWORD`, `str_CODE`, `dt_CREATED`, `dt_UPDATED`, `str_CREATED_BY`, `str_UPDATED_BY`, `str_FIRST_NAME`, `str_LAST_NAME`, `str_LAST_CONNECTION_DATE`, `lg_Language_ID`, `lg_SKIN_ID`, `str_STATUT`, `dt_LAST_ACTIVITY`, `str_FUNCTION`, `str_PHONE`, `str_MAIL`, `int_CONNEXION`, `b_CHANGE_PASSWORD`, b_is_connected, `str_PIC`) 
	VALUES ('00', '1', 8, 'admin@02', 'SYSTEM_USER', NULL, NULL, NULL, NULL, NULL, NULL, 'admin@02', 'admin@02', now(), '1', '3', 'disable', now(), 'SYSTEM_USER', NULL, NULL, 0, false, false, 'default.png');
INSERT IGNORE INTO t_role (`lg_ROLE_ID`, `str_NAME`, `str_DESIGNATION`, `str_TYPE`, `str_STATUT`, `dt_CREATED`, `dt_UPDATED`) 
	VALUES ('00', 'SYSTEM_USER', 'SYSTEM_USER', 'SYSTEM_USER', 'disable', now(), now());

INSERT IGNORE INTO t_role_user (`lg_USER_ROLE_ID`, `lg_ROLE_ID`, `lg_USER_ID`, `dt_CREATED`, `dt_UPDATED`, `str_CREATED_BY`, `str_UPDATED_BY`) 
	VALUES ('00', '00', '00', now(), now(), NULL, NULL);
ALTER  TABLE `notification_client` ADD COLUMN IF NOT EXISTS  `statut` VARCHAR(20)  NULL DEFAULT NULL;
ALTER  TABLE `notification_client` ADD COLUMN IF NOT EXISTS  `sent_at` DATETIME  NULL DEFAULT NULL;