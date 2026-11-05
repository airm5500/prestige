# Analyse : stock d'un article après le retour complet d'un BL et sa ressaisie

Signalement de l'officine : après le retour complet d'un BL depuis « État de contrôle des achats », puis la ressaisie
de ce BL sous un numéro voisin, le stock d'un article semblait faux d'une unité.

La base de l'officine a été lue en lecture seule, avec l'accord de l'utilisateur, sans aucune colonne nominative.
Rien n'y a été écrit. Ce document ne reprend aucune des données lues.

## Conclusion

**Le retour complet et la ressaisie n'ont pas faussé le stock.**

- Les mouvements de l'article s'enchaînent sans rupture : chaque stock de départ est égal au stock final du mouvement
  précédent.
- Le stock en base est égal au stock final du dernier mouvement.
- Le contrôle a porté sur tous les produits du BL : aucun écart.
- Aucune réparation n'est à faire dans le logiciel.

Le constat de départ reposait sur trois lectures inexactes :

1. **L'ordre des opérations.** La ressaisie a été faite *avant* le retour complet du BL d'origine, et non après.
2. **Le « stock avant » lu sur la ligne de la ressaisie.** Il comprenait déjà l'entrée du BL d'origine.
3. **Les ventes.** Des ventes de l'article ont eu lieu après le retour.

L'écran de suivi des mouvements est juste. Limité à la journée de la ressaisie, il ne montre pas l'entrée du BL
d'origine, faite un autre jour.

Le comptage physique fait ensuite par l'officine trouve une boîte de plus que le logiciel. Cet écart est antérieur aux
ventes qui ont suivi le retour, et il ne dépend pas du retour complet :

- la ressaisie décrit la même livraison que le BL d'origine ;
- dans le logiciel, entrée, ressaisie et retour font +1 +1 −1 = +1, soit une seule boîte, comme à la livraison.

On ne peut pas savoir depuis la base d'où vient la boîte en plus. Deux causes sont possibles :

- une vente enregistrée sans que la boîte soit sortie ;
- une boîte plus ancienne restée en rayon sans être comptée.

**À faire par l'officine :** un ajustement ou un inventaire de l'article.

## Chemins du code vérifiés

Versions comparées : `master`, `origin/dev`, `claude/new-session-xm8ptu` et `integration/recette-2026-10-29`. Le
chemin du retour complet est identique dans les quatre.

### Retour complet depuis « État de contrôle des achats »

1. Le bouton « RETOUR COMPLET DU BL » (`EtatControleManager.js`, `retourCompletBL`) appelle
   `PUT /api/v1/retourfournisseur/full-bl/{id}`.
2. `RetourFournisseurRessource.returnFullBonLivraison` appelle `RetourFournisseurServiceImpl.returnFullBonLivraison`,
   qui fait trois choses :
   - **`cloneBl`** :
     - le BL passe au statut `delete` ;
     - une contre-passation est créée sous le même numéro, avec les montants en négatif et les lignes copiées.
   - **`MvtProduitServiceImpl.validerFullBlRetourFournisseur`**, pour chaque ligne du BL :
     - le stock baisse de la quantité reçue (`t_famille_stock`) ;
     - un mouvement RETOUR FOURNISSEUR est écrit (`hmvtproduit`) ;
     - `int_QTE_RETURN` est renseigné ;
     - un retour fournisseur est créé, au statut `enable`.
   - **`deleteMvtTransactionByPkey`** : la ligne `mvttransaction` du BL est supprimée.

### Ressaisie d'un BL

- **Saisie des lots** : `OrderServiceImpl.addLot`.
- **Entrée en stock** : `CommandeServiceImpl.cloturerBonLivraison`. Pour chaque ligne, `addToStock` augmente le stock
  et écrit un mouvement ENTREE EN STOCK.
- **Comparaison des numéros** : toutes les recherches de lots par numéro de BL comparent le numéro à l'identique (`=`).
  Un numéro ressaisi avec un caractère en plus, par exemple un tiret final, n'est jamais confondu avec le numéro
  d'origine.
- **Pourquoi un numéro voisin** : tant que le BL d'origine n'est pas annulé,
  `OrderServiceImpl.isRefBLExistForGrossiste` refuse son numéro pour le même grossiste. Comme la ressaisie a été faite
  avant le retour, il a fallu changer le numéro.

## Défaut des lots d'un BL annulé : confirmé et corrigé

### Le défaut

Le retour complet ne touchait pas aux lots du BL annulé : ils restaient dans `t_lot` avec le statut `enable`.

Depuis le commit 4bbea8c4, on peut réutiliser le numéro d'un BL annulé pour le même grossiste. Toutes les recherches de
lots se font par produit et par numéro de BL. Une ressaisie sous **exactement le même numéro** retrouvait donc les lots
de l'ancien BL.

**Défaut confirmé** par le test de bilan, en échec sur l'ancien code (domain3, 05/11) :

- la clôture de la ressaisie est refusée avec « Produits non saisis : … (2/3) » : les 2 boîtes de l'ancien lot sont
  comptées, la nouvelle saisie n'est pas prise ;
- les lots du BL annulé restent actifs.

Si la ressaisie avait eu des lots suffisants, la quantité entrée aurait été faussée par l'ancien lot. Sans lot saisi,
une ligne aurait été entrée avec la quantité de l'ancien lot.

Versions touchées : toutes celles qui contiennent 4bbea8c4 (`dev`, `claude/new-session-xm8ptu`,
`integration/recette-2026-10-29`).

### La correction

