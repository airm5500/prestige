-- =====================================================================
-- Plan du 21/11, point 13 (question 9, reponse du 22/11) : VOIR L'ONGLET « LISTE RESERVE ».
-- L'onglet LISTE RESERVE de la gestion des reserves n'etait lie a aucun droit. Il exige desormais P_RESERVE_LISTE :
-- sans lui, l'onglet n'est pas affiche et ses routes (liste, Excel, PDF, import, enregistrement) refusent.
-- Personne ne perd ce qu'il voit aujourd'hui : le droit est donne aux roles qui ont le menu « Gestion des reserves »
-- (P_SM_RESERVE), seul chemin vers l'onglet, ainsi qu'au role du compte administrateur.
-- Idempotent : une seconde execution n'ajoute rien.
-- =====================================================================
INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`,
                         `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`,
                         `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_RESERVE_LISTE', 'CUSTOMER',
       'RÉSERVE - Voir la liste réserve (onglet Liste réserve)',
       NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_RESERVE_LISTE');

-- roles qui ont le menu « Gestion des reserves »
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM (SELECT DISTINCT rp.lg_ROLE_ID
          FROM t_role_privelege rp
          JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID
         WHERE modele.str_NAME = 'P_SM_RESERVE') src
  JOIN t_privilege cible ON cible.str_NAME = 'P_RESERVE_LISTE'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- et au role du compte administrateur (sinon personne ne pourrait le distribuer)
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_RESERVE_LISTE'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);
