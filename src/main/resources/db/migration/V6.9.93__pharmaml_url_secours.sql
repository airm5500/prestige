-- PharmaML (retours du 07/10) : adresse de secours par grossiste (ex. DPCI : URL principale + URL secondaire).
-- Utilisee SEULEMENT si la principale est injoignable (connexion impossible, adresse introuvable) : jamais apres une
-- reponse ou un depassement du delai de reponse, pour ne pas envoyer deux fois la meme commande.
ALTER TABLE `t_grossiste` ADD COLUMN IF NOT EXISTS `str_URL_PHARMAML_SECOURS` VARCHAR(255) NULL;
