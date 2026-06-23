-- =====================================================================
-- Phase A : mode SEMOIS_PAR_PRODUIT + flags de gestion sur t_famille
--
-- Colonnes additives (defauts neutres -> comportement actuel inchange) :
--   bool_CALCUL_SEUIL : 1 = ce produit est pris dans le calcul seuil/qte reappro
--                       (selon le mode actif), 0 = saute sans toucher l'existant.
--   bool_SUGGERABLE   : 1 = suggere si seuil atteint, 0 = jamais suggere.
--   bool_REMISE       : 1 = produit remisable (logique a venir).
--   int_Q1_SEUIL_REAPPRO / int_Q2_QTE_REAPPRO : Q1/Q2 par produit, utilises
--       uniquement si SEMOIS = 1 et SEMOIS_PAR_PRODUIT = 1 (avec le param Q3).
--       Initialises a la valeur des parametres globaux Q1/Q2.
-- =====================================================================

ALTER TABLE t_famille
    ADD COLUMN bool_CALCUL_SEUIL     TINYINT(1) NULL DEFAULT 1,
    ADD COLUMN bool_SUGGERABLE       TINYINT(1) NULL DEFAULT 1,
    ADD COLUMN bool_REMISE           TINYINT(1) NULL DEFAULT 1,
    ADD COLUMN int_Q1_SEUIL_REAPPRO  INT        NULL DEFAULT NULL,
    ADD COLUMN int_Q2_QTE_REAPPRO    INT        NULL DEFAULT NULL;

-- Defauts explicites pour les lignes existantes (au cas ou DEFAULT non applique)
UPDATE t_famille SET bool_CALCUL_SEUIL = 1 WHERE bool_CALCUL_SEUIL IS NULL;
UPDATE t_famille SET bool_SUGGERABLE   = 1 WHERE bool_SUGGERABLE   IS NULL;
UPDATE t_famille SET bool_REMISE       = 1 WHERE bool_REMISE       IS NULL;

-- Initialisation Q1/Q2 par produit = parametres globaux Q1/Q2 (defaut 4 / 2)
UPDATE t_famille
SET int_Q1_SEUIL_REAPPRO = COALESCE(
        (SELECT CAST(p.str_VALUE AS UNSIGNED) FROM t_parameters p WHERE p.str_KEY = 'Q1'), 4)
WHERE int_Q1_SEUIL_REAPPRO IS NULL;

UPDATE t_famille
SET int_Q2_QTE_REAPPRO = COALESCE(
        (SELECT CAST(p.str_VALUE AS UNSIGNED) FROM t_parameters p WHERE p.str_KEY = 'Q2'), 2)
WHERE int_Q2_QTE_REAPPRO IS NULL;

-- Nouveau parametre de mode (comme SEMOIS_ABC). 0 par defaut -> aucun changement.
INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'SEMOIS_PAR_PRODUIT', '0',
       'Mode SEMOIS par produit : utilise Q1/Q2 de la fiche article (si SEMOIS=1). Exclusif avec SEMOIS_ABC.',
       'SYSTEM', 'enable', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'SEMOIS_PAR_PRODUIT');
