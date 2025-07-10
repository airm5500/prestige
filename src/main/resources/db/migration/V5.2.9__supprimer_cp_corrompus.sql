DELIMITER @@
DROP PROCEDURE IF EXISTS supprimer_cp_corrompus @@
CREATE PROCEDURE supprimer_cp_corrompus()
BEGIN 

DECLARE pkey VARCHAR(100);
DECLARE NB int(10);

DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 

SELECT c.`lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID` from t_preenregistrement_compte_client_tiers_payent c,t_preenregistrement p where c.`lg_USER_ID` IS NULL AND p.`lg_PREENREGISTREMENT_ID`=c.`lg_PREENREGISTREMENT_ID` AND p.`str_STATUT`='is_Closed'
AND c.`str_STATUT`='is_Process';
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO pkey;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
DELETE FROM t_preenregistrement_compte_client_tiers_payent where `lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID`=pkey;

END LOOP bl_loop;
 CLOSE curbl;

END @@ 
DELIMITER ; 

call supprimer_cp_corrompus();

