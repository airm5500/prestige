ALTER TABLE `t_order_detail` ADD COLUMN IF NOT EXISTS  `checked` boolean default FALSE;
ALTER TABLE `t_order_detail` ADD COLUMN IF NOT EXISTS  `quantite_controle` INT(6) NULL DEFAULT NULL;



ALTER TABLE `t_bon_livraison_detail` ADD COLUMN IF NOT EXISTS  `checked` boolean default FALSE;
ALTER TABLE `t_bon_livraison_detail` ADD COLUMN IF NOT EXISTS  `quantite_controle` INT(6) NULL DEFAULT NULL;