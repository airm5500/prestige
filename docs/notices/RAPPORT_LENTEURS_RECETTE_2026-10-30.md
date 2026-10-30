# Lenteurs vues en recette (30/10) : régressions ou non ?

**Demande.** Sept lenteurs relevées sur l'intégration (`integration/recette-2026-10-29`, eee5a9c8, sur domain1 et
`laborex_v1_db`).

**Règle :** rien en production. Les mesures ont été faites sur domain2 (9080) et sur la copie `laborex_perf`
(instance d'essai 3307). Les deux versions ont été déployées tour à tour sur le même serveur et la même copie :

- la production, `origin/dev` (da6172fd) ;
- l'intégration (eee5a9c8).

domain1 et `laborex_v1_db` n'ont pas été touchés. Seul le journal de domain1 a été lu.

**Conditions.** Le poste était chargé par la série de tests de domain1 : les durées absolues en sont faussées. La copie
porte le schéma de l'intégration, et dev l'accepte : Flyway ignore les migrations qu'il ne connaît pas.

Script de mesure : `src/test/e2e/perf/mesure-lenteurs-recette.js`. Il se connecte comme l'application mobile ou
l'ERP, puis relève pour chaque appel :

- le statut et la durée ;
- le nombre d'éléments ;
- l'empreinte des données.

## Résultat : aucune régression

| Point | dev (production) | Intégration | Verdict |
|---|---|---|---|
| 1. `ticket/vno`, « blocage » | même blocage | même blocage | Pas une régression : l'imprimante du poste attend une boîte « Enregistrer sous ». La vente n'est pas bloquée. |
| 2. `v1/info` (11 650 produits) | plus de 30 min (abandon) | 12,4 s | Amélioration nette |
| 2. `v1/checkproduit` sans filtre | plus de 17 min (serveur arrêté avant la fin) | 55 s | Amélioration nette |
| 3. `v1/stock`, export ERP (22 112 articles) | **erreur 500** en 1,6 s | 123 s | Pas une régression : dev échoue sur cette copie |
| 4. `v1/lot/lots` sans filtre (144 689 lots) | **erreur 500** en 1 s | 48 s | Pas une régression : dev échoue sur cette copie |
| 5. `test-prevente.js` | — | plus de 15 min | Même cause que le point 1 (`ticket/prevente`) |
| 5. `test-defilement-ecrans.js` | — (test absent de dev) | plus de 15 min | Longueur propre au test |
| 6. `test-lot-c-surveillance.js`, « Target crashed » | — | — | Poste à court de mémoire, voir plus bas |

Aucune correction n'a été faite. Aucun point n'est une régression, et aucun ne bloque la vente. Les pistes
d'amélioration sont notées pour chaque point.

## 1. Impression du ticket : `POST vente/ticket/vno`

### Ce que montre le journal de domain1

- Il ne s'agit pas d'un blocage de 26 s, mais de requêtes d'impression **qui ne se terminent jamais**. Le
  29-30/10, le détecteur de blocage signale :
  - `ticket/vno` en cours depuis 9 267 s, puis jusqu'à 11 747 s ;
  - `ticket/vo` depuis 8 227 s ;
  - `ticket/prevente` depuis 4 814 s.
- Cinq fils HTTP étaient ainsi retenus en même temps.
- La pile est toujours la même : `ImpressionServiceImpl.printTicketVente` → `RasterPrinterJob.print` →
  `WPrinterJob._startDoc` (code natif de Windows).
- La mesure de l'impression donne, par exemple : « envoi au spouleur 11 458,5 s ; imprimante : Microsoft Print to
  PDF ».

### Cause

- L'imprimante par défaut du poste est **Microsoft Print to PDF**, sur le port `PORTPROMPT:`.
- Chaque impression attend que quelqu'un choisisse un nom de fichier dans une boîte « Enregistrer sous ».
- Pour un serveur, cette boîte ne s'affiche pas : la requête attend sans fin.

### Ce n'est pas une régression, et la vente n'est pas bloquée

- L'appel `printerjob.print(...)` est le même dans dev ; l'intégration n'a ajouté que le chronométrage autour.
- La vente est enregistrée avant cet appel.
- L'écran envoie `ticket/vno` sans masque d'attente (`VenteCtr.onPrintTicket`, même code dans dev) : la caissière
  peut continuer.
- `test-saisie-ecrans.js` intercepte de toute façon toutes les écritures : le blocage vu au Centre de support vient
  d'autres tests qui impriment, notamment `test-prevente.js` et `test-lot-c-surveillance.js`.

### Effet de bord pour les tests

- Chaque ticket imprimé pendant la série garde un fil HTTP de domain1 pour toujours.
- Ces fils manquent aux autres requêtes, ce qui fausse aussi les durées des points 2 à 5.

### À faire sur le poste de test (réglage, pas le code)

- Mettre comme imprimante par défaut du compte qui fait tourner Payara une imprimante qui ne demande rien, par exemple
  une imprimante « Generic / Text Only » sur le port `NUL:`.
- Ou bien affecter une telle imprimante au poste dans Prestige.

### Amélioration possible, hors régression

Un délai maximal sur l'envoi au spouleur. Ainsi, une imprimante en panne ne retiendrait pas un fil du serveur
indéfiniment, en production non plus.

## 2. `v1/info` et `v1/checkproduit`

- L'intégration (requêtes groupées, commits 2e4615ee et 83ce7f8e) est bien plus rapide que dev, qui fait 6 à 7
  requêtes par produit.
- Les 51 s vues sur domain1 pour `v1/info` sont dues à la charge. Sur domain2, le même appel prend 12,4 s.
- `checkproduit` sans filtre reste à 55 s.

## 3. `v1/stock`, export du catalogue vers l'ERP

- **dev renvoie une erreur 500** sur cette copie : `TFamille.getBoolDECONDITIONNEEXIST()` est NULL pour les articles
  détail. Ce défaut a été corrigé par le commit 6aad9684.
- L'intégration rend tout, en 123 s sur domain2 comme sur domain1 (121 s). La charge n'y est donc pour rien.
- Les 1,1 à 2,5 s du rapport ont été mesurées sur le banc, avec 1 793 produits.

### Cause des 123 s

D'après une pile prise pendant l'appel, le temps passe dans le vidage automatique d'Hibernate :
`DefaultAutoFlushEventListener` → `cascadeOnFlush`, sous `DataExportService.listProduits`, ligne 189.

- Les fournisseurs et les stocks sont lus par lots de 500 articles, soit environ 90 requêtes.
- Avant chacune de ces requêtes, Hibernate repasse sur toutes les entités déjà chargées : plus de 22 000 articles
  avec leurs stocks et leurs fournisseurs.
- Le coût croît donc avec le carré du nombre d'articles. C'est la même cause que pour la suggestion (correctif
  024c792f, 689 s → 13,5 s).

### Correction proposée, hors régression

Passer ces lectures en `FlushModeType.COMMIT`. La méthode ne modifie rien. La même piste vaut probablement pour
`checkproduit` (`ProduitExtraInfoService.getExtraInfos`).

## 4. `v1/lot/lots` sans filtre

- Le code (`LotServiceImpl.getAllLots()`) est le même dans dev et dans l'intégration, à une exception près :
  l'intégration accepte un lot sans date de sortie d'usine.
- Pour cette raison, **dev renvoie une erreur 500** dès le premier lot de ce genre.
- L'intégration rend les 144 689 lots de la copie en 48 s, sans pagination. Le test `test-saisie-api.js` appelle
  toutes les adresses GET avec une limite de 30 s, d'où son échec.
- Ce n'est pas une régression. L'écran des lots passe par la version paginée.

## 5. Tests de plus de 15 min

- **`test-prevente.js`** appelle `ticket/prevente/{id}`. Sur ce poste, l'appel attend la boîte « Enregistrer sous »
  du point 1 : le test ne peut pas finir. Le journal de domain1 montre un `ticket/prevente` en cours depuis 4 814 s.
- **`test-defilement-ecrans.js`** est récent (25/10, absent de dev). Il ouvre **tous** les écrans actifs du
  référentiel des menus, pas seulement ceux du compte d'essai, avec :
  - au moins 2,2 s d'attente fixe par écran, plus 0,9 s par onglet ;
  - jusqu'à 60 s par grille tant que le masque « Chargement… » reste affiché.
- Avec les menus ajoutés depuis dev, sa durée dépasse 15 min sans aucune lenteur du serveur. Les fils retenus par les
  impressions l'allongent encore.
- Ce n'est pas un défaut de l'application : il faut lui laisser plus de temps dans la série, ou le lancer avec
  `RAPIDE=1`.

## 6. `test-lot-c-surveillance.js` : « Target crashed »

Le Chromium de test s'arrête parce que le poste manque de mémoire, pas à cause de l'application :

- au moment de la mesure : 0,5 Go de mémoire libre sur 23,6 Go, et 1,4 Go de mémoire virtuelle disponible sur
  53,5 Go ;
- journal système de Windows (événement 2004, mémoire virtuelle épuisée), à 07:46 et 08:10 le 30/10 :
  - mysqld 3306 : 9,0 Go ;
  - domain1 : 6,2 Go ;
  - NetBeans ;
- le journal de domain1 montre aussi des `OutOfMemoryError: Java heap space` avant son arrêt à 11:07.

Ce test imprime aussi un ticket (`ticket/vo`, partie e1) : sur ce poste, il reste donc également bloqué sur
l'imprimante du point 1.

À 11:07, domain1, domain2 et domain3 se sont arrêtés ensemble, sans message d'arrêt dans leurs journaux : les
processus ont été tués. domain2 a été relancé ; domain1 est laissé à la session principale.
