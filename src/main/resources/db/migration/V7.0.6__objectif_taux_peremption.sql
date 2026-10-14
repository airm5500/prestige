-- =====================================================================
-- Retours du 13/10 (point 4) : objectif du taux de peremption (valeur perimee / chiffre d'affaires), en %.
-- Sous l'objectif : vert ; au-dessus : rouge. Reglable depuis l'onglet « Analyse » des perimes. Rejouable.
-- =====================================================================
INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'KEY_OBJECTIF_TAUX_PEREMPTION', '0.5',
       'Objectif du taux de péremption (valeur périmée / chiffre d''affaires), en % : à ne pas dépasser', 'NUMBER', 'enable', NOW()
  FROM DUAL
 WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'KEY_OBJECTIF_TAUX_PEREMPTION');
