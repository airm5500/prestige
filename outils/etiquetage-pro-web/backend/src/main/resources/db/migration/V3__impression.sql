-- Personnalisation des etiquettes : une disposition par type de code et dimension d'etiquette (comme Prestige,
-- t_etiquette_disposition). contenu : JSON du moteur (etiquetagepro.disposition.Disposition).
CREATE TABLE disposition (
    cle             VARCHAR(40)   NOT NULL,
    type_code       VARCHAR(20)   NOT NULL,
    largeur_mm      DECIMAL(6,1)  NOT NULL,
    hauteur_mm      DECIMAL(6,1)  NOT NULL,
    contenu         LONGTEXT      NOT NULL CHECK (JSON_VALID(contenu)),
    modifie_le      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifie_par     VARCHAR(80)   NULL,
    PRIMARY KEY (cle),
    KEY ix_disposition_type (type_code, modifie_le)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
