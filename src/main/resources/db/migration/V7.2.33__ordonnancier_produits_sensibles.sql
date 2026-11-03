-- Cas 3 du 03/11/2026 : produits « sensibles » de l'ordonnancier.
-- Un produit coché sensible entre dans l'ordonnancier même sans code tableau ; à 0 partout, rien ne change.
ALTER TABLE t_famille ADD COLUMN IF NOT EXISTS is_sensible TINYINT(1) NOT NULL DEFAULT 0;
