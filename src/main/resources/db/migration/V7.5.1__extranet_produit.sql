-- =====================================================================
-- Connecteurs extranets grossistes, lecture seule (plan du 07/11, §4) : cache des fiches produit Ubipharm lues sur
-- GET /SavoirPlusJSON?pscode=..., et des stocks par agence (infosParEtablissement).
-- Une seule fiche par pscode : une nouvelle collecte remplace les lignes du meme pscode. La date de collecte est celle
-- de extranet_collecte (collecte_id). References et CIP en chaines ; prix bruts a cote des decimaux ; ni devise ni
-- regle HT/TTC (non etablies). Les listes au schema inconnu et la reponse complete sont gardees en JSON brut ; la
-- reponse complete n'est jamais renvoyee a l'ecran. Aucun cookie ni jeton n'est enregistre. Rejouable.
-- =====================================================================
CREATE TABLE IF NOT EXISTS extranet_produit (
    id BIGINT NOT NULL AUTO_INCREMENT,
    collecte_id BIGINT NOT NULL,
    horodatage DATETIME NOT NULL,
    pscode VARCHAR(30) NOT NULL,
    pslib VARCHAR(500) NULL,
    pslibc VARCHAR(500) NULL,
    picode VARCHAR(100) NULL,
    cips TEXT NULL COMMENT 'liste JSON de chaines ; NULL si absente ou de forme inconnue',
    cips_brut TEXT NULL,
    cmcode VARCHAR(255) NULL,
    falib VARCHAR(500) NULL,
    nalib VARCHAR(500) NULL,
    fslib VARCHAR(500) NULL,
    stlib VARCHAR(255) NULL,
    psdtcr_brut TEXT NULL COMMENT 'signification non confirmee : non interpretee',
    pspven_brut TEXT NULL,
    pspven DECIMAL(20,6) NULL,
    psppub_brut TEXT NULL,
    psppub DECIMAL(20,6) NULL,
    pspvig_brut TEXT NULL,
    pspvig DECIMAL(20,6) NULL,
    tvtaux_brut TEXT NULL,
    tvtaux DECIMAL(12,6) NULL,
    psstk_soc_brut TEXT NULL,
    psstk_soc INT NULL,
    nb_substitution_brut TEXT NULL,
    nb_substitution INT NULL,
    infos_etablissement_brut LONGTEXT NULL COMMENT 'garde seulement si la liste des agences n est pas lisible',
    nb_agences INT NULL COMMENT 'NULL si infosParEtablissement absent, null ou illisible',
    listes_brutes LONGTEXT NULL COMMENT 'objet JSON : nom de liste -> valeur brute (reappro, promos, ...)',
    absents TEXT NULL COMMENT 'liste JSON des champs documentes absents de la reponse',
    json_brut LONGTEXT NULL COMMENT 'reponse complete, jamais renvoyee a l ecran',
    PRIMARY KEY (id),
    UNIQUE KEY uk_extranet_produit_pscode (pscode),
    KEY idx_extranet_produit_collecte (collecte_id),
    KEY idx_extranet_produit_picode (picode)
);

CREATE TABLE IF NOT EXISTS extranet_stock_agence (
    id BIGINT NOT NULL AUTO_INCREMENT,
    collecte_id BIGINT NOT NULL,
    horodatage DATETIME NOT NULL,
    pscode VARCHAR(30) NOT NULL,
    rang INT NOT NULL COMMENT 'rang dans infosParEtablissement, a partir de 0',
    etcode VARCHAR(50) NULL,
    etlib VARCHAR(255) NULL,
    env_produit_brut TEXT NULL COMMENT 'signification inconnue',
    pectvp_brut TEXT NULL COMMENT 'signification inconnue',
    psstk_brut TEXT NULL,
    psstk INT NULL COMMENT 'NULL si absent ou inconnu, jamais 0 par defaut',
    colisages TEXT NULL COMMENT 'liste JSON d entiers ; NULL si absente ou illisible',
    colisages_brut TEXT NULL,
    absents TEXT NULL,
    PRIMARY KEY (id),
    KEY idx_extranet_stock_agence_pscode (pscode, rang),
    KEY idx_extranet_stock_agence_etcode (etcode)
);
