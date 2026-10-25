# Reprise des données historiques — Différés

**Objet.** Les correctifs applicatifs des différés empêchent les **nouveaux** cas,
mais ne corrigent pas les données déjà faussées par l'ancien code. Ce document est
destiné à la personne/branche qui prend en charge la reprise : il donne, pour chaque
famille d'anomalie, **l'analyse** (origine dans le code), **la confirmation**
(requêtes d'affichage et de consolidation, lecture seule) et **la proposition de
correction** (script à exécuter **manuellement**, jamais automatiquement).

**Chiffres déjà constatés** (site audité, requêtes du 24/10/2026, base de
production en lecture seule) : 25 règlements encaissés jamais ou partiellement
imputés pour **283 640 F** (de 2019 à septembre 2026, dont deux cas inter-clients
prouvés du 29/09/2026 : 15 000 F et 2 055 F) ; 9 dossiers où la dette effacée
dépasse l'encaissé pour **≈ 325 180 F**. Chaque site doit être re-chiffré avec les
requêtes ci-dessous.

---

## Règles d'exécution (non négociables)

1. **Jamais d'écriture directe en production par un outil automatique.** Les blocs
   « CORRECTION » s'exécutent à la main, par un humain, après lecture des blocs
   « AFFICHAGE » et « CONSOLIDATION ».
2. D'abord dérouler l'intégralité sur la copie locale `laborex_v1_db`
   (voir `outils/poste-local/LISEZMOI.md`), sauvegardée avant la série.
3. En production : **sauvegarde complète préalable**
   (`mysqldump -u root -p <base> > sauvegarde_avant_reprise_differes.sql`),
   exécution dans une **transaction** (`START TRANSACTION;` … contrôle du nombre de
   lignes … `COMMIT;` ou `ROLLBACK;`).
4. La reprise se fait **après** déploiement des correctifs applicatifs, sinon les
   anomalies se recréent.
5. **Ordre imposé** des familles : A4 → A3 → A6 → A1 → A2/A5. (On purge les dettes
   fantômes et les doublons avant de ré-imputer, sinon on ré-impute sur des lignes
   fausses.)
6. Table de traçabilité commune, à créer une fois :

```sql
CREATE TABLE IF NOT EXISTS reprise_differes_rapport (
    id            BIGINT NOT NULL AUTO_INCREMENT,
    dt_EVENT      DATETIME NOT NULL,
    type_anomalie VARCHAR(40) NOT NULL,     -- A1..A6
    dossier       VARCHAR(255) NULL,        -- t_dossier_reglement concerne
    ligne         VARCHAR(255) NULL,        -- t_preenregistrement_compte_client concerne
    client        VARCHAR(255) NULL,
    montant       INT NULL,
    action        VARCHAR(255) NOT NULL,    -- ce qui a ete fait / a arbitrer
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

---

## A4 — Dettes fantômes sur ventes annulées

**Analyse.** L'annulation d'une vente mettait la ligne de dette à zéro via
`findOptionalCmt` (une seule ligne, `setMaxResults(1)` sans `ORDER BY`,
`SalesServiceImpl.java:449-456`). Une vente portant plusieurs lignes, ou passée par
un chemin d'annulation ancien, peut garder un reste dû alors qu'elle est annulée :
le client paraît devoir de l'argent sur une vente qui n'existe plus.

**AFFICHAGE (lecture seule).**
```sql
SELECT p.str_REF AS vente, p.dt_ANNULER,
       CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME) AS client,
       pcc.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID AS ligne,
       pcc.int_PRICE, pcc.int_PRICE_RESTE, pcc.str_STATUT
FROM t_preenregistrement_compte_client pcc
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = pcc.lg_PREENREGISTREMENT_ID
JOIN t_compte_client cc    ON cc.lg_COMPTE_CLIENT_ID = pcc.lg_COMPTE_CLIENT_ID
JOIN t_client cl           ON cl.lg_CLIENT_ID = cc.lg_CLIENT_ID
WHERE p.b_IS_CANCEL = 1 AND pcc.int_PRICE_RESTE <> 0
ORDER BY p.dt_ANNULER;
```

**CONSOLIDATION.**
```sql
SELECT COUNT(*) AS nb_lignes, SUM(pcc.int_PRICE_RESTE) AS dette_fantome_totale
FROM t_preenregistrement_compte_client pcc
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = pcc.lg_PREENREGISTREMENT_ID
WHERE p.b_IS_CANCEL = 1 AND pcc.int_PRICE_RESTE <> 0;
```

**CORRECTION (manuelle, après sauvegarde).**
```sql
START TRANSACTION;
INSERT INTO reprise_differes_rapport (dt_EVENT, type_anomalie, ligne, client, montant, action)
SELECT NOW(), 'A4', pcc.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID, cc.lg_CLIENT_ID,
       pcc.int_PRICE_RESTE, 'Dette soldee : vente annulee'
