-- =====================================================================
-- Demande du 25/10 (reprise du CRM UBIPHARM) : fils de discussion WhatsApp.
--
-- 1) whatsapp_discussion : un message par ligne, entrant (reponse d'un client recue par le webhook) ou sortant
--    (reponse envoyee depuis l'ecran « Discussions WhatsApp »). Le fil d'un client = ses lignes, par numero local a
--    10 chiffres (un message venu de l'ancien identifiant a 8 chiffres est rattache au numero a 10 chiffres quand il
--    est seul a correspondre). Le texte est garde ici pour l'ecran, jamais dans les journaux ; conservation limitee
--    (purge quotidienne, Constant.WHATSAPP_DISCUSSION_CONSERVATION_JOURS).
-- 2) Droit P_SM_WHATSAPP_DISCUSSIONS et menu « Discussions WhatsApp » dans CAMPAGNES SMS / WHATSAPP, donnes aux
--    roles qui ont deja les comptes WhatsApp (P_SM_WHATSAPP). Rejouable.
-- =====================================================================
CREATE TABLE IF NOT EXISTS whatsapp_discussion (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    numero      VARCHAR(20)   NOT NULL,
    client_id   VARCHAR(40)   NULL,
    sens        CHAR(1)       NOT NULL,
    type        VARCHAR(12)   NOT NULL DEFAULT 'TEXTE',
    texte       TEXT          NULL,
    nom_profil  VARCHAR(100)  NULL,
    piece_nom   VARCHAR(150)  NULL,
    message_id  VARCHAR(200)  NULL,
    statut      VARCHAR(20)   NULL,
    lg_USER_ID  VARCHAR(40)   NULL,
    lu          TINYINT(1)    NOT NULL DEFAULT 0,
    created_at  DATETIME      NOT NULL,
    PRIMARY KEY (id),
    KEY ix_wa_disc_numero (numero, created_at),
    KEY ix_wa_disc_date (created_at),
    KEY ix_wa_disc_non_lus (sens, lu),
    KEY ix_wa_disc_mid (message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`,
                         `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_SM_WHATSAPP_DISCUSSIONS', 'CUSTOMER', 'Discussions WhatsApp : lire les réponses des clients et y répondre',
       NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_SM_WHATSAPP_DISCUSSIONS');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role_privelege src
  JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID AND modele.str_NAME = 'P_SM_WHATSAPP'
  JOIN t_privilege cible ON cible.str_NAME = 'P_SM_WHATSAPP_DISCUSSIONS'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`,
                         `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Réponses des clients par WhatsApp, et réponse depuis Prestige', NULL, 'Discussions WhatsApp',
       'whatsappdiscussions', '20261014', 3, NULL, 'enable', 'P_SM_WHATSAPP_DISCUSSIONS', NOW(), NOW(), ''
  FROM DUAL
 WHERE EXISTS (SELECT 1 FROM t_menu m WHERE m.lg_MENU_ID = '20261014')
   AND NOT EXISTS (SELECT 1 FROM t_sous_menu x WHERE x.str_COMPOSANT = 'whatsappdiscussions');
