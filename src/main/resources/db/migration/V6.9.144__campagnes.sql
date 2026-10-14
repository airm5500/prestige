-- Besoins du 11/10 (lot 4) : CAMPAGNES SMS / WHATSAPP (anniversaires, fetes, infos clients, infos pharmacie,
-- personnalise ; les rappels de traitement en sont un onglet). Envoi par la file de notifications existante.
-- Volet automatique PARAMETRABLE et DESACTIVE par defaut : il ne fait que PREPARER une proposition chaque matin
-- (anniversaires et fetes du jour) ; on la consulte, on decoche, puis on envoie. Le nombre de messages proposes
-- apparait dans la cloche. Le texte des messages n'est pas conserve dans les tables des campagnes.
-- Aucune donnee existante modifiee. Rejouable.

-- categorie d'envoi propre aux campagnes (canal SMS : relance par la tache des SMS, jamais par celle des e-mails)
INSERT INTO categorie_notification (id, canal, libelle, name)
SELECT COALESCE(MAX(c.id), 0) + 1, 'SMS', 'Campagnes clients (SMS / WhatsApp)', 'CAMPAGNE'
  FROM categorie_notification c
HAVING NOT EXISTS (SELECT 1 FROM categorie_notification x WHERE x.name = 'CAMPAGNE');

