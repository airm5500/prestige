# Audit de performance — filtres de date (`DATE(...)`) et index manquants

**Date :** 2026-06-10
**Périmètre :** couche reporting / requêtes filtrées par date
**Statut du menu déclencheur (Statistiques d'activité par opérateur) :** ✅ corrigé (voir branche `statop`)

---

## 1. Résumé exécutif

L'enquête sur la lenteur du menu « Statistiques d'activité par opérateur » a mis au
jour **trois problèmes**, dont les deux premiers sont déjà corrigés sur la branche
`statop` :

| # | Problème | Effet | Statut |
|---|----------|-------|--------|
| 1 | Boucles `em.refresh()` (N+1) dans `getSalesByOperateur` | milliers de requêtes SQL | ✅ corrigé |
| 2 | Aucun index sur `t_preenregistrement.dt_CREATED` | scan complet de table | ✅ corrigé (migration `V6.0.6`) |
| 3 | **`DATE(col)` / `FUNCTION('DATE', col)` dans les filtres** | **annule l'usage de tout index sur la colonne de date** | ⚠️ systémique — non corrigé |

Le problème **#3 est systémique** : on le retrouve dans **~25 fichiers** et **plus de
60 requêtes**. C'est le facteur de lenteur le plus répandu pour tous les rapports
filtrés par date, et il **neutralise même les index existants** (ex. `idx_preenregistrement_dt_updated`).

---

## 2. Pourquoi `DATE(col)` tue l'index

Un index B-Tree sur une colonne `dt_CREATED` est ordonné sur la **valeur brute** de la
colonne. Dès qu'on enveloppe la colonne dans une fonction :

```sql
WHERE DATE(dt_CREATED) BETWEEN '2026-01-01' AND '2026-01-31'   -- ❌ non-sargable
```

le moteur doit calculer `DATE(dt_CREATED)` **pour chaque ligne** avant de comparer : il
ne peut plus faire de *seek* sur l'index et bascule en **scan complet de table**. C'est
vrai pour MySQL/MariaDB et la plupart des moteurs. C'est exactement le « problème de
conversion de date » suspecté à l'origine.

> Remarque importante : ceci s'applique **aussi** aux colonnes déjà indexées
> (`dt_UPDATED`). De nombreuses requêtes filtrent `FUNCTION('DATE', o.dtUPDATED)` alors
> qu'un index existe sur `dt_UPDATED` — l'index n'est jamais utilisé à cause du `DATE()`.

---

## 3. Le correctif générique (modèle à appliquer)

Remplacer la comparaison sur date tronquée par un **encadrement sur la colonne brute**,
avec une **borne haute exclusive** (lendemain). `dt_CREATED` / `dt_UPDATED` étant des
`TIMESTAMP`, cela capture aussi les heures du dernier jour (corrige au passage un bug
de justesse).

**JPQL — plage :**
```java
// AVANT (non-sargable + exclut les heures du dernier jour)
"... WHERE FUNCTION('DATE', o.dtCREATED) BETWEEN ?1 AND ?2 ..."

// APRÈS (sargable, index-friendly, inclut tout le dernier jour)
"... WHERE o.dtCREATED >= ?1 AND o.dtCREATED < ?2 ..."
// ?1 = début (00:00:00 du jour de début)
// ?2 = lendemain de la date de fin (00:00:00)
```

**JPQL — égalité jour (`DATE(col) = DATE(?)`) :**
```java
// AVANT
"... WHERE FUNCTION('DATE', o.dtCREATED) = FUNCTION('DATE', ?1) ..."
// APRÈS
"... WHERE o.dtCREATED >= ?1 AND o.dtCREATED < ?2 ..."   // ?1 = jour 00:00, ?2 = lendemain 00:00
```

**SQL brut (mêmes principes) :**
```sql
-- AVANT
WHERE DATE(p.`dt_CREATED`) >= '2026-01-01' AND DATE(p.`dt_CREATED`) <= '2026-01-31'
-- APRÈS
WHERE p.`dt_CREATED` >= '2026-01-01' AND p.`dt_CREATED` < '2026-02-01'
```

Le calcul des bornes (jour + lendemain) se fait côté Java avec `LocalDate.plusDays(1)`,
comme dans le correctif déjà livré pour `getSalesByOperateur`.

---

## 4. Inventaire détaillé des requêtes à corriger

Priorités : 🔴 **P1** = rapport interactif sur grosse table (impact utilisateur direct) ·
🟠 **P2** = égalité par jour / requête fréquente · 🟡 **P3** = tâche de fond (hors pointe) ·
⚪ **P4** = utilitaire ponctuel.

### 4.1 `t_preenregistrement` (et détails) — table la plus volumineuse

| Prio | Fichier:ligne | Colonne | Motif actuel |
|------|---------------|---------|--------------|
| 🔴 P1 | `bll/report/StatisticSales.java:1013-1015,1031,1055-1105,1189-1249` | `dt_CREATED` | SQL brut `DATE(p.dt_CREATED)` (≥/≤ et `=` corrélé) — rapport CA / 80-20 |
| 🔴 P1 | `bll/report/JournalVente.java:2253,2284` | `dt_ANNULER`, `dt_UPDATED` | `FUNCTION('DATE', o.dtANNULER) >= / <=` |
| 🔴 P1 | `bll/report/StatisticsFamilleArticle.java:1271` | `dt_CREATED` (détail) | `FUNCTION('DATE', o.dtCREATED) >= / <=` |
| 🔴 P1 | `bll/preenregistrement/Preenregistrement.java:3811,3836` | `dt_CREATED` | `dtCREATED BETWEEN` **sans** `DATE()` mais sans index utilisé — voir §5 |
| 🔴 P1 | `bll/preenregistrement/Preenregistrement.java:6352,6384,8512,8517,8550,8555,8658,8701` | `dt_CREATED` | `FUNCTION('DATE', ...)` (rapports tiers-payant / factures) |
| 🔴 P1 | `bll/teller/SnapshotManager.java:827,2113` | `dt_UPDATED` | `FUNCTION('DATE', dtUPDATED)` (index existant **neutralisé**) |
| 🔴 P1 | `bll/configManagement/clientManagement.java:1618,1641,1673` | `dt_UPDATED` | `FUNCTION('DATE', dtUPDATED) BETWEEN` |
| 🔴 P1 | `bll/tierspayantManagement/tierspayantManagement.java:2251,2282,2303` | `dt_UPDATED` | `FUNCTION('DATE', dtUPDATED) BETWEEN` (3 agrégations) |
| 🔴 P1 | `rest/service/impl/ProduitServiceImpl.java:813,937` | `dt_UPDATED` | `FUNCTION('DATE', dtUPDATED) BETWEEN` (détails vente) |
| 🔴 P1 | `rest/service/impl/CaisseServiceImpl.java:1256` | `dt_UPDATED` | `SUM(intPRICE)` avec `FUNCTION('DATE', dtUPDATED) BETWEEN` |
| 🔴 P1 | `rest/service/impl/DataExportService.java:178` | `dt_UPDATED` | `FUNCTION('DATE', dtUPDATED) BETWEEN` (export) |
| 🔴 P1 | `rest/service/impl/ErpServiceImpl.java:276,290` | `dt_CREATED` | `FUNCTION('DATE', ...dtCREATED) BETWEEN` (+ sous-requête `NOT IN`) |
| 🔴 P1 | `rest/service/impl/GenererFactureServiceImpl.java:232` | `dt_UPDATED` | `FUNCTION('DATE', dtUPDATED) BETWEEN` |
| 🟠 P2 | `controller/MyBean.java:1628,1719` | `dt_ANNULER` | `FUNCTION('DATE', dtANNULER) = ?` + comparaison `DATE` à `DATE` |
| 🟠 P2 | `bll/preenregistrement/Preenregistrement.java:6889` | `dt_DAY` | `FUNCTION('DATE', t.dtDAY) = ?` |

### 4.2 `t_facture`, `t_dossier_reglement`, règlements

| Prio | Fichier:ligne | Colonne | Motif actuel |
|------|---------------|---------|--------------|
| 🔴 P1 | `bll/facture/reglementManager.java:998-1002` | `dt_CREATED` | SQL brut `DATE(p.dt_CREATED) >= / <=` |
| 🔴 P1 | `bll/facture/reglementManager.java:1355` | `dt_CREATED` | `FUNCTION('DATE', o.dtCREATED) >= / <=` |
| 🔴 P1 | `rest/service/impl/ReglementServiceImpl.java:989,997` | `dt_REGLEMENT` | `FUNCTION('DATE', dtREGLEMENT) BETWEEN` |
| 🔴 P1 | `rest/service/impl/ErpServiceImpl.java:328,351,393` | `dt_CREATED` | `FUNCTION('DATE', ...) BETWEEN` (dossier règlement / facture / BL) |
| 🟠 P2 | `rest/service/impl/CautionTiersPayantServiceImpl.java:244,323` | `dt_UPDATED`, `mvtDate` | `FUNCTION('DATE', ...) BETWEEN` |

### 4.3 Stock / entrepôt / mouvements

| Prio | Fichier:ligne | Colonne | Motif actuel |
|------|---------------|---------|--------------|
| 🔴 P1 | `rest/service/impl/ProduitServiceImpl.java:844,848,877,881,1011,1068` | `dt_UPDATED` | `FUNCTION('DATE', dtUPDATED) BETWEEN` (ajustements / décond. / warehouse / retours) |
| 🔴 P1 | `bll/commandeManagement/bonLivraisonManagement.java:631,1046` | `dt_CREATED`, `dt_UPDATED` | `FUNCTION('DATE', ...) >= / <=` |
| 🟠 P2 | `bll/warehouse/WarehouseManager.java:3081,3224,3235` | `dt_CREATED` | `FUNCTION('DATE', o.dtCREATED) = FUNCTION('DATE', ?)` |
| 🟠 P2 | `rest/service/impl/GestionPerimesServiceImpl.java:81,214,273` | `dt_CREATED` | `FUNCTION('DATE', o.dtCREATED) = FUNCTION('DATE', ?)` |
| 🟠 P2 | `bll/stockManagement/DepotManager.java:1926` | `dt_CREATED` | `FUNCTION('DATE', t.dtCREATED) = CURRENT_DATE` |
| 🟠 P2 | `bll/commandeManagement/bonLivraisonManagement.java:2098,2167` | `dt_DAY` | `FUNCTION('DATE', t.dtDAY) = FUNCTION('DATE', ?)` |
| 🟠 P2 | `bll/teller/SnapshotManager.java:2955` | `dt_DAY` | `FUNCTION('DATE', t.dtDAY) = FUNCTION('DATE', ?)` |
| 🟠 P2 | `rest/service/impl/CaisseServiceImpl.java:885` | `dt_CREATED` | `FUNCTION('DATE', t.dtCREATED) = CURRENT_DATE` |
| 🟠 P2 | `rest/service/impl/RetourFournisseurServiceImpl.java:231` | `dt_UPDATED` | `FUNCTION('DATE', o.dtUPDATED) BETWEEN` |

### 4.4 Snapshots d'annulation / divers

| Prio | Fichier:ligne | Colonne | Motif actuel |
|------|---------------|---------|--------------|
| 🟠 P2 | `bll/report/StatisticsFamilleArticle.java:381` | `dateOp` | `FUNCTION('DATE', o.dateOp) BETWEEN` |
| 🟠 P2 | `bll/transaction/impl/TransactionImpl.java:141` | `dateOp` | `FUNCTION('DATE', o.dateOp) BETWEEN` |
| 🟠 P2 | `rest/service/impl/FamilleArticleServiceImpl.java:965` | `createdAt` | `FUNCTION('DATE', e.createdAt) BETWEEN` (sous-requête) |

### 4.5 Tâches de fond et utilitaires (priorité basse)

| Prio | Fichier:ligne | Colonne | Motif actuel | Remarque |
|------|---------------|---------|--------------|----------|
| 🟡 P3 | `job/JobCalendar.java:128,172,185` | `dt_CREATED` | `FUNCTION('DATE', o.dtCREATED) < ?` | jobs hors pointe |
| ⚪ P4 | `rest/service/impl/CommonCorrection.java:175,202` | `dt_CREATED` | `FUNCTION('DATE', o.dtCREATED) BETWEEN` | utilitaire, dates en dur |

---

## 5. Index recommandés (en complément de la dé-`DATE()`)

La dé-`DATE()` est **nécessaire mais pas suffisante** : il faut aussi un index utilisable.
Index déjà présents (`t_preenregistrement`) : `dt_UPDATED`, et le composite
`(str_STATUT, b_IS_CANCEL, dt_UPDATED, int_PRICE, lg_USER_ID)`. Ajouté sur `statop` :
`(str_STATUT, b_IS_CANCEL, dt_CREATED, lg_USER_VENDEUR_ID, int_PRICE)` (migration `V6.0.6`).

Pistes d'index supplémentaires à valider selon les plans d'exécution réels (`EXPLAIN`) :

| Table | Index proposé | Sert |
|-------|---------------|------|
| `t_preenregistrement` | `(str_STATUT, b_IS_CANCEL, dt_CREATED, lg_TYPE_VENTE_ID)` | rapports CA/journal filtrant par type de vente |
| `t_preenregistrement` | `(dt_ANNULER)` ou `(b_IS_CANCEL, dt_ANNULER)` | JournalVente / MyBean (ventes annulées) |
| `t_facture` | `(str_STATUT, dt_CREATED)` | rapports factures / ERP |
| `t_dossier_reglement` | `(str_NATURE_DOSSIER, dt_CREATED)` et `(dt_REGLEMENT)` | règlements différés |
| `t_warehouse` | `(str_STATUT, dt_CREATED, lg_FAMILLE_ID)` | gestion des périmés / mouvements |
| `t_preenregistrement_detail` | `(dt_CREATED)` / `(dt_UPDATED)` | rapports articles vendus par période |

> Méthode : pour chaque rapport corrigé, exécuter `EXPLAIN` sur la requête avant/après
> pour confirmer le passage de `ALL` (scan) à `range`/`ref` (seek sur index).

---

## 6. Recommandations de mise en œuvre

1. **Corriger par lots, par rapport**, en validant chaque rapport sur des données
   réelles (résultats identiques + `EXPLAIN` + chrono TTFB).
2. **Prioriser P1** (rapports interactifs sur `t_preenregistrement` / `t_facture`), où
   le gain utilisateur est immédiat.
3. **Coupler chaque dé-`DATE()` avec l'index correspondant** via une migration Flyway
   (convention `V6.0.x__...sql`, cf. `V6.0.2`, `V6.0.5`, `V6.0.6`).
4. **Attention à la justesse** : passer de `DATE(col) <= fin` à `col < fin+1jour` change
   (corrige) l'inclusion des ventes du dernier jour ; le valider avec les utilisateurs
   métier sur 1–2 rapports témoins avant généralisation.
5. **Cas SQL brut** (`StatisticSales`, `reglementManager`) : en profiter pour passer aux
   requêtes paramétrées (les dates sont aujourd'hui concaténées dans la chaîne SQL —
   risque d'injection en plus du problème de perf).

---

*Ce document est un audit ; aucune des requêtes listées en §4 n'a été modifiée
(hormis le menu stat-opérateur déjà traité sur la branche `statop`).*
