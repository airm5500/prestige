# Base de calcul par tiers-payant (lot Q2.5 du cas 2 du 03/11/2026)

Lot séparé ouvert par la question Q2.5 de `docs/analyses/2026-11-03/cas2-prix-taux-reference-caisse.md` : quand une
vente assurance a plusieurs tiers-payants avec des prix de référence différents, le moteur retient aujourd'hui le
**plus petit** de ces prix comme base de toutes les parts. Ce lot permet, derrière un paramètre, de calculer chaque
tiers-payant sur **son propre** prix de référence. Branche de la session : `PRES-/quizzical-solomon-415068`, à partir
de `origin/integration/recette-2026-10-29` (cas 1, 2 et 3 livrés). Rien n'est fusionné.

## Paramètre

`KEY_PRIX_REF_BASE_PAR_TP` dans `t_parameters` (rubrique « Ventes et caisse »), migration idempotente
`V7.2.36__prix_ref_base_par_tp.sql`, **à 0 par défaut**. Relu à chaque calcul du net (`SalesNetComputingServiceImpl`,
`BaseParTiersPayant.actif`) ; toute erreur de lecture vaut 0.

- **À 0** : le moteur exécute la méthode d'aujourd'hui telle quelle (`TiersPayantCalculationService.calculateSaleItem`,
  non modifiée) : règle du minimum. Le rappel sous la grille de vente reste.
- **À 1** : `calculateSaleItemBaseParTiersPayant`, décrite ci-dessous. Le rappel « Avec plusieurs tiers-payants, le
  calcul retient le plus petit des prix de référence de la vente » disparaît ; la légende des couleurs reste.

## Règle à 1

Pour chaque ligne de vente, dans l'**ordre de priorité** des tiers-payants (inchangé) :

