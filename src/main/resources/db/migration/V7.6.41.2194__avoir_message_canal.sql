-- Plan du 21/11, point 11 : canal et suivi du message « vos produits en avoir sont disponibles ».
--
-- 1. Paramètre KEY_SMS_AVOIR_CANAL : SMS (défaut, comme avant), WHATSAPP, ou SMS_WHATSAPP (WhatsApp puis SMS si
--    WhatsApp refuse le message).
-- 2. Table notification_vente : ventes d'un message d'avoir. Un message peut couvrir plusieurs ventes d'un même client ;
--    la liste des avoirs y lit l'état du message de chaque vente. Les messages antérieurs n'y sont pas : la liste affiche
--    « — » pour eux.

INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, str_IS_EN_KRYPTED, str_SECTION_KEY, dt_CREATED, dt_UPDATED) VALUES
 ('KEY_SMS_AVOIR_CANAL', 'SMS', 'CANAL DES MESSAGES D''AVOIR : SMS, WHATSAPP ou SMS_WHATSAPP (WhatsApp puis SMS en cas de refus)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);

INSERT INTO parametre_explication (str_KEY, explication)
SELECT 'KEY_SMS_AVOIR_CANAL',
       '{"regle":"Canal du message « vos produits en avoir sont disponibles », préparé à l''entrée en stock d''un bon de livraison. SMS : comme avant, l''envoi immédiat dépend de KEY_SMS_AVOIR_IMMEDIAT. WHATSAPP et SMS_WHATSAPP : le message part par WhatsApp dès la validation de l''entrée en stock. Toute autre valeur vaut SMS. La valeur est relue à chaque entrée en stock.","titre":"Canal des messages d''avoir","entetes":["Valeur","Effet"],"cas":[["SMS","Le message part par SMS (valeur par défaut)."],["WHATSAPP","Le message part par WhatsApp seulement. S''il est refusé (pas de WhatsApp, refus du client, compte inactif), aucun SMS ne part."],["SMS_WHATSAPP","Le message part par WhatsApp ; s''il est refusé tout de suite, il part par SMS (si le client accepte les SMS)."]],"rappels":["WhatsApp n''accepte un premier message envoyé à un client qu''avec un modèle validé par Meta : tant que le modèle « avoir disponible » n''est pas validé sur votre compte, préférez SMS_WHATSAPP.","La liste des avoirs affiche l''état du message de chaque vente : en attente, envoyé, distribué, lu (WhatsApp seulement) ou échec, avec le canal et la date."]}'
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM parametre_explication WHERE str_KEY = 'KEY_SMS_AVOIR_CANAL');

CREATE TABLE IF NOT EXISTS notification_vente (
    notification_id VARCHAR(40) NOT NULL,
    lg_PREENREGISTREMENT_ID VARCHAR(40) NOT NULL,
    PRIMARY KEY (notification_id, lg_PREENREGISTREMENT_ID),
    KEY idx_notification_vente_vente (lg_PREENREGISTREMENT_ID)
);
