-- Centre de Support : le detail technique d'un evenement (pile d'appels) n'etait garde que dans un fichier,
-- sous le dossier de travail du compte qui fait tourner le serveur. Des que ce compte change - ou que le
-- fichier est purge - le detail devient illisible : le journal exporte porte alors « Log introuvable ».
-- Un extrait du detail est desormais conserve avec l'evenement, en base : l'export suffit a l'analyse.
ALTER TABLE t_application_event ADD COLUMN stack_extrait TEXT NULL AFTER payload_json;
