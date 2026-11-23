-- Retours du 22/11 (lot 10, point 3) : envoi des messages « vos produits en avoir sont disponibles » depuis la fenêtre
-- des produits en avoir qui suit l'entrée en stock d'un bon.
--
-- 1. Table avoir_envoi : une ligne par message d'avoir (notification) dont l'envoi a été décidé : par l'utilisateur
--    (MANUEL, canal choisi SMS ou WHATSAPP) ou à la fermeture de la fenêtre (AUTO, canal du paramètre
--    KEY_SMS_AVOIR_CANAL). La clé primaire garantit un seul envoi décidé par message : un message envoyé à la main ne
--    repart pas à la fermeture. Jamais le texte du message.
-- 2. Index sur notification.entity_ref : les messages d'avoir d'un bon sont retrouvés par la référence du bon.

CREATE TABLE IF NOT EXISTS avoir_envoi (
    notification_id VARCHAR(50) NOT NULL,
    bon_id VARCHAR(50) NOT NULL,
    canal VARCHAR(16) NOT NULL,
    mode VARCHAR(8) NOT NULL,
    utilisateur_id VARCHAR(50) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (notification_id),
    KEY idx_avoir_envoi_bon (bon_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_entity_ref ON notification (entity_ref);