| Élément | Règle |
|---------|-------|
| Base | **son propre prix de référence** × quantité ; s'il n'en a pas, ou si sa référence est de type `TAUX`, le **prix de vente** de la ligne × quantité |
| Taux | celui de sa référence (`TAUX`, `MIX_TAUX_PRIX`), sinon le taux de la vente pour ce tiers-payant (comme aujourd'hui) |
| Part | base × taux, **jamais au-delà de ce qui reste du prix de la ligne** après les parts des tiers-payants prioritaires |
| Complémentaire à 100 % sans référence | prend ce qui reste du prix de la ligne (règle d'aujourd'hui, conservée) |
| Plafonds | `applyCeilings` inchangé : encours du compte, plafond par vente, crédit de l'organisme, dans cet ordre, après le calcul des parts |
| Part client | max(0, total − parts − remise), inchangée ; net arrondi au multiple de 5 comme aujourd'hui |
| Base affichée (`calculationBasePrice`) | celle du premier tiers-payant, par priorité, qui a un prix de référence (à 0 : le minimum, comme aujourd'hui) |

Conséquences à connaître :

- sans prix de référence, ou avec un seul tiers-payant, le résultat est **identique** à 0 et à 1 ;
- avec des références identiques pour tous les tiers-payants, les parts sont les mêmes qu'à 0, sauf quand le
  prioritaire couvre toute sa base (100 %) : à 1, le complémentaire prend encore sa part sur ce qui reste du prix de la
  ligne (il ne s'arrête plus à la base du prioritaire) ;
- la borne « reste du prix de la ligne » est celle de la ligne, pas de la base du prioritaire : un complémentaire qui
  valorise le produit plus haut que le prioritaire n'est plus privé de sa part. **Choix validé le 04/11/2026** : un
  tiers-payant ne paie jamais plus que ce que le client aurait payé, et la colonne P.REF / TAUX de chaque organisme
  dit vraiment ce qu'il rembourse.

## Exemples chiffrés (vente assurance, A prioritaire à 70 %, B complémentaire à 20 %, quantité 1)

| Cas | Prix de vente | Réf. A | Réf. B | À 0 : A / B / client | À 1 : A / B / client |
|-----|---------------|--------|--------|----------------------|----------------------|
| Deux références différentes | 5 000 | 4 000 | 3 000 | 2 100 / 600 / 2 300 (base 3 000 pour les deux) | **2 800** / 600 / **1 600** |
| Référence sur B seulement | 5 000 | — | 3 000 | 2 100 / 600 / 2 300 (3 000 devient la base de A) | **3 500** / 600 / **900** |
| Aucune référence | 5 000 | — | — | 3 500 / 1 000 / 500 | 3 500 / 1 000 / 500 |
| Un seul tiers-payant (A), réf. 3 000, qté 2 | 3 450 | 3 000 | — | 4 200 / — / 2 700 | 4 200 / — / 2 700 |
| A à 100 % réf. 4 500, B à 50 % réf. 3 000 | 5 000 | 4 500 | 3 000 | 3 000 / 0 / 2 000 | 4 500 / **500** (borné) / 0 |
| Plafond par vente de A à 1 500 | 5 000 | 4 000 | 3 000 | 1 500 / 600 / 2 900 | 1 500 / 600 / 2 900 |

Test d'écran (produit à 3 710, réf. A saisie à 3 210, réf. B à 2 710) : à 0, A 1 897 / B 542 / net 1 270 ; à 1,
A **2 247** / B 542 / net **920**.

## Ticket et traces (règle de test du 05/11)

- **Total tiers-payant = somme des parts arrondies** de chaque organisme (défaut antérieur au lot, corrigé aux deux
  valeurs du paramètre) : 8 775 à 10 % pour deux organismes donnait des parts 878 + 878 = 1 756 mais un total 1 755
  (arrondi de la somme), et la part client avec. Le total, le net et la part client suivent désormais les parts
  enregistrées et imprimées.
- **`taux_produit.base_ligne`** (migration `V7.2.36.1__taux_produit_base_ligne.sql`, rejouable) : à 1, le calcul du
  net écrit, pour chaque ligne et chaque organisme ayant une référence, le taux appliqué et le prix de référence
  unitaire propre à l'organisme ; le ticket (`GenerateTicketServiceImpl.creditsParLigne`) relit cette base pour
  imprimer la part de chaque ligne (« NOM · Taux x % : part »), au lieu de la base unique de la ligne. À 0 ou sans
  référence, la colonne reste à NULL et le ticket est celui d'aujourd'hui.

- **P.REF par assurance sur le ticket** (retour du 05/11) : quand les organismes d'une ligne n'ont pas la même
  base, la ligne n'imprime plus un « P.REF » unique : chaque organisme imprime la sienne sur sa ligne de crédit,
  « CNAM · P.REF 2 335 · Taux 60 % : 1 401 » puis « MUPEMENET · P.REF 1 835 · Taux 30 % : 551 » (un organisme au
  prix de vente n'imprime pas de P.REF). Même base pour tous, un seul organisme, ou paramètre à 0 : ticket
  d'aujourd'hui (`CreditLigne.basesDifferentes`, `CreditLigne.libelle` avec prix de référence).

## Écran

- `VenteCtr.checkParamPrixRefCaisse` relit aussi `KEY_PRIX_REF_BASE_PAR_TP` à l'ouverture de l'écran de vente ;
  `VenteVNO.afficherRappelReferenceTp(visible, regleMinimum)` compose le libellé sous la grille en conséquence.
- « Part TP » et le net affichés sont toujours ceux renvoyés par le serveur (`net/assurance`, ou le `net` renvoyé par
  le `PUT` de saisie d'une cellule) : aucun calcul côté écran.

## Tests

- Unitaires (`src/test/java/rest/service/calculation/BaseParTiersPayantTest.java`, 19 cas) : série 1 figeant les
  résultats d'aujourd'hui à 0 (un et deux tiers-payants, références différentes, type `TAUX`, plusieurs lignes,
  plafond) ; série 2 exprimant la règle à 1. Les 8 tests existants du moteur passent inchangés.
- Non-régression sur la copie de travail (`src/test/e2e/prix-reference/test-base-par-tp-non-regression.js`) : 40
  ventes assurance closes (20 à un, 20 à deux tiers-payants) copiées en ventes en cours, `net/assurance` demandé
  comme l'écran. La série à 0, sans puis avec 97 références d'essai différentes par tiers-payant, a été **figée avant
  la livraison** (`E2E_FIGE`, fichier hors dépôt) et retrouvée **identique au franc près** après ; à 1, copies à un
  tiers-payant identiques, copies à deux tiers-payants sans plafond conformes à la règle ; retour à 0 identique.
  Copies et références retirées, ventes d'origine jamais écrites.
- Écran (`test-base-par-tp-deux-tiers-payants.js`, 20/20) : vente à deux tiers-payants, deux prix de référence saisis
  dans la grille, parts vérifiées à 0 puis à 1 (nouvelle vente : l'écran relit le paramètre), rappel présent puis
  absent, affichage = serveur, jeu d'essai retiré, paramètre remis à 0.
- Cas 2 rejoués après livraison : `test-deux-tiers-payants.js` 12/12, `test-non-regression-net.js` 8/8.
  `test-saisie-un-tiers-payant.js` : 24/25, l'échec vient de la colonne « C » du cas 1 (`KEY_LIGNE_COMPTANT_VO` à 1
  sur la base locale) que ce test n'attend pas ; sans rapport avec ce lot.

Le paramètre est à **0** sur la base locale à la fin des tests.
