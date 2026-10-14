-- Besoins du 11/10 (lot 4) : ecran « Stabilite du serveur » du Centre de support (etat, arrets et leur cause,
-- releves, reglages conseilles pour la machine). Droit P_SM_SUPPORT_SERVEUR donne aux roles qui ont deja
-- « Sante application ». Nombre de postes (caisses, terminaux) pour dimensionner les reglages : 10 par defaut.
-- Aucune donnee existante modifiee. Rejouable.
INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_SM_SUPPORT_SERVEUR', 'CUSTOMER', 'CENTRE DE SUPPORT - Stabilite du serveur (arrets, releves, reglages)', NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_SM_SUPPORT_SERVEUR');

INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`,
                         `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Arrêts du serveur et leur cause, relevés, réglages conseillés pour la machine', NULL,
       'Stabilité du serveur', 'supportserveur', '20260710', 4, NULL, 'enable', 'P_SM_SUPPORT_SERVEUR', NOW(), NOW(), ''
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.str_COMPOSANT = 'supportserveur')
   AND EXISTS (SELECT 1 FROM t_menu m WHERE m.lg_MENU_ID = '20260710');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, m.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM (SELECT DISTINCT rp.lg_ROLE_ID FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID
         WHERE p.str_NAME = 'P_SM_SUPPORT_SANTE') r
  JOIN t_privilege m ON m.str_NAME = 'P_SM_SUPPORT_SERVEUR'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege d WHERE d.lg_ROLE_ID = r.lg_ROLE_ID AND d.lg_PRIVILEGE_ID = m.lg_PRIVELEGE_ID);

INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT) VALUES
 ('SUPPORT_SERVEUR_POSTES', '10', 'Stabilité du serveur : nombre de postes (caisses, terminaux, téléphones) pour dimensionner les réglages', 'SYSTEME', 'enable');
