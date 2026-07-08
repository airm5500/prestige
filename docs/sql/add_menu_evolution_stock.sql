-- ============================================================================
-- Menu "Evolution Stock" sous "Gestion du Stock" (id menu = 55111546114940284023)
-- str_COMPOSANT = xtype ExtJS charge au clic = 'evolutionstock'.
-- Se reconnecter apres execution (les privileges sont recharges a la connexion).
-- ============================================================================

INSERT IGNORE INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
	VALUES ('20260708', 'Evolution Stock', NULL, 'Evolution Stock', 'evolutionstock', '55111546114940284023', 99, NULL, 'enable', 'P_SM_EVOLUTION_STOCK', NOW(), NOW(), '');

INSERT IGNORE INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
	VALUES ('20260708', 'P_SM_EVOLUTION_STOCK', 'CUSTOMER', 'Menu Evolution Stock', NULL, NOW(), NOW(), NULL, NULL, 'enable');

-- (Optionnel) Si le menu n'apparait toujours pas, rattacher le privilege aux roles
-- qui ont deja acces a "Gestion du Stock" :
-- INSERT IGNORE INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `dt_CREATED`, `lg_PRIVILEGE_ID`, `lg_ROLE_ID`)
-- SELECT SUBSTRING(MD5(CONCAT(trp.lg_ROLE_ID,'P_SM_EVOLUTION_STOCK')),1,32), NOW(), '20260708', trp.lg_ROLE_ID
-- FROM t_role_privelege trp
-- JOIN t_privilege p ON trp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID
-- JOIN t_sous_menu s ON s.P_KEY = p.str_NAME
-- WHERE s.lg_MENU_ID = '55111546114940284023'
-- GROUP BY trp.lg_ROLE_ID;
