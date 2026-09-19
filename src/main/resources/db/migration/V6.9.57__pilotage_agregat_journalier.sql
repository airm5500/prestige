-- =====================================================================
-- Evolution 6, point 1 : AGREGAT JOURNALIER du mois en cours.
--
-- POURQUOI CETTE TABLE
--
-- Les mois clos sont calcules une fois (V6.9.53). Restait le MOIS EN
-- COURS : il etait recalcule en entier toutes les dix minutes, en
-- relisant tout le detail des ventes du mois. Le 19 du mois, cela veut
-- dire relire dix-neuf jours de ventes - et le 31, trente et un. Le
-- menu devenait donc plus lent a mesure que le mois avancait, ce que
-- l'officine a decrit ainsi : « c'est nettement mieux mais encore lent
-- pour des donnees deja sauvegardees, juste a afficher ».
--
-- LA REGLE : UNE JOURNEE CLOSE NE CHANGE PLUS. Le mois en cours devient
-- donc « les journees deja calculees, plus celle d'aujourd'hui ». Quel
-- que soit le jour du mois, le calcul ne porte que sur une journee.
--
-- C'est la meme idee que pour les mois, appliquee d'un cran plus fin, et
-- c'est aussi la maniere dont la balance vente-caisse est rapide : elle
-- lit une ligne par vente deja ecrite, au lieu de refaire la somme du
-- detail.
--
-- Les journees des mois clos ne sont pas conservees : le mois clos porte
-- deja son total. Seules les journees du mois en cours (et du mois
-- precedent tant qu'il reste sous surveillance) vivent ici.
-- =====================================================================
CREATE TABLE IF NOT EXISTS `pilotage_agregat_jour` (
    `dt_JOUR` DATE NOT NULL,
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
    `int_ANNULE_ESPECE` BIGINT(20) NOT NULL DEFAULT 0,
    `int_ENTREES_STOCK` BIGINT(20) NOT NULL DEFAULT 0,
    `int_SORTIES_STOCK` BIGINT(20) NOT NULL DEFAULT 0,
    -- Une journee est CLOSE des que le jour suivant a commence : elle ne
    -- sera plus recalculee, sauf demande expresse (bouton « Recalculer »).
    `b_CLOS` TINYINT(1) NOT NULL DEFAULT 0,
    `dt_CALCUL` DATETIME NOT NULL,
    PRIMARY KEY (`dt_JOUR`, `lg_EMPLACEMENT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
