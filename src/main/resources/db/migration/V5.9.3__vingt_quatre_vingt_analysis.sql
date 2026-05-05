
DROP PROCEDURE IF EXISTS analyse_20_80_par_quantite;
DROP PROCEDURE IF EXISTS analyse_20_80_par_ca;
DROP PROCEDURE IF EXISTS analyse_20_80_par_marge;

DROP VIEW IF EXISTS v_ventes_par_produit;



CREATE OR REPLACE VIEW v_ventes_par_produit AS
SELECT
    DATE(p.dt_UPDATED) AS sale_date,
    u.lg_EMPLACEMENT_ID,
    f.lg_FAMILLE_ID,
    f.int_CIP,
    f.str_NAME AS product_name,
    fa.lg_FAMILLEARTICLE_ID,
    fa.str_LIBELLE AS article_family,
    z.lg_ZONE_GEO_ID,
    z.str_LIBELLEE AS rayon,
    g.lg_GROSSISTE_ID,
    g.str_LIBELLE AS grossiste,
    SUM(pd.int_QUANTITY) AS total_quantity,
    SUM(pd.int_PRICE) AS total_price_ttc,
    SUM(pd.int_PRICE - pd.int_PRICE_REMISE - pd.montantTva) AS total_price_ht,
    SUM(pd.prixAchat * pd.int_QUANTITY) AS total_cost_price
FROM t_preenregistrement_detail pd
JOIN t_preenregistrement p 
    ON pd.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
JOIN t_famille f 
    ON pd.lg_FAMILLE_ID = f.lg_FAMILLE_ID
JOIN t_user u 
    ON p.lg_USER_ID = u.lg_USER_ID
LEFT JOIN t_famillearticle fa 
    ON f.lg_FAMILLEARTICLE_ID = fa.lg_FAMILLEARTICLE_ID
LEFT JOIN t_zone_geographique z 
    ON f.lg_ZONE_GEO_ID = z.lg_ZONE_GEO_ID
LEFT JOIN t_grossiste g 
    ON f.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID
WHERE
    p.str_STATUT = 'is_Closed'
    AND p.b_IS_CANCEL = 0
    AND p.int_PRICE > 0
    AND p.lg_TYPE_VENTE_ID <> '5'
AND f.str_STATUT='enable'
GROUP BY
    DATE(p.dt_UPDATED),
    u.lg_EMPLACEMENT_ID,
    f.lg_FAMILLE_ID,
    f.int_CIP,
    f.str_NAME,
    fa.lg_FAMILLEARTICLE_ID,
    fa.str_LIBELLE,
    z.lg_ZONE_GEO_ID,
    z.str_LIBELLEE,
    g.lg_GROSSISTE_ID,
    g.str_LIBELLE;

DELIMITER $$

