# Notice : reprise des bons tiers payant sans « reste dû »

Script : `outils/sql/corriger-reste-bons-modifies.sql` (retour de recette CA-09, 28/10/2026).

## Pourquoi

Jusqu'au correctif du 28/10, « Ventes terminées » > « Modifier info client » recréait le bon du tiers payant avec un
reste dû vide (`int_PRICE_RESTE` à NULL). Un tel bon :

- n'entre pas dans l'encours affiché par « Tiers-payants », qui additionne les restes dus ;
- est écarté du règlement des factures.

Le correctif empêche les nouveaux cas. Le script répare les bons déjà enregistrés.

## Ce que fait le script

Il ne touche que les bons dont le reste dû est vide :

| Cas | Reste dû mis | Copie `laborex_v1_db` du 28/10 |
|---|---|---|
| 1. Bon facturé (`charged`) | reste de sa ligne de facture | 872 bons |
| 2. Bon non facturé (`unpaid`) d'une vente valide | part du tiers payant | 179 bons |
| 3. Bon d'une vente annulée | 0 | 15 bons |

Rien d'autre n'est modifié. Un bon qui a déjà un reste dû n'est pas touché : le script peut être rejoué sans effet.

## Mode d'emploi

À exécuter à la main, base par base, dans HeidiSQL ou MySQL Workbench. Il n'est pas passé au déploiement.

1. Sauvegarder la base.
2. Lancer la partie **0. Constat** seule. Elle ne modifie rien et donne, par cas, le nombre de bons et le total des
   parts.
3. Lancer tout le script. Les modifications ne sont validées que par le `COMMIT` final.
4. Lire la partie **4. Contrôle** : elle doit afficher 0 bon restant.
   - Si elle affiche autre chose, remplacer `COMMIT` par `ROLLBACK`, relancer, et examiner les bons restants. Ce sont
     en principe des bons `charged` sans ligne de facture.
5. Vérifier à l'écran : « Tiers-payants » doit afficher l'encours de l'organisme du bon, augmenté des parts reprises.

## Après

- L'encours affiché par « Tiers-payants » augmente du total des bons repris dans les cas 1 et 2.
- Les bons facturés repris peuvent de nouveau être réglés dans « Règlement des factures ».
