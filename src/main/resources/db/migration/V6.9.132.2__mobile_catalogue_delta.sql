-- H5 (Prestige Mobile) : mise a jour differentielle du catalogue (GET v1/app-vente/catalogue/changements).
--
-- La route cherche les produits modifies depuis un instant donne dans quatre colonnes de date. Sans index, chaque
-- appel (toutes les 5 minutes par telephone) balaierait t_famille, t_famille_stock, HMvtProduit (souvent des millions
-- de lignes) et t_mouvementprice. Ces index rendent l'appel proportionnel au nombre de changements.
--
-- Aucune table, colonne ni donnee modifiee : seuls des index sont ajoutes. Rejouable (index cree s'il manque).
-- Numero 6.9.132.2, juste apres 6.9.132.1 (H4) et au-dessus de la derniere migration amont 6.9.132.
-- Sur une tres grosse table HMvtProduit, la creation de l'index peut prendre quelques minutes (InnoDB la fait sans
-- bloquer les ecritures).

SET @existe := (SELECT COUNT(*) FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_famille'
                  AND INDEX_NAME = 'idx_famille_dt_updated');
SET @sql := IF(@existe = 0, 'CREATE INDEX idx_famille_dt_updated ON t_famille (dt_UPDATED)',
    'SELECT ''idx_famille_dt_updated deja present''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe := (SELECT COUNT(*) FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_famille_stock'
                  AND INDEX_NAME = 'idx_famille_stock_dt_updated');
SET @sql := IF(@existe = 0,
    'CREATE INDEX idx_famille_stock_dt_updated ON t_famille_stock (dt_UPDATED, lg_EMPLACEMENT_ID)',
    'SELECT ''idx_famille_stock_dt_updated deja present''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe := (SELECT COUNT(*) FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'hmvtproduit'
                  AND INDEX_NAME = 'idx_hmvt_created_at');
SET @sql := IF(@existe = 0, 'CREATE INDEX idx_hmvt_created_at ON HMvtProduit (createdAt, lg_EMPLACEMENT_ID)',
    'SELECT ''idx_hmvt_created_at deja present''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @existe := (SELECT COUNT(*) FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_mouvementprice'
                  AND INDEX_NAME = 'idx_mouvementprice_dt_created');
SET @sql := IF(@existe = 0, 'CREATE INDEX idx_mouvementprice_dt_created ON t_mouvementprice (dt_CREATED)',
    'SELECT ''idx_mouvementprice_dt_created deja present''');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
