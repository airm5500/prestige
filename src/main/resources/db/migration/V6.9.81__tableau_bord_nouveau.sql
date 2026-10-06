-- Nouveau tableau de bord (plan d'octobre, section 8, lot L8).
-- KEY_TABLEAU_BORD_VERSION : NOUVEAU (tableau de bord ExtJS, sans iframe) ou ANCIEN (dashboard.html, inchange).
-- KEY_TABLEAU_BORD_MOBILE_MONEY : types de reglement regroupes sous « Mobile money » dans la carte des encaissements
--   (identifiants de t_type_reglement, separes par des virgules : ORANGE, MOOV, MTN, WAVE, DJAMO, CELPAID, TRESORPAY).
-- Rejouable : INSERT IGNORE.
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT)
VALUES ('KEY_TABLEAU_BORD_VERSION', 'NOUVEAU', 'Tableau de bord affiche : NOUVEAU ou ANCIEN', 'SYSTEME', 'enable');
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT)
VALUES ('KEY_TABLEAU_BORD_MOBILE_MONEY', '7,8,9,10,19,70,80', 'Tableau de bord : types de reglement regroupes en mobile money', 'SYSTEME', 'enable');
