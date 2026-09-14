# Inventaire volumineux : la fiche ne s'ouvre pas (écran vide)

**Date** : 13 septembre 2026
**Officine** : base de production, inventaire `16912192052659234517` — « INVENTAIRE SEPTEMBRE 2026 », type `emplacement`, **17 374 lignes**
**Version concernée** : build antérieur au passage de l'inventaire en API REST (écran servi par `ws_data_inventaire_famille.jsp`)
**Correctif** : commit `1c252d1`, branche `claude/new-session-x0r5ya`

---

## 1. Le symptôme

La fiche de l'inventaire global reste **vide**. La console du navigateur montre :

```
Uncaught TypeError: can't access property "getStore", grid is undefined
    onStoreLoad   editInventaireManager.js:1027
    onComplete    Connection.js:1049
    abort         Connection.js:940
    timeout       Connection.js:343
```

Les inventaires **par emplacement** (quelques centaines à quelques milliers de lignes) s'ouvrent normalement. Seul l'inventaire global échoue.

Ce `grid is undefined` n'est **pas la cause** : c'est la conséquence. Le magasin de la grille est configuré avec `timeout: 180000` (`editInventaireManager.js`). Au bout de 3 minutes le navigateur abandonne l'appel, le composant a déjà été démonté, et le rappel `onStoreLoad` s'exécute sur une grille absente.

---

## 2. Ce qui a été éliminé, et par quelle mesure

Quatre hypothèses successives ont été démolies par les mesures faites sur la base de l'officine. Elles sont consignées ici pour éviter de les reprendre :

| Hypothèse | Mesure qui l'écarte |
|---|---|
| Lignes orphelines dans l'inventaire | 0 orpheline ; 17 374 lignes à chaque étape de filtrage |
| Requête de comptage trop lente | 44 ms sur 2 573 lignes, 1,0 s sur 17 374 lignes |
| Produits sans lien grossiste | 17 374 / 17 374 liés |
| Statistiques de table périmées | plan d'exécution correct, attaque par `t_inventaire_famille`, `range` sur `lg_INVENTAIRE_ID` |
| Référence pendante dans une association chargée d'office | sonde des **12** références de l'entité produit : 0 orphelin partout |

**Erreur de méthode commise en cours de route** : les premiers `EXPLAIN` ont porté sur une requête reconstruite à partir du code *d'aujourd'hui*, alors que l'officine tourne un build plus ancien dont les requêtes diffèrent. La suite du diagnostic a été refaite à partir du SQL réellement émis (voir § 3).

---

## 3. Comment le SQL réel a été obtenu

Plutôt que de traduire le JPQL à la main — source de l'erreur ci-dessus — le SQL a été capturé tel que le serveur le reçoit :

```sql
SET GLOBAL general_log_file = '/var/lib/mysql/general.log';
SET GLOBAL general_log = 1;
```

puis un appel à `ws_data_inventaire_famille.jsp` sur un inventaire de banc. Le journal livre les deux ordres exacts : le comptage et la liste. C'est **EclipseLink** (et non Hibernate) qui les produit — alias `t0`, `AS a1`, réécriture des jointures en `EXISTS`.

---

## 4. La cause

La requête de liste cumule **`SELECT DISTINCT`** et **`GROUP BY`** :

```sql
SELECT DISTINCT t0.<13 colonnes>
FROM t_famillearticle t5, t_grossiste t4, t_inventaire t3,
     t_zone_geographique t2, t_famille t1, t_inventaire_famille t0
WHERE ...
GROUP BY t1.lg_FAMILLE_ID
ORDER BY t2.str_CODE ASC, t1.str_NAME ASC
LIMIT 0, 30
```

MariaDB construit alors une table temporaire. Tant qu'elle tient en mémoire, tout va vite. Dès qu'elle **déborde sur le disque**, le dédoublonnage s'effondre.

### Le seuil, mesuré sur les données réelles

| lignes de l'inventaire | temps | table temporaire sur disque |
|---|---|---|
| 8 000 | 0,12 s | non |
| 12 000 | 0,20 s | non |
| 16 800 | 0,23 s | non |
| 17 200 | 0,24 s | non |
| **17 374** | **128 s** | **oui** (`Created_tmp_disk_tables` +1) |

Ce n'est pas une courbe, c'est une **falaise**. Elle tombe exactement au moment où le compteur `Created_tmp_disk_tables` s'incrémente.

