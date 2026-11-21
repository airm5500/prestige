-- =====================================================================
-- Seuils SEMOIS (Moaye, 21/11/2026, « oui aussi en standard ») : en SEMOIS standard aussi, un produit actif sans vente
-- sur les mois retenus passe a seuil 0 et quantite 0 (bool_CALCUL_SEUIL respecte), comme en ABC et par produit.
-- Le parametre SEMOIS n'a pas d'explication : le rappel est ajoute a celle de SEMOIS_DIVISEUR_MOIS_REELS, qui decrit le
-- calcul des trois modes. Son texte valide (« regle ») ne change pas.
-- =====================================================================

UPDATE parametre_explication
SET explication = JSON_ARRAY_APPEND(explication, '$.rappels',
        'Dans les trois modes, un produit actif sans vente sur les mois retenus passe à seuil 0 et quantité 0, sauf si le calcul du seuil est désactivé sur sa fiche.')
WHERE str_KEY = 'SEMOIS_DIVISEUR_MOIS_REELS'
  AND explication NOT LIKE '%sans vente sur les mois retenus%';
