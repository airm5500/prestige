-- Verrou d'occupation d'une suggestion.
--
-- Deux personnes ne doivent pas saisir les quantites d'une meme suggestion en meme temps :
-- leurs saisies s'ecraseraient mutuellement sans que ni l'une ni l'autre s'en apercoive.
--
-- Le verrou retient QUI occupe la suggestion et DEPUIS QUAND. La date sert de garde-fou :
-- un poste ferme brutalement ne condamne pas la suggestion, le verrou etant considere comme
-- perime passe un delai et repris automatiquement.

ALTER TABLE `t_suggestion_reserve`
	ADD COLUMN IF NOT EXISTS `lg_USER_VERROU_ID` VARCHAR(40) NULL DEFAULT NULL COLLATE 'utf8_general_ci';

ALTER TABLE `t_suggestion_reserve`
	ADD COLUMN IF NOT EXISTS `dt_VERROU` DATETIME NULL DEFAULT NULL;
