-- Suggestions de reserve : une suggestion devient un objet metier persistant et auditable,
-- et non plus un simple calcul volatil affiche a l'ecran.
--
-- Trois tables :
--   motif_suggestion_reserve      : referentiel de motifs, administrable sans toucher au code
--   t_suggestion_reserve          : en-tete (categorie, origine, statut, motif, acteurs, dates)
--   t_suggestion_reserve_detail   : lignes (quantites proposee / retenue / deplacee + explication figee)
--
-- Convention alignee sur t_mouvement_reserve : cles VARCHAR(40), index simples, pas de contrainte
-- de cle etrangere (le module reserve n'en utilise pas).

CREATE TABLE IF NOT EXISTS `motif_suggestion_reserve` (
	`id` INT(3) NOT NULL AUTO_INCREMENT,
	`libelle` VARCHAR(250) NOT NULL COLLATE 'utf8_general_ci',
	-- RAYON : regarnir le rayon depuis la reserve / RESERVE : ranger le trop-plein du rayon en reserve
	-- NULL : motif utilisable dans les deux sens
	`categorie` VARCHAR(10) NULL DEFAULT NULL COLLATE 'utf8_general_ci',
	`actif` TINYINT(1) NOT NULL DEFAULT 1,
	PRIMARY KEY (`id`) USING BTREE,
	UNIQUE INDEX `idx_motif_suggestion_reserve_libelle` (`libelle`) USING BTREE
)
COLLATE='utf8_general_ci'
ENGINE=InnoDB
;

INSERT IGNORE INTO `motif_suggestion_reserve`(id, libelle, categorie, actif) VALUES
	(1, 'Reappro rayon journalier',   'RAYON',   1),
	(2, 'Reappro reserve journalier', 'RESERVE', 1),
	(3, 'Reappro rayon special',      'RAYON',   1),
	(4, 'Reappro reserve special',    'RESERVE', 1);


CREATE TABLE IF NOT EXISTS `t_suggestion_reserve` (
	`lg_SUGGESTION_RESERVE_ID` VARCHAR(40) NOT NULL COLLATE 'utf8_general_ci',
	`str_REF` VARCHAR(30) NULL DEFAULT NULL COLLATE 'utf8_general_ci',
	-- Destination du stock : RAYON (reserve -> rayon) ou RESERVE (rayon -> reserve)
	`str_CATEGORIE` VARCHAR(10) NOT NULL COLLATE 'utf8_general_ci',
	-- MANUELLE : creee par un utilisateur / AUTOMATIQUE : declenchee par un mouvement de stock
	-- SYSTEME  : reservee a une generation planifiee, non produite a ce jour
	`str_ORIGINE` VARCHAR(15) NOT NULL COLLATE 'utf8_general_ci',
	-- A_TRAITER -> EN_COURS -> TRAITEE, ou SUPPRIMEE
	`str_STATUT` VARCHAR(15) NOT NULL COLLATE 'utf8_general_ci',
	`motif_id` INT(3) NULL DEFAULT NULL,
	`str_COMMENTAIRE` VARCHAR(500) NULL DEFAULT NULL COLLATE 'utf8_general_ci',
	`lg_EMPLACEMENT_ID` VARCHAR(40) NULL DEFAULT NULL COLLATE 'utf8_general_ci',
	`lg_USER_CREATEUR_ID` VARCHAR(40) NULL DEFAULT NULL COLLATE 'utf8_general_ci',
	`lg_USER_TRAITANT_ID` VARCHAR(40) NULL DEFAULT NULL COLLATE 'utf8_general_ci',
	`lg_USER_CLOTURE_ID` VARCHAR(40) NULL DEFAULT NULL COLLATE 'utf8_general_ci',
	`dt_CREATED` DATETIME NULL DEFAULT NULL,
	`dt_UPDATED` DATETIME NULL DEFAULT NULL,
	`dt_TRAITEE` DATETIME NULL DEFAULT NULL,
	`dt_CLOTURE` DATETIME NULL DEFAULT NULL,
	PRIMARY KEY (`lg_SUGGESTION_RESERVE_ID`) USING BTREE,
	INDEX `idx_sugg_reserve_statut` (`str_STATUT`) USING BTREE,
	INDEX `idx_sugg_reserve_categorie` (`str_CATEGORIE`) USING BTREE,
	INDEX `idx_sugg_reserve_date` (`dt_CREATED`) USING BTREE,
	INDEX `idx_sugg_reserve_empl` (`lg_EMPLACEMENT_ID`) USING BTREE,
	-- Sert a retrouver instantanement la suggestion automatique ouverte d'un emplacement,
	-- celle a laquelle un mouvement de stock vient rattacher sa ligne.
	INDEX `idx_sugg_reserve_ouverte` (`lg_EMPLACEMENT_ID`, `str_CATEGORIE`, `str_ORIGINE`, `str_STATUT`) USING BTREE
)
COLLATE='utf8_general_ci'
ENGINE=InnoDB
;


CREATE TABLE IF NOT EXISTS `t_suggestion_reserve_detail` (
	`lg_SUGGESTION_RESERVE_DETAIL_ID` VARCHAR(40) NOT NULL COLLATE 'utf8_general_ci',
	`lg_SUGGESTION_RESERVE_ID` VARCHAR(40) NOT NULL COLLATE 'utf8_general_ci',
	`lg_FAMILLE_ID` VARCHAR(40) NULL DEFAULT NULL COLLATE 'utf8_general_ci',

	-- Quantite proposee par le systeme : FIGEE, jamais recalculee, pour garantir l'audit
	`int_QTE_PROPOSEE` INT(11) NOT NULL DEFAULT 0,
	-- Quantite retenue par l'utilisateur (peut differer de la proposition)
	`int_QTE_RETENUE` INT(11) NULL DEFAULT NULL,
	-- Quantite reellement deplacee apres traitement
	`int_QTE_DEPLACEE` INT(11) NOT NULL DEFAULT 0,

	-- Explication de la proposition, figee a la creation : le rapport imprime reste
	-- fidele a ce qui a ete constate, meme des mois plus tard.
	`int_STOCK_RAYON` INT(11) NULL DEFAULT NULL,
	`int_STOCK_RESERVE` INT(11) NULL DEFAULT NULL,
	`int_SEUIL_DECLENCHEUR` INT(11) NULL DEFAULT NULL,
	`int_CIBLE` INT(11) NULL DEFAULT NULL,
	`int_DISPONIBLE` INT(11) NULL DEFAULT NULL,
	`str_FORMULE` VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8_general_ci',

	-- PROPOSEE / MODIFIEE / SUPPRIMEE / TRAITEE / ECHEC
	`str_ETAT` VARCHAR(20) NOT NULL COLLATE 'utf8_general_ci',
	-- Reprend les codes d'echec du service de reserve (STOCK_RESERVE_INSUFFISANT, ...)
	`str_CODE_ECHEC` VARCHAR(40) NULL DEFAULT NULL COLLATE 'utf8_general_ci',
	`str_MOTIF_LIGNE` VARCHAR(255) NULL DEFAULT NULL COLLATE 'utf8_general_ci',
	-- Mouvement genere par le traitement : tracabilite complete et point d'appui de
	-- l'annulation par mouvement inverse.
	`lg_MOUVEMENT_ID` VARCHAR(40) NULL DEFAULT NULL COLLATE 'utf8_general_ci',

	`dt_CREATED` DATETIME NULL DEFAULT NULL,
	`dt_UPDATED` DATETIME NULL DEFAULT NULL,
	PRIMARY KEY (`lg_SUGGESTION_RESERVE_DETAIL_ID`) USING BTREE,
	INDEX `idx_sugg_res_det_suggestion` (`lg_SUGGESTION_RESERVE_ID`) USING BTREE,
	INDEX `idx_sugg_res_det_famille` (`lg_FAMILLE_ID`) USING BTREE,
	INDEX `idx_sugg_res_det_etat` (`str_ETAT`) USING BTREE,
	-- Evite de proposer deux fois le meme produit dans une suggestion ouverte.
	INDEX `idx_sugg_res_det_sugg_famille` (`lg_SUGGESTION_RESERVE_ID`, `lg_FAMILLE_ID`) USING BTREE
)
COLLATE='utf8_general_ci'
ENGINE=InnoDB
;
