-- Diagnostic de la lenteur de l'analyse comparative (3 dernieres annees).
-- A executer sur la base de l'officine :  mysql -u... -p... capitale < diagnostic_analyse_balance.sql > resultat.txt
-- Rien n'est ecrit : uniquement des SELECT / EXPLAIN, chacun chronometre.
-- Chaque requete est jouee telle que l'application l'ecrit (« ACTUEL »), puis avec l'ordre de jointure
-- force a partir des ventes bornees par date (« CANDIDAT ») : memes lignes, meme resultat, plan different.

-- L'emplacement de l'officine : celui de ses utilisateurs actifs (le plus frequent), sinon le premier de t_emplacement.
SET @empl := COALESCE((SELECT u.lg_EMPLACEMENT_ID FROM t_user u WHERE u.str_STATUT = 'enable' AND u.lg_EMPLACEMENT_ID IS NOT NULL GROUP BY u.lg_EMPLACEMENT_ID ORDER BY COUNT(*) DESC LIMIT 1),
                      (SELECT e.lg_EMPLACEMENT_ID FROM t_emplacement e LIMIT 1));
SET @depot := '5';
SET @d1 := '2025-01-01'; SET @d2 := '2025-12-31';   -- une annee
SET @a1 := '2023-01-01'; SET @a2 := '2026-12-31';   -- l'etendue des 3 dernieres annees + en cours

SELECT 'volumes' AS etape, (SELECT COUNT(*) FROM t_preenregistrement) AS ventes, (SELECT COUNT(*) FROM t_preenregistrement_detail) AS details,
       (SELECT COUNT(*) FROM mvttransaction) AS mouvements, (SELECT COUNT(*) FROM vente_reglement) AS reglements, (SELECT COUNT(*) FROM vente_exclu) AS exclues,
       (SELECT COUNT(*) FROM t_preenregistrement p WHERE p.dt_UPDATED >= @d1 AND p.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY)) AS ventes_2025, @empl AS emplacement;

-- ---------------------------------------------------------------- 1. balance d'une annee (requete principale de l'analyse)
SELECT '1a balance 2025 ACTUEL' AS etape;
EXPLAIN SELECT m.typeTransaction AS typeVente, m.typeReglementId AS typeReglement, SUM(m.montant) AS montantTTC, SUM(m.montantNet) AS montantNet, SUM(sqlQ.montantAChat) AS montantAChat, SUM(CASE WHEN p.int_PRICE < 0 OR p.b_IS_CANCEL = 1 THEN 0 ELSE 1 END) AS totalVente
 FROM mvttransaction m, t_preenregistrement p, (SELECT d.lg_PREENREGISTREMENT_ID AS idVente, SUM(d.int_PRICE) AS montantTTCDetatilReal, SUM(d.int_QUANTITY*d.prixAchat) AS montantAChat
   FROM t_preenregistrement_detail d JOIN t_preenregistrement p2 ON p2.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID
   WHERE p2.dt_UPDATED >= @d1 AND p2.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY) GROUP BY d.lg_PREENREGISTREMENT_ID) AS sqlQ
 WHERE sqlQ.idVente = p.lg_PREENREGISTREMENT_ID AND m.pkey = p.lg_PREENREGISTREMENT_ID AND p.dt_UPDATED >= @d1 AND p.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY)
   AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND m.lg_EMPLACEMENT_ID = @empl AND p.imported = 0
   AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) GROUP BY typeVente, typeReglement;
SET @t := NOW(6);
SELECT m.typeTransaction AS typeVente, m.typeReglementId AS typeReglement, SUM(m.montant) AS montantTTC, SUM(m.montantNet) AS montantNet, SUM(sqlQ.montantAChat) AS montantAChat, SUM(CASE WHEN p.int_PRICE < 0 OR p.b_IS_CANCEL = 1 THEN 0 ELSE 1 END) AS totalVente
 FROM mvttransaction m, t_preenregistrement p, (SELECT d.lg_PREENREGISTREMENT_ID AS idVente, SUM(d.int_PRICE) AS montantTTCDetatilReal, SUM(d.int_QUANTITY*d.prixAchat) AS montantAChat
   FROM t_preenregistrement_detail d JOIN t_preenregistrement p2 ON p2.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID
   WHERE p2.dt_UPDATED >= @d1 AND p2.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY) GROUP BY d.lg_PREENREGISTREMENT_ID) AS sqlQ
 WHERE sqlQ.idVente = p.lg_PREENREGISTREMENT_ID AND m.pkey = p.lg_PREENREGISTREMENT_ID AND p.dt_UPDATED >= @d1 AND p.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY)
   AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND m.lg_EMPLACEMENT_ID = @empl AND p.imported = 0
   AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) GROUP BY typeVente, typeReglement;
