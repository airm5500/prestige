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

**Mois en cours** (décision du 21/11) : il n'est pas compté, même quand l'historique est inférieur à Q3. Rien à
changer : c'était déjà le cas.

**Paramètre `SEMOIS_DIVISEUR_MOIS_REELS`** (décision du 21/11, nom et descriptif validés), pour les trois modes :
- **1, valeur par défaut** : la nouvelle règle, division par les mois réellement présents × 4 semaines. Un paramètre
  absent vaut aussi 1.
- **0** : l'ancienne formule, division par Q3 × 4 semaines, quel que soit l'historique.
- Le calcul au jour d'une classe ABC n'est pas concerné : il divise toujours par les jours des mois retenus.
- Les corrections 2 et 3 s'appliquent quelle que soit la valeur.

**Migration** `V7.6.41.2111__semois_diviseur_mois_reels.sql` :
- elle crée le paramètre à 1, avec le descriptif validé, mot pour mot ;
- elle ajoute son explication pour le bouton « i » de l'écran des paramètres :
  - la règle reprend le même texte ;
  - un tableau donne l'exemple chiffré de Moaye (seuil de 168 avec 1, de 56 avec 0) ;
  - les rappels précisent que le mois en cours n'est pas compté et qu'un paramètre absent vaut 1 ;
- elle élargit `t_parameters.str_DESCRIPTION` de 254 à 1 000 caractères :
  - le descriptif validé en fait 317, et le mode strict de MariaDB aurait refusé l'insertion ;
  - la colonne n'est pas indexée, et l'entité Java la déclare déjà en texte long ;
- elle met à jour les explications de `SEMOIS_ABC` et `SEMOIS_PAR_PRODUIT` :
  - leur formule renvoie au nouveau paramètre ;
  - un cas ajouté dit qu'un produit actif sans vente passe à 0.

**Ajout** : une fiche dont le seuil et la quantité sont déjà justes n'est plus réécrite.
- Le déclencheur `t_famille_before_upd_tr` pose `dt_UPDATED = NOW()` et ajoute une ligne à `t_famille_history` à
  chaque UPDATE, même sans changement.
- Sans cet ajout, la correction 2 aurait réécrit chaque mois les quelque 4 000 fiches restées à 0 à Moaye.
- Un recalcul identique ne réécrit plus rien. Avant, il réécrivait chaque produit vendu.

**Journaux de calcul** :
- `semois_abc` et `semois_par_produit` ont trois nouveaux champs : `moisRetenus`, `vendu` et `diviseurMoisReels`.
  Leur `nombreSemaines` donne le diviseur réellement appliqué.
- Dans `semois_normal`, `q3Mois` donne le nombre de mois du diviseur : les mois couverts avec le paramètre à 1, Q3
  avec le paramètre à 0.

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

### Test de cohérence : `SemoisDiviseurParametreTest` (3 tests)

- **Tirages** : 20 000 cas tirés au hasard (graine 2112) comparent les deux méthodes sur la même fenêtre et les mêmes
  ventes.
- **Paramètre à 0** : la consommation vaut toujours total / (Q3 × 4) ; au jour, elle reste total / jours.
- **Comparaison des deux méthodes** :
  - elles sont identiques dès que l'historique couvre Q3 mois, ou en calcul au jour ;
  - avec un historique court, le seuil n'est jamais plus bas avec les mois réels ;
  - plus de 1 000 cas diffèrent.
- **Cas de Moaye** : un seuil de 56 avec le paramètre à 0, de 168 avec 1 ou par défaut.
- **Rapprochement du descriptif** : il est lu dans la migration et vérifié dans les deux tables.
  - Dans `t_parameters`, c'est le texte validé, mot pour mot.
  - La règle de l'explication est le même texte.
  - L'explication est lisible par l'écran (`ExplicationParametre.estValide`).

### Test d'écran : `src/test/e2e/reappro/test-semois-seuils-moaye.js`

Résultats :
- 31/31 sur le code final ;
- 26/31 sur le commit précédent sans paramètre (`0a5b2213d`) : scénarios E et F ;
- 14/23 sur l'intégration `e68867362`, avant les scénarios E et F.

**Parcours** : connexion, Fiche Article, « Recalculer seuils », Oui, puis le message de fin. Sept recalculs sur le banc
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
| Paramètre | Créé à 1, descriptif validé = `t_parameters` = explication = service de l'écran des paramètres | (pas de paramètre) | OK |
| E. Paramètre à 0, ABC, un mois | 11 240 produits actifs = ventes / (Q3 × 4), non vendus à 0 | 3 022 écarts (sans paramètre) | 0 |
| | CIP 3073979 | 195 (sans paramètre) | 65 |
| | Journal : `diviseurMoisReels` false, 12 semaines | Absent | OK |
| F. Paramètre à 0, standard, un mois | 4 223 produits simples vendus = conso / (Q3 × 4) | 2 952 écarts (sans paramètre) | 0 |
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

