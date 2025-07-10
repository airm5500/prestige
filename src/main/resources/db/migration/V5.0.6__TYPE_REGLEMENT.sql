ALTER TABLE reglement_carnet  ADD COLUMN IF NOT EXISTS type_reglement_id   VARCHAR(40) NULL DEFAULT NULL ;
ALTER TABLE reglement_carnet ADD  CONSTRAINT  `FKrymqow94nj2mibb37feyphbg6` FOREIGN KEY  IF NOT EXISTS (`type_reglement_id`)  REFERENCES `t_type_reglement` (`lg_TYPE_REGLEMENT_ID`);
ALTER TABLE reglement_carnet  ADD COLUMN IF NOT EXISTS id_dossier   VARCHAR(60) NULL DEFAULT NULL ;