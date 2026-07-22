
-- ---------------------------------------------------------------------
-- 1) Privilege du menu "Gestion des surstocks" (ID genere, garde par nom)
-- ---------------------------------------------------------------------
INSERT INTO t_privilege
    (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
     `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 50), 'P_SM_GESTION_SURSTOCK', 'CUSTOMER', 'Gestion des surstocks',
       NULL, NOW(), NULL, NOW(), NULL, 'enable'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_SM_GESTION_SURSTOCK');

-- Sous-menu (deja cree par V6.3.6 sur les bases existantes ; utile pour
-- une base neuve) : meme menu que l'ecran 'SurStock', sinon MENU PHARMACIEN
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
SELECT DISTINCT LEFT(UUID(), 40), rp.lg_ROLE_ID, np.lg_PRIVELEGE_ID, NOW(), NOW()
FROM t_role_privelege rp
JOIN t_privilege op ON rp.lg_PRIVILEGE_ID = op.lg_PRIVELEGE_ID
JOIN t_privilege np ON np.str_NAME = 'P_SM_GESTION_SURSTOCK'
WHERE op.str_NAME = 'P_SM_SUR_STOCK'
  AND rp.lg_ROLE_ID NOT IN (
      SELECT rp2.lg_ROLE_ID
      FROM t_role_privelege rp2
      JOIN t_privilege pv ON rp2.lg_PRIVILEGE_ID = pv.lg_PRIVELEGE_ID
      WHERE pv.str_NAME = 'P_SM_GESTION_SURSTOCK'
  );

-- Secours : si aucun role ne detient l'ancien ecran, attribuer aux roles
-- ayant acces au menu parent MENU PHARMACIEN
INSERT INTO t_role_privelege
    (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT DISTINCT LEFT(UUID(), 40), rp.lg_ROLE_ID, np.lg_PRIVELEGE_ID, NOW(), NOW()
FROM t_role_privelege rp
JOIN t_privilege op ON rp.lg_PRIVILEGE_ID = op.lg_PRIVELEGE_ID
JOIN t_privilege np ON np.str_NAME = 'P_SM_GESTION_SURSTOCK'
WHERE op.str_NAME = 'P_M_MENU_PHARMACIEN'
  AND NOT EXISTS (
      SELECT 1
      FROM t_role_privelege rp2
      JOIN t_privilege pv ON rp2.lg_PRIVILEGE_ID = pv.lg_PRIVELEGE_ID
      WHERE pv.str_NAME = 'P_SM_GESTION_SURSTOCK'
  );

-- ---------------------------------------------------------------------
-- 2) Parametre de la cloche de notifications : visible dans la vue
-- ---------------------------------------------------------------------
INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('KEY_NOTIFICATION_REFRESH_SECONDS', '60', 'Frequence d''actualisation de la cloche de notifications (secondes, minimum 15)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NOW());

UPDATE t_parameters
SET str_TYPE = 'CUSTOMER', str_STATUT = 'enable', dt_UPDATED = NOW()
WHERE str_KEY = 'KEY_NOTIFICATION_REFRESH_SECONDS'
  AND (str_TYPE <> 'CUSTOMER' OR str_STATUT <> 'enable');
