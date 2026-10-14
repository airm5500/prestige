# Rapport — lenteur à la connexion (14/10/2026)

**Constat remonté** : la connexion d'un utilisateur est plus longue que d'habitude.
**Question associée** : la mesure de l'expérience utilisateur (RUM) a-t-elle un coût sur l'exploitation ? Ralentit-elle
Prestige ?

## 1. Ce qu'il faut retenir

| | Avant | Après |
|---|---|---|
| Allers-retours avec la base pour **se connecter** (administrateur, 219 droits) | 272 | **42** |
| Allers-retours avec la base pour **se connecter** (caissier, 71 droits) | 132 | **41** |
| Allers-retours pour **la connexion complète** (jusqu'au tableau de bord affiché) | 518 | __TOTAL_APRES__ |
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

| Réseau | Avant (518 requêtes) | Après (__TOTAL_APRES__ requêtes) |
|---|---|---|
| Aucun (base sur la même machine) | 0,09 s | négligeable |
| Bon réseau filaire (aller-retour 0,5 ms) | 0,5 s | __T05__ |
| Réseau ordinaire (1 ms) | 0,8 s | __T1__ |
| Réseau chargé (2 ms) | 1,35 s | __T2__ |
| Wi-Fi (5 ms) | 2,9 s | __T5__ |

Le temps est quasiment proportionnel au nombre d'allers-retours. Les postes en Wi-Fi, ou sur un réseau chargé, sont
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

__NON_REGRESSION__

**Point trouvé en passant, sans lien avec cette correction** : le test « Points fidélité » attend le libellé de menu
« Points fidélité » (demande du 10/10). La migration « libellés courts » du 12/10 l'a remplacé par « Suivi fidélité ».
C'est à confirmer : quel libellé garder ?

## 7. Tests ajoutés

- `src/test/e2e/support/test-connexion-allers-retours.js`, par l'écran de connexion :
  - administrateur et caissier temporaire : au plus 70 allers-retours ;
  - menu affiché identique aux droits du rôle en base ;
  - mauvais mot de passe refusé ;
  - nettoyage en fin de test.
- `src/test/e2e/support/test-rum-veille.js` : un envoi de 20 mesures fait au plus 11 allers-retours ; regroupement par
  5 minutes sans perte de mesure.
- `RumTest.tranchesDeCinqMinutes` : test unitaire du découpage en tranches.
