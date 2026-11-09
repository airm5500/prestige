-- =====================================================================
-- Extranets grossistes (08/11) : la page de connexion est gardée telle que saisie (adresse complète), et celle
-- d'Ubipharm passe par son serveur d'authentification (auth.ubipharm.com, adresse de plus de 250 caractères).
-- Rejouable.
-- =====================================================================
ALTER TABLE extranet_compte MODIFY COLUMN page_connexion VARCHAR(1000) NULL DEFAULT NULL;
