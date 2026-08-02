-- Bascule de securite entre les deux moteurs d'edition des etiquettes, et mode d'ouverture du PDF.
--
-- KEY_ETIQUETTE_MOTEUR :
--   NOUVEAU (defaut) : PDF vectoriel aux cotes exactes (servlet /Etiquete), avec modeles,
--     grossiste, calage et page de test ;
--   ANCIEN : generation JasperReports historique (rp_etiquette.jrxml + fusion de PDF), conservee
--     telle quelle comme solution de repli — retour immediat possible sans redeploiement.
--   La page de test (/Etiquete?test=1) reste toujours servie par le nouveau moteur.
--
-- KEY_ETIQUETTE_TELECHARGEMENT :
--   0 (defaut) : le PDF s'affiche dans le navigateur (visionneur integre) ;
--   1 : le PDF est telecharge et s'ouvre dans l'application PDF par defaut du poste (Adobe,
--     Foxit...), dont les reglages d'impression (taille reelle, source papier) sont fiables et
--     memorises — recommande si les postes impriment depuis des navigateurs varies.

INSERT IGNORE INTO t_parameters (`str_KEY`, `str_VALUE`, `str_DESCRIPTION`, `str_TYPE`, `str_STATUT`, `str_IS_EN_KRYPTED`, `str_SECTION_KEY`, `dt_CREATED`, `dt_UPDATED`)
VALUES
    ('KEY_ETIQUETTE_MOTEUR', 'NOUVEAU', 'Moteur d edition des etiquettes : NOUVEAU (PDF vectoriel) ou ANCIEN (JasperReports historique)', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL),
    ('KEY_ETIQUETTE_TELECHARGEMENT', '0', 'Etiquettes : 1 = telecharger le PDF (ouverture dans l application PDF du poste), 0 = afficher dans le navigateur', 'CUSTOMER', 'enable', NULL, NULL, NOW(), NULL);
