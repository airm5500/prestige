-- =====================================================================
-- Retours du 13/10 (point 21) : objectifs de l'analyse des marges, en %.
--   taux de marque = marge / CA HT ; taux de marge = marge / prix d'achat.
-- A l'objectif ou au-dessus : vert ; en dessous : rouge. Reglables depuis l'onglet « Analyse ». Rejouable.
-- =====================================================================
INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'KEY_OBJECTIF_TAUX_MARQUE', '25', 'Objectif du taux de marque (marge / CA HT), en %', 'NUMBER', 'enable', NOW()
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'KEY_OBJECTIF_TAUX_MARQUE');
INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'KEY_OBJECTIF_TAUX_MARGE', '33.33', 'Objectif du taux de marge (marge / prix d''achat), en %', 'NUMBER', 'enable', NOW()
  FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'KEY_OBJECTIF_TAUX_MARGE');
