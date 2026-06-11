ALTER TABLE t_preenregistrement_detail
    ADD INDEX IF NOT EXISTS idx_tpd_vente_famille_quantite (lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY) USING BTREE;
