-- Versement d'une collecte d'inventaire en lot (demandes serveur des applications mobiles, point 37).
-- Une collecte faite hors ligne est versee en une requete ; la cle donnee par le terminal rend le versement
-- idempotent (meme cle = meme rapport, rien n'est refait). Les cles de plus de 30 jours sont purgees.
CREATE TABLE IF NOT EXISTS t_inventaire_versement (
    cle VARCHAR(64) NOT NULL,
    lg_INVENTAIRE_ID VARCHAR(40) NOT NULL,
    empreinte VARCHAR(64) NOT NULL COMMENT 'SHA-256 du mode et des lignes',
    rapport MEDIUMTEXT NOT NULL,
    lg_USER_ID VARCHAR(40) NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (cle),
    KEY ix_inventaire_versement_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
