-- =====================================================================
-- Evolution 6, point 1 : AGREGATS MENSUELS du menu de pilotage.
--
-- POURQUOI CETTE TABLE EXISTE
--
-- Retour de l'officine du 19/09 : l'ecran met 17 a 71 secondes par
-- onglet, et rend parfois une erreur 500. Sur le banc de developpement,
-- la meme requete repond en trois secondes : la base de l'officine porte
-- dix a vingt fois plus de lignes (26 000 clients servis par mois contre
-- 2 700). Le calcul qui tenait sur le banc ne tient pas en exploitation.
--
-- Ce que ces requetes faisaient : relire, a CHAQUE ouverture d'onglet,
-- douze a vingt-quatre mois de DETAIL de ventes pour en refaire la
-- somme. Or un mois clos ne change plus jamais. Le recalculer a chaque
-- clic est un gaspillage qui grandit avec l'historique de l'officine -
-- autrement dit, l'ecran devenait plus lent chaque mois.
--
-- Desormais chaque mois est agrege UNE FOIS et conserve ici. Le mois en
-- cours, lui, est rafraichi tant qu'il n'est pas clos.
--
-- Les colonnes sont exactement les grandeurs dont les onglets ont
-- besoin, calculees avec les MEMES definitions qu'avant (voir
-- PilotageSql) : l'ecran ne change pas de chiffres, il change de vitesse.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `pilotage_agregat_mensuel` (
    `str_MOIS` VARCHAR(7) NOT NULL COMMENT 'AAAA-MM',
    `lg_EMPLACEMENT_ID` VARCHAR(40) NOT NULL DEFAULT '1',
    `int_CA_TTC` BIGINT(20) NOT NULL DEFAULT 0,
    `int_NB_VENTES` INT(11) NOT NULL DEFAULT 0,
    `int_REMISES` BIGINT(20) NOT NULL DEFAULT 0,
    `int_PART_TP` BIGINT(20) NOT NULL DEFAULT 0,
    `int_CA_HT` BIGINT(20) NOT NULL DEFAULT 0,
    `int_COUT_ACHAT` BIGINT(20) NOT NULL DEFAULT 0,
    `int_ACHAT_TTC` BIGINT(20) NOT NULL DEFAULT 0,
    `int_NB_BONS` INT(11) NOT NULL DEFAULT 0,
    `int_ENCAISSE` BIGINT(20) NOT NULL DEFAULT 0,
    `int_NB_ANNULEES` INT(11) NOT NULL DEFAULT 0,
    `int_MONTANT_ANNULE` BIGINT(20) NOT NULL DEFAULT 0,
    `int_ENTREES_STOCK` BIGINT(20) NOT NULL DEFAULT 0,
    `int_SORTIES_STOCK` BIGINT(20) NOT NULL DEFAULT 0,
    -- Un mois CLOS ne sera plus jamais recalcule ; le mois en cours l'est
    -- a la demande, au plus une fois toutes les dix minutes.
    `b_CLOS` TINYINT(1) NOT NULL DEFAULT 0,
    `dt_CALCUL` DATETIME NOT NULL,
    PRIMARY KEY (`str_MOIS`, `lg_EMPLACEMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
