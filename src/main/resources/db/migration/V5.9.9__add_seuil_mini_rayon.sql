-- Ajout du seuil mini rayon sur t_famille
-- Declencheur pour le reassort reserve->rayon : stock_rayon <= int_SEUIL_MINI_RAYON
-- NULL = non configure (produit exclu des suggestions jusqu'a saisie manuelle)
ALTER TABLE t_famille
    ADD COLUMN int_SEUIL_MINI_RAYON INT NULL DEFAULT NULL;
