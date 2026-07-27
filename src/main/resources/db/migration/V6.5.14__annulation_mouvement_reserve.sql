-- Annulation d'un mouvement de reserve par mouvement inverse.
--
-- L'historique reste immuable : on ne supprime ni ne retouche jamais un mouvement execute.
-- Annuler consiste a creer un SECOND mouvement, de sens oppose, qui pointe vers le premier.
-- Les deux restent lisibles cote a cote, avec leur auteur, leur date et le motif.

ALTER TABLE `t_mouvement_reserve`
	ADD COLUMN IF NOT EXISTS `lg_MOUVEMENT_SOURCE_ID` VARCHAR(40) NULL DEFAULT NULL COLLATE 'utf8_general_ci';

ALTER TABLE `t_mouvement_reserve`
	ADD COLUMN IF NOT EXISTS `str_MOTIF_ANNULATION` VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8_general_ci';

-- Sert a repondre instantanement a la question "ce mouvement a-t-il deja ete annule ?",
-- posee avant chaque annulation pour interdire la double annulation.
CREATE INDEX IF NOT EXISTS `idx_mvt_reserve_source` ON `t_mouvement_reserve` (`lg_MOUVEMENT_SOURCE_ID`);


-- Privilege dedie a l'annulation. Controle cote serveur, et l'action est masquee a l'ecran
-- pour qui ne le detient pas.
INSERT IGNORE INTO t_privilege (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`, `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
	VALUES ('20260801', 'P_ANNULER_MOUVEMENT_RESERVE', 'CUSTOMER', 'Annuler un mouvement de reserve par mouvement inverse', NULL, NOW(), NULL, NOW(), NULL, 'enable');

-- Contrairement aux privileges usuels, celui-ci n'est attribue a AUCUN role au depart :
-- l'annulation defait un mouvement de stock deja valide, elle doit etre accordee
-- explicitement depuis la gestion des roles plutot que d'etre ouverte a tous par defaut.
