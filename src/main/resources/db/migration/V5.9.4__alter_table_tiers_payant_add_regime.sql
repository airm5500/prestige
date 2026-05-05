

 alter table t_tiers_payant ADD  column IF NOT EXISTS regime_imposition VARCHAR(200) NULL DEFAULT NULL;

 alter table t_facture ADD column IF NOT EXISTS   fne_url VARCHAR(500) NULL DEFAULT NULL;

DROP TABLE IF EXISTS fne_invoice;