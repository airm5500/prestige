# Vente assurance avec prix de référence : la part de l'organisme change entre le premier calcul du net et le suivant

**Où** : caisse, vente assurance, calcul du net (`SalesNetComputingServiceImpl`, appel `vente/net/assurance`).
Comportement antérieur au cas 2, révélé par `test-non-regression-net.js` sur la copie `laborex_audit`.

## Situation de départ

- Client assuré rattaché à l'organisme « MUTUELLE X », taux contractuel sur la fiche du compte : 20 %.
- Le caissier avait saisi 100 % dans la grille des tiers-payants d'une vente précédente ; une nouvelle vente reprise
  de celle-ci garde ce 100 % sur sa ligne organisme.
- Deux produits en vente : A à 2 025 F, B à 1 995 F, total 4 020 F.
- Références posées pour MUTUELLE X : prix de référence 1 620 F sur A, taux de référence 10 % sur B.

## Ce qui se passe

1. Le caissier clique « Net » : A = 1 620 × 100 % = 1 620 ; B = 1 995 × 10 % = 200. Écran : part organisme 1 820 F,
   reste client 2 200 F.
2. Il modifie une quantité, ou clique « Net » une seconde fois, sans rien changer d'autre : A = 1 620 × 20 % = 324 ;
   B = 200. Écran : part organisme 524 F, reste client 3 495 F.
3. Tous les calculs suivants donnent 524 F.

**Pourquoi** : le moteur lit le taux sur la ligne organisme de la vente (100). Après le calcul, parce qu'une option de
prix existe, il réécrit sur cette ligne le taux contractuel du compte (20). Le premier calcul se fait donc avec 100,
tous les suivants avec 20.

**Effet** : le montant annoncé au client dépend du nombre de clics. Clôture au premier clic : l'organisme est facturé
1 820 F. Clôture après un second clic : 524 F.

## Décision prise le 05/11/2026

Le taux saisi fait foi : s'il est présent sur la ligne de l'organisme, c'est qu'il a été saisi un jour. Le taux de la
fiche du compte ne sert qu'en son absence. Les références priment ligne par ligne :

- produit sans référence : prix de vente × taux du client ;
- produit à prix de référence seul : prix de référence × taux du client ;
- produit à taux de référence seul : prix de vente × taux de référence ;
- produit à prix et taux de référence : prix de référence × taux de référence.

Sur l'exemple : A = 1 620 × 100 % = 1 620, B = 1 995 × 10 % = 200, part de l'organisme 1 820 F à chaque calcul.
Correction : `SalesNetComputingServiceImpl` ne réécrit plus le taux de la fiche sur la ligne de l'organisme quand une
option de prix existe (les deux chemins de calcul), le taux mémorisé reste celui utilisé par le calcul.

## Critère de recette

Deux appels successifs du net sur la même vente, sans modification, rendent la même part organisme ;
`test-non-regression-net.js` passe 8/8 et affiche le détail de la vente s'il diverge.

## Reproduction

`node src/test/e2e/prix-reference/test-non-regression-net.js` sur domain3 (base `laborex_audit`), vente `E2ENRN-V4` ;
reproduit trois fois de suite le 05/11/2026.
