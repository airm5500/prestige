-- Controle d'une suggestion traitee.
--
-- Traiter une suggestion deplace du stock ; rien ne dit pour autant que le deplacement
-- physique a bien ete fait en rayon et en reserve. Le controle est cette confirmation :
-- une seconde personne constate sur le terrain que l'operation a ete realisee, puis la
-- valide. On retient QUI a controle, QUAND, et une observation facultative.
--
-- La colonne reste vide sur les suggestions deja traitees avant cette version : elles
-- apparaitront simplement comme non controlees, ce qui est exact.

ALTER TABLE `t_suggestion_reserve`
	ADD COLUMN IF NOT EXISTS `lg_USER_CONTROLE_ID` VARCHAR(40) NULL DEFAULT NULL COLLATE 'utf8_general_ci';

ALTER TABLE `t_suggestion_reserve`
	ADD COLUMN IF NOT EXISTS `dt_CONTROLE` DATETIME NULL DEFAULT NULL;

ALTER TABLE `t_suggestion_reserve`
	ADD COLUMN IF NOT EXISTS `str_OBSERVATION_CONTROLE` VARCHAR(500) NULL DEFAULT NULL COLLATE 'utf8_general_ci';

-- Le filtre controlees / non controlees porte sur les suggestions traitees.
ALTER TABLE `t_suggestion_reserve`
	ADD INDEX IF NOT EXISTS `idx_suggestion_reserve_controle` (`str_STATUT`, `dt_CONTROLE`);
