-- Privileges des boutons de la fiche article (gestion du stock) :
--   P_BTN_CREER_ARTICLE     : bouton 'Créer un Article'
--   P_BTN_RECALCULER_SEUILS : bouton 'Recalculer seuils'
--   P_BTN_MAJ_SEUIL         : bouton 'MAJ SEUIL'
--   P_BTN_IMPORT_ARTICLE    : menu 'Importation' (Importer + Verifier l'importation)
-- Controle applique cote ecran (bouton masque) ET cote serveur.
INSERT IGNORE INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
	VALUES ('20260811', 'P_BTN_CREER_ARTICLE', 'CUSTOMER', 'Fiche article : bouton créer un article', NULL, NOW(), NULL, NOW(), NULL, 'enable');
INSERT IGNORE INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
	VALUES ('202608111', 'P_BTN_RECALCULER_SEUILS', 'CUSTOMER', 'Fiche article : bouton recalculer seuils', NULL, NOW(), NULL, NOW(), NULL, 'enable');
INSERT IGNORE INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
	VALUES ('202608112', 'P_BTN_MAJ_SEUIL', 'CUSTOMER', 'Fiche article : bouton MAJ seuil', NULL, NOW(), NULL, NOW(), NULL, 'enable');
INSERT IGNORE INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
	VALUES ('202608113', 'P_BTN_IMPORT_ARTICLE', 'CUSTOMER', 'Fiche article : menu importation (importer + vérifier)', NULL, NOW(), NULL, NOW(), NULL, 'enable');

-- Attribution a TOUS les roles existants pour ne creer aucune regression au
-- deploiement : les administrateurs retirent ensuite le droit aux roles non
-- concernes depuis la gestion des roles/privileges.
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, p.lg_PRIVELEGE_ID, NOW(), NOW()
FROM t_role r
CROSS JOIN t_privilege p
WHERE p.lg_PRIVELEGE_ID IN ('20260811', '202608111', '202608112', '202608113')
  AND NOT EXISTS (SELECT 1 FROM t_role_privelege rp
                  WHERE rp.lg_ROLE_ID = r.lg_ROLE_ID AND rp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID);
