-- Index pour les suggestions de reassort de la reserve (badge de la cloche + panneau + ecran reserve) :
-- WHERE lg_TYPE_STOCK_ID = ? AND lg_EMPLACEMENT_ID = ? AND str_STATUT = 'enable'
ALTER TABLE t_type_stock_famille
    ADD INDEX IF NOT EXISTS idx_tsf_type_empl_statut (lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_STATUT) USING BTREE;
