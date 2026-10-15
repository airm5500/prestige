-- =====================================================================
-- Retour du 15/10 : lenteur a l'ouverture de « Modification » et « Detail sur l'article » (fiche article).
-- La date de derniere vente d'un article (GET v1/produit-search/produits/{id}) relisait toutes ses lignes de vente.
-- Cet index permet de lire les ventes d'un article de la plus recente a la plus ancienne et de s'arreter a la
-- premiere valide. Creation en ligne (pas de verrou de la table) ; 3 s pour 884 000 lignes sur le banc.
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_tpd_famille_date ON t_preenregistrement_detail (lg_FAMILLE_ID, dt_CREATED)
    ALGORITHM = INPLACE LOCK = NONE;
