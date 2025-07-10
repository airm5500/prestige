
	INSERT  IGNORE  INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`) 
	VALUES ('07122021', 'Depot carnet', NULL, 'Depot carnet', 'tierpayantasdepot', '53251827585053722655', 9, NULL, 'enable', 'P_SM_TIERPAYANT_AS_DEPOT', NULL, NULL, '');
INSERT IGNORE  INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`) 
	VALUES ('07122021', 'P_SM_TIERPAYANT_AS_DEPOT', 'CUSTOMER', 'Depot carnet', NULL, '2020-09-27 10:10:01.0', NULL, NULL, NULL, 'enable');



