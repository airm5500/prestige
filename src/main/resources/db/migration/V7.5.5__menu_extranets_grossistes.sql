-- =====================================================================
-- Plan du 07/11 : menu « Extranets grossistes » (GESTION DES COMMANDES) : lecture seule des extranets Ubipharm et
-- TEDIS (fiche produit, réapprovisionnements, réclamations, nouveaux produits), avec la date de chaque collecte.
--  - privilège P_SM_EXTRANETS_GROSSISTES, donné aux profils pharmacien et administrateur et au rôle du compte
--    administrateur. Renseigner la session d'un extranet reste réservé à l'administrateur (contrôle dans l'API).
-- Rejouable ; aucune table créée.
-- =====================================================================

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
                         `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_SM_EXTRANETS_GROSSISTES', 'CUSTOMER', 'GESTION DES COMMANDES - Extranets grossistes', NULL,
       NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_SM_EXTRANETS_GROSSISTES');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role r
  JOIN t_privilege cible ON cible.str_NAME = 'P_SM_EXTRANETS_GROSSISTES'
 WHERE r.str_NAME IN ('Pharmacien', 'Administrateur', 'Super Administrateur', 'SYSTEM_USER')
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = r.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_SM_EXTRANETS_GROSSISTES'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- Libellé court (règle : 25 caractères au plus), aide au survol dans str_VALUE.
INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`,
                         `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`,
                         `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Extranets Ubipharm et TEDIS en lecture seule : fiche produit, réapprovisionnements, réclamations',
       NULL, 'Extranets grossistes', 'extranetsgrossistes', '6', 2, NULL, 'enable', 'P_SM_EXTRANETS_GROSSISTES',
       NOW(), NOW(), ''
  FROM DUAL
 WHERE EXISTS (SELECT 1 FROM t_menu m WHERE m.lg_MENU_ID = '6')
   AND NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.str_COMPOSANT = 'extranetsgrossistes');
