-- Balance vente / caisse (retour des tests du 09/09) : l'ancienne presentation complete est conservee dans un
-- onglet cache « Balance (ancienne) », visible seulement avec ce privilege, pour depanner en cas de doute sur
-- les chiffres de la nouvelle presentation.
INSERT IGNORE INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
	VALUES ('20260909', 'P_BALANCE_ANCIENNE_PRESENTATION', 'CUSTOMER', 'Balance vente/caisse : voir l ancienne presentation (onglet cache)', NULL, NOW(), NULL, NOW(), NULL, 'enable');

-- Attribue aux seuls roles d'administration : l'onglet est un outil de depannage, pas un ecran courant.
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, '20260909', NOW(), NOW()
FROM t_role r
WHERE UPPER(r.str_NAME) LIKE '%ADMIN%'
  AND r.lg_ROLE_ID NOT IN (SELECT rp.lg_ROLE_ID FROM t_role_privelege rp WHERE rp.lg_PRIVILEGE_ID = '20260909');
