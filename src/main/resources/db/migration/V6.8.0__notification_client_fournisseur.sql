-- =====================================================================
-- Multi-fournisseur SMS : suivi par destinataire.
--   - fournisseur_code : fournisseur ayant pris en charge l'envoi (les
--     lignes historiques restent a NULL = Orange, seul fournisseur avant
--     cette version).
--   - poll_count / last_poll_at : bornage du rafraichissement de statut a
--     la demande (LeTexto, mode POLLING).
-- La colonne resource_url existante porte l'identifiant de suivi du
-- fournisseur (resourceURL Orange ou id de message LeTexto).
-- =====================================================================

ALTER TABLE `notification_client` ADD COLUMN IF NOT EXISTS `fournisseur_code` VARCHAR(20) NULL DEFAULT NULL;
ALTER TABLE `notification_client` ADD COLUMN IF NOT EXISTS `poll_count` INT(4) NOT NULL DEFAULT 0;
ALTER TABLE `notification_client` ADD COLUMN IF NOT EXISTS `last_poll_at` DATETIME NULL DEFAULT NULL;
