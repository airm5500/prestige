-- Lot 3 (point 7) : clients standards des modes mobile money.
-- INSERT IGNORE : les lignes ne sont creees que si elles n'existent pas deja
-- (identifiants fixes 'moov', 'orange', 'wave', 'mtn', 'djamo') — les officines
-- qui ont deja cree ces clients gardent les leurs.

/* reglement mobile */
INSERT IGNORE INTO `t_client` (`lg_CLIENT_ID`, `str_CODE_INTERNE`, `str_FIRST_NAME`, `str_LAST_NAME`, `str_NUMERO_SECURITE_SOCIAL`, `dt_NAISSANCE`, `str_SEXE`, `str_ADRESSE`, `str_DOMICILE`, `str_AUTRE_ADRESSE`, `str_CODE_POSTAL`, `str_COMMENTAIRE`, `lg_TYPE_CLIENT_ID`, `dt_CREATED`, `dt_UPDATED`, `str_STATUT`, `lg_VILLE_ID`, `lg_CATEGORY_CLIENT_ID`, `lg_COMPANY_ID`, `remise`, `email`) VALUES ('moov', '4758717', 'MOOV', 'MONEY', NULL, NULL, NULL, '0101', NULL, NULL, NULL, NULL, '6', '2024-09-22 15:47:58', '2024-09-22 15:47:58', 'enable', NULL, NULL, NULL, NULL, '');
INSERT IGNORE INTO `t_client` (`lg_CLIENT_ID`, `str_CODE_INTERNE`, `str_FIRST_NAME`, `str_LAST_NAME`, `str_NUMERO_SECURITE_SOCIAL`, `dt_NAISSANCE`, `str_SEXE`, `str_ADRESSE`, `str_DOMICILE`, `str_AUTRE_ADRESSE`, `str_CODE_POSTAL`, `str_COMMENTAIRE`, `lg_TYPE_CLIENT_ID`, `dt_CREATED`, `dt_UPDATED`, `str_STATUT`, `lg_VILLE_ID`, `lg_CATEGORY_CLIENT_ID`, `lg_COMPANY_ID`, `remise`, `email`) VALUES ('orange', '4758710', 'ORANGE', 'MONEY', NULL, NULL, NULL, '0707', NULL, NULL, NULL, NULL, '6', '2024-09-22 15:47:58', '2024-09-22 15:47:58', 'enable', NULL, NULL, NULL, NULL, '');
INSERT IGNORE INTO `t_client` (`lg_CLIENT_ID`, `str_CODE_INTERNE`, `str_FIRST_NAME`, `str_LAST_NAME`, `str_NUMERO_SECURITE_SOCIAL`, `dt_NAISSANCE`, `str_SEXE`, `str_ADRESSE`, `str_DOMICILE`, `str_AUTRE_ADRESSE`, `str_CODE_POSTAL`, `str_COMMENTAIRE`, `lg_TYPE_CLIENT_ID`, `dt_CREATED`, `dt_UPDATED`, `str_STATUT`, `lg_VILLE_ID`, `lg_CATEGORY_CLIENT_ID`, `lg_COMPANY_ID`, `remise`, `email`) VALUES ('wave', '4758719', 'WAVE', 'MONEY', NULL, NULL, NULL, '1305', NULL, NULL, NULL, NULL, '6', '2024-09-22 15:47:58', '2024-09-22 15:47:58', 'enable', NULL, NULL, NULL, NULL, '');
INSERT IGNORE INTO `t_client` (`lg_CLIENT_ID`, `str_CODE_INTERNE`, `str_FIRST_NAME`, `str_LAST_NAME`, `str_NUMERO_SECURITE_SOCIAL`, `dt_NAISSANCE`, `str_SEXE`, `str_ADRESSE`, `str_DOMICILE`, `str_AUTRE_ADRESSE`, `str_CODE_POSTAL`, `str_COMMENTAIRE`, `lg_TYPE_CLIENT_ID`, `dt_CREATED`, `dt_UPDATED`, `str_STATUT`, `lg_VILLE_ID`, `lg_CATEGORY_CLIENT_ID`, `lg_COMPANY_ID`, `remise`, `email`) VALUES ('mtn', '4758717', 'MTN', 'MONEY', NULL, NULL, NULL, '0505', NULL, NULL, NULL, NULL, '6', '2024-09-22 15:47:58', '2024-09-22 15:47:58', 'enable', NULL, NULL, NULL, NULL, '');
INSERT IGNORE INTO `t_client` (`lg_CLIENT_ID`, `str_CODE_INTERNE`, `str_FIRST_NAME`, `str_LAST_NAME`, `str_NUMERO_SECURITE_SOCIAL`, `dt_NAISSANCE`, `str_SEXE`, `str_ADRESSE`, `str_DOMICILE`, `str_AUTRE_ADRESSE`, `str_CODE_POSTAL`, `str_COMMENTAIRE`, `lg_TYPE_CLIENT_ID`, `dt_CREATED`, `dt_UPDATED`, `str_STATUT`, `lg_VILLE_ID`, `lg_CATEGORY_CLIENT_ID`, `lg_COMPANY_ID`, `remise`, `email`) VALUES ('djamo', '4758717', 'DJAMO', '', NULL, NULL, NULL, '1010', NULL, NULL, NULL, NULL, '6', '2024-09-22 15:47:58', '2024-09-22 15:47:58', 'enable', NULL, NULL, NULL, NULL, '');

-- Cablage automatique : ces clients deviennent le « client par defaut » des
-- modes de reglement correspondants, UNIQUEMENT si aucun n'est deja parametre
-- (une officine qui a fait son propre choix dans le menu Mode reglement le
-- garde). Le volet SELECTION RAPIDE de la vente marche ainsi des la mise a
-- jour, sans parametrage manuel.
UPDATE t_mode_reglement SET lg_CLIENT_DEFAUT_ID = 'orange'
    WHERE lg_TYPE_REGLEMENT_ID = '7'  AND (lg_CLIENT_DEFAUT_ID IS NULL OR lg_CLIENT_DEFAUT_ID = '');
UPDATE t_mode_reglement SET lg_CLIENT_DEFAUT_ID = 'moov'
    WHERE lg_TYPE_REGLEMENT_ID = '8'  AND (lg_CLIENT_DEFAUT_ID IS NULL OR lg_CLIENT_DEFAUT_ID = '');
UPDATE t_mode_reglement SET lg_CLIENT_DEFAUT_ID = 'mtn'
    WHERE lg_TYPE_REGLEMENT_ID = '9'  AND (lg_CLIENT_DEFAUT_ID IS NULL OR lg_CLIENT_DEFAUT_ID = '');
UPDATE t_mode_reglement SET lg_CLIENT_DEFAUT_ID = 'wave'
    WHERE lg_TYPE_REGLEMENT_ID = '10' AND (lg_CLIENT_DEFAUT_ID IS NULL OR lg_CLIENT_DEFAUT_ID = '');
UPDATE t_mode_reglement SET lg_CLIENT_DEFAUT_ID = 'djamo'
    WHERE lg_TYPE_REGLEMENT_ID = '19' AND (lg_CLIENT_DEFAUT_ID IS NULL OR lg_CLIENT_DEFAUT_ID = '');
