-- Retour du 14/10 : « Campagnes SMS / WhatsApp » est un MENU (comme Ressources humaines), et non un sous-menu du
-- Service client. Il regroupe l'ecran des campagnes et « Comptes WhatsApp » (deplace depuis Parametrages).
-- Le droit du menu (P_M_CAMPAGNES) est donne a chaque role qui a deja l'un des deux ecrans : personne ne perd
-- d'acces. Les droits des ecrans (P_SM_CAMPAGNES, P_SM_WHATSAPP) ne changent pas. Rejouable.
INSERT IGNORE INTO t_menu (`lg_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `int_PRIORITY`, `str_Status`, `P_KEY`, `lg_MODULE_ID`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
VALUES ('20261014', 'CAMPAGNES SMS / WHATSAPP', NULL, 'Campagnes SMS / WhatsApp', 12, 'enable', 'P_M_CAMPAGNES', '1', NOW(), NULL, '');

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_M_CAMPAGNES', 'CUSTOMER', 'CAMPAGNES SMS / WHATSAPP', NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_M_CAMPAGNES');

UPDATE t_sous_menu SET lg_MENU_ID = '20261014', int_PRIORITY = 1, str_DESCRIPTION = 'Campagnes', dt_UPDATED = NOW()
 WHERE str_COMPOSANT = 'campagnes';
UPDATE t_sous_menu SET lg_MENU_ID = '20261014', int_PRIORITY = 2, dt_UPDATED = NOW()
 WHERE str_COMPOSANT = 'whatsappcomptes';

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, m.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM (SELECT DISTINCT rp.lg_ROLE_ID FROM t_role_privelege rp JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID
         WHERE p.str_NAME IN ('P_SM_CAMPAGNES', 'P_SM_WHATSAPP')) r
  JOIN t_privilege m ON m.str_NAME = 'P_M_CAMPAGNES'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege d WHERE d.lg_ROLE_ID = r.lg_ROLE_ID AND d.lg_PRIVILEGE_ID = m.lg_PRIVELEGE_ID);
