-- Plan du 09/11, point 10 : critere de duree des ventes (« Ventes de plus de 10 min ») enregistre pour tous, lu par
-- l'onglet principal et l'onglet Anomalies d'« Activite des equipes » et par la carte du tableau de bord. Reglable
-- depuis l'ecran (bouton « Enregistrer pour tous »). Plus de 10 minutes par defaut. Rejouable.
INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('KEY_TABLEAU_BORD_SEUIL_VENTE_LONGUE_OP', 'GT', 'ACTIVITE DES EQUIPES : OPERATEUR DU CRITERE DE DUREE DES VENTES (GT, GE, LT, LE)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NOW());
INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('KEY_TABLEAU_BORD_SEUIL_VENTE_LONGUE_MIN', '10', 'ACTIVITE DES EQUIPES : MINUTES DU CRITERE DE DUREE DES VENTES', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NOW());
