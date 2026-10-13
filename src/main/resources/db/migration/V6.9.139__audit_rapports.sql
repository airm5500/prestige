-- Besoins du 11/10 (point 6) : AUDIT & RAPPROCHEMENTS, onglet Rapports. Chaque analyse lancee depuis l'ecran est
-- conservee (resultat complet en JSON), pour la relire, la comparer a une autre et l'imprimer. Aucune donnee existante
-- modifiee. Rejouable.
CREATE TABLE IF NOT EXISTS t_audit_rapport (
    id                VARCHAR(40)  NOT NULL,
    created_at        DATETIME     NOT NULL,
    lg_USER_ID        VARCHAR(40)  NULL,
    auteur            VARCHAR(150) NULL,
    debut             DATE         NOT NULL,
    fin               DATE         NOT NULL,
    sections_en_ecart INT          NOT NULL DEFAULT 0,
    resume            VARCHAR(2000) NULL,
    contenu           LONGTEXT     NOT NULL,
    PRIMARY KEY (id),
    KEY idx_audit_rapport_date (created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
