-- Zone ciblee par un ajustement de stock.
--
-- RAYON   : comportement historique, le stock rayon (t_famille_stock) est ajuste.
-- RESERVE : le stock reserve (t_type_stock_famille type 2) est ajuste a la place.
--
-- La colonne vaut RAYON par defaut, y compris pour tous les ajustements deja enregistres :
-- le comportement existant est donc rigoureusement conserve.

ALTER TABLE `t_ajustement`
	ADD COLUMN IF NOT EXISTS `str_ZONE` VARCHAR(10) NOT NULL DEFAULT 'RAYON' COLLATE 'utf8_general_ci';

UPDATE `t_ajustement` SET `str_ZONE` = 'RAYON' WHERE `str_ZONE` IS NULL OR `str_ZONE` = '';
