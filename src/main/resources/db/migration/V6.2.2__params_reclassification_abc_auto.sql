-- =====================================================================
-- Reclassification ABC automatique - parametres
-- ---------------------------------------------------------------------
--   ABC_AUTO_RECLASS      : 1 = active (defaut), 0 = desactive
--   ABC_RECLASS_NB_MOIS   : nombre de mois d'historique pour la classif auto
--   ABC_LAST_RECLASS_DATE : date du dernier recalcul auto (gere par le job)
-- Inserts idempotents.
-- =====================================================================

INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'ABC_AUTO_RECLASS', '1',
       'Active la reclassification ABC automatique mensuelle (0/1)', 'SYSTEM', 'enable', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'ABC_AUTO_RECLASS');

INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'ABC_RECLASS_NB_MOIS', '12',
       'Nombre de mois d''historique utilises par la reclassification ABC automatique', 'SYSTEM', 'enable', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'ABC_RECLASS_NB_MOIS');

INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'ABC_LAST_RECLASS_DATE', '',
       'Date (AAAA-MM-JJ) du dernier recalcul ABC automatique - gere par le systeme', 'SYSTEM', 'enable', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'ABC_LAST_RECLASS_DATE');
