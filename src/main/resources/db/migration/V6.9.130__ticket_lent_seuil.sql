-- Retours du 10/10 (journal du support : impression des tickets de 24 a 39 s) : au-dela de ce seuil (ms), l'impression
-- d'un ticket est signalee au Centre de Support avec le detail de ses etapes (recherche de l'imprimante, preparation du
-- travail d'impression, envoi au spouleur, lecture de la vente).
INSERT IGNORE INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, str_IS_EN_KRYPTED, str_SECTION_KEY, dt_CREATED, dt_UPDATED) VALUES
('KEY_TICKET_LENT_SEUIL_MS', '5000', 'Durée (ms) au-delà de laquelle l''impression d''un ticket est signalée au Centre de Support avec le détail de ses étapes', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);
