-- Index de lecture pour l'OUVERTURE d'un inventaire (contenu de la fiche).
--
-- Les requetes de cet ecran joignent t_inventaire_famille a t_famille_grossiste sur le produit,
-- filtrent sur l'inventaire et sur str_UPDATED_ID, puis dedoublonnent. Le cout mesure est un cout
-- FIXE d'environ une seconde, identique pour un inventaire de 344 lignes et un de 8086 : il ne
-- vient donc pas du volume ramene mais du chemin d'acces, que ces index ouvrent.
--
-- Aucune donnee modifiee, aucun resultat change : un index ne fait qu'accelerer une lecture. Ils
-- peuvent etre supprimes a tout moment sans effet fonctionnel.
--
-- Creation en ALGORITHM=INPLACE, LOCK=NONE : les ecritures restent possibles pendant l'operation.
-- Chaque bloc verifie qu'aucun index ne commence deja par la meme colonne, quel que soit son nom :
-- le script est rejouable et n'echoue pas sur une base ou l'index a deja ete pose a la main.

-- ------------------------------------------------------------- t_inventaire_famille
-- Lignes d'un inventaire : point d'entree de toutes les requetes de la fiche.
SET @existe := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_inventaire_famille'
       AND SEQ_IN_INDEX = 1 AND COLUMN_NAME = 'lg_INVENTAIRE_ID');
SET @sql := IF(@existe = 0,
    'ALTER TABLE `t_inventaire_famille` ADD INDEX `ix_inv_famille_inventaire` (`lg_INVENTAIRE_ID`, `lg_FAMILLE_ID`), ALGORITHM=INPLACE, LOCK=NONE',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- --------------------------------------------------------------- t_famille_grossiste
-- Jointure produit -> article grossiste, refaite pour chaque ligne affichee.
SET @existe := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_famille_grossiste'
       AND SEQ_IN_INDEX = 1 AND COLUMN_NAME = 'lg_FAMILLE_ID');
SET @sql := IF(@existe = 0,
    'ALTER TABLE `t_famille_grossiste` ADD INDEX `ix_famille_grossiste_famille` (`lg_FAMILLE_ID`, `str_CODE_ARTICLE`), ALGORITHM=INPLACE, LOCK=NONE',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