SELECT '1a duree ms' AS etape, TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000 AS ms;

SELECT '1b balance 2025 CANDIDAT (ventes bornees d abord, STRAIGHT_JOIN)' AS etape;
EXPLAIN SELECT m.typeTransaction AS typeVente, m.typeReglementId AS typeReglement, SUM(m.montant) AS montantTTC, SUM(m.montantNet) AS montantNet, SUM(sqlQ.montantAChat) AS montantAChat, SUM(CASE WHEN p.int_PRICE < 0 OR p.b_IS_CANCEL = 1 THEN 0 ELSE 1 END) AS totalVente
 FROM t_preenregistrement p STRAIGHT_JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID
 STRAIGHT_JOIN (SELECT d.lg_PREENREGISTREMENT_ID AS idVente, SUM(d.int_PRICE) AS montantTTCDetatilReal, SUM(d.int_QUANTITY*d.prixAchat) AS montantAChat
   FROM t_preenregistrement_detail d JOIN t_preenregistrement p2 ON p2.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID
   WHERE p2.dt_UPDATED >= @d1 AND p2.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY) GROUP BY d.lg_PREENREGISTREMENT_ID) AS sqlQ ON sqlQ.idVente = p.lg_PREENREGISTREMENT_ID
 WHERE p.dt_UPDATED >= @d1 AND p.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY)
   AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND m.lg_EMPLACEMENT_ID = @empl AND p.imported = 0
   AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) GROUP BY typeVente, typeReglement;
SET @t := NOW(6);
SELECT m.typeTransaction AS typeVente, m.typeReglementId AS typeReglement, SUM(m.montant) AS montantTTC, SUM(m.montantNet) AS montantNet, SUM(sqlQ.montantAChat) AS montantAChat, SUM(CASE WHEN p.int_PRICE < 0 OR p.b_IS_CANCEL = 1 THEN 0 ELSE 1 END) AS totalVente
 FROM t_preenregistrement p STRAIGHT_JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID
 STRAIGHT_JOIN (SELECT d.lg_PREENREGISTREMENT_ID AS idVente, SUM(d.int_PRICE) AS montantTTCDetatilReal, SUM(d.int_QUANTITY*d.prixAchat) AS montantAChat
   FROM t_preenregistrement_detail d JOIN t_preenregistrement p2 ON p2.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID
   WHERE p2.dt_UPDATED >= @d1 AND p2.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY) GROUP BY d.lg_PREENREGISTREMENT_ID) AS sqlQ ON sqlQ.idVente = p.lg_PREENREGISTREMENT_ID
 WHERE p.dt_UPDATED >= @d1 AND p.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY)
   AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND m.lg_EMPLACEMENT_ID = @empl AND p.imported = 0
   AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) GROUP BY typeVente, typeReglement;
SELECT '1b duree ms' AS etape, TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000 AS ms;

-- ---------------------------------------------------------------- 2. modes de reglement d'une annee
SELECT '2a modes 2025 ACTUEL' AS etape;
EXPLAIN SELECT p.lg_TYPE_VENTE_ID AS typeVente, vr.type_regelement AS typeReglement, SUM(vr.montant) AS montant, COUNT(DISTINCT vr.vente_id) AS ventes
 FROM vente_reglement vr JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = vr.vente_id JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID JOIN t_type_reglement r ON r.lg_TYPE_REGLEMENT_ID = vr.type_regelement
 WHERE p.dt_UPDATED >= @d1 AND p.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY) AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND m.lg_EMPLACEMENT_ID = @empl AND p.imported = 0
   AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) GROUP BY typeReglement, typeVente;
