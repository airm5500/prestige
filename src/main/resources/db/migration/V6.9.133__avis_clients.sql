-- Avis clients (retours du 11/10) : le client scanne le QR code affiche dans la pharmacie et donne son avis sur une
-- page publique (hors application), servie uniquement sur le port public dedie. Les avis sont lus, analyses et
-- traites dans le menu AVIS CLIENTS (droits dedies, administrateur par defaut). Aucune donnee existante modifiee.

CREATE TABLE IF NOT EXISTS t_avis_client (
    id              VARCHAR(40)   NOT NULL,
    dt_CREATED      DATETIME      NOT NULL,
    note            TINYINT       NOT NULL,
    -- criteres : CLE=PLUS|MOINS separes par des virgules (ACCUEIL, ATTENTE, CONSEIL, DISPONIBILITE, PRIX, PROPRETE)
    criteres        VARCHAR(200)  NULL,
    texte           TEXT          NULL,
    employe         VARCHAR(60)   NULL,
    anonyme         TINYINT(1)    NOT NULL DEFAULT 1,
    nom             VARCHAR(60)   NULL,
    telephone       VARCHAR(20)   NULL,
    email           VARCHAR(80)   NULL,
    rappel          TINYINT(1)    NOT NULL DEFAULT 0,
    -- empreinte de l'adresse de l'emetteur (jamais l'adresse elle-meme) : reperer les envois en serie
    empreinte       VARCHAR(64)   NULL,
    statut          VARCHAR(12)   NOT NULL DEFAULT 'NOUVEAU',
    dt_LU           DATETIME      NULL,
    note_interne    TEXT          NULL,
    reponse         TEXT          NULL,
    canal_reponse   VARCHAR(12)   NULL,
    statut_reponse  VARCHAR(12)   NULL,
    dt_REPONSE      DATETIME      NULL,
    auteur_reponse  VARCHAR(100)  NULL,
    dt_UPDATED      DATETIME      NULL,
    PRIMARY KEY (id),
    KEY ix_avis_date (dt_CREATED),
    KEY ix_avis_note (note),
    KEY ix_avis_statut (statut)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Reglages. Le jeton du QR code est tire au hasard ici (jamais dans le code ni dans Git) et se regenere depuis l'ecran.
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED) VALUES
('KEY_AVIS_ADRESSE_PUBLIQUE', '', 'Avis clients : adresse IP publique fixe de la pharmacie (vide = page d''avis non publiee)', 'CUSTOMER', 'enable', NOW()),
('KEY_AVIS_PORT_PUBLIC', '8090', 'Avis clients : port public dedie (seule la page d''avis y repond)', 'CUSTOMER', 'enable', NOW()),
('KEY_AVIS_JETON', LOWER(CONCAT(REPLACE(UUID(), '-', ''), LEFT(SHA2(CONCAT(UUID(), RAND()), 256), 16))), 'Avis clients : jeton secret du QR code (regenerer pour invalider les anciennes affiches)', 'CUSTOMER', 'enable', NOW()),
('KEY_AVIS_ACTIF', '1', 'Avis clients : reception des avis (1) ou suspendue (0)', 'CUSTOMER', 'enable', NOW()),
('KEY_AVIS_MAX_HEURE', '5', 'Avis clients : avis acceptes par heure depuis une meme adresse', 'CUSTOMER', 'enable', NOW()),
('KEY_AVIS_ADRESSE_AFFICHEE', '', 'Avis clients : adresse affichee sur la page et l''affiche (vide = adresse et telephone de l''officine)', 'CUSTOMER', 'enable', NOW());

INSERT IGNORE INTO t_menu (`lg_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `int_PRIORITY`, `str_Status`, `P_KEY`, `lg_MODULE_ID`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
VALUES ('20261011', 'AVIS CLIENTS', NULL, 'Avis clients', 13, 'enable', 'P_M_AVIS_CLIENTS', '1', NOW(), NULL, '');

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), x.nom, 'CUSTOMER', x.description, NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM (SELECT 'P_M_AVIS_CLIENTS' nom, 'AVIS CLIENTS' description
        UNION ALL SELECT 'P_SM_AVIS_CLIENTS', 'AVIS CLIENTS - Lire les avis et leur analyse'
        UNION ALL SELECT 'P_AVIS_REPONDRE', 'AVIS CLIENTS - Traiter les avis et repondre aux clients (WhatsApp, e-mail)'
        UNION ALL SELECT 'P_AVIS_REGLAGES', 'AVIS CLIENTS - Reglages, QR code et affiche') x
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = x.nom);

INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`,
                         `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Avis clients', NULL, 'Avis des clients recueillis par le QR code de la pharmacie, analyse, reponses',
       'avisclients', '20261011', 1, NULL, 'enable', 'P_SM_AVIS_CLIENTS', NOW(), NOW(), ''
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.str_COMPOSANT = 'avisclients');

-- administrateur seulement par defaut : les autres roles recoivent les droits depuis la gestion des roles
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, p.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM (SELECT DISTINCT ru.lg_ROLE_ID FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
         WHERE u.str_LOGIN = 'admin') r
  JOIN t_privilege p ON p.str_NAME IN ('P_M_AVIS_CLIENTS', 'P_SM_AVIS_CLIENTS', 'P_AVIS_REPONDRE', 'P_AVIS_REGLAGES')
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege d WHERE d.lg_ROLE_ID = r.lg_ROLE_ID AND d.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID);
