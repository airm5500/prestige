# Nouvelles fonctionnalités fusionnées le 09/11/2026

Branche d'intégration : `integration/recette-2026-10-29`. Neuf branches ont été fusionnées le 09/11, avec l'accord du
pharmacien : les quatre de la première demande (demande 60, icône, demande 59 et retours fournisseurs, correspondance
grossistes), puis les cinq du plan avoir du 08/11. Le plan du 08/11 (20 points) entre avec elles.

**Non fusionnés** (règle de fusion) :
- les connecteurs Ubipharm / TEDIS : ils attendent votre test ;
- le cas 4 (archives) ;
- les présentations des saisies.

Cahier de recette : `CAHIER_RECETTE_FUSION_2026-11-09.xlsx`. Récapitulatif des worktrees :
`RECAP_WORKTREES_FUSIONNES_2026-11-09.md`.

## 1. Réception et retours fournisseurs (demande 59, transmission du 07/11)

### Clôture « entrer le reçu » d'un BL incomplet
- Route `PUT v1/commande/validerbl/{id}?mode=RECU` (application mobile). Les modes actuels ne changent pas.
- **Lignes avec lots :** la somme des lots entre en stock, UG comprises, plafonnée à commande + UG.
- **Lignes sans lot :** rien n'entre, jamais la quantité commandée.
- **Calcul :** manquant = commandé − reçu, jamais négatif.
- **Péremption obligatoire :** contrôlée sur les lots saisis seulement.
- **Réponse :** la liste `ecarts` et `totalManquant`. L'écart figure aussi :
  - dans la route `v1/reception/{blId}/ecarts` ;
  - dans l'état de contrôle des achats ;
  - dans le journal.
- **Capacités :** `clotureRecu` et `retourManquants` dans `v1/reception/parametres`.

### Retour des manquants
- Route `POST v1/reception/{blId}/retour-manquants` : un retour en attente, motif « Manquant », **sans aucune sortie de
  stock**, ni à la création ni à la validation.
- Un second appel renvoie le retour déjà créé.

### Retours fournisseurs en attente
- **Refus :** motif obligatoire, auteur et date ; aucune sortie de stock. La confirmation se fait dans le bouton.
- **Abandon** d'un retour en attente.
- **Correction après refus :** lignes, quantités, motifs et lots, sur le web comme sur le mobile.
- **Retour validé ou abandonné :** il ne se modifie plus (refus 409 `ETAT`).
- **Signal au valideur :**
  - pastille du nombre de retours en attente sur le menu ;
  - avis discret à la connexion ;
  - un clic ouvre la liste filtrée « En attente ».
- **Export Excel :** état, motif du refus, auteur et date de l'état.
- **Tableau de bord par état :** les retours refusés ou abandonnés ne comptent jamais comme validés.
- **Migrations :** V7.2.60, V7.2.61.

## 2. Réserve : droit « Voir les suggestions de réserve » (demande 60)
- **Droit :** `P_RESERVE_SUGGESTION`, migration V7.2.70. Les rôles qui voyaient déjà les suggestions le reçoivent :
  personne ne perd ce qu'il voyait.
- **Sans ce droit :**
  - l'onglet Suggestions et la cloche sont masqués ;
  - les routes de lecture et d'action sur une suggestion répondent 403, jamais 401 ;
  - la fenêtre « Réserve après entrée » ne propose plus d'ouvrir les suggestions.
- **Création :** elle reste permise avec les droits actuels.
- **Mobile :** `voirSuggestions` dans `GET v1/reserve/droits`.

## 3. Correspondance des produits grossistes (lots 1 à 5)
- **Lot 1, codes exacts :** les codes des grossistes sont rapprochés d'office par CIP ou EAN. Les autres vont à la file
  de validation.
- **Lot 2, apprentissage :** l'import garde le code et la désignation bruts de chaque ligne. À la clôture du BL, il crée,
  confirme ou signale une contradiction.
- **Lot 3, écran :** GESTION DES COMMANDES > « Correspondance grossistes », droit `P_CORRESPONDANCE_GROSSISTES`.
  - File « à traiter » avec trois actions : valider, autre produit, rejeter.
  - « Proposer par désignation » suggère au plus 3 candidats, toujours à valider.
  - Toutes les décisions sont confirmées dans le bouton.
- **Relecture à l'import :** une correspondance validée l'emporte sur la recherche par code.
- **Lot 4, prix :** les prix sont lus sur chaque BL clôturé.
  - Le prix public TTC est comparé au prix de vente Prestige.
  - L'écart est signalé en rouge au-delà d'un seuil réglable (0 FCFA par défaut).
  - Une liste « Écarts de prix publics » regroupe ces écarts.
