-- Retours du 08/10 (7) : substitutions PharmaML suivies jusqu'a la commande.
-- lg_ORDERDETAIL_ID : ligne ajoutee a la commande pour un equivalent / remplacant deja livre (EL, RL), qui peut etre
-- retiree avant la reception. str_HISTORIQUE : decisions successives (acceptation, annulation, retrait), qui et quand.
ALTER TABLE `t_pharmaml_remplacement` ADD COLUMN IF NOT EXISTS `lg_ORDERDETAIL_ID` VARCHAR(40) NULL;
ALTER TABLE `t_pharmaml_remplacement` ADD COLUMN IF NOT EXISTS `str_HISTORIQUE` VARCHAR(1000) NULL;
ALTER TABLE `t_pharmaml_remplacement` ADD INDEX IF NOT EXISTS `idx_pml_rempl_order` (`lg_ORDER_ID`);

-- Remplacements deja livres notes avant cette version : ligne de la commande retrouvee par le code du remplacant.
UPDATE `t_pharmaml_remplacement` r
   SET r.`lg_ORDERDETAIL_ID` = (
       SELECT d.`lg_ORDERDETAIL_ID` FROM `t_order_detail` d
         JOIN `t_famille` f ON f.`lg_FAMILLE_ID` = d.`lg_FAMILLE_ID`
        WHERE d.`lg_ORDER_ID` = r.`lg_ORDER_ID`
          AND (f.`int_CIP` = r.`str_CODE_REMPLACANT` OR f.`int_EAN13` = r.`str_CODE_REMPLACANT`)
        LIMIT 1)
 WHERE r.`str_STATUT` = 'AJOUTE' AND r.`lg_ORDERDETAIL_ID` IS NULL AND r.`lg_ORDER_ID` IS NOT NULL;
