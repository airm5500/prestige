-- =====================================================================
-- Retour du 05/11 : menu « Historique » (SERVICE CLIENT, à côté de l'Ordonnancier) qui retrace les ventes des
-- produits sensibles ou de l'ordonnancier : date, ticket, produit, quantité, client, prescripteur, vendeur ;
-- filtres période, produit, catégorie ; impression et export Excel.
--  - privilège P_SM_HISTORIQUE_ORDONNANCIER, donné aux rôles qui ont déjà l'Ordonnancier, aux profils pharmacien et
--    administrateur et au rôle du compte administrateur.
-- Rejouable ; aucune table créée.
-- =====================================================================

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
                         `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_SM_HISTORIQUE_ORDONNANCIER', 'CUSTOMER', 'SERVICE CLIENT - Historique ordonnancier', NULL,
       NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_SM_HISTORIQUE_ORDONNANCIER');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role r
  JOIN t_privilege cible ON cible.str_NAME = 'P_SM_HISTORIQUE_ORDONNANCIER'
 WHERE (r.str_NAME IN ('Pharmacien', 'Administrateur', 'Super Administrateur', 'SYSTEM_USER')
        OR EXISTS (SELECT 1 FROM t_role_privelege rp
                     JOIN t_privilege m ON m.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID
                    WHERE rp.lg_ROLE_ID = r.lg_ROLE_ID AND m.str_NAME = 'P_SM_ORDONNANCIER'))
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = r.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_SM_HISTORIQUE_ORDONNANCIER'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- Libellé court (règle : 25 caractères au plus), aide au survol dans str_VALUE ; juste après l'Ordonnancier.
INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`,
                         `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`,
                         `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Ventes des produits sensibles et de l''ordonnancier : ticket, client, prescripteur, vendeur',
       NULL, 'Historique ordonnancier', 'historiqueordonnancier', s.lg_MENU_ID, s.int_PRIORITY, NULL, 'enable',
       'P_SM_HISTORIQUE_ORDONNANCIER', NOW(), NOW(), ''
  FROM t_sous_menu s
 WHERE s.str_COMPOSANT = 'ordonnancier'
   AND NOT EXISTS (SELECT 1 FROM t_sous_menu x WHERE x.str_COMPOSANT = 'historiqueordonnancier')
 LIMIT 1;
