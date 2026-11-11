-- Plan du 09/11, points 5 et 6 : taux de rupture, un seul reglage pour le menu Prevision et le tableau de bord.
-- Produit vendu frequemment : vendu dans au moins N mois des M derniers mois complets et au moins Q unites ; taux =
-- produits frequents a stock nul (stock actuel, rayon + reserve) / produits frequents. Reglable dans l'ecran Prevision
-- (onglet Tableau, parametres) et dans Parametrages > PREVISION. Rejouable.
INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('KEY_PREVISION_RUPTURE_MOIS', '3', 'Taux de rupture : mois observes (derniers mois complets)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NOW());
INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('KEY_PREVISION_RUPTURE_MOIS_VENTE', '2', 'Taux de rupture : produit frequent si vendu au moins N mois de la periode', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NOW());
INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('KEY_PREVISION_RUPTURE_QTE_MIN', '3', 'Taux de rupture : et au moins Q unites vendues sur la periode', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NOW());
