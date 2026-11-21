# Seuils SEMOIS non calculés (Moaye) : correction du 21/11/2026

**Analyse** : `docs/analyses/2026-11-21/seuils-abc-moaye.md` (branche `PRES-/analyse-fonctions-87c966`, `faa9e333a`).
**Code** : branche `correctif/semois-moaye-2111`, à partir de l'intégration `e68867362`. Elle n'est pas encore
fusionnée, ni livrée en officine.

## Ce qui change

Les trois corrections validées le 21/11 sont faites, toutes dans `job/SemoisService.java`.

1. **Diviseur.** Dans les trois modes SEMOIS (standard, ABC, par produit), la consommation est divisée par les mois
   réellement retenus, et non plus par Q3.
   - En standard, ce sont les mois compris entre le premier et le dernier mois retenus, car les ventes sont lues sur
     toute cette période.
   - En ABC et par produit, ce sont les mois de la fenêtre du produit.
   - À Moaye, un mois de ventes est maintenant divisé par 4 semaines, et non plus par 12.
2. **Produits sans vente.** En ABC et par produit, les produits actifs sans vente dans la fenêtre sont traités :
   seuil et quantité passent à 0, comme dans le mode par défaut.
   - Les produits avec `bool_CALCUL_SEUIL = 0` restent intacts.
   - Les détails déconditionnés restent comptés dans leur boîte.
3. **Produits sans classe.** En ABC, un produit sans classe reçoit le SEMOIS standard (Q1, Q2, Q3 globaux), qu'il soit
   vendu ou non. Non vendu, il passe donc à 0.

**Point ouvert, sans décision** : le mois en cours n'est toujours pas compté quand l'historique est inférieur à Q3.

**Ajout** : une fiche dont le seuil et la quantité sont déjà justes n'est plus réécrite.
- Le déclencheur `t_famille_before_upd_tr` pose `dt_UPDATED = NOW()` et ajoute une ligne à `t_famille_history` à
  chaque UPDATE, même sans changement.
- Sans cet ajout, la correction 2 aurait réécrit chaque mois les quelque 4 000 fiches restées à 0 à Moaye.
- Un recalcul identique ne réécrit plus rien. Avant, il réécrivait chaque produit vendu.

**Journaux de calcul** :
- `semois_abc` et `semois_par_produit` ont deux nouveaux champs : `moisRetenus` et `vendu`. Leur `nombreSemaines` vaut
  maintenant `moisRetenus × 4`.
- Dans `semois_normal`, `q3Mois` donne maintenant les mois réellement couverts par les ventes.

## Effet attendu à Moaye au prochain recalcul

D'après les chiffres de l'analyse ; rien n'a été rejoué sur la copie de Moaye.

| Population | Avant | Après |
|---|---|---|
| Produits vendus en octobre (2 024 calculés) | Conso / 12 semaines, seuils trois fois trop bas | Conso / 4 semaines |
| Produits actifs non vendus en octobre (4 064) | Valeurs de la reprise, 100 / 1 | 0 / 0 |
| Dont produits sans classe (3 744) | 100 / 1 | 0 / 0 (SEMOIS standard) |

- Exemple de l'analyse : le CIP 3073979 (336 ventes en octobre, classe A, Q1 = 2) passe d'un seuil de 56 à 168.
- Une fois trois mois d'historique acquis (janvier), le calcul est identique à l'ancien.

## Tests

Chaque nouveau test a d'abord échoué sur l'ancien code.

### Test de cohérence : `SemoisCalculCoherenceTest` (5 tests)

- **Tirages** : 20 000 cas tirés au hasard (graine 2111) :
  - historiques de 1 à 12 mois ;
  - Q1 et Q2 de 0 à 5, Q3 de 1 à 12 ;
  - unité à la semaine et au jour ;
  - ventes nulles, entières et fractionnaires (détails) ;
  - ventes hors fenêtre, jamais comptées.
- **Règles vérifiées** :
  - mois retenus = min(Q3, historique) ;
  - conso = total / (mois × 4), ou total / jours ;
  - seuil = ⌈conso × Q1⌉ et quantité = ⌈conso × Q2⌉ ;
  - jamais négatif ;
  - 0 / 0 sans vente.
- **Non-régression** : dès que l'historique couvre Q3 mois, le résultat est identique à l'ancien calcul. Plus de
  2 000 cas tirés ont un historique court.
