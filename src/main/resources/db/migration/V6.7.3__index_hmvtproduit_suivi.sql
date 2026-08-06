-- Index de lecture du suivi mouvement article (ecrans 2 et complet).
--
-- La table HMvtProduit n'etait indexee que sur (mvtdate) et (pkey). Or les lectures du suivi
-- filtrent toujours par article + emplacement + periode : sans index composite, chaque ligne de
-- la grille rebalaye toutes les ecritures de la periode. L'index ci-dessous sert la requete
-- d'agregation par article des deux ecrans et la fenetre "Voir detail".
-- InnoDB cree l'index en ligne (ALGORITHM=INPLACE) : pas de verrou bloquant long attendu.
CREATE INDEX IF NOT EXISTS `idx_hmvt_fam_empl_date`
    ON `HMvtProduit` (`lg_FAMILLE_ID`, `lg_EMPLACEMENT_ID`, `mvtdate`);
