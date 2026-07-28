-- Etat ANNULEE, distinct de SUPPRIMEE, pour les lignes et les suggestions de reserve.
--
-- Jusqu'ici une ligne annulee par mouvement inverse repassait a SUPPRIMEE, le meme etat qu'une
-- ligne ecartee AVANT tout mouvement. Deux consequences genantes :
--   - le nombre de produits de la suggestion tombait a zero, les lignes ecartees n'etant pas
--     comptees, alors que le produit fait toujours partie de la suggestion ;
--   - la suggestion revenait a EN_COURS, ce qui laissait croire qu'on pouvait la reprendre - et
--     la reprendre aurait reproduit les mouvements que l'on venait justement d'annuler.
--
-- Les deux cas sont desormais distingues :
--   SUPPRIMEE : ecartee avant traitement, aucun stock n'a bouge, non comptee.
--   ANNULEE   : traitee puis defaite par mouvement inverse, comptee, non rejouable.
--
-- Ce script requalifie l'existant. Les lignes annulees sont reconnaissables a leur motif, pose
-- par le service au moment de l'annulation.

UPDATE `t_suggestion_reserve_detail`
   SET `str_ETAT` = 'ANNULEE'
 WHERE `str_ETAT` = 'SUPPRIMEE'
   AND `str_MOTIF_LIGNE` LIKE 'Annulee par mouvement inverse%';

-- Une suggestion dont plus aucune ligne n'est traitee et dont au moins une a ete annulee est
-- elle-meme annulee. Elle etait restee a EN_COURS.
UPDATE `t_suggestion_reserve` s
   SET s.`str_STATUT` = 'ANNULEE',
       s.`dt_CLOTURE` = COALESCE(s.`dt_CLOTURE`, s.`dt_UPDATED`, NOW())
 WHERE s.`str_STATUT` IN ('EN_COURS', 'TRAITEE')
   AND EXISTS (SELECT 1 FROM `t_suggestion_reserve_detail` d
                WHERE d.`lg_SUGGESTION_RESERVE_ID` = s.`lg_SUGGESTION_RESERVE_ID`
                  AND d.`str_ETAT` = 'ANNULEE')
   AND NOT EXISTS (SELECT 1 FROM `t_suggestion_reserve_detail` d2
                    WHERE d2.`lg_SUGGESTION_RESERVE_ID` = s.`lg_SUGGESTION_RESERVE_ID`
                      AND d2.`str_ETAT` = 'TRAITEE');
