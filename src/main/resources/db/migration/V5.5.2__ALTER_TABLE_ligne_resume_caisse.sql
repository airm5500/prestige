
DELIMITER @@
DROP PROCEDURE IF EXISTS proc_ligne_resume_caisse @@
CREATE PROCEDURE
      proc_ligne_resume_caisse()
BEGIN
    DECLARE resume_caisse_id VARCHAR(100);
    DECLARE itemCount INT ;
   DECLARE type_ligne INT;
   DECLARE type_reglement_id VARCHAR(100);
    DECLARE done INT DEFAULT 0;

    DECLARE curbl CURSOR FOR
   SELECT distinct l.resume_caisse_id, COUNT(l.resume_caisse_id)-1 as itemCount,l.type_reglement_id,l.type_ligne FROM  ligne_resume_caisse l  JOIN t_resume_caisse r 
ON r.ld_CAISSE_ID=l.resume_caisse_id JOIN t_type_reglement m ON m.lg_TYPE_REGLEMENT_ID=l.type_reglement_id
GROUP BY l.resume_caisse_id,l.type_reglement_id,l.type_ligne HAVING COUNT(l.resume_caisse_id)>1;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;
    
    OPEN curbl;
    bl_loop:
    LOOP
        FETCH curbl INTO resume_caisse_id,itemCount,type_reglement_id,type_ligne;
        IF done = 1 THEN
            LEAVE bl_loop;
        END IF;

DELETE l FROM  ligne_resume_caisse l JOIN(SELECT r.id FROM ligne_resume_caisse r where r.resume_caisse_id=resume_caisse_id AND r.type_reglement_id=type_reglement_id AND 
r.type_ligne=type_ligne LIMIT itemCount) ll ON l.id=ll.id;
       
       
    END LOOP bl_loop;
    CLOSE curbl;
    COMMIT;

END @@
DELIMITER ;


CALL proc_ligne_resume_caisse();

ALTER TABLE ligne_resume_caisse ADD UNIQUE INDEX `UKbojq4och1r2t7bm99b7n3ye9u_ligne_resume` (`type_reglement_id`, `resume_caisse_id`, `type_ligne`);