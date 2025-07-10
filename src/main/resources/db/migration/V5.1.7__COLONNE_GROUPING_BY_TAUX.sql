ALTER TABLE t_tiers_payant  ADD COLUMN IF NOT EXISTS grouping_by_taux  TINYINT(1) NULL DEFAULT '0' ;
