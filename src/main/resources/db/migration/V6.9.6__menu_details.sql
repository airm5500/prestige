-- =====================================================================
-- Menu « Détails » sous GESTION DU STOCK.
-- ---------------------------------------------------------------------
-- Deux onglets : liste des produits détaillés (couples produit principal
-- / produit détail) et historique des déconditionnements avec
-- l'opérateur. Éditions PDF, exports Excel, création d'inventaire.
--
-- Même montage que le menu Analyse tiers payants (V6.9.0) : trois
-- insertions gardées par WHERE NOT EXISTS, rejouables sans doublon, et
-- le privilège attribué explicitement au compte système '00' (la
-- migration répétable des privilèges ne serait pas rejouée). Les autres
-- rôles se voient accorder le menu depuis la gestion des profils.
--
-- str_COMPOSANT porte le xtype de l'écran ExtJS.
-- =====================================================================

INSERT INTO t_privilege (lg_PRIVELEGE_ID, str_NAME, str_TYPE, str_DESCRIPTION, str_STATUT, dt_CREATED)
SELECT 'MENU_DETAILS_20260827', 'P_SM_MENU_DETAILS', 'CUSTOMER',
       'GESTION DU STOCK - Details (produits detailles et deconditionnements)', 'enable', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.lg_PRIVELEGE_ID = 'MENU_DETAILS_20260827');

INSERT INTO t_sous_menu (lg_SOUS_MENU_ID, str_VALUE, str_DESCRIPTION, str_COMPOSANT, lg_MENU_ID, int_PRIORITY,
                         str_Status, P_KEY, dt_CREATED)
SELECT 'MENU_DETAILS_20260827', 'Details', 'Produits detailles et historique des deconditionnements',
       'detailsmanager', '55111546114940284023', 0, 'enable', 'P_SM_MENU_DETAILS', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.lg_SOUS_MENU_ID = 'MENU_DETAILS_20260827');

INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED)
SELECT 'MENU_DETAILS_20260827_R00', '00', 'MENU_DETAILS_20260827', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege r
                  WHERE r.lg_ROLE_ID = '00' AND r.lg_PRIVILEGE_ID = 'MENU_DETAILS_20260827');
