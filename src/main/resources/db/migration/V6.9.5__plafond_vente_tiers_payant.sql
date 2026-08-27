-- =====================================================================
-- Tiers payants - Plafond par vente sur la fiche de l'organisme
-- ---------------------------------------------------------------------
-- Le plafond par vente se saisissait client par client (zone "Plafond
-- vente" du lien client/tiers payant). La fiche du tiers payant porte
-- desormais sa propre valeur : elle sert de valeur predefinie a tous
-- les nouveaux clients lies a l'organisme, et sa modification est
-- propagee aux liens actifs existants.
--
-- 0 = aucun plafond predefini. Ce plafond limite la part prise en
-- charge sur UNE vente ; il est distinct de dbl_PLAFOND_CREDIT, qui
-- controle l'encours global de l'organisme.
-- =====================================================================

ALTER TABLE `t_tiers_payant`
    ADD COLUMN IF NOT EXISTS `dbl_PLAFOND_VENTE` double(12,2) NULL DEFAULT 0 AFTER `dbl_PLAFOND_CREDIT`;
