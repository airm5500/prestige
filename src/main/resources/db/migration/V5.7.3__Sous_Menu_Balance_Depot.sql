
/**
 * Author:  airman
 * Created: 10 juil. 2025
 */

INSERT INTO `t_sous_menu` (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`) 
	VALUES ('20250709', 'Balance Depot', NULL, 'Balance Depot', 'balancesalecashdepot', '7', 5, NULL, 'enable', 'P_SM_BALANCE_SALECASHDEPOT', NULL, NULL, '');

INSERT INTO `t_privilege` (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`) 
	VALUES ('20250709', 'P_SM_BALANCE_SALECASHDEPOT', 'CUSTOMER', 'GESTION COURANTE - Balance DEPOT', NULL, NULL, NULL, NULL, NULL, 'enable');