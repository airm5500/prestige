-- Index de lecture du "Suivi mouvement article complet".
--
-- Toutes les lectures du suivi (agregats par article, detail d'un article, liste des produits ayant
-- bouge) filtrent d'abord par emplacement puis par famille et par periode. La table n'avait d'index
-- que sur (lg_FAMILLE_ID) et (dt_CREATED) : sans index composite, l'agregation d'une page de produits
-- sur une longue periode balaie la table entiere en production.
CREATE INDEX IF NOT EXISTS `idx_mvt_reserve_empl_fam_date`
    ON `t_mouvement_reserve` (`lg_EMPLACEMENT_ID`, `lg_FAMILLE_ID`, `dt_CREATED`);
