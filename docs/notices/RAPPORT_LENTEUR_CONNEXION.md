# Rapport — lenteur à la connexion (14/10/2026)

**Constat remonté** : la connexion d'un utilisateur est plus longue que d'habitude.
**Question associée** : la mesure de l'expérience utilisateur (RUM) a-t-elle un coût sur l'exploitation ? Ralentit-elle
Prestige ?

## 1. Ce qu'il faut retenir

| | Avant | Après |
|---|---|---|
| Allers-retours avec la base pour **se connecter** (administrateur, 219 droits) | 272 | **42** |
| Allers-retours avec la base pour **se connecter** (caissier, 71 droits) | 132 | **41** |
| Allers-retours pour **la connexion complète** (jusqu'au tableau de bord affiché) | 518 | **223** |
| Allers-retours pour **un envoi RUM** (20 mesures) | 116 | **9** |
| Lignes RUM en base | 1 par minute | 1 par **5 minutes** |

**Cause principale.** Chaque poste a son propre Payara, qui interroge la base **centrale par le réseau**. Chaque
requête SQL coûte donc un aller-retour réseau. Sur le banc d'essai, la base est sur la même machine, et la lenteur ne
se voit pas. Deux défauts multipliaient ces allers-retours :

1. **Les droits de l'utilisateur étaient chargés un par un**, à raison d'une requête par droit. Un administrateur en a
   219, et chaque nouveau menu en ajoute : 57 à 81 droits ont été créés depuis mi-septembre. C'est l'explication directe
   de « plus long que d'habitude », et le défaut empirait à chaque mise à jour.
2. **Chaque requête SQL empruntait puis rendait la connexion.** C'est le comportement par défaut d'Hibernate avec
   Payara. À chaque emprunt, Payara lit puis remet à zéro les « informations client » de la connexion, soit 4 échanges
   de plus avec la base. Une requête coûtait donc **5 allers-retours au lieu d'un**, dans toute l'application et pas
   seulement à la connexion.

**Le RUM n'était pas la cause de la lenteur**. Il ajoutait environ 30 ms à l'ouverture de l'application, ce qui reste
dans le bruit de mesure, et il fait un seul envoi par minute. Son écriture en base était en revanche inutilement
coûteuse : elle a été corrigée (voir § 4).

## 2. Méthode

Toutes les mesures ont été faites sur le banc d'essai, par le vrai écran de connexion (navigateur automatisé),
**sans jamais toucher la base de production**.

| Piste | Test | Résultat |
|---|---|---|
| Écrans ajoutés, RUM (côté navigateur) | Même mesure sur 8 versions successives de l'interface, de mi-septembre à aujourd'hui (7 essais chacune) | Ouverture de 609 ms à 733 ms : +120 ms en un mois (957 fichiers au lieu de 883), dont +30 ms pour le RUM. Écart faible, **pas la cause**. |
| Cache du navigateur | Connexions répétées dans le même navigateur | Les fichiers sont gardés 24 h : 949 sur 949 viennent du cache. Correct. |
| Première connexion après mise à jour ou redémarrage | Redéploiement puis 3 connexions | +600 ms la première fois seulement (compilation des pages). Ponctuel, normal. |
| Nom du poste (DNS inverse) | Lecture du code | Déjà limité à 300 ms et mis en cache. **Pas la cause.** |
| Requêtes lourdes avec beaucoup de données | `EXPLAIN` des 23 requêtes du tableau de bord et des compteurs | Toutes passent par un index. **Pas la cause.** |
| **Nombre d'allers-retours avec la base** | Journal SQL du banc pendant une connexion | **518 requêtes pour une connexion complète, dont 211 pour les droits et environ 300 d'échanges techniques.** |
| Effet du réseau | Rejeu des 518 requêtes réelles à travers un relais qui simule le délai du réseau local | voir tableau ci-dessous |

Temps passé en base pour **une** connexion, selon la qualité du réseau entre le poste et la base centrale :

| Réseau | Avant (518 requêtes) | Après (223 requêtes) |
|---|---|---|
| Aucun (base sur la même machine) | 0,09 s | 0,03 s |
| Bon réseau filaire (aller-retour 0,5 ms) | 0,5 s | **0,19 s** |
| Réseau ordinaire (1 ms) | 0,8 s | **0,31 s** |
| Réseau chargé (2 ms) | 1,35 s | **0,55 s** |
| Wi-Fi (5 ms) | 2,9 s | **1,24 s** |

Le temps passé en base à la connexion est divisé par environ 2,5, quel que soit le réseau. Le temps est quasiment
proportionnel au nombre d'allers-retours. Les postes en Wi-Fi, ou sur un réseau chargé, sont
les plus touchés.

## 3. Corrections

1. **Droits chargés en une seule requête** (`UserServiceImpl.getAllPrivilege`). Le résultat est identique : droits
   actifs des rôles de l'utilisateur, rôle par rôle. La liste des liens rôle-droit portée par chaque droit
   (`TPrivilege`) est désormais chargée à la demande. Elle n'est lue nulle part dans le code.
2. **Une connexion par transaction, et non une par requête** (`persistence.xml` :
   `hibernate.connection.handling_mode = DELAYED_ACQUISITION_AND_RELEASE_AFTER_TRANSACTION`). Les 4 échanges
   techniques de Payara sont payés une fois par transaction au lieu de l'être à chaque requête. Ce gain vaut pour
   **tous les écrans**, pas seulement pour la connexion.
3. **RUM** :
   - tout un envoi est écrit en une seule requête, au lieu d'une par mesure ;
   - le paramètre d'activation est lu dans la même transaction ;
   - la purge des mesures de plus de 14 jours est faite une fois par heure, au lieu d'à chaque envoi ;
   - les mesures sont regroupées par tranches de 5 minutes.

## 4. Coût du RUM sur l'exploitation (après correction)

| | Coût |
|---|---|
| Navigateur | Quelques microsecondes par appel (une addition en mémoire). Le chargement des fichiers n'est pas mesuré : Ext JS ne passe pas par les appels interceptés. |
| Réseau | 1 envoi par minute et par poste, environ 4 Ko |
| Serveur et base | 1 transaction par envoi, 9 allers-retours |
| Volume en base | 1 ligne par poste, utilisateur, écran ou appel, et tranche de 5 minutes. Gardée 14 jours. |
| Arrêt | Paramètre `SUPPORT_RUM_ACTIF = 0` : les navigateurs cessent d'envoyer dès leur envoi suivant |

Ordre de grandeur pour une grosse officine (20 postes actifs 8 h par jour) : au plus quelques dizaines de milliers de
lignes par jour, soit quelques dizaines de Mo sur 14 jours, et 5 fois moins qu'avant le regroupement par 5 minutes.

## 5. Ce qui reste possible (non fait, à décider)

- **Pilote MariaDB** : les « informations client » viennent du pilote MariaDB 2.x installé dans Payara. Le changer
  supprimerait aussi les 4 échanges par transaction. C'est un changement sur chaque installation, pas dans
  l'application : à tester sur un poste avant de le généraliser.
- **Appels en double au démarrage de l'interface** : `user/account`, `type-reglements/mobile-money` et
  `type-reglements/client-requis` sont appelés deux fois chacun. C'est un petit gain.
- **Écrans chargés d'avance** : l'interface charge 957 fichiers au démarrage. Un chargement à la demande réduirait la
  première connexion sans cache. C'est un chantier plus lourd.

## 6. Non-régression

### Résultat final, sur la base peuplée (3 ans de données)

- **Tests unitaires : 1433 sur 1433.**
- **Tests d'écran : 91 sur 91.**
  - Ils ont été lancés un par un, sans aucun autre test en parallèle.
  - **89 sur 91** au passage complet. Les 2 échecs ont été corrigés, puis chaque test relancé seul :
    - `mobile/test-info-articles-rapide` : `checkproduit` sur tout le catalogue prenait 20,3 s pour un seuil de 20 s.
      Corrigé : il prend maintenant 14 à 16 s (voir § 7.2). Le test passe à 10 sur 10.
    - `retours/test-mouvement-prix-commande` : les deux mouvements de prix étaient bien enregistrés et datés, mais ils
      tombaient dans la même seconde, et le test attendait un ordre précis. Le test cherche maintenant le mouvement par
      sa valeur. Il passe à 8 sur 8.
- Le passage précédent comptait 83 sur 91. Les 8 échecs venaient de tests qui supposaient une base presque vide, sauf
  deux vrais défauts, corrigés : le PDF des factures subrogatoires (597 s) et l'impression vide des articles dormants
  (voir § 8).

### Avant le peuplement

Tests unitaires : 1432 sur 1432. Tests d'écran : 85 sur 91. Les 6 échecs existaient déjà sur la version précédente.
Ils sont tous corrigés depuis.

**Point trouvé en passant, sans lien avec cette correction** : la migration « libellés courts » du 12/10 avait
remplacé le libellé de menu « Points fidélité » (demande du 10/10) par « Suivi fidélité ». Décision du 14/10 : on garde
« Points fidélité » (migration V6.9.150).

## 7. Mesures avec 3 ans de données (demande du 14/10)

La base de l'officine est trop volumineuse pour être envoyée. Le banc a donc été **peuplé avec 3 ans d'activité
réaliste** par `outils/banc/peupler_banc.py`. Le peuplement a été fait uniquement sur le banc, jamais sur une base
de production.

| | Banc peuplé |
|---|---|
| Période | octobre 2023 à aujourd'hui |
| Ventes | **418 745** (22 % assurées, avec tiers payant), 877 363 lignes |
| Chiffre d'affaires | ~1,1 M/jour il y a 3 ans, **~2,3 M/jour** sur les 30 derniers jours (2,5 à 2,8 M en semaine, creux le dimanche) |
| Ventes par jour | ~510 en ce moment, panier moyen ~4 500 FCFA |
| Mouvements de stock | 940 000 ; réapprovisionnement par 5 468 bons de livraison et leurs commandes |
| Autres | 3 000 assurés, 15 tiers payants, ouverture et clôture des caisses chaque jour |
| Base | 5 Go, réglages MariaDB des officines (`innodb_buffer_pool_size` = 3,5 Go…) |

Chaque bon de livraison généré produit aussi son **entrée en stock** (date, quantité, péremption entre 10 et 36 mois),
comme à la réception réelle : « dernière entrée », articles dormants et périmés travaillent donc sur 52 000 entrées.

Le générateur recopie de vraies lignes du banc (même format que l'application) et ne fait varier que les identifiants,
dates, produits, quantités et montants. Le stock du jour reste inchangé : l'historique est reconstruit en remontant le
temps. Tout se retire avec `--retirer`.

### 7.1 Ce qui reste rapide avec ce volume

- **Connexion** : application prête en 2,2 à 2,6 s, dont l'essentiel est le chargement des fichiers. Les appels du
  tableau de bord prennent moins de 100 ms côté serveur. La connexion n'est pas sensible au volume.
- **Recherche de produit à la caisse** : 20 à 70 ms.
- **122 écrans sur 128** (tous les écrans du menu administrateur, ouverts un par un) : moins de 2 s.
- **Tâches automatiques** (surveillance, pool, notifications…) : 0,06 s de travail en base en 5 minutes. C'est
  négligeable, même multiplié par 20 postes.

### 7.2 Lenteurs trouvées et corrigées

Les réponses ont été comparées avant et après chaque correction (JSON ou texte du PDF) : elles sont identiques.

| Écran / action | Avant | Après | Cause |
|---|---|---|---|
| **Audit & rapprochements** | 30 s, **écran vide** (délai du navigateur dépassé ; 68 s côté serveur) | **1,4 s** | Contrôle « vente comptant sans mouvement de caisse » : un `OR` empêchait les index, et toute la table des mouvements de caisse était relue pour chaque vente (62 s → 21 ms). Il manquait aussi deux index : date de clôture des ventes, et (produit, emplacement, heure) pour le dernier mouvement de chaque produit (3,5 s → 0,11 s). |
| **Recherche dans les ventes terminées** (par produit, référence, ticket, sur 30 jours) | 6,3 à 6,7 s | **0,13 à 0,37 s** | La requête partait de tous les produits et de toutes leurs lignes de vente depuis 3 ans. Elle part maintenant des ventes de la période. |
| **Relevé PDF des factures subrogatoires** (2 mois, 6 792 bons) | **597 s (10 min)** | **2,7 s** | Coût **quadratique** : une requête par bon dans la même transaction, et Hibernate revérifiait avant chacune tous les objets déjà chargés. Les tiers payants sont maintenant lus par paquets de 500. |
| **Ticket Z** | 1,6 à 3,4 s | 0,12 à 1,1 s | Date comparée à travers une fonction (index inutilisable), `IN (…)` sur 846 000 lignes de vente, et une requête par vente. |
| États de TVA | 1 à 1,5 s | 0,2 à 1 s | Même `IN (…)` sur les lignes de vente. |
| **Application mobile : fiche produit (`v1/info`, `checkproduit`)** | 57 s et 61 s | **13 s et 14 à 16 s** | La dernière vente de chaque produit, par emplacement, était cherchée en deux passages sur 3 ans de lignes de vente. Elle est trouvée en un seul passage (11,6 s → 2,5 s par lot de 500 produits). En plus, `checkproduit` chargeait les produits **un par un** : 1 793 requêtes, donc 1 793 allers-retours réseau chez l'officine. Ils sont maintenant chargés avec leur stock, en une seule requête (2 170 → 376 requêtes, dont l'essentiel pour la connexion). Les réponses sont identiques octet par octet avant et après. |
| **Comparaison stock : export Excel / CSV** (1 643 articles en stock ; journal de l'officine du 15/10, « BLOCAGE DETECTE » à 32 s) | **327 s** | **7,2 à 7,9 s** | Six lectures **par article** (consommations sur 6 mois, bons de livraison, inventaire, dernière vente) alors que le fichier ne montre que la dernière vente. Elle est lue en une requête par lot de 500 articles ; « Créer un inventaire » depuis cet écran ne lit plus que les identifiants. Dates identiques (échantillon de 40 articles comparé en SQL). |
| **Comparaison stock : impression PDF** (1 643 articles ; consommations sur 6 mois, dernier bon, inventaire, dernière vente) | **311 s** | **16,4 s** | Même cause : cinq à six lectures par article, maintenant par lots de 500 (aussi pour « Suggestion » depuis cet écran). PDF comparé ligne à ligne avant/après : 1 639 lignes identiques ; 4 articles livrés par plusieurs bons le même jour prenaient un bon au hasard, c'est maintenant le dernier saisi. |
| **Export des ventes vers l'ERP** (`v1/whareouse-vno`) | 1 semaine (3 085 ventes) : **836 s** ; 1 mois : plus de 30 min, arrêté | 1 semaine : **8 à 13 s** ; 1 mois (13 260 ventes) : **48 s** | Deux requêtes par vente et une par ligne ; avant chacune, Hibernate revérifiait tous les objets déjà chargés (coût quadratique). Lignes, paiements et mouvements de stock lus par lots de 500 ventes. Export d'une semaine **identique octet pour octet** (5,8 Mo). |
| **Suivi des mouvements d'articles** (grille complète, grille, Excel, PDF ; septembre, 1 779 articles) | **1 079 s / 1 122 s / 1 062 s** | **3,1 s / 3,0 s / 1,6 s** | Pour chaque article : lecture du stock, puis chargement de chacun de ses mouvements du mois avec leurs objets liés (utilisateur, ligne de vente…). Les totaux par type sont calculés par la base, par lots de 500 articles. Grille complète identique octet pour octet ; grille : mêmes valeurs pour chaque article (deux articles de même nom échangent leur place, ordre non fixé avant). |
| Export du catalogue vers l'ERP (`v1/stock`) | **erreur 500** (article détail sans indicateur) ; 7,7 s une fois corrigé | **1,1 à 2,5 s** | Fournisseurs, stocks et article détail lus par lots. Même contenu ; l'ordre des fournisseurs d'un article n'a jamais été fixé (HashSet), il varie d'un appel à l'autre avant comme après. |
| Articles en surstock (grille et PDF) | 8,3 s | 4,9 s | Consommations lues par lots. Réponse identique octet pour octet. |
| Unités vendues (grille et PDF ; septembre, 1 751 articles) | 11,9 s | 10,1 s | Stock lu par lots. Stock identique pour chaque article. Colonnes « Nbre.VNO / Nbre.VO » corrigées ensuite (demande du 16/10) : la requête prenait le type d'une vente au hasard parmi celles de l'article ; 1 282 articles sur 1 751 étaient faux en septembre. |
| **Impression « Liste des caisses »** (septembre, 16 565 mouvements, 8 caissiers) | **39 s** | **0,8 à 2,7 s** | Chaque mouvement était chargé entier avec, un par un, sa vente liée et les liens de celle-ci (règlement, client…). Seules les colonnes utiles sont lues ; clients par lots. Données remises à l'impression identiques (empreinte MD5 de chaque caissier et totaux). |
| Balance âgée détaillée | 2,8 s | 2,8 s | 161 requêtes inutiles retirées (recherche du client « %% »). Le reste vient de l'ancien calcul mois par mois (voir 7.3). |

La migration **V6.9.151** crée les deux index « en ligne », sans bloquer les tables. Sur le banc, elle a pris 3,3 s
pour 420 000 ventes et 940 000 mouvements. Chez une officine plus grosse, il faut compter quelques secondes de plus au
démarrage qui suit la mise à jour.

### 7.3 Lenteurs restantes (à décider)

| Écran | Temps | Pourquoi | Piste |
|---|---|---|---|
| **Comparaison CA familles** | 6,7 s (jusqu'à ~28 s au premier accès du matin) | Additionne 2 années de lignes de vente (~600 000). | Un index « couvrant » le ramène à 3,3 s, mais alourdit chaque vente enregistrée. Mieux : un cumul mensuel par famille, calculé la nuit. |
| **Balance âgée détaillée** | 2,8 s (plus le réseau : ~800 allers-retours) | Ancien code : 8 requêtes par tiers payant, construites par concaténation (risque d'injection SQL). | Une seule requête groupée en API REST, en reproduisant exactement les filtres anciens. |
| Application mobile : tout le catalogue (`v1/info`, `checkproduit`) | 13 à 16 s | Chaque appel relit les 3 ans de lignes de vente pour trouver la dernière vente de chaque produit. Lire ces lignes prend déjà 2 s par lot de 500 produits ; deux autres façons d'écrire la requête ont été essayées, avec le même résultat mais plus lentes. | Tenir à jour une table « dernière vente par produit et emplacement », mise à jour à la clôture de chaque vente : l'appel tomberait sous 2 s. Cela touche à l'enregistrement des ventes, donc à décider. |
| Pilotage | 0,9 s ; 1,7 s à froid | Correct. Le premier balayage, juste après le chargement des données, donnait 47 s : le cache disque était vide. | — |
| Écrans de l'ancien code (EclipseLink) | — | Chaque requête de l'ancien code reprend une connexion et paie les 4 échanges techniques de Payara. Le réglage fait pour Hibernate ne les concerne pas. | Passer ces écrans en API REST au fil de l'eau, ou changer le pilote MariaDB (voir § 5). |

### 7.4 Premier accès du matin

Après un redémarrage du serveur, les données ne sont pas encore en mémoire. Les premières ouvertures d'écrans
d'analyse sont donc plus lentes : Pilotage passe de 0,9 s à 1,7 s, le tableau de bord met 1,2 à 1,4 s par requête au
lieu de 0,1 s. C'est normal et ça ne dure pas : avec `innodb_buffer_pool_size` = 3,5 Go, la partie utile de la base
reste ensuite en mémoire.

## 8. Tests ajoutés

- Tests rendus **indépendants du volume** (ils supposaient une base presque vide) : chacun crée ses propres données
  quand la base n'en offre plus, et les retire à la fin.
  - `test-audit-analyse`, `test-audit-rapports`, `test-audit-regularisations` : créent leur produit sans mouvement.
  - `test-suppression-vente-origine`, `test-import-clients` : créent leur utilisateur.
  - `test-tableau-bord-impression` : une carte vide garantie.
  - `test-proforma` : client standard, le seul proposé par la recherche de l'écran.
  - `test-facture-subrogatoire-api`, `test-recap-caisse-modes` : dates calculées et non plus fixes.
- Défaut d'affichage trouvé au passage : l'impression des **articles dormants sans résultat** perdait l'en-tête et
  les filtres. Elle les garde maintenant, comme les autres états.

- `src/test/e2e/support/test-connexion-allers-retours.js`, par l'écran de connexion :
  - administrateur et caissier temporaire : au plus 70 allers-retours ;
  - menu affiché identique aux droits du rôle en base ;
  - mauvais mot de passe refusé ;
  - nettoyage en fin de test.
- `src/test/e2e/support/test-rum-veille.js` : un envoi de 20 mesures fait au plus 11 allers-retours ; regroupement par
  5 minutes sans perte de mesure.
- `RumTest.tranchesDeCinqMinutes` : test unitaire du découpage en tranches.

## 9. Test de charge des connexions (retours du 13/10, point 20)

Script : `outils/charge/charge-connexion.js` (à lancer seul, sur une copie de travail).

Chaque utilisateur simulé :
- sur le poste, se connecte (`POST api/v1/user/auth`) puis charge son premier écran, c'est-à-dire les 20 appels
  relevés dans le navigateur entre la connexion et le tableau de bord (menu, compte, officine, tuiles, alertes,
  encaissements, cloche…), 6 à la fois comme un navigateur ;
- sur Prestige Mobile (Android), se connecte (`POST api/v1/mobile/connexion`) puis lit son profil.

Un « témoin », déjà connecté, envoie une requête légère toutes les 300 ms : il mesure ce que ressent la personne qui
travaille pendant que les autres se connectent.

Mesures du 14/10/2026, sur le banc (3 ans de données, 4 cœurs, MariaDB 10.11, Payara 5), sans autre test en cours :

| Simultanés (poste + tél.) | Durée | Échecs | Connexion poste médiane / 95 % | Connexion + 1er écran 95 % / max | Connexion tél. médiane / 95 % | Témoin médiane / 95 % / max |
|---|---|---|---|---|---|---|
| 1 + 1 | 58 ms | 0 | 22 / 22 ms | 58 / 58 ms | 17 / 17 ms | 25 / 25 / 25 ms |
| 5 + 5 | 224 ms | 0 | 44 / 78 ms | 223 / 223 ms | 49 / 68 ms | 42 / 42 / 42 ms |
| 10 + 10 | 461 ms | 0 | 76 / 137 ms | 459 / 459 ms | 75 / 123 ms | 36 / 124 / 124 ms |
| 20 + 20 | 969 ms | 0 | 158 / 257 ms | 964 / 965 ms | 144 / 244 ms | 113 / 231 / 231 ms |
| 40 + 40 | 1745 ms | 0 | 236 / 425 ms | 1737 / 1741 ms | 174 / 422 ms | 466 / 478 / 478 ms |

Appel le plus lent à chaque palier : le menu (`ws_tree_menu.jsp`, ancienne JSP) — 31 ms seul, 631 ms à 40 + 40.

**Lecture**
- Aucun refus, aucune erreur, jusqu'à 80 connexions simultanées (40 postes + 40 téléphones).
- Le temps croît à peu près linéairement : le serveur met les demandes en file, il ne s'effondre pas.
- La personne déjà connectée garde moins d'un quart de seconde jusqu'à 20 + 20. À 40 + 40, elle attend environ
  0,5 s, seulement pendant les 2 s du pic.
- Une officine réelle (5 à 15 postes, quelques téléphones) reste dans les deux premières lignes du tableau.
- Ces mesures ne comptent pas le temps du navigateur. Seul, il met environ 3 s entre le clic « Connexion » et le
  tableau de bord affiché, chargement des scripts compris.

**À refaire sur le poste de l'officine** (données réelles, autre matériel) :
`node outils/charge/charge-connexion.js 1,5,10,20,40`, puis le nettoyage affiché à la fin.

**Piste si le pic devient gênant :** le menu est recalculé à chaque connexion par l'ancienne JSP. Le mettre en
cache par profil, en REST, est le gain le plus net. Ce n'est pas fait : il faut une décision, car cela touche
l'ancienne JSP.

## Requêtes lentes relevées par la série de non-régression du 15/10 (banc de 3 ans)

Source : Centre de support, alertes « Requête lente (> 5 s) » créées pendant les séries de tests du 15/10 (01 h à 04 h).
**Réserve importante** : une partie de ces alertes date de la période où le serveur était engorgé (opérations
Hazelcast retardées de plus de 10 s, redéploiement bloqué), avant son redémarrage vers 02 h 25. Elles signalent des
routes à mesurer seules, pas une lenteur établie.

| Alertes | Route |
|---:|---|
| 26 | `GET etat-control-bon/list` |
| 20 | `GET info` |
| 19 | `GET checkproduit` |
| 16 | `GET balance/balancesalecash/analyse` |
| 14 | `GET ventestats/article-vendus-recap` |
| 9 | `POST suggestion-pharmaml/{id}` (test d'envoi PharmaML) |
| 7 | `GET analyse-commande/demande` |
| 3 | `GET analyse-article/matrice` |
| 1 à 2 | `ventestats/annulations`, `stats-recette-caisse/data`, `evaluation-vente/data`, `produit/stats/vente-annuellep`, `analyse-commande/recalculer`, `facture-tiers-payant/details-vente`, `famille-grossiste` |

**À faire** : mesurer chacune seule, serveur au repos, sur le banc puis sur la copie `laborex_v1_db`, avant toute
optimisation. Les routes nouvelles du 15/10 ont été mesurées : état des rayons d'un inventaire < 300 ms, routes de
comptage (`…/nombre`) quelques dizaines de millisecondes.

## Activité des équipes : onglet Analyses (19/10)

Mesure de `GET v1/activite-equipes/analyses` sur le banc (3 ans, environ 16 500 ventes par mois), serveur au repos,
une requête à la fois :

| Période | Durée |
|---|---:|
| un mois (septembre 2026) | 1,1 s |
| douze mois | 8,8 s |

La route lit les ventes et les BL de la période, puis ceux de la période précédente de même durée (comparaison des
tuiles). Elle n'est appelée qu'à l'ouverture de l'onglet Analyses ou sur « Actualiser », et la période est limitée à
366 jours. L'écran affiche « Calcul des analyses… » pendant le calcul. Si douze mois s'avèrent trop lents en
officine, la piste est d'agréger les ventes par jour en SQL plutôt que de les lire une par une.

## Statistique famille (19/10)

`GET v1/statfamillearticle` (ANALYSE DE GESTION > « Statistique famille », et son impression PDF), banc de 3 ans :

| Cas | Avant | Après |
|---|---:|---:|
| Septembre 2026, sans filtre | 10,6 s | 2,8 s |
| Septembre, filtre rayon | 7,2 s | 3,0 s |
| Septembre, recherche par libellé | 16,6 s | 3,0 s |
| Une semaine | 5,9 s | 2,5 s |

**Cause** : écrites en critères JPA, les sommes laissaient MariaDB partir des 1 794 articles et relire toutes leurs
lignes de vente depuis l'origine, au lieu de partir des ventes de la période (index sur la date). Le cumul de l'année
était en plus relu famille par famille. Les requêtes sont maintenant en SQL natif, ventes lues d'abord
(`STRAIGHT_JOIN`), cumul de l'année en une seule requête. Réponses comparées octet pour octet sur 8 cas (filtres,
périodes, période vide) : identiques. Les routes par rayon et par grossiste (`statisticrayons`,
`statisticprovider`), qui partagent le total HT, donnent aussi des réponses identiques (14 cas). Elles restent autour
de 10 s par appel : leur temps se passe ailleurs, à traiter à part.

## CA par emplacement et CA par grossiste (19/10)

`GET v1/statfamillearticle/statisticrayons` et `statisticprovider` (ANALYSE DE GESTION > « CA par emplacement » et
« CA par grossiste », et leurs impressions PDF), banc de 3 ans :

| Cas | Avant | Après |
|---|---:|---:|
| Emplacements, septembre 2026 | 15,9 s | 3,6 s |
| Grossistes, septembre 2026 | 13,0 s | 2,9 s |
| Emplacements, juillet à septembre | 19,1 s | 4,2 s |
| Grossistes, juillet à septembre | 13,0 s | 4,3 s |
| Septembre, filtre grossiste, famille ou recherche | 10,2 à 12,9 s | 2,9 à 3,5 s |
| Septembre, emplacements filtrés sur un emplacement | 2,3 s | 1,4 s |
| Septembre, grossistes filtrés sur un emplacement | 6,6 s | 3,1 s |
| Une semaine | 5,8 à 6,4 s | 2,6 à 2,8 s |

**Cause** : la même que pour « Statistique famille » : des sommes en critères JPA qui partaient des articles, puis une
requête par emplacement (ou par grossiste) pour le cumul de l'année. **Correction** : la même, à savoir du SQL
natif qui lit d'abord les ventes de la période, et le cumul de l'année en une seule requête. Exception : quand l'écran
n'affiche que trois lignes au plus et qu'elles portent moins du quart des articles, chaque cumul est lu seul, par
l'index de l'article (1,1 s au lieu de 2,5 s pour le cumul de tous). Les réponses ont été
comparées octet pour octet sur 14 cas : elles sont identiques. Test d'écran : `perf/test-statistique-rayon-grossiste.js`
(14/14). Sur l'ancien code, ses 12 premières vérifications donnaient 8/12 (de 7 à 13 s).

## Pilotage, onglet « À suivre » (19/10)

Journal de l'officine : « BLOCAGE DETECTE : requete en traitement depuis 26s : GET /prestige/api/v1/pilotage/onglet/asuivre ».
Sur le banc de 3 ans, premier calcul (le résultat est ensuite gardé 5 minutes) :

| Période | Avant | Après |
|---|---:|---:|
| Mois en cours | 3,7 s | 3,3 s |
| Mois vs an dernier | 4,3 s | 4,2 s |
| Cumul annuel | 28,4 s | 6,8 s |
| Glissant 12 mois | 32,6 s | 6,3 s |

**Cause** : les lignes de vente de la période étaient relues quatre fois (CA total, CA par emplacement, CA par
famille, ventes à perte), en partant des articles et de toutes leurs lignes depuis l'origine. **Correction** :
- emplacements et familles : les ventes de la période sont lues d'abord (`STRAIGHT_JOIN`) ;
- CA total : c'est la somme des emplacements, ce qui économise une lecture ;
- emplacements, familles et ventes à perte : chacune tourne sur son propre fil et sa propre connexion pendant le
  reste du calcul, comme la balance des ventes. Si le lancement échoue, la lecture est refaite en direct.

Les réponses ont été comparées octet pour octet sur les 4 périodes : elles sont identiques. Test d'écran :
`perf/test-pilotage-a-suivre.js` (4/4) ; il échoue sur l'ancien code (29 s).

**Appel depuis l'application mobile.** Le journal de l'officine vient de l'application mobile. Le journal de blocage
n'écrit pas les paramètres, et sans période le serveur prend le mois en cours. J'ai mesuré ce cas sur le banc, base
froide (MariaDB redémarrée, caches du système vidés), au premier appel :
- ancien code : 5,5 s ;
- nouveau code : 6,0 s, l'écart restant dans le bruit de la mesure.

Le gain du correctif porte sur l'année et les 12 mois glissants, pas sur le mois. Les 26 s de l'officine sur le mois
ne se reproduisent pas sur le banc. Pour savoir quelle période le mobile a demandée, il faut lire la ligne « Query : »
de l'événement de lenteur du support, à la même heure.

## Lignes d'un BL demandées en une fois par l'application mobile (23/10)

Journal du 21/10 : « Requete lente (5,5 s) : GET /prestige/api/v1/commande/bon/items/{id}?limit=9999 », appel de
l'application mobile de réception, qui demande tout le bon d'un coup. Sur le banc, le plus gros BL (492 lignes) :

| Appel | Avant | Après |
|---|---:|---:|
| Toutes les lignes (limit=9999) | 43 à 47 s | 1,8 à 3,2 s |
| Page de 10 lignes (écran « Gestion des entrées ») | 0,3 s | 0,07 à 0,1 s |
| Recherche, tri, BL de 43 lignes | 0,6 à 0,8 s | 0,17 à 0,24 s |

**Cause** : pour chaque ligne, une petite requête (lots, code article du grossiste, stock) faisait d'abord revérifier
par Hibernate toutes les lignes et tous les produits déjà chargés, ce qui donne un temps qui croît comme le carré du
nombre de lignes. **Correction** : la lecture ne modifie rien, donc cette vérification est suspendue le temps de la
lecture. Réponses comparées octet pour octet sur 6 cas : elles sont identiques. Test : `perf/test-lignes-bl-mobile.js`
(5/5).