FROM t_preenregistrement_compte_client pcc
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = pcc.lg_PREENREGISTREMENT_ID
JOIN t_compte_client cc    ON cc.lg_COMPTE_CLIENT_ID = pcc.lg_COMPTE_CLIENT_ID
WHERE p.b_IS_CANCEL = 1 AND pcc.int_PRICE_RESTE <> 0;

UPDATE t_preenregistrement_compte_client pcc
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = pcc.lg_PREENREGISTREMENT_ID
SET pcc.int_PRICE_RESTE = 0, pcc.str_STATUT = 'delete', pcc.dt_UPDATED = NOW()
WHERE p.b_IS_CANCEL = 1 AND pcc.int_PRICE_RESTE <> 0;
-- comparer le nombre de lignes touchees a la consolidation, puis COMMIT; (sinon ROLLBACK;)
```

---

## A3 — Plusieurs lignes de dette actives pour une même vente

**Analyse.** Tout le code (annulation, modification, clôture de copie) suppose
**une** ligne de dette par vente et prend la première venue (`setMaxResults(1)`
sans `ORDER BY`). Des doublons existent pourtant en base (constatés sur les dumps
des deux sites en juillet 2026) : la dette compte double et les opérations n'en
soldent qu'une, au hasard.

**AFFICHAGE.**
```sql
SELECT p.str_REF AS vente, pcc.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID AS ligne,
       pcc.int_PRICE, pcc.int_PRICE_RESTE, pcc.dt_CREATED,
       (SELECT COUNT(*) FROM t_dossier_reglement_detail d
         WHERE d.str_REF = pcc.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID) AS nb_reglements
FROM t_preenregistrement_compte_client pcc
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = pcc.lg_PREENREGISTREMENT_ID
WHERE pcc.str_STATUT = 'is_Closed'
  AND EXISTS (SELECT 1 FROM t_preenregistrement_compte_client b
              WHERE b.lg_PREENREGISTREMENT_ID = pcc.lg_PREENREGISTREMENT_ID
                AND b.str_STATUT = 'is_Closed'
                AND b.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID <> pcc.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID)
ORDER BY p.str_REF, pcc.dt_CREATED;
```

**CONSOLIDATION.** Nombre de ventes concernées et surplus de dette :
```sql
SELECT COUNT(*) AS nb_ventes, SUM(x.surplus) AS surplus_de_dette FROM (
  SELECT pcc.lg_PREENREGISTREMENT_ID,
         SUM(pcc.int_PRICE_RESTE) - MAX(pcc.int_PRICE_RESTE) AS surplus
  FROM t_preenregistrement_compte_client pcc
  WHERE pcc.str_STATUT = 'is_Closed'
  GROUP BY pcc.lg_PREENREGISTREMENT_ID
  HAVING COUNT(*) > 1
) x;
```

**CORRECTION.** Règle : on garde une seule ligne par vente — en priorité celle qui
porte des règlements, sinon la plus récente (`dt_CREATED`, puis identifiant). On ne
désactive **que** les lignes sans aucun règlement ; si plusieurs lignes d'une même
vente portent des règlements, **arbitrage manuel** (elles sortent de l'affichage
avec `nb_reglements > 0` sur chaque ligne).
```sql
START TRANSACTION;
INSERT INTO reprise_differes_rapport (dt_EVENT, type_anomalie, ligne, montant, action)
SELECT NOW(), 'A3', a.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID, a.int_PRICE_RESTE,
       'Doublon desactive (aucun reglement sur cette ligne)'
