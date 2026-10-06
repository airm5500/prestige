-- Fiche article (plan d'octobre, section 6) : localisation dans la RESERVE (la reserve n'en avait aucune). Le colisage
-- (int_COLISAGE) a ete ajoute par V6.9.75. Colonne nullable : rien d'existant n'est modifie.
ALTER TABLE `t_famille` ADD COLUMN IF NOT EXISTS `str_CODE_GEO_ARTICLE_RESERVE` VARCHAR(50) NULL;
