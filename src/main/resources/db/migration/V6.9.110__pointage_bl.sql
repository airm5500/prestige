-- Retours du 09/10 (5) : pointage des BL et avoirs grossistes, rapprochement avec le releve du grossiste (PDF).

-- N° de sequence client imprime sur le BL (facultatif) et pointage du BL
ALTER TABLE t_bon_livraison
    ADD COLUMN IF NOT EXISTS str_SEQ_CLIENT   VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS dt_POINTAGE      DATETIME    NULL,
    ADD COLUMN IF NOT EXISTS lg_POINTAGE_USER VARCHAR(40) NULL;

-- Avoir du grossiste sur un retour (reference « VRI 683562 2 », montant HT, date) et pointage
ALTER TABLE t_retour_fournisseur
    ADD COLUMN IF NOT EXISTS str_REF_AVOIR    VARCHAR(40) NULL,
    ADD COLUMN IF NOT EXISTS int_AVOIR_HT     INT         NULL,
    ADD COLUMN IF NOT EXISTS dt_AVOIR         DATE        NULL,
    ADD COLUMN IF NOT EXISTS dt_POINTAGE      DATETIME    NULL,
    ADD COLUMN IF NOT EXISTS lg_POINTAGE_USER VARCHAR(40) NULL;

-- Releves importes et leurs lignes (rapprochement conserve)
CREATE TABLE IF NOT EXISTS t_releve_grossiste (
    lg_RELEVE_ID      VARCHAR(40)  NOT NULL,
    lg_GROSSISTE_ID   VARCHAR(40)  NOT NULL,
    lg_EMPLACEMENT_ID VARCHAR(40)  NOT NULL,
    str_FICHIER       VARCHAR(255) NULL,
    dt_DEBUT          DATE         NULL,
    dt_FIN            DATE         NULL,
    int_LIGNES        INT          NOT NULL DEFAULT 0,
    int_TOTAL_BL      BIGINT       NOT NULL DEFAULT 0,
    int_TOTAL_AVOIRS  BIGINT       NOT NULL DEFAULT 0,
    dt_IMPORT         DATETIME     NOT NULL,
    lg_USER_ID        VARCHAR(40)  NULL,
    PRIMARY KEY (lg_RELEVE_ID),
    KEY ix_releve_grossiste (lg_GROSSISTE_ID, dt_IMPORT)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE IF NOT EXISTS t_releve_grossiste_ligne (
    lg_LIGNE_ID       VARCHAR(40)  NOT NULL,
    lg_RELEVE_ID      VARCHAR(40)  NOT NULL,
    int_RANG          INT          NOT NULL,
    str_TYPE          VARCHAR(10)  NULL,
    str_NUMERO        VARCHAR(40)  NULL,
    str_SEQUENCE      VARCHAR(20)  NULL,
    dt_DATE           DATE         NULL,
    int_MONTANT_HT    BIGINT       NULL,
    str_STATUT        VARCHAR(20)  NOT NULL,
    str_PIECE_TYPE    VARCHAR(10)  NULL,
    lg_PIECE_ID       VARCHAR(40)  NULL,
    str_PIECE_REF     VARCHAR(40)  NULL,
    int_PIECE_HT      BIGINT       NULL,
    int_ECART         BIGINT       NULL,
    PRIMARY KEY (lg_LIGNE_ID),
    KEY ix_releve_ligne (lg_RELEVE_ID, int_RANG)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT) VALUES
('KEY_POINTAGE_BL_TOLERANCE', '1', 'Pointage BL : ecart de montant HT tolere (arrondis) pour rapprocher une ligne du releve', 'SYSTEME', 'enable');

-- Droit et menu « Pointage BL / avoirs », a cote de l'etat de controle des achats, pour les memes roles
INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`,
                         `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_SM_POINTAGE_BL', 'CUSTOMER', 'Pointage des BL et avoirs grossistes (releve)', NULL, NOW(), NULL,
       NOW(), NULL, 'enable'
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_SM_POINTAGE_BL');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM (SELECT DISTINCT src.lg_ROLE_ID
          FROM t_role_privelege src
          JOIN t_privilege modele ON modele.lg_PRIVELEGE_ID = src.lg_PRIVILEGE_ID
         WHERE modele.str_NAME = 'P_SM_ETAT_CHECK_ACHAT'
        UNION
        SELECT ru.lg_ROLE_ID
          FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
         WHERE u.str_LOGIN = 'admin') r
  JOIN t_privilege cible ON cible.str_NAME = 'P_SM_POINTAGE_BL'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_ROLE_ID = r.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);

INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`, `lg_MENU_ID`,
                         `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40), 'Pointage BL / avoirs', NULL,
       'Pointer les BL et avoirs grossistes et les comparer au releve du grossiste', 'pointagebl',
       s.lg_MENU_ID, s.int_PRIORITY, NULL, 'enable', 'P_SM_POINTAGE_BL', NOW(), NOW(), ''
  FROM t_sous_menu s
 WHERE s.str_COMPOSANT = 'etatscontrolemanager'
   AND NOT EXISTS (SELECT 1 FROM t_sous_menu x WHERE x.str_COMPOSANT = 'pointagebl')
 LIMIT 1;
