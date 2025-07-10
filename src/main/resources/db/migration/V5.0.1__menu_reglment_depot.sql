
	INSERT  IGNORE  INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`) 
	VALUES ('15112021', 'Gestion carnet dépôt', NULL, 'Gestion carnet dépôt', 'reglementdepot', '53251827585053722655', 9, NULL, 'enable', 'P_SM_RG_DEPOT', NULL, NULL, '');
INSERT IGNORE  INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`) 
	VALUES ('15112021', 'P_SM_RG_DEPOT', 'CUSTOMER', 'Gestion carnet dépôt', NULL, '2020-09-27 10:10:01.0', NULL, NULL, NULL, 'enable');

INSERT  IGNORE  INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`) 
	VALUES ('17112021', 'Retour carnet dépôt', NULL, 'Retour carnet dépôt', 'retourcarnetdepot', '53251827585053722655', 9, NULL, 'enable', 'P_SM_RTC_DEPOT', NULL, NULL, '');
INSERT IGNORE  INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`) 
	VALUES ('17112021', 'P_SM_RTC_DEPOT', 'CUSTOMER', 'Retour carnet dépôt', NULL, '2020-09-27 10:10:01.0', NULL, NULL, NULL, 'enable');