FROM t_preenregistrement_compte_client a
JOIN t_preenregistrement_compte_client b
      ON b.lg_PREENREGISTREMENT_ID = a.lg_PREENREGISTREMENT_ID
     AND b.str_STATUT = 'is_Closed'
     AND b.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID <> a.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID
     AND ( EXISTS (SELECT 1 FROM t_dossier_reglement_detail db
                   WHERE db.str_REF = b.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID)
           OR b.dt_CREATED > a.dt_CREATED
           OR (b.dt_CREATED = a.dt_CREATED
               AND b.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID > a.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID) )
WHERE a.str_STATUT = 'is_Closed'
  AND NOT EXISTS (SELECT 1 FROM t_dossier_reglement_detail da
                  WHERE da.str_REF = a.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID);

UPDATE t_preenregistrement_compte_client a
JOIN t_preenregistrement_compte_client b
      ON b.lg_PREENREGISTREMENT_ID = a.lg_PREENREGISTREMENT_ID
     AND b.str_STATUT = 'is_Closed'
     AND b.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID <> a.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID
     AND ( EXISTS (SELECT 1 FROM t_dossier_reglement_detail db
                   WHERE db.str_REF = b.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID)
           OR b.dt_CREATED > a.dt_CREATED
           OR (b.dt_CREATED = a.dt_CREATED
               AND b.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID > a.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID) )
SET a.int_PRICE_RESTE = 0, a.str_STATUT = 'delete', a.dt_UPDATED = NOW()
WHERE a.str_STATUT = 'is_Closed'
  AND NOT EXISTS (SELECT 1 FROM t_dossier_reglement_detail da
                  WHERE da.str_REF = a.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID);
-- COMMIT; (ou ROLLBACK;)
```

---

## A6 — Copies de modification au reste faux (DIF-01 / DIF-02 / DIF-03 historiques)

**Analyse.** À la clôture d'une copie de modification, le « déjà réglé » est lu sur
la **photo** prise à l'ouverture (`SalesServiceImpl.java:3072-3076`) :
- un règlement fait pendant la modification est ignoré → reste **trop élevé**
  (DIF-01) ;
- l'acompte de la vente d'origine est déduit de la dette **et** contre-passé en
  caisse → reste **trop bas** (DIF-02) ;
- si le client ou le mode change, les règlements de l'origine ne sont ni reportés
  ni rendus (DIF-03) → **arbitrage humain obligatoire**, pas de script.

**AFFICHAGE + CONSOLIDATION (même client uniquement).** Reste théorique d'une copie
clôturée en différé = `prix − acompte de la copie − règlements réels de la lignée
(origine + copie)`. Les écarts :
```sql
SELECT c.str_REF AS vente_copie, o.str_REF AS vente_origine,
       CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME) AS client,
       lk.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID AS ligne_copie,
       lk.int_PRICE, lk.int_PRICE_RESTE AS reste_actuel,
       COALESCE(mc.acompte,0)      AS acompte_copie,
       COALESCE(rg.regles,0)       AS reglements_lignee,
       GREATEST(0, lk.int_PRICE - COALESCE(mc.acompte,0) - COALESCE(rg.regles,0)) AS reste_theorique,
       lk.int_PRICE_RESTE
         - GREATEST(0, lk.int_PRICE - COALESCE(mc.acompte,0) - COALESCE(rg.regles,0)) AS ecart
FROM t_preenregistrement c
JOIN t_preenregistrement o  ON o.lg_PREENREGISTREMENT_ID = c.lg_PARENT_ID
JOIN t_preenregistrement_compte_client lk
      ON lk.lg_PREENREGISTREMENT_ID = c.lg_PREENREGISTREMENT_ID AND lk.str_STATUT = 'is_Closed'
JOIN t_preenregistrement_compte_client lo
      ON lo.lg_PREENREGISTREMENT_ID = o.lg_PREENREGISTREMENT_ID
     AND lo.lg_COMPTE_CLIENT_ID = lk.lg_COMPTE_CLIENT_ID          -- meme client uniquement
JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = lk.lg_COMPTE_CLIENT_ID
JOIN t_client cl        ON cl.lg_CLIENT_ID = cc.lg_CLIENT_ID
LEFT JOIN (SELECT m.pkey, SUM(m.montantPaye) AS acompte FROM mvttransaction m
           WHERE m.montantPaye > 0 GROUP BY m.pkey) mc ON mc.pkey = c.lg_PREENREGISTREMENT_ID
LEFT JOIN (SELECT d.str_REF, SUM(d.dbl_AMOUNT) AS regles FROM t_dossier_reglement_detail d
           GROUP BY d.str_REF) rg0 ON 1 = 0
