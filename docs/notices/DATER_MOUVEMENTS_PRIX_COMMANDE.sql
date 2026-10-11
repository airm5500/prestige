-- Historique des prix : mouvements enregistres depuis la COMMANDE EN COURS sans date de creation (retours du 11/10).
-- Jusqu'au correctif du 11/10 (OrderServiceImpl.saveMouvementPrice), chaque changement de PV IMPORT / PA.IMPORT sur une
-- ligne de commande etait enregistre avec dt_CREATED vide ; ces lignes recoivent ici leur date de mise a jour (dt_UPDATED),
-- qui est l'instant reel du changement. Rien d'autre n'est touche.
--
-- SCRIPT MANUEL : il n'est PAS passe au deploiement. A executer en officine (HeidiSQL, MySQL Workbench...), une seule fois,
-- etape par etape, en lisant le resultat de chaque etape. Il peut etre rejoue sans effet (il ne vise que les lignes
-- encore sans date).

-- 1. CONTROLE (lecture seule) : nombre de mouvements concernes et periode
SELECT COUNT(*)          AS mouvements_sans_date,
       MIN(dt_UPDATED)   AS plus_ancien,
       MAX(dt_UPDATED)   AS plus_recent
  FROM t_mouvementprice
 WHERE dt_CREATED IS NULL
   AND dt_UPDATED IS NOT NULL
   AND str_ACTION = 'COMMANDE';

-- 2. SAUVEGARDE : identifiants des lignes modifiees (permet l'annulation, etape 5)
CREATE TABLE IF NOT EXISTS sauv_mouvementprice_dt_created_20261011 (
    lg_MOUVEMENTPRICE_ID VARCHAR(40) NOT NULL PRIMARY KEY
);
INSERT IGNORE INTO sauv_mouvementprice_dt_created_20261011 (lg_MOUVEMENTPRICE_ID)
SELECT lg_MOUVEMENTPRICE_ID
  FROM t_mouvementprice
 WHERE dt_CREATED IS NULL
   AND dt_UPDATED IS NOT NULL
   AND str_ACTION = 'COMMANDE';

-- 3. MISE A JOUR, dans une transaction
START TRANSACTION;

UPDATE t_mouvementprice
   SET dt_CREATED = dt_UPDATED
 WHERE dt_CREATED IS NULL
   AND dt_UPDATED IS NOT NULL
   AND str_ACTION = 'COMMANDE';

-- 4. VERIFICATION avant de valider : « restants » doit valoir 0 et « dates » le nombre de l'etape 1
SELECT (SELECT COUNT(*) FROM t_mouvementprice
         WHERE dt_CREATED IS NULL AND dt_UPDATED IS NOT NULL AND str_ACTION = 'COMMANDE')  AS restants,
       (SELECT COUNT(*) FROM t_mouvementprice m
          JOIN sauv_mouvementprice_dt_created_20261011 s ON s.lg_MOUVEMENTPRICE_ID = m.lg_MOUVEMENTPRICE_ID
         WHERE m.dt_CREATED = m.dt_UPDATED)                                              AS dates;

-- Si les chiffres sont bons :
COMMIT;
-- Sinon, a la place de COMMIT :  ROLLBACK;

-- 5. ANNULATION (seulement si necessaire, apres COMMIT) : remet les dates de creation a vide
-- UPDATE t_mouvementprice m
--   JOIN sauv_mouvementprice_dt_created_20261011 s ON s.lg_MOUVEMENTPRICE_ID = m.lg_MOUVEMENTPRICE_ID
--    SET m.dt_CREATED = NULL;

-- 6. MENAGE (quand tout est valide, quelques jours plus tard) :
-- DROP TABLE sauv_mouvementprice_dt_created_20261011;
