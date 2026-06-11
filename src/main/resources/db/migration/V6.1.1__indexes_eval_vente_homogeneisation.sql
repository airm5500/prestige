-- Report en migration des index crees manuellement sur la base de reference
-- (visibles dans les plans d'execution de l'evaluation des ventes mais absents
-- des migrations) afin d'homogeneiser tous les environnements.

ALTER TABLE t_famille
    ADD INDEX IF NOT EXISTS idx_famille_eval_vente_cip (str_STATUT, int_CIP, lg_FAMILLE_ID) USING BTREE,
    ADD INDEX IF NOT EXISTS idx_famille_eval_vente_famille_article (str_STATUT, lg_FAMILLEARTICLE_ID, str_NAME, lg_FAMILLE_ID) USING BTREE,
    ADD INDEX IF NOT EXISTS idx_famille_eval_vente_name (str_STATUT, str_NAME, lg_FAMILLE_ID) USING BTREE,
    ADD INDEX IF NOT EXISTS idx_famille_eval_vente_zone_geo (str_STATUT, lg_ZONE_GEO_ID, str_NAME, lg_FAMILLE_ID) USING BTREE;

ALTER TABLE t_famille_stock
    ADD INDEX IF NOT EXISTS idx_famille_stock_eval_vente (lg_FAMILLE_ID, lg_EMPLACEMENT_ID, str_STATUT, int_NUMBER_AVAILABLE) USING BTREE;

ALTER TABLE t_preenregistrement
    ADD INDEX IF NOT EXISTS idx_preenregistrement_eval_vente (str_STATUT, b_IS_CANCEL, dt_UPDATED, lg_PREENREGISTREMENT_ID, int_PRICE) USING BTREE;

-- Doublon strict de idx_tpd_vente_famille_quantite (cree en V6.1.0) :
-- on ne conserve qu'un seul des deux index pour ne pas penaliser les insertions
ALTER TABLE t_preenregistrement_detail
    DROP INDEX IF EXISTS idx_preenregistrement_detail_eval_vente;
