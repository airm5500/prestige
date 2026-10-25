-- Retours du 25/10 (point 2) : rappel « date et heure du systeme fausses ». Fuseau horaire attendu du serveur (un
-- serveur dont le fuseau a change, souvent de 8 heures, est signale). A changer pour une officine hors de ce fuseau.
INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'KEY_FUSEAU_HORAIRE', 'Africa/Abidjan',
       'Fuseau horaire attendu du serveur (ex. Africa/Abidjan, Africa/Douala) : un autre fuseau est signale a tous les postes',
       'CUSTOMER', 'enable', NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'KEY_FUSEAU_HORAIRE');
