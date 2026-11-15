-- =====================================================================
-- Plan du 14/11, point 4 : mode d'envoi des factures sur la fiche du tiers payant.
--  - str_MODE_ENVOI_FACTURE : IMPRESSION (par defaut, rien ne change pour l'existant), MAIL (envoi de la facture
--    en PDF a l'adresse de la fiche, str_MAIL) ou API (reglage seul : l'envoi par API n'est pas encore disponible) ;
--  - t_facture_envoi : journal des envois (un par essai, reussi ou non), relu par la liste des factures
--    (colonne d'envoi : date, destinataire, statut). Aucun contenu de message, aucun secret.
-- Rejouable.
-- =====================================================================

ALTER TABLE t_tiers_payant
    ADD COLUMN IF NOT EXISTS `str_MODE_ENVOI_FACTURE` VARCHAR(12) NOT NULL DEFAULT 'IMPRESSION';

CREATE TABLE IF NOT EXISTS t_facture_envoi (
    `id`                 VARCHAR(40)  NOT NULL,
    `lg_FACTURE_ID`      VARCHAR(40)  NOT NULL,
    `lg_TIERS_PAYANT_ID` VARCHAR(40)  DEFAULT NULL,
    `str_MODE`           VARCHAR(12)  NOT NULL,
    `str_DESTINATAIRE`   VARCHAR(255) DEFAULT NULL,
    `str_STATUT`         VARCHAR(12)  NOT NULL,
    `str_ERREUR`         VARCHAR(500) DEFAULT NULL,
    `str_FICHIER`        VARCHAR(255) DEFAULT NULL,
    `int_TAILLE`         INT          DEFAULT NULL,
    `lg_USER_ID`         VARCHAR(40)  DEFAULT NULL,
    `dt_CREATED`         DATETIME     NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_facture_envoi_facture` (`lg_FACTURE_ID`, `dt_CREATED`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb3 COLLATE = utf8mb3_general_ci;