CREATE TABLE IF NOT EXISTS t_fete (
    code       VARCHAR(30) NOT NULL,
    libelle    VARCHAR(80) NOT NULL,
    type       VARCHAR(12) NOT NULL,             -- NATIONALE | RELIGIEUSE
    regle      VARCHAR(8)  NOT NULL,             -- FIXE (jour/mois) | PAQUES (decalage) | SAISIE (date par annee)
    mois       TINYINT     NULL,
    jour       TINYINT     NULL,
    decalage   SMALLINT    NOT NULL DEFAULT 0,
    actif      BIT(1)      NOT NULL DEFAULT b'1',
    ordre      SMALLINT    NOT NULL DEFAULT 0,
    updated_at DATETIME    NULL,
    lg_USER_ID VARCHAR(40) NULL,
    PRIMARY KEY (code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS t_fete_date (
    code       VARCHAR(30) NOT NULL,
    annee      SMALLINT    NOT NULL,
    date_fete  DATE        NOT NULL,
    updated_at DATETIME    NOT NULL,
    lg_USER_ID VARCHAR(40) NULL,
    PRIMARY KEY (code, annee)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

INSERT IGNORE INTO t_fete (code, libelle, type, regle, mois, jour, decalage, ordre) VALUES
 ('JOUR_AN',         'Jour de l''an',                       'NATIONALE',  'FIXE',   1,  1,  0, 10),
 ('PAQUES',          'Pâques',                              'RELIGIEUSE', 'PAQUES', NULL, NULL, 0, 20),
 ('LUNDI_PAQUES',    'Lundi de Pâques',                     'RELIGIEUSE', 'PAQUES', NULL, NULL, 1, 21),
 ('FETE_TRAVAIL',    'Fête du travail',                     'NATIONALE',  'FIXE',   5,  1,  0, 30),
 ('ASCENSION',       'Ascension',                           'RELIGIEUSE', 'PAQUES', NULL, NULL, 39, 40),
 ('PENTECOTE',       'Pentecôte',                           'RELIGIEUSE', 'PAQUES', NULL, NULL, 49, 41),
 ('LUNDI_PENTECOTE', 'Lundi de Pentecôte',                  'RELIGIEUSE', 'PAQUES', NULL, NULL, 50, 42),
 ('INDEPENDANCE',    'Fête de l''Indépendance',             'NATIONALE',  'FIXE',   8,  7,  0, 50),
 ('ASSOMPTION',      'Assomption',                          'RELIGIEUSE', 'FIXE',   8, 15,  0, 51),
 ('TOUSSAINT',       'Toussaint',                           'RELIGIEUSE', 'FIXE',  11,  1,  0, 60),
 ('PAIX',            'Journée nationale de la paix',        'NATIONALE',  'FIXE',  11, 15,  0, 61),
 ('NOEL',            'Noël',                                'RELIGIEUSE', 'FIXE',  12, 25,  0, 70),
 ('NUIT_DESTIN',     'Lailatou-Kadr (nuit du destin)',      'RELIGIEUSE', 'SAISIE', NULL, NULL, 0, 80),
 ('AID_FITR',        'Aïd el-Fitr (fin du Ramadan)',        'RELIGIEUSE', 'SAISIE', NULL, NULL, 0, 81),
 ('TABASKI',         'Tabaski (Aïd el-Kébir)',              'RELIGIEUSE', 'SAISIE', NULL, NULL, 0, 82),
 ('MAOULOUD',        'Maouloud',                            'RELIGIEUSE', 'SAISIE', NULL, NULL, 0, 83);

CREATE TABLE IF NOT EXISTS t_campagne (
    id                VARCHAR(40)  NOT NULL,
    categorie         VARCHAR(16)  NOT NULL,     -- ANNIVERSAIRE | FETE | INFO_CLIENTS | INFO_PHARMACIE | PERSONNALISE
    origine           VARCHAR(6)   NOT NULL,     -- AUTO | MANUEL
    statut            VARCHAR(10)  NOT NULL,     -- PROPOSEE | ENVOYEE | ABANDONNEE | EXPIREE
    date_cible        DATE         NULL,
    fete_code         VARCHAR(30)  NULL,
    canal             VARCHAR(14)  NOT NULL,     -- SMS | WHATSAPP | SMS_WHATSAPP
    lg_MODELE         VARCHAR(40)  NULL,
    accord_explicite  BIT(1)       NOT NULL DEFAULT b'0',
    nb_cibles         INT          NOT NULL DEFAULT 0,
    nb_envoyes        INT          NOT NULL DEFAULT 0,
    nb_exclus         INT          NOT NULL DEFAULT 0,
    created_at        DATETIME     NOT NULL,
    lg_USER_ID        VARCHAR(40)  NULL,
    traitee_at        DATETIME     NULL,
    lg_USER_TRAITE    VARCHAR(40)  NULL,
    PRIMARY KEY (id),
    KEY idx_campagne_statut (statut, created_at),
    KEY idx_campagne_auto (origine, categorie, date_cible, fete_code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS t_campagne_ligne (
    campagne_id        VARCHAR(40)  NOT NULL,
    lg_CLIENT_ID       VARCHAR(40)  NOT NULL,
    retenu             BIT(1)       NOT NULL DEFAULT b'1',
    statut             VARCHAR(10)  NOT NULL,    -- PROPOSE | PREPARE | EXCLU | DECOCHE
    motif              VARCHAR(120) NULL,
    lg_NOTIFICATION_ID VARCHAR(50)  NULL,
    PRIMARY KEY (campagne_id, lg_CLIENT_ID),
    KEY idx_campagne_ligne_client (lg_CLIENT_ID)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

INSERT INTO modele_message (id, libelle, canal, contenu, actif, created_at, updated_at)
SELECT 'MODELE_ANNIVERSAIRE', 'Anniversaire', 'TOUS',
       'Joyeux anniversaire {prenom} ! Toute l''équipe de la pharmacie {officine} vous souhaite une très belle journée.',
       b'1', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM modele_message m WHERE m.id = 'MODELE_ANNIVERSAIRE' OR m.libelle = 'Anniversaire');

INSERT INTO modele_message (id, libelle, canal, contenu, actif, created_at, updated_at)
SELECT 'MODELE_FETE', 'Fête', 'TOUS',
       'Bonne fête de {fete}, {prenom} ! La pharmacie {officine} vous présente ses meilleurs vœux.',
       b'1', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM modele_message m WHERE m.id = 'MODELE_FETE' OR m.libelle = 'Fête');

INSERT INTO modele_message (id, libelle, canal, contenu, actif, created_at, updated_at)
SELECT 'MODELE_INFO_PHARMACIE', 'Information de la pharmacie', 'TOUS',
       'Bonjour {prenom}, la pharmacie {officine} vous informe : ',
       b'1', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM modele_message m WHERE m.id = 'MODELE_INFO_PHARMACIE' OR m.libelle = 'Information de la pharmacie');

INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT) VALUES
 ('KEY_CAMPAGNE_AUTO_ACTIF', '0', 'Campagnes : préparation automatique chaque matin des propositions anniversaires et fêtes (1 = actif ; rien n''est envoyé sans validation)', 'SYSTEME', 'enable'),
 ('KEY_CAMPAGNE_AUTO_ANNIV', '1', 'Campagnes automatiques : proposer les anniversaires du jour (1 = oui)', 'SYSTEME', 'enable'),
 ('KEY_CAMPAGNE_AUTO_FETE', '1', 'Campagnes automatiques : proposer les fêtes du jour (1 = oui)', 'SYSTEME', 'enable'),
 ('KEY_CAMPAGNE_AUTO_CANAL', 'SMS', 'Campagnes automatiques : canal proposé (SMS, WHATSAPP, SMS_WHATSAPP)', 'SYSTEME', 'enable'),
 ('KEY_CAMPAGNE_MODELE_ANNIV', 'MODELE_ANNIVERSAIRE', 'Campagnes automatiques : modèle des anniversaires', 'SYSTEME', 'enable'),
 ('KEY_CAMPAGNE_MODELE_FETE', 'MODELE_FETE', 'Campagnes automatiques : modèle des fêtes', 'SYSTEME', 'enable');

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), x.nom, 'CUSTOMER', x.description, NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM (SELECT 'P_SM_CAMPAGNES' nom, 'CAMPAGNES SMS / WHATSAPP - Préparer et envoyer des campagnes aux clients' description) x
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = x.nom);

INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`,
                         `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Anniversaires, fêtes, informations et rappels de traitement par SMS ou WhatsApp', NULL,
       'Campagnes SMS / WhatsApp', 'campagnes', '9', 10, NULL, 'enable', 'P_SM_CAMPAGNES', NOW(), NOW(), ''
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.str_COMPOSANT = 'campagnes')
   AND EXISTS (SELECT 1 FROM t_menu m WHERE m.lg_MENU_ID = '9');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, p.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM (SELECT DISTINCT ru.lg_ROLE_ID FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
         WHERE u.str_LOGIN = 'admin') r
  JOIN t_privilege p ON p.str_NAME = 'P_SM_CAMPAGNES'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege d WHERE d.lg_ROLE_ID = r.lg_ROLE_ID AND d.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID);
