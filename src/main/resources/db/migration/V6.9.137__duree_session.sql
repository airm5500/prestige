-- Securite (13/10) : les sessions n'expiraient jamais (web.xml session-timeout -1). Elles expirent desormais apres
-- KEY_DUREE_SESSION_MINUTES minutes sans aucune requete (720 = 12 h par defaut ; 0 : jamais, ancien comportement).
-- Le changement s'applique aux sessions ouvertes apres la modification (une minute de cache). Rejouable.
INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'KEY_DUREE_SESSION_MINUTES', '720',
       'Duree d''inactivite avant deconnexion automatique, en minutes (720 = 12 h ; 0 : jamais)',
       'SYSTEM', 'enable', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'KEY_DUREE_SESSION_MINUTES');
