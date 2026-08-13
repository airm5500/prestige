-- =====================================================================
-- Multi-fournisseur SMS : referentiel des fournisseurs (Orange, LeTexto...)
-- configurable depuis l'application (ecran "Fournisseurs SMS").
--   - sms_fournisseur       : une ligne par fournisseur, un seul "en_vigueur"
--   - sms_fournisseur_param : parametres cle/valeur propres a chaque
--     fournisseur (endpoints, credentials, sender...)
-- Les parametres Orange sont completes au demarrage depuis dicisms.properties
-- (SmsFournisseurBootstrap) pour reprendre la configuration de l'officine.
-- =====================================================================

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

-- Orange reste le fournisseur en vigueur au deploiement : aucune officine ne
-- change de comportement tant que la bascule n'est pas faite depuis l'ecran.
-- Orange fonctionne par Delivery Receipt (callback) ; pas d'API de polling.
INSERT IGNORE INTO sms_fournisseur
    (`id`, `code`, `libelle`, `actif`, `en_vigueur`, `dlr_mode`, `dlr_callback_url`, `created_at`)
VALUES
    ('ORANGE', 'ORANGE', 'Orange SMS', b'1', b'1', 'CALLBACK', NULL, NOW());

-- LeTexto est pre-cree inactif : cle API et sender a renseigner depuis l'ecran.
INSERT IGNORE INTO sms_fournisseur
    (`id`, `code`, `libelle`, `actif`, `en_vigueur`, `dlr_mode`, `dlr_callback_url`, `created_at`)
VALUES
    ('LETEXTO', 'LETEXTO', 'LeTexto (Arolitec)', b'0', b'0', 'POLLING', NULL, NOW());

INSERT IGNORE INTO sms_fournisseur_param (`id`, `fournisseur_id`, `cle`, `valeur`)
VALUES ('LETEXTO_base_url', 'LETEXTO', 'base_url', 'https://apis.letexto.com');
