-- Compte des tests d'ecran sur le poste local : e2e / e2e test (mot de passe e2etest), memes droits qu'admin.
-- Uniquement sur la copie de travail laborex_v1_db. Rejouable : remet le mot de passe, le statut et le role.
--   mariadb -u root -p < outils\poste-local\compte-essai.sql
-- Les tests l'utilisent par defaut sous Windows (src/test/e2e/outils/poste.js, E2E_LOGIN pour un autre compte).
USE laborex_v1_db;

-- reglages copies d'admin : emplacement, type, langue, theme
INSERT INTO t_user (lg_USER_ID, lg_EMPLACEMENT_ID, str_LOGIN, str_TYPE, str_PASSWORD, dt_CREATED, dt_UPDATED,
                    str_FIRST_NAME, str_LAST_NAME, lg_Language_ID, lg_SKIN_ID, str_STATUT, str_FUNCTION,
                    b_CHANGE_PASSWORD)
SELECT '90000000000000000001', a.lg_EMPLACEMENT_ID, 'e2e', a.str_TYPE, MD5('e2etest'), NOW(), NOW(),
       'Essai', 'E2E', a.lg_Language_ID, a.lg_SKIN_ID, 'enable', 'Tests e2e', 0
FROM t_user a WHERE a.str_LOGIN = 'admin'
ON DUPLICATE KEY UPDATE str_PASSWORD = MD5('e2etest'), str_STATUT = 'enable', b_CHANGE_PASSWORD = 0,
                        lg_EMPLACEMENT_ID = VALUES(lg_EMPLACEMENT_ID), dt_UPDATED = NOW();

-- meme role qu'admin
DELETE FROM t_role_user WHERE lg_USER_ID = '90000000000000000001';
INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED, dt_UPDATED)
SELECT 'E2E-ROLE-1', ru.lg_ROLE_ID, '90000000000000000001', NOW(), NOW()
FROM t_role_user ru JOIN t_user a ON a.lg_USER_ID = ru.lg_USER_ID WHERE a.str_LOGIN = 'admin';

SELECT u.str_LOGIN, u.str_STATUT, r.str_NAME AS role
FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID JOIN t_role r ON r.lg_ROLE_ID = ru.lg_ROLE_ID
WHERE u.str_LOGIN IN ('admin', 'e2e');
