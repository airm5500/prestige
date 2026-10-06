-- =====================================================================
-- Plan d'octobre, section 4.1 (lot L10) : rappels aux patients chroniques
-- par HABITUDE D'ACHAT.
--
-- 1) Fiche client : « Afficher les médicaments dans les messages »,
--    coché par défaut (décision du 06/10). Décoché : message neutre
--    (« votre traitement habituel »), pour ce rappel comme pour le rappel
--    de renouvellement d'ordonnance.
-- 2) t_rappel_habitude : un produit d'un client dont le prochain achat
--    tombe bientôt, UNE ligne par cycle (dernier achat) : on ne rappelle
--    jamais deux fois le même cycle. Elle sert aussi de liste « à
--    préparer » (piluliers) pour l'équipe.
-- 3) Catégorie de notification SMS propre, modèle de message, paramètres.
--    L'envoi AUTOMATIQUE des SMS est désactivé par défaut
--    (KEY_RAPPEL_HABITUDE_ACTIF = 0) : la liste est calculée chaque jour,
--    l'officine envoie depuis l'écran, ou active l'envoi automatique.
-- 4) Écran « Rappels et piluliers à préparer » sous SERVICE CLIENT,
--    donné à ceux qui voient les ordonnances clients et au rôle du compte
--    admin. Rejouable.
-- =====================================================================
ALTER TABLE t_client ADD COLUMN IF NOT EXISTS bool_MSG_MEDICAMENTS TINYINT(1) NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS t_rappel_habitude (
    id                 VARCHAR(40)  NOT NULL,
    lg_CLIENT_ID       VARCHAR(40)  NOT NULL,
    lg_FAMILLE_ID      VARCHAR(40)  NOT NULL,
    dt_DERNIER_ACHAT   DATE         NOT NULL,
    dt_PREVU           DATE         NOT NULL,
    int_FREQUENCE      INT          NOT NULL,
    int_ACHATS         INT          NOT NULL,
    str_STATUT         VARCHAR(20)  NOT NULL DEFAULT 'A_PREPARER',
    lg_NOTIFICATION_ID VARCHAR(40)  NULL,
    dt_ENVOI           DATETIME     NULL,
    lg_USER_ID         VARCHAR(40)  NULL,
    dt_TRAITE          DATETIME     NULL,
    dt_CREATED         DATETIME     NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_rappel_habitude_cycle (lg_CLIENT_ID, lg_FAMILLE_ID, dt_DERNIER_ACHAT),
    KEY ix_rappel_habitude_prevu (dt_PREVU, str_STATUT)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT IGNORE INTO categorie_notification (id, canal, libelle, name)
VALUES (24, 'SMS', 'Rappel de traitement habituel', 'RAPPEL_HABITUDE');

INSERT INTO modele_message (id, libelle, canal, contenu, actif, created_at, updated_at)
SELECT 'MODELE_HABITUDE', 'Rappel de traitement habituel', 'TOUS',
       'Bonjour {client}, votre traitement {medicament} sera bientôt à renouveler (vers le {date_prevue}). La pharmacie {officine} peut le préparer pour vous.',
       b'1', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM modele_message m WHERE m.id = 'MODELE_HABITUDE');

INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT)
VALUES ('KEY_RAPPEL_HABITUDE_ACTIF', '0', 'Envoi automatique quotidien des SMS de rappel de traitement habituel (1 = actif)', 'SYSTEME', 'enable');
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT)
VALUES ('KEY_RAPPEL_HABITUDE_JOURS', '3', 'Nombre de jours avant le prochain achat estimé où le rappel de traitement habituel est prévu', 'SYSTEME', 'enable');
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT)
VALUES ('KEY_RAPPEL_HABITUDE_MIN_ACHATS', '3', 'Nombre minimal d''achats (jours distincts) pour retenir une habitude', 'SYSTEME', 'enable');
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT)
VALUES ('KEY_RAPPEL_HABITUDE_ECART_MAX', '35', 'Variation maximale (%) des écarts entre achats pour qu''une habitude soit régulière', 'SYSTEME', 'enable');

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`,
                         `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_SM_RAPPELS_HABITUDE', 'CUSTOMER', 'SERVICE CLIENT - Rappels et piluliers à préparer', NULL, NOW(),
       NULL, NOW(), NULL, 'enable'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_SM_RAPPELS_HABITUDE');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), src.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role_privelege src
  JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID AND modele.str_NAME = 'P_ORDONNANCE_CLIENT'
  JOIN t_privilege cible ON cible.str_NAME = 'P_SM_RAPPELS_HABITUDE'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_ROLE_ID = src.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_SM_RAPPELS_HABITUDE'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`,
                         `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Rappels et piluliers', NULL, 'Rappels de traitement habituel et piluliers à préparer',
       'rappelshabitude', '9', 9, NULL, 'enable', 'P_SM_RAPPELS_HABITUDE', NOW(), NOW(), ''
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.str_COMPOSANT = 'rappelshabitude')
   AND EXISTS (SELECT 1 FROM t_menu m WHERE m.lg_MENU_ID = '9');
