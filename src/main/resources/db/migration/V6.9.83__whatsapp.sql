-- =====================================================================
-- Plan d'octobre, section 4.2 (lot L10) : WHATSAPP, nouveau canal a cote
-- du SMS (le fonctionnement SMS n'est pas modifie).
--
-- 1) t_client.bool_CONSENT_WHATSAPP : consentement SEPARE du SMS.
--    NULL = jamais renseigne (non exclu), 1 = accepte, 0 = refuse (ou
--    « STOP » recu). Un client deja contacte par SMS n'est pas inscrit
--    d'office : NULL, comme le consentement SMS a son introduction.
-- 2) whatsapp_compte : les deux modes, API officielle (Cloud API de Meta)
--    et WhatsApp Web (service compagnon joint par URL + jeton). Les
--    secrets (jetons) sont stockes ici, cote serveur, et ne sont jamais
--    renvoyes au navigateur. MODE TEST actif a la creation : aucun appel
--    reel tant que l'officine ne l'a pas decoche.
-- 3) whatsapp_message : journal des envois (statut, identifiant, erreur,
--    repli SMS) ; le texte n'y est PAS copie (il est dans la notification).
-- 4) KEY_WHATSAPP_MODE_DEFAUT = API (decision du 06/10).
-- 5) Ecran « Comptes WhatsApp » a cote de « Fournisseurs SMS », donne a
--    ceux qui ont les fournisseurs SMS et au role du compte admin.
-- Rejouable.
-- =====================================================================
ALTER TABLE t_client ADD COLUMN IF NOT EXISTS bool_CONSENT_WHATSAPP TINYINT(1) NULL DEFAULT NULL;

CREATE TABLE IF NOT EXISTS whatsapp_compte (
    mode            VARCHAR(10)   NOT NULL,
    actif           TINYINT(1)    NOT NULL DEFAULT 0,
    mode_test       TINYINT(1)    NOT NULL DEFAULT 1,
    api_version     VARCHAR(10)   NULL,
    phone_number_id VARCHAR(40)   NULL,
    waba_id         VARCHAR(40)   NULL,
    access_token    VARCHAR(1000) NULL,
    verify_token    VARCHAR(200)  NULL,
    app_secret      VARCHAR(200)  NULL,
    modele_nom      VARCHAR(100)  NULL,
    modele_langue   VARCHAR(10)   NULL,
    web_url         VARCHAR(300)  NULL,
    web_jeton       VARCHAR(300)  NULL,
    updated_at      DATETIME      NULL,
    updated_by      VARCHAR(40)   NULL,
    PRIMARY KEY (mode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT IGNORE INTO whatsapp_compte (mode, actif, mode_test, api_version, modele_langue) VALUES ('API', 0, 1, 'v21.0', 'fr');
INSERT IGNORE INTO whatsapp_compte (mode, actif, mode_test) VALUES ('WEB', 0, 1);

CREATE TABLE IF NOT EXISTS whatsapp_message (
    id               VARCHAR(40)  NOT NULL,
    notification_id  VARCHAR(50)  NULL,
    client_id        VARCHAR(40)  NULL,
    telephone        VARCHAR(20)  NULL,
    mode             VARCHAR(10)  NOT NULL,
    simule           TINYINT(1)   NOT NULL DEFAULT 0,
    statut           VARCHAR(20)  NOT NULL,
    message_id       VARCHAR(200) NULL,
    erreur           VARCHAR(255) NULL,
    repli_sms        TINYINT(1)   NOT NULL DEFAULT 0,
    created_at       DATETIME     NOT NULL,
    updated_at       DATETIME     NULL,
    PRIMARY KEY (id),
    KEY ix_whatsapp_message_mid (message_id),
    KEY ix_whatsapp_message_notif (notification_id),
    KEY ix_whatsapp_message_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT)
VALUES ('KEY_WHATSAPP_MODE_DEFAUT', 'API', 'Mode WhatsApp par defaut : API (Cloud API officielle) ou WEB (WhatsApp Web)', 'SYSTEME', 'enable');

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`,
                         `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_SM_WHATSAPP', 'CUSTOMER', 'Comptes WhatsApp (API officielle / WhatsApp Web)', NULL, NOW(),
       NULL, NOW(), NULL, 'enable'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_SM_WHATSAPP');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role_privelege src
  JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID AND modele.str_NAME = 'P_SM_FOURNISSEUR_SMS'
  JOIN t_privilege cible ON cible.str_NAME = 'P_SM_WHATSAPP'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_SM_WHATSAPP'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`,
                         `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Comptes WhatsApp', NULL, 'Comptes WhatsApp (API officielle / WhatsApp Web)', 'whatsappcomptes',
       s.lg_MENU_ID, s.int_PRIORITY, NULL, 'enable', 'P_SM_WHATSAPP', NOW(), NOW(), ''
  FROM t_sous_menu s
 WHERE s.str_COMPOSANT = 'smsfournisseur'
   AND NOT EXISTS (SELECT 1 FROM t_sous_menu x WHERE x.str_COMPOSANT = 'whatsappcomptes')
 LIMIT 1;
