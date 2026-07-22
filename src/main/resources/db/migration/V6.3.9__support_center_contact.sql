-- =====================================================================
-- Centre de Support - Lot 1 "Me contacter"
-- ---------------------------------------------------------------------
-- - Table t_support_demande : archivage des demandes envoyees au support.
-- - Parametres : SUPPORT_EMAIL (destinataire), SUPPORT_STORAGE_DIR
--   (dossier des pieces jointes sur le disque du serveur).
-- - Menu principal "Centre de Support" + sous-menu "Me contacter"
--   (str_COMPOSANT = xtype ExtJS 'supportcontact').
-- - Acces restreint : privileges attribues uniquement au role systeme '00'
--   (super administrateur). Se reconnecter apres execution : les
--   privileges sont recharges a la connexion (USER_LIST_PRIVILEGE).
-- =====================================================================

CREATE TABLE IF NOT EXISTS `t_support_demande` (
    `id` VARCHAR(50) NOT NULL,
    `created_at` DATETIME NOT NULL,
    `modified_at` DATETIME NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `objet` VARCHAR(255) NOT NULL,
    `message` VARCHAR(4000) NOT NULL,
    `module_concerne` VARCHAR(100) NULL,
    `urgence` VARCHAR(20) NOT NULL DEFAULT 'MOYENNE',
    `nom_officine` VARCHAR(255) NULL,
    `email_officine` VARCHAR(255) NULL,
    `telephone` VARCHAR(30) NULL,
    `cree_par` VARCHAR(255) NULL,
    `statut_envoi` VARCHAR(20) NOT NULL DEFAULT 'EN_COURS',
    `erreur_envoi` VARCHAR(1000) NULL,
    `pieces_jointes` VARCHAR(2000) NULL,
    PRIMARY KEY (`id`)
) COLLATE='utf8_general_ci' ENGINE=InnoDB;

-- 1) Parametres de configuration du support
INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('SUPPORT_EMAIL', '', 'Adresse e-mail du support editeur (destinataire des demandes, plusieurs adresses separees par ;)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('SUPPORT_STORAGE_DIR', '', 'Dossier de stockage des pieces jointes du support (vide = dossier par defaut du serveur)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);

-- 2) Menu principal "Centre de Support" (module 1 = application principale)
INSERT IGNORE INTO t_menu (`lg_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `int_PRIORITY`, `str_Status`, `P_KEY`, `lg_MODULE_ID`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
    VALUES ('20260710', 'Centre de Support', NULL, 'Centre de Support', 99, 'enable', 'P_M_CENTRE_SUPPORT', '1', NOW(), NULL, '');

INSERT IGNORE INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
    VALUES ('20260710', 'P_M_CENTRE_SUPPORT', 'CUSTOMER', 'CENTRE DE SUPPORT', NULL, NOW(), NULL, NULL, NULL, 'enable');

-- 3) Sous-menu "Me contacter" (str_COMPOSANT = xtype ExtJS)
INSERT IGNORE INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
    VALUES ('202607101', 'Me contacter', NULL, 'Me contacter', 'supportcontact', '20260710', 1, NULL, 'enable', 'P_SM_SUPPORT_CONTACT', NOW(), NULL, '');

INSERT IGNORE INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
    VALUES ('202607101', 'P_SM_SUPPORT_CONTACT', 'CUSTOMER', 'CENTRE DE SUPPORT - ME CONTACTER', NULL, NOW(), NULL, NULL, NULL, 'enable');

-- 4) Visibilite : uniquement le role systeme '00' (super administrateur).
--    Les autres roles pourront etre autorises via l'ecran de gestion des roles.
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), '00', p.lg_PRIVELEGE_ID, NOW(), NOW()
FROM t_privilege p
WHERE p.str_NAME IN ('P_M_CENTRE_SUPPORT', 'P_SM_SUPPORT_CONTACT')
  AND p.lg_PRIVELEGE_ID NOT IN (
      SELECT rp.lg_PRIVILEGE_ID FROM t_role_privelege rp WHERE rp.lg_ROLE_ID = '00'
  );
