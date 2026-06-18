-- =====================================================================
-- Lot 0 - Socle de la classification ABC et du SEMOIS par classe
-- ---------------------------------------------------------------------
-- Changement PUREMENT ADDITIF :
--   - nouvelle table t_classe_abc (classes A/B/C parametrables)
--   - 3 nouvelles colonnes NULLABLE sur t_famille
--   - parametre d'activation SEMOIS_ABC (desactive par defaut)
-- Aucun objet existant n'est modifie ou supprime.
-- Tant que SEMOIS_ABC = 0, le comportement SEMOIS/20-80/fiche article
-- reste strictement identique a l'existant.
-- =====================================================================

-- 1) Table des classes ABC -------------------------------------------
CREATE TABLE IF NOT EXISTS t_classe_abc (
    lg_CLASSE_ABC_ID    VARCHAR(40)  NOT NULL,
    str_CODE            VARCHAR(1)   NOT NULL,
    str_LIBELLE         VARCHAR(100) NOT NULL,
    int_Q1              INT          NOT NULL,
    int_Q2              INT          NOT NULL,
    str_UNITE_CALCUL    VARCHAR(20)  NOT NULL DEFAULT 'SEMAINE',
    int_Q3              INT          NOT NULL,
    dbl_SEUIL_CUMUL_MIN DECIMAL(5,2) NOT NULL,
    dbl_SEUIL_CUMUL_MAX DECIMAL(5,2) NOT NULL,
    str_STATUT          VARCHAR(20)  NOT NULL DEFAULT 'enable',
    dt_CREATED          DATETIME     NOT NULL,
    dt_UPDATED          DATETIME     NULL,
    PRIMARY KEY (lg_CLASSE_ABC_ID),
    UNIQUE KEY uk_classe_abc_code (str_CODE)
);

-- 2) Donnees initiales A / B / C (unite SEMAINE pour rester iso-SEMOIS)
INSERT INTO t_classe_abc
 (lg_CLASSE_ABC_ID, str_CODE, str_LIBELLE, int_Q1, int_Q2, str_UNITE_CALCUL, int_Q3,
  dbl_SEUIL_CUMUL_MIN, dbl_SEUIL_CUMUL_MAX, str_STATUT, dt_CREATED)
VALUES
 ('ABC_CLASSE_A', 'A', 'Classe A', 2, 1, 'SEMAINE', 3,  0.00,  80.00, 'enable', NOW()),
 ('ABC_CLASSE_B', 'B', 'Classe B', 3, 2, 'SEMAINE', 3, 80.00,  95.00, 'enable', NOW()),
 ('ABC_CLASSE_C', 'C', 'Classe C', 4, 2, 'SEMAINE', 3, 95.00, 100.00, 'enable', NOW());

-- 3) Colonnes ajoutees sur la fiche article (t_famille) --------------
--    Toutes NULLABLE : les creations/imports/modifications produit
--    existants continuent de fonctionner sans fournir ces champs.
ALTER TABLE t_famille
    ADD COLUMN lg_CLASSE_ABC_ID      VARCHAR(40) NULL DEFAULT NULL,
    ADD COLUMN str_CODE_GEO_ARTICLE  VARCHAR(50) NULL DEFAULT NULL,
    ADD COLUMN dt_UPDATED_CLASSE_ABC DATETIME    NULL DEFAULT NULL;

-- 4) Parametre d'activation du SEMOIS ABC (0 = desactive) ------------
--    Idempotent : ne reinsere pas si la cle existe deja.
INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'SEMOIS_ABC', '0',
       'Active le calcul SEMOIS par classe ABC (0 = SEMOIS standard, 1 = SEMOIS ABC)',
       'SYSTEM', 'enable', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'SEMOIS_ABC');
