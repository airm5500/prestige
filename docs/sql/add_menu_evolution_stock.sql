-- ============================================================================
-- Ajout du sous-menu "Evolution Stock" sous le menu "Gestion du Stock"
-- ----------------------------------------------------------------------------
-- Le menu de l'application est pilote par la base (tables t_menu / t_sous_menu).
-- Le champ str_COMPOSANT correspond au xtype ExtJS charge au clic : ici "evolutionstock".
--
-- Ce script reprend, comme modele, un sous-menu existant du MEME menu
-- (menu parent, privilege P_KEY, statut) afin que les memes utilisateurs
-- y aient acces automatiquement.
--
-- 1) (Optionnel) Verifier le libelle exact du menu parent :
--      SELECT lg_MENU_ID, str_DESCRIPTION FROM t_menu ORDER BY int_PRIORITY;
--    Adapter le LIKE ci-dessous si le libelle differe de "Gestion du Stock".
-- 2) Executer l'INSERT.
-- 3) Rafraichir l'application (reconnexion) : le sous-menu apparait sous Gestion du Stock.
-- ============================================================================

INSERT INTO t_sous_menu
    (lg_SOUS_MENU_ID, str_VALUE, str_IMAGE_CSS, str_DESCRIPTION, str_COMPOSANT,
     int_PRIORITY, str_URL, str_Status, P_KEY, dt_CREATED, icon_CLASS, lg_MENU_ID)
SELECT
    'EVOLUTIONSTOCK', tpl.str_VALUE, tpl.str_IMAGE_CSS, 'Evolution Stock', 'evolutionstock',
    999, tpl.str_URL, tpl.str_Status, tpl.P_KEY, NOW(), tpl.icon_CLASS, tpl.lg_MENU_ID
FROM (
    SELECT s.*
    FROM t_sous_menu s
    JOIN t_menu m ON s.lg_MENU_ID = m.lg_MENU_ID
    WHERE m.str_DESCRIPTION LIKE '%Gestion du Stock%'
    ORDER BY s.int_PRIORITY DESC
    LIMIT 1
) AS tpl
WHERE NOT EXISTS (
    SELECT 1 FROM t_sous_menu x WHERE x.str_COMPOSANT = 'evolutionstock'
);

-- Verification :
-- SELECT lg_SOUS_MENU_ID, str_DESCRIPTION, str_COMPOSANT, lg_MENU_ID, str_Status, P_KEY
-- FROM t_sous_menu WHERE str_COMPOSANT = 'evolutionstock';
