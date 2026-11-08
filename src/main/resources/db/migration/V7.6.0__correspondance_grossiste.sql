-- =====================================================================
-- Correspondance produits grossistes / Prestige, lot 1 (étude du 08/11/2026,
-- docs/notices/ETUDE_CORRESPONDANCE_GROSSISTES_2026-11-08.md).
--  - correspondance_grossiste : une ligne par (grossiste, code lu chez ce grossiste), avec la fiche Prestige retenue
--    (ou les candidats à valider), son état, sa source, son score et ses dates. Une ligne VALIDEE, REJETEE ou
--    CONTREDITE n'est jamais recalculée par le moteur automatique.
--    cle_grossiste = t_grossiste.lg_GROSSISTE_ID, ou « EXT:<source> » pour un extranet sans grossiste dans Prestige
--    (Ubipharm) ; elle porte l'unicité, NULL n'étant pas unique sous MariaDB.
--  - correspondance_calcul : journal de chaque calcul (compteurs, auteur, dates).
--  - privilège P_CORRESPONDANCE_GROSSISTES (lancer un calcul), donné aux profils pharmacien et administrateur et au
--    rôle du compte administrateur ; le menu viendra avec l'écran (lot 3).
-- Rejouable : rien n'est modifié dans les tables existantes.
-- =====================================================================

CREATE TABLE IF NOT EXISTS correspondance_grossiste (
    id                       BIGINT       NOT NULL AUTO_INCREMENT,
    cle_grossiste            VARCHAR(60)  NOT NULL,
    lg_GROSSISTE_ID          VARCHAR(40)  NULL,
    source_extranet          VARCHAR(20)  NULL,
    code_grossiste           VARCHAR(40)  NOT NULL,
    cip                      VARCHAR(20)  NULL,
    ean                      VARCHAR(50)  NULL,
    designation_grossiste    VARCHAR(200) NULL,
    lg_FAMILLE_ID            VARCHAR(40)  NULL,
    etat                     VARCHAR(12)  NOT NULL,
    source                   VARCHAR(16)  NOT NULL,
    motif                    VARCHAR(20)  NULL,
    score                    DECIMAL(4,3) NULL,
    candidats                VARCHAR(2000) NULL,
    nb_confirmations         INT          NOT NULL DEFAULT 0,
    nb_contradictions        INT          NOT NULL DEFAULT 0,
    dt_creation              DATETIME(3)  NOT NULL,
    dt_maj                   DATETIME(3)  NOT NULL,
    dt_derniere_confirmation DATETIME     NULL,
    lg_USER_VALIDATION       VARCHAR(40)  NULL,
    dt_validation            DATETIME     NULL,
    calcul_id                BIGINT       NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_correspondance_grossiste_code (cle_grossiste, code_grossiste),
    KEY idx_correspondance_grossiste_famille (lg_FAMILLE_ID),
    KEY idx_correspondance_grossiste_etat (etat, cle_grossiste)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS correspondance_calcul (
    id               BIGINT      NOT NULL AUTO_INCREMENT,
    origine          VARCHAR(30) NOT NULL,
    utilisateur      VARCHAR(60) NULL,
    debut            DATETIME(3) NOT NULL,
    fin              DATETIME(3) NULL,
    statut           VARCHAR(10) NOT NULL,
    codes_lus        INT         NOT NULL DEFAULT 0,
    creees           INT         NOT NULL DEFAULT 0,
    modifiees        INT         NOT NULL DEFAULT 0,
    inchangees       INT         NOT NULL DEFAULT 0,
    conservees       INT         NOT NULL DEFAULT 0,
    sans_resultat    INT         NOT NULL DEFAULT 0,
    message          VARCHAR(255) NULL,
    PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
                         `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_CORRESPONDANCE_GROSSISTES', 'CUSTOMER',
       'GESTION DES COMMANDES - Correspondances grossistes (calcul)', NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_CORRESPONDANCE_GROSSISTES');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_role r
  JOIN t_privilege cible ON cible.str_NAME = 'P_CORRESPONDANCE_GROSSISTES'
 WHERE r.str_NAME IN ('Pharmacien', 'Administrateur', 'Super Administrateur', 'SYSTEM_USER')
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = r.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), ru.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM t_privilege cible
  JOIN t_user u ON u.str_LOGIN = 'admin'
  JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
 WHERE cible.str_NAME = 'P_CORRESPONDANCE_GROSSISTES'
   AND NOT EXISTS (SELECT 1 FROM t_role_privelege deja
                    WHERE deja.lg_ROLE_ID = ru.lg_ROLE_ID AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);
