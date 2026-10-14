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

- Tests unitaires : **1432 sur 1432**.
- Tests d'écran :
  - tous ceux hors du dossier `retours`, plus un échantillon de 46 tests de `retours` choisis parce qu'ils écrivent en
    base (ventes, différés, avoirs, caisse du jour, inventaires, commandes, réceptions, dépôts, ordonnances, RH,
    fidélité, WhatsApp, tableau de bord) ;
  - au total **85 tests sur 91 passent** ;
  - les **6 échecs sont identiques sur la version précédant la correction** (reconstruite et redéployée sur le banc
    pour le vérifier) : ils existaient avant et n'ont pas de lien avec la correction.
    - `lot4/test-recap-caisse-modes` : ouverture du sous-détail d'une ligne (contrôle fait dans le navigateur) ;
    - `retours/test-suppression-vente-origine` : le script s'arrête au démarrage ;
    - `retours/test-depot-extension-stock` : la liste propose aussi d'autres officines du banc ;
    - `retours/test-import-clients` : la connexion d'essai dépasse 40 s ;
    - `retours/test-facture-subrogatoire-api` : la référence JSP renvoie une page HTML ;
    - `retours/test-valorisation-archivee` : modèle d'état `rp_valoristion` absent du banc.
- Après correction, le journal du serveur ne contient aucune erreur.
- Tests de la stabilité du serveur, des campagnes, du Set valorisation, de la rentabilité, de l'audit, du cachet et de
  la vente (droits retirés puis donnés, accès refusés puis ouverts) : tous passent.

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
| **Application mobile : fiche produit (`v1/info`, `checkproduit`)** | 57 s et 61 s | **13,5 s et 18 s** | La dernière vente de chaque produit, par emplacement, était cherchée en deux passages sur 3 ans de lignes de vente. Elle est trouvée en un seul passage (11,6 s → 2,5 s par lot de 500 produits). Résultat identique ligne à ligne (1 498 lignes). |
| Balance âgée détaillée | 2,8 s | 2,8 s | 161 requêtes inutiles retirées (recherche du client « %% »). Le reste vient de l'ancien calcul mois par mois (voir 7.3). |

La migration **V6.9.151** crée les deux index « en ligne », sans bloquer les tables. Sur le banc, elle a pris 3,3 s
pour 420 000 ventes et 940 000 mouvements. Chez une officine plus grosse, il faut compter quelques secondes de plus au
démarrage qui suit la mise à jour.

### 7.3 Lenteurs restantes (à décider)

| Écran | Temps | Pourquoi | Piste |
|---|---|---|---|
| **Comparaison CA familles** | 6,7 s (jusqu'à ~28 s au premier accès du matin) | Additionne 2 années de lignes de vente (~600 000). | Un index « couvrant » le ramène à 3,3 s, mais alourdit chaque vente enregistrée. Mieux : un cumul mensuel par famille, calculé la nuit. |
| **Balance âgée détaillée** | 2,8 s (plus le réseau : ~800 allers-retours) | Ancien code : 8 requêtes par tiers payant, construites par concaténation (risque d'injection SQL). | Une seule requête groupée en API REST, en reproduisant exactement les filtres anciens. |
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
