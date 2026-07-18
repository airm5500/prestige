-- Memorise le mode de reglement choisi lors de la mise en attente d'une vente
-- afin de le restaurer a l'identique au rappel (ex: vente differee).
ALTER TABLE `t_preenregistrement` ADD COLUMN `str_TYPE_REGLEMENT_ATTENTE` VARCHAR(5) NULL;
