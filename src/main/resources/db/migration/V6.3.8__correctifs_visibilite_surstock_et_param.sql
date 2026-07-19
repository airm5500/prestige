-- =====================================================================
-- Correctifs de visibilite :
-- 1) KEY_NOTIFICATION_REFRESH_SECONDS etait cree avec str_TYPE='SYSTEME' :
--    l'ecran "Parametres" ne liste que les types ADMIN/CUSTOMER pour un
--    role admin (seul le SUPERADMIN voit tout). On passe le parametre en
--    CUSTOMER pour qu'il soit visible et modifiable dans la vue.
-- 2) Menu "Gestion des surstocks" : on rejoue les insertions de V6.3.6
--    (toutes idempotentes) avec un rattachement de secours au MENU
--    PHARMACIEN ('23052020') si l'ecran 'SurStock' n'est pas trouve, et
--    une attribution de secours aux roles ayant le menu parent si aucun
--    role ne detient l'ancien ecran.
-- Se reconnecter apres execution : menus et privileges sont charges en
-- session a la connexion.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Parametre de la cloche de notifications : visible dans la vue
-- ---------------------------------------------------------------------
INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('KEY_NOTIFICATION_REFRESH_SECONDS', '60', 'Frequence d''actualisation de la cloche de notifications (secondes, minimum 15)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NOW());

UPDATE t_parameters
SET str_TYPE = 'CUSTOMER', str_STATUT = 'enable', dt_UPDATED = NOW()
WHERE str_KEY = 'KEY_NOTIFICATION_REFRESH_SECONDS'
  AND (str_TYPE <> 'CUSTOMER' OR str_STATUT <> 'enable');

-- ---------------------------------------------------------------------
-- 2) Menu "Gestion des surstocks" : privilege
-- ---------------------------------------------------------------------
INSERT IGNORE INTO t_privilege
    (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
     `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
VALUES
    ('20260718', 'P_SM_GESTION_SURSTOCK', 'CUSTOMER', 'Gestion des surstocks',
     NULL, NOW(), NULL, NULL, NULL, 'enable');

-- Sous-menu : meme menu que l'ecran 'SurStock', sinon MENU PHARMACIEN
INSERT IGNORE INTO t_sous_menu
    (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`,
     `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT '20260718', 'Gestion des surstocks', NULL,
       'Gestion des surstocks (calculs corriges)', 'gestionsurstock',
       COALESCE(
           (SELECT sm.lg_MENU_ID FROM t_sous_menu sm WHERE sm.str_COMPOSANT = 'SurStock' LIMIT 1),
           (SELECT m.lg_MENU_ID FROM t_menu m WHERE m.lg_MENU_ID = '23052020' LIMIT 1)
       ),
       99, NULL, 'enable', 'P_SM_GESTION_SURSTOCK', NOW(), NULL, ''
FROM DUAL
WHERE COALESCE(
          (SELECT sm.lg_MENU_ID FROM t_sous_menu sm WHERE sm.str_COMPOSANT = 'SurStock' LIMIT 1),
          (SELECT m.lg_MENU_ID FROM t_menu m WHERE m.lg_MENU_ID = '23052020' LIMIT 1)
      ) IS NOT NULL;

-- Visibilite : memes roles que l'ancien ecran "Articles en sur-stock"
INSERT INTO t_role_privelege
    (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT DISTINCT LEFT(UUID(), 40), rp.lg_ROLE_ID, '20260718', NOW(), NOW()
FROM t_role_privelege rp
JOIN t_privilege p ON rp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID
WHERE p.str_NAME = 'P_SM_SUR_STOCK'
  AND rp.lg_ROLE_ID NOT IN (
      SELECT rp2.lg_ROLE_ID FROM t_role_privelege rp2 WHERE rp2.lg_PRIVILEGE_ID = '20260718'
  );

-- Secours : si aucun role ne detient l'ancien ecran (acces herite autrement),
-- attribuer aux roles ayant acces au menu parent MENU PHARMACIEN
INSERT INTO t_role_privelege
    (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT DISTINCT LEFT(UUID(), 40), rp.lg_ROLE_ID, '20260718', NOW(), NOW()
FROM t_role_privelege rp
JOIN t_privilege p ON rp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID
WHERE p.str_NAME = 'P_M_MENU_PHARMACIEN'
  AND NOT EXISTS (
      SELECT 1 FROM t_role_privelege rp2 WHERE rp2.lg_PRIVILEGE_ID = '20260718'
  )
  AND rp.lg_ROLE_ID NOT IN (
      SELECT rp3.lg_ROLE_ID FROM t_role_privelege rp3 WHERE rp3.lg_PRIVILEGE_ID = '20260718'
  );
