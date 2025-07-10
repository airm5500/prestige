INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`) 
	VALUES ('KEY_HEURE_ENVOI_SMS_RECAP_ACTIVITE', '0,18,19,20', 'Indiquer la frequence d envoi du SMS  pour le recap d activite ex: 0,18,19,20 etc pour plusieurs heures ', 'CUSTOMER', 'enable', NULL, NULL, NULL, NULL);

INSERT  IGNORE  INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`) 
	VALUES ('20240707', 'Envoi de SMS RECAP', NULL, 'Envoi de SMS RECAP', 'smsRecap', '55201374824233416764', 4, NULL, 'enable', 'P_SM_ENVOI_SMS_RECAP_ACTIVITE', NOW(), NOW(), '');

INSERT IGNORE  INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, 
`dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`) 
	VALUES ('20240707', 'P_SM_ENVOI_SMS_RECAP_ACTIVITE', 'CUSTOMER', 'Envoi de SMS RECAP', NULL, NOW(), NOW(), NULL,NULL, 'enable');