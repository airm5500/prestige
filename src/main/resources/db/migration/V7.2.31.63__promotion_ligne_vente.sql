-- Audit 05 PR-01 : ligne de vente au comptant tarifee par une promotion (t_promotion_product). La remise client
-- ne s'ajoute pas a une ligne en promotion ; NULL pour toutes les lignes existantes (comportement inchange).
ALTER TABLE t_preenregistrement_detail ADD COLUMN IF NOT EXISTS promotion_produit_id INT NULL;
