-- Types d'etiquette par produit (Etiquettage Pro, retours du 11/10) : chaque type d'etiquette (t_typeetiquette, porte
-- par la fiche article lg_TYPEETIQUETTE_ID) peut designer un code : code-barres, DataMatrix, QR, DataMatrix+, QR+.
-- Les 5 types existants (CIP, CIP_PRIX...) sont gardes tels quels, sans code : ils s'impriment comme aujourd'hui
-- (code du parametre KEY_ETIQUETTE_CODE). Aucun produit n'est modifie par cette migration.

ALTER TABLE t_typeetiquette ADD COLUMN IF NOT EXISTS str_CODE VARCHAR(20) NULL;

INSERT IGNORE INTO t_typeetiquette (lg_TYPEETIQUETTE_ID, str_NAME, str_DESCRIPTION, dt_CREATED, dt_UPDATED, str_STATUT, str_CODE) VALUES
('TE_CODE128', 'Code-barres', 'Code-barres du CIP (étiquette standard)', NOW(), NOW(), 'enable', 'CODE128'),
('TE_DATAMATRIX', 'DataMatrix', 'DataMatrix GS1 : EAN, péremption, lot, CIP', NOW(), NOW(), 'enable', 'DATAMATRIX'),
('TE_QR', 'QR code', 'QR code GS1 : EAN, péremption, lot, CIP', NOW(), NOW(), 'enable', 'QR'),
('TE_DATAMATRIX_PLUS', 'DataMatrix+', 'DataMatrix étendu, hors vente (+ désignation, prix...)', NOW(), NOW(), 'enable', 'DATAMATRIX_PLUS'),
('TE_QR_PLUS', 'QR+', 'QR étendu, hors vente (texte lisible au téléphone)', NOW(), NOW(), 'enable', 'QR_PLUS');

-- Journal de la mise a jour selective : un lot par validation, une ligne par produit (ancien et nouveau type), pour
-- savoir qui a change quoi et pouvoir annuler.
CREATE TABLE IF NOT EXISTS t_etiquette_type_journal (
    id                  VARCHAR(40)  NOT NULL,
    lot                 VARCHAR(40)  NOT NULL,
    lg_FAMILLE_ID       VARCHAR(40)  NOT NULL,
    ancien_type         VARCHAR(40)  NULL,
    nouveau_type        VARCHAR(40)  NOT NULL,
    utilisateur         VARCHAR(100) NULL,
    dt_CREATED          DATETIME     NOT NULL,
    annule              TINYINT(1)   NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_etiquette_type_journal_lot (lot)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

-- Impression : selon le type d'etiquette de chaque produit (1, defaut) ; 0 = le code choisi pour toute la planche.
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, str_IS_EN_KRYPTED, str_SECTION_KEY, dt_CREATED, dt_UPDATED) VALUES
('KEY_ETIQUETTE_CODE_PAR_PRODUIT', '1', 'Etiquettes : imprimer selon le type d''etiquette de chaque produit (1) ou le code choisi pour toute la planche (0)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);

-- Droit : affecter les types d'etiquette aux produits (mise a jour selective), administrateur seulement par defaut.
INSERT INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`,
                         `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
SELECT LEFT(UUID(), 40), 'P_SM_ETIQUETTE_TYPE', 'CUSTOMER',
       'Types d''etiquette : creer des types et les affecter aux produits (mise a jour selective)', NULL, NOW(), NULL, NOW(), NULL, 'enable'
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_privilege p WHERE p.str_NAME = 'P_SM_ETIQUETTE_TYPE');

INSERT INTO t_role_privelege (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, cible.lg_PRIVELEGE_ID, NOW(), NOW()
  FROM (SELECT ru.lg_ROLE_ID
          FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID
         WHERE u.str_LOGIN = 'admin') r
  JOIN t_privilege cible ON cible.str_NAME = 'P_SM_ETIQUETTE_TYPE'
 WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege deja WHERE deja.lg_ROLE_ID = r.lg_ROLE_ID
                      AND deja.lg_PRIVILEGE_ID = cible.lg_PRIVELEGE_ID);
