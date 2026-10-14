-- =====================================================================
-- Retours du 13/10 (point 1) : RETOUR FOURNISSEUR EN ATTENTE DE VALIDATION.
-- Un operateur sans le privilege P_VALIDER_RETOUR_FRS met le retour en attente (statut is_Waiting) : rien ne sort du
-- stock. Un profil qui porte le privilege le valide (sortie du stock), depuis la liste, ou directement a la saisie.
-- =====================================================================
ALTER TABLE t_retour_fournisseur
    ADD COLUMN IF NOT EXISTS dt_ATTENTE DATETIME NULL,
    ADD COLUMN IF NOT EXISTS lg_USER_ATTENTE VARCHAR(40) NULL;

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`,
                         `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`,
                         `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_VALIDER_RETOUR_FRS', 'CUSTOMER',
       'COMMANDE - Valider un retour fournisseur (sortie du stock) ; sans ce droit, le retour est mis en attente',
       NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_VALIDER_RETOUR_FRS');

-- Au depart, AUCUN profil ne perd ce qu'il faisait : le privilege est donne a tous les roles qui ont deja le menu
-- « Retour fournisseur » (P_SM_RETOUR_FRS). L'officine le retire ensuite, depuis l'ecran des roles, aux profils
-- qui doivent seulement mettre en attente.
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role_privelege src
  JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID AND modele.str_NAME = 'P_SM_RETOUR_FRS'
  JOIN t_privilege cible  ON cible.str_NAME = 'P_VALIDER_RETOUR_FRS'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- Et toujours au role du compte administrateur (sinon personne ne pourrait le distribuer).
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_VALIDER_RETOUR_FRS'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);
