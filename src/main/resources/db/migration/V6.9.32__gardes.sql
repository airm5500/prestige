-- =====================================================================
-- Gardes : periodes d'activite nommees
-- ---------------------------------------------------------------------
-- Une garde est une periode d'activite de l'officine, bornee a l'HEURE
-- pres : une garde va typiquement de 20h a 8h le lendemain. C'est cette
-- precision qui justifie la table.
--
-- Aucun indicateur n'est stocke ici. Le chiffre d'affaires, les produits
-- vendus et les tranches horaires sont recalcules depuis les ventes a
-- chaque consultation : les figer les desynchroniserait des donnees
-- operationnelles des la premiere annulation de vente.
-- =====================================================================

CREATE TABLE IF NOT EXISTS `garde` (
    `id`         VARCHAR(50)  NOT NULL,
    `libelle`    VARCHAR(120) NOT NULL,
    `date_debut` DATETIME     NOT NULL,
    `date_fin`   DATETIME     NOT NULL,
    `created_at` DATETIME     NOT NULL,
    `updated_at` DATETIME     NULL,
    PRIMARY KEY (`id`),
    -- Une meme periode EXACTE ne doit pas etre enregistree deux fois : deux
    -- gardes identiques donneraient deux fois les memes chiffres dans une
    -- comparaison, sans qu'on comprenne pourquoi.
    UNIQUE KEY `uk_garde_periode` (`date_debut`, `date_fin`),
    KEY `idx_garde_debut` (`date_debut`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Privilege du nouveau menu
INSERT IGNORE INTO t_privilege
    (`lg_PRIVELEGE_ID`, `str_NAME`, `str_TYPE`, `str_DESCRIPTION`, `lg_PRIVELEGE_ID_DEP`,
     `dt_CREATED`, `lg_CREATED_BY`, `dt_UPDATED`, `lg_UPDATED_BY`, `str_STATUT`)
VALUES
    ('20260907', 'P_SM_GESTION_GARDES', 'CUSTOMER', 'Gestion des gardes',
     NULL, NOW(), NULL, NULL, NULL, 'enable');

-- Sous-menu, place sous le meme menu parent que la classification ABC
INSERT IGNORE INTO t_sous_menu
    (`lg_SOUS_MENU_ID`, `str_VALUE`, `str_IMAGE_CSS`, `str_DESCRIPTION`, `str_COMPOSANT`,
     `lg_MENU_ID`, `int_PRIORITY`, `str_URL`, `str_Status`, `P_KEY`, `dt_CREATED`, `dt_UPDATED`, `icon_CLASS`)
SELECT
    '20260907', 'Gestion des gardes', NULL, 'Periodes de garde et leur analyse', 'gardemanager',
    sm.lg_MENU_ID, 99, NULL, 'enable', 'P_SM_GESTION_GARDES', NOW(), NULL, ''
FROM t_sous_menu sm
WHERE sm.str_COMPOSANT = 'abcmanager'
LIMIT 1;

-- Visibilite : meme perimetre d'utilisateurs que la classification ABC.
INSERT INTO t_role_privelege
    (`lg_ROLE_PRIVILEGE`, `lg_ROLE_ID`, `lg_PRIVILEGE_ID`, `dt_CREATED`, `dt_UPDATED`)
SELECT LEFT(UUID(), 40), rp.lg_ROLE_ID, '20260907', NOW(), NOW()
FROM t_role_privelege rp
JOIN t_privilege p  ON rp.lg_PRIVILEGE_ID = p.lg_PRIVELEGE_ID
JOIN t_sous_menu sm ON sm.P_KEY = p.str_NAME
WHERE sm.str_COMPOSANT = 'abcmanager'
  AND rp.lg_ROLE_ID NOT IN (
      SELECT rp2.lg_ROLE_ID FROM t_role_privelege rp2 WHERE rp2.lg_PRIVILEGE_ID = '20260907'
  );