**C'est ce qui explique le discriminant observé** : les inventaires par emplacement passent sous le seuil, l'inventaire global le franchit. Le défaut n'est pas général, sinon aucun inventaire ne s'ouvrirait.

### Isolement du responsable

Chaque élément désactivé un par un, sur 17 374 lignes :

| variante | temps |
|---|---|
| requête d'origine | 131 s |
| sans `ORDER BY` | 130 s |
| sans les sous-requêtes `EXISTS` | 129 s |
| **sans `DISTINCT`** | **0,19 s** |
| sans `GROUP BY` | 0,17 s |

Le coût vient de la **combinaison** `DISTINCT` + `GROUP BY`, pas de l'un ou de l'autre.

---

## 5. Les deux remèdes

### 5.1 Réglage MariaDB — immédiat, sans changement de version

Le piège : MariaDB bascule la table temporaire sur disque en prenant **la plus petite** des deux valeurs `tmp_table_size` et `max_heap_table_size`. L'officine avait :

```ini
tmp_table_size=297M          # présent
                             # max_heap_table_size ABSENT -> 16 Mo par défaut
```

Les 297 Mo étaient donc **sans effet** : c'est le plafond de 16 Mo qui commandait.

| configuration | temps |
|---|---|
| `tmp_table_size=297M`, `max_heap_table_size` absent (= 16M) | 133,71 s |
| `tmp_table_size=297M`, `max_heap_table_size=297M` | 0,27 s |

Correction appliquée dans `my.ini`, section `[mysqld]` (**redémarrage du service requis**) :

```ini
tmp_table_size=128M
max_heap_table_size=128M
```

128 Mo et non 297 : c'est un plafond **par table temporaire**, pas une réservation, et `max_connections=251`. 32 Mo suffisaient déjà pour ce volume (0,26 s) ; 128 Mo laisse de la marge.

**Ce réglage repousse la falaise, il ne la supprime pas.** Elle reviendra à un volume supérieur.

### 5.2 Correctif de code — définitif

Le `DISTINCT` était **sans effet** : le `GROUP BY` sur le produit donne déjà une ligne par produit, et la clé primaire de la ligne d'inventaire fait partie des colonnes lues.

Preuve sur les données réelles, avec et sans `DISTINCT`, sans `LIMIT` :

```
avec DISTINCT : 17372 lignes  MD5 8ef4a88ff37b954111b4b37b04019a17
sans DISTINCT : 17372 lignes  MD5 8ef4a88ff37b954111b4b37b04019a17
```

Le mot est retiré des **trois** requêtes de `listTFamilleByInventaire(..., int start, int limit, ...)` qui le cumulaient avec un `GROUP BY` (branches `emplacement`, `grossiste`, et le cas par défaut) dans `bll/stockManagement/InventaireManager.java`. La branche `famille`, qui n'a pas de `GROUP BY`, est laissée telle quelle : la mesure montre que `DISTINCT` seul ne pose pas de problème (0,17 s).

Le regroupement par produit, lui, est **conservé** : c'est lui qui donne une ligne par produit dans la grille.

Pour un build plus ancien, la modification tient en un mot, dans la même méthode :

```java
// avant
"SELECT DISTINCT t FROM TInventaireFamille t, TFamilleGrossiste g WHERE ... GROUP BY ..."
// après
"SELECT t FROM TInventaireFamille t, TFamilleGrossiste g WHERE ... GROUP BY ..."
```

---

## 6. Vérifications

**Tests** : 530 tests, 0 échec. Trois nouveaux dans `src/test/java/bll/stockManagement/RequetesInventaireTest.java` interdisent le retour de la combinaison `DISTINCT` + `GROUP BY` et vérifient que le regroupement par produit reste en place.

**Campagne de banc** : 10 OK / 0 KO — ouverture de la fiche, page de 30 lignes, total conforme à la base, pagination, recherche, aucune erreur JavaScript.

Le banc reproduit le mécanisme à échelle réduite : inventaire de 3 409 lignes avec `tmp_table_size` / `max_heap_table_size` volontairement bornés pour forcer le débordement. **5,0 s → 0,11 s**, contenu des pages 1 et 5 **strictement identique** avant et après (empreinte MD5 du JSON).

**Périmètre vérifié** : les écrans d'écarts (manquant, surplus, manquant+surplus, alerte) ne sont **pas** concernés — mesurés à 0,04 s au même volume. Recherche à l'échelle du projet : seules ces trois requêtes cumulaient `DISTINCT` et `GROUP BY`.

