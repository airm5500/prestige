-- Calage fin de l'impression des etiquettes A4, applicable a tous les modeles sans redeploiement.
--
-- Procedure : imprimer la page de test (/Etiquete?test=1) a 100% (taille reelle), la superposer
-- sur une planche d'etiquettes devant une source lumineuse, mesurer les ecarts puis renseigner :
--
--   KEY_ETIQUETTE_MARGE_GAUCHE_MM / KEY_ETIQUETTE_MARGE_HAUT_MM : marges physiques reelles du
--     papier en mm (vide = grille centree sur la page, comportement par defaut) ;
--   KEY_ETIQUETTE_DECALAGE_X_MM / KEY_ETIQUETTE_DECALAGE_Y_MM : decalage global en mm, valeurs
--     negatives admises (+X = vers la droite, +Y = vers le bas) — corrige un ecart uniforme du
--     a la prise papier de l'imprimante ;
--   KEY_ETIQUETTE_ECHELLE_POURCENT : echelle appliquee a la grille (50 a 150, defaut 100) —
--     corrige une derive progressive entre la premiere et la derniere ligne quand le pilote
--     d'impression reduit systematiquement la page (ex. 104 si l'impression sort a ~96%).

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
VALUES
    ('KEY_ETIQUETTE_MARGE_GAUCHE_MM', '', 'Etiquettes : marge gauche reelle du papier en mm (vide = grille centree)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL),
    ('KEY_ETIQUETTE_MARGE_HAUT_MM', '', 'Etiquettes : marge haute reelle du papier en mm (vide = grille centree)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL),
    ('KEY_ETIQUETTE_DECALAGE_X_MM', '0', 'Etiquettes : decalage horizontal en mm (+ = droite, - = gauche)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL),
    ('KEY_ETIQUETTE_DECALAGE_Y_MM', '0', 'Etiquettes : decalage vertical en mm (+ = bas, - = haut)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL),
    ('KEY_ETIQUETTE_ECHELLE_POURCENT', '100', 'Etiquettes : echelle de la grille en pourcent (50-150, 100 = taille reelle)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);