LEFT JOIN (SELECT d.str_REF AS ref, SUM(d.dbl_AMOUNT) AS regles
           FROM t_dossier_reglement_detail d GROUP BY d.str_REF) rg
      ON rg.ref IN (lk.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID, lo.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID)
WHERE c.`copy` = 1 AND c.str_STATUT = 'is_Closed'
HAVING ecart <> 0
ORDER BY ABS(ecart) DESC;
```
*(Si la jointure `rg` agrège mal sur votre version — une ligne par `ref` —
remplacer par deux sous-requêtes séparées `rg_copie` et `rg_origine` et sommer les
deux colonnes ; l'esprit reste : règlements réels de la lignée.)*

**CORRECTION.** Après validation ligne à ligne de l'affichage (c'est la famille la
plus délicate : chaque écart doit être compris avant d'être corrigé) :
```sql
-- Modele, a executer PAR LIGNE validee :
START TRANSACTION;
INSERT INTO reprise_differes_rapport (dt_EVENT, type_anomalie, ligne, montant, action)
VALUES (NOW(), 'A6', '<ligne_copie>', <ecart>, 'Reste recale sur le reste theorique');
UPDATE t_preenregistrement_compte_client
SET int_PRICE_RESTE = <reste_theorique>, dt_UPDATED = NOW()
WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_ID = '<ligne_copie>';
COMMIT;
```
Les cas **DIF-03** (changement de client ou passage au comptant : la requête de
vérification du rapport d'audit du 11/10, § DIF-03, les liste) relèvent de
l'arbitrage : avoir ou remboursement à l'ancien client, décision de gestion.

---

## A1 — Règlements encaissés non imputés (dossiers « orphelins »)

**Analyse.** L'ancien code encaissait avant d'imputer : grille périmée, dossiers
déjà soldés ou dossiers d'un **autre client** (sélection fantôme de l'écran) →
dossier `DIFFERE` dont `dbl_AMOUNT` (encaissé) dépasse la somme des
`t_dossier_reglement_detail` (imputé). Le client a payé, sa dette n'a pas bougé.

**AFFICHAGE (avec pré-classement).**
```sql
SELECT x.lg_DOSSIER_REGLEMENT_ID, x.dt_CREATED,
       CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME) AS client,
       x.encaisse, x.impute, x.non_impute,
       COALESCE(dettes.reste_ouvert,0) AS reste_ouvert_client,
       CASE WHEN COALESCE(dettes.reste_ouvert,0) >= x.non_impute THEN 'RE-IMPUTABLE'
            WHEN COALESCE(dettes.reste_ouvert,0) > 0             THEN 'PARTIEL'
            ELSE 'TROP-PERCU (avoir/remboursement)' END AS classement
