ALTER  TABLE `vente_reglement` ADD COLUMN IF NOT EXISTS  `amount_non_ca` INT(11) NOT NULL DEFAULT '0';

DELIMITER @@
DROP PROCEDURE IF EXISTS proc_update_vente_reglement_amount_non_ca @@
CREATE PROCEDURE
      proc_update_vente_reglement_amount_non_ca()
BEGIN
    DECLARE venteId VARCHAR(50);

    DECLARE done INT DEFAULT 0;

    DECLARE curbl CURSOR FOR
     SELECT distinct vr.vente_id from  vente_reglement vr  join t_preenregistrement_detail d on vr.vente_id=d.lg_PREENREGISTREMENT_ID join t_famille f on f.lg_FAMILLE_ID=d.lg_FAMILLE_ID WHERE d.bool_ACCOUNT IS FALSE AND f.bool_ACCOUNT IS FALSE;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
  
    OPEN curbl;
    bl_loop:
    LOOP
        FETCH curbl INTO venteId;
        IF done = 1 THEN
            LEAVE bl_loop;
        END IF;

        UPDATE  vente_reglement vr set vr.amount_non_ca=  ( SELECT sum(p.int_PRICE) FROM t_preenregistrement_detail p where p.lg_PREENREGISTREMENT_ID=venteId AND p.bool_ACCOUNT IS FALSE) WHERE vr.vente_id=venteId;
       
    END LOOP bl_loop;
    CLOSE curbl;
    COMMIT;

END @@
DELIMITER ;
