-- =====================================================================
-- Tracabilite des produits retires d'une vente et des ventes abandonnees
-- (vente en attente supprimee), avec ecran dedie "Suppressions de vente".
-- str_COMPOSANT = xtype ExtJS charge au clic = 'suppressionsvente'.
-- Se reconnecter apres execution : les privileges sont recharges a la
-- connexion (USER_LIST_PRIVILEGE).
-- =====================================================================

-- 1) Table d'audit
CREATE TABLE IF NOT EXISTS `vente_suppression` (
    `id` VARCHAR(50) NOT NULL,
    `type_suppression` VARCHAR(10) NOT NULL, -- PRODUIT = retrait d'un produit ; VENTE = vente abandonnee/supprimee
    `vente_id` VARCHAR(50) NULL,
    `vente_ref` VARCHAR(70) NULL,
    `produit_id` VARCHAR(50) NULL,
    `produit_cip` VARCHAR(30) NULL,
    `produit_libelle` VARCHAR(255) NULL,
    `quantite` INT NOT NULL DEFAULT 0,
    `user_id` VARCHAR(50) NULL,
    `user_name` VARCHAR(150) NULL,
    `mvt_date` DATETIME NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_vente_suppression_date` (`mvt_date`),
    KEY `idx_vente_suppression_user` (`user_id`),
    KEY `idx_vente_suppression_produit` (`produit_id`),
    KEY `idx_vente_suppression_cip` (`produit_cip`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8;

-- 2) Privilege du nouveau menu
INSERT IGNORE INTO t_privilege
    (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
     `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
VALUES
    ('20260717', 'P_SM_SUPPRESSIONS_VENTE', 'CUSTOMER', 'Suppressions de vente',
     NULL, NOW(), NULL, NULL, NULL, 'enable');

-- 3) Sous-menu, rattache au meme menu que la liste des ventes annulees
--    (a defaut, au meme menu que la liste des ventes en attente)
INSERT IGNORE INTO t_sous_menu
    (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`,
     `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT '20260717', 'Suppressions de vente', NULL,
       'Produits retires des ventes et ventes abandonnees', 'suppressionsvente',
       m.lg_MENU_ID, 99, NULL, 'enable', 'P_SM_SUPPRESSIONS_VENTE', NOW(), NULL, ''
FROM (
    SELECT sm.lg_MENU_ID
    FROM t_sous_menu sm
    WHERE sm.str_COMPOSANT IN ('venteannuler', 'cloturerventemanager')
    ORDER BY FIELD(sm.str_COMPOSANT, 'venteannuler', 'cloturerventemanager')
    LIMIT 1
) m;

-- 4) Visibilite : accessible a tous les roles (consultation, impression,
--    creation d'inventaire ouvertes a tout le monde)
INSERT INTO t_role_privelege
    (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), r.lg_ROLE_ID, '20260717', NOW(), NOW()
FROM t_role r
WHERE r.lg_ROLE_ID NOT IN (
    SELECT rp.lg_ROLE_ID FROM t_role_privelege rp WHERE rp.lg_PRIVILEGE_ID = '20260717'
);
