# Fusion de `plan/09112026` dans l'intégration, 11/11/2026

**Demande de l'utilisateur (11/11) :** « fusionne dans l'intégration ».

**Branche fusionnée :** `plan/09112026` au commit `c3f7b4ac7`.

**Branche cible :** `integration/recette-2026-10-29`, qui passe de `61856d216` à `67261e713`.

**Mode de fusion :** commit de fusion (`git merge --no-ff`). Il n'y a eu aucun conflit. Le cas 4 (archives, lots 4.A à 4.C) n'est pas concerné.

## 1. Ce qui arrive dans l'intégration (21 commits, du 10/11 au 11/11)

Les points 1, 2, 9, 11, 14, 18 et 19 du plan du 09/11 étaient déjà dans l'intégration (commits `73c547170`, `b66c1172f`, `6b930cd3f`). Le point 3 du plan du 09/11 (pointage BL par date de BL) reste sur `claude/pointage-releves`, qui n'est pas fusionnée.

### 1.1 Plan du 09/11

| Point | Contenu | Commit |
|---|---|---|
| 4 | Retour fournisseur : recherche « contient » sur le produit, le n° de BL et la référence. | `beded02d3` |
| 5 et 6 | Taux de rupture : un seul réglage pour la Prévision et le tableau de bord. La carte Activité gagne des tuiles. Migration `V7.6.7`. | `20c49b767` |
| 7 | Le nom du poste est gardé à la déconnexion et envoyé à la connexion. Les postes connus apparaissent dans Paramétrages (rubrique POSTE). | `5573869c0` |
| 8 | « À propos » s'ouvre en volet à droite, avec deux onglets, Version et Assistance. API `GET v1/a-propos` (401 sans session). L'API ne renvoie ni chemin, ni mot de passe, ni jeton, ni numéro. | `f9b65409e` |
| 10 | Activité des équipes : « 1 mois » ; sélecteur de garde à l'heure près ; seuil des ventes longues persistant (migration `V7.6.6`) ; taux par caissière ; CA par conseil ; onglets colorés sans filet gauche ; sept indicateurs d'équipe, chaque carte masquable. | `4762a07f3`, `63497694d`, `786872db4`, `83eebac1a` |
| 12 | Inventaire : filtre « Vendus après la création de l'inventaire », et son impression. | `00054b60a` |
| 13 | Chaque envoi WhatsApp est tracé (origine, utilisateur, suivi). Le ticket Z est inscrit au journal des événements. Migration `V7.6.40`. | `31188c7e0` |
| 14 bis | Écran de connexion : seule l'icône change, les couleurs restent. | `9bdf03999` |
| 15 | Ticket : le nom long du tiers payant s'imprime sur une ligne ou sur deux, selon le modèle de ticket. | `ee1925cea` |
| 16 | Icône Prestige 3 : onglet, tailles 16 à 256, connexion, bandeau, « À propos ». | `269a26ef7` |

### 1.2 Plan du 10/11

