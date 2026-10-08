-- Retours du 08/10 : lignes de commandes NON receptionnees sans prix de vente (NULL : commande creee depuis une
-- suggestion dont la ligne n'en avait pas ; 0 : reponse PharmaML sans PUBTC, ex. DPCI). Une ligne sans prix rendait
-- la liste des commandes en cours impossible a afficher. Prix de vente de la fiche article repris.
--
-- Retours du 08/10 (4) : le trigger t_order_details_indicateur_update modifie t_famille ; une seule requete qui lit
-- t_famille et modifie t_order_detail echoue alors (erreur 1442). Les prix sont donc lus d'abord dans une table
-- temporaire, puis appliques sans toucher t_famille dans la meme requete. Les indicateurs de commande des articles
-- (modifies par le trigger) sont remis a leur valeur d'avant. Rejouable sans effet de bord.
DROP TEMPORARY TABLE IF EXISTS `tmp_v69101_prix`;
DROP TEMPORARY TABLE IF EXISTS `tmp_v69101_ind`;

CREATE TEMPORARY TABLE `tmp_v69101_prix` (
  `id` VARCHAR(40) NOT NULL PRIMARY KEY,
  `prix` INT NOT NULL,
  `famille` VARCHAR(40) NOT NULL
);
INSERT INTO `tmp_v69101_prix` (`id`, `prix`, `famille`)
SELECT d.`lg_ORDERDETAIL_ID`, f.`int_PRICE`, f.`lg_FAMILLE_ID`
  FROM `t_order_detail` d
  JOIN `t_order` o ON o.`lg_ORDER_ID` = d.`lg_ORDER_ID`
  JOIN `t_famille` f ON f.`lg_FAMILLE_ID` = d.`lg_FAMILLE_ID`
 WHERE (d.`int_PRICE_DETAIL` IS NULL OR d.`int_PRICE_DETAIL` = 0)
   AND o.`str_STATUT` IN ('is_Process', 'pharma')
   AND f.`int_PRICE` IS NOT NULL AND f.`int_PRICE` > 0;

CREATE TEMPORARY TABLE `tmp_v69101_ind` (
  `famille` VARCHAR(40) NOT NULL PRIMARY KEY,
  `statut` INT NULL,
  `indicateur` INT NULL
);
INSERT INTO `tmp_v69101_ind` (`famille`, `statut`, `indicateur`)
SELECT f.`lg_FAMILLE_ID`, f.`int_ORERSTATUS`, f.`b_CODEINDICATEUR`
  FROM `t_famille` f
 WHERE f.`lg_FAMILLE_ID` IN (SELECT DISTINCT p.`famille` FROM `tmp_v69101_prix` p);

UPDATE `t_order_detail` d
  JOIN `tmp_v69101_prix` p ON p.`id` = d.`lg_ORDERDETAIL_ID`
   SET d.`int_PRICE_DETAIL` = p.`prix`;

UPDATE `t_famille` f
  JOIN `tmp_v69101_ind` i ON i.`famille` = f.`lg_FAMILLE_ID`
   SET f.`int_ORERSTATUS` = i.`statut`, f.`b_CODEINDICATEUR` = i.`indicateur`
 WHERE NOT (f.`int_ORERSTATUS` <=> i.`statut` AND f.`b_CODEINDICATEUR` <=> i.`indicateur`);

DROP TEMPORARY TABLE IF EXISTS `tmp_v69101_prix`;
DROP TEMPORARY TABLE IF EXISTS `tmp_v69101_ind`;
