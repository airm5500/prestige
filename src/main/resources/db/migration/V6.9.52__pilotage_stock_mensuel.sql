-- =====================================================================
-- Evolution 6, point 1 : PHOTO MENSUELLE DU STOCK pour l'onglet Stock du
-- menu de pilotage.
--
-- POURQUOI CETTE TABLE EXISTE
--
-- Le logiciel connait le stock D'AUJOURD'HUI (t_famille_stock), mais il
-- ne garde pas ce qu'il valait le mois dernier. J'avais annonce que
-- l'historique des mouvements (HMvtProduit) permettrait de le
-- reconstituer a n'importe quelle date : verification faite sur la base
-- de l'officine, cette table est VIDE - comme t_mouvement,
-- t_mouvement_snapshot et stock_snapshot. Il n'y a donc rien a
-- reconstituer a partir d'elles.
--
-- Ce qui reste possible, et qui est fait :
--
-- 1. RECONSTITUER A REBOURS depuis l'etat du jour, avec les entrees
--    (lignes de bons de livraison) et les sorties (lignes de ventes) de
--    chaque mois, qui sont toutes les deux presentes. C'est une
--    reconstitution : les regularisations d'inventaire n'y figurent pas,
--    et l'ecran le DIT.
--
-- 2. PHOTOGRAPHIER le stock chaque mois a partir de maintenant, dans
--    cette table. A partir de la premiere photo, l'evolution n'est plus
--    reconstituee mais mesuree - et la photo l'emporte toujours sur la
--    reconstitution.
--
-- Une ligne par mois, et le mois est la cle : on ne peut pas ecrire deux
-- photos du meme mois, quel que soit le nombre de fois ou l'ecran est
-- ouvert.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `pilotage_stock_mensuel` (
    `str_MOIS` VARCHAR(7) NOT NULL COMMENT 'AAAA-MM',
    `int_UNITES` BIGINT(20) NOT NULL DEFAULT 0,
    `int_VALEUR_ACHAT` BIGINT(20) NOT NULL DEFAULT 0,
    `int_VALEUR_VENTE` BIGINT(20) NOT NULL DEFAULT 0,
    `int_REFERENCES` INT(11) NOT NULL DEFAULT 0,
    `int_RUPTURES` INT(11) NOT NULL DEFAULT 0,
    `int_NEGATIFS` INT(11) NOT NULL DEFAULT 0,
    `int_SOUS_SEUIL` INT(11) NOT NULL DEFAULT 0,
    `lg_EMPLACEMENT_ID` VARCHAR(40) NOT NULL DEFAULT '1',
    `dt_CREATED` DATETIME NOT NULL,
    PRIMARY KEY (`str_MOIS`, `lg_EMPLACEMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
