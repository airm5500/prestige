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

## Point annexe : défaut réel, sans effet sur ce signalement

Le retour complet ne touche pas aux lots du BL annulé : ils restent dans `t_lot` avec le statut `enable`.

Depuis le commit 4bbea8c4, on peut réutiliser le numéro d'un BL annulé pour le même grossiste. Une ressaisie sous
**exactement le même numéro** retrouverait alors les lots de l'ancien BL, puisqu'ils sont cherchés par produit et par
numéro de BL. D'après la lecture du code, cela aurait probablement deux effets :

- **à la saisie** : `addNewLot` additionnerait l'ancien lot à la saisie, puis refuserait la ligne avec le message
  « quantité reçue supérieure à la quantité commandée » ;
- **à la clôture** : une ligne que personne n'a saisie serait entrée avec la quantité de l'ancien lot.

Ces effets restent à démontrer par un test avant toute correction.

Correction possible :

- au retour complet, passer les lots du BL annulé au statut `delete` ;
- dans `getLot` et `getQtyLot`, ne compter que les lots au statut `enable`.

## Réparation des stocks de l'officine

Rien à réparer dans le logiciel. Seul l'écart physique de l'article signalé est à régler par un ajustement ou un
inventaire.
