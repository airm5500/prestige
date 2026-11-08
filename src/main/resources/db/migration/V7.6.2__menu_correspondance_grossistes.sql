-- =====================================================================
-- Correspondance produits grossistes / Prestige, lot 3 (étude du 08/11/2026) : menu
-- « Correspondance grossistes » dans GESTION DES COMMANDES, file de validation des correspondances.
-- Le menu porte le privilège P_CORRESPONDANCE_GROSSISTES (V7.6.0), déjà donné aux profils pharmacien et
-- administrateur et au rôle du compte administrateur : seuls ceux qui décident voient le menu.
-- Rejouable : rien n'est modifié dans les lignes existantes.
-- =====================================================================

-- Libellé court (règle : 25 caractères au plus), aide au survol dans str_VALUE.
INSERT INTO t_sous_menu (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`,
                         `str_COMPOSANT`, `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`,
                         `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT LEFT(UUID(), 40),
       'Codes des grossistes et produits Prestige : propositions à valider, contradictions des BL',
       NULL, 'Correspondance grossistes', 'correspondancesgrossistes', '6', 4, NULL, 'enable',
       'P_CORRESPONDANCE_GROSSISTES', NOW(), NOW(), ''
  FROM DUAL
 WHERE EXISTS (SELECT 1 FROM t_menu m WHERE m.lg_MENU_ID = '6')
   AND NOT EXISTS (SELECT 1 FROM t_sous_menu s WHERE s.str_COMPOSANT = 'correspondancesgrossistes');
