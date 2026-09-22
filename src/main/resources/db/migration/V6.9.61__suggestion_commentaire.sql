-- Un commentaire libre sur une suggestion de commande (21/09) : une suggestion creee depuis le menu des
-- gardes dit d'ou elle vient - « Suggestion de garde - <libelle> (du ... au ...) ». Colonne facultative :
-- rien ne change pour les suggestions existantes ni pour celles creees ailleurs.
ALTER TABLE t_suggestion_order ADD COLUMN IF NOT EXISTS str_COMMENTAIRE VARCHAR(200) NULL DEFAULT NULL;
