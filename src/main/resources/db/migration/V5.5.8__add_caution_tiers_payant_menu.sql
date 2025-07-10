
	INSERT IGNORE  INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, 
`str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`, 
`int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`,
 `icon_CLASS`) 
	VALUES ('14122024', 'Cautions', NULL, 'Cautions', 'cautiontierspayant', '53251827585053722655', 10, NULL, 'enable', 'P_SM_CAUTIONS_TP', NOW(), NOW(), '');

INSERT IGNORE  INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`) 
	VALUES ('14122024', 'P_SM_CAUTIONS_TP', 'CUSTOMER', 'Cautions', NULL, NOW(), NULL,  NOW(), NULL, 'enable');



