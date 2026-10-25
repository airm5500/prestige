-- Retours du 25/10 (suite de V7.2.20) : le profil Super Administrateur recoit les droits du Centre de support et de
-- l'audit qui lui sont desormais reserves, s'il ne les a pas deja (l'audit n'avait ete accorde qu'a l'administrateur).
INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, p.lg_PRIVELEGE_ID, NOW(), NOW()
FROM t_role r JOIN t_privilege p
WHERE r.str_NAME LIKE 'Super Administrateur%' AND r.str_STATUT = 'enable'
  AND p.str_NAME IN ('P_M_CENTRE_SUPPORT', 'P_SM_SUPPORT_CONTACT', 'P_SM_SUPPORT_TICKETS', 'P_SM_SUPPORT_DIAGNOSTIC',
                     'P_SM_SUPPORT_SANTE', 'P_SM_SUPPORT_SERVEUR', 'P_SM_SUPPORT_HISTORIQUE', 'P_SM_SUPPORT_MAINTENANCE',
                     'P_SM_AUDIT', 'P_AUDIT_REGULARISER')
  AND NOT EXISTS (SELECT 1 FROM t_role_privelege rp WHERE rp.lg_ROLE_ID = r.lg_ROLE_ID AND rp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID);
