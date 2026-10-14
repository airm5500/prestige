-- Suivi des modes de reglement (recap caisse/recette) : 4,5 s meme sur une periode vide, car la date de reglement
-- n'etait pas indexee et etait lue a travers DATE(). Index pose en ligne, sans bloquer la table ; la requete compare
-- maintenant la colonne elle-meme (0,15 s sur 13 jours, 420 000 reglements).
ALTER TABLE vente_reglement ADD INDEX IF NOT EXISTS idx_vente_reglement_mvtdate (mvtDate), ALGORITHM=INPLACE, LOCK=NONE;
