-- Audit de securite du 12/10 (constat C1) : les en-tetes X-User-Info / X-Token-Exp / X-client declaraient
-- l'utilisateur sans preuve. Ils sont refuses par defaut ; ce parametre (visible dans les parametres generaux) permet
-- de les accepter de nouveau (1) si une ancienne application en avait encore besoin. Rejouable.
INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'KEY_ENTETES_X_USER_INFO', '0',
       'Anciens en-tetes X-User-Info acceptes comme connexion (0 : non, recommande ; 1 : oui, ancienne application)',
       'SYSTEM', 'enable', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'KEY_ENTETES_X_USER_INFO');
