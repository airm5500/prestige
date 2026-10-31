-- Faille de droits du 31/10 (profils, utilisateurs, parametres). Rejouable.
--
-- 1. Les droits des menus « Profils », « Utilisateurs », « Gestion des parametrages » et celui de reinitialiser un mot
--    de passe passent du type CUSTOMER au type ADMIN : seuls l'administrateur, le pharmacien et le super administrateur
--    peuvent les accorder. Avant, n'importe quel compte qui gerait les profils pouvait se les donner. Les profils qui
--    les ont deja les gardent (aucune attribution n'est retiree).
UPDATE t_privilege SET str_TYPE = 'ADMIN'
 WHERE str_NAME IN ('P_SM_ROLE', 'P_SM_UTILISATEUR', 'P_SM_PARAMETER_MANAGER', 'P_BT_MODIFICATION_USER')
   AND IFNULL(str_TYPE, '') = 'CUSTOMER';

-- 2. Super administrateur, administrateur et pharmacien etaient reconnus au NOM de leur profil : renommer son profil
--    suffisait a devenir super administrateur. Ils le sont desormais a un droit de type SYSTEME (que seul le super
--    administrateur accorde) ; le nom n'a plus d'effet.
INSERT INTO t_privilege (lg_PRIVELEGE_ID, str_NAME, str_TYPE, str_DESCRIPTION, lg_PRIVELEGE_ID_DEP, dt_CREATED,
                         lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)
SELECT LEFT(UUID(), 40), 'P_PROFIL_SUPER_ADMIN', 'SYSTEME',
       'PROFIL SPECIAL - Super administrateur (tous les droits, gestion des administrateurs)', NULL, NOW(), NULL,
       NOW(), NULL, 'enable'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_PROFIL_SUPER_ADMIN');
INSERT INTO t_privilege (lg_PRIVELEGE_ID, str_NAME, str_TYPE, str_DESCRIPTION, lg_PRIVELEGE_ID_DEP, dt_CREATED,
                         lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)
SELECT LEFT(UUID(), 40), 'P_PROFIL_ADMIN', 'SYSTEME',
       'PROFIL SPECIAL - Administrateur (accorde les droits ADMIN, voit tous les parametres)', NULL, NOW(), NULL,
       NOW(), NULL, 'enable'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_PROFIL_ADMIN');
INSERT INTO t_privilege (lg_PRIVELEGE_ID, str_NAME, str_TYPE, str_DESCRIPTION, lg_PRIVELEGE_ID_DEP, dt_CREATED,
                         lg_CREATED_BY, dt_UPDATED, lg_UPDATED_BY, str_STATUT)
SELECT LEFT(UUID(), 40), 'P_PROFIL_PHARMACIEN', 'SYSTEME',
       'PROFIL SPECIAL - Pharmacien (accorde les droits ADMIN, tableau de bord)', NULL, NOW(), NULL, NOW(), NULL,
       'enable'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_PROFIL_PHARMACIEN');

-- 3. Le droit est pose UNE SEULE FOIS sur les profils reconnus aujourd'hui par leur nom (memes regles que l'ancien
--    code : « Super Administrateur… » par le libelle ou la designation ; « Administrateur… » par le libelle ;
--    « Pharmacien » exactement). Les migrations suivantes ne le posent plus : un profil renomme plus tard n'en recoit
--    aucun. A verifier apres deploiement dans chaque officine (liste des profils concernes : voir la notice).
INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, p.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role r JOIN t_privilege p ON p.str_NAME = 'P_PROFIL_SUPER_ADMIN'
 WHERE (TRIM(r.str_NAME) LIKE 'Super Administrateur%' OR TRIM(r.str_DESIGNATION) LIKE 'Super Administrateur%')
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege rp WHERE rp.lg_ROLE_ID = r.lg_ROLE_ID
                      AND rp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID);
INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, p.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role r JOIN t_privilege p ON p.str_NAME = 'P_PROFIL_ADMIN'
 WHERE TRIM(r.str_NAME) LIKE 'Administrateur%'
   AND NOT (TRIM(r.str_NAME) LIKE 'Super Administrateur%' OR TRIM(r.str_DESIGNATION) LIKE 'Super Administrateur%')
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege rp WHERE rp.lg_ROLE_ID = r.lg_ROLE_ID
                      AND rp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID);
INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, p.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role r JOIN t_privilege p ON p.str_NAME = 'P_PROFIL_PHARMACIEN'
 WHERE TRIM(r.str_NAME) = 'Pharmacien'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege rp WHERE rp.lg_ROLE_ID = r.lg_ROLE_ID
                      AND rp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID);
