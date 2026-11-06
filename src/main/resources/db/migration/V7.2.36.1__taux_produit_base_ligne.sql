-- Lot « base de calcul par tiers-payant » (Q2.5) : le ticket imprime, par ligne et par organisme, la part calculee
-- sur la base PROPRE de l'organisme. taux_produit.base_ligne garde le prix de reference unitaire que le moteur a
-- applique a cet organisme sur cette ligne (NULL : prix de vente, ou regle du minimum a 0, comportement d'aujourd'hui).
-- Ecrit par le calcul du net quand KEY_PRIX_REF_BASE_PAR_TP vaut 1, relu par le ticket. Rejouable.
ALTER TABLE taux_produit ADD COLUMN IF NOT EXISTS base_ligne INT NULL DEFAULT NULL;
