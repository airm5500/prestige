-- Reparation de la vue v_famille_dci.
--
-- Certains outils de sauvegarde/restauration creent d'abord v_famille_dci comme
-- TABLE temporaire vide ("pour pallier aux erreurs de dependances de VIEW") puis
-- la remplacent par la vraie vue en fin de script. Si la restauration s'arrete
-- avant, la vue reste une table vide : les ecrans qui la lisent n'affichent plus
-- aucune association DCI alors que t_famille_dci en contient.
--
-- On supprime l'eventuel artefact (table OU vue) puis on recree la vue de
-- reference, a l'identique de la definition d'origine.
DROP TABLE IF EXISTS `v_famille_dci`;
DROP VIEW IF EXISTS `v_famille_dci`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_famille_dci` AS
select `t_famille_dci`.`lg_FAMILLE_DCI_ID` AS `lg_FAMILLE_DCI_ID`,
       `t_famille_dci`.`lg_FAMILLE_ID` AS `lg_FAMILLE_ID`,
       `t_famille_dci`.`lg_DCI_ID` AS `lg_DCI_ID`,
       `t_famille`.`str_NAME` AS `str_NAME`,
       `t_famille`.`str_DESCRIPTION` AS `str_DESCRIPTION`,
       `t_famille`.`int_PRICE` AS `int_PRICE`,
       `t_famille`.`int_CIP` AS `int_CIP`,
       `t_famille`.`int_EAN13` AS `int_EAN13`,
       `t_dci`.`str_CODE` AS `str_CODE`,
       `t_dci`.`str_NAME` AS `dci_str_NAME`,
       `t_famille_dci`.`str_STATUT` AS `str_STATUT`
from ((`t_famille` join `t_famille_dci` on(`t_famille`.`lg_FAMILLE_ID` = `t_famille_dci`.`lg_FAMILLE_ID`))
      join `t_dci` on(`t_famille_dci`.`lg_DCI_ID` = `t_dci`.`lg_DCI_ID`));
