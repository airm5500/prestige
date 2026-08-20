-- =====================================================================
-- Menu « Analyse tiers payants » sous ANALYSE DE GESTION.
-- ---------------------------------------------------------------------
-- Trois insertions, chacune gardee par WHERE NOT EXISTS : le script peut
-- etre rejoue sans creer de doublon ni echouer.
--
-- Le privilege est attribue ici meme au compte systeme '00'. On ne peut pas
-- s'en remettre a la migration repetable R__update_system_privilege, qui le
-- ferait pourtant : Flyway ne rejoue une migration repetable que lorsque son
-- empreinte change, et celle-ci n'a pas ete modifiee. Verifie sur une base
-- reelle : apres l'application de ce script sans l'attribution explicite, le
-- role '00' n'avait pas le privilege et le menu n'apparaissait pas.
--
-- Les autres roles se voient accorder le menu depuis la gestion des profils.
--
-- str_COMPOSANT porte le xtype de l'ecran ExtJS, comme pour les autres
-- sous-menus (voir 'vingtquatrevingt' pour le 20/80).
-- =====================================================================

INSERT INTO t_privilege (lg_PRIVELEGE_ID, str_NAME, str_TYPE, str_DESCRIPTION, str_STATUT, dt_CREATED)
SELECT 'ANALYSE_TP_20260821', 'P_SM_ANALYSE_TIERSPAYANT', 'CUSTOMER',
       'ANALYSE DE GESTION - Analyse tiers payants', 'enable', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.lg_PRIVELEGE_ID = 'ANALYSE_TP_20260821');

INSERT INTO t_sous_menu (lg_SOUS_MENU_ID, str_VALUE, str_DESCRIPTION, str_COMPOSANT, lg_MENU_ID, int_PRIORITY,
                         str_Status, P_KEY, dt_CREATED)
SELECT 'ANALYSE_TP_20260821', 'Analyse tiers payants', 'Analyse tiers payants', 'analysetierspayant', '3', 0,
       'enable', 'P_SM_ANALYSE_TIERSPAYANT', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.lg_SOUS_MENU_ID = 'ANALYSE_TP_20260821');

INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED)
SELECT 'ANALYSE_TP_20260821_R00', '00', 'ANALYSE_TP_20260821', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege r
                  WHERE r.lg_ROLE_ID = '00' AND r.lg_PRIVILEGE_ID = 'ANALYSE_TP_20260821');