CREATE PROCEDURE analyse_20_80_par_quantite(
    IN p_dt_start DATE,
    IN p_dt_end DATE,
    IN p_emplacement_id VARCHAR(100),
    IN p_code_famille VARCHAR(100),
    IN p_code_rayon VARCHAR(100),
    IN p_code_grossiste VARCHAR(100)
)
BEGIN
    WITH VentesFiltrees AS (
        SELECT
            v.lg_FAMILLE_ID,
            v.product_name,
            v.article_family,
            v.int_CIP,
            v.lg_GROSSISTE_ID,
            SUM(v.total_quantity) AS agg_total_quantity,
            SUM(v.total_price_ttc) AS agg_total_price_ttc,
            (SUM(v.total_price_ht) - SUM(v.total_cost_price)) AS agg_marge
        FROM v_ventes_par_produit v
        WHERE
            v.sale_date BETWEEN p_dt_start AND p_dt_end
            AND v.lg_EMPLACEMENT_ID = p_emplacement_id
            AND (p_code_famille IS NULL OR p_code_famille = '' OR v.lg_FAMILLEARTICLE_ID = p_code_famille)
            AND (p_code_rayon IS NULL OR p_code_rayon = '' OR v.lg_ZONE_GEO_ID = p_code_rayon)
            AND (p_code_grossiste IS NULL OR p_code_grossiste = '' OR v.lg_GROSSISTE_ID = p_code_grossiste)
        GROUP BY
            v.lg_FAMILLE_ID, v.product_name, v.article_family, v.int_CIP, v.lg_GROSSISTE_ID
    ),
    AnalyseCumulative AS (
        SELECT
            vf.*,
            SUM(vf.agg_total_quantity) OVER () AS grand_total_quantity,
            SUM(vf.agg_total_quantity) OVER (
                ORDER BY vf.agg_total_quantity DESC
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS cumulative_quantity
        FROM VentesFiltrees vf
    )
    SELECT
        ac.int_CIP,
        ac.product_name,
        ac.agg_total_price_ttc AS total_price_ttc,
        ac.agg_total_quantity AS total_quantity,
        ac.lg_FAMILLE_ID,
        ac.lg_GROSSISTE_ID,
        ac.article_family,
        ac.agg_marge AS marge,
        (
            SELECT fs.int_NUMBER_AVAILABLE
            FROM t_famille_stock fs
            WHERE fs.lg_FAMILLE_ID = ac.lg_FAMILLE_ID
              AND fs.lg_EMPLACEMENT_ID = p_emplacement_id
              AND fs.str_STATUT = 'enable'
            LIMIT 1
        ) AS stock_disponible

 FROM AnalyseCumulative ac
    WHERE ac.cumulative_quantity <= (ac.grand_total_quantity * 0.8)
    ORDER BY ac.agg_total_quantity DESC;
END$$


CREATE PROCEDURE analyse_20_80_par_ca(
    IN p_dt_start DATE,
    IN p_dt_end DATE,
    IN p_emplacement_id VARCHAR(100),
    IN p_code_famille VARCHAR(100),
    IN p_code_rayon VARCHAR(100),
    IN p_code_grossiste VARCHAR(100)
)
BEGIN
    WITH VentesFiltrees AS (
        SELECT
            v.lg_FAMILLE_ID,
            v.product_name,
            v.article_family,
            v.int_CIP,
            v.lg_GROSSISTE_ID,
            SUM(v.total_quantity) AS agg_total_quantity,
            SUM(v.total_price_ttc) AS agg_total_price_ttc,
            (SUM(v.total_price_ht) - SUM(v.total_cost_price)) AS agg_marge
        FROM v_ventes_par_produit v
        WHERE
            v.sale_date BETWEEN p_dt_start AND p_dt_end
            AND v.lg_EMPLACEMENT_ID = p_emplacement_id
            AND (p_code_famille IS NULL OR p_code_famille = '' OR v.lg_FAMILLEARTICLE_ID = p_code_famille)
            AND (p_code_rayon IS NULL OR p_code_rayon = '' OR v.lg_ZONE_GEO_ID = p_code_rayon)
            AND (p_code_grossiste IS NULL OR p_code_grossiste = '' OR v.lg_GROSSISTE_ID = p_code_grossiste)
        GROUP BY
            v.lg_FAMILLE_ID, v.product_name, v.article_family, v.int_CIP, v.lg_GROSSISTE_ID
    ),
    AnalyseCumulative AS (
        SELECT
            vf.*,
            SUM(vf.agg_total_price_ttc) OVER () AS grand_total_price,
            SUM(vf.agg_total_price_ttc) OVER (
                ORDER BY vf.agg_total_price_ttc DESC
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS cumulative_price
        FROM VentesFiltrees vf
    )
    SELECT
        ac.int_CIP,
        ac.product_name,
        ac.agg_total_price_ttc AS total_price_ttc,
        ac.agg_total_quantity AS total_quantity,
        ac.lg_FAMILLE_ID,
        ac.lg_GROSSISTE_ID,
        ac.article_family,
        ac.agg_marge AS marge,
        (
            SELECT fs.int_NUMBER_AVAILABLE
            FROM t_famille_stock fs
            WHERE fs.lg_FAMILLE_ID = ac.lg_FAMILLE_ID
              AND fs.lg_EMPLACEMENT_ID = p_emplacement_id
              AND fs.str_STATUT = 'enable'
            LIMIT 1
        ) AS stock_disponible

FROM AnalyseCumulative ac
    WHERE ac.cumulative_price <= (ac.grand_total_price * 0.8)
    ORDER BY ac.agg_total_price_ttc DESC;
END$$

DELIMITER ;

DELIMITER $$

CREATE PROCEDURE analyse_20_80_par_marge(
    IN p_dt_start DATE,
    IN p_dt_end DATE,
    IN p_emplacement_id VARCHAR(100),
    IN p_code_famille VARCHAR(100),
    IN p_code_rayon VARCHAR(100),
    IN p_code_grossiste VARCHAR(100)
)
BEGIN
    WITH VentesFiltrees AS (
        SELECT
            v.lg_FAMILLE_ID,
            v.product_name,
            v.article_family,
            v.int_CIP,
            v.lg_GROSSISTE_ID,
            SUM(v.total_quantity) AS agg_total_quantity,
            SUM(v.total_price_ttc) AS agg_total_price_ttc,
            (SUM(v.total_price_ht) - SUM(v.total_cost_price)) AS agg_marge
        FROM v_ventes_par_produit v
        WHERE
            v.sale_date BETWEEN p_dt_start AND p_dt_end
            AND v.lg_EMPLACEMENT_ID = p_emplacement_id
            AND (p_code_famille IS NULL OR p_code_famille = '' OR v.lg_FAMILLEARTICLE_ID = p_code_famille)
            AND (p_code_rayon IS NULL OR p_code_rayon = '' OR v.lg_ZONE_GEO_ID = p_code_rayon)
            AND (p_code_grossiste IS NULL OR p_code_grossiste = '' OR v.lg_GROSSISTE_ID = p_code_grossiste)
        GROUP BY
            v.lg_FAMILLE_ID,
            v.product_name,
            v.article_family,
            v.int_CIP,
            v.lg_GROSSISTE_ID
    ),
    AnalyseCumulative AS (
        SELECT
            vf.*,
            SUM(vf.agg_marge) OVER () AS grand_total_marge,
            SUM(vf.agg_marge) OVER (
                ORDER BY vf.agg_marge DESC
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS cumulative_marge
        FROM VentesFiltrees vf
    )
    SELECT
        ac.int_CIP,
        ac.product_name,
        ac.agg_total_price_ttc AS total_price_ttc,
        ac.agg_total_quantity AS total_quantity,
        ac.lg_FAMILLE_ID,
        ac.lg_GROSSISTE_ID,
        ac.article_family,
        ac.agg_marge AS marge,
        (
            SELECT fs.int_NUMBER_AVAILABLE
            FROM t_famille_stock fs
            WHERE fs.lg_FAMILLE_ID = ac.lg_FAMILLE_ID
              AND fs.lg_EMPLACEMENT_ID = p_emplacement_id
              AND fs.str_STATUT = 'enable'
            LIMIT 1
        ) AS stock_disponible

    FROM AnalyseCumulative ac
    WHERE ac.cumulative_marge <= (ac.grand_total_marge * 0.8)
    ORDER BY ac.agg_marge DESC;
END$$

DELIMITER ;
