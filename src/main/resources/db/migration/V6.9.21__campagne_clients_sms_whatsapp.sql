-- Point 2 : suivi de consommation multicritere et communication SMS / WhatsApp.
--
-- 1) Consentement du client a etre contacte par SMS / WhatsApp (case a cocher de la fiche client).
--    NULL = jamais renseigne (le client n'est pas exclu), 1 = accepte, 0 = refuse (exclu des campagnes).
ALTER TABLE t_client ADD COLUMN IF NOT EXISTS bool_CONSENT_SMS TINYINT(1) NULL DEFAULT NULL;

-- 2) Modeles de messages (SMS / WhatsApp) administrables, avec variables {client}, {prenom}, {nom},
--    {medicament}, {officine}, {dernier_achat}.
CREATE TABLE IF NOT EXISTS modele_message (
    id         VARCHAR(40)  NOT NULL,
    libelle    VARCHAR(80)  NOT NULL,
    canal      VARCHAR(10)  NOT NULL DEFAULT 'TOUS',
    contenu    VARCHAR(1000) NOT NULL,
    actif      BIT(1)       NOT NULL DEFAULT b'1',
    created_at DATETIME     NOT NULL,
    updated_at DATETIME     NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_modele_message_libelle (libelle)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO modele_message (id, libelle, canal, contenu, actif, created_at, updated_at)
SELECT 'MODELE_RENOUVELLEMENT', 'Rappel de renouvellement', 'TOUS',
       'Bonjour {client}, votre traitement {medicament} arrive a son terme. Il est disponible a la pharmacie {officine}. A bientot.',
       b'1', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM modele_message m WHERE m.id = 'MODELE_RENOUVELLEMENT');

INSERT INTO modele_message (id, libelle, canal, contenu, actif, created_at, updated_at)
SELECT 'MODELE_DISPONIBILITE', 'Disponibilité des produits habituels', 'TOUS',
       'Bonjour {client}, vos produits habituels sont disponibles a la pharmacie {officine}. Nous restons a votre disposition.',
       b'1', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM modele_message m WHERE m.id = 'MODELE_DISPONIBILITE');

INSERT INTO modele_message (id, libelle, canal, contenu, actif, created_at, updated_at)
SELECT 'MODELE_CONTACT', 'Prise de contact', 'TOUS',
       'Bonjour {client}, la pharmacie {officine} souhaite prendre de vos nouvelles. Merci de nous contacter au {telephone_officine}.',
       b'1', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM modele_message m WHERE m.id = 'MODELE_CONTACT');

-- 3) Menu « Modèles de messages » sous SERVICE CLIENT (lg_MENU_ID = '9'), meme montage rejouable que V6.9.7.
INSERT INTO t_privilege (lg_PRIVELEGE_ID, str_NAME, str_TYPE, str_DESCRIPTION, str_STATUT, dt_CREATED)
SELECT 'MENU_MODELES_MESSAGES_20260902', 'P_SM_MODELES_MESSAGES', 'CUSTOMER',
       'SERVICE CLIENT - Modeles de messages SMS / WhatsApp', 'enable', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.lg_PRIVELEGE_ID = 'MENU_MODELES_MESSAGES_20260902');

INSERT INTO t_sous_menu (lg_SOUS_MENU_ID, str_VALUE, str_DESCRIPTION, str_COMPOSANT, lg_MENU_ID, int_PRIORITY,
                         str_Status, P_KEY, dt_CREATED)
SELECT 'MENU_MODELES_MESSAGES_20260902', 'Modèles de messages', 'Modeles de SMS / WhatsApp pour les campagnes clients',
       'modelemessagemanager', '9', 8, 'enable', 'P_SM_MODELES_MESSAGES', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.lg_SOUS_MENU_ID = 'MENU_MODELES_MESSAGES_20260902');

INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED)
SELECT 'MENU_MODELES_MESSAGES_20260902_R00', '00', 'MENU_MODELES_MESSAGES_20260902', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege r
                  WHERE r.lg_ROLE_ID = '00' AND r.lg_PRIVILEGE_ID = 'MENU_MODELES_MESSAGES_20260902');
