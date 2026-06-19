-- =====================================================================
-- Lot 1 (ajustement) - Tri deterministe des procedures ABC
-- ---------------------------------------------------------------------
-- Objectif : rendre la classification reproductible quand plusieurs produits
-- ont la meme valeur sur le critere d'analyse.
--
-- Tri applique A LA FOIS dans la fenetre de cumul et dans l'ordre d'affichage
-- (les deux doivent coincider pour que le cumul soit coherent a l'ecran) :
--   par_ca        : CA DESC,        puis quantite DESC, puis lg_FAMILLE_ID ASC
--   par_quantite  : quantite DESC,  puis CA DESC,        puis lg_FAMILLE_ID ASC
--   par_marge     : marge DESC,     puis quantite DESC,  puis lg_FAMILLE_ID ASC
--
-- La quantite est le departage "parlant" (a CA egal, le plus vendu d'abord).
-- lg_FAMILLE_ID n'est qu'une cle technique finale garantissant le determinisme
-- quand CA ET quantite sont identiques.
--
-- Seules les clauses ORDER BY changent par rapport a V6.1.8.
-- =====================================================================

DROP PROCEDURE IF EXISTS analyse_abc_par_quantite;
DROP PROCEDURE IF EXISTS analyse_abc_par_ca;
DROP PROCEDURE IF EXISTS analyse_abc_par_marge;

DELIMITER $$

-- ------------------------- PAR CHIFFRE D'AFFAIRES ---------------------
CREATE PROCEDURE analyse_abc_par_ca(
    IN p_dt_start DATE, IN p_dt_end DATE, IN p_emplacement_id VARCHAR(100),
    IN p_code_famille VARCHAR(100), IN p_code_rayon VARCHAR(100), IN p_code_grossiste VARCHAR(100)
)
BEGIN
    DECLARE v_max_a DECIMAL(5,2) DEFAULT 80.00;
    DECLARE v_max_b DECIMAL(5,2) DEFAULT 95.00;
    SET v_max_a = COALESCE((SELECT dbl_SEUIL_CUMUL_MAX FROM t_classe_abc WHERE str_CODE = 'A' AND str_STATUT = 'enable' LIMIT 1), 80.00);
    SET v_max_b = COALESCE((SELECT dbl_SEUIL_CUMUL_MAX FROM t_classe_abc WHERE str_CODE = 'B' AND str_STATUT = 'enable' LIMIT 1), 95.00);

    WITH base AS (
        SELECT
            CASE WHEN f.bool_DECONDITIONNE = 1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID <> ''
                 THEN f.lg_FAMILLE_PARENT_ID ELSE f.lg_FAMILLE_ID END AS eff_id,
            CASE WHEN f.bool_DECONDITIONNE = 1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID <> ''
                 THEN 1 ELSE 0 END AS is_detail,
            pd.int_QUANTITY AS qty, pd.int_PRICE AS price,
            ((pd.int_PRICE - pd.int_PRICE_REMISE - pd.montantTva) - (pd.prixAchat * pd.int_QUANTITY)) AS marge_line
        FROM t_preenregistrement p
        JOIN t_user u ON p.lg_USER_ID = u.lg_USER_ID
        JOIN t_preenregistrement_detail pd ON pd.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
        JOIN t_famille f ON pd.lg_FAMILLE_ID = f.lg_FAMILLE_ID
        WHERE p.dt_UPDATED >= p_dt_start AND p.dt_UPDATED < DATE_ADD(p_dt_end, INTERVAL 1 DAY)
          AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0
          AND p.lg_TYPE_VENTE_ID <> '5' AND u.lg_EMPLACEMENT_ID = p_emplacement_id
    ),
    VentesFiltrees AS (
        SELECT ef.lg_FAMILLE_ID, ef.str_NAME AS product_name, ef.int_CIP, ef.int_EAN13,
            fa.str_LIBELLE AS article_family, zg.str_LIBELLEE AS rayon, ef.str_CODE_GEO_ARTICLE AS code_geo,
            ef.lg_GROSSISTE_ID, ef.int_SEUIL_MIN AS seuil_mini, ef.int_QTE_REAPPROVISIONNEMENT AS qte_reappro,
            (SUM(CASE WHEN b.is_detail = 0 THEN b.qty ELSE 0 END)
             + CEIL(SUM(CASE WHEN b.is_detail = 1 THEN b.qty ELSE 0 END) / COALESCE(NULLIF(ef.int_NUMBERDETAIL, 0), 1))) AS agg_total_quantity,
            SUM(b.price) AS agg_total_price_ttc, SUM(b.marge_line) AS agg_marge
        FROM base b
        JOIN t_famille ef ON ef.lg_FAMILLE_ID = b.eff_id
        LEFT JOIN t_famillearticle fa ON ef.lg_FAMILLEARTICLE_ID = fa.lg_FAMILLEARTICLE_ID
        LEFT JOIN t_zone_geographique zg ON ef.lg_ZONE_GEO_ID = zg.lg_ZONE_GEO_ID
        WHERE ef.str_STATUT = 'enable'
          AND (p_code_famille   IS NULL OR p_code_famille   = '' OR ef.lg_FAMILLEARTICLE_ID = p_code_famille)
          AND (p_code_rayon     IS NULL OR p_code_rayon     = '' OR ef.lg_ZONE_GEO_ID       = p_code_rayon)
          AND (p_code_grossiste IS NULL OR p_code_grossiste = '' OR ef.lg_GROSSISTE_ID      = p_code_grossiste)
        GROUP BY ef.lg_FAMILLE_ID, ef.str_NAME, ef.int_CIP, ef.int_EAN13, fa.str_LIBELLE, zg.str_LIBELLEE,
                 ef.str_CODE_GEO_ARTICLE, ef.lg_GROSSISTE_ID, ef.int_SEUIL_MIN, ef.int_QTE_REAPPROVISIONNEMENT, ef.int_NUMBERDETAIL
    ),
    AnalyseCumulative AS (
        SELECT vf.*, SUM(vf.agg_total_price_ttc) OVER () AS grand_total,
            SUM(vf.agg_total_price_ttc) OVER (
                ORDER BY vf.agg_total_price_ttc DESC, vf.agg_total_quantity DESC, vf.lg_FAMILLE_ID ASC
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS cumulative
        FROM VentesFiltrees vf
    ),
    Classified AS (
        SELECT ac.*,
            CASE WHEN (ac.cumulative - ac.agg_total_price_ttc) < (ac.grand_total * v_max_a / 100) THEN 'A'
                 WHEN (ac.cumulative - ac.agg_total_price_ttc) < (ac.grand_total * v_max_b / 100) THEN 'B'
                 ELSE 'C' END AS classe_abc
        FROM AnalyseCumulative ac
    )
    SELECT c.int_CIP, c.int_EAN13 AS ean, c.product_name, c.classe_abc, c.article_family, c.rayon, c.code_geo,
        (SELECT fs.int_NUMBER_AVAILABLE FROM t_famille_stock fs WHERE fs.lg_FAMILLE_ID = c.lg_FAMILLE_ID
           AND fs.lg_EMPLACEMENT_ID = p_emplacement_id AND fs.str_STATUT = 'enable' LIMIT 1) AS stock_disponible,
        c.seuil_mini, c.qte_reappro, c.agg_total_quantity AS total_quantity, c.agg_total_price_ttc AS total_price_ttc,
        c.agg_marge AS marge,
        ROUND(c.agg_total_price_ttc / NULLIF(c.grand_total, 0) * 100, 2) AS part_pourcentage,
        ROUND(c.cumulative / NULLIF(c.grand_total, 0) * 100, 2) AS cumul_pourcentage,
        c.lg_FAMILLE_ID, c.lg_GROSSISTE_ID, ca.int_Q1 AS q1, ca.int_Q2 AS q2, ca.int_Q3 AS q3, ca.str_UNITE_CALCUL AS unite
    FROM Classified c
    LEFT JOIN t_classe_abc ca ON ca.str_CODE = c.classe_abc
    ORDER BY c.agg_total_price_ttc DESC, c.agg_total_quantity DESC, c.lg_FAMILLE_ID ASC;
END$$

-- ----------------------------- PAR QUANTITE --------------------------
CREATE PROCEDURE analyse_abc_par_quantite(
    IN p_dt_start DATE, IN p_dt_end DATE, IN p_emplacement_id VARCHAR(100),
    IN p_code_famille VARCHAR(100), IN p_code_rayon VARCHAR(100), IN p_code_grossiste VARCHAR(100)
)
BEGIN
    DECLARE v_max_a DECIMAL(5,2) DEFAULT 80.00;
    DECLARE v_max_b DECIMAL(5,2) DEFAULT 95.00;
    SET v_max_a = COALESCE((SELECT dbl_SEUIL_CUMUL_MAX FROM t_classe_abc WHERE str_CODE = 'A' AND str_STATUT = 'enable' LIMIT 1), 80.00);
    SET v_max_b = COALESCE((SELECT dbl_SEUIL_CUMUL_MAX FROM t_classe_abc WHERE str_CODE = 'B' AND str_STATUT = 'enable' LIMIT 1), 95.00);

    WITH base AS (
        SELECT
            CASE WHEN f.bool_DECONDITIONNE = 1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID <> ''
                 THEN f.lg_FAMILLE_PARENT_ID ELSE f.lg_FAMILLE_ID END AS eff_id,
            CASE WHEN f.bool_DECONDITIONNE = 1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID <> ''
                 THEN 1 ELSE 0 END AS is_detail,
            pd.int_QUANTITY AS qty, pd.int_PRICE AS price,
            ((pd.int_PRICE - pd.int_PRICE_REMISE - pd.montantTva) - (pd.prixAchat * pd.int_QUANTITY)) AS marge_line
        FROM t_preenregistrement p
        JOIN t_user u ON p.lg_USER_ID = u.lg_USER_ID
        JOIN t_preenregistrement_detail pd ON pd.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
        JOIN t_famille f ON pd.lg_FAMILLE_ID = f.lg_FAMILLE_ID
        WHERE p.dt_UPDATED >= p_dt_start AND p.dt_UPDATED < DATE_ADD(p_dt_end, INTERVAL 1 DAY)
          AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0
          AND p.lg_TYPE_VENTE_ID <> '5' AND u.lg_EMPLACEMENT_ID = p_emplacement_id
    ),
    VentesFiltrees AS (
        SELECT ef.lg_FAMILLE_ID, ef.str_NAME AS product_name, ef.int_CIP, ef.int_EAN13,
            fa.str_LIBELLE AS article_family, zg.str_LIBELLEE AS rayon, ef.str_CODE_GEO_ARTICLE AS code_geo,
            ef.lg_GROSSISTE_ID, ef.int_SEUIL_MIN AS seuil_mini, ef.int_QTE_REAPPROVISIONNEMENT AS qte_reappro,
            (SUM(CASE WHEN b.is_detail = 0 THEN b.qty ELSE 0 END)
             + CEIL(SUM(CASE WHEN b.is_detail = 1 THEN b.qty ELSE 0 END) / COALESCE(NULLIF(ef.int_NUMBERDETAIL, 0), 1))) AS agg_total_quantity,
            SUM(b.price) AS agg_total_price_ttc, SUM(b.marge_line) AS agg_marge
        FROM base b
        JOIN t_famille ef ON ef.lg_FAMILLE_ID = b.eff_id
        LEFT JOIN t_famillearticle fa ON ef.lg_FAMILLEARTICLE_ID = fa.lg_FAMILLEARTICLE_ID
        LEFT JOIN t_zone_geographique zg ON ef.lg_ZONE_GEO_ID = zg.lg_ZONE_GEO_ID
        WHERE ef.str_STATUT = 'enable'
          AND (p_code_famille   IS NULL OR p_code_famille   = '' OR ef.lg_FAMILLEARTICLE_ID = p_code_famille)
          AND (p_code_rayon     IS NULL OR p_code_rayon     = '' OR ef.lg_ZONE_GEO_ID       = p_code_rayon)
          AND (p_code_grossiste IS NULL OR p_code_grossiste = '' OR ef.lg_GROSSISTE_ID      = p_code_grossiste)
        GROUP BY ef.lg_FAMILLE_ID, ef.str_NAME, ef.int_CIP, ef.int_EAN13, fa.str_LIBELLE, zg.str_LIBELLEE,
                 ef.str_CODE_GEO_ARTICLE, ef.lg_GROSSISTE_ID, ef.int_SEUIL_MIN, ef.int_QTE_REAPPROVISIONNEMENT, ef.int_NUMBERDETAIL
    ),
    AnalyseCumulative AS (
        SELECT vf.*, SUM(vf.agg_total_quantity) OVER () AS grand_total,
            SUM(vf.agg_total_quantity) OVER (
                ORDER BY vf.agg_total_quantity DESC, vf.agg_total_price_ttc DESC, vf.lg_FAMILLE_ID ASC
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS cumulative
        FROM VentesFiltrees vf
    ),
    Classified AS (
        SELECT ac.*,
            CASE WHEN (ac.cumulative - ac.agg_total_quantity) < (ac.grand_total * v_max_a / 100) THEN 'A'
                 WHEN (ac.cumulative - ac.agg_total_quantity) < (ac.grand_total * v_max_b / 100) THEN 'B'
                 ELSE 'C' END AS classe_abc
        FROM AnalyseCumulative ac
    )
    SELECT c.int_CIP, c.int_EAN13 AS ean, c.product_name, c.classe_abc, c.article_family, c.rayon, c.code_geo,
        (SELECT fs.int_NUMBER_AVAILABLE FROM t_famille_stock fs WHERE fs.lg_FAMILLE_ID = c.lg_FAMILLE_ID
           AND fs.lg_EMPLACEMENT_ID = p_emplacement_id AND fs.str_STATUT = 'enable' LIMIT 1) AS stock_disponible,
        c.seuil_mini, c.qte_reappro, c.agg_total_quantity AS total_quantity, c.agg_total_price_ttc AS total_price_ttc,
        c.agg_marge AS marge,
        ROUND(c.agg_total_quantity / NULLIF(c.grand_total, 0) * 100, 2) AS part_pourcentage,
        ROUND(c.cumulative / NULLIF(c.grand_total, 0) * 100, 2) AS cumul_pourcentage,
        c.lg_FAMILLE_ID, c.lg_GROSSISTE_ID, ca.int_Q1 AS q1, ca.int_Q2 AS q2, ca.int_Q3 AS q3, ca.str_UNITE_CALCUL AS unite
    FROM Classified c
    LEFT JOIN t_classe_abc ca ON ca.str_CODE = c.classe_abc
    ORDER BY c.agg_total_quantity DESC, c.agg_total_price_ttc DESC, c.lg_FAMILLE_ID ASC;
END$$

-- ------------------------------- PAR MARGE ---------------------------
CREATE PROCEDURE analyse_abc_par_marge(
    IN p_dt_start DATE, IN p_dt_end DATE, IN p_emplacement_id VARCHAR(100),
    IN p_code_famille VARCHAR(100), IN p_code_rayon VARCHAR(100), IN p_code_grossiste VARCHAR(100)
)
BEGIN
    DECLARE v_max_a DECIMAL(5,2) DEFAULT 80.00;
    DECLARE v_max_b DECIMAL(5,2) DEFAULT 95.00;
    SET v_max_a = COALESCE((SELECT dbl_SEUIL_CUMUL_MAX FROM t_classe_abc WHERE str_CODE = 'A' AND str_STATUT = 'enable' LIMIT 1), 80.00);
    SET v_max_b = COALESCE((SELECT dbl_SEUIL_CUMUL_MAX FROM t_classe_abc WHERE str_CODE = 'B' AND str_STATUT = 'enable' LIMIT 1), 95.00);

    WITH base AS (
        SELECT
            CASE WHEN f.bool_DECONDITIONNE = 1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID <> ''
                 THEN f.lg_FAMILLE_PARENT_ID ELSE f.lg_FAMILLE_ID END AS eff_id,
            CASE WHEN f.bool_DECONDITIONNE = 1 AND f.lg_FAMILLE_PARENT_ID IS NOT NULL AND f.lg_FAMILLE_PARENT_ID <> ''
                 THEN 1 ELSE 0 END AS is_detail,
            pd.int_QUANTITY AS qty, pd.int_PRICE AS price,
            ((pd.int_PRICE - pd.int_PRICE_REMISE - pd.montantTva) - (pd.prixAchat * pd.int_QUANTITY)) AS marge_line
        FROM t_preenregistrement p
        JOIN t_user u ON p.lg_USER_ID = u.lg_USER_ID
        JOIN t_preenregistrement_detail pd ON pd.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
        JOIN t_famille f ON pd.lg_FAMILLE_ID = f.lg_FAMILLE_ID
        WHERE p.dt_UPDATED >= p_dt_start AND p.dt_UPDATED < DATE_ADD(p_dt_end, INTERVAL 1 DAY)
          AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0
          AND p.lg_TYPE_VENTE_ID <> '5' AND u.lg_EMPLACEMENT_ID = p_emplacement_id
    ),
    VentesFiltrees AS (
        SELECT ef.lg_FAMILLE_ID, ef.str_NAME AS product_name, ef.int_CIP, ef.int_EAN13,
            fa.str_LIBELLE AS article_family, zg.str_LIBELLEE AS rayon, ef.str_CODE_GEO_ARTICLE AS code_geo,
            ef.lg_GROSSISTE_ID, ef.int_SEUIL_MIN AS seuil_mini, ef.int_QTE_REAPPROVISIONNEMENT AS qte_reappro,
            (SUM(CASE WHEN b.is_detail = 0 THEN b.qty ELSE 0 END)
             + CEIL(SUM(CASE WHEN b.is_detail = 1 THEN b.qty ELSE 0 END) / COALESCE(NULLIF(ef.int_NUMBERDETAIL, 0), 1))) AS agg_total_quantity,
            SUM(b.price) AS agg_total_price_ttc, SUM(b.marge_line) AS agg_marge
        FROM base b
        JOIN t_famille ef ON ef.lg_FAMILLE_ID = b.eff_id
        LEFT JOIN t_famillearticle fa ON ef.lg_FAMILLEARTICLE_ID = fa.lg_FAMILLEARTICLE_ID
        LEFT JOIN t_zone_geographique zg ON ef.lg_ZONE_GEO_ID = zg.lg_ZONE_GEO_ID
        WHERE ef.str_STATUT = 'enable'
          AND (p_code_famille   IS NULL OR p_code_famille   = '' OR ef.lg_FAMILLEARTICLE_ID = p_code_famille)
          AND (p_code_rayon     IS NULL OR p_code_rayon     = '' OR ef.lg_ZONE_GEO_ID       = p_code_rayon)
          AND (p_code_grossiste IS NULL OR p_code_grossiste = '' OR ef.lg_GROSSISTE_ID      = p_code_grossiste)
        GROUP BY ef.lg_FAMILLE_ID, ef.str_NAME, ef.int_CIP, ef.int_EAN13, fa.str_LIBELLE, zg.str_LIBELLEE,
                 ef.str_CODE_GEO_ARTICLE, ef.lg_GROSSISTE_ID, ef.int_SEUIL_MIN, ef.int_QTE_REAPPROVISIONNEMENT, ef.int_NUMBERDETAIL
    ),
    AnalyseCumulative AS (
        SELECT vf.*, SUM(vf.agg_marge) OVER () AS grand_total,
            SUM(vf.agg_marge) OVER (
                ORDER BY vf.agg_marge DESC, vf.agg_total_quantity DESC, vf.lg_FAMILLE_ID ASC
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS cumulative
        FROM VentesFiltrees vf
    ),
    Classified AS (
        SELECT ac.*,
            CASE WHEN (ac.cumulative - ac.agg_marge) < (ac.grand_total * v_max_a / 100) THEN 'A'
                 WHEN (ac.cumulative - ac.agg_marge) < (ac.grand_total * v_max_b / 100) THEN 'B'
                 ELSE 'C' END AS classe_abc
        FROM AnalyseCumulative ac
    )
    SELECT c.int_CIP, c.int_EAN13 AS ean, c.product_name, c.classe_abc, c.article_family, c.rayon, c.code_geo,
        (SELECT fs.int_NUMBER_AVAILABLE FROM t_famille_stock fs WHERE fs.lg_FAMILLE_ID = c.lg_FAMILLE_ID
           AND fs.lg_EMPLACEMENT_ID = p_emplacement_id AND fs.str_STATUT = 'enable' LIMIT 1) AS stock_disponible,
        c.seuil_mini, c.qte_reappro, c.agg_total_quantity AS total_quantity, c.agg_total_price_ttc AS total_price_ttc,
        c.agg_marge AS marge,
        ROUND(c.agg_marge / NULLIF(c.grand_total, 0) * 100, 2) AS part_pourcentage,
        ROUND(c.cumulative / NULLIF(c.grand_total, 0) * 100, 2) AS cumul_pourcentage,
        c.lg_FAMILLE_ID, c.lg_GROSSISTE_ID, ca.int_Q1 AS q1, ca.int_Q2 AS q2, ca.int_Q3 AS q3, ca.str_UNITE_CALCUL AS unite
    FROM Classified c
    LEFT JOIN t_classe_abc ca ON ca.str_CODE = c.classe_abc
    ORDER BY c.agg_marge DESC, c.agg_total_quantity DESC, c.lg_FAMILLE_ID ASC;
END$$

DELIMITER ;
