# Stratégie de test de Prestige

Objectif : aucun défaut en production. Un test n'est réussi que si le résultat a été vérifié en base, à l'écran et
sur les documents. Un parcours qui se déroule sans erreur ne suffit pas.

Ce document complète `docs/QUALITE_TESTS.md` (règle du 07/10 : contrôles de saisie, ergonomie, mise en page,
cohérence des données, lancés par `src/test/e2e/retours/lancer-controles.sh`). Les deux s'appliquent.

## 1. Trois familles de tests, obligatoires à chaque évolution

| Famille | Ce qu'elle vérifie | Exemple |
|---|---|---|
| **Rapprochement** (e2e) | Une même donnée est identique partout : écran, ticket, PDF, export, base | `prix-reference/test-rapprochement-ticket.js` : taux et part de chaque ligne, écran = ticket = base |
| **Cohérence** (unitaire) | Les règles de calcul tiennent sur des milliers de cas tirés au hasard (graine fixe) | `CreditLigneCoherenceTest` : part = base × taux, somme = total, jamais négatif |
| **Bilan avant / après** (e2e) | Une opération laisse exactement les traces attendues, ni plus ni moins | vente de 2 boîtes : stock −2, un mouvement, une recette, un règlement |

Chaque nouveau test échoue d'abord sur l'ancien code (ou sur le défaut remis à l'essai), puis passe.

Les jeux d'essai sont variés, jamais un seul cas :

- valeurs différentes d'une ligne à l'autre ;
- quantité supérieure à 1 ;
- zéro ;
- plafond atteint ;
- plusieurs organismes ;
- annulation ;
- paramètre à 0 et à 1.

## 2. Contrôles métier, selon l'opération

| Contrôle | Ce qu'on vérifie |
|---|---|
| **Stock d'un produit** | Stock après = stock avant ± quantité de l'opération, sur le bon emplacement. Jamais de sortie en double. Une annulation rend exactement ce qui était sorti. |
| **Mouvements effectués** | Chaque opération (vente, annulation, entrée, retour, inventaire, ajustement) crée ses mouvements : stock, caisse (`mvttransaction`), recette (`t_recettes`), règlement (`vente_reglement`). Un seul mouvement par opération, avec les bons montants, le bon type, le bon utilisateur et la bonne date. |
| **Suivi des mouvements** | Stock initial + entrées − sorties = stock actuel. L'écran de suivi affiche les mêmes lignes et le même solde que la base. |
| **Solde d'un client** | Solde après = solde avant + achats à crédit − règlements. Même solde à l'écran du client, sur les relevés et en base. |
| **Parts des organismes** | La part de chaque organisme est la somme de ses lignes. Elle est identique sur le ticket, la facture et le relevé. |
| **Caisse** | Total des encaissements = somme des règlements. Le ticket Z concorde avec la base. |
| **Données écrites** | Toute donnée écrite en base a un lecteur et un test qui la relit. Une donnée écrite et jamais relue est un défaut. |

## 3. Mission de test fonctionnel (Playwright, vrai navigateur)

1. Se connecter avec le compte de test.
2. Repérer les menus accessibles et ce qu'ils permettent.
3. Explorer les écrans comme un utilisateur.
4. Jouer les scénarios métier.
5. Vérifier :
   - les montants, le net à payer et les remises autorisées ;
   - les messages d'erreur et le comportement des fenêtres ;
   - le stock avant et après chaque opération ;
   - les contrôles de la partie 2.
6. Relever les erreurs JavaScript, les réponses HTTP en erreur et les défauts d'affichage, avec une capture d'écran.
7. Distinguer les **défauts confirmés** des **anomalies suspectées**.

### Diagnostic d'un défaut confirmé

- Capture d'écran.
- Erreurs JavaScript.
- Réponses de l'API.
- Erreurs dans le journal de Payara.
- Classes Java et fichiers ExtJS en cause.
- Correction proposée, avec le risque de régression.

### Automatisation

Des tests Playwright réutilisables, avec des vérifications précises et des sélecteurs stables. Ils rejouent les clics
de l'utilisateur et retirent leurs données. Ils sont ajoutés à la série de Codex (`docs/notices/codex-serie-*`).

### Rapport

Un fichier Markdown dans `qa/reports`, avec les défauts classés en critique, majeur ou mineur. Pour chacun :

- le module ;
- le scénario ;
- le résultat attendu et le résultat obtenu ;
- les étapes pour reproduire ;
- la gravité ;
- la capture et les journaux ;
- la correction proposée.

## 4. Partage des rôles

| Opération | Claude Code | Codex |
|---|---|---|
| Explorer les menus | Exécute | Vérifie la couverture |
| Tester les fonctionnalités | Exécute | Rejoue les tests critiques |
| Détecter les défauts | Identifie | Confirme ou conteste |
| Examiner les API | Vérifie | Contrôle de son côté |
| Analyser les journaux de Payara | Analyse | Vérifie les conclusions |
| Écrire les tests Playwright | Produit | Audite les vérifications |
| Proposer les corrections | Propose | Vérifie les effets |
| Tester les régressions | Exécute | Contre-vérifie |
| Rapport | Rapport initial | Rapport d'audit |

Claude Code produit, Codex vérifie de son côté. Un défaut n'est « confirmé » que si Codex le reproduit, ou s'il est
prouvé par un test qui échoue.

## 5. Compte rendu de fin de travail

Avant de dire « fini », le compte rendu liste :

- les endroits où la donnée apparaît, et le test de rapprochement qui les compare ;
- les règles de calcul, et le test de cohérence qui les vérifie ;
- les traces attendues (stock, mouvements, solde), et le test de bilan avant / après ;
- les cas variés couverts.
