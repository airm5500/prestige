-- =====================================================================
-- Demande du 13/10 : menu « Activité des équipes » (productivité).
--
-- « Je veux analyser tout ce qu'un employé peut faire, ressortir la
--   productivité et de l'aide à la décision : un onglet pour les
--   données et recherches et un onglet d'analyse. »
--
-- Place dans ANALYSE DE GESTION (id 3), a cote du Pilotage. Un seul
-- privilege pour tout le menu. Donne au depart aux roles qui voient le
-- Pilotage, et toujours au role du compte administrateur (sans quoi le
-- menu resterait invisible pour celui qui doit le distribuer).
--
-- Rejouable : privilege cree par son nom, attributions et sous-menu
-- gardes par NOT EXISTS.
-- =====================================================================

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`,
                         `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`,
                         `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_SM_ACTIVITE_EQUIPES', 'CUSTOMER',
       'ANALYSE DE GESTION - Activité des équipes (productivité)', NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_SM_ACTIVITE_EQUIPES');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role_privelege src
  JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID
                         AND modele.str_NAME = 'P_SM_PILOTAGE'
  JOIN t_privilege cible  ON cible.str_NAME = 'P_SM_ACTIVITE_EQUIPES'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_SM_ACTIVITE_EQUIPES'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- Libelle de 20 caracteres (regle : 25 au plus), aide au survol dans str_VALUE.
INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`,
                         `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`,
                         `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Tout ce que fait chaque employé : journal, recherches, productivité et aide à la décision',
       NULL, 'Activité des équipes', 'activiteequipes', '3', 1, NULL, 'enable', 'P_SM_ACTIVITE_EQUIPES',
       NOW(), NOW(), ''
  FROM DUAL
 WHERE EXISTS (SELECT 1 FROM t_menu m WHERE m.lg_MENU_ID = '3')
   AND NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.str_COMPOSANT = 'activiteequipes');
