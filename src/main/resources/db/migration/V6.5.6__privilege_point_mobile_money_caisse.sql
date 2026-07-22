-- Privilege du bouton 'Point mobile money' de l'ecran de vente (point des
-- montants du jour par mode de reglement mobile money + carte bancaire pour
-- la caissiere connectee). Controle applique cote ecran (bouton masque) ET
-- cote serveur (endpoint v1/caisse/point-mobile-money).
INSERT IGNORE INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
	VALUES ('20260723', 'P_POINT_MOBILE_MONEY_CAISSE', 'CUSTOMER', 'Autorisation Point mobile money caisse', NULL, NOW(), NULL, NOW(), NULL, 'enable');

-- Attribution a TOUS les roles existants pour ne creer aucune regression au
-- deploiement : les administrateurs retirent ensuite le droit aux roles non
-- concernes depuis la gestion des roles/privileges.
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, '20260723', NOW(), NOW()
FROM t_role r
WHERE r.lg_ROLE_ID NOT IN (SELECT rp.lg_ROLE_ID FROM t_role_privelege rp WHERE rp.lg_PRIVILEGE_ID = '20260723');
