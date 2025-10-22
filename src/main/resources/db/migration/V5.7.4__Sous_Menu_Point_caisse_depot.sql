
/**
 * Author:  airman
 * Created: 02 août 2025
 */

INSERT INTO `t_sous_menu` (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`) 
	VALUES ('20250802', 'Point Caisse Depot', NULL, 'Point Caisse Depot', 'pointcaisseview', '7', 5, NULL, 'enable', 'P_SM_POINT_SALECASHDEPOT', NULL, NULL, '');

INSERT INTO `t_privilege` (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`) 
	VALUES ('202500802', 'P_SM_POINT_SALECASHDEPOT', 'CUSTOMER', 'GESTION COURANTE - Point Caisse DEPOT', NULL, NULL, NULL, NULL, NULL, 'enable');