-- =====================================================================
-- Point 6 : mouchard des ventes modifiees, avec le detail produit.
--   vente_modifiee       : une ligne par modification (produits, infos
--                          client / tiers payant, date de vente)
--   vente_modifiee_ligne : le detail produit par produit (ajout, retrait,
--                          changement de quantite ou de prix)
-- Ecran « Ventes modifiées » (xtype ExtJS 'ventesmodifieesmanager') place a
-- cote de « Fichier Journal » (menu GESTION DES FICHIERS). Le droit est donne
-- aux profils qui ont deja acces au fichier journal (P_SM_LOGFILE) et au
-- profil administrateur '00'.
-- Le fichier journal existant n'est pas modifie : il continue de recevoir
-- la ligne « Modification de la vente ... » comme avant.
-- Se reconnecter apres execution : les privileges sont recharges a la
-- connexion (USER_LIST_PRIVILEGE).
-- =====================================================================

CREATE TABLE IF NOT EXISTS `vente_modifiee` (
    `id` VARCHAR(50) NOT NULL,
    `type_modification` VARCHAR(10) NOT NULL, -- PRODUITS | INFOS | DATE
    `vente_id` VARCHAR(50) NULL,              -- vente resultante (copie cloturee, ou vente modifiee)
    `vente_origine_id` VARCHAR(50) NULL,      -- vente d'origine annulee (modification des produits)
    `vente_ref` VARCHAR(70) NULL,
    `user_id` VARCHAR(50) NULL,
    `user_name` VARCHAR(150) NULL,
    `mvt_date` DATETIME NOT NULL,
    `montant_avant` INT NOT NULL DEFAULT 0,
    `montant_apres` INT NOT NULL DEFAULT 0,
    `description` VARCHAR(1000) NULL,
    PRIMARY KEY (`id`),
    KEY `idx_vente_modifiee_date` (`mvt_date`),
    KEY `idx_vente_modifiee_user` (`user_id`),
    KEY `idx_vente_modifiee_ref` (`vente_ref`),
    KEY `idx_vente_modifiee_type` (`type_modification`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

CREATE TABLE IF NOT EXISTS `vente_modifiee_ligne` (
    `id` VARCHAR(50) NOT NULL,
    `modification_id` VARCHAR(50) NOT NULL,
    `produit_id` VARCHAR(50) NULL,
    `produit_cip` VARCHAR(30) NULL,
    `produit_libelle` VARCHAR(255) NULL,
    `action_ligne` VARCHAR(10) NOT NULL, -- AJOUT | RETRAIT | QUANTITE | PRIX
    `qte_avant` INT NOT NULL DEFAULT 0,
    `qte_apres` INT NOT NULL DEFAULT 0,
    `pu_avant` INT NOT NULL DEFAULT 0,
    `pu_apres` INT NOT NULL DEFAULT 0,
    `montant_avant` INT NOT NULL DEFAULT 0,
    `montant_apres` INT NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_vente_modifiee_ligne_modif` (`modification_id`),
    KEY `idx_vente_modifiee_ligne_produit` (`produit_id`),
    CONSTRAINT `fk_vente_modifiee_ligne_modif` FOREIGN KEY (`modification_id`)
        REFERENCES `vente_modifiee` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

-- Privilege du nouveau menu
INSERT IGNORE INTO t_privilege
    (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
     `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
VALUES
    ('20260902', 'P_SM_VENTES_MODIFIEES', 'CUSTOMER', 'Mouchard des ventes modifiées',
     NULL, NOW(), NULL, NULL, NULL, 'enable');

-- Sous-menu, a cote de « Fichier Journal » (meme menu, meme priorite)
INSERT IGNORE INTO t_sous_menu
    (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`,
     `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT '20260902', 'Ventes modifiées', NULL,
       'Mouchard des ventes modifiées avec le détail des produits', 'ventesmodifieesmanager',
       IFNULL(m.lg_MENU_ID, '10'), IFNULL(m.int_PRIORITY, 0), NULL, 'enable', 'P_SM_VENTES_MODIFIEES',
       NOW(), NULL, ''
FROM (SELECT sm.lg_MENU_ID, sm.int_PRIORITY FROM t_sous_menu sm WHERE sm.str_COMPOSANT = 'logfile' LIMIT 1) m;

-- Cas d'une base sans le sous-menu « Fichier Journal » : rattachement direct au menu '10'
INSERT IGNORE INTO t_sous_menu
    (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`,
     `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
VALUES ('20260902', 'Ventes modifiées', NULL,
        'Mouchard des ventes modifiées avec le détail des produits', 'ventesmodifieesmanager',
        '10', 0, NULL, 'enable', 'P_SM_VENTES_MODIFIEES', NOW(), NULL, '');

-- Visibilite : les profils qui ont acces au fichier journal, plus l'administrateur '00'
INSERT INTO t_role_privelege
    (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, '20260902', NOW(), NOW()
FROM t_role r
WHERE (r.lg_ROLE_ID = '00'
       OR r.lg_ROLE_ID IN (SELECT rp.lg_ROLE_ID FROM t_role_privelege rp
                           JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID
                           WHERE p.str_NAME = 'P_SM_LOGFILE'))
  AND r.lg_ROLE_ID NOT IN (
    SELECT rp.lg_ROLE_ID FROM t_role_privelege rp WHERE rp.lg_PRIVILEGE_ID = '20260902'
);