FROM (
  SELECT d.lg_DOSSIER_REGLEMENT_ID, d.dt_CREATED, d.str_ORGANISME_ID AS client_id,
         d.dbl_AMOUNT AS encaisse, COALESCE(SUM(dd.dbl_AMOUNT),0) AS impute,
         d.dbl_AMOUNT - COALESCE(SUM(dd.dbl_AMOUNT),0) AS non_impute
  FROM t_dossier_reglement d
  LEFT JOIN t_dossier_reglement_detail dd
         ON dd.lg_DOSSIER_REGLEMENT_ID = d.lg_DOSSIER_REGLEMENT_ID
  WHERE d.str_NATURE_DOSSIER = 'DIFFERE'
  GROUP BY d.lg_DOSSIER_REGLEMENT_ID, d.dt_CREATED, d.str_ORGANISME_ID, d.dbl_AMOUNT
) x
LEFT JOIN t_client cl ON cl.lg_CLIENT_ID = x.client_id
LEFT JOIN (
  SELECT cc.lg_CLIENT_ID, SUM(pcc.int_PRICE_RESTE) AS reste_ouvert
  FROM t_preenregistrement_compte_client pcc
  JOIN t_compte_client cc   ON cc.lg_COMPTE_CLIENT_ID = pcc.lg_COMPTE_CLIENT_ID
  JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = pcc.lg_PREENREGISTREMENT_ID
  WHERE pcc.int_PRICE_RESTE > 0 AND pcc.str_STATUT = 'is_Closed'
    AND (p.b_IS_CANCEL = 0 OR p.b_IS_CANCEL IS NULL)
  GROUP BY cc.lg_CLIENT_ID
) dettes ON dettes.lg_CLIENT_ID = x.client_id
WHERE x.non_impute > 0
ORDER BY x.dt_CREATED DESC;
```

**CONSOLIDATION.**
```sql
SELECT COUNT(*) AS nb_dossiers, SUM(x.non_impute) AS total_non_impute FROM (
  SELECT d.lg_DOSSIER_REGLEMENT_ID,
         d.dbl_AMOUNT - COALESCE(SUM(dd.dbl_AMOUNT),0) AS non_impute
  FROM t_dossier_reglement d
  LEFT JOIN t_dossier_reglement_detail dd
         ON dd.lg_DOSSIER_REGLEMENT_ID = d.lg_DOSSIER_REGLEMENT_ID
  WHERE d.str_NATURE_DOSSIER = 'DIFFERE'
  GROUP BY d.lg_DOSSIER_REGLEMENT_ID, d.dbl_AMOUNT
) x WHERE x.non_impute > 0;
```

**CORRECTION (ré-imputation).** Pour chaque dossier orphelin, affecter le montant
non imputé aux dettes ouvertes **du payeur du dossier** (`str_ORGANISME_ID`), de la
plus ancienne à la plus récente, avec traçabilité (un `t_dossier_reglement_detail`
par affectation). Le reliquat sans dette ouverte part en arbitrage.
```sql
DROP PROCEDURE IF EXISTS reimputer_reglements_orphelins;
DELIMITER @@
CREATE PROCEDURE reimputer_reglements_orphelins()
BEGIN
    DECLARE finiD INT DEFAULT 0;
    DECLARE vDossier VARCHAR(255); DECLARE vClient VARCHAR(255); DECLARE vOrphelin INT;
    DECLARE curD CURSOR FOR
        SELECT d.lg_DOSSIER_REGLEMENT_ID, d.str_ORGANISME_ID,
               CAST(d.dbl_AMOUNT - COALESCE((SELECT SUM(dd.dbl_AMOUNT)
                     FROM t_dossier_reglement_detail dd
                     WHERE dd.lg_DOSSIER_REGLEMENT_ID = d.lg_DOSSIER_REGLEMENT_ID), 0) AS SIGNED)
        FROM t_dossier_reglement d
        WHERE d.str_NATURE_DOSSIER = 'DIFFERE'
          AND d.dbl_AMOUNT > COALESCE((SELECT SUM(dd.dbl_AMOUNT)
                     FROM t_dossier_reglement_detail dd
                     WHERE dd.lg_DOSSIER_REGLEMENT_ID = d.lg_DOSSIER_REGLEMENT_ID), 0)
        ORDER BY d.dt_CREATED;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET finiD = 1;
    OPEN curD;
    boucleDossiers: LOOP
        FETCH curD INTO vDossier, vClient, vOrphelin;
        IF finiD = 1 THEN LEAVE boucleDossiers; END IF;
        blocLignes: BEGIN
            DECLARE finiL INT DEFAULT 0;
            DECLARE vLigne VARCHAR(255); DECLARE vReste INT; DECLARE vPart INT;
            DECLARE curL CURSOR FOR
                SELECT pcc.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID, pcc.int_PRICE_RESTE
                FROM t_preenregistrement_compte_client pcc
                JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = pcc.lg_COMPTE_CLIENT_ID
                JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = pcc.lg_PREENREGISTREMENT_ID
                WHERE cc.lg_CLIENT_ID = vClient AND pcc.str_STATUT = 'is_Closed'
                  AND (p.b_IS_CANCEL = 0 OR p.b_IS_CANCEL IS NULL)
                  AND pcc.int_PRICE_RESTE > 0
                ORDER BY pcc.dt_CREATED;
            DECLARE CONTINUE HANDLER FOR NOT FOUND SET finiL = 1;
            OPEN curL;
            boucleLignes: LOOP
                IF vOrphelin <= 0 THEN LEAVE boucleLignes; END IF;
                FETCH curL INTO vLigne, vReste;
                IF finiL = 1 THEN LEAVE boucleLignes; END IF;
                SET vPart = LEAST(vOrphelin, vReste);
                UPDATE t_preenregistrement_compte_client
                   SET int_PRICE_RESTE = int_PRICE_RESTE - vPart, dt_UPDATED = NOW()
                 WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_ID = vLigne;
                INSERT INTO t_dossier_reglement_detail
                    (lg_DOSSIER_REGLEMENT_DETAIL_ID, lg_DOSSIER_REGLEMENT_ID, str_REF,
                     dbl_AMOUNT, str_STATUT, dt_CREATED, dt_UPDATED)
                VALUES (UUID(), vDossier, vLigne, vPart, 'is_Closed', NOW(), NOW());
                INSERT INTO reprise_differes_rapport
                    (dt_EVENT, type_anomalie, dossier, ligne, client, montant, action)
                VALUES (NOW(), 'A1', vDossier, vLigne, vClient, vPart, 'Re-impute');
                SET vOrphelin = vOrphelin - vPart;
            END LOOP;
            CLOSE curL;
            IF vOrphelin > 0 THEN
                INSERT INTO reprise_differes_rapport
                    (dt_EVENT, type_anomalie, dossier, client, montant, action)
                VALUES (NOW(), 'A1', vDossier, vClient, vOrphelin,
                        'TROP-PERCU : arbitrage avoir ou remboursement');
            END IF;
        END blocLignes;
    END LOOP;
    CLOSE curD;
