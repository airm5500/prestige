-- =====================================================================
-- Demandes serveur des applications mobiles (lot 2, demande 4) : TRAITER LA RESERVE.
-- Les routes qui deplacent le stock entre rayon et reserve (assort, reassort, suggestions de reserve) ne verifiaient
-- que la session. Elles exigent desormais P_TRAITER_RESERVE (ou le menu « Gestion des reserves », P_SM_RESERVE).
-- Decision du pharmacien (14/10) : le droit est donne aux profils Pharmacien et Administrateurs ; AUCUN profil ne perd
-- ce qu'il faisait : les roles qui ont deja le menu P_SM_RESERVE le recoivent aussi.
-- =====================================================================
INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`,
                         `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`,
                         `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_TRAITER_RESERVE', 'CUSTOMER',
       'STOCK - Traiter la reserve (assort, reassort, suggestions de reserve) : deplace le stock rayon / reserve',
       NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_TRAITER_RESERVE');

-- profils Pharmacien et administrateurs (decision du pharmacien), compte systeme
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role r
  JOIN t_privilege cible ON cible.str_NAME = 'P_TRAITER_RESERVE'
 WHERE r.str_NAME IN ('Pharmacien', 'Administrateur', 'Super Administrateur', 'SYSTEM_USER')
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = r.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- roles qui ont deja le menu « Gestion des reserves » : rien ne leur est retire
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role_privelege src
  JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID AND modele.str_NAME = 'P_SM_RESERVE'
  JOIN t_privilege cible  ON cible.str_NAME = 'P_TRAITER_RESERVE'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- et au role du compte administrateur (sinon personne ne pourrait le distribuer)
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_TRAITER_RESERVE'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);
