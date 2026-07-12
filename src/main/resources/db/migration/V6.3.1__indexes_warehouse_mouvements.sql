-- Index de performance pour l'écran « Point détaillé entrée/sortie » (API v1/stock-movements).
-- IF NOT EXISTS => sans effet là où ils existent déjà.

-- Filtre « Entrée en stock » : la requête filtre str_STATUT = 'enable' + borne de date sur dt_CREATED.
-- Sans index, chaque affichage balaye toute la table t_warehouse (lenteur signalée en recette).
ALTER TABLE t_warehouse
    ADD INDEX IF NOT EXISTS idx_warehouse_statut_created (str_STATUT, dt_CREATED) USING BTREE;

-- Filtre « Saisie en périmés » : str_STATUT = 'delete' + borne de date sur dt_UPDATED.
ALTER TABLE t_warehouse
    ADD INDEX IF NOT EXISTS idx_warehouse_statut_updated (str_STATUT, dt_UPDATED) USING BTREE;
