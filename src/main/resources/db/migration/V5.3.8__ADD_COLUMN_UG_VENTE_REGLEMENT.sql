ALTER  TABLE `vente_reglement` ADD COLUMN IF NOT EXISTS  `ug_amount` INT(11) NOT NULL DEFAULT '0';
ALTER  TABLE `vente_reglement` ADD COLUMN IF NOT EXISTS  `ug_amount_net` INT(11) NOT NULL DEFAULT '0';
UPDATE vente_reglement vr INNER JOIN mvttransaction m ON vr.vente_id=m.pkey SET vr.ug_amount=m.montantttcug ,vr.ug_amount_net=m.montantnetug  WHERE m.montantttcug IS NOT NULL  AND m.montantttcug >0;
