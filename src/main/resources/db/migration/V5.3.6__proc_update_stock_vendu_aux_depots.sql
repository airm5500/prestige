DELIMITER @@
DROP PROCEDURE IF EXISTS proc_update_stock_vendu_aux_depots @@
CREATE PROCEDURE
      proc_update_stock_vendu_aux_depots(IN dateDebut date,IN dateFin date,IN depotsIds varchar(255), OUT nombreLigne int)
BEGIN
    DECLARE produitId VARCHAR(50);

    DECLARE quantity_on_hand INT(8);
    DECLARE done INT DEFAULT 0;

    DECLARE curbl CURSOR FOR
     SELECT  SUM(d.int_QUANTITY),d.lg_FAMILLE_ID FROM  t_preenregistrement p,t_preenregistrement_detail d
     WHERE p.PK_BRAND  =depotsIds
     AND p.lg_TYPE_VENTE_ID='5' AND p.str_STATUT='is_Closed' AND p.lg_PREENREGISTREMENT_ID=d.lg_PREENREGISTREMENT_ID
    AND date(p.dt_UPDATED) BETWEEN dateDebut AND dateFin GROUP BY  d.lg_FAMILLE_ID;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
    SET nombreLigne = 0;
    OPEN curbl;
    bl_loop:
    LOOP
        FETCH curbl INTO quantity_on_hand,produitId;
        IF done = 1 THEN
            LEAVE bl_loop;
        END IF;

        UPDATE t_famille_stock st
        SET st.int_NUMBER_AVAILABLE=st.int_NUMBER_AVAILABLE-quantity_on_hand,
            st.int_NUMBER=st.int_NUMBER_AVAILABLE,
           st.dt_CREATED= now()
        WHERE st.lg_FAMILLE_ID = produitId
          AND st.lg_EMPLACEMENT_ID = '1';
        SET nombreLigne = nombreLigne + 1;
    END LOOP bl_loop;
    CLOSE curbl;
    COMMIT;

END @@
DELIMITER ;

