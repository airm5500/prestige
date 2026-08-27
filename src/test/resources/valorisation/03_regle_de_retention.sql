USE prestige_test;
DELETE FROM stock_snapshot_day;

-- Calendrier d'essai representatif d'une officine reelle :
--   2025-11 : mois complet (1 au 30)
--   2025-12 : la pharmacie ferme du 30 au 31 -> dernier releve le 29
--   2026-02 : mois de 28 jours
--   2026-08 : releves recents (fenetre glissante)
INSERT INTO stock_snapshot_day (stock_of_day, magasin_id, produit_id, qty, prix_paf, prix_uni)
WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i < 31)
SELECT 20251100 + i, '1', 'p1', 1, 36, 100 FROM n WHERE i <= 30
UNION ALL
SELECT 20251200 + i, '1', 'p1', 1, 36, 100 FROM n WHERE i <= 29   -- fermeture les 30 et 31
UNION ALL
SELECT 20260200 + i, '1', 'p1', 1, 36, 100 FROM n WHERE i <= 28   -- fevrier
UNION ALL
SELECT 20260800 + i, '1', 'p1', 1, 36, 100 FROM n WHERE i BETWEEN 15 AND 17;

SELECT 'AVANT PURGE' AS etape, COUNT(*) AS lignes FROM stock_snapshot_day;

-- Clotures calculees une fois (StockSnapshotPurgeService.journeesDeCloture)
CREATE TEMPORARY TABLE clotures AS
SELECT MAX(stock_of_day) AS jour FROM stock_snapshot_day GROUP BY stock_of_day DIV 100
UNION
SELECT MIN(stock_of_day) FROM stock_snapshot_day GROUP BY stock_of_day DIV 100;

SELECT 'CLOTURES RETENUES' AS etape, GROUP_CONCAT(jour ORDER BY jour) AS journees FROM clotures;

-- Purge par tranches (limite = 2026-08-17 moins 90 jours = 20260519)
DELETE FROM stock_snapshot_day
 WHERE stock_of_day < 20260519
   AND stock_of_day NOT IN (SELECT jour FROM clotures)
 LIMIT 5000;

SELECT 'APRES PURGE' AS etape, COUNT(*) AS lignes FROM stock_snapshot_day;
SELECT 'JOURNEES CONSERVEES' AS etape, GROUP_CONCAT(stock_of_day ORDER BY stock_of_day) AS journees
FROM stock_snapshot_day;
