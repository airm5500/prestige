-- Besoins du 11/10 (point 6) : AUDIT & RAPPROCHEMENTS, onglet Analyse (lecture seule). Menu dans le CENTRE DE SUPPORT,
-- droit dedie donne a l'administrateur par defaut ; les autres roles le recoivent depuis la gestion des roles.
-- Aucune donnee existante modifiee. Rejouable.

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), x.nom, 'CUSTOMER', x.description, NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM (SELECT 'P_SM_AUDIT' nom, 'AUDIT & RAPPROCHEMENTS - Consulter l''analyse (lecture seule)' description) x
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = x.nom);

INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`,
                         `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Rapprochements stock, caisses, différés et carnets dépôt : écarts à contrôler', NULL,
       'Audit & rapprochements', 'auditrapprochements', '20260710', 7, NULL, 'enable', 'P_SM_AUDIT', NOW(), NOW(), ''
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.str_COMPOSANT = 'auditrapprochements')
   AND EXISTS (SELECT 1 FROM t_menu m WHERE m.lg_MENU_ID = '20260710');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, p.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM (SELECT DISTINCT ru.lg_ROLE_ID FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
         WHERE u.str_LOGIN = 'admin') r
  JOIN t_privilege p ON p.str_NAME = 'P_SM_AUDIT'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege d WHERE d.lg_ROLE_ID = r.lg_ROLE_ID AND d.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID);
