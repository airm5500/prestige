-- =====================================================================
-- Correspondance produits grossistes / Prestige, lot 4 : historique des prix lus chez les grossistes.
--  - une ligne seulement quand un prix change pour ce produit chez ce grossiste (regle PrixGrossisteRegles) ;
--  - prix_achat et prix_public tels que lus (NULL si absents ou nuls), avec leur nature lue : HT, TTC ou INCONNUE,
--    jamais deduite ; deux natures ne sont jamais comparees ;
--  - source : BL (cloture d'un bon de livraison), CATALOGUE, FICHE_UBIPHARM, PHARMAML ; piece : id du BL ou de la
--    collecte ; dt_piece : date de la piece (livraison), dt_lecture : date d'ecriture.
-- Rejouable.
-- =====================================================================

CREATE TABLE IF NOT EXISTS prix_grossiste (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    cle_grossiste    VARCHAR(40)  NOT NULL,
    lg_GROSSISTE_ID  VARCHAR(40)  NULL,
    lg_FAMILLE_ID    VARCHAR(40)  NOT NULL,
    code_grossiste   VARCHAR(60)  NULL,
    prix_achat       INT          NULL,
    nature_achat     VARCHAR(10)  NOT NULL DEFAULT 'INCONNUE',
    prix_public      INT          NULL,
    nature_public    VARCHAR(10)  NOT NULL DEFAULT 'INCONNUE',
    source           VARCHAR(16)  NOT NULL,
    piece            VARCHAR(40)  NULL,
    piece_ligne      VARCHAR(40)  NULL,
    dt_piece         DATETIME     NULL,
    dt_lecture       DATETIME(3)  NOT NULL,
    PRIMARY KEY (id),
    KEY idx_prix_grossiste_produit (lg_FAMILLE_ID, cle_grossiste, id),
    KEY idx_prix_grossiste_piece (source, piece)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;
