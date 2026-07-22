-- =====================================================================
-- Centre de Support - Lots 2 a 5
-- ---------------------------------------------------------------------
-- Lot 2 : table t_application_event (evenements applicatifs captures,
--         dedupliques par signature technique).
-- Lot 3 : tables t_support_ticket / t_support_ticket_message (tickets,
--         workflow, conversation, rattachement evenement-ticket).
-- Lot 4 : sous-menu "Sante application" (tableau de bord technique).
-- Lot 5 : sous-menu "Historique" + parametres de retention pour la
--         purge automatique.
-- Acces : privileges attribues uniquement au role systeme '00'.
-- =====================================================================

CREATE TABLE IF NOT EXISTS `t_application_event` (
    `id` VARCHAR(50) NOT NULL,
    `created_at` DATETIME NOT NULL,
    `modified_at` DATETIME NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `last_seen_at` DATETIME NOT NULL,
    `module` VARCHAR(100) NULL,
    `type` VARCHAR(50) NOT NULL,
    `niveau` VARCHAR(20) NOT NULL DEFAULT 'ERROR',
    `signature` VARCHAR(64) NOT NULL,
    `message_court` VARCHAR(500) NOT NULL,
    `occurrences` INT NOT NULL DEFAULT 1,
    `utilisateur` VARCHAR(255) NULL,
    `url_ou_ecran` VARCHAR(255) NULL,
    `payload_json` VARCHAR(4000) NULL,
    `log_ref` VARCHAR(500) NULL,
    `ticket_id` VARCHAR(50) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_application_event_signature` (`signature`),
    KEY `idx_application_event_last_seen` (`last_seen_at`),
    KEY `idx_application_event_niveau` (`niveau`)
) COLLATE='utf8_general_ci' ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `t_support_ticket` (
    `id` VARCHAR(50) NOT NULL,
    `created_at` DATETIME NOT NULL,
    `modified_at` DATETIME NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `numero` VARCHAR(30) NOT NULL,
    `officine` VARCHAR(255) NULL,
    `utilisateur` VARCHAR(255) NULL,
    `module` VARCHAR(100) NULL,
    `type` VARCHAR(50) NOT NULL DEFAULT 'INCIDENT',
    `priorite` VARCHAR(20) NOT NULL DEFAULT 'MOYENNE',
    `sujet` VARCHAR(255) NOT NULL,
    `description` VARCHAR(4000) NULL,
    `statut_ticket` VARCHAR(30) NOT NULL DEFAULT 'NOUVEAU',
    `affecte_a` VARCHAR(255) NULL,
    `event_signature` VARCHAR(64) NULL,
    `application_event_id` VARCHAR(50) NULL,
    `pieces_jointes` VARCHAR(2000) NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_support_ticket_numero` (`numero`),
    KEY `idx_support_ticket_statut` (`statut_ticket`)
) COLLATE='utf8_general_ci' ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `t_support_ticket_message` (
    `id` VARCHAR(50) NOT NULL,
    `created_at` DATETIME NOT NULL,
    `modified_at` DATETIME NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `ticket_id` VARCHAR(50) NOT NULL,
    `auteur` VARCHAR(255) NULL,
    `direction` VARCHAR(20) NOT NULL DEFAULT 'OFFICINE',
    `message` VARCHAR(4000) NOT NULL,
    `pieces_jointes` VARCHAR(2000) NULL,
    PRIMARY KEY (`id`),
    KEY `idx_support_ticket_message_ticket` (`ticket_id`)
) COLLATE='utf8_general_ci' ENGINE=InnoDB;

-- 1) Parametres : creation automatique de tickets et retention (purge)
INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('SUPPORT_AUTO_TICKET_ENABLED', '1', 'Creation automatique de tickets support depuis les erreurs capturees (1=actif, 0=inactif)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('SUPPORT_AUTO_TICKET_SEUIL', '5', 'Nombre d occurrences d une erreur ERROR avant creation automatique d un ticket', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('SUPPORT_RETENTION_INFO', '30', 'Retention en jours des evenements INFO sans ticket (purge automatique)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('SUPPORT_RETENTION_WARN', '60', 'Retention en jours des evenements WARN sans ticket (purge automatique)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('SUPPORT_RETENTION_ERROR', '90', 'Retention en jours des evenements ERROR sans ticket (purge automatique)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('SUPPORT_RETENTION_FATAL', '180', 'Retention en jours des evenements FATAL sans ticket (purge automatique)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);

-- 2) Sous-menus du Centre de Support (menu 20260710)
INSERT IGNORE INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
    VALUES ('202607102', 'Tickets support', NULL, 'Tickets support', 'supporttickets', '20260710', 2, NULL, 'enable', 'P_SM_SUPPORT_TICKETS', NOW(), NULL, '');

INSERT IGNORE INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
    VALUES ('202607102', 'P_SM_SUPPORT_TICKETS', 'CUSTOMER', 'CENTRE DE SUPPORT - TICKETS', NULL, NOW(), NULL, NULL, NULL, 'enable');

INSERT IGNORE INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
    VALUES ('202607103', 'Diagnostic & bugs', NULL, 'Diagnostic & bugs', 'supportdiagnostic', '20260710', 3, NULL, 'enable', 'P_SM_SUPPORT_DIAGNOSTIC', NOW(), NULL, '');

INSERT IGNORE INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
    VALUES ('202607103', 'P_SM_SUPPORT_DIAGNOSTIC', 'CUSTOMER', 'CENTRE DE SUPPORT - DIAGNOSTIC ET BUGS', NULL, NOW(), NULL, NULL, NULL, 'enable');

INSERT IGNORE INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
    VALUES ('202607104', 'Santé application', NULL, 'Santé application', 'supportsante', '20260710', 4, NULL, 'enable', 'P_SM_SUPPORT_SANTE', NOW(), NULL, '');

INSERT IGNORE INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
    VALUES ('202607104', 'P_SM_SUPPORT_SANTE', 'CUSTOMER', 'CENTRE DE SUPPORT - SANTE APPLICATION', NULL, NOW(), NULL, NULL, NULL, 'enable');

INSERT IGNORE INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
    VALUES ('202607105', 'Historique', NULL, 'Historique', 'supporthistorique', '20260710', 5, NULL, 'enable', 'P_SM_SUPPORT_HISTORIQUE', NOW(), NULL, '');

INSERT IGNORE INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
    VALUES ('202607105', 'P_SM_SUPPORT_HISTORIQUE', 'CUSTOMER', 'CENTRE DE SUPPORT - HISTORIQUE', NULL, NOW(), NULL, NULL, NULL, 'enable');

-- 3) Visibilite : uniquement le role systeme '00' (super administrateur)
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), '00', p.lg_PRIVELEGE_ID, NOW(), NOW()
FROM t_privilege p
WHERE p.str_NAME IN ('P_SM_SUPPORT_TICKETS', 'P_SM_SUPPORT_DIAGNOSTIC', 'P_SM_SUPPORT_SANTE', 'P_SM_SUPPORT_HISTORIQUE')
  AND p.lg_PRIVELEGE_ID NOT IN (
      SELECT rp.lg_PRIVILEGE_ID FROM t_role_privelege rp WHERE rp.lg_ROLE_ID = '00'
  );
