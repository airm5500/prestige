# Rapport de performances — 28 octobre 2026

> Mesure des onze parcours demandés par l'officine, sur les bases du poste local. **Aucune correction n'a été faite** :
> ce rapport sert à choisir les corrections. Chaque cause est marquée **prouvé** (mesure, plan d'exécution, ou essai sur
> une copie) ou **hypothèse** (piste plausible, non démontrée).

*Les trois bases demandées (`appaul`, `zanzan`, `laborex_v1_db`) sont mesurées sur les onze parcours ; `capitale` sert de
comparaison partielle.*

## 1. En bref

| Rang | Cause | Parcours touchés | Gain prouvé | Effort | Risque |
|---|---|---|---|---|---|
| 1 | **Suggestion : coût quadratique dans le code Java** : Hibernate revérifie toute la transaction avant chaque requête (91 % des piles Java ; le SQL fait 2 à 8 % du temps) | 7, 8 | à mesurer après la correction ; aujourd’hui, de 1 jour à 3 mois : 49 s → 784 s (laborex), 18 s → 476 s (appaul), 5 s → 122 s (zanzan) | moyen | moyen |
| 2 | **Statistiques MariaDB fausses** sur les colonnes caissier et utilisateur : le moteur lit les ventes caissier par caissier au lieu de les lire par date | 1, 4, 5, 6, 7, 8, 9 | à l’écran : Ticket Z 1 semaine 3,0 s → 0,4 s ; Ventes 1 mois 3,2 s → 0,5 s ; Récap 1 mois 3,9 s → 1,1 s ; Articles vendus 3 mois 12,6 s → 2,0 s | très faible | très faible |
| 3 | Compteur « Ventes en avoir » de la cloche : mauvais index, appel répété toutes les quelques secondes | tous les écrans (9 surtout) | 450 ms → < 1 ms par appel | très faible | très faible |
| 4 | Récap et liste des articles vendus : agrégat complet recalculé à chaque page, jointures inutiles | 5, 6 | à mesurer | moyen | faible |
| 5 | Tableau de bord à froid : 935 fichiers JavaScript (15 Mo) chargés un par un, cinq API lourdes en parallèle | 9 | à mesurer | moyen | faible |
| 6 | Tiers payants : 540 Ko pour 20 lignes (HTML des clients dans la réponse) et N+1 | 3 | à mesurer | faible | faible |
| 7 | Pilotage, onglet « À suivre » : recalcul sur les ventes brutes de 4 ans, une fois par carte | 11 | à mesurer | moyen | faible |

**Ce que voit l'utilisateur, base par base** (médianes) :

| Parcours | appaul | zanzan | laborex |
|---|---|---|---|
| Suggestion par quantités vendues, 3 mois | **476 s** | **122 s** | **784 s** |
| Suggestion par seuil, 3 mois | **138 s** | 32 s | **136 s** |
| Articles vendus, 3 mois | **12,6 s** | 1,3 s | 1,5 s |
| Récap des articles vendus, 3 mois | **8,2 s** | 1,5 s | 2,6 s |
| Ventes terminées, 1 mois | 3,2 s | 0,1 s | 0,2 s |
| Ticket Z, 1 semaine | 3,0 s | 0,2 s | 0,3 s |
| Pilotage, « À suivre » (1ʳᵉ ouverture) | **29 s** | 19 s | 15 s |
| Tableau de bord (1ʳᵉ connexion après démarrage) | 10,5 s | 6,9 s | 7,0 s |
| Clients, tiers payants, fiche article, autres onglets du pilotage | < 0,5 s | < 0,4 s | < 0,9 s |

Seule `appaul` a des statistiques fausses (cause 2) : c'est pourquoi ses ventes, son Ticket Z et ses articles vendus sont
lents, alors que les deux autres bases répondent vite. La suggestion (cause 1) est lente sur les trois bases.

Les causes 2 et 3 se corrigent **sans changer le comportement** des écrans : elles changent seulement le chemin de
lecture du moteur, et les résultats sont identiques (sommes de contrôle comparées, voir § 4.2).

## 2. Méthode

### 2.1 Bases et environnement

