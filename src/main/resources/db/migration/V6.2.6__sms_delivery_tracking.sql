-- Suivi fin des envois SMS Orange (demande 2 : codes d'erreur + traçabilité,
-- et base pour les Delivery Receipts - demande 4).
-- On stocke par destinataire (notification_client) la ressource Orange et le
-- dernier statut/erreur de livraison.

ALTER TABLE `notification_client` ADD COLUMN IF NOT EXISTS `resource_url` VARCHAR(500) NULL DEFAULT NULL;
ALTER TABLE `notification_client` ADD COLUMN IF NOT EXISTS `delivery_status` VARCHAR(40) NULL DEFAULT NULL;
ALTER TABLE `notification_client` ADD COLUMN IF NOT EXISTS `error_code` VARCHAR(60) NULL DEFAULT NULL;
ALTER TABLE `notification_client` ADD COLUMN IF NOT EXISTS `error_message` VARCHAR(500) NULL DEFAULT NULL;
ALTER TABLE `notification_client` ADD COLUMN IF NOT EXISTS `last_http_status` INT NULL DEFAULT NULL;

-- Paramètre d'activation de l'envoi immédiat des SMS d'avoir (demande 1).
-- 1 = on tente l'envoi dès la création de la notification ; le job planifié
-- reste le filet de rattrapage. Désactivable en passant la valeur à 0.
INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED)
SELECT 'KEY_SMS_AVOIR_IMMEDIAT', '1',
       'Envoi immediat des SMS de disponibilite d''avoir des la creation de la notification (0/1)', 'SYSTEM', 'enable', NOW()
WHERE NOT EXISTS (SELECT 1 FROM t_parameters WHERE str_KEY = 'KEY_SMS_AVOIR_IMMEDIAT');
