-- Lenteurs d'appaul (12/11) : derniere entree en stock de la fiche article et de son apercu, lue directement
-- (article, mouvement « entree en stock », date) au lieu de relire chaque ligne de BL de l'article.
-- 6 s sur 3,2 millions de mouvements (copie d'appaul), sans bloquer la table.
ALTER TABLE hmvtproduit ADD INDEX IF NOT EXISTS idx_hmvt_fam_type_created (lg_FAMILLE_ID, typeMvt, createdAt),
    ALGORITHM=INPLACE, LOCK=NONE;