- **Retour complet** (`RetourFournisseurServiceImpl.returnFullBonLivraison`) : les lots du BL annulé passent au statut
  `delete`. Seuls sont touchés les lots de ce numéro, de ce grossiste et des produits du BL.
- **Règle commune** (`LotsBonLivraison`) : lots actifs, quantité saisie et quantité entrée à la clôture.
  `CommandeServiceImpl` (contrôle des produits non saisis et clôture) passe par elle.
- **Recherches de lots par numéro de BL** : les lots `delete` sont exclus. Sont concernées la clôture, la saisie et
  l'ajout d'UG (`OrderServiceImpl.getLot`, `getQtyLot`, `getLotByProduitIdAndBon`), la suppression d'un lot, et les
  indicateurs « lots existants ».

### Les tests

**Endroits où la donnée apparaît, et test de rapprochement** : `src/test/e2e/achats/test-annulation-bl-ressaisie.js`.

- Les mouvements de l'article sont lus sur l'écran « Suivi mouvement article » (ligne de l'article et détail du jour).
- Ils sont comparés, ligne par ligne, à `hmvtproduit` et au stock en base.

**Règles de calcul, et test de cohérence** : `LotsBonLivraisonCoherenceTest`, 5000 lignes tirées au hasard (graine
fixe), dans deux tests.

1. Les lots d'un BL annulé ne changent jamais :
   - la quantité entrée ;
   - le refus ;
   - le nombre de lots actifs ;
   - la quantité saisie.
2. La quantité entrée suit ces règles :
   - sans lot, c'est la quantité commandée ;
   - si les lots sont sous la commande, la clôture est refusée ;
   - sinon, c'est le total des lots, borné à commande + UG ;
   - elle n'est jamais inférieure à la commande ni négative.

Le jeu couvre plus de 100 refus, plus de 100 lignes sans lot et plus de 10 plafonds atteints.

**Traces attendues, et test de bilan** (même test e2e), pour deux produits du BL, à chaque étape :

- **stock** :
  - le stock en base vaut le stock avant ± la quantité ;
  - le stock est sur l'emplacement 1, sur une seule ligne ;
  - le stock final vaut le stock initial + les entrées des BL non annulés ;
- **mouvements** :
  - 4 entrées et 2 retours par produit, avec leurs quantités ;
  - une chaîne sans rupture : chaque stock initial égale le stock final du mouvement précédent ;
- **retour fournisseur** : un seul par BL annulé, dont les lignes valent les quantités ;
- **contre-passation** : une seule par BL annulé, au montant opposé ;
- **lignes de BL** : `int_QTE_RETURN` vaut la quantité reçue ;
- **caisse** : une ligne `mvttransaction` pour chaque BL actif, aucune pour un BL annulé ;
- **lots** :
  - ceux du BL annulé sont hors service ;
  - ceux de la ressaisie sont actifs, avec leurs quantités ;
- **écran** : aucune erreur JavaScript.

Le test retire toutes ses données.

**Cas variés** :

- deux produits avec des quantités différentes (2 et 3, puis 3 et 1 à la ressaisie) ;
- une ressaisie sous un numéro voisin (tiret final), faite avant le retour ;
- une ressaisie sous le même numéro, faite après le retour ;
- dans le test de cohérence, des statuts de lots variés (actif, clos, périmé, en cours de péremption, sans statut), des
  quantités nulles, des UG et plusieurs lots par ligne.

**Résultats** :

| Test | Ancien code | Corrigé |
|------|-------------|---------|
| Cohérence (unitaire) | 2 échecs sur 2 | 2/2 |
| Bilan et rapprochement (e2e, domain3) | 26/36 | 36/36 |

### Point suspecté, non couvert

Les lignes `t_warehouse` du BL annulé ne sont pas touchées par le retour complet. `addFreeQty` les retrouve aussi par
produit et par numéro de BL. Aucun test ne le prouve encore.

## Réparation proposée pour l'officine (à valider, non exécutée)

Le défaut ne fausse rien tant qu'aucun BL n'est ressaisi sous le même numéro. Pour mettre les lots déjà présents en
conformité, la requête ci-dessous passe hors service les lots des BL annulés. Elle ne touche un lot que si :

- il a le même numéro, le même grossiste et le même produit que le BL annulé ;
- il a été créé avant l'annulation ;
- aucun BL actif ne porte ce numéro.

```sql
UPDATE t_lot l
JOIN t_bon_livraison b ON b.str_REF_LIVRAISON = l.str_REF_LIVRAISON AND b.str_STATUT = 'delete' AND b.int_HTTC > 0
JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID AND o.lg_GROSSISTE_ID = l.lg_GROSSISTE_ID
JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID AND d.lg_FAMILLE_ID = l.lg_FAMILLE_ID
SET l.str_STATUT = 'delete', l.dt_UPDATED = NOW()
WHERE l.str_STATUT <> 'delete' AND l.dt_CREATED <= b.dt_UPDATED
  AND NOT EXISTS (SELECT 1 FROM t_bon_livraison a WHERE a.str_REF_LIVRAISON = l.str_REF_LIVRAISON
                  AND a.str_STATUT <> 'delete' AND a.lg_ORDER_ID IN
                  (SELECT x.lg_ORDER_ID FROM t_order x WHERE x.lg_GROSSISTE_ID = l.lg_GROSSISTE_ID));
```

Avant toute exécution, il faut :

- relire les colonnes sur la base de l'officine ;
- compter les lignes visées par un `SELECT` ;
- faire une sauvegarde.

## Réparation des stocks de l'officine

Le stock de l'article signalé n'a pas été faussé par le logiciel. Seul son écart physique est à régler, par un
ajustement ou un inventaire.
