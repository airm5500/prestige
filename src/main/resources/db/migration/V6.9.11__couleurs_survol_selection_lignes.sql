-- Couleurs de mise en evidence des lignes de liste, reglables par officine.
--
-- La vue de chacun n'est pas la meme et l'eclairage d'un comptoir non plus :
-- la couleur de la ligne survolee et celle de la ligne selectionnee sont donc
-- devenues des parametres, modifiables depuis « Gestion des parametrages ».
--
-- La valeur attendue est un code hexadecimal (#RRGGBB ou #RGB). Le lisere et la
-- couleur du texte en sont deduits automatiquement : une couleur claire recoit
-- un libelle sombre, une couleur foncee un libelle clair. Une valeur vide ou
-- invalide fait revenir a la couleur d'origine, l'application reste lisible.
--
-- INSERT IGNORE : les officines qui auraient deja ces cles gardent leur reglage.

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('COULEUR_SURVOL_LIGNE', '#FFCC80', 'COULEUR DE FOND DE LA LIGNE SURVOLEE DANS LES LISTES ET LE MENU - CODE HEXADECIMAL, EX. #FFCC80 (ORANGE)', 'CUSTOMER', 'enable', NULL, NULL, NULL, NULL);

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('COULEUR_SELECTION_LIGNE', '#CE93D8', 'COULEUR DE FOND DE LA LIGNE SELECTIONNEE AU CLIC DANS LES LISTES - CODE HEXADECIMAL, EX. #CE93D8 (VIOLET)', 'CUSTOMER', 'enable', NULL, NULL, NULL, NULL);