- **Cas de Moaye** : un mois de 336 ventes donne un seuil de 168 (l'ancien calcul donnait 56).
- **Produits à traiter** : les produits vendus d'abord, dans leur ordre, puis tous les actifs, sans doublon
  (3 000 tirages).

### Test d'écran : `src/test/e2e/reappro/test-semois-seuils-moaye.js`

Résultats : 23/23 sur le code corrigé, 14/23 sur l'ancien code.

**Parcours** : connexion, Fiche Article, « Recalculer seuils », Oui, puis le message de fin. Cinq recalculs sur le banc
(11 244 produits actifs), chacun en 6 à 10 s.

**Cas de Moaye reproduit** :
- le calendrier d'août et de septembre 2026 passe sous 20 jours, donc la fenêtre se réduit à octobre ;
- tous les produits actifs repartent de 100 / 1.

**Jeu d'essai** :
- 30 produits non vendus reçoivent une classe (A, B ou C) ;
- 10 produits vendus perdent la leur ;
- le calcul est interdit sur quatre produits : vendu et non vendu, avec et sans classe ;
- les Q de fiche valent 0, 1, 3 ou 5.

| Scénario | Contrôle | Ancien code | Corrigé |
|---|---|---|---|
| A. ABC, un mois | 4 432 vendus avec classe = calcul attendu, produit par produit | 3 013 écarts | 0 |
| | 11 vendus sans classe (standard) | 9 écarts | 0 |
| | 4 622 non vendus avec classe : 0 / 0 | 4 622 écarts (restés 100 / 1) | 0 |
| | 2 175 non vendus sans classe : 0 / 0 | 2 175 écarts | 0 |
| | CIP 3073979 (389 ventes en octobre, classe A) | 65 | 195 |
| | Calcul interdit : intact | OK | OK |
| | Rapprochement journal `semois_abc` = base, pour chaque produit actif | 11 240 écarts | 0 |
| | Rapprochement écran (colonnes Seuil et Qte.Reap) = base, sur 4 témoins | OK (valeurs fausses partout) | OK |
| | Bilan : une ligne d'historique par fiche changée, aucun produit inactif touché | OK | OK |
| A2. Même recalcul une seconde fois | Aucune fiche réécrite (historique, `dt_UPDATED`) | 4 443 lignes d'historique | 0 |
| B. Standard, un mois | 4 223 produits simples vendus = conso / 4 semaines | 2 952 écarts | 0 |
| | Non vendus non modifiés (inchangé, hors demande) | OK | OK |
| C. Par produit, un mois | 11 240 produits actifs = calcul attendu | 10 052 écarts | 0 |
| D. ABC, trois mois | 6 309 produits vendus = ancien calcul | OK | OK |
| Bilan final | Empreinte de `t_famille` (hors `dt_UPDATED`), `t_parameters`, `t_calendrier`, `t_classe_abc`, `t_famille_history` | OK | OK |

**Endroits où la donnée apparaît et sont comparés** :
- la base : `int_SEUIL_MIN`, `int_STOCK_REAPROVISONEMENT`, `int_QTE_REAPPROVISIONNEMENT` ;
- le journal de calcul `semois_abc_<date>.json` ;
- la grille de la Fiche Article ;
- le calcul attendu, refait par le test de façon indépendante.

**Environnement** :
- domaine d'essai isolé `domain4`, avec `-Duser.home=D:\essai-semois\home` et un `dicisms.properties` réduit à
  `reappro.mode=semois`, sur la base de banc `laborex_audit` ;
- la configuration du poste n'a pas été touchée, et `domain4` est remis en l'état après le test.

## Limites et points à connaître

- **Mode SEMOIS standard** : les produits non vendus ne sont toujours pas remis à 0. La correction 2 ne visait que
  les modes ABC et par produit. À trancher si on veut l'étendre.
- **Dates de modification** : un produit dont le seuil change voit son `dt_UPDATED` mis à l'heure du calcul, par le
  déclencheur, comme avant. À Moaye, le premier recalcul touchera donc environ 6 000 fiches. Le catalogue mobile,
  synchronisé sur `dt_UPDATED`, les renverra une fois.
- **Banc** : les essais ont laissé `dt_UPDATED` à l'heure du test sur les fiches actives de `laborex_audit`, comme
  les autres tests (le déclencheur l'impose). Les lignes d'historique ajoutées par les essais ont été retirées.
- **Copie de Moaye** : le calcul n'a pas été rejoué sur `moaye`. Les effets sont déduits des chiffres de l'analyse.
