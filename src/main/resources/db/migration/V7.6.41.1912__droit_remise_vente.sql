-- =====================================================================
-- Demande 63 (applications mobiles, 19/11), point 2 : droit P_REMISE_VENTE, « Remise sur une vente », vérifié par
-- POST v1/vente/remise (et v2/vente/remise) : 403 {interdit:true} sans le droit ; listé par GET v1/user/droits.
-- Aucune régression : jusqu'ici tout compte connecté pouvait remiser une vente ; le droit est donc donné à TOUS les
-- rôles existants. Le pharmacien le retire aux rôles qui ne doivent pas remiser (Gestion des rôles).
-- Rejouable ; aucune donnée existante modifiée.
-- =====================================================================

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
                         `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_REMISE_VENTE', 'CUSTOMER', 'VENTE - Remise sur une vente', NULL,
       NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_REMISE_VENTE');

-- Donné une seule fois, à la création du droit : rejouer la migration ne le redonne pas à un rôle à qui le
-- pharmacien l'a retiré (on ne le donne qu'aux rôles si aucun rôle ne l'a encore).
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role r
  JOIN t_privilege cible ON cible.str_NAME = 'P_REMISE_VENTE'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);