- **Lot 5, disponibilité :** le bouton « Vérifier » envoie une demande d'information PharmaML, jamais une commande.
  - Une lecture de moins de 15 minutes est reprise sans nouvel appel.
  - Source par grossiste : 0 PharmaML, 1 extranet, 2 les deux.
  - La source extranet répond « absente » tant que les connecteurs ne sont pas fusionnés.
- **Migrations :** V7.6.0 à V7.6.5.

## 4. Plan avoir du 08/11

| Point | Ce qui change |
|---|---|
| 1 | **Carte « Activité des équipes » au tableau de bord :**<br>- ventes de plus de 10 min, actions sensibles, délai moyen des BL, opérateur le plus rapide, alerte ;<br>- au clic, une fenêtre de consultation avec Hier, 3 jours, 1 semaine, Du / au.<br>**Nouvelle carte « CA par employé et tranche horaire » :**<br>- tranches de 1 à 6 h ;<br>- attribution à la caissière ou au vendeur de la prévente ;<br>- export CSV. |
| 3 | **Pilotage lisible sur un portable 15 pouces et en 1024×600 :**<br>- l'onglet « Qualité–Exploitation » devient « Exploitation » ;<br>- le détail mensuel s'affiche en entier ;<br>- les tuiles « À suivre » passent à la ligne ;<br>- KPI Analyse n'a plus de défilement horizontal. |
| 4 | **Campagnes :**<br>- les clients cochés restent cochés d'une recherche à l'autre ;<br>- le numéro est pris dans le champ téléphone, sinon dans l'adresse ;<br>- de nouveaux filtres de liste : produit, montant, sexe, etc. ;<br>- l'onglet Fêtes demande d'abord une liste de diffusion, sans recherche à l'ouverture ;<br>- « Répondu » ne compte plus que les vrais messages du client. |
| 5 | **Rappels des traitements :** ciblage libre par produit et période, et envoi aux résultats. |
| 6 | **Nouveau menu « Pré-saisie des bons de livraison » (phase 1) :**<br>- on saisit et on consulte les pré-saisies ;<br>- la création du BL passe la pré-saisie à « Traité ». |
| 7 | « Me contacter » occupe toute la hauteur. « Fichier journal » était déjà corrigé dans le plan du 08/11. |
| 8 | **Inventaire :**<br>- une icône différente pour chacun des trois boutons ;<br>- « Ouvrir l'inventaire » remplace « Editer un inventaire » ;<br>- 4 propositions de barre de boutons, en attente de votre choix. |
| 9 | **WhatsApp Web :**<br>- valeurs par défaut pour une nouvelle installation : `http://localhost:3010` et `C:\prestige\whatsapp-web` ;<br>- bouton « Configuration détaillée », pour les modes 1 « service Windows » et 2 « lancement direct » ;<br>- plus d'écran noir après le démarrage. |
| 10 | **Avis clients :**<br>- la réponse peut passer par WhatsApp Web ;<br>- elle entre dans le fil de discussion ;<br>- un client STOP ne la reçoit plus. |

Le point 2 (retours fournisseurs par les extranets) attend la fusion des connecteurs.

## 5. Plan du 08/11 (20 points), arrivé avec ces branches

Le détail est dans `BILAN_PLAN_08112026.md`.

**Grossistes et achats :**
- état de contrôle d'achat du grossiste en API REST ;
- fenêtres du grossiste sans défilement ;
- PDF de l'analyse des avoirs, du tableau de bord des retours et de la fenêtre « Seuil de réserve atteint » ;
- contrôleur et date dans l'état de contrôle des achats.

**Écrans et affichage :**
- écrans de facture de groupe en pleine hauteur ;
- repère ⇄ des ventes scindées ;
- comparateur du Pilotage expliqué ;
- indicateur d'envoi des campagnes.

**Réserve, suggestion et stock :**
- réserve : suppression en masse avec motif, colonnes sans défilement ;
- suggestion : nettoyage selon le rayon et la réserve, Actualiser, VMJ et couverture ;
- une vente ratée passe « Commandé » à l'entrée en stock ;
- filtre « Prix achat > prix vente » de l'inventaire.

**Ventes et caisse :**
- code PIN après le badge, facultatif ;
- motif obligatoire pour annuler ou modifier une vente ;
- option « information promotion » du ticket ;
- ticket Z par WhatsApp.

**Activité des équipes :** annulations par auteur, BL par grossiste, prise en caisse des préventes (écran de vente et
vente en dépôt), préventes, vitesse par type de vente, onglet Anomalies réservé, gardes.

