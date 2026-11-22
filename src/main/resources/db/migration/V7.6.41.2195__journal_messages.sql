-- Plan du 21/11, point 8.1 : menu « Journal des messages » (SMS et WhatsApp).
--
-- 1. Table message_administration : envois SMS au numéro d'administration (ticket Z, clôture de caisse, point
--    d'activité), qui ne laissaient aucune trace. Statut seulement, JAMAIS le texte du message.
-- 2. Droit P_SM_JOURNAL_MESSAGES, donné au départ aux rôles qui voient les campagnes ou les comptes WhatsApp, et au
--    rôle du compte administrateur.
-- 3. Sous-menu « Journal des messages » dans CAMPAGNES SMS / WHATSAPP.
--
-- Rejouable : table créée si absente, droit créé par son nom, attributions et sous-menu gardés par NOT EXISTS.

CREATE TABLE IF NOT EXISTS message_administration (
    id VARCHAR(40) NOT NULL,
    created_at DATETIME NOT NULL,
    canal VARCHAR(20) NOT NULL,
    origine VARCHAR(30) NOT NULL,
    telephone VARCHAR(30) NULL,
    statut VARCHAR(20) NOT NULL,
    motif VARCHAR(255) NULL,
    fournisseur VARCHAR(30) NULL,
    message_id VARCHAR(100) NULL,
    utilisateur_id VARCHAR(40) NULL,
    PRIMARY KEY (id),
    KEY idx_message_administration_date (created_at)
);

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`,
                         `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`,
                         `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_SM_JOURNAL_MESSAGES', 'CUSTOMER',
       'CAMPAGNES SMS / WHATSAPP - Journal des messages (SMS et WhatsApp envoyés)', NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_SM_JOURNAL_MESSAGES');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM (SELECT DISTINCT rp.lg_ROLE_ID FROM t_role_privelege rp
          JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID
         WHERE modele.str_NAME IN ('P_SM_CAMPAGNES', 'P_SM_WHATSAPP')) src
  JOIN t_privilege cible ON cible.str_NAME = 'P_SM_JOURNAL_MESSAGES'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_SM_JOURNAL_MESSAGES'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

-- Même menu que « Campagnes » (CAMPAGNES SMS / WHATSAPP), après les Discussions WhatsApp.
INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`,
                         `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`,
                         `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Journal des SMS et des messages WhatsApp : état, canal, origine, motif d''échec ; export CSV',
       NULL, 'Journal des messages', 'journalmessages', c.lg_MENU_ID, 4, NULL, 'enable', 'P_SM_JOURNAL_MESSAGES',
       NOW(), NOW(), ''
  FROM t_sous_menu c
 WHERE c.str_COMPOSANT = 'campagnes'
   AND NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.str_COMPOSANT = 'journalmessages')
 LIMIT 1;
