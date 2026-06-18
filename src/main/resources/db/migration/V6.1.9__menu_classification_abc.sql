-- =====================================================================
-- Lot 1 - Entree de menu "Classification ABC"
-- ---------------------------------------------------------------------
-- L'entree est placee AUTOMATIQUEMENT sous le meme menu parent que le
-- 20/80 (composant 'vingtquatrevingt') via INSERT ... SELECT, sans avoir
-- a coder en dur le lg_MENU_ID (inconnu cote migration car present dans
-- le schema de base).
--
-- Si le menu 20/80 utilise un autre composant, l'INSERT du sous-menu
-- n'inserera rien (aucune erreur) : il suffira alors d'executer
--   SELECT lg_MENU_ID, str_COMPOSANT FROM t_sous_menu
--    WHERE str_VALUE LIKE '%20/80%';
-- et d'adapter la clause WHERE ci-dessous.
-- =====================================================================

-- 1) Privilege du nouveau menu
INSERT IGNORE INTO t_privilege
    (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
     `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
VALUES
    ('20260618', 'P_SM_CLASSIFICATION_ABC', 'CUSTOMER', 'Classification ABC des produits',
     NULL, NOW(), NULL, NULL, NULL, 'enable');

-- 2) Sous-menu, place sous le meme menu parent que le 20/80
INSERT IGNORE INTO t_sous_menu
    (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`,
     `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT
    '20260618', 'Classification ABC', NULL, 'Classification ABC des produits', 'abcmanager',
    sm.lg_MENU_ID, 99, NULL, 'enable', 'P_SM_CLASSIFICATION_ABC', NOW(), NULL, ''
FROM t_sous_menu sm
WHERE sm.str_COMPOSANT = 'vingtquatrevingt'
LIMIT 1;

-- 3) Visibilite : on attribue le privilege ABC a tous les roles qui ont
--    deja acces au menu 20/80 (meme perimetre d'utilisateurs).
INSERT INTO t_role_privelege
    (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), rp.lg_ROLE_ID, '20260618', NOW(), NOW()
FROM t_role_privelege rp
JOIN t_privilege p  ON rp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID
JOIN t_sous_menu sm ON sm.P_KEY = p.str_NAME
WHERE sm.str_COMPOSANT = 'vingtquatrevingt'
  AND rp.lg_ROLE_ID NOT IN (
      SELECT rp2.lg_ROLE_ID FROM t_role_privelege rp2 WHERE rp2.lg_PRIVILEGE_ID = '20260618'
  );
