-- Jeton secret protegeant le callback Delivery Receipt (public sur Internet).
-- Vide par defaut = protection desactivee. Renseigner une valeur depuis
-- l'ecran Notifications > Accuses de reception (DR) pour activer la protection.
-- Quand il est renseigne, Orange doit appeler /dr-callback?key=<secret>.

INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'KEY_SMS_DR_CALLBACK_SECRET', '',
       'Jeton secret du callback DR (parametre ?key=). Vide = protection desactivee.', 'SYSTEM', 'enable', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'KEY_SMS_DR_CALLBACK_SECRET');
