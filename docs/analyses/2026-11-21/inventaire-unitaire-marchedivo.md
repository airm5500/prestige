# Marché Divo : inventaire unitaire qui a modifié le stock de produits non cochés

Analyse en lecture seule de la copie locale `marchedivo` (dernière vente le 16/11/2026), code lu sur
`integration/recette-2026-10-29`. La base locale n'a pas été modifiée : le script a été essayé sur une base jetable,
supprimée ensuite.

Inventaire : `16102712212465976322`, « Review annul », type unitaire, créé le 27/10/2026 à 12:21, clôturé le
30/10/2026 à 20:53.

## Réponse courte

- **Confirmé : la clôture a modifié le stock de 939 produits non cochés.** Leur stock a été ramené à sa valeur du
  27/10, jour de création de l'inventaire. Les mouvements du 27 au 30/10 ont disparu du stock.
- **Le rattrapage est possible sans perte**, parce que l'inventaire garde pour chaque ligne le stock d'avant et le
  stock posé. On rend la différence au stock du jour, les ventes et entrées faites depuis sont conservées.
- **Le script est prêt et essayé** sur une base jetable : 938 stocks corrigés, 1 produit exclu car déjà ajusté à la
  main le 12/11.
- **La version actuelle ne reproduit plus le défaut** : l'actualisation et la clôture ne traitent que les lignes
  cochées.

## Ce qui s'est passé

Un inventaire unitaire contient toutes les fiches de l'officine (8 877 lignes ici), et seules les lignes cochées
doivent compter. À la création, chaque ligne reçoit le stock du moment dans ses deux colonnes : stock machine
(`int_NUMBER_INIT`) et quantité comptée (`int_NUMBER`).

1. **27/10, création.** Les deux colonnes valent le stock du 27/10 pour les 8 877 lignes.
2. **27 au 30/10.** L'officine vend, reçoit, ajuste. Sur les 939 produits concernés : 1 410 ventes, 309 entrées,
   42 ajustements, 26 déconditionnements, 9 annulations.
3. **30/10, actualisation du stock.** L'ancienne version recopie le stock du jour dans le stock machine de toutes les
   lignes, cochées ou non. Pour un produit non coché qui a bougé, la quantité « comptée » (stock du 27/10) diffère
   maintenant du stock machine (stock du 30/10).
4. **30/10 à 20:53, clôture.** L'ancienne version traite toute ligne dont les deux colonnes diffèrent, sans regarder
   la coche. Elle pose donc le stock du 27/10 sur ces 939 produits.

Preuves dans la base :

- Les 8 877 lignes ont un mouvement d'inventaire daté du 30/10 entre 20:53:14 et 20:53:32, y compris les 8 415 non
  cochées.
- Pour 937 des 939 produits, le dernier mouvement connu avant la clôture donne exactement le stock machine de la
  ligne, et le dernier mouvement avant le 27/10 à 12:21 donne exactement la quantité « comptée ».
- Les 939 lignes non cochées sont passées à l'état clôturé, comme des lignes avec écart.

## Chiffres

| Lignes de l'inventaire | Nombre |
|---|---:|
| Total | 8 877 |
| Cochées | 462 |
| dont comptées avec écart (stock modifié, normal) | 161 |
| dont comptées sans écart | 301 |
| Non cochées | 8 415 |
| dont stock inchangé | 7 476 |
| dont stock modifié à tort | 939 |

Sur les 939 produits modifiés à tort :

| Effet de la clôture | Produits | Unités |
|---|---:|---:|
| Stock remonté | 654 | +1 204 |
| Stock baissé | 285 | −903 |
| Net | 939 | +301 |

Valeur nette au prix d'achat : +619 862 F de stock en trop.

Depuis la clôture, ces produits ont continué de bouger (3 862 ventes, 727 entrées sur la copie du 16/11). 178
d'entre eux n'ont pas bougé du tout. Un seul a reçu un ajustement manuel (le 12/11) ; aucun nouvel inventaire n'a été
clôturé.

Les deux listes demandées sont dans le classeur `inventaire-marchedivo-review-annul.xlsx` (non versé dans Git) :
« Cochés et inventoriés » (462 lignes) et « Non cochés modifiés » (939 lignes, avec la correction et le stock après
rattrapage).

## Rattrapage : `rattrapage-inventaire-marchedivo.sql`

Principe : on ne remet pas une valeur, on rend la différence.

- correction = stock machine juste avant la clôture − stock posé par la clôture ;
- stock corrigé = stock du jour + correction.

Ce que fait le script :

1. Il crée une table de trace `rattrapage_inventaire_20261030` : une ligne par produit, avec le stock avant, la
   correction et le stock après. Si la table existe déjà, le script s'arrête : il ne peut pas être joué deux fois.
2. Il exclut les produits qui ont reçu un inventaire ou un ajustement depuis la clôture : ils ont été recomptés à la
   main, la correction les fausserait.
3. Il corrige le stock rayon (`t_famille_stock`) dans une transaction.
4. Il écrit un ajustement par produit dans le suivi des mouvements (`hmvtproduit`, type 08 ou 07), pour que la fiche
   de stock explique le changement.
5. Il affiche un contrôle avant et un contrôle après, et donne en commentaire le retour arrière.

Résultat de l'essai sur une copie des tables du 16/11 :

| Contrôle | Valeur |
|---|---:|
| Produits repérés | 939 |
| Corrigés | 938 |
| Exclus | 1 |
| Unités nettes rendues | −304 |
| Ajustements négatifs écrits | 654 (−1 204) |
| Ajustements positifs écrits | 284 (+900) |
| Écarts au contrôle final | 0 |
| Stocks négatifs sur ces produits | 12 (19 avant) |
| Second lancement | refusé |

Conditions d'exécution en officine :

- Sauvegarde de la base juste avant.
- Prestige arrêté pendant l'exécution : le serveur garde des stocks en mémoire et pourrait réécrire l'ancienne
  valeur à la vente suivante.
- Le script peut être joué avant ou après la mise à jour de Prestige : il ne dépend que des lignes de l'inventaire,
  qui ne changent plus après la clôture.

Ce que le script ne touche pas :

- Les mouvements d'inventaire écrits à tort le 30/10 restent dans l'historique, compensés par les ajustements.
- Le stock par type (`t_type_stock_famille`) : cette table n'est déjà pas alignée sur le stock rayon à Marché Divo
  (915 des 939 produits diffèrent), je ne peux pas y calculer une correction juste.
- Les instantanés et cumuls du 30/10 (`t_mouvement_snapshot`, `t_mouvement`) : états passés, sans effet sur le stock.
- Les 12 stocks négatifs restants : ils existaient avant, ils demandent un comptage.

## Points d'attention

- **Mettre à jour avant de clôturer un autre inventaire.** Cinq inventaires sont encore ouverts sur la copie, dont un
  unitaire. Clôturé avec l'ancienne version après une actualisation, il reproduirait le défaut.
- **Le produit exclu** (CIP 2010668D, ajusté le 12/11) est à vérifier à la main.
- **Limite** : pour 2 produits sur 939, je n'ai pas pu recouper le stock d'avant avec l'historique des mouvements.
  Leur correction suit la même règle que les autres.
