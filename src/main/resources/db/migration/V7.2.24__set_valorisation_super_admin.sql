-- Demande du 26/10 : le menu « Set valorisation » est reserve au super administrateur, comme le Centre de support
-- (V7.2.20, V7.2.21). Son droit passe en type SYSTEME :
--  - le catalogue des droits ne le propose qu'au super administrateur (seul lui peut l'accorder) ;
--  - a la connexion, un droit SYSTEME n'est charge que pour un super administrateur (UserServiceImpl.getAllPrivilege) :
--    menu masque et routes refusees pour les autres profils, meme si le droit leur a ete accorde avant.
-- Les attributions existantes ne sont pas supprimees : remettre le type CUSTOMER suffit a revenir en arriere.
UPDATE t_privilege SET str_TYPE = 'SYSTEME' WHERE str_NAME = 'P_SET_VALORISATION';

-- Le profil Super Administrateur recoit le droit, s'il ne l'a pas deja.
INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, p.lg_PRIVELEGE_ID, NOW(), NOW()
FROM t_role r JOIN t_privilege p
WHERE r.str_NAME LIKE 'Super Administrateur%' AND r.str_STATUT = 'enable'
  AND p.str_NAME = 'P_SET_VALORISATION'
  AND NOT EXISTS (SELECT 1 FROM t_role_privelege rp WHERE rp.lg_ROLE_ID = r.lg_ROLE_ID AND rp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID);
