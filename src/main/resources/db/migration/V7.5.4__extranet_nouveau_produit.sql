-- =====================================================================
-- Connecteur extranet Ubipharm, lecture seule (plan du 07/11, §3) : page « Nouveaux produits ».
-- Une ligne par produit lu, rattachee a sa collecte (extranet_collecte : source, date, statut). Seules les lignes de la
-- derniere collecte reussie sont gardees. Disponibilites en texte (« En stock », « Oui », « N/A »), jamais converties
-- en quantite ; un colisage n'est pas un stock ; CIP et references en chaines. Aucun HTML enregistre. Rejouable.
-- =====================================================================
CREATE TABLE IF NOT EXISTS extranet_nouveau_produit (
    id BIGINT NOT NULL AUTO_INCREMENT,
    collecte_id BIGINT NOT NULL,
    position INT NOT NULL,
    pscode VARCHAR(40) NULL,
    sheettype VARCHAR(40) NULL,
    designation VARCHAR(255) NULL,
    cip VARCHAR(40) NULL,
    cip_source VARCHAR(20) NULL,
    categorie VARCHAR(120) NULL,
    date_affichee VARCHAR(40) NULL,
    date_jour DATE NULL,
    mouvement VARCHAR(120) NULL,
    disponibilite_brute VARCHAR(120) NULL,
    PRIMARY KEY (id),
    KEY idx_extranet_nouveau_produit_collecte (collecte_id, position),
    KEY idx_extranet_nouveau_produit_pscode (pscode)
);

-- Disponibilite et colisages par agence (bulle « viewStock »). colisages : liste lue (« 12,24 »), NULL si inconnue,
-- vide si la page affiche un colisage vide ; colisages_brut : texte d'origine.
CREATE TABLE IF NOT EXISTS extranet_nouveau_produit_agence (
    id BIGINT NOT NULL AUTO_INCREMENT,
    produit_id BIGINT NOT NULL,
    position INT NOT NULL,
    etcoda VARCHAR(20) NULL,
    etlib VARCHAR(120) NULL,
    lgetlib VARCHAR(255) NULL,
    disponibilite_brute VARCHAR(120) NULL,
    colisages_brut VARCHAR(255) NULL,
    colisages VARCHAR(255) NULL,
    PRIMARY KEY (id),
    KEY idx_extranet_nouveau_produit_agence (produit_id, position),
    CONSTRAINT fk_extranet_nouveau_produit_agence FOREIGN KEY (produit_id) REFERENCES extranet_nouveau_produit (id)
        ON DELETE CASCADE
);
