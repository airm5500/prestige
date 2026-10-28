-- COUPURE DES ENVOIS DANS UNE COPIE DE BASE D'OFFICINE, AVANT DE LA BRANCHER SUR UN PAYARA DE MESURE.
--
-- A passer UNIQUEMENT sur une copie (ex. appaul_perf sur l'instance de mesure, port 3307), jamais sur la base d'une
-- officine. Une copie contient de vrais numeros et adresses : au demarrage, Prestige migre la base (Flyway) puis lance
-- ses taches planifiees, qui enverraient des SMS, e-mails, messages WhatsApp ou PharmaML pour de vrai.
--
-- Les migrations creent ces cles par INSERT IGNORE : une valeur posee ici AVANT la migration est conservee.
-- Les adresses d'envoi SMS en base passent avant le fichier de configuration : on les pointe vers 127.0.0.1:9 (port
-- ferme). Les vider ne suffirait pas : SmsFournisseurBootstrap recopie la configuration dans les valeurs vides.
-- Complement apres la migration : copie-sans-envois-apres-migration.sql.

INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT) VALUES
 ('KEY_SMS_CLOTURE_CAISSE', '0', 'copie de mesure : envois coupes', 'SYSTEME', 'enable'),
 ('KEY_MAIL_CLOTURE_CAISSE', '0', 'copie de mesure : envois coupes', 'SYSTEME', 'enable'),
 ('KEY_SMS_RAPPEL_RENOUVELLEMENT', '0', 'copie de mesure : envois coupes', 'SYSTEME', 'enable'),
 ('KEY_RAPPEL_HABITUDE_ACTIF', '0', 'copie de mesure : envois coupes', 'SYSTEME', 'enable'),
 ('KEY_CAMPAGNE_AUTO_ACTIF', '0', 'copie de mesure : envois coupes', 'SYSTEME', 'enable'),
 ('KEY_PHARMAML_VIDAGE_AUTO', '0', 'copie de mesure : envois coupes', 'SYSTEME', 'enable'),
 ('KEY_HEURE_ENVOI_SMS_RECAP_ACTIVITE', '3', 'copie de mesure : hors de la fenetre de mesure', 'SYSTEME', 'enable'),
 ('KEY_SMS_DR_CALLBACK_URL', '', 'copie de mesure : envois coupes', 'SYSTEME', 'enable'),
 ('SUPPORT_AUTO_TICKET_ENABLED', '0', 'copie de mesure : envois coupes', 'SYSTEME', 'enable'),
 ('SUPPORT_NOTIFY_ENABLED', '0', 'copie de mesure : envois coupes', 'SYSTEME', 'enable'),
 ('SUPPORT_EMAIL', '', 'copie de mesure : envois coupes', 'SYSTEME', 'enable'),
 ('KEY_MONOGRAPHIE_ACTIF', '0', 'copie de mesure : envois coupes', 'SYSTEME', 'enable'),
 ('KEY_MONOGRAPHIE_URL', '', 'copie de mesure : envois coupes', 'SYSTEME', 'enable')
ON DUPLICATE KEY UPDATE str_VALUE = VALUES(str_VALUE);

UPDATE t_grossiste SET str_URL_PHARMAML = NULL;
UPDATE notification SET statut = 'LOCK' WHERE statut = 'NOT_SEND';
UPDATE categorie_notification SET canal = 'EMAIL_MASSE' WHERE canal IN ('EMAIL', 'SMS_EMAIL');

-- tables des fournisseurs SMS : meme DDL que V6.7.9 (CREATE IF NOT EXISTS et INSERT IGNORE y garderont nos lignes)
CREATE TABLE IF NOT EXISTS `sms_fournisseur` (
    `id` VARCHAR(50) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `libelle` VARCHAR(100) NOT NULL,
    `actif` BIT(1) NOT NULL DEFAULT b'1',
    `en_vigueur` BIT(1) NOT NULL DEFAULT b'0',
    `dlr_mode` VARCHAR(20) NOT NULL DEFAULT 'POLLING',
    `dlr_callback_url` VARCHAR(500) NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL,
    `updated_at` DATETIME NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `sms_fournisseur_code_un` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
CREATE TABLE IF NOT EXISTS `sms_fournisseur_param` (
    `id` VARCHAR(50) NOT NULL,
    `fournisseur_id` VARCHAR(50) NOT NULL,
    `cle` VARCHAR(80) NOT NULL,
    `valeur` VARCHAR(2000) NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `sms_fournisseur_param_un` (`fournisseur_id`, `cle`),
    CONSTRAINT `sms_fournisseur_param_fk` FOREIGN KEY (`fournisseur_id`)
        REFERENCES `sms_fournisseur` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
INSERT IGNORE INTO sms_fournisseur (id, code, libelle, actif, en_vigueur, dlr_mode, created_at) VALUES
 ('ORANGE', 'ORANGE', 'Orange SMS', b'0', b'0', 'CALLBACK', NOW()),
 ('LETEXTO', 'LETEXTO', 'LeTexto (Arolitec)', b'0', b'0', 'POLLING', NOW());
INSERT INTO sms_fournisseur_param (id, fournisseur_id, cle, valeur) VALUES
 ('ORANGE_token_endpoint', 'ORANGE', 'token_endpoint', 'http://127.0.0.1:9/bloque'),
 ('ORANGE_send_url', 'ORANGE', 'send_url', 'http://127.0.0.1:9/bloque'),
 ('ORANGE_admin_base_url', 'ORANGE', 'admin_base_url', 'http://127.0.0.1:9/bloque'),
 ('ORANGE_subscription_url', 'ORANGE', 'subscription_url', 'http://127.0.0.1:9/bloque'),
 ('LETEXTO_base_url', 'LETEXTO', 'base_url', 'http://127.0.0.1:9')
ON DUPLICATE KEY UPDATE valeur = VALUES(valeur);
UPDATE sms_fournisseur SET actif = b'0', en_vigueur = b'0', dlr_callback_url = NULL;
-- le jeton SMS en cache (sms_token) est vide apres la migration : la table n'existe pas forcement avant