SET @t := NOW(6);
SELECT p.lg_TYPE_VENTE_ID AS typeVente, vr.type_regelement AS typeReglement, SUM(vr.montant) AS montant, COUNT(DISTINCT vr.vente_id) AS ventes
 FROM vente_reglement vr JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = vr.vente_id JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID JOIN t_type_reglement r ON r.lg_TYPE_REGLEMENT_ID = vr.type_regelement
 WHERE p.dt_UPDATED >= @d1 AND p.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY) AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND m.lg_EMPLACEMENT_ID = @empl AND p.imported = 0
   AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) GROUP BY typeReglement, typeVente;
SELECT '2a duree ms' AS etape, TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000 AS ms;

SELECT '2b modes 2025 CANDIDAT' AS etape;
EXPLAIN SELECT p.lg_TYPE_VENTE_ID AS typeVente, vr.type_regelement AS typeReglement, SUM(vr.montant) AS montant, COUNT(DISTINCT vr.vente_id) AS ventes
 FROM t_preenregistrement p STRAIGHT_JOIN vente_reglement vr ON vr.vente_id = p.lg_PREENREGISTREMENT_ID STRAIGHT_JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID STRAIGHT_JOIN t_type_reglement r ON r.lg_TYPE_REGLEMENT_ID = vr.type_regelement
 WHERE p.dt_UPDATED >= @d1 AND p.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY) AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND m.lg_EMPLACEMENT_ID = @empl AND p.imported = 0
   AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) GROUP BY typeReglement, typeVente;
SET @t := NOW(6);
SELECT p.lg_TYPE_VENTE_ID AS typeVente, vr.type_regelement AS typeReglement, SUM(vr.montant) AS montant, COUNT(DISTINCT vr.vente_id) AS ventes
 FROM t_preenregistrement p STRAIGHT_JOIN vente_reglement vr ON vr.vente_id = p.lg_PREENREGISTREMENT_ID STRAIGHT_JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID STRAIGHT_JOIN t_type_reglement r ON r.lg_TYPE_REGLEMENT_ID = vr.type_regelement
 WHERE p.dt_UPDATED >= @d1 AND p.dt_UPDATED < DATE_ADD(@d2, INTERVAL 1 DAY) AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND m.lg_EMPLACEMENT_ID = @empl AND p.imported = 0
   AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) GROUP BY typeReglement, typeVente;
SELECT '2b duree ms' AS etape, TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000 AS ms;

-- ---------------------------------------------------------------- 3. chiffre par jour sur 3 ans (graphique)
SELECT '3a CA par jour 3 ans ACTUEL' AS etape;
EXPLAIN SELECT DATE(p.dt_UPDATED) AS jour, SUM(CASE WHEN d.bool_ACCOUNT THEN d.int_PRICE ELSE 0 END) - SUM(IFNULL(d.int_PRICE_REMISE, 0)) AS montantNet
 FROM t_preenregistrement p JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
 WHERE p.dt_UPDATED >= @a1 AND p.dt_UPDATED < DATE_ADD(@a2, INTERVAL 1 DAY) AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND m.lg_EMPLACEMENT_ID = @empl AND p.imported = 0
   AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) GROUP BY jour ORDER BY jour;
SET @t := NOW(6);
SELECT COUNT(*) AS jours FROM (SELECT DATE(p.dt_UPDATED) AS jour, SUM(CASE WHEN d.bool_ACCOUNT THEN d.int_PRICE ELSE 0 END) - SUM(IFNULL(d.int_PRICE_REMISE, 0)) AS montantNet
 FROM t_preenregistrement p JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
 WHERE p.dt_UPDATED >= @a1 AND p.dt_UPDATED < DATE_ADD(@a2, INTERVAL 1 DAY) AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND m.lg_EMPLACEMENT_ID = @empl AND p.imported = 0
   AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) GROUP BY jour) x;
SELECT '3a duree ms' AS etape, TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000 AS ms;

