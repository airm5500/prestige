ALTER TABLE MvtTransaction  ADD COLUMN IF NOT EXISTS cmu_amount  INT(11) NULL DEFAULT '0' ;
ALTER TABLE t_preenregistrement_detail  ADD COLUMN IF NOT EXISTS cmu_price  INT(8) NULL  ;
ALTER TABLE HMvtProduit  ADD COLUMN IF NOT EXISTS cmu_price  INT(8) NULL ;
ALTER TABLE t_famille  ADD COLUMN IF NOT EXISTS cmu_price  INT(8) NULL ;
ALTER TABLE t_preenregistrement  ADD COLUMN IF NOT EXISTS cmu_amount  INT(11) NULL DEFAULT '0' ;
