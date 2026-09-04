-- =====================================================================
-- Surveillance des jobs : parametre gouvernant
-- ---------------------------------------------------------------------
-- Le moniteur de fraicheur alertait toutes les heures « job planifie en
-- retard » pour des traitements VOLONTAIREMENT desactives : un job qu'on
-- a choisi de ne pas faire tourner n'a evidemment jamais de dernier
-- passage. Sur une officine ou la valorisation journaliere n'est pas
-- utilisee, cela representait l'essentiel des alertes du journal et
-- noyait les incidents reels.
--
-- parametre_actif nomme la cle de t_parameters qui commande le job. Quand
-- elle est renseignee et que le parametre vaut 0, le moniteur passe son
-- chemin au lieu d'alerter. Colonne NULL pour les jobs sans interrupteur :
-- comportement inchange.
-- =====================================================================

ALTER TABLE `t_support_job`
    ADD COLUMN `parametre_actif` VARCHAR(60) NULL DEFAULT NULL AFTER `requete_sql`;

-- Les trois traitements de valorisation dependent du meme interrupteur.
UPDATE t_support_job
   SET parametre_actif = 'KEY_VALORISATION_JOURNALIERE'
 WHERE code IN ('VALORISATION_QUOTIDIENNE', 'SNAPSHOT_STOCK', 'PURGE_VALORISATION');