**Icône (point 10) :**
- nouvelle icône : mortier aux feuilles et gélule ;
- logo et badge de l'écran de connexion.

## 6. Fusion : conflits résolus

**Cahiers de recette du 06, 07 et 08/11.** Ils avaient été ajoutés des deux côtés, avec les mêmes cellules. La version
de la branche principale est gardée.

**Clôture du BL (`CommandeServiceImpl`).** Les deux côtés avaient changé cette logique ; voici ce qui est gardé :
- **lots :** comptés seulement s'ils sont actifs et du grossiste du BL, comme dans l'intégration (audit 06, EN-02) ;
- **plafond :** commande + UG ;
- **mode « reçu » :** ajouté à la clôture ;
- **réserve :** les suggestions du bon, filtrées par le droit de la demande 60.

**Campagnes, suivi (`CampagneService`).** La structure de l'intégration est gardée. Le téléphone suit la règle de la
branche : téléphone de l'envoi, sinon celui de la fiche.

**SMS (`SmsImpl`).** Le numéro est choisi selon la règle de la branche, et les journaux restent masqués.

**Menus, EJB et méthodes ajoutés au même endroit.** Les deux ajouts sont gardés.

**Test de la demande 59.** Le lot sans date que le test pose en base porte désormais le grossiste du BL, comme un lot
saisi à l'écran. Le code ne change pas (commit e760bdc1f).

**Défaut de fusion corrigé : le PDF du tableau de bord des retours fournisseurs** (commit 1f2d1fe7a).
- **Cause :** la demande 59 a ajouté à l'écran les tuiles « par état » (en attente, refusés, abandonnés, validés). Le PDF,
  venu du plan du 08/11, ne les reprenait pas.
- **Correction :** les indicateurs du PDF ont une seconde ligne « Par état », avec les mêmes titres, nombres et unités
  que l'écran.
- **Tests :**
  - `EditionSectionsTest` : 2 000 cas tirés au hasard ; il échouait avant le correctif ;
  - test d'écran : 24/25 sur le WAR fusionné d'avant le correctif, 25/25 après.

## 7. Vérifications après la fusion
- **Construction :** réussie.
- **JUnit :** 1 989 tests, aucune assertion en échec.
  - Une erreur passagère est survenue dans `ChargementEtatJasperTest` : un dossier temporaire verrouillé par Windows
    pendant un déploiement.
  - Relancé seul deux fois, ce test passe.
- **Tests d'écran :** 79 tests sur le WAR fusionné, un à la fois sous le verrou.
  - 76 sont entièrement verts, une fois rejoués les deux tests corrigés : la demande 59 à 35/35 et les impressions des
    analyses à 25/25.
  - Les 3 autres ont des échecs déjà présents sur l'ancien code, inchangés (voir § 8).
  - Le détail est dans le cahier, feuille « Tests de la série ».
- **Cahier :** 61 cas.
  - 53 OK ;
  - 3 OK avec un échec antérieur ;
  - aucun échec ;
  - 5 sans test d'écran, à vérifier à la main : l'icône, l'écran noir de WhatsApp Web, le rattrapage Flyway et le choix
    des boutons de l'inventaire.

## 8. Points ouverts
- **Données du poste local :** un identifiant et un jeton d'essai sont restés dans le compte WhatsApp API de la copie
  locale (compte inactif), et leurs valeurs d'origine ne sont pas connues. À vérifier.
- **Échecs déjà présents sur l'ancien code, inchangés :**
  - `test-pilotage-besoins-1110-b` : « fondsDoux » et « 00h-02h » ;
  - `test-campagnes` : sous-menu « Modèles de messages » ;
  - `test-avis-clients` : pas d'écoute sur le port 8090 de domain1.
- **Défauts suspectés par la session de la demande 59, non corrigés :**
  - `POST v1/retourfournisseur/new` n'enregistre que la première ligne de `items` ;
  - historique d'un retour : il est daté à la seconde, et l'ordre des actions d'une même seconde n'est pas garanti ;
  - une réponse 409 de `update-item` s'affiche dans une boîte d'erreur standard.
- **Sujets qui attendent :**
  - le prix des catalogues et la disponibilité par extranet attendent la fusion des connecteurs ;
  - il n'existe aucun lecteur d'extranet Laborex ;
  - le choix de la barre de boutons de l'inventaire ;
  - le point 12 du plan du 08/11 (tremblement d'écran), non reproduit.
- **Éditions jrxml :** sur ce poste, `D:\CONF\LABOREX\REPORTS` prime sur le WAR. Elles n'y sont copiées qu'avec votre
  accord.
