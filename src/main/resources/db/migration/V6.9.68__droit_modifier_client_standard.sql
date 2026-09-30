-- =====================================================================
-- Ecran de vente, retour du 30/09 : MODIFIER UN CLIENT STANDARD depuis
-- la caisse. Reserve a un droit, « pour eviter que tout le monde le
-- fasse » : la modification vaut pour toute la fiche du client, donc
-- pour toutes ses ventes.
--
-- Cree par son nom (identifiant tire au sort), comme les privileges des
-- ordonnances. Donne au depart au SEUL role du compte administrateur :
-- l'officine l'attribue ensuite role par role depuis l'ecran des roles.
-- =====================================================================
INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`,
                         `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`,
                         `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_CLIENT_STANDARD_MAJ', 'CUSTOMER',
       'VENTE - Modifier la fiche d''un client standard depuis la caisse', NULL, NOW(), NULL, NOW(), NULL, 'enable'
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_CLIENT_STANDARD_MAJ');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_CLIENT_STANDARD_MAJ'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);
