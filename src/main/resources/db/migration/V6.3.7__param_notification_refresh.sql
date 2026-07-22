-- Frequence d'actualisation de la cloche de notifications (en secondes).
-- Valeur par defaut 60 = comportement actuel inchange. Minimum applique cote
-- ecran : 15 secondes.
INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
    VALUES ('KEY_NOTIFICATION_REFRESH_SECONDS', '60', 'Frequence d''actualisation de la cloche de notifications (secondes, minimum 15)', 'SYSTEME', 'enable', NULL, NULL, NOW(), NOW());
