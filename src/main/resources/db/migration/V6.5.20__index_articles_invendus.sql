-- Index de lecture pour la liste et l'edition des ARTICLES INVENDUS.
--
-- La regle "non vendu pendant N mois apres la derniere entree" et le remplissage des colonnes
-- (derniere vente, derniere entree) interrogent deux tables sur le meme motif : "pour cet
-- emplacement et ce produit, quelle est la date la plus recente ?". Sans index adapte, MySQL
-- balaie l'historique complet a chaque affichage - plus de dix secondes constatees sur un parc
-- de onze cents produits.
--
-- Ces index ne modifient AUCUNE donnee et ne changent AUCUN resultat : ils ne font qu'ouvrir un
-- chemin d'acces. Ils peuvent etre supprimes a tout moment sans effet fonctionnel.
--
-- La creation est faite en ALGORITHM=INPLACE, LOCK=NONE : les ecritures restent possibles
-- pendant l'operation. Sur de grosses tables elle prend neanmoins plusieurs minutes et consomme
-- de l'espace disque ; a jouer de preference hors des heures de forte activite.
--
-- Le bloc dynamique ne recree pas un index deja present, quel que soit son nom, en verifiant la
-- premiere colonne indexee : le script reste rejouable et n'echoue pas sur une base ou
-- l'exploitant a deja pose l'index a la main.

-- --------------------------------------------------------------------------- t_warehouse
-- Entrees en stock : recherche de la derniere entree par produit pour un emplacement.
SET @existe := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_warehouse'
       AND SEQ_IN_INDEX = 1 AND COLUMN_NAME = 'lg_USER_ID');
SET @sql := IF(@existe = 0,
    'ALTER TABLE `t_warehouse` ADD INDEX `ix_warehouse_user_famille_date` (`lg_USER_ID`, `lg_FAMILLE_ID`, `dt_CREATED`), ALGORITHM=INPLACE, LOCK=NONE',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------- t_preenregistrement_detail
-- Lignes de vente : recherche des ventes d'un produit (existence, et date la plus recente).
SET @existe := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_preenregistrement_detail'
       AND SEQ_IN_INDEX = 1 AND COLUMN_NAME = 'lg_FAMILLE_ID');
SET @sql := IF(@existe = 0,
    'ALTER TABLE `t_preenregistrement_detail` ADD INDEX `ix_preenr_detail_famille` (`lg_FAMILLE_ID`, `lg_PREENREGISTREMENT_ID`), ALGORITHM=INPLACE, LOCK=NONE',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------------ t_preenregistrement
-- Ventes : filtrage par statut puis lecture de la date de mise a jour.
SET @existe := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_preenregistrement'
       AND SEQ_IN_INDEX = 1 AND COLUMN_NAME = 'str_STATUT');
SET @sql := IF(@existe = 0,
    'ALTER TABLE `t_preenregistrement` ADD INDEX `ix_preenr_statut_date` (`str_STATUT`, `dt_UPDATED`), ALGORITHM=INPLACE, LOCK=NONE',
    'DO 0');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
