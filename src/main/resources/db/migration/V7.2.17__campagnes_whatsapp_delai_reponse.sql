-- Retours du 25/10 (point 14) : les campagnes automatiques passent en WhatsApp (accord du 25/10) ; délai pendant lequel
-- une réponse du client est comptée après l'envoi (7 jours par défaut, de 1 à 90).
UPDATE t_parameters SET str_VALUE = 'WHATSAPP', dt_UPDATED = NOW() WHERE str_KEY = 'KEY_CAMPAGNE_AUTO_CANAL' AND str_VALUE = 'SMS';

INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT) VALUES
 ('KEY_CAMPAGNE_DELAI_REPONSE', '7', 'Campagnes : une réponse du client est comptée si elle arrive dans ce nombre de jours après l''envoi (1 à 90)', 'SYSTEME', 'enable');
