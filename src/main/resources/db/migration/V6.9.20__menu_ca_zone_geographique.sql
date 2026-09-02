-- Point 3 : menu « Chiffre d'affaires par zone géographique » sous ANALYSE DE GESTION
-- (lg_MENU_ID = '3'), même montage rejouable que V6.9.7, privilège accordé au compte '00'.
-- str_COMPOSANT porte le xtype de la vue ExtJS.

INSERT INTO t_privilege (lg_PRIVELEGE_ID, str_NAME, str_TYPE, str_DESCRIPTION, str_STATUT, dt_CREATED)
SELECT 'MENU_CA_ZONE_GEO_20260902', 'P_SM_CA_ZONE_GEO', 'CUSTOMER',
       'ANALYSE DE GESTION - Chiffre d affaires par zone geographique et famille', 'enable', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.lg_PRIVELEGE_ID = 'MENU_CA_ZONE_GEO_20260902');

INSERT INTO t_sous_menu (lg_SOUS_MENU_ID, str_VALUE, str_DESCRIPTION, str_COMPOSANT, lg_MENU_ID, int_PRIORITY,
                         str_Status, P_KEY, dt_CREATED)
SELECT 'MENU_CA_ZONE_GEO_20260902', 'CA par zone géographique',
       'Chiffre d affaires par zone geographique et famille, comparaison de periodes',
       'cazonegeomanager', '3', 8, 'enable', 'P_SM_CA_ZONE_GEO', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.lg_SOUS_MENU_ID = 'MENU_CA_ZONE_GEO_20260902');

INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED)
SELECT 'MENU_CA_ZONE_GEO_20260902_R00', '00', 'MENU_CA_ZONE_GEO_20260902', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege r
                  WHERE r.lg_ROLE_ID = '00' AND r.lg_PRIVILEGE_ID = 'MENU_CA_ZONE_GEO_20260902');
