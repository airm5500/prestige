ALTER TABLE t_preenregistrement
    ADD INDEX IF NOT EXISTS idx_preenregistrement_dt_updated (dt_UPDATED) USING BTREE;
