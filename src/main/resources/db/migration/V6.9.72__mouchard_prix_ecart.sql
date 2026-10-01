-- Mouchard des prix de vente : ecart = nouveau prix - ancien prix (hausse positive), la convention du trigger
-- t_mouvementprice_before_insert. Les lignes ecrites sans ce trigger portaient l'inverse (vente) ou rien (commande).
UPDATE t_mouvementprice
SET int_ECART = int_PRICE_NEW - int_PRICE_OLD
WHERE int_PRICE_NEW IS NOT NULL AND int_PRICE_OLD IS NOT NULL
  AND (int_ECART IS NULL OR int_ECART <> int_PRICE_NEW - int_PRICE_OLD);
