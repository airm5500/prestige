-- =====================================================================
-- 15/11 : pointage des bons par organisme (onglet « Pointage » de « Bons par organisme »).
--  - int_DELAI_SAISIE_BON : delai maximal (jours) entre la date de l'ordonnance et la saisie de la vente, propre a
--    l'organisme ou, a defaut, a son groupe. NULL (par defaut, rien ne change pour l'existant) = aucun controle ;
--  - t_pointage_bon : resultat du pointage d'un bon (un par bon), relu par l'ecran de pointage, ses compteurs, ses
--    exports et l'onglet des anomalies. Le montant et la date de mise a jour du bon au moment du pointage sont
--    gardes : un bon modifie apres pointage repasse « a pointer ».
--  - t_pointage_annonce : nombre de bons annonce par l'organisme pour une periode (saisi ou issu d'un releve).
-- Aucun nom, aucun texte de demande de patient. Rejouable.
-- =====================================================================

ALTER TABLE t_tiers_payant
    ADD COLUMN IF NOT EXISTS `int_DELAI_SAISIE_BON` INT DEFAULT NULL;

ALTER TABLE t_groupe_tierspayant
    ADD COLUMN IF NOT EXISTS `int_DELAI_SAISIE_BON` INT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS t_pointage_bon (
    `id`                                         VARCHAR(40)  NOT NULL,
    `lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID` VARCHAR(40)  NOT NULL,
    `lg_TIERS_PAYANT_ID`                         VARCHAR(40)  NOT NULL,
    `str_RESULTAT`                               VARCHAR(12)  NOT NULL,
    `int_BLOC`                                   INT          DEFAULT NULL,
    `str_MOTIF`                                  VARCHAR(255) DEFAULT NULL,
    `int_PRICE_POINTE`                           INT          DEFAULT NULL,
    `dt_BON_UPDATED`                             DATETIME     DEFAULT NULL,
    `lg_USER_ID`                                 VARCHAR(40)  DEFAULT NULL,
    `dt_CREATED`                                 DATETIME     NOT NULL,
    `dt_UPDATED`                                 DATETIME     NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_pointage_bon` (`lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID`),
    KEY `idx_pointage_bon_tp` (`lg_TIERS_PAYANT_ID`, `str_RESULTAT`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb3 COLLATE = utf8mb3_general_ci;

CREATE TABLE IF NOT EXISTS t_pointage_annonce (
    `id`                 VARCHAR(40) NOT NULL,
    `lg_TIERS_PAYANT_ID` VARCHAR(40) NOT NULL,
    `dt_DEBUT`           DATE        NOT NULL,
    `dt_FIN`             DATE        NOT NULL,
    `int_ANNONCES`       INT         NOT NULL,
    `str_SOURCE`         VARCHAR(12) NOT NULL,
    `lg_USER_ID`         VARCHAR(40) DEFAULT NULL,
    `dt_UPDATED`         DATETIME    NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_pointage_annonce` (`lg_TIERS_PAYANT_ID`, `dt_DEBUT`, `dt_FIN`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb3 COLLATE = utf8mb3_general_ci;
