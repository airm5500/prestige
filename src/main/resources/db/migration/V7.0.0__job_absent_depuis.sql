-- Surveillance des jobs (journaux du 13/10) : un job jamais passe n'est en retard qu'une fois son delai tolere ecoule
-- depuis le premier constat de son absence (l'archivage PDF de la valorisation, qui ne tourne que du 27 au 3, etait
-- signale toutes les heures avant meme son premier jour d'archivage). Colonne ajoutee en ligne, table de quelques lignes.
ALTER TABLE t_support_job ADD COLUMN IF NOT EXISTS absent_depuis DATETIME NULL;
