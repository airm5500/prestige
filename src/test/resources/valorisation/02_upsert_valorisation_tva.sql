USE prestige_test;

-- ============================================================
-- 1. UPSERT IDEMPOTENT (StockSnapshotDayService.executerUpsert)
-- ============================================================
INSERT INTO stock_snapshot_day (stock_of_day, magasin_id, produit_id, qty, qty_reserve, prix_paf, prix_uni, prix_moyen_pondere, valeur_tva)
VALUES (20260815,'1','p1',10,2,36,100,36,18),
       (20260815,'1','p2', 5,0,500,900,500,0),
       (20260815,'1','p3',99,0,10,20,10,18)
ON DUPLICATE KEY UPDATE qty=VALUES(qty), qty_reserve=VALUES(qty_reserve), prix_paf=VALUES(prix_paf),
       prix_uni=VALUES(prix_uni), prix_moyen_pondere=VALUES(prix_moyen_pondere), valeur_tva=VALUES(valeur_tva),
       updated_at=CURRENT_TIMESTAMP;

-- Relance du meme jour avec une quantite corrigee : doit mettre a jour, pas dupliquer.
INSERT INTO stock_snapshot_day (stock_of_day, magasin_id, produit_id, qty, qty_reserve, prix_paf, prix_uni, prix_moyen_pondere, valeur_tva)
VALUES (20260815,'1','p1',77,3,36,100,36,18)
ON DUPLICATE KEY UPDATE qty=VALUES(qty), qty_reserve=VALUES(qty_reserve), prix_paf=VALUES(prix_paf),
       prix_uni=VALUES(prix_uni), prix_moyen_pondere=VALUES(prix_moyen_pondere), valeur_tva=VALUES(valeur_tva),
       updated_at=CURRENT_TIMESTAMP;

SELECT '1. IDEMPOTENCE' AS test,
       (SELECT COUNT(*) FROM stock_snapshot_day WHERE stock_of_day=20260815) AS lignes_attendu_3,
       (SELECT qty FROM stock_snapshot_day WHERE stock_of_day=20260815 AND produit_id='p1') AS qty_p1_attendu_77,
       (SELECT qty_reserve FROM stock_snapshot_day WHERE stock_of_day=20260815 AND produit_id='p1') AS reserve_p1_attendu_3;

-- ============================================================
-- 2. VALORISATION GLOBALE (getValeurStockFromReleve, mode 2 sans filtre)
--    p1 : 77 rayon + 3 reserve, paf 36, uni 100
--    p2 :  5 rayon + 0 reserve, paf 500, uni 900
--    p3 : str_STATUT='disable' -> doit etre exclu
-- ============================================================
SELECT '2. VALORISATION' AS test,
       COALESCE(SUM(s.prix_paf*s.qty),0)         AS rayon_achat_attendu_5272,
       COALESCE(SUM(s.prix_uni*s.qty),0)         AS rayon_vente_attendu_12200,
       COALESCE(SUM(s.prix_paf*s.qty_reserve),0) AS reserve_achat_attendu_108,
       COALESCE(SUM(s.prix_uni*s.qty_reserve),0) AS reserve_vente_attendu_300
FROM stock_snapshot_day s, t_famille f, t_zone_geographique g
WHERE f.lg_FAMILLE_ID=s.produit_id AND f.str_STATUT='enable' AND s.stock_of_day=20260815
  AND s.magasin_id='1' AND f.lg_ZONE_GEO_ID=g.lg_ZONE_GEO_ID;

-- ============================================================
-- 3. ETAT DETAILLE GROUPE PAR RAYON (valorisationDepuisReleve, mode 2)
-- ============================================================
SELECT '3. GROUPES' AS test, g.str_LIBELLEE AS libelle, g.str_CODE AS code,
       SUM(s.prix_paf*s.qty) AS achat, SUM(s.qty) AS qty
FROM stock_snapshot_day s, t_famille f, t_zone_geographique g
WHERE f.lg_FAMILLE_ID=s.produit_id AND f.str_STATUT='enable' AND s.stock_of_day=20260815
  AND s.magasin_id='1' AND f.lg_ZONE_GEO_ID=g.lg_ZONE_GEO_ID
GROUP BY g.lg_ZONE_GEO_ID ORDER BY g.str_CODE ASC;

-- ============================================================
-- 4. TVA FIGEE AVEC REPLI (tauxTvaReleve)
--    p1 : valeur_tva=18 figee   -> 18
--    p2 : valeur_tva=0 (reprise JSON) -> repli sur la fiche produit, tva0 = 0
-- ============================================================
SELECT '4. TVA' AS test, COALESCE(NULLIF(s.valeur_tva,0), v.int_VALUE) AS taux,
       SUM(s.prix_paf*s.qty) AS achat
FROM stock_snapshot_day s, t_famille f, t_code_tva v
WHERE f.lg_FAMILLE_ID=s.produit_id AND f.str_STATUT='enable' AND s.stock_of_day=20260815
  AND s.magasin_id='1' AND v.lg_CODE_TVA_ID=f.lg_CODE_TVA_ID
GROUP BY COALESCE(NULLIF(s.valeur_tva,0), v.int_VALUE);