END @@
DELIMITER ;

-- Execution manuelle :
-- START TRANSACTION;  CALL reimputer_reglements_orphelins();
-- SELECT * FROM reprise_differes_rapport WHERE type_anomalie='A1';
-- COMMIT;  (ou ROLLBACK;)   puis  DROP PROCEDURE reimputer_reglements_orphelins;
```

---

## A2 / A5 — Dettes effacées au-delà de l'encaissé, et ventes annulées déjà réglées

**Analyse.** A2 : l'ancien règlement « complet » soldait **toutes** les dettes
quel que soit le montant payé (constaté : payé 6 515, effacé 94 260). A5 :
l'annulation d'une vente déjà réglée en partie conservait les règlements en caisse
sans avoir ni remboursement (DIF-05 ; toujours présent dans le code actuel).
**Pas de correction automatique possible** : recréer une dette ou créer un avoir
est une décision de gestion, client par client.

**AFFICHAGE A2** (imputé > encaissé) : requête d'A1 avec `WHERE x.non_impute < 0`.

**AFFICHAGE A5** (règlements sur ventes annulées) :
```sql
SELECT p.str_REF, p.dt_ANNULER, CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME) AS client,
       SUM(d.dbl_AMOUNT) AS regle_avant_annulation
FROM t_preenregistrement p
JOIN t_preenregistrement_compte_client l ON l.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
JOIN t_dossier_reglement_detail d ON d.str_REF = l.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID
JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = l.lg_COMPTE_CLIENT_ID
JOIN t_client cl        ON cl.lg_CLIENT_ID = cc.lg_CLIENT_ID
WHERE p.b_IS_CANCEL = 1
GROUP BY p.str_REF, p.dt_ANNULER, client
HAVING SUM(d.dbl_AMOUNT) > 0;
```

**CORRECTION.** Sortir les deux listes, les chiffrer, et **arbitrer** :
réclamation au client / passage en perte (A2) ; avoir ou remboursement (A5).
Chaque décision est consignée dans `reprise_differes_rapport` (action libre).

---

## Contrôles de fin

Après exécution, dans l'ordre : A4 et A3 → leurs consolidations renvoient 0 ;
A1 → la consolidation ne doit laisser que des dossiers tracés « TROP-PERCU » dans
le rapport ; A6 → l'affichage ne doit plus montrer que les cas volontairement
laissés en arbitrage. Enfin, cohérence globale :
```sql
-- solde liste clients = somme des restes des ventes cloturees non annulees
SELECT COUNT(*) AS incoherences FROM (
  SELECT pcc.lg_COMPTE_CLIENT_ID
  FROM t_preenregistrement_compte_client pcc
  JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = pcc.lg_PREENREGISTREMENT_ID
  WHERE pcc.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 1 AND pcc.int_PRICE_RESTE <> 0
) x;
```

**Rappels.** Les requêtes sont écrites pour MySQL/MariaDB, table `mvttransaction`
en minuscules (sites Linux sensibles à la casse). Les montants cités en tête
proviennent du site audité et doivent être re-mesurés sur chaque site avant toute
correction.
