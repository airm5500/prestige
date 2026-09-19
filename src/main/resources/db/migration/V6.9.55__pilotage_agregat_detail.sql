-- =====================================================================
-- Evolution 6, point 1 : AGREGATS DE DETAIL du menu de pilotage.
--
-- POURQUOI CES DEUX TABLES
--
-- Les agregats mensuels (V6.9.53) ont supprime la relecture du detail
-- des ventes pour les grandeurs a colonnes fixes : chiffre d'affaires,
-- marge, achats, encaisse. Restaient DEUX lectures qui parcourent encore
-- toute la fenetre affichee, et ce sont les deux dernieres :
--
--   1. LE MIX DE REGLEMENT de l'onglet Ventes. Une colonne par mode
--      reellement encaisse - especes, Wave, Orange, MTN... L'officine
--      peut en activer un nouveau demain : le nombre de colonnes n'est
--      pas connu a l'avance, donc le mix ne tient pas dans la table
--      mensuelle. Il lui faut sa propre table, une ligne par mois ET
--      par mode.
--
--   2. LES ACHATS PAR GROSSISTE de l'onglet Achats, pour la meme raison :
--      une colonne par grossiste qui a reellement livre.
--
-- Les deux sont ecrites en meme temps que l'agregat du mois, et suivent
-- donc exactement la meme regle : un mois clos est calcule une fois, le
-- mois en cours est rafraichi, le bouton « Recalculer » reprend tout.
--
-- Le filtre par famille ou par emplacement de l'onglet Achats, lui,
-- continue de passer par les lignes de bons de livraison : un agregat ne
-- peut pas porter toutes les combinaisons de filtres possibles, et ce
-- filtre est rarement utilise.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `pilotage_agregat_reglement` (
    `str_MOIS` VARCHAR(7) NOT NULL COMMENT 'AAAA-MM',
    `lg_EMPLACEMENT_ID` VARCHAR(40) NOT NULL DEFAULT '1',
    `str_MODE` VARCHAR(100) NOT NULL COMMENT 'libelle du mode de reglement',
    `int_MONTANT` BIGINT(20) NOT NULL DEFAULT 0,
    `dt_CALCUL` DATETIME NOT NULL,
    PRIMARY KEY (`str_MOIS`, `lg_EMPLACEMENT_ID`, `str_MODE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE IF NOT EXISTS `pilotage_agregat_grossiste` (
    `str_MOIS` VARCHAR(7) NOT NULL COMMENT 'AAAA-MM',
    `lg_EMPLACEMENT_ID` VARCHAR(40) NOT NULL DEFAULT '1',
    `lg_GROSSISTE_ID` VARCHAR(40) NOT NULL,
    `str_GROSSISTE` VARCHAR(255) NOT NULL,
    `int_MONTANT` BIGINT(20) NOT NULL DEFAULT 0,
    `int_NB_BONS` INT(11) NOT NULL DEFAULT 0,
    `dt_CALCUL` DATETIME NOT NULL,
    PRIMARY KEY (`str_MOIS`, `lg_EMPLACEMENT_ID`, `lg_GROSSISTE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Les agregats mensuels existants n'ont pas encore leur detail : ils
-- sont vides pour etre recalcules, detail compris, a la prochaine
-- ouverture de l'ecran.
TRUNCATE TABLE `pilotage_agregat_mensuel`;
