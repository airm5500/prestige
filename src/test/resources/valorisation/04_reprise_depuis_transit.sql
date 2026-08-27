USE prestige_test;

-- Archive relationnelle : ce que le vidage supprimait au profit du JSON.
-- Ni colonne de reserve, mais un PMP et un taux de TVA figes a la date reelle.
DROP TABLE IF EXISTS t_stock_snapshot;
CREATE TABLE t_stock_snapshot (
  id date NOT NULL,
  prixPaf int DEFAULT NULL,
  magasin varchar(40) NOT NULL,
  prixTarif int DEFAULT NULL,
  prixUni int DEFAULT NULL,
  qty int DEFAULT NULL,
  valeurTva int DEFAULT NULL,
  familleId varchar(40) NOT NULL,
  prix_moyent_pondere int NOT NULL DEFAULT 0,
  PRIMARY KEY (id, familleId, magasin)
) ENGINE=InnoDB;

INSERT INTO t_stock_snapshot (id, prixPaf, magasin, prixTarif, prixUni, qty, valeurTva, familleId, prix_moyent_pondere)
VALUES ('2024-01-02', 657, '1', 0, 990, 12, 18, 'p1', 640),
       ('2024-01-02', 2755, '1', 0, 4190, 5, 0,  'p2', 2700);

DELETE FROM stock_snapshot_day;

-- Etat de depart : ce que l'ancien vidage avait ecrit. Reserve du jour appliquee a 2024,
-- PMP ecrase par le prix d'achat, TVA perdue.
INSERT INTO stock_snapshot_day (stock_of_day, magasin_id, produit_id, qty, qty_reserve, prix_paf, prix_uni, prix_moyen_pondere, valeur_tva)
VALUES (20240102, '1', 'p1', 12, 347, 657, 990, 657, 0),
       (20240102, '1', 'p2',  5,  18, 2755, 4190, 2755, 0);

SELECT '0. AVANT' AS etape, produit_id, qty_reserve, prix_moyen_pondere, valeur_tva
  FROM stock_snapshot_day WHERE stock_of_day = 20240102 ORDER BY produit_id;

-- Reprise d'une journee anterieure a l'activation de la reserve (19/07/2026) :
-- reserve remise a zero, PMP et TVA restaures depuis l'archive.
INSERT INTO stock_snapshot_day (stock_of_day, magasin_id, produit_id, qty, qty_reserve, prix_paf, prix_uni, prix_moyen_pondere, valeur_tva)
SELECT YEAR(t.id)*10000 + MONTH(t.id)*100 + DAY(t.id), t.magasin, t.familleId,
       COALESCE(t.qty,0), 0, COALESCE(t.prixPaf,0), COALESCE(t.prixUni,0),
       COALESCE(t.prix_moyent_pondere,0), COALESCE(t.valeurTva,0)
  FROM t_stock_snapshot t
 WHERE YEAR(t.id)*10000 + MONTH(t.id)*100 + DAY(t.id) = 20240102
ON DUPLICATE KEY UPDATE qty = VALUES(qty), qty_reserve = 0,
       prix_paf = VALUES(prix_paf), prix_uni = VALUES(prix_uni),
       prix_moyen_pondere = VALUES(prix_moyen_pondere), valeur_tva = VALUES(valeur_tva),
       updated_at = CURRENT_TIMESTAMP;

SELECT '1. APRES REPRISE' AS etape, produit_id,
       qty_reserve AS reserve_attendu_0,
       prix_moyen_pondere AS pmp_attendu_640_puis_2700,
       valeur_tva AS tva_attendu_18_puis_0
  FROM stock_snapshot_day WHERE stock_of_day = 20240102 ORDER BY produit_id;

-- Idempotence : rejouer la meme reprise ne cree aucun doublon.
INSERT INTO stock_snapshot_day (stock_of_day, magasin_id, produit_id, qty, qty_reserve, prix_paf, prix_uni, prix_moyen_pondere, valeur_tva)
SELECT YEAR(t.id)*10000 + MONTH(t.id)*100 + DAY(t.id), t.magasin, t.familleId,
       COALESCE(t.qty,0), 0, COALESCE(t.prixPaf,0), COALESCE(t.prixUni,0),
       COALESCE(t.prix_moyent_pondere,0), COALESCE(t.valeurTva,0)
  FROM t_stock_snapshot t
 WHERE YEAR(t.id)*10000 + MONTH(t.id)*100 + DAY(t.id) = 20240102
ON DUPLICATE KEY UPDATE qty = VALUES(qty), qty_reserve = 0, prix_paf = VALUES(prix_paf),
       prix_uni = VALUES(prix_uni), prix_moyen_pondere = VALUES(prix_moyen_pondere),
       valeur_tva = VALUES(valeur_tva), updated_at = CURRENT_TIMESTAMP;

SELECT '2. IDEMPOTENCE' AS etape, COUNT(*) AS lignes_attendu_2
  FROM stock_snapshot_day WHERE stock_of_day = 20240102;

-- Assainissement : la reserve des journees anterieures a l'activation est remise a zero.
INSERT INTO stock_snapshot_day (stock_of_day, magasin_id, produit_id, qty, qty_reserve, prix_paf, prix_uni, prix_moyen_pondere, valeur_tva)
VALUES (20260601, '1', 'p1', 3, 99, 657, 990, 640, 18),
       (20260801, '1', 'p1', 4, 42, 657, 990, 640, 18);

UPDATE stock_snapshot_day SET qty_reserve = 0
 WHERE stock_of_day < 20260719 AND qty_reserve <> 0 LIMIT 5000;

SELECT '3. ASSAINISSEMENT' AS etape, stock_of_day,
       qty_reserve AS reserve_0_avant_le_19_07_puis_42
  FROM stock_snapshot_day WHERE stock_of_day IN (20260601, 20260801) ORDER BY stock_of_day;
