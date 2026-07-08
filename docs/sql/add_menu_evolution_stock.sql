-- ============================================================================
-- Ajout du menu "Evolution Stock" (sous "Gestion du Stock")
-- Compatible MySQL/MariaDB. Idempotent (INSERT IGNORE).
-- str_COMPOSANT = xtype ExtJS charge au clic = 'evolutionstock'.
--
-- IMPORTANT : le menu n'apparait que si l'utilisateur possede le privilege
-- (P_KEY) associe. On cree donc le privilege, on le rattache aux roles qui ont
-- deja acces a un sous-menu de "Gestion du Stock", puis on cree le sous-menu.
-- Se reconnecter apres execution (les privileges sont recharges a la connexion).
-- ============================================================================

-- 1) Le privilege
INSERT IGNORE INTO t_privilege
    (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
     `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
VALUES
    ('20260708', 'P_SM_EVOLUTION_STOCK', 'CUSTOMER', 'Menu Evolution Stock', NULL,
     NOW(), NOW(), NULL, NULL, 'enable');

-- 2) Rattachement du privilege aux roles ayant deja acces a "Gestion du Stock"
INSERT IGNORE INTO t_role_privelege
    (`lg_ROLE_PRIVILEGE`, `dt_CREATED`, `lg_PRIVILEGE_ID`, `lg_ROLE_ID`)
SELECT SUBSTRING(MD5(CONCAT(rp.lg_ROLE_ID, 'P_SM_EVOLUTION_STOCK')), 1, 32), NOW(), '20260708', rp.lg_ROLE_ID
FROM (
    SELECT DISTINCT trp.lg_ROLE_ID
    FROM t_role_privelege trp
    JOIN t_privilege p  ON trp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID
    JOIN t_sous_menu s  ON s.P_KEY = p.str_NAME
    JOIN t_menu m       ON s.lg_MENU_ID = m.lg_MENU_ID
    WHERE m.str_DESCRIPTION LIKE '%Gestion du Stock%'
) rp;
-- (Variante : rattacher a TOUS les roles ->
--  INSERT IGNORE INTO t_role_privelege (lg_ROLE_PRIVILEGE, dt_CREATED, lg_PRIVILEGE_ID, lg_ROLE_ID)
--  SELECT SUBSTRING(MD5(CONCAT(r.lg_ROLE_ID,'P_SM_EVOLUTION_STOCK')),1,32), NOW(), '20260708', r.lg_ROLE_ID FROM t_role r; )

-- 3) Le sous-menu, rattache au menu "Gestion du Stock" (id resolu automatiquement)
SET @menu_stock := (SELECT m.lg_MENU_ID FROM t_menu m
                    WHERE m.str_DESCRIPTION LIKE '%Gestion du Stock%'
                    ORDER BY m.int_PRIORITY LIMIT 1);

INSERT IGNORE INTO t_sous_menu
    (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`,
     `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
VALUES
    ('20260708', 'Evolution Stock', NULL, 'Evolution Stock', 'evolutionstock',
     @menu_stock, 99, NULL, 'enable', 'P_SM_EVOLUTION_STOCK', NOW(), NOW(), '');

-- Verifications :
-- SELECT @menu_stock;  -- ne doit pas etre NULL
-- SELECT * FROM t_sous_menu WHERE str_COMPOSANT = 'evolutionstock';
