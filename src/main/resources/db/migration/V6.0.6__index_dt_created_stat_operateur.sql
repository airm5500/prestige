-- Optimisation du menu "Statistiques d'activite par operateur".
-- La requete getSalesByOperateur filtre sur dt_CREATED (et non dt_UPDATED, deja
-- indexe), d'ou un scan complet de t_preenregistrement faute d'index utilisable.
-- Index composite : colonnes d'egalite (str_STATUT, b_IS_CANCEL) en tete, puis la
-- colonne de plage (dt_CREATED), puis l'operateur et le prix pour couvrir la
-- jointure/regroupement et le filtre int_PRICE > 0.
ALTER TABLE t_preenregistrement
    ADD INDEX IF NOT EXISTS idx_preenregistrement_stat_operateur (str_STATUT, b_IS_CANCEL, dt_CREATED, lg_USER_VENDEUR_ID, int_PRICE) USING BTREE;
