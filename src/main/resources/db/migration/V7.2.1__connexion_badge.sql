-- Demande du 16/10 : connexion par le QR code du badge RH sur la page de connexion. Permise par defaut ; '0' la coupe
-- (les badges restent utilisables pour le pointage).
INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'KEY_CONNEXION_BADGE', '1',
       'Connexion au logiciel par le QR code du badge RH (1 = permise, 0 = coupée).',
       'NUMBER', 'enable', NOW()
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'KEY_CONNEXION_BADGE');
