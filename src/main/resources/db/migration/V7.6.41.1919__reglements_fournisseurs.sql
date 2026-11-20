-- =====================================================================
-- Plan du 19/11, point 16 : règlements fournisseurs (onglet « Règlements fournisseurs » de l'état de contrôle des
-- achats).
--  - reglement_fournisseur : un règlement d'un grossiste (montant, date, mode, référence, auteur), son annulation et
--    la sortie de caisse qu'il a faite (espèces), puis l'entrée qui l'a rendue à l'annulation ;
--  - reglement_fournisseur_bl : la part de chaque BL réglé (somme des parts = montant du règlement) ;
--  - KEY_REGLEMENT_FRS_SORTIE_CAISSE (1) : un règlement en espèces sort de la caisse de l'utilisateur ;
--  - KEY_REGLEMENT_FRS_DATE_DEPART (2026-11-01) : les BL datés d'avant sont considérés comme réglés (à la lecture,
--    aucun BL n'est modifié) ; hors de l'écran des paramètres (statut disable) : elle se change dans l'onglet, avec
--    le droit, et chaque changement est journalisé ;
--  - droit P_REGLEMENT_FRS_DATE_DEPART : changer cette date (rôles d'administration et du titulaire).
-- Rejouable ; aucune donnée existante modifiée.
-- =====================================================================

CREATE TABLE IF NOT EXISTS reglement_fournisseur (
    id                       VARCHAR(40)  NOT NULL,
    reference                VARCHAR(40)  NOT NULL,
    grossiste_id             VARCHAR(40)  NOT NULL,
    montant                  INT          NOT NULL,
    date_reglement           DATE         NOT NULL,
    mode                     VARCHAR(20)  NOT NULL,
    reference_paiement       VARCHAR(100) NULL,
    user_id                  VARCHAR(40)  NOT NULL,
    created_at               DATETIME     NOT NULL,
    annule                   TINYINT(1)   NOT NULL DEFAULT 0,
    annule_le                DATETIME     NULL,
    annule_par               VARCHAR(40)  NULL,
    mvt_caisse_id            VARCHAR(40)  NULL,
    mvt_caisse_annulation_id VARCHAR(40)  NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_reglement_fournisseur_reference (reference),
    KEY idx_reglement_fournisseur_grossiste (grossiste_id, date_reglement),
    KEY idx_reglement_fournisseur_date (date_reglement)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS reglement_fournisseur_bl (
    id           VARCHAR(40) NOT NULL,
    reglement_id VARCHAR(40) NOT NULL,
    bl_id        VARCHAR(40) NOT NULL,
    montant      INT         NOT NULL,
    PRIMARY KEY (id),
    KEY idx_reglement_fournisseur_bl_reglement (reglement_id),
    KEY idx_reglement_fournisseur_bl_bl (bl_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('KEY_REGLEMENT_FRS_SORTIE_CAISSE', '1', 'REGLEMENTS FOURNISSEURS : UN REGLEMENT EN ESPECES SORT DE LA CAISSE DE L''UTILISATEUR (1 OUI, 0 NON)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NOW());
INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('KEY_REGLEMENT_FRS_DATE_DEPART', '2026-11-01', 'REGLEMENTS FOURNISSEURS : DATE DE DEPART DU SUIVI (AAAA-MM-JJ), CHANGEE DEPUIS L''ONGLET (DROIT ET JOURNAL)', 'SYSTEM', 'disable', NULL, NULL, NOW(), NOW());

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
                         `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_REGLEMENT_FRS_DATE_DEPART', 'CUSTOMER',
       'ACHATS - Règlements fournisseurs : changer la date de départ du suivi', NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_REGLEMENT_FRS_DATE_DEPART');

-- Donné une seule fois, à la création du droit (rejouer ne le redonne pas à un rôle à qui il a été retiré) : rôles
-- d'administration et du titulaire, et rôles du compte administrateur.
INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role r
  JOIN t_privilege cible ON cible.str_NAME = 'P_REGLEMENT_FRS_DATE_DEPART'
 WHERE (r.str_NAME IN ('Super Administrateur', 'Administrateur', 'Pharmacien')
        OR EXISTS (SELECT 1 FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID
                    WHERE ru.lg_ROLE_ID = r.lg_ROLE_ID AND u.str_LOGIN = 'admin'))
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);