SELECT '3b CA par jour 3 ans CANDIDAT' AS etape;
SET @t := NOW(6);
SELECT COUNT(*) AS jours FROM (SELECT DATE(p.dt_UPDATED) AS jour, SUM(CASE WHEN d.bool_ACCOUNT THEN d.int_PRICE ELSE 0 END) - SUM(IFNULL(d.int_PRICE_REMISE, 0)) AS montantNet
 FROM t_preenregistrement p STRAIGHT_JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID STRAIGHT_JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
 WHERE p.dt_UPDATED >= @a1 AND p.dt_UPDATED < DATE_ADD(@a2, INTERVAL 1 DAY) AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND m.lg_EMPLACEMENT_ID = @empl AND p.imported = 0
   AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) GROUP BY jour) x;
SELECT '3b duree ms' AS etape, TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000 AS ms;

-- ---------------------------------------------------------------- 4. modes par jour sur 3 ans (graphique especes / mobile)
SELECT '4a modes par jour 3 ans ACTUEL' AS etape;
SET @t := NOW(6);
SELECT COUNT(*) AS lignes FROM (SELECT DATE_FORMAT(p.dt_UPDATED, '%Y-%m-%d') AS mvtDate, vr.type_regelement AS typeReglement, p.lg_TYPE_VENTE_ID AS typeVente, SUM(vr.montant) AS montant
 FROM vente_reglement vr JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = vr.vente_id JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID JOIN t_type_reglement r ON r.lg_TYPE_REGLEMENT_ID = vr.type_regelement
 WHERE p.dt_UPDATED >= @a1 AND p.dt_UPDATED < DATE_ADD(@a2, INTERVAL 1 DAY) AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND m.lg_EMPLACEMENT_ID = @empl AND p.imported = 0
   AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) GROUP BY mvtDate, typeReglement, typeVente) x;
SELECT '4a duree ms' AS etape, TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000 AS ms;

SELECT '4b modes par jour 3 ans CANDIDAT' AS etape;
SET @t := NOW(6);
SELECT COUNT(*) AS lignes FROM (SELECT DATE_FORMAT(p.dt_UPDATED, '%Y-%m-%d') AS mvtDate, vr.type_regelement AS typeReglement, p.lg_TYPE_VENTE_ID AS typeVente, SUM(vr.montant) AS montant
 FROM t_preenregistrement p STRAIGHT_JOIN vente_reglement vr ON vr.vente_id = p.lg_PREENREGISTREMENT_ID STRAIGHT_JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID STRAIGHT_JOIN t_type_reglement r ON r.lg_TYPE_REGLEMENT_ID = vr.type_regelement
 WHERE p.dt_UPDATED >= @a1 AND p.dt_UPDATED < DATE_ADD(@a2, INTERVAL 1 DAY) AND p.str_STATUT = 'is_Closed' AND p.lg_TYPE_VENTE_ID <> @depot AND m.lg_EMPLACEMENT_ID = @empl AND p.imported = 0
   AND p.lg_PREENREGISTREMENT_ID NOT IN (SELECT v.preenregistrement_id FROM vente_exclu v) GROUP BY mvtDate, typeReglement, typeVente) x;
SELECT '4b duree ms' AS etape, TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000 AS ms;

-- ---------------------------------------------------------------- 5. mouvements de caisse et achats d'une annee (petites requetes)
SET @t := NOW(6);
SELECT m.typeMvtCaisseId AS typeMvtCaisse, SUM(m.montant) AS montantTTC, COUNT(*) AS nombre FROM mvttransaction m WHERE m.mvtdate BETWEEN @d1 AND @d2 AND m.typeTransaction > 2 AND m.lg_EMPLACEMENT_ID = @empl GROUP BY m.typeMvtCaisseId;
SELECT SUM(m.montant) AS montant FROM mvttransaction m WHERE m.mvtdate BETWEEN @d1 AND @d2 AND m.typeTransaction = 2 AND m.lg_EMPLACEMENT_ID = @empl;
SELECT '5 duree ms (caisse + achats)' AS etape, TIMESTAMPDIFF(MICROSECOND, @t, NOW(6)) / 1000 AS ms;
