ALTER TABLE t_order ADD COLUMN IF NOT EXISTS  direct_import boolean default FALSE;
ALTER TABLE  t_bon_livraison ADD COLUMN IF NOT EXISTS direct_import boolean default FALSE;