-- Lot « base de calcul par tiers-payant » (Q2.5 du cas 2 du 03/11/2026).
-- Parametre KEY_PRIX_REF_BASE_PAR_TP, a 0 : le moteur garde la regle d'aujourd'hui (le plus petit des prix de
-- reference de la vente sert de base a toutes les parts). A 1 : chaque tiers-payant est calcule sur son propre prix
-- de reference (ou le prix de vente s'il n'en a pas) x quantite, avec son propre taux ; plafonds inchanges.
-- Rejouable (insertion conditionnelle).
INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'KEY_PRIX_REF_BASE_PAR_TP', '0',
       'Vente assurance : base de calcul de chaque tiers-payant = son propre prix de reference (1) ; 0 = regle du minimum des prix de reference de la vente (calcul inchange)',
       'CUSTOMER', 'enable', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'KEY_PRIX_REF_BASE_PAR_TP');
