-- Optimisation du menu "Gestion des facturations".
-- Sans recherche texte, la liste et le comptage des factures
-- (factureManagement.getListFacture / getListFacturesCount) filtrent sur une
-- plage de dt_CREATED (t.dt_CREATED >= ? AND t.dt_CREATED <= ?) avec un
-- ORDER BY dt_CREATED DESC, str_CODE_FACTURE DESC. Sans index sur ces colonnes,
-- MariaDB fait un scan complet de t_facture suivi d'un filesort.
-- Un index BTREE (dt_CREATED, str_CODE_FACTURE) couvre a la fois le filtre de
-- plage et le tri.
ALTER TABLE t_facture
    ADD INDEX IF NOT EXISTS idx_facture_dt_created (dt_CREATED, str_CODE_FACTURE) USING BTREE;
