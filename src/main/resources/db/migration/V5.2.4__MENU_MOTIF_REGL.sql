	INSERT  IGNORE  INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`) 
	VALUES ('20230212', 'Motifs règlément', NULL, 'Motifs règlément', 'motifreglement', '10', 8, NULL, 'enable', 'P_SM_MOTIF_REGLEMENT_NEW', CURRENT_DATE, CURRENT_DATE, '');

INSERT IGNORE  INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`) 
	VALUES ('20230212', 'P_SM_MOTIF_REGLEMENT_NEW', 'CUSTOMER', 'Motifs règlément', NULL, '2016-03-01 10:10:01.0', NULL, CURRENT_DATE, NULL, 'enable');

ALTER TABLE motif_reglement ADD  CONSTRAINT motif_reglement_libelle_uniq UNIQUE (libelle);  

UPDATE  reglement_carnet SET type_reglement='REGLEMENT';