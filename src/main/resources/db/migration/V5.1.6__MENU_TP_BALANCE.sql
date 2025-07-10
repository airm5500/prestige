
	INSERT  IGNORE  INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`) 
	VALUES ('110092022', 'Balance Vente/Caisse carnet', NULL, 'Balance Vente/Caisse carnet', 'balancesalecahsCarnet', '53251827585053722655', 9, NULL, 'enable', 'P_SM_TP_A_EXCLURE_BALANCE', NULL, NULL, '');
INSERT IGNORE  INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`) 
	VALUES ('110092022', 'P_SM_TP_A_EXCLURE_BALANCE', 'CUSTOMER', 'Balance Vente/Caisse carnet', NULL, '2020-09-27 10:10:01.0', NULL, NULL, NULL, 'enable');


