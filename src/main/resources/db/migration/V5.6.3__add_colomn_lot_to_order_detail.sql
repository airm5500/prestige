ALTER TABLE `t_order_detail` ADD COLUMN `lots` LONGTEXT NULL DEFAULT NULL COLLATE 'utf8mb4_bin';
ALTER TABLE `t_order_detail` ADD CONSTRAINT `lots` CHECK (json_valid(`lots`));