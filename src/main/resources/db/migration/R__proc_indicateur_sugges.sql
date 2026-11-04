-- Indicateur de commande du produit (t_famille.int_ORERSTATUS, b_CODEINDICATEUR), appele par les declencheurs de
-- t_warehouse (entree en stock), t_order_detail et t_suggestion_order_details.
--
-- Mesure du 03/11 : le parametre etait cree dans le jeu de caracteres par defaut de la base (utf8mb4) alors que les
-- colonnes lg_FAMILLE_ID sont en utf8mb3 ; la comparaison convertissait la colonne et l'index n'etait plus utilise :
-- parcours complet de l'index de t_famille (22 000 lignes) et de t_suggestion_order_details a chaque appel, soit
-- environ 100 ms par ligne d'un bon a l'entree en stock (bon de 40 lignes : 6,5 s, ramenes a 1,5 s).
-- Meme logique qu'avant ; l'identifiant est recopie dans des variables du type exact de chaque colonne (TYPE OF),
-- ce qui garde l'index quel que soit le jeu de caracteres de la base.
DELIMITER @@
CREATE OR REPLACE PROCEDURE proc_indicateur_sugges(IN lgFAMILLEID VARCHAR(20))
BEGIN
DECLARE CheckExists INT DEFAULT 0;
DECLARE vFamille TYPE OF t_famille.lg_FAMILLE_ID;
DECLARE vCommande TYPE OF t_order_detail.lg_FAMILLE_ID;
DECLARE vSuggestion TYPE OF t_suggestion_order_details.lg_FAMILLE_ID;
SET vFamille = lgFAMILLEID;
SET vCommande = lgFAMILLEID;
SET vSuggestion = lgFAMILLEID;
SELECT COUNT(*) INTO CheckExists FROM t_order_detail WHERE str_STATUT = 'passed' AND lg_FAMILLE_ID = vCommande;
IF (CheckExists > 0) THEN
  UPDATE t_famille SET int_ORERSTATUS = 3, b_CODEINDICATEUR = 2 WHERE lg_FAMILLE_ID = vFamille;
ELSE
  SELECT COUNT(*) INTO CheckExists FROM t_order_detail WHERE str_STATUT = 'is_Process' AND lg_FAMILLE_ID = vCommande;
  IF (CheckExists > 0) THEN
    UPDATE t_famille SET int_ORERSTATUS = 2, b_CODEINDICATEUR = 1 WHERE lg_FAMILLE_ID = vFamille;
  ELSE
    SELECT COUNT(*) INTO CheckExists FROM t_order_detail WHERE str_STATUT = 'ENTREE_STOCK' AND lg_FAMILLE_ID = vCommande;
    IF (CheckExists > 1) THEN
      UPDATE t_famille SET int_ORERSTATUS = 4, b_CODEINDICATEUR = 2 WHERE lg_FAMILLE_ID = vFamille;
    ELSE
      SELECT COUNT(*) INTO CheckExists FROM t_suggestion_order_details WHERE str_STATUT = 'is_Process' AND lg_FAMILLE_ID = vSuggestion;
      IF (CheckExists > 0) THEN
        UPDATE t_famille SET int_ORERSTATUS = 1, b_CODEINDICATEUR = 1 WHERE lg_FAMILLE_ID = vFamille;
      ELSE
        UPDATE t_famille SET int_ORERSTATUS = 0, b_CODEINDICATEUR = 0 WHERE lg_FAMILLE_ID = vFamille;
      END IF;
    END IF;
  END IF;
END IF;
END @@
DELIMITER ;
