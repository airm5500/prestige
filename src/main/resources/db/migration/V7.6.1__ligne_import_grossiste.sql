-- =====================================================================
-- Correspondance produits grossistes / Prestige, lot 2.
--  - ligne_import_grossiste : chaque ligne d'un fichier de commande ou de BL importé (formats LABOREX, COPHARMED,
--    TEDIS, TEDIS_2, DPCI, CIP_QTE, CIP_QTE_CIP_QTER_PA, TXT) garde le code et la désignation lus chez le grossiste,
--    la fiche retenue par l'import (NULL si non reconnue) et la ligne de commande créée. À la clôture du BL issu de
--    cette commande, la ligne est appliquée une seule fois à correspondance_grossiste (confirmation, contradiction ou
--    création) : lg_BON_LIVRAISON_DETAIL, dt_application et resultat en gardent la trace.
--  - correspondance_grossiste : fiche reçue en contradiction et sa date (la fiche retenue n'est jamais remplacée).
-- Rejouable.
-- =====================================================================

CREATE TABLE IF NOT EXISTS ligne_import_grossiste (
    id                       BIGINT       NOT NULL AUTO_INCREMENT,
    lg_ORDER_ID              VARCHAR(40)  NOT NULL,
    lg_ORDERDETAIL_ID        VARCHAR(40)  NULL,
    lg_GROSSISTE_ID          VARCHAR(40)  NULL,
    rang                     INT          NOT NULL,
    code_brut                VARCHAR(60)  NULL,
    code_normalise           VARCHAR(60)  NULL,
    designation_brute        VARCHAR(200) NULL,
    lg_FAMILLE_ID            VARCHAR(40)  NULL,
    quantite                 INT          NULL,
    prix_achat               INT          NULL,
    dt_import                DATETIME(3)  NOT NULL,
    lg_BON_LIVRAISON_DETAIL  VARCHAR(40)  NULL,
    dt_application           DATETIME(3)  NULL,
    resultat                 VARCHAR(12)  NULL,
    PRIMARY KEY (id),
    KEY idx_ligne_import_grossiste_commande (lg_ORDER_ID, lg_FAMILLE_ID),
    KEY idx_ligne_import_grossiste_code (lg_GROSSISTE_ID, code_normalise)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

ALTER TABLE correspondance_grossiste
    ADD COLUMN IF NOT EXISTS famille_contradiction    VARCHAR(40) NULL AFTER nb_contradictions,
    ADD COLUMN IF NOT EXISTS dt_derniere_contradiction DATETIME   NULL AFTER famille_contradiction;