- **Mode SEMOIS standard** : tranché le 21/11 (« oui aussi en standard ») ; voir le complément ci-dessous.
- **Dates de modification** : un produit dont le seuil change voit son `dt_UPDATED` mis à l'heure du calcul, par le
  déclencheur, comme avant. À Moaye, le premier recalcul touchera donc environ 6 000 fiches. Le catalogue mobile,
  synchronisé sur `dt_UPDATED`, les renverra une fois.
- **Non-régression** : `test-parametres-explications-36.js` passe 7/7 sur la base migrée.
  - Les explications de `SEMOIS_ABC` et `SEMOIS_PAR_PRODUIT` modifiées s'affichent comme en base.
  - Le premier passage a échoué une fois, sur une lecture JSON que je n'ai pas reproduite, même en rejouant sa
    requête.
- **Migration sur le banc** : la migration `V7.6.41.2111` est appliquée sur `laborex_audit`. Le paramètre, les
  explications et la colonne élargie y restent, comme après un déploiement.
- **Banc** : les essais ont laissé `dt_UPDATED` à l'heure du test sur les fiches actives de `laborex_audit`, comme
  les autres tests (le déclencheur l'impose). Les lignes d'historique ajoutées par les essais ont été retirées.
- **Copie de Moaye** : le calcul n'a pas été rejoué sur `moaye`. Les effets sont déduits des chiffres de l'analyse.

## Complément du 21/11 : non vendus à 0 en SEMOIS standard (branche `correctif/semois-standard-2111`)

Décision de l'utilisateur, transmise le 21/11 : « oui aussi en standard ».

### Ce qui change

- **SEMOIS standard** : après le calcul des produits vendus (simples, boîtes, boîtes dont un détail est vendu), chaque
  produit actif hors détail déconditionné qui n'a aucune vente dans la fenêtre passe à seuil 0 et quantité 0. Un produit
  dont le calcul du seuil est désactivé sur sa fiche (`bool_CALCUL_SEUIL = 0`) reste intact. Le journal
  `semois_normal_<date>.json` note ces produits avec le type « non vendu ».
- **Sécurité des trois modes** : si la lecture des ventes échoue (erreur SQL), aucun produit n'est remis à 0. Avant
  ce complément, en ABC et par produit, une erreur de lecture rendait une liste vide : tous les produits actifs
  seraient passés à 0. En standard, une page de ventes illisible ou un comptage en échec bloque aussi la remise à 0.
- **Explication** : la migration `V7.6.41.2112` ajoute aux rappels de `SEMOIS_DIVISEUR_MOIS_REELS` : « Dans les trois
  modes, un produit actif sans vente sur les mois retenus passe à seuil 0 et quantité 0, sauf si le calcul du seuil est
  désactivé sur sa fiche. » Le paramètre `SEMOIS` n'a pas d'explication ; le texte validé (« regle ») ne change pas.

### Tests

- **Cohérence** : `SemoisNonVendusCoherenceTest` (4 tests). Sur 20 000 tirages (graine 2113), les produits remis à 0
  sont exactement les actifs non vendus, dans l'ordre, sans doublon, jamais un vendu ; vendus actifs + remis à 0 = actifs.
  Lecture en échec : aucun produit remis à 0 (standard) ni traité (ABC, par produit). Texte et garde de la migration.
- **Écran** : `test-semois-seuils-moaye.js`, cas B étendu (le contrôle « non vendus intacts » devient « non vendus à 0 ») :
  - B : chaque produit actif sans vente dans la fenêtre à 0/0/0 ; calcul interdit intact ; aucun produit vendu à 0 ;
  - B : rapprochement journal `semois_normal` = base, chaque non vendu noté « non vendu » à 0 ;
  - B2 : second recalcul sans aucune réécriture (ni valeur ni ligne d'historique) ;
  - B : bilan, inactifs intacts et détails déconditionnés non touchés ;
  - F : avec l'ancienne formule aussi, non vendus à 0 ;
  - écran des paramètres : le rappel figure une seule fois dans l'explication.
- **Sur l'ancien code** (`8b68a979e`) : 34/39, les contrôles des non vendus en standard, du journal, du cas F et du
  rappel échouent (un cinquième échec venait du test lui-même, corrigé : il comparait les détails à leur valeur
  d'origine au lieu de celle de la reprise).
- **Sur le nouveau code** : 39/39 sur `domain4` (mode SEMOIS isolé, base `laborex_audit`) ; `test-parametres-explications-36.js`
  7/7 ; tests unitaires SEMOIS 12/12. `domain4` est remis en l'état (pool `appaul_perf`, sans option `user.home`, arrêté).
- **Banc** : la migration `V7.6.41.2112` est appliquée sur `laborex_audit`.
