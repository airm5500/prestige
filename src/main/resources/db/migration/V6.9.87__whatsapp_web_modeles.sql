-- Retours du 07/10 : WhatsApp Web (regles anti-bannissement reglables depuis l'ecran, transmises au service
-- compagnon) et modeles de messages de l'API officielle (saisie, controle, soumission a Meta, suivi du statut).

ALTER TABLE whatsapp_compte ADD COLUMN IF NOT EXISTS web_regles TEXT NULL
    COMMENT 'regles d''envoi WhatsApp Web (JSON), voir outils/whatsapp-web/src/regles.js';

CREATE TABLE IF NOT EXISTS whatsapp_modele (
    id            VARCHAR(40)  NOT NULL,
    nom           VARCHAR(512) NOT NULL,
    langue        VARCHAR(10)  NOT NULL DEFAULT 'fr',
    categorie     VARCHAR(20)  NOT NULL DEFAULT 'UTILITY',
    entete        VARCHAR(60)  NULL,
    corps         VARCHAR(1024) NOT NULL,
    pied          VARCHAR(60)  NULL,
    exemples      VARCHAR(2000) NULL COMMENT 'JSON : valeurs d''exemple des variables du corps',
    boutons       VARCHAR(4000) NULL COMMENT 'JSON : [{type, texte, valeur}]',
    statut        VARCHAR(20)  NOT NULL DEFAULT 'BROUILLON' COMMENT 'BROUILLON, PENDING, APPROVED, REJECTED, PAUSED, DISABLED',
    meta_id       VARCHAR(60)  NULL,
    motif_rejet   VARCHAR(500) NULL,
    soumis_le     DATETIME     NULL,
    created_at    DATETIME     NOT NULL,
    updated_at    DATETIME     NOT NULL,
    updated_by    VARCHAR(40)  NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_whatsapp_modele (nom, langue)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
