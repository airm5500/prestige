-- =====================================================================
-- Reconciliation one-shot du stock des lots deja perimes.
-- ---------------------------------------------------------------------
-- Historiquement, les ventes ne decrementaient jamais les lots deja
-- perimes (le prelevement excluait dt_PEREMPTION <= maintenant). Leur
-- current_stock fantome les laissait visibles dans la visualisation des
-- perimes alors que toutes les unites avaient ete vendues.
--
-- Quand le stock disponible du produit est entierement couvert par les
-- lots NON perimes, le reliquat des lots perimes est forcement fantome :
-- on le remet a zero pour que ces lots disparaissent de la vue.
-- (Le code de vente decremente desormais aussi les lots perimes en repli,
-- ce qui evite la reapparition du probleme.)
-- =====================================================================
UPDATE t_lot l
JOIN (
    SELECT l2.lg_FAMILLE_ID AS fid,
           COALESCE(SUM(CASE WHEN DATE(l2.dt_PEREMPTION) >= CURDATE() THEN l2.current_stock ELSE 0 END), 0) AS stock_lots_valides
    FROM t_lot l2
    WHERE l2.dt_PEREMPTION IS NOT NULL
    GROUP BY l2.lg_FAMILLE_ID
) agg ON agg.fid = l.lg_FAMILLE_ID
LEFT JOIN (
    SELECT fs.lg_FAMILLE_ID AS fid, SUM(fs.int_NUMBER_AVAILABLE) AS stock_disponible
    FROM t_famille_stock fs
    WHERE fs.str_STATUT = 'enable'
    GROUP BY fs.lg_FAMILLE_ID
) st ON st.fid = l.lg_FAMILLE_ID
SET l.current_stock = 0, l.dt_UPDATED = NOW()
WHERE DATE(l.dt_PEREMPTION) < CURDATE()
  AND l.current_stock > 0
  AND COALESCE(st.stock_disponible, 0) <= agg.stock_lots_valides;
