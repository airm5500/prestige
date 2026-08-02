-- Parametrage de l'edition des etiquettes A4 (planche de 65 etiquettes, 5 colonnes x 13 lignes).
--
-- KEY_ETIQUETTE_MODELE : modele de planche applique quand l'ecran n'en precise pas.
--   Valeurs possibles :
--     CARRE_38X21_2   : etiquettes rectangulaires 38 x 21,2 mm, sans espace (defaut)
--     ARRONDI_38X21   : etiquettes a bouts arrondis 38 x 21 mm, sans espace
--     CARRE_38_1X21_2 : etiquettes 38,1 x 21,2 mm avec espace horizontal entre colonnes
--     PERSONNALISE    : dimensions lues dans les parametres KEY_ETIQUETTE_* ci-dessous
--
-- Les autres parametres ne sont utilises que lorsque le modele est PERSONNALISE :
-- nombre de colonnes et de lignes (donc nombre d'etiquettes par page), dimensions d'une
-- etiquette en millimetres (separateur decimal point ou virgule) et espacements entre
-- etiquettes en millimetres. La grille est toujours centree sur la page A4.

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
VALUES
    ('KEY_ETIQUETTE_MODELE', 'CARRE_38X21_2', 'Modele de planche d etiquettes par defaut (CARRE_38X21_2, ARRONDI_38X21, CARRE_38_1X21_2, PERSONNALISE)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL),
    ('KEY_ETIQUETTE_NB_COLONNES', '5', 'Etiquettes (modele PERSONNALISE) : nombre de colonnes par page', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL),
    ('KEY_ETIQUETTE_NB_LIGNES', '13', 'Etiquettes (modele PERSONNALISE) : nombre de lignes par page', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL),
    ('KEY_ETIQUETTE_LARGEUR_MM', '38', 'Etiquettes (modele PERSONNALISE) : largeur d une etiquette en mm', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL),
    ('KEY_ETIQUETTE_HAUTEUR_MM', '21.2', 'Etiquettes (modele PERSONNALISE) : hauteur d une etiquette en mm', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL),
    ('KEY_ETIQUETTE_ESPACE_H_MM', '0', 'Etiquettes (modele PERSONNALISE) : espace horizontal entre etiquettes en mm', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL),
    ('KEY_ETIQUETTE_ESPACE_V_MM', '0', 'Etiquettes (modele PERSONNALISE) : espace vertical entre etiquettes en mm', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);
