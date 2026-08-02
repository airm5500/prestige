-- Harmonisation des descriptions des parametres d'etiquettes : toutes commencent par
-- "Etiquettes :" pour que la recherche par prefixe de l'ecran de configuration les liste
-- toutes d'un coup, et la dimension exacte d'une etiquette est rappelee dans le modele.
--
-- La dimension d'UNE etiquette est definie par le modele choisi :
--   CARRE_38X21_2   -> 38 x 21,2 mm    ARRONDI_38X21 -> 38 x 21 mm
--   CARRE_38_1X21_2 -> 38,1 x 21,2 mm  PERSONNALISE  -> KEY_ETIQUETTE_LARGEUR_MM / HAUTEUR_MM

UPDATE t_parameters SET str_DESCRIPTION = 'Etiquettes : modele de planche par defaut - CARRE_38X21_2 (38 x 21,2 mm), ARRONDI_38X21 (38 x 21 mm), CARRE_38_1X21_2 (38,1 x 21,2 mm avec espaces), PERSONNALISE (dimensions des parametres ci-dessous)' WHERE str_KEY = 'KEY_ETIQUETTE_MODELE';
UPDATE t_parameters SET str_DESCRIPTION = 'Etiquettes : largeur exacte d une etiquette en mm (modele PERSONNALISE uniquement)' WHERE str_KEY = 'KEY_ETIQUETTE_LARGEUR_MM';
UPDATE t_parameters SET str_DESCRIPTION = 'Etiquettes : hauteur exacte d une etiquette en mm (modele PERSONNALISE uniquement)' WHERE str_KEY = 'KEY_ETIQUETTE_HAUTEUR_MM';
UPDATE t_parameters SET str_DESCRIPTION = 'Etiquettes : nombre de colonnes par page (modele PERSONNALISE uniquement)' WHERE str_KEY = 'KEY_ETIQUETTE_NB_COLONNES';
UPDATE t_parameters SET str_DESCRIPTION = 'Etiquettes : nombre de lignes par page (modele PERSONNALISE uniquement)' WHERE str_KEY = 'KEY_ETIQUETTE_NB_LIGNES';
UPDATE t_parameters SET str_DESCRIPTION = 'Etiquettes : espace horizontal entre etiquettes en mm (modele PERSONNALISE uniquement)' WHERE str_KEY = 'KEY_ETIQUETTE_ESPACE_H_MM';
UPDATE t_parameters SET str_DESCRIPTION = 'Etiquettes : espace vertical entre etiquettes en mm (modele PERSONNALISE uniquement)' WHERE str_KEY = 'KEY_ETIQUETTE_ESPACE_V_MM';
UPDATE t_parameters SET str_DESCRIPTION = 'Etiquettes : moteur d edition - NOUVEAU (PDF vectoriel) ou ANCIEN (JasperReports historique, solution de repli)' WHERE str_KEY = 'KEY_ETIQUETTE_MOTEUR';