| Base | Contenu | Où | Schéma | Fin de période retenue |
|---|---|---|---|---|
| `capitale` | base de référence du poste (lecture seule) | MariaDB principal, port 3306 | 7.2.x | 2026-10-23 |
| `appaul_perf` | copie d'`appaul`, migrée de 5.9.7 en 7.2.24 par Flyway (307 versions, sans échec) | 2ᵉ MariaDB, port 3307 | 7.2.24 | 2026-10-27 |
| `zanzan_perf` | copie de `zanzan`, migrée depuis 6.8.6 | 2ᵉ MariaDB, port 3307 | 7.2.24 | 2026-07-22 |
| `laborex_perf` | copie de `laborex_v1_db`, prise le 29/10 par `mariadb-dump --single-transaction` (lecture seule de l'original) | 2ᵉ MariaDB, port 3307 | 7.2.24 | 2026-10-23 |

Volumes d'`appaul` : 1 965 665 ventes, 3 964 716 lignes de vente, 106 516 clients, 1 251 tiers payants, 18 259
produits. Volumes de `zanzan` : 1 049 738 ventes, 2 158 170 lignes de vente, 8 376 clients, 158 tiers payants,
9 183 produits ; ses ventes s'arrêtent le 23 juillet 2026, d'où la fin de période au 22. Volumes de `laborex` :
473 407 ventes, 909 355 lignes de vente, 26 798 clients, 602 tiers payants, 22 572 produits. Lignes de vente sur
3 mois : capitale 121 706, laborex 121 723, appaul 114 686, zanzan 75 980.

- Les originaux `appaul` et `zanzan` n'ont jamais été modifiés : toutes les écritures (migration, suggestions) ont
  eu lieu dans les copies `_perf`.
- Dans les copies, les envois sont coupés avant le premier démarrage : SMS, WhatsApp, courriel et PharmaML. Voir
  `src/test/e2e/perf/copie-sans-envois-*.sql`.
- Prestige tourne sur le domaine Payara `domain2` (port 9080), avec le WAR de la branche.
- Le second MariaDB a un pool InnoDB de 2 Go réservé à la copie mesurée. Le serveur principal, lui, partage 3,5 Go
  entre quatre bases (39 Go en tout) : ses mesures à froid y sont donc dominées par les lectures disque.

### 2.2 Mesure

- Script : `src/test/e2e/perf/mesure-parcours-officine.js`, avec Playwright. Il suit le vrai chemin de l'écran : clic
  dans le menu, saisie des dates, clic sur le bouton.
- **Temps à l'écran** : du clic jusqu'au moment où le réseau est au repos depuis 400 ms et où aucun masque de
  chargement n'est affiché. On en retire les 400 ms d'attente.
- **Temps de chaque appel** (API REST, JSP, scripts) : relevé par le navigateur, avec le temps de réponse du serveur.
- 3 passages par cas : le premier est rapporté à part (**froid**), puis la **médiane** des trois.
- Un 4ᵉ passage de diagnostic active le journal des requêtes lentes au seuil 0. Il donne le SQL réel de chaque geste :
  nombre de requêtes, temps cumulé, lignes examinées. Le journal est remis à OFF / 10 s à la fin. Il n'enregistre pas
  le texte des messages.
- Suggestions (parcours 7 et 8) : chaque suggestion créée est retirée après la mesure : commandes, lignes, couples
  produit-grossiste créés et indicateur `int_ORERSTATUS` des produits. Contrôle en fin de série : **0 suggestion
  restante**.
- Plans : `EXPLAIN` et `ANALYZE FORMAT=JSON` en lecture seule (`START TRANSACTION READ ONLY`). Les essais de
  statistiques et d'index ont eu lieu **seulement sur la copie** `appaul_perf`.

## 3. Mesures par parcours

Temps en millisecondes. « Appel le plus long » : l'appel serveur qui borne le temps à l'écran. « SQL » : requêtes /
temps SQL cumulé / lignes examinées pendant le geste (passage de diagnostic).

### 3.1 Ticket Z (parcours 1)

| Base | Période | Froid | Médiane | Cartes | Appel le plus long | SQL |
|---|---|---|---|---|---|---|
| appaul | 1 jour | 616 | 76 | 10 | `POST caisse/fetch-tickez` 61 | 22 / 29 ms / 10 505 |
| appaul | 3 jours | 628 | 140 | 11 | `fetch-tickez` 93 | 25 / 61 ms / 22 415 |
| appaul | **1 semaine** | **8 282** | **2 962** | 14 | `fetch-tickez` 2 934 | 33 / **2 909 ms / 2 062 001** |
| zanzan | 1 jour | 159 | 159 | 5 | `fetch-tickez` 32 | 26 / 10 ms / 3 569 |
| zanzan | 3 jours | 241 | 90 | 5 | `fetch-tickez` 49 | 17 / 28 ms / 11 286 |
| zanzan | 1 semaine | 243 | 243 | 5 | `fetch-tickez` 63 | 18 / 42 ms / 18 750 |
| laborex | 1 jour | 300 | 111 | 9 | `fetch-tickez` 75 | 22 / 36 ms / 11 523 |
| laborex | 3 jours | 677 | 190 | 11 | `fetch-tickez` 134 | 27 / 84 ms / 29 378 |
| laborex | 1 semaine | 539 | 307 | 14 | `fetch-tickez` 273 | 39 / 173 ms / 68 266 |

Le saut à 1 semaine vient d'**une seule requête** : la lecture de `mvttransaction` du Ticket Z examine 2 038 547 lignes,
contre 12 000 à 3 jours (cause 2). Sur `zanzan`, où la cardinalité estimée des caissiers est de 20 (contre 6 997 sur `appaul` avant la correction des statistiques), la même
semaine examine 18 750 lignes et répond en 63 ms : c'est la contre-épreuve de la cause 2.

### 3.2 Liste des clients (parcours 2)

| Base | Geste | Froid | Médiane | Lignes | Appel le plus long | SQL |
|---|---|---|---|---|---|---|
| appaul | ouverture | 681 | 459 | 105 467 | `GET client/gestion` 517 | 30 / 310 ms / 318 852 |
| appaul | rechercher | 373 | 357 | 105 467 | `client/gestion` 318 | 27 / 266 ms / 318 848 |
| zanzan | ouverture | 804 | 161 | 8 309 | `client/gestion` 35 | 23 / 20 ms / 25 284 |
| zanzan | rechercher | 93 | 93 | 8 309 | `client/gestion` 34 | 20 / 22 ms / 25 280 |
| laborex | ouverture | 748 | 247 | 26 710 | `client/gestion` 104 | 31 / 76 ms / 80 544 |
| laborex | rechercher | 336 | 176 | 26 710 | `client/gestion` 110 | 28 / 83 ms / 80 540 |
| capitale | ouverture | — | — | — | `ws_data.jsp` 1 500 (1ʳᵉ compilation de la JSP) | |

Écran correct. Le compte total parcourt la table client (`t_type_client` en `ALL`, puis tri sur disque).

### 3.3 Liste des tiers payants (parcours 3)

| Base | Geste | Froid | Médiane | Lignes | Appel le plus long | SQL |
|---|---|---|---|---|---|---|
| appaul | ouverture | 1 414 | 293 | 1 116 | `GET tierspayant/list` 1 306 | 59 / 149 ms / 164 795 |
| appaul | rechercher | 237 | 233 | 1 116 | | 4 / 1 ms |
| zanzan | ouverture | 432 | 175 | 158 | `tierspayant/list` 69 | 55 / 35 ms / 31 644 |
| zanzan | rechercher | 140 | 122 | 158 | `tierspayant/list` 75 | 55 / 30 ms / 31 644 |
| laborex | ouverture | 521 | 350 | 547 | `tierspayant/list` 104 | 57 / 55 ms / 53 044 |
| laborex | rechercher | 275 | 241 | 547 | `tierspayant/list` 96 | 57 / 61 ms / 53 044 |
| capitale | ouverture | | | | réponse de **540 Ko pour 20 lignes** | N+1 : 20 cautions + 20 séquenciers |

### 3.4 Ventes terminées (parcours 4)

| Base | Période | Froid | Médiane | Ventes | Appel le plus long | SQL |
|---|---|---|---|---|---|---|
| appaul | **1 jour** | 1 463 | **1 122** | 942 | `GET ventestats` 1 072 | 6 / 1 031 ms / 9 074 |
| appaul | 3 jours | 80 | 85 | 2 017 | `ventestats` 35 | 6 / 9 ms / 6 160 |
| appaul | 1 semaine | 98 | 96 | 4 526 | `ventestats` 46 | 6 / 19 ms / 13 685 |
| appaul | **1 mois** | 3 213 | **3 202** | 23 001 | `ventestats` 3 158 | 10 / 3 075 ms / **2 124 664** |
| zanzan | 1 jour | 107 | 94 | 289 | `ventestats` 45 | 6 / 2 ms / 943 |
| zanzan | 3 jours | 231 | 82 | 884 | `ventestats` 37 | 6 / 4 ms / 2 727 |
| zanzan | 1 semaine | 99 | 99 | 1 470 | `ventestats` 41 | 6 / 6 ms / 4 487 |
| zanzan | 1 mois | 121 | 121 | 11 114 | `ventestats` 70 | 6 / 37 ms / 33 419 |
| laborex | 1 jour | 93 | 93 | 1 045 | `ventestats` 40 | 6 / 4 ms / 2 189 |
| laborex | 3 jours | 186 | 186 | 2 806 | `ventestats` 131 | 6 / 102 ms / 5 705 |
| laborex | 1 semaine | 112 | 109 | 7 141 | `ventestats` 55 | 6 / 32 ms / 14 380 |
| laborex | 1 mois | 200 | 242 | 22 099 | `ventestats` 182 | 6 / 161 ms / 44 294 |

À noter : **1 jour est dix fois plus lent que 3 jours**. Pour 1 jour, le moteur part des caissiers ; pour 3 jours, il
part de la date (cause 2).

### 3.5 Articles vendus récap (parcours 5)

| Base | Période | Froid | Médiane | Produits | Appel le plus long | SQL |
|---|---|---|---|---|---|---|
| appaul | 1 jour | 1 039 | 654 | 1 002 | `article-vendus-recap` 984 | 14 / 562 ms / 17 506 |
| appaul | 3 jours | 901 | 443 | 1 563 | 843 | 15 / 327 ms / 38 686 |
| appaul | 1 semaine | 978 | 521 | 2 280 | 922 | 15 / 444 ms / 84 237 |
| appaul | 15 jours | 2 244 | 1 369 | 3 219 | 2 017 | 16 / 644 ms / 188 460 |
| appaul | **1 mois** | 6 089 | **3 906** | 4 183 | 6 007 | 14 / 3 788 ms / **2 476 041** |
| appaul | **3 mois** | 10 402 | **8 209** | 5 371 | 10 328 | 39 / 8 482 ms / **5 071 850** |
| capitale | 3 mois | | ≈ 2 600 | | liste ≈ 1 600 (684 000 lignes) + résumé ≈ 950 | |
| zanzan | 1 jour | 170 | 113 | 325 | 49 | 10 / 12 ms / 5 456 |
| zanzan | 3 jours | 404 | 372 | 755 | 248 | 9 / 219 ms / 19 778 |
| zanzan | 1 semaine | 394 | 411 | 972 | 325 | 9 / 201 ms / 32 596 |
| zanzan | 15 jours | 805 | 572 | 1 548 | 474 | 9 / 296 ms / 93 953 |
| zanzan | 1 mois | 2 333 | 750 | 2 027 | 640 | 9 / 591 ms / 225 715 |
| zanzan | 3 mois | 2 710 | **1 515** | 2 672 | 1 385 | 15 / 1 280 ms / 711 334 |
| laborex | 1 jour | 572 | 298 | 1 128 | 193 | 11 / 122 ms / 20 284 |
| laborex | 3 jours | 629 | 391 | 2 003 | 290 | 13 / 163 ms / 53 300 |
| laborex | 1 semaine | 1 039 | 530 | 3 069 | 413 | 17 / 340 ms / 131 974 |
| laborex | 15 jours | 1 061 | 734 | 3 908 | 619 | 14 / 516 ms / 224 885 |
| laborex | 1 mois | 1 216 | 1 036 | 4 841 | 930 | 13 / 802 ms / 407 790 |
| laborex | 3 mois | 2 593 | **2 554** | 6 565 | 2 434 | 11 / 2 259 ms / 1 176 409 |

### 3.6 Liste des articles vendus (parcours 6)

| Base | Période | Froid | Médiane | Lignes | Appel le plus long | SQL |
|---|---|---|---|---|---|---|
| appaul | 1 jour | 1 258 | 783 | 1 803 | `article-vendus` 702 | 12 / 631 ms / 25 584 |
| appaul | 3 jours | 1 103 | 468 | 3 872 | 388 | 13 / 340 ms / 31 353 |
| appaul | 1 semaine | 1 316 | 506 | 8 509 | 439 | 11 / 405 ms / 69 092 |
| appaul | 15 jours | 2 247 | 603 | 19 149 | 531 | 15 / 488 ms / 155 913 |
| appaul | **1 mois** | 6 914 | **4 446** | 43 157 | 4 359 | 15 / 4 272 ms / **2 689 982** |
| appaul | **3 mois** | 15 060 | **12 588** | 114 686 | 12 512 | 18 / 12 427 ms / **7 626 660** |
| capitale | 3 mois | | ≈ 1 700 | | somme et comptage : 492 000 lignes chacun | |
| zanzan | 1 jour | 441 | 342 | 524 | 110 | 10 / 14 ms / 4 420 |
| zanzan | 3 jours | 1 674 | 385 | 2 089 | 253 | 9 / 176 ms / 16 162 |
| zanzan | 1 semaine | 759 | 431 | 3 477 | 275 | 9 / 178 ms / 26 795 |
| zanzan | 15 jours | 1 849 | 450 | 9 977 | 324 | 9 / 223 ms / 77 970 |
| zanzan | 1 mois | 3 589 | 813 | 24 093 | 550 | 10 / 422 ms / 188 760 |
| zanzan | 3 mois | 3 871 | **1 281** | 75 980 | 1 136 | 9 / 811 ms / 597 588 |
| laborex | 1 jour | 684 | 204 | 1 997 | 130 | 14 / 95 ms / 16 234 |
| laborex | 3 jours | 707 | 244 | 5 350 | 176 | 10 / 147 ms / 43 301 |
| laborex | 1 semaine | 916 | 361 | 13 382 | 284 | 10 / 245 ms / 108 651 |
| laborex | 15 jours | 746 | 442 | 22 983 | 374 | 10 / 355 ms / 186 200 |
| laborex | 1 mois | 827 | 609 | 41 995 | 535 | 9 / 502 ms / 339 462 |
| laborex | 3 mois | 1 578 | **1 528** | 121 723 | 1 469 | 9 / 1 436 ms / 984 476 |

Chaque page fait **trois** passes sur les ventes de la période : la page de 20 lignes, la somme et le comptage. À
3 mois, chacune examine environ 2,5 millions de lignes.

### 3.7 et 3.8 Génération de suggestion depuis le récap (parcours 7 et 8)

| Base | Mode | Période | Froid | Médiane | Produits suggérés | SQL (requêtes / temps cumulé) | Part du SQL |
|---|---|---|---|---|---|---|---|
| appaul | quantités vendues | 1 jour | 18 653 | **18 417** | 999 | 4 031 / 942 ms | 5 % |
| appaul | quantités vendues | 3 jours | 44 907 | **50 730** | 1 554 | 6 285 / 2 026 ms | 4 % |
| appaul | quantités vendues | 1 semaine | 103 796 | **102 404** | 2 262 | 9 153 / 2 779 ms | 3 % |
| appaul | quantités vendues | 15 jours | 200 017 | **200 017** | 3 181 | 12 879 / 5 072 ms | 2,5 % |
| appaul | quantités vendues | 1 mois | 334 179 | **323 577** | 4 120 (3 ignorés) | 16 755 / 6 547 ms | 2 % |
| appaul | quantités vendues | 3 mois | 475 738 | **475 738** | 5 281 (5 ignorés) | 21 562 / 12 826 ms | 2,7 % |
| appaul | seuil, qté de réappro | 1 jour | 9 238 | **8 745** | 638 | 2 586 / 657 ms | 7,5 % |
| appaul | seuil | 3 jours | 17 875 | **18 075** | 969 | 3 925 / 990 ms | 5,5 % |
| appaul | seuil | 1 semaine | 32 646 | **34 719** | 1 330 | 5 417 / 2 207 ms | 6 % |
| appaul | seuil | 15 jours | 94 522 | **59 083** | 1 815 | 7 332 / 2 307 ms | 4 % |
| appaul | seuil | 1 mois | 90 672 | **93 096** | 2 199 (3 ignorés) | 8 882 / 3 353 ms | 3,6 % |
| appaul | seuil | 3 mois | 139 060 | **137 745** | 2 716 (5 ignorés) | 11 008 / 8 314 ms | 6 % |
| zanzan | quantités vendues | 1 jour | 5 400 | **5 268** | 323 | 1 314 / 418 ms | 8 % |
| zanzan | quantités vendues | 3 jours | 22 040 | **14 469** | 746 | 3 172 / 2 902 ms | 20 % |
| zanzan | quantités vendues | 1 semaine | 35 646 | **35 404** | 959 | 3 861 / 983 ms | 3 % |
| zanzan | quantités vendues | 15 jours | 41 084 | **41 084** | 1 526 | 6 196 / 2 866 ms | 7 % |
| zanzan | quantités vendues | 1 mois | 103 761 | **103 761** | 1 991 | 8 110 / 3 289 ms | 3 % |
| zanzan | quantités vendues | 3 mois | 121 538 | **121 538** | 2 617 (1 ignoré) | 10 566 / 3 059 ms | 2,5 % |
| zanzan | seuil | 1 jour | 789 | **1 053** | 124 | 511 / 158 ms | 15 % |
| zanzan | seuil | 3 jours | 3 093 | **3 247** | 244 | 990 / 303 ms | 9 % |
| zanzan | seuil | 1 semaine | 5 496 | **5 433** | 321 | 1 300 / 422 ms | 8 % |
| zanzan | seuil | 15 jours | 11 498 | **6 380** | 548 | 2 220 / 508 ms | 8 % |
| zanzan | seuil | 1 mois | 12 024 | **12 039** | 779 | 3 140 / 918 ms | 8 % |
| zanzan | seuil | 3 mois | 20 076 | **32 374** | 1 050 (1 ignoré) | 4 247 / 2 202 ms | 7 % |
| laborex | quantités vendues | 1 jour | 50 085 | **49 035** | 1 125 | 4 593 / 2 411 ms | 5 % |
| laborex | quantités vendues | 3 jours | 125 553 | **152 761** | 1 991 | 8 086 / 2 347 ms | 2 % |
| laborex | quantités vendues | 1 semaine | 209 352 | **209 352** | 3 035 (1 ignoré) | 12 319 / 3 111 ms | 1,5 % |
| laborex | quantités vendues | 15 jours | 307 583 | **307 583** | 3 856 (1 ignoré) | 15 652 / 4 032 ms | 1,3 % |
| laborex | quantités vendues | 1 mois | 399 161 | **401 358** | 4 761 (2 ignorés) | 19 369 / 5 328 ms | 1,3 % |
| laborex | quantités vendues | 3 mois | 737 971 | **783 696** | 6 431 (5 ignorés) | 26 259 / 7 851 ms | 1 % |
| laborex | seuil | 1 jour | 8 793 | **8 739** | 628 | 2 557 / 649 ms | 7 % |
| laborex | seuil | 3 jours | 17 901 | **18 456** | 962 | 3 900 / 1 013 ms | 6 % |
| laborex | seuil | 1 semaine | 34 492 | **34 492** | 1 356 (1 ignoré) | 5 490 / 1 462 ms | 4 % |
| laborex | seuil | 15 jours | 52 058 | **51 073** | 1 673 (1 ignoré) | 6 775 / 1 836 ms | 4 % |
| laborex | seuil | 1 mois | 79 324 | **79 000** | 2 087 (2 ignorés) | 8 451 / 2 426 ms | 3 % |
| laborex | seuil | 3 mois | 135 800 | **135 800** | 2 922 (5 ignorés) | 11 869 / 3 723 ms | 3 % |

Le geste attend une seule réponse, `GET ventestats/suggerer`, pendant toute la durée. **95 à 98 % du temps se passe
dans le code Java, hors SQL** (cause 1).

### 3.9 Tableau de bord après la connexion (parcours 9)

| Base | Passage | Temps à l'écran | Appels les plus longs |
|---|---|---|---|
| appaul | froid (1ʳᵉ connexion après le déploiement) | **10 519** | `tableau-bord/alertes` 6 524, `evolution` 5 306, `tuiles` 2 893, `frequentation` 2 762, `notifications-centre/compteurs` 1 536, `valorisation` 1 151, page `/general/` 1 589 ; **935 scripts, 15 Mo** |
| appaul | médiane des 3 | **2 346** | `notifications-centre/compteurs` 1 330 |
| appaul | passages chauds | 1 303 – 1 328 | `compteurs` 394 – 407 (dont 387 ms pour le compteur des avoirs) |
| capitale | | | requête « rupture d'alerte » exécutée **deux fois** (372 + 369 ms) ; ≈ 10 s à froid après un déploiement |
| zanzan | froid (1ʳᵉ connexion après le déploiement) | **6 894** | `tableau-bord/evolution` 1 978, page `/general/` 1 637, `valorisation` 1 184, `ws_tree_menu.jsp` 802 ; **935 scripts, 15 Mo** |
| zanzan | médiane des 3 | 1 150 | `ws_tree_menu.jsp` 45 ; `compteurs` 16 |
| laborex | froid (1ʳᵉ connexion après le déploiement) | **6 978** | `tableau-bord/evolution` 1 820, page `/general/` 1 714, `notifications-centre/compteurs` 1 248, `alertes` 1 152, `tuiles` 1 050, `ws_tree_menu.jsp` 900, `frequentation` 799 ; **935 scripts, 15 Mo** |
| laborex | médiane des 3 | 1 424 | `app/info` 311, `pointage-affichage` 191, `compteurs` 114 |

### 3.10 Fiche article (parcours 10)

| Base | Geste | Froid | Médiane | Appel le plus long | SQL |
|---|---|---|---|---|---|
| appaul | ouverture | 1 061 | 103 | | 9 / 0 ms |
| appaul | recherche « PARA » | 1 018 | 375 | `produit-search/fiche` 141 | 52 / 219 ms / 225 468 |
| appaul | aperçu (double-clic) | 101 | 76 | `produit-search/fiche` 132 | |
| appaul | fiche complète (Modifier) | 288 | 288 | `typeetiquettes` 38 | |
| zanzan | ouverture | 161 | 147 | `actions-config` 7 | 9 / 0 ms |
| zanzan | recherche « PARA » | 1 035 | 380 | `produit-search/fiche` 90 | 36 / 101 ms / 152 582 |
| zanzan | aperçu (double-clic) | 250 | 181 | `produit-search/fiche` 104 | 12 / 12 ms |
| zanzan | fiche complète (Modifier) | 314 | 314 | `typeetiquettes` 31 | 38 / 12 ms |
| laborex | ouverture | 210 | 119 | | 9 / 0 ms |
| laborex | recherche « PARA » | 15 590 (*) | 310 | `produit-search/fiche` 107 | 51 / 162 ms / 258 881 |
| laborex | aperçu (double-clic) | 123 | 123 | `produit-search/fiche` 111 | 12 / 11 ms |
| laborex | fiche complète (Modifier) | 285 | 285 | `produit-search/produits/{id}` 39 | 42 / 17 ms |

(*) Sur laborex, la première recherche après le déploiement attend 15,6 s alors que ses deux appels prennent 327 et
102 ms côté serveur. Ce temps est donc passé dans le navigateur ou dans l'attente du réseau au repos. Il ne se
reproduit pas aux passages suivants (médiane 310 ms). Cause non établie.

Écran correct.

### 3.11 Pilotage / Analyse de gestion (parcours 11)

| Base | Geste | Froid | Médiane | Appel le plus long |
|---|---|---|---|---|
| appaul | ouverture | **8 372** | **2 952** | `pilotage/controler` 1 377 |
| appaul | synthèse | 85 | 85 | 3 |
| appaul | ventes | 724 | 142 | 3 |
| appaul | marge | 728 | 82 | 3 |
| appaul | achats | 674 | 109 | 4 |
| appaul | caisse | 772 | 85 | 3 |
| appaul | stock | 2 141 | 94 | |
| appaul | qualité | 813 | 88 | 3 |
| appaul | kpi | 747 | 122 | 5 |
| appaul | comparateur | — | — | l'onglet ne lance aucun chargement à l'ouverture |
| appaul | achats-ventes | 209 | 129 | 4 |
| appaul | **à suivre** | **28 956** | 1 463 | 6 cartes en parallèle, cache de 10 min |
| appaul | rentabilité | 101 | 252 | 2 |
| capitale | à suivre | 11 000 à froid | | `PilotageSuiviService.evolution` |
| capitale | ouverture | | | `controler` ≈ 700 |
| zanzan | ouverture | 1 194 | 616 | `controler` 455 (921 à froid) |
| zanzan | autres onglets | 89 – 973 | 84 – 385 | 3 à 8 |
| zanzan | **à suivre** | **18 704** | 116 | 6 appels `suivi/evolution` en parallèle : 17 422, 17 053, 5 772, 1 599, 1 594 |
| laborex | ouverture | 2 899 | 869 | `controler` 713 (760 à froid) |
| laborex | autres onglets | 83 – 1 227 | 80 – 236 | 2 à 28 |
| laborex | **à suivre** | **14 612** | 657 | 6 appels `suivi/evolution` en parallèle : 11 591, 11 308, 5 881, 2 827, 2 250 ; `onglet/asuivre` 2 954 |

Les onglets sont rapides une fois les données chargées : leurs appels prennent 2 à 5 ms. Le temps « froid » d'un
onglet correspond au premier rendu ExtJS.

## 4. Causes, classées par gain attendu

### 4.1 Cause 1 — Suggestion : coût quadratique dans le code Java *(prouvé, mécanisme compris)*

**Ce qui est prouvé :**

- Le SQL compte pour 2 à 7 % de la durée de l'appel (tableau du § 3.7). À 3 mois : 12,8 s de SQL pour 475,7 s d'appel.
- Chaque produit coûte 4 requêtes courtes, de 0 à 3 ms chacune : `find(TFamille)` ; le statut du couple
  produit-grossiste ; la recherche du couple ; l'`insert` de la ligne. Relevé à 1 mois : 4 123 / 4 120 / 4 120 / 4 120
  requêtes.
- La durée croît **comme le carré** du nombre de produits. Avec 999 produits, l'appel prend 18,4 s. À 5,3 fois plus de
  produits (5 281), on attendrait 97 s si la croissance était linéaire ; on mesure **476 s**, ce qui correspond à
  (5,3)² × 18,4 s = 514 s. Les autres points suivent la même courbe : 2 262 → 102 s, et (2,26)² × 18,4 = 94 s.
- Tout s'exécute dans **une seule transaction**, où toutes les entités chargées s'accumulent :
  - la boucle par grossiste est dans `SuggestionImpl.creerSuggestionArticlesVendus`
    ([SuggestionImpl.java:725](src/main/java/rest/service/impl/SuggestionImpl.java:725)) ;
  - les `find` sont aux lignes 737 et 746, `coupleFamilleGrossisteDesactive` à la ligne 805 ;
  - `findOrCreateFamilleGrossiste` puis `persist` sont dans `initTSuggestionOrderDetail`, ligne 488.

**Mécanisme, prouvé par capture des fils Java** (`jstack` toutes les 4 s pendant le parcours 7 sur `zanzan_perf`, de
1 jour à 3 mois ; 65 piles du fil qui exécute la suggestion) :

| Où se trouve le fil | Piles | Part |
|---|---|---|
| Vidage automatique d'Hibernate avant une requête : `SessionImpl.list` → `autoFlushIfRequired` → `DefaultAutoFlushEventListener.onAutoFlush` | **59** | **91 %** |
| Chargement d'un produit (`SessionImpl.find`) | 3 | 5 % |
| Requête qui suit le vidage | 3 | 5 % |
| Attente d'une réponse de MariaDB (lecture sur la connexion) | 5 | 8 % |

*Une même pile peut compter dans deux lignes.*

Les deux requêtes qui déclenchent ces vidages sont les lectures du couple produit-grossiste, faites une fois par
produit :

- `findOrCreateFamilleGrossiste` ([SuggestionImpl.java:462](src/main/java/rest/service/impl/SuggestionImpl.java:462)) :
  39 piles ;
- `coupleFamilleGrossisteDesactive` ([SuggestionImpl.java:807](src/main/java/rest/service/impl/SuggestionImpl.java:807)) :
  23 piles.

Au sommet des piles, on trouve la comparaison champ par champ des entités chargées : `Field.get`,
`TypeHelper.findDirty`, `AbstractVisitor.processValue` et le parcours de leurs collections
(`Collections.processReachableCollection`). Le déroulé est donc le suivant :

1. Avant chaque requête JPQL, Hibernate vide la transaction en cours (`FlushMode.AUTO`).
2. À chaque vidage, il compare toutes les entités déjà chargées dans la transaction (produits, couples, lignes de
   suggestion), avec leurs collections, pour trouver celles qui ont changé.
3. Au n-ième produit, il compare donc de l'ordre de 3n entités, deux fois. Sur la série, cela fait de l'ordre de n²
   comparaisons : c'est la courbe mesurée.

**Solutions possibles :**

1. Charger d'un coup les produits et leurs couples produit-grossiste : `WHERE id IN (...)` par tranches de 500. Ensuite :
   - persister les lignes par lots, avec `flush()` puis `clear()` tous les 200 à 500 produits ;
   - ou passer la requête de lecture en `FlushModeType.COMMIT`.
2. Variante plus légère : garder la boucle, mais poser `setFlushMode(COMMIT)` sur les deux requêtes de lecture du couple.
   Elle supprime le vidage, qui représente 91 % des piles. Point à vérifier : sans vidage, la requête ne voit pas un
   couple créé plus tôt dans la même transaction. Il faut donc s'assurer qu'un même couple produit-grossiste ne peut
   pas apparaître deux fois dans une même suggestion, ou garder en mémoire les couples créés pendant la boucle.

- **Risque de régression** : moyen. Le résultat doit rester identique : mêmes lignes, mêmes produits ignorés, même
  indicateur `int_ORERSTATUS`, posé par le déclencheur `t_sugesstion_indicateur`.
- **Test qui le prouvera** : le parcours 7 à 3 mois sur une copie, avec deux contrôles :
  1. comparer l'empreinte des lignes créées (produit, grossiste, quantité, prix) avant et après la correction ;
  2. mesurer le temps à l'écran ; l'objectif est de passer sous 15 s.

  Le script de mesure fait déjà le retrait des suggestions.

**Correction mesurée (30/10)** *(prouvé)* :
- Correction : commit `024c792f`, branche d'intégration. Pendant la création des lignes, l'écriture se fait en fin de
  transaction (`FlushMode COMMIT`, rétabli ensuite).
- Mesure :
  - par l'écran, sur domain2 et `laborex_perf`, périodes finissant le 28/10, un passage par cas ;
  - une même branche, avec puis sans ce commit ;
  - chaque suggestion créée est retirée après le passage (135 suggestions avant comme après la série).
- Empreinte : chaque ligne créée est relevée (produit, grossiste, quantité, prix, statut, indicateur
  `int_ORERSTATUS` du produit). Les **12 empreintes sont identiques** avant et après : même résultat, mêmes produits
  ignorés.

| Période | Parcours 7, avant | Parcours 7, après | Parcours 8, avant | Parcours 8, après |
|---|---|---|---|---|
| 1 semaine | 64,4 s (1 755 produits) | **4,1 s** | 17,1 s (914) | **2,0 s** |
| 15 jours | 218,4 s (3 513) | **7,8 s** | 42,5 s (1 549) | **3,4 s** |
| 1 mois | 356,1 s (4 566) | **10,0 s** | 72,2 s (2 004) | **4,1 s** |
| 3 mois | 689,2 s (6 316) | **13,5 s** | 151,6 s (2 881) | **6,1 s** |

À 1 et 3 jours, la période ne contient que 2 produits : moins de 0,2 s avant comme après. L'objectif fixé plus haut,
moins de 15 s à 3 mois, est atteint. La durée suit maintenant le nombre de produits, et non plus son carré.

Le script [mesure-parcours-officine.js](../../src/test/e2e/perf/mesure-parcours-officine.js) affiche maintenant
l'empreinte de chaque cas de suggestion.

### 4.2 Cause 2 — Statistiques fausses sur les colonnes caissier et utilisateur *(prouvé)*

**Constat** :

- MariaDB croit que `t_preenregistrement.lg_USER_CAISSIER_ID` prend **6 997 valeurs** distinctes ; il n'y en a que
  **64**.
- Même écart pour `lg_USER_ID` : 8 286 estimées.
- Même chose pour `mvttransaction.caisse` : 7 971 estimées pour **72** réelles.

Ces estimations viennent de l'échantillonnage d'InnoDB, qui ne lit que 20 pages (`innodb_stats_persistent_sample_pages`
= 20).

**Conséquence** :

- Le moteur croit qu'une recherche par caissier ramène environ 300 ventes ; elle en ramène en réalité environ 33 000.
- Il commence donc par `t_user`, puis lit **toutes les ventes de chaque caissier**, depuis le début de l'historique.
  Ce n'est qu'ensuite qu'il filtre sur la date.
- Le plan ressort dans `EXPLAIN` : `t_user` puis `t_preenregistrement` en `ref` sur l'utilisateur, au lieu de
  `idx_preenr_statut_date`. Voir les écarts de lignes examinées au § 3 : 12 000 → 2 000 000 à partir d'une semaine
  ou d'un mois.

**Essai sur la copie** `appaul_perf` :

```sql
ANALYZE TABLE t_preenregistrement PERSISTENT FOR COLUMNS (lg_USER_ID, lg_USER_CAISSIER_ID, str_STATUT, dt_UPDATED)
  INDEXES (lg_USER_ID, lg_USER_CAISSIER_ID, idx_preenr_statut_date);
ANALYZE TABLE mvttransaction PERSISTENT FOR COLUMNS (caisse, createdAt, lg_EMPLACEMENT_ID)
  INDEXES (FKuexkrw2hgawujvv9vo4i6dwn, indexMvtEmplCreatedAt);
```

La commande prend 12 s. Elle utilise les statistiques indépendantes du moteur ; `use_stat_tables` vaut déjà
`PREFERABLY_FOR_QUERIES`. Requêtes réelles de l'écran rejouées par `ANALYZE FORMAT=JSON`, temps à chaud :

| Requête (écran, période) | Avant | Après les statistiques | Résultat |
|---|---|---|---|
| Ticket Z, 1 semaine (`mvttransaction`) | 3 162 ms | **36 ms** | identique |
| Ventes terminées, 1 jour (comptage) | 582 ms | **4 ms** | identique |
| Ventes terminées, 1 mois (comptage) | 3 197 ms | **266 ms** | identique |
| Articles vendus récap, 1 mois (page) | 3 935 ms | **652 ms** | mêmes produits, mêmes sommes (*) |
| Articles vendus, 3 mois (somme) | 4 195 ms | **941 ms** | identique |

Les résultats ont été vérifiés par une empreinte MD5 de la sortie triée. On obtient le même gain en forçant l'index
`idx_preenr_statut_date` (Ventes, 1 mois : 3 197 → 98 ms).

(*) Les colonnes caissier et utilisateur de la page du récap diffèrent d'un plan à l'autre. Ce ne sont pas des
agrégats : MariaDB y renvoie une valeur quelconque du groupe (cause 4).

Écarté par l'essai :

- remplacer le filtre `EXISTS (... t_user uop ...)` par une liste `lg_USER_ID IN (...)` : aucun gain ;
- supprimer ce filtre : aucun gain non plus.

Le moteur bascule alors sur la jointure du caissier. Le mauvais plan vient bien des estimations, pas de la forme de la
requête.

**Gain à l'écran, mesuré.** Les parcours 1, 4, 5 et 6 ont été rejoués sur `appaul_perf` après l'`ANALYZE TABLE ...
PERSISTENT`, par le même script et avec le même WAR. Les lignes affichées sont identiques. Le tableau donne les
médianes en ms.

| Parcours | Avant | Après | SQL avant → après (lignes examinées) |
|---|---|---|---|
| Ticket Z, 1 semaine | 2 962 | **406** | 2 062 001 → 50 090 |
| Ventes terminées, 1 jour | 1 122 | **194** | 9 074 → 2 935 |
| Ventes terminées, 1 mois | 3 202 | **545** | 2 124 664 → 69 111 |
| Articles vendus récap, 1 jour | 654 | **187** | 17 506 → 18 340 |
| Articles vendus récap, 1 mois | 3 906 | **1 111** | 2 476 041 → 419 823 |
| Articles vendus récap, 3 mois | 8 209 | **3 004** | 5 071 850 → 1 110 810 |
| Articles vendus, 1 jour | 783 | **323** | 25 584 → 14 691 |
| Articles vendus, 1 mois | 4 446 | **784** | 2 689 982 → 350 062 |
| Articles vendus, 3 mois | 12 588 | **1 991** | 7 626 660 → 930 896 |

Les périodes de 3 jours à 15 jours, qui prenaient déjà le bon plan, ne changent pas. Après la correction, le récap à
3 mois reste à 3 s : c'est la part de la cause 4.

**Contre-épreuve sur `zanzan`.** Les statistiques de cette base sont justes : la cardinalité estimée des caissiers y est
de 20. Les mêmes parcours y sont rapides sans aucune intervention : Ticket Z 1 semaine 243 ms, Ventes 1 mois 121 ms.

- **Solution proposée** : une migration Flyway qui passe ces `ANALYZE TABLE ... PERSISTENT`. Pour que les statistiques
  ne vieillissent pas, l'une ou l'autre des mesures suivantes :
  - le relancer chaque nuit, dans la tâche de maintenance existante ;
  - ou poser `STATS_SAMPLE_PAGES=200` sur les deux tables.
- **Risque de régression** : très faible, car aucune requête ni aucun résultat ne change. Il faut seulement vérifier
  qu'aucun autre écran ne prend un plan plus lent ; le rejeu `rejouer-sql-ecrans.js` des requêtes capturées sert à
  cela.
- **Test qui le prouvera** :
  1. sur une copie, rejouer les parcours 1, 4, 5 et 6 avant et après la migration ;
  2. comparer les lignes affichées et les temps ;
  3. rejouer toutes les requêtes capturées (`rejouer-sql-ecrans.js`), pour vérifier qu'aucune ne ralentit.

### 4.3 Cause 3 — Compteur « Ventes en avoir » de la cloche *(prouvé)*

- **Où** : `NotificationsCentreServiceImpl.avoirs`
  ([NotificationsCentreServiceImpl.java:129](src/main/java/rest/service/impl/NotificationsCentreServiceImpl.java:129)).
- **Fréquence** : la requête part à chaque appel de `notifications-centre/compteurs`, c'est-à-dire à la connexion puis à
  intervalles réguliers. Pendant une seule suggestion de 8 minutes, on en relève 9 exécutions, soit 3,5 s de SQL.
- **Coût** : 390 à 470 ms à chaque fois, pour 735 avoirs dans toute la base. Le moteur part des utilisateurs (même
  estimation fausse qu'au § 4.2) ; les nouvelles statistiques ne suffisent pas ici.
- **Essai** : avec `FORCE INDEX(idx_preenr_avoir_date)`, la requête prend **moins de 1 ms**, avec le même résultat (14).
- **Solution** : ajouter cet index forcé à la requête native, ou commencer la clause par `b_IS_AVOIR = TRUE AND
  dt_UPDATED ...` et la sortir de la jointure. **Risque** : très faible.
- **Test** : mesurer le parcours 9 à chaud ; `compteurs` doit passer de 400 ms à environ 20 ms.

### 4.4 Cause 4 — Récap et articles vendus : passes multiples et jointures inutiles *(prouvé sur capitale et appaul)*

- La page de 20 lignes recalcule l'agrégat complet à chaque changement de page. Le résumé (somme et comptage) relit
  encore la période : 2 à 3 passes sur les ventes.
  - Code : [SalesStatsServiceImpl.java:1902](src/main/java/rest/service/impl/SalesStatsServiceImpl.java:1902)
    (`getArticlesVendusRecap`) et `getArticlesVendusRecapSummary`, ligne 1968.
- Jointure inutile à `t_user` (caissier et utilisateur) dans un `GROUP BY` par produit. Les colonnes `lgUSERCAISSIERID`
  et `lgUSERID` renvoyées sont arbitraires : elles changent selon le plan (voir le § 4.2).
- `OrdreLectureVentes` n'est jamais appliqué depuis l'écran. L'écran envoie `typeTransaction=ALL`, et
  `partDesVentesDeLaPeriode` ([SalesStatsServiceImpl.java:1828](src/main/java/rest/service/impl/SalesStatsServiceImpl.java:1828))
  renvoie alors -1.
- **Solutions** :
  - retirer la jointure caissier et utilisateur de l'agrégat par produit ;
  - calculer la somme et le comptage dans la même requête que la page (fenêtre `COUNT(*) OVER()`), ou les garder en
    cache pendant la consultation.

  **Risque** : faible, à condition que les colonnes retirées ne soient pas affichées ; à vérifier dans
  `articlesVendusRecap.js`.
- **Test** : parcours 5 et 6 à 3 mois ; comparer les lignes affichées (produit, quantité, montant) et les temps.

### 4.5 Cause 5 — Tableau de bord à froid *(prouvé pour les volumes ; part de chaque appel prouvée)*

- La première connexion charge **935 fichiers JavaScript, soit 15 Mo**, un par un. Chacun met environ 520 ms, en
  parallèle, limités à 6 connexions par hôte.
- En même temps partent cinq API, de 1,1 à 6,5 s chacune à froid : `alertes`, `evolution`, `tuiles`, `frequentation`,
  `valorisation`. Après la mise en cache côté serveur, il ne reste que `compteurs`.
- **Solutions** :
  - charger les scripts des écrans au premier usage plutôt qu'à la connexion, ou les regrouper par lot, avec un
    entête de cache long ;
  - préchauffer les caches du tableau de bord au démarrage.
- **Risque** : faible pour le préchauffage, moyen pour le chargement différé des scripts (ordre de dépendance ExtJS).
- **Test** : parcours 9 à froid juste après un déploiement.

### 4.6 Cause 6 — Liste des tiers payants *(prouvé sur capitale)*

- `TiersPayantServiceImpl.fetchList`
  ([TiersPayantServiceImpl.java:63](src/main/java/rest/service/impl/TiersPayantServiceImpl.java:63), vers les lignes
  217 à 225) place dans `str_FAMILLE_ITEM` le HTML de **tous les clients rattachés**. Résultat : 540 Ko pour 20 lignes.
- La même liste fait aussi 20 lectures de caution et 20 lectures de séquencier par page (N+1).
- **Solution** :
  - envoyer seulement le nombre de clients, et charger leur liste au clic ;
  - regrouper les cautions et les séquenciers en une requête `IN (...)`.

  **Risque** : faible. `str_FAMILLE_ITEM` est affiché dans le détail dépliable des lignes, à trois endroits : la liste
  des tiers payants, `TiersPayantDesactiveManager.js` et l'ajout d'un tiers payant à une vente (`dovente/action/addtp.js`,
  ligne 64). Ces trois écrans devront charger le détail au dépliage.
- **Test** : parcours 3 ; comparer la taille de la réponse et les colonnes affichées.

### 4.7 Cause 7 — Pilotage, onglet « À suivre » *(prouvé sur capitale)*

- `PilotageSuiviService.evolution`
  ([PilotageSuiviService.java:94](src/main/java/rest/service/impl/PilotageSuiviService.java:94)) recalcule chaque
  carte sur les ventes brutes de 4 ans, avec deux requêtes. Les 6 cartes partent en parallèle, d'où 11 s à froid sur
  capitale et 29 s sur appaul. Le cache dure 10 minutes.
- **Solution** :
  - lire les agrégats mensuels déjà tenus par le pilotage, s'il y en a ;
  - sinon, une requête pour les 6 cartes et un cache plus long, invalidé à la clôture de caisse.
- **Risque** : faible.
- **Test** : parcours 11, onglet « À suivre », à froid ; comparer les valeurs des cartes.

### 4.8 Petits points relevés au passage

- `SELECT MAX(createdAt) FROM mvttransaction`
  ([HorlogeService.java:117](src/main/java/rest/service/impl/HorlogeService.java:117)) parcourt tout l'index : 2 millions
  d'entrées, 320 ms à chaque appel de `horloge/etat`. Un index sur `createdAt` seul la rendrait instantanée.
- Ventes terminées, 1 jour : 630 ms → 4 ms avec les statistiques (§ 4.2).

## 5. Mesures manquantes et limites

- `laborex_v1_db` a été mesurée sur une **copie** (`laborex_perf`), et non directement. La copie de travail est
  partagée avec le domaine Payara principal, et ses envois réels sont actifs : vidage PharmaML, rappels SMS,
  WhatsApp. Une mesure directe aurait écrit des suggestions dans cette base, et un second serveur branché dessus
  aurait doublé les tâches planifiées. Les volumes de la copie sont identiques à ceux de l'original (476 276 ventes,
  404 tables).
- Sur `laborex_perf`, la première série s'est arrêtée au parcours 8 à 3 mois : le fichier de résultats avait atteint
  500 Mo, parce qu'une suggestion passe 26 000 requêtes. Le script ne garde plus que les requêtes d'au moins 5 ms.
  Les parcours 8, 6, 10 et 11 ont été rejoués à part. Pour ces parcours, le « froid » ne suit donc pas un
  déploiement.
- Onglet « comparateur » du pilotage : il ne lance aucun chargement à l'ouverture, il n'y a donc rien à mesurer.
- Le pilotage n'existe pas dans le schéma d'origine de `zanzan` (6.8.6). Il n'apparaît qu'après la migration de la copie.
- Sur le serveur MariaDB principal, le pool InnoDB de 3,5 Go est partagé par 4 bases. Les temps froids sur `capitale`
  et `laborex_v1_db` y comprennent des lectures disque qu'un serveur d'officine dédié n'aurait pas forcément.
- `capitale` n'a été mesurée qu'en lecture : pas de suggestion, puisque cette base ne doit pas être modifiée.

## 6. Rejouer les mesures

Prérequis :

- Prestige déployé sur un domaine de test ;
- un compte de test `e2e` ;
- un fichier d'options MariaDB **hors du dépôt**, qui ne contient que le compte, l'hôte et le port.

```bash
export NODE_PATH=D:/outils-e2e/node_modules PLAYWRIGHT_BROWSERS_PATH=D:/pw-browsers
# 1) Copie sans envois (une seule fois, sur une COPIE uniquement)
mariadb --defaults-extra-file=perf.cnf ma_copie < src/test/e2e/perf/copie-sans-envois-avant-migration.sql
#    puis déployer Prestige sur la copie (Flyway migre), puis :
mariadb --defaults-extra-file=perf.cnf ma_copie < src/test/e2e/perf/copie-sans-envois-apres-migration.sql
# 2) Mesure des parcours (un seul test d'écran à la fois)
BASE=http://localhost:9080/prestige DB_TEST=ma_copie MARIADB_OPTIONS=perf.cnf DATE_REF=2026-10-27 \
  PASSAGES=3 SQL_LOG=1 ASADMIN_PORT=9048 PARCOURS=1,2,3,4,5,9,10,11 SORTIE=mesure.json \
  node src/test/e2e/perf/mesure-parcours-officine.js
# 3) Parcours qui écrivent (suggestions retirées après chaque passage)
ECRITURE_SUGGESTION=1 PARCOURS=7,8 ... node src/test/e2e/perf/mesure-parcours-officine.js
# 4) Rejeu en lecture seule des requêtes capturées sur une autre base
node src/test/e2e/perf/rejouer-sql-ecrans.js
```

Pour qu'une suggestion soit permise, `ECRITURE_SUGGESTION=1` est obligatoire, sauf sur `laborex_v1_db`. Le script
vérifie à la fin qu'aucune suggestion ne reste. `SQL_LOG=1` remet toujours le journal à OFF / 10 s.
