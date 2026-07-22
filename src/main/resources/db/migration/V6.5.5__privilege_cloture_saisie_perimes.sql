-- Privilege de cloture de la saisie de produits perimes (bouton 'Terminer'
-- de l'ecran de saisie). Controle applique cote ecran (bouton masque) ET
-- cote serveur (endpoint de cloture v1/gestionperime/close).
INSERT IGNORE INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
	VALUES ('20260722', 'P_CLOTURE_SAISIE_PERIMES', 'CUSTOMER', 'Autorisation cloture saisie de perimés', NULL, NOW(), NULL, NOW(), NULL, 'enable');

-- Attribution a TOUS les roles existants pour ne creer aucune regression au
-- deploiement : les administrateurs retirent ensuite le droit aux roles non
-- concernes depuis la gestion des roles/privileges.
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, '20260722', NOW(), NOW()
FROM t_role r
WHERE r.lg_ROLE_ID NOT IN (SELECT rp.lg_ROLE_ID FROM t_role_privelege rp WHERE rp.lg_PRIVILEGE_ID = '20260722');
