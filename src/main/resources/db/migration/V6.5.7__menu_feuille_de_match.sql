-- =====================================================================
-- Nouveau sous-menu "Feuille de match" (menu Analyse de gestion)
-- ---------------------------------------------------------------------
-- Variante du menu Classification ABC : regroupe les n meilleurs produits
-- (quantite par defaut, marge ou chiffre d'affaires), n defini par
-- l'utilisateur, avec recherche CIP/nom, filtres grossiste / emplacement /
-- famille / classe ABC combinables, impression PDF (frequences d'achat des
-- 3 derniers mois + mois en cours), exports Excel/CSV, generation
-- d'inventaire et de suggestion.
--
-- L'entree est placee AUTOMATIQUEMENT sous le meme menu parent que la
-- Classification ABC (composant 'abcmanager') via INSERT ... SELECT, sans
-- coder en dur le lg_MENU_ID.
-- =====================================================================

-- 1) Privilege du nouveau menu
INSERT IGNORE INTO t_privilege
    (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
     `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
VALUES
    ('20260724', 'P_SM_FEUILLE_DE_MATCH', 'CUSTOMER', 'Feuille de match des produits',
     NULL, NOW(), NULL, NULL, NULL, 'enable');

-- 2) Sous-menu, place sous le meme menu parent que la Classification ABC
INSERT IGNORE INTO t_sous_menu
    (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`,
     `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT
    '20260724', 'Feuille de match', NULL, 'Feuille de match', 'feuilledematch',
    sm.lg_MENU_ID, 100, NULL, 'enable', 'P_SM_FEUILLE_DE_MATCH', NOW(), NULL, ''
FROM t_sous_menu sm
WHERE sm.str_COMPOSANT = 'abcmanager'
LIMIT 1;

-- 3) Visibilite : on attribue le privilege a tous les roles qui ont deja
--    acces au menu Classification ABC (meme perimetre d'utilisateurs).
INSERT INTO t_role_privelege
    (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), rp.lg_ROLE_ID, '20260724', NOW(), NOW()
FROM t_role_privelege rp
JOIN t_privilege p  ON rp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID
JOIN t_sous_menu sm ON sm.P_KEY = p.str_NAME
WHERE sm.str_COMPOSANT = 'abcmanager'
  AND rp.lg_ROLE_ID NOT IN (
      SELECT rp2.lg_ROLE_ID FROM t_role_privelege rp2 WHERE rp2.lg_PRIVILEGE_ID = '20260724'
  );
