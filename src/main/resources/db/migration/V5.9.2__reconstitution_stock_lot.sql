
ALTER TABLE `t_lot` ADD COLUMN IF NOT EXISTS  `current_stock` INT(6) NULL DEFAULT NULL;

 ALTER TABLE t_lot ADD  INDEX IF NOT EXISTS `dt_PEREMPTION` (`dt_PEREMPTION`) USING BTREE;
 
DROP PROCEDURE IF EXISTS recompute_available_stock_all_products;

DELIMITER $$

CREATE PROCEDURE recompute_available_stock_all_products()
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE v_product_id VARCHAR(60);
    DECLARE v_stock_actuel INT;
    DECLARE v_total_qty INT;
    DECLARE v_consumed INT;

    -- curseur sur les produits
    DECLARE cur_products CURSOR FOR
    
        
        SELECT f.lg_FAMILLE_ID,SUM(s.int_NUMBER_AVAILABLE+COALESCE (s.int_UG,0)) AS currentStock FROM  t_famille_stock s  JOIN t_famille f ON f.lg_FAMILLE_ID=s.lg_FAMILLE_ID WHERE s.str_STATUT='enable' AND f.str_STATUT='enable' AND s.lg_EMPLACEMENT_ID='1'
 GROUP BY f.lg_FAMILLE_ID HAVING SUM(s.int_NUMBER_AVAILABLE+COALESCE (s.int_UG,0)) ;
        
        

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    OPEN cur_products;

    product_loop: LOOP
        FETCH cur_products INTO v_product_id, v_stock_actuel;
        IF done = 1 THEN
            LEAVE product_loop;
        END IF;

        -- total des quantités des lots du produit
      
        SELECT IFNULL(SUM(l.int_NUMBER), 0)  INTO v_total_qty FROM t_lot l WHERE l.lg_FAMILLE_ID= v_product_id ;
        
        -- quantité consommée
        SET v_consumed = GREATEST(v_total_qty - v_stock_actuel, 0);

        -- reconstitution FIFO des availableStock
      SET @cum := 0;

        UPDATE t_lot l
        JOIN (
            SELECT
                lg_LOT_ID,
                int_NUMBER AS quantity,
                @cum := @cum + int_NUMBER  AS cumulative_qty,
                @cum_prev := @cum - int_NUMBER AS prev_cumulative
            FROM t_lot
            WHERE lg_FAMILLE_ID = v_product_id 
            ORDER BY dt_CREATED ASC
        ) c ON l.lg_LOT_ID = c.lg_LOT_ID
        SET l.current_stock =
            CASE
                WHEN v_consumed >= c.cumulative_qty THEN 0
                WHEN v_consumed <= c.prev_cumulative THEN c.quantity
                ELSE c.cumulative_qty - v_consumed
            END;

    END LOOP;

    CLOSE cur_products;
END$$

DELIMITER ;
CALL recompute_available_stock_all_products();