---

## 7. Point resté ouvert

Après application du réglage `my.ini`, la réponse arrive vite mais la liste revient **vide** avec un compteur correct :

```
({"total":"17372 ","results":[]})
```

Cette dissymétrie situe le défaut précisément : `total` vient de `getCountByInventaire`, `results` de `listTFamilleByInventaire`, qui se termine par

```java
} catch (Exception e) {
    e.printStackTrace();
    this.setMessage(commonparameter.PROCESS_FAILED);
}
return lstTInventaireFamille;   // la liste vide, jamais remplie
```

**Une exception est avalée** : l'écran reçoit un JSON valide à zéro ligne, ne peut rien afficher et ne peut rien dire. L'hypothèse de la référence pendante a été écartée par la sonde des 12 associations (0 partout). La trace reste à récupérer — voir § 8.

---

## 8. Outils laissés en place

Deux fichiers, à déposer et à supprimer après usage :

- **`sonde-references.sql`** — teste d'un coup les 12 références chargées d'office par l'entité produit (zone géo, grossiste, famille article, TVA, code acte, code gestion, forme, fabricant, remise, type étiquette, indicateur de réappro, stock). Doit rendre 0 partout.
- **`ws_diagnostic_inventaire.jsp`** — à déposer à côté de `ws_data_inventaire_famille.jsp` dans l'application déployée, puis à supprimer. Aucune recompilation, aucun changement de version. Elle exécute le même travail que l'écran **sans avaler l'exception**, en cinq étapes :
  1. les réglages MariaDB **réellement en vigueur** (et non ce qu'il y a dans `my.ini`) : version, `tmp_table_size`, `max_heap_table_size`, `sql_mode`, `innodb_page_size` ;
  2. le comptage, avec son temps ;
  3. la liste telle que la version installée la fait, avec son temps et **la trace complète en cas d'échec** ;
  4. la même liste sans `DISTINCT` ;
  5. la lecture des champs affichés, ligne par ligne, avec l'identifiant de la ligne fautive.

---

## 9. Épisode de clôture

En cours de diagnostic, l'inventaire a été **clôturé** (`PUT /api/v1/commande/clotureinventaire/16912192052659234517`), réponse : « Cloture effectuée avec succès; 771 Articles mis à jour ».

Vérification faite sur la copie des données d'avant clôture : le nombre de lignes où le comptage diffère du stock machine est de **771** — concordance à l'unité. La clôture a donc écrit **uniquement** les lignes portant un écart ; les **16 603 lignes jamais comptées n'ont pas été touchées**. Pas de remise à zéro massive.

| | |
|---|---|
| lignes écrites | 771 |
| dont surplus | 320 |
| dont manquants | 451 |
| variation nette | −98 unités |
| variation en valeur (PV) | −301 198 |
| produits passés à 0 depuis un stock machine positif | 90 (quantités de 1 à 7) |

Contrôle rapide côté officine :

```sql
SELECT COUNT(*) FROM t_famille_stock WHERE dt_UPDATED >= CURDATE();
```

Conséquence : la fiche de cet inventaire est désormais refusée par l'écran (« Cet inventaire est clôturé : la fiche ne peut plus être éditée »). C'est voulu, ce n'est pas le défaut traité ici — mais le symptôme n'est plus reproductible sur cet inventaire.

---

## 10. À retenir pour la prochaine fois

- **Un écran vide n'est pas une erreur silencieuse** : c'est presque toujours une exception avalée par un `catch` qui retourne une liste vide, ou un abandon de requête par le navigateur. Regarder d'abord lequel des deux.
- **Un défaut qui ne frappe que les gros volumes est un seuil, pas une pente.** Chercher la bascule (`Created_tmp_disk_tables`, taille de tampon, limite de paquet) plutôt qu'une lenteur générale.
- **`tmp_table_size` sans `max_heap_table_size` ne sert à rien.** C'est le plus petit des deux qui commande.
- **Mesurer le SQL réellement émis**, pas celui qu'on croit émis : le journal général de MariaDB coûte deux lignes et évite de diagnostiquer la mauvaise requête.
- **`DISTINCT` sur une requête qui a déjà un `GROUP BY` couvrant la clé** est redondant, et sur MariaDB il est ruineux dès que la table temporaire déborde.
