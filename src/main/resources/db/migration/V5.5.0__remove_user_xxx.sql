
DELETE FROM  t_role_user  WHERE lg_USER_ROLE_ID IN (SELECT r.lg_USER_ROLE_ID FROM  t_user u JOIN t_role_user r ON r.lg_USER_ID=u.lg_USER_ID WHERE u.lg_USER_ID='6411121389944247737');
DELETE FROM  t_user  WHERE lg_USER_ID='6411121389944247737';

DELIMITER @@
DROP PROCEDURE IF EXISTS proc_vente_reglement_produit_exclus_ca @@
CREATE PROCEDURE
      proc_vente_reglement_produit_exclus_ca()
BEGIN
    DECLARE reglementVenteId VARCHAR(100);

    DECLARE montant INT(11);
    DECLARE done INT DEFAULT 0;

    DECLARE curbl CURSOR FOR
     SELECT SUM(d.int_PRICE) AS montant,v.id FROM  t_preenregistrement_detail d JOIN t_preenregistrement
  p ON d.lg_PREENREGISTREMENT_ID=p.lg_PREENREGISTREMENT_ID  JOIN vente_reglement v ON v.vente_id=p.lg_PREENREGISTREMENT_ID
WHERE d.bool_ACCOUNT=FALSE AND v.amount_non_ca =0  GROUP  BY p.lg_PREENREGISTREMENT_ID;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
    
    OPEN curbl;
    bl_loop:
    LOOP
        FETCH curbl INTO montant,reglementVenteId;
        IF done = 1 THEN
            LEAVE bl_loop;
        END IF;

       UPDATE vente_reglement v SET v.amount_non_ca=montant WHERE v.id= reglementVenteId;
       
    END LOOP bl_loop;
    CLOSE curbl;
    COMMIT;

END @@
DELIMITER ;


