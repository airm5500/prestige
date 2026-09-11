-- =====================================================================
-- Analyse article : matrice marge x rotation et produits achetes ensemble
-- ---------------------------------------------------------------------
-- Aucune table : tout est recalcule depuis les ventes, le stock actuel et
-- les seuils ABC a chaque consultation. Seuls le privilege et le sous-menu
-- sont crees, sous le meme menu parent que la classification ABC.
-- =====================================================================

INSERT IGNORE INTO t_privilege
    (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
     `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
VALUES
    ('20260910', 'P_SM_ANALYSE_ARTICLE', 'CUSTOMER', 'Analyse article (marge x rotation, achetes ensemble)',
     NULL, NOW(), NULL, NULL, NULL, 'enable');

INSERT IGNORE INTO t_sous_menu
    (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`,
     `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT
    '20260910', 'Analyse article', NULL, 'Matrice marge x rotation et produits achetes ensemble', 'analysearticle',
    sm.lg_MENU_ID, 98, NULL, 'enable', 'P_SM_ANALYSE_ARTICLE', NOW(), NULL, ''
FROM t_sous_menu sm
WHERE sm.str_COMPOSANT = 'abcmanager'
LIMIT 1;

-- Visibilite : meme perimetre d'utilisateurs que la classification ABC.
INSERT INTO t_role_privelege
    (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), rp.lg_ROLE_ID, '20260910', NOW(), NOW()
FROM t_role_privelege rp
JOIN t_privilege p  ON rp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID
JOIN t_sous_menu sm ON sm.P_KEY = p.str_NAME
WHERE sm.str_COMPOSANT = 'abcmanager'
  AND rp.lg_ROLE_ID NOT IN (
      SELECT rp2.lg_ROLE_ID FROM t_role_privelege rp2 WHERE rp2.lg_PRIVILEGE_ID = '20260910'
  );
