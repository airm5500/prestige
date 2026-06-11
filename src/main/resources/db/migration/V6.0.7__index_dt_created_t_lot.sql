-- Optimisation du menu "Liste des lots".
-- La requete listlot (LotServiceImpl.getAllLots) filtre desormais sur une plage
-- de dt_CREATED (l.dt_CREATED >= ? AND l.dt_CREATED < ?) avec un ORDER BY
-- dt_CREATED DESC. Sans index sur cette colonne, MariaDB fait un scan complet de
-- t_lot suivi d'un filesort.
-- Un index BTREE simple sur dt_CREATED couvre a la fois le filtre de plage et le
-- tri (la table existe deja avec un index sur dt_PEREMPTION uniquement).
ALTER TABLE t_lot
    ADD INDEX IF NOT EXISTS idx_lot_dt_created (dt_CREATED) USING BTREE;
