-- Le menu n'est visible que si le privilege est associe a un role de l'utilisateur
-- (chaine t_role_user -> t_role_privelege -> t_privilege -> t_sous_menu).
-- On attribue le privilege du nouveau menu a tous les roles ayant deja acces
-- au menu "Etat de control annuel" (P_SM_ETAT_CONTROL_ANNUEL).
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), rp.lg_ROLE_ID, '20260611', NOW(), NOW()
FROM t_role_privelege rp
JOIN t_privilege p ON rp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID
WHERE p.str_NAME = 'P_SM_ETAT_CONTROL_ANNUEL'
  AND rp.lg_ROLE_ID NOT IN (SELECT rp2.lg_ROLE_ID FROM t_role_privelege rp2 WHERE rp2.lg_PRIVILEGE_ID = '20260611');
