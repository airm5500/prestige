-- =====================================================================
-- Menu "Evolution Stock" sous "Gestion du Stock" (lg_MENU_ID = 55111546114940284023)
-- ---------------------------------------------------------------------
-- str_COMPOSANT = xtype ExtJS charge au clic = 'evolutionstock'.
-- Se reconnecter apres execution : les privileges sont recharges a la
-- connexion (USER_LIST_PRIVILEGE).
-- =====================================================================

-- 1) Privilege du nouveau menu
INSERT IGNORE INTO t_privilege
    (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
     `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
VALUES
    ('20260708', 'P_SM_EVOLUTION_STOCK', 'CUSTOMER', 'Menu Evolution Stock',
     NULL, NOW(), NULL, NULL, NULL, 'enable');

-- 2) Sous-menu, rattache au menu "Gestion du Stock"
INSERT IGNORE INTO t_sous_menu
    (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`,
     `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
VALUES
    ('20260708', 'Evolution Stock', NULL, 'Evolution Stock', 'evolutionstock',
     '55111546114940284023', 99, NULL, 'enable', 'P_SM_EVOLUTION_STOCK', NOW(), NULL, '');

-- 3) Visibilite : on attribue le privilege a tous les roles qui ont deja
--    acces a un sous-menu de "Gestion du Stock" (meme perimetre d'utilisateurs).
INSERT INTO t_role_privelege
    (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT DISTINCT LEFT(UUID(), 40), rp.lg_ROLE_ID, '20260708', NOW(), NOW()
FROM t_role_privelege rp
JOIN t_privilege p  ON rp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID
JOIN t_sous_menu sm ON sm.P_KEY = p.str_NAME
WHERE sm.lg_MENU_ID = '55111546114940284023'
  AND rp.lg_ROLE_ID NOT IN (
      SELECT rp2.lg_ROLE_ID FROM t_role_privelege rp2 WHERE rp2.lg_PRIVILEGE_ID = '20260708'
  );
