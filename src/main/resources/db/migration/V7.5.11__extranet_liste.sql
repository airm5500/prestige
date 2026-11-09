-- =====================================================================
-- Connecteur extranet Ubipharm, lecture seule : listes de l'onglet Ubipharm (promotions, produits avec UG, produits
-- supprimes, factures non relevees, derniers releves, recapitulatifs d'avoirs, dernieres commandes, commandes
-- extranet, produits les plus achetes). Une ligne par ligne lue, rattachee a sa collecte (extranet_collecte, module
-- LISTE_<code>) ; seules les lignes de la derniere collecte reussie de chaque liste sont gardees.
-- cellules : tableau JSON de textes, dans l'ordre des colonnes de la liste (texte affiche, jamais de HTML ni de
-- montant converti). pscode et cip : reference produit quand la ligne en porte une. Rejouable.
-- =====================================================================
CREATE TABLE IF NOT EXISTS extranet_liste_ligne (
    id BIGINT NOT NULL AUTO_INCREMENT,
    collecte_id BIGINT NOT NULL,
    liste VARCHAR(40) NOT NULL,
    position INT NOT NULL,
    agence VARCHAR(20) NULL,
    pscode VARCHAR(40) NULL,
    cip VARCHAR(40) NULL,
    cellules TEXT NOT NULL,
    PRIMARY KEY (id),
    KEY idx_extranet_liste_ligne_liste (liste, collecte_id, position),
    KEY idx_extranet_liste_ligne_pscode (pscode)
);