| Point | Contenu | Commit |
|---|---|---|
| 1 | Reçu de règlement d'un différé. Il montre « Vente N° … du … » au lieu de l'identifiant interne, ainsi que « Montant dû (n ventes) », « Reste sur ces ventes » et « Solde restant du client ». | `452e35590`, `2b8c89992` |
| 2 | Fenêtre « Seuil de réserve atteint » agrandie, avec des colonnes de seuils en couleur. L'impression passe par le modèle dédié `rp_reserve_apres_entree`. | `52ceffa36` |
| 3 | Réserve, onglet Suggestions. Une suggestion manuelle se supprime sans motif (confirmation dans l'icône) ; une suggestion automatique demande toujours un motif. Référence courte `SR-RAY-` ou `SR-RES-` suivie de 5 caractères. | `52ceffa36` |
| 4 | Différés, onglet Solde. Rien ne se charge à l'ouverture. Le relevé est groupé par client, avec un volet de détail (produits d'une vente, détail d'un règlement). PDF (`releve_differes_clients`) et Excel groupés. | `bf68e8c1a` |

### 1.3 Demande 61 (Prestige Mobile)

Commit `c3f7b4ac7`. Réponse détaillée : `REPONSE_SERVEUR_2026-11-11_demande61.md`.

- **Droit absent de la base.** Si `P_RESERVE_SUGGESTION` n'existe pas (actif) dans `t_privilege`, rien ne le contrôle, comme avant la demande 60. C'est le cas pour les routes `v1/suggestion-reserve`, `voirSuggestions`, la cloche, le tableau de bord et la clôture d'un BL. La règle tient en un seul endroit : `PrivilegesEnBase`, un nouvel EJB.
- **Retour des manquants abandonné.** Il ne bloque plus le BL : un nouvel appel crée un nouveau retour. C'est le retour le plus récent qui compte.
- **Réponse `deja:true`.** Elle a la même forme que la création, y compris `lignes` et `totalManquant`.

### 1.4 Tests corrigés

- `test-une-ligne-cochee` : l'annulation passe par le menu des motifs. Ce test était arrêté dans le rapport de fusion du lot Q2.5.
- Les tests des modèles de ticket remettent leur table en place sans perdre l'utilisateur.
- Les tests des différés, de la cloche, des droits serveur, du retour fournisseur en attente, du poste et du taux de rupture lisent maintenant `BASE`. Les deux derniers sont corrigés après la fusion (voir 3.2).

### 1.5 Migrations et déploiement

**Migrations Flyway :** `V7.6.6`, `V7.6.7` et `V7.6.40`. Aucun doublon de version avec l'intégration ni avec les autres branches locales.

**Déploiement :** il y a de nouveaux EJB (`PrivilegesEnBase`, `AProposRessource`, `PosteRessource`). Il faut donc faire `undeploy`, supprimer `generated/policy/prestige`, puis `deploy`.

## 2. Tests unitaires

`mvn -o package` sur `67261e713` (JDK 11) : **2 293 tests, aucun échec, aucune erreur**.

## 3. Tests d'écran sur l'intégration

**Conditions :**
- le WAR de `67261e713` est déployé sur domain3 (port 10090, copie de travail `laborex_audit`) ;
- un seul test à la fois, sous le verrou `D:\projet\p3\verrou-e2e`.

Pendant que la série attendait le verrou, une autre session (« controle-fusion-ticket ») a redéployé domain3 avec son propre WAR. La série a donc été arrêtée avant son premier test, puis relancée avec un redéploiement de l'intégration une fois le verrou obtenu. Ainsi, chaque test a bien porté sur `67261e713`.

### 3.1 Résultat : 24 tests verts sur 26, puis 26 sur 26 après correction de deux tests

| Test | Résultat |
|---|---|
| retours/test-demande59-bl-recu | 40/40 |
| securite/test-reserve-voir-suggestions-droits | 108/108 |
| retours/test-differes-solde-client-1111 | 30/30 |
| retours/test-differes-solde | 16/16 |
| retours/test-differes-reglement | 14/14 |
| retours/test-recu-differe-numero-1111 | 44/44 |
| retours/test-reserve-suggestion-manuelle-1011 | 15/15 |
| retours/test-entree-stock-0825 | 16/16 |
| retours/test-reserve-apres-entree | 21/21 |
| retours/test-a-propos-1111 | 28/28 |
| retours/test-icone-prestige3-1011 | 19/19 |
| retours/test-poste-garde-1011 | 3/4 (8080 en dur), puis 23/23 après correction |
| retours/test-taux-rupture-1011 | 1/2 (8080 en dur), puis 35/35 après correction |
| retours/test-ticket-tiers-payant-long-1011 | 13/13 |
| retours/test-traces-whatsapp-1011 | 16/16 |
| retours/test-retour-recherche-0911 | 13/13 |
| inventaire/test-filtre-vendus-apres-creation-1011 | 19/19 |
| productivite/test-activite-indicateurs-1011 | 29/29 |
| productivite/test-activite-couleurs-1011 | 9/9 |
| prix-reference/test-prise-en-charge-totale (lot Q2.5) | 30/30 |
| prix-reference/test-rapprochement-ticket (lot Q2.5) | 19/19 |
| prix-reference/test-saisie-validee-cloture-0611 (lot Q2.5) | 18/18 |
| retours/test-parametres-explication-1011 (lot Q2.5) | 10/10 |
| retours/test-parametres-explications-36 (lot Q2.5) | 7/7 |
| retours/test-cloche | 18/18 |
| securite/test-droits-serveur | 26/26 |

Les cinq tests du lot Q2.5, fusionné juste avant, restent verts. Les deux lots touchent tous les deux l'écran des paramètres et le ticket.

### 3.2 Les deux échecs venaient des tests, pas du code

`test-poste-garde-1011` et `test-taux-rupture-1011` avaient l'adresse `localhost:8080` en dur. Ils se sont donc connectés au serveur de l'utilisateur, qui porte une version sans les points 5 à 7, et ils ont échoué faute d'y trouver la rubrique POSTE ou la tuile du taux de rupture. Ils lisent maintenant `BASE`, comme les autres tests (commit sur l'intégration et sur `plan/09112026`).

Sur 8080, ils n'ont rien écrit d'autre qu'une connexion du compte d'essai e2e. Le poste d'essai n'a jamais été enregistré, et aucun paramètre n'a été touché : le test s'est arrêté avant.

Environ 350 autres tests d'écran ont encore 8080 en dur. Leur correction est proposée à part.

## 4. Où sont les branches

| Branche | Où | État |
|---|---|---|
| `plan/09112026` | worktree `D:\projet\p3\prestige-plan-09112026` | Fusionnée (`c3f7b4ac7`). |
| `PRES-/explications-parametres` et `PRES-/prise-en-charge-totale` (lot Q2.5) | — | Fusionnées plus tôt le 11/11 (`0417e3a02`). |
| `claude/pointage-releves` | — | Point 3 du plan du 09/11, non fusionnée, en attente de votre ordre. |
| Cas 4 (`essai/cas4-9080`, archives 4.A à 4.C) | — | Exclu. Avant toute fusion, ses migrations `V7.2.38` et `V7.2.39` doivent être renumérotées. |
| `claude/new-session-xm8ptu` | worktree principal | Rapports et cahiers seulement. |

## 5. Cahier de recette

`docs/recette/CAHIER_RECETTE_2026-11-11.xlsx` :
- la feuille « Plan du 09-11 » compte 24 cas ;
- la feuille « Plan du 10-11 » compte 6 cas : P10-01 à P10-04 pour les points 1 à 4, P10-05 et P10-06 pour la demande 61 ;
- la synthèse est à jour.

## 6. Suite

- 8080 porte encore `0417e3a02` : il n'a pas été redéployé, car c'est le serveur de l'utilisateur.
- La branche `claude/pointage-releves` attend un ordre de fusion.
