-- =====================================================================
-- Connecteur Ubipharm, reclamations, lecture seule (plan du 07/11, §7 et §8).
-- extranet_reclamation       : une ligne par reclamation lue, dans la liste d'un filtre (nature LISTE)
--                              ou dans son detail (nature DETAIL). id, eta, appl viennent du lien de detail,
--                              jamais d'un decoupage de la reference. Dates : texte brut + date lue.
-- extranet_reclamation_ligne : lignes du tableau #reclamation d'un detail : 14 cellules brutes par position
--                              (JSON), champs reconnus a part (pscode, CIP, quantite, prix brut et decimal,
--                              motif, commentaire). Un prix inconnu reste NULL, jamais 0.
-- extranet_document          : trace d'un document telecharge (PDF) : parametres du lien source, type,
--                              taille, SHA-256, chemin relatif du fichier sur le disque du serveur.
--                              Les octets ne sont pas en base.
-- Aucun cookie ni jeton n'est enregistre. Rejouable.
-- =====================================================================
CREATE TABLE IF NOT EXISTS extranet_reclamation (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nature VARCHAR(10) NOT NULL,
    filtre VARCHAR(5) NULL,
    rang INT NULL,
    rec_id VARCHAR(20) NULL,
    eta VARCHAR(10) NULL,
    appl VARCHAR(10) NULL,
    reference VARCHAR(60) NULL,
    numeros_associes VARCHAR(500) NULL,
    statut VARCHAR(100) NULL,
    date_envoi_brute VARCHAR(40) NULL,
    date_envoi DATE NULL,
    date_maj_brute VARCHAR(40) NULL,
    date_maj DATE NULL,
    agence VARCHAR(150) NULL,
    entetes TEXT NULL,
    collecte_id BIGINT NULL,
    collecte_le DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_extranet_reclamation_liste (nature, filtre, collecte_id),
    KEY idx_extranet_reclamation_cle (rec_id, eta, appl, nature)
);

CREATE TABLE IF NOT EXISTS extranet_reclamation_ligne (
    id BIGINT NOT NULL AUTO_INCREMENT,
    reclamation_id BIGINT NOT NULL,
    position INT NOT NULL,
    cellules TEXT NOT NULL,
    pscode VARCHAR(40) NULL,
    designation VARCHAR(255) NULL,
    cip VARCHAR(40) NULL,
    quantite INT NULL,
    prix_brut VARCHAR(60) NULL,
    prix DECIMAL(18, 4) NULL,
    motif VARCHAR(500) NULL,
    commentaire TEXT NULL,
    PRIMARY KEY (id),
    KEY idx_extranet_reclamation_ligne_rec (reclamation_id, position),
    KEY idx_extranet_reclamation_ligne_pscode (pscode)
);

CREATE TABLE IF NOT EXISTS extranet_document (
    id BIGINT NOT NULL AUTO_INCREMENT,
    source VARCHAR(20) NOT NULL,
    type_document VARCHAR(20) NOT NULL,
    chemin_source VARCHAR(100) NOT NULL,
    parametres VARCHAR(500) NOT NULL,
    type_contenu VARCHAR(100) NULL,
    taille BIGINT NOT NULL,
    sha256 CHAR(64) NOT NULL,
    fichier VARCHAR(255) NOT NULL,
    collecte_id BIGINT NULL,
    collecte_le DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_extranet_document_lien (source, type_document, parametres(191)),
    KEY idx_extranet_document_sha (sha256)
);
