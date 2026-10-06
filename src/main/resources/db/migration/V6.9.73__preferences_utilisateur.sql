-- Preferences par utilisateur (tableau de bord, cloche, colonnes choisies...) : jusqu'ici seul le localStorage du
-- navigateur, efface a chaque deconnexion. Valeur JSON libre, une ligne par (utilisateur, cle). Ajout pur.
CREATE TABLE IF NOT EXISTS `t_preference_utilisateur` (
  `lg_USER_ID` VARCHAR(40) NOT NULL,
  `str_CLE` VARCHAR(80) NOT NULL,
  `txt_VALEUR` MEDIUMTEXT NULL,
  `dt_UPDATED` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`lg_USER_ID`, `str_CLE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
