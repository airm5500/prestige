# Récapitulatif des worktrees fusionnés le 09/11/2026

Cible : `integration/recette-2026-10-29`. Elle est dans le worktree `D:\projet\p3\prestige-integration` et part de
`011dabe21`.

Les fusions sont faites dans l'ordre ci-dessous, avec `--no-ff`. Chaque message de commit suit le modèle « Fusion de
<branche> dans l'intégration (accord de l'utilisateur du 09/11) ».

## Branches fusionnées

Le nombre de commits compte les commits de la branche absents de l'intégration au moment de sa fusion. Les branches
fusionnées plus tôt en ont déjà apporté une partie.

| Ordre | Branche | Dernier commit | Fusion | Commits | Fichiers | Worktree |
|---|---|---|---|---|---|---|
| 1 | `PRES-/reserve-voir-suggestions-d3a066` (demande 60) | 9959c50b9 | f55358a46 | 35 | 29 | `D:\projet\p3\prestige\.claude\worktrees\reserve-voir-suggestions-d3a066` |
| 2 | `PRES-/icone-pastille-bf4cf4` (icône, avec le plan du 08/11) | 3e8a7506f | 48d4c2384 | 29 | 138 | `…\worktrees\icone-pastille-bf4cf4` |
| 3 | `PRES-/bl-recu-retours-fournisseurs-bdafcc` (demande 59, retours) | 4362068c4 | 4724d7e5e | 17 | 34 | `…\worktrees\bl-recu-retours-fournisseurs-bdafcc` |
| 4 | `PRES-/matching-codes-prix-grossistes-c45630` (correspondance) | 0fb31f1f8 | 733a3f6bb | 14 | 32 | `…\worktrees\matching-codes-prix-grossistes-c45630` |
| 5 | `PRES-/avoir-activite-tableau-bord-21e575` (plan avoir 1) | 354adbb79 | d3ac82bd7 | 11 | 54 | `…\worktrees\avoir-activite-tableau-bord-21e575` |
| 6 | `PRES-/avoir-affichage-e5a5e6` (plan avoir 3, 7, 8) | c68f76ef5 | eee500759 | 5 | 11 | `…\worktrees\avoir-affichage-e5a5e6` |
| 7 | `PRES-/avoir-presaisie-bl-b5eb09` (plan avoir 6) | ee10d1ac5 | bd4718e08 | 5 | 13 | `…\worktrees\avoir-presaisie-bl-b5eb09` |
| 8 | `PRES-/avoir-whatsapp-web-avis-a27062` (plan avoir 9, 10) | 9846a034f | 0a7a9d364 | 7 | 22 | `…\worktrees\avoir-whatsapp-web-avis-a27062` |
| 9 | `PRES-/avoir-campagnes-f6e4e5` (plan avoir 4, 5) | e23878b4d | f119649f7 | 8 | 19 | `…\worktrees\avoir-campagnes-f6e4e5` |
| 10 | `claude/faisabilite-connecteurs-grossistes` (connecteurs, après-midi) | ece9e500c | 708500acf | 62 | 173 | `…\worktrees\connecteurs-grossistes` |

`…` remplace `D:\projet\p3\prestige\.claude`.

**Arrivés par ces branches :**
- le plan du 08/11, branche `plan/08112026-evolutions-rattrapages`, worktree `D:\projet\p3\prestige-plan-08112026`,
  dernier commit f5d90b186 ;
- 33 commits de `claude/new-session-xm8ptu` absents de l'intégration : cahiers, analyses et notices.

**Après les fusions :**
- e760bdc1f : correctif d'un test de la demande 59 ;
- 1f2d1fe7a : les retours par état aussi dans le PDF du tableau de bord des retours, un défaut né de la fusion.

Le rapport décrit les deux, § 6.

## Conflits

| Fusion | Fichiers | Résolution |
|---|---|---|
| 1 | 3 cahiers de recette (06, 07, 08/11) | même contenu de cellules ; version de la branche principale |
| 3 | `CommandeServiceImpl` | quantité entrée de l'intégration + mode « reçu » ; `getLot` par bon ; réserve avec suggestions du bon et droit de la demande 60 |
| 3 | `EtatControlBonServiceImpl`, `MvtProduitServiceImpl`, `correctifs-affichage.js` | ajouts des deux côtés gardés |
| 4 | `CommandeServiceImpl` | deux EJB gardés |
| 7 | `app.js`, `correctifs-affichage.js` | deux menus gardés |
| 9 | `SmsImpl` | numéro de la branche, journaux masqués de l'intégration |
| 9 | `CampagneService` | structure de l'intégration, règle téléphone de la branche |

## Migrations ajoutées

Aucun numéro n'est en double.

| Numéros | Origine |
|---|---|
| V7.2.43 à V7.2.48 | plan du 08/11 |
| V7.2.60, V7.2.61 | demande 59 et retours |
| V7.2.70 | demande 60 |
| V7.2.95 | pré-saisie des BL |
| V7.2.100 | WhatsApp Web |
| V7.6.0 à V7.6.5 | correspondance grossistes |

## Vérifications
- Construction : réussie.
- JUnit : 1 989 tests, aucune assertion en échec.
- Tests d'écran : 79 tests sur le WAR fusionné, un à la fois sous le verrou.
  - 76 sont verts, y compris les deux tests rejoués après correctif.
  - 3 gardent des échecs déjà présents sur l'ancien code.
  - Le détail est dans `CAHIER_RECETTE_FUSION_2026-11-09.xlsx`, feuille « Tests de la série ».

## Non fusionnés
- **Cas 4** (`PRES-/cas4-lot-4c-archives-e5f376`, lots 4.A, 4.B et 4.C) : seulement dans la version d'essai
  `essai/cas4-9080` (worktree `D:\projet\p3\prestige-essai-9080`), déployée sur domain2 (port 9080) pour votre test.
  Ses migrations y sont renumérotées V7.2.106 à V7.2.108 (doublons de numéros avec l'intégration).
- **Présentations des saisies** : à supprimer, sur votre demande. Le worktree est retiré de Git ; ses modifications
  sont gardées sous l'étiquette `archive/presentations-saisies-0911`. La suppression des branches locale et distante
  a été refusée par le contrôle des permissions.

## Après les fusions (après-midi du 09/11)
- fb49915a3 : retours fournisseurs, création avec plusieurs lignes et historique dans l'ordre (migration V7.2.105) ;
- 708500acf : fusion des connecteurs ; conflit de `RubriqueParametre`, les deux paramètres gardés ;
- fc60d9ca6 : plus de filet de couleur (activité des équipes, rubriques Mayité), garde des tests d'extranet.

Détail et vérifications : rapport, § 9.

## Worktrees qu'on peut retirer
- **Les dix worktrees ci-dessus :** leurs branches sont fusionnées et poussées.
- **`D:\projet\p3\prestige-plan-08112026` :** son contenu est arrivé avec les branches du plan avoir.
- **`D:\projet\p3\prestige-ancien-0811` :** une tête détachée qui servait aux comparaisons avec l'ancien WAR.

Ces worktrees ne seront retirés que sur votre demande.
