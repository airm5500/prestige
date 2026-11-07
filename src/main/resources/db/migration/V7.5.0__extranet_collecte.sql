-- =====================================================================
-- Connecteurs extranets grossistes (Ubipharm, TEDIS), lecture seule (plan du 07/11).
-- Une ligne par collecte : c'est la date de collecte des donnees en cache et la preuve qu'une liste est complete
-- (lignes annoncees = lignes recues). Aucun cookie ni jeton n'est enregistre. Rejouable.
-- =====================================================================
CREATE TABLE IF NOT EXISTS extranet_collecte (
    id BIGINT NOT NULL AUTO_INCREMENT,
    source VARCHAR(20) NOT NULL,
    module VARCHAR(40) NOT NULL,
    parametres VARCHAR(500) NULL,
    utilisateur VARCHAR(40) NULL,
    debut DATETIME NOT NULL,
    fin DATETIME NULL,
    statut VARCHAR(12) NOT NULL,
    lignes_annoncees INT NULL,
    lignes_recues INT NULL,
    message VARCHAR(500) NULL,
    PRIMARY KEY (id),
    KEY idx_extranet_collecte_module (source, module, statut, id)
);
