-- Plan du 21/11, point 15 : explication de la prevision d'un produit (fenetre de prevision), enregistree au calcul
-- (nuit ou « Recalculer maintenant ») avec les chiffres memes du calcul : methode, valeur, formule et etapes, en JSON.
-- Relue par la fenetre (api/v1/analyse-commande/produit/{id}). NULL pour les lignes calculees avant : la fenetre la
-- refait alors sur l'historique quand il suffit. Aucune donnee nominative. Rejouable.
ALTER TABLE t_prevision_produit
    ADD COLUMN IF NOT EXISTS explication TEXT NULL;
