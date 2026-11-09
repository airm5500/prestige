-- =====================================================================
-- Connecteur extranet Ubipharm, lecture seule (plan du 07/11, §6) : réapprovisionnements (/ReturnProduitsReapproJSON).
-- Une ligne par ligne lue, repérée par sa collecte et sa position : la clé métier est inconnue, rien n'est dédoublonné.
-- Codes et CIP en chaînes ; date affichée brute à côté de sa lecture (sans heure) ; colisages en liste JSON
-- (NULL = inconnu, [] = vide), texte affiché et attribut data-colisage gardés bruts. Les cellules HTML brutes ne sont
-- jamais renvoyées à l'écran. Seule la dernière collecte complète est gardée. Rejouable.
-- =====================================================================
CREATE TABLE IF NOT EXISTS extranet_reappro (
    id BIGINT NOT NULL AUTO_INCREMENT,
    collecte_id BIGINT NOT NULL,
    position INT NOT NULL,
    pscode VARCHAR(100) NULL,
    designation VARCHAR(500) NULL,
    code VARCHAR(100) NULL,
    categorie VARCHAR(255) NULL,
    details_json TEXT NULL,
    date_affichee VARCHAR(100) NULL,
    date_jour DATE NULL,
    code_agence VARCHAR(100) NULL,
    statut VARCHAR(100) NULL,
    pscode_cache VARCHAR(100) NULL,
    cip_cache VARCHAR(100) NULL,
    etcoda_cache VARCHAR(100) NULL,
    cellules_brutes LONGTEXT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_extranet_reappro_position (collecte_id, position),
    KEY idx_extranet_reappro_pscode (collecte_id, pscode),
    KEY idx_extranet_reappro_agence (collecte_id, code_agence)
);

CREATE TABLE IF NOT EXISTS extranet_reappro_agence (
    id BIGINT NOT NULL AUTO_INCREMENT,
    collecte_id BIGINT NOT NULL,
    position INT NOT NULL,
    rang INT NOT NULL,
    etcode VARCHAR(100) NULL,
    etlib VARCHAR(255) NULL,
    dispo VARCHAR(255) NULL,
    colisages_json VARCHAR(1000) NULL,
    colisage_texte VARCHAR(1000) NULL,
    data_colisage VARCHAR(255) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_extranet_reappro_agence (collecte_id, position, rang)
);
