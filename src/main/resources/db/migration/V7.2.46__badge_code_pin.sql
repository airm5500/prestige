-- Plan du 08/11, point 14 : code PIN a 4 chiffres demande apres le badge (une photo du QR ne suffit plus).
-- Optionnel et desactive par defaut : '1' le demande, '0' (ou absent) laisse le badge seul suffire.
INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'KEY_CONNEXION_BADGE_PIN', '0',
       'Connexion par badge : code PIN à 4 chiffres demandé après le badge (1 = demandé, 0 = badge seul). Chacun définit son code dans Mon compte.',
       'NUMBER', 'enable', NOW()
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'KEY_CONNEXION_BADGE_PIN');

-- Une ligne par utilisateur : empreinte salee (PBKDF2) du code, jamais le code.
CREATE TABLE IF NOT EXISTS t_badge_pin (
  lg_USER_ID varchar(40) NOT NULL,
  sel varchar(64) NOT NULL,
  empreinte varchar(128) NOT NULL,
  dt_maj datetime NOT NULL,
  PRIMARY KEY (lg_USER_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
