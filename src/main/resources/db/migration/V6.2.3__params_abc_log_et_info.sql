-- =====================================================================
-- Parametres complementaires ABC
--   SEMOIS_ABC_LOG        : 1 = journalise les calculs SEMOIS ABC en JSON (0 par defaut)
--   ABC_LAST_RECLASS_INFO : resume du dernier recalcul auto (gere par le systeme)
-- Inserts idempotents.
-- =====================================================================

INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'SEMOIS_ABC_LOG', '0',
       'Journalise les calculs SEMOIS ABC produit par produit en JSON (0/1)', 'SYSTEM', 'enable', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'SEMOIS_ABC_LOG');

INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'ABC_LAST_RECLASS_INFO', '',
       'Resume du dernier recalcul ABC automatique (date, total, appliques, A/B/C, statut)', 'SYSTEM', 'enable', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'ABC_LAST_RECLASS_INFO');
