DELIMITER @@
DROP PROCEDURE IF EXISTS proc_update_stock_snaps @@
CREATE PROCEDURE proc_update_stock_snaps
()
BEGIN 

DECLARE familleId VARCHAR(40);
DECLARE magasin VARCHAR(40);
DECLARE prixPaf NUMERIC(10);
DECLARE prixTarif NUMERIC(10);
DECLARE prixUni NUMERIC(10);
DECLARE pmp NUMERIC(10);
DECLARE qty NUMERIC(6);
DECLARE valeurTva NUMERIC(6);
DECLARE done INT DEFAULT 0;
DECLARE curbl CURSOR FOR 
SELECT f.lg_FAMILLE_ID,c.int_VALUE,s.int_NUMBER_AVAILABLE,s.lg_EMPLACEMENT_ID,f.int_PRICE,
f.int_PAF,f.int_PAT,f.dbl_PRIX_MOYEN_PONDERE FROM t_famille f,t_famille_stock s,t_code_tva c,t_emplacement e WHERE f.lg_FAMILLE_ID=s.lg_FAMILLE_ID AND c.lg_CODE_TVA_ID=f.lg_CODE_TVA_ID
AND e.lg_EMPLACEMENT_ID=s.lg_EMPLACEMENT_ID AND f.str_STATUT='enable' AND s.str_STATUT='enable';
DECLARE CONTINUE HANDLER FOR NOT FOUND SET done=1;
OPEN curbl;
bl_loop:LOOP
FETCH curbl INTO familleId,valeurTva,qty,magasin,prixUni,prixPaf,prixTarif,pmp;
IF done=1 THEN 
 LEAVE bl_loop;
 END IF;
INSERT IGNORE INTO t_stock_snapshot (id, `prixPaf`, `magasin`,  `prixTarif`, `prixUni`, qty, valeurTva, `familleId`,`prix_moyent_pondere`) 
	VALUES (( CURRENT_DATE()),prixPaf,magasin,prixTarif,prixUni,qty,valeurTva,familleId,pmp);

END LOOP bl_loop;
 CLOSE curbl;

END @@ 
DELIMITER ;