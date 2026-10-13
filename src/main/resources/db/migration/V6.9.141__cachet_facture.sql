-- Besoins du 11/10 (point 4) : cachet / signature sur les factures du createur de modeles, a la place du texte
-- « LE PHARMACIEN ». Image commune (cible COMMUN) ou propre a un modele (cible MODELE-<id>), le modele primant.
-- Sans image, la facture garde le texte « LE PHARMACIEN ». Aucune donnee existante modifiee. Rejouable.
CREATE TABLE IF NOT EXISTS t_cachet_facture (
    cible      VARCHAR(40)  NOT NULL,
    image      MEDIUMBLOB   NOT NULL,
    type       VARCHAR(20)  NOT NULL,
    nom        VARCHAR(200) NULL,
    largeur    INT          NOT NULL DEFAULT 140,
    created_at DATETIME     NOT NULL,
    lg_USER_ID VARCHAR(40)  NULL,
    PRIMARY KEY (cible)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
