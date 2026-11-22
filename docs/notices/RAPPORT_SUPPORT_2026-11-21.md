# Journal du support d'appaul du 21/11/2026

Ce rapport fait suite à `RAPPORT_SUPPORT_2026-11-18.md` (R1 à R15) et à `RAPPORT_SUPPORT_2026-11-20.md`.

- **Pièce :** `journal_support_20261121_appaul.xls`, généré le 21/11 à 22:40, 78 lignes, du 21/11 06:43 au 21/11 22:39.
- **Journal purgé à 06:43 :** une purge manuelle a supprimé 51 événements. La veille de cohérence de 04:15 n'y figure
  donc plus.
- **Lecture :** colonnes techniques seulement. Pour les utilisateurs, seul l'identifiant de connexion du personnel est
  repris. Aucune donnée de client ni texte de demande n'est repris.

## 1. Version en service

| Poste | Version (colonne « Version ») |
|---|---|
| SERVEUR, CAISSE11, CAISSE22, CAISSE33, CAISSE44, SERVEURLENOVO, COMPTA-NDA | 2026-11-21 06:14 UTC : WAR `4afc885b4` du 21/11 |
| DESKTOP-CEPK07B (« caisse5 ») | **2026-11-16 03:45 UTC : non mis à jour** |

- **Ce que contient `4afc885b4` :** il contient `76aa5fc1b`, donc les correctifs du 18/11 : R1 à R8, R14 et R15.
- **Ce qu'il ne contient pas :** les 7 correctifs du 20/11 de la branche `plan/support-1811` (PM3, PM4, PM7, LE8, LE9,
  LE10, CA3).
- **Premier constat sous correctifs :** ce journal est le premier d'appaul depuis l'arrivée des correctifs du 18/11.

Les sept « arrêts brutaux » de 07:04 à 07:19 touchent tous les postes en même temps (lignes 69, 72, 74, 75, 77, 78, 80) :
- ils accompagnent la mise à jour du matin ;
- ce ne sont pas des pannes ;
- le détecteur ne distingue pas un redémarrage de mise à jour d'un arrêt subi (voir N6).

## 2. Classement des retours

Légende de la colonne « Corrigé par les 7 du 20/11 » : « non » = aucun des sept ne s'applique.

| Ligne(s) | Retour | Nouveau ? | Rapport R1–R13 | Corrigé par les 7 du 20/11 | État |
|---|---|---|---|---|---|
| 15, 48, 57 (×12) | CAISSE44 : « Communications link failure » sur `ventes-ratees`, `pointage-affichage`, `anomalies` (12:27–14:47 et 19:07–20:34) | non | **R3** | non | **Ouvert**, aggravé (voir § 3.1) |
| 51, 52–55 (×14) | Connexions à la base : 303 / 320 (94 %), puis « Too many connections » de 14:05 à 14:09 (CAISSE44) | **oui** | lié à R3 | non | **Ouvert** (§ 3.1) |
| 56, 44, 41, 45, 46 | Clôture d'une vente assurance bloquée **2 h** (13:31 → 15:31), « réponse de clôture non revenue au poste » ×2, clôture lente CAISSE44 | **oui** (durée) | lié à R3 | non | **Ouvert**, élevé (§ 3.1) |
| 33, 34, 21 | `modereglement/clients-mobile-money` bloqué 1 min 13 puis **2 h** (17:30 → 19:30) | **oui** | lié à R3 | non | **Ouvert** (§ 3.1) |
| 62, 66, 70, 73, 76, 79 | Auto-diagnostic : anomalie **POOL** sur SERVEUR, CAISSE11, 22, 33, 44, SERVEURLENOVO ; CONFIG_POSTE en plus sur CAISSE11 | **oui** (nouveau point de contrôle) | R3 (correctif du 18/11 qui le détecte) + R11 | non | Le correctif marche : il montre que le script du pool n'est passé sur **aucun** poste. Action sur site |
| 4, 5, 50 (×6) | `vente/update/item/vno` en 500, `StaleObjectStateException` sur une ligne de vente (CAISSE22 22:39, DESKTOP-CEPK07B 14:18) | **oui** | — | non | **Corrigé** le 21/11 (`536b2c0ea`), **confirmé** par test (§ 3.2), N1 |
| 32 | `VenteCtr.js:5297`, `onBtnCancelClient` : `destroy` sur une fenêtre absente (CAISSE44 17:41) | **oui** | — | non | **Corrigé** le 21/11 (`cd7d9233e`), **confirmé** par test (§ 3.3), N2 |
| 39 | Facture subrogatoire : `Ext.getCmp(...) is undefined` dans `detailProduct.js:230` (COMPTA-NDA 15:51) | **oui** | — | non (même famille que **LE9**, autre écran) | **Corrigé** le 22/11 (`bde7896ef`), **confirmé** par test (§ 3.4), N3 |
| 8, 9, 68 (×21) | SMS refusés par Orange (POL0001) ; « Forfait SMS Orange expiré : envois suspendus » à 06:48 et 07:19, puis **18 envois refusés jusqu'à 21:39** | non | **R9** | non | Contrat : action de l'officine. Suspension : **tenue**, pas un défaut (§ 3.5), N4 |
| 24 | « Sauvegarde en cours depuis 36 s… ce n'est pas une requête lente » | non | **R7** | — | **Corrigé** (correctif du 18/11 vu à l'œuvre) |
| 25, 51 (version 16/11) | Alertes de la surveillance de la base levées par **DESKTOP-CEPK07B** (ancienne version) : requête de 35 s (la sauvegarde), connexions élevées | non | **R7 / R14** | non | Disparaîtra avec la mise à jour de ce poste |
| 6, 7, 10–14, 16–20, 22, 26, 27, 29, 31, 35–38, 40, 42, 43, 47, 49, 58–61, 63, 64, 71 | Requêtes lentes (> 5 s) | non | **R8** | non | Groupées aux heures des coupures de CAISSE44 (12:27–14:47, 17:31–17:51, 19:07–20:34) : conséquence de R3, sauf `audit/analyse` (22:32), `tableau-bord/bfr` (22:14) et `top-marges` (17:45), à mesurer avec le point 8 |
| 30 | `horloge/etat` lent une fois (17:51) | non | **R2** | — | Plus aucun blocage de 27 à 62 s (le correctif tient). Celle-ci tombe dans la coupure de 17:51 |
| 69, 72, 74, 75, 77, 78, 80 | « Arrêt brutal du serveur » sur 7 postes, 07:04–07:19 | non | R10 (même alerte) | non | Mise à jour du matin, pas une panne. Détecteur à affiner, N6 |
| 67 | Application mobile : `licence/find` en 503 « Prestige indisponible » (07:34) | **oui** | — | non | Pendant les redémarrages de la mise à jour. Information |
| 81 | Purge manuelle du journal (06:43, 51 événements) | non | **R13** | — | Maintenance |
| — | R1 (impression), R4 (double BL), R5 (`loadPage`), R6 (fiche en 400) | — | R1, R4, R5, R6 | — | **Absents** : rien à signaler sur une journée complète |

**Les 7 correctifs du 20/11 :** aucun retour de ce journal n'est corrigé par l'un d'eux. Ils visent Pontmain, leana et
capitale, et appaul ne présente aucun de leurs symptômes ce jour :
- pas de prix décimal refusé ;
- pas de BL lent ;
- pas de deadlock à la déconnexion ;
- pas d'erreur `valheight`, d'inventaire ni de basculement.

## 3. Détail des retours ouverts

### 3.1 CAISSE44 et le pool de connexions : blocages de 2 h et « Too many connections »

**Constat :**
- Deux requêtes se terminent après **exactement 2 h 00** (« à 20 s près ») :
  - la clôture d'une vente assurance, de 13:31 à 15:31 ;
  - la liste des clients mobile money, de 17:30 à 19:30.
- 2 h, c'est le délai par défaut du maintien TCP sous Windows (7 200 s). Une connexion morte n'est détectée qu'au
  bout de ce délai, quand le pool n'a ni `socketTimeout` ni `tcpKeepAlive`.
- L'auto-diagnostic ajouté le 18/11 signale justement l'anomalie POOL sur tous les postes. Le script
  `1-configurer-payara.ps1 -PoolSeulement -Redemarrer` n'a donc été passé sur aucun poste.

**Saturation des connexions :**
- 303 connexions sur 320 de 13:15 à 14:15 ;
- « Too many connections » à 14:05–14:09 ;
- le script ne fixe pas `max-pool-size` : chaque poste garde la valeur par défaut de Payara (32 connexions). Avec
  7 postes qui ont leur Payara (COMPTA-NDA passe par SERVEUR), on atteint donc 224 connexions avant tout autre client de la base ;
- les connexions mortes de CAISSE44, remplacées sans être rendues, comblent l'écart.

**Conséquence en caisse :**
- vente assurance non close vue du poste (« réponse de clôture non revenue » ×2) ;
- fils HTTP immobilisés 2 h ;
- refus en 500 (`client/all`, `preferences/cloche`).

**État :**
- 2 h = maintien TCP : **suspecté (fort)**, par la durée et l'anomalie POOL.
- Saturation : **confirmée** par le journal ; sa cause (pools pleins ou fuite) est **suspectée**.

### 3.2 N1 : modification d'une ligne de vente qui vient d'être retirée (500)

Le fil d'Ariane de DESKTOP-CEPK07B montre l'enchaînement :
1. 14:17:59 : `remove/vno/item/5f735440…` ;
2. dans la même seconde, `update/item/vno` sur cette même ligne `5f735440…` (même identifiant dans l'exception) ;
3. la saisie en cours dans la cellule part à la validation après le clic sur « retirer la ligne » ;
4. le serveur ne trouve plus la ligne et répond 500, avec une explication de modification concurrente, inexacte ici.

**État :**
- enchaînement : **confirmé** par le fil d'Ariane du premier cas ;
- CAISSE22, 22:39 : même message, fil non conservé, donc **suspecté**.

**Correction (21/11, `536b2c0ea`) :**
- l'écran marque la ligne retirée et n'envoie plus sa modification (`VenteCtr.js`, `removeItemVno` et
  `updateventeOngrid`) ;
- côté serveur, le conflit (`StaleObjectStateException` ou `OptimisticLockException`, à toute profondeur de la chaîne
  des causes) répond « Ce produit n'est plus dans la vente : actualisez l'écran avant de continuer. » au lieu de 500
  (`LigneVenteRetiree`, dans `SalesRessource` et `VenteRessource`) ; toute autre erreur reste une erreur.

**Tests :**
- `retours/test-ligne-retiree-pendant-saisie.js` (écran) : quantité tapée puis ligne retirée au même clic ; un seul
  retrait, aucune modification envoyée, aucune réponse 400 ou plus ; écran = base (une ligne, quantité, total) ; la
  ligne restante se modifie encore (montant = PU × 3). Échoue sur `4afc885b4`, passe sur la branche.
- `LigneVenteRetireeTest` (cohérence) : la chaîne du journal, les variantes, les autres erreurs non reconnues, une
  chaîne en boucle, et 20 000 chaînes tirées au hasard (graine 20261121).

### 3.3 N2 : vente assurance, échec de la recherche du client

- **Enchaînement :** à 17:41, `client/all` échoue (CAISSE44, coupure de la base). La branche d'erreur ajoutée le
  02/11 appelle `onBtnCancelClient`. Cette fonction détruit la fenêtre de choix du client, alors qu'elle n'est pas
  ouverte (`getAssuranceClient()` vide).
- **Effet :** l'exception empêche le message prévu, « La recherche du client a échoué : réessayez ».
- **État :** **confirmé** par lecture du code (`VenteCtr.js:5294–5299` de `4afc885b4`).
- **Correction (21/11, `cd7d9233e`) :** la fenêtre est détruite seulement si elle existe ; même garde en vente en
  dépôt et en devis.
- **Test :** `retours/test-recherche-client-assure-echec.js` : lecture en échec (500), message affiché, une seule
  requête, ni fenêtre ni erreur ; puis recherche réelle (lignes affichées = clients renvoyés) et « Annuler » ; bilan
  sans vente ni client créé. Échoue sur `4afc885b4`, passe sur la branche.

### 3.4 N3 : facture subrogatoire, choix d'un tiers payant après le détail d'une vente

- **Enchaînement :**
  - la liste des tiers payants de `FactureSubrogatoireManager.js:371` appelle `Me.onRechClick()` ;
  - `Me` est une variable globale ;
  - la fenêtre « détail » (`detailProduct.js`), ouverte à 15:49:29 (`details-vente/list`), la réécrit ;
  - après sa fermeture, choisir un tiers payant appelle la recherche d'une fenêtre détruite.
- **Effet :** la liste des factures n'est pas filtrée.
- **Cause :** la même que LE9 (inventaires), sur un autre écran.
- **État :** **confirmé** par lecture du code.
- **Correction (22/11, `bde7896ef`) :** les écouteurs de l'écran (choix du tiers payant, touche Entrée de la recherche)
  gardent leur propre référence à l'écran au lieu de `Me`.
- **Test :** `retours/test-liste-bons-apres-detail.js` (GESTION COURANTE > « Liste des bons ») : recherche d'un mois,
  détail d'une vente ouvert puis fermé, puis choix d'un tiers payant, Entrée avec une référence, et autre tiers payant
  avec le détail encore en mémoire. À chaque fois : la requête part avec le bon filtre, lignes affichées = lignes
  renvoyées, et pour le tiers payant = bons en base ; aucune erreur JavaScript ; bilan sans donnée modifiée. Échoue
  sur `4afc885b4` (5 contrôles, « Cannot read properties of undefined (reading 'getStore') », comme au journal), passe
  sur la branche (7/7).
- **Remarque (examinée le 22/11) : pas d'écart entre la JSP et l'API.**
  - Sur le poste de développement, les JSP lisent la base `capitale` et l'API la base de Payara (`laborex_audit` sur
    domain3) : c'est le montage voulu. J'avais lancé `test-facture-subrogatoire-api.js` avec `DB_JSP=laborex_audit`,
    donc sur deux bases différentes : 7 064 références sur la période dans `capitale`, donc 7 062 affichées par la
    JSP ; 7 110 dans `laborex_audit`, donc 7 108 renvoyées par l'API.
  - Relancé avec `DB_JSP=capitale`, sur les mois identiques dans les deux bases (août et septembre 2026) : **18/18**.
    Pages 1, 2 et dernière, recherche par référence et par nom, tiers payant, plage horaire et période vide donnent
    les mêmes ventes, dans le même ordre et aux mêmes valeurs ; l'écran et le PDF suivent.
  - Les 3 559 ventes d'octobre contre 3 317 affichées : la liste écarte, comme la JSP, les ventes annulées et les
    montants nuls ou négatifs (142 ventes), regroupe par référence, puis applique la règle historique du bon
    identique au précédent. La référence `261001_00649` est une vente annulée : elle est écartée à bon droit.

### 3.5 N4 : SMS envoyés après la suspension

- **Constat :** à 06:48 et 07:19, Prestige annonce « Forfait SMS Orange expiré : envois suspendus ». Pourtant,
  10 envois de notification (jusqu'à 21:20) et 8 envois d'administration (15:51–21:39) partent encore et sont refusés.
- **Lien avec R9 :** le contrat expiré relève de l'officine. La suspension qui ne tient pas est un défaut de
  Prestige ; c'était le point « pause » de R9.
- **État :** **suspecté**, à reproduire sur le chemin d'envoi.
- **Conclusion après analyse (22/11) : pas un défaut.**
  - Le coupe-circuit (`SmsCoupeCircuit`) suspend les envois après 3 refus de suite, pendant 60 minutes, puis laisse
    passer un essai. Il est consulté sur les deux chemins, administration (`sendSMSStatut`) et notifications.
  - Son état est en mémoire : un redémarrage de Payara le remet à zéro. Le 21/11, Payara a redémarré à 06:48, 07:10
    et 07:18 (mise à jour) ; après chacun, il a fallu 3 nouveaux refus pour suspendre.
  - Les autres refus de la journée sont les essais d'une fois par heure après les 60 minutes, comme prévu.
  - **Amélioration possible :** garder la suspension d'un redémarrage à l'autre (en base), pour économiser les 3
    refus après chaque démarrage. À décider ; elle n'est pas urgente.

### 3.6 N5 et N6 : postes et détection

- **N5, DESKTOP-CEPK07B non mis à jour :**
  - il garde la version du 16/11 ;
  - il lance encore la surveillance de la base (alertes en double, R14) ;
  - il présente N1.
- **N6, redémarrages de la mise à jour comptés comme « arrêts brutaux » :** 7 alertes WARN chaque fois qu'on déploie.
  Le détecteur pourrait reconnaître un arrêt suivi d'un démarrage sur une autre version (**suspecté**).

## 4. Ordre proposé pour la suite

1. **Sur site, sans code** (décision de l'utilisateur) :
   - passer `1-configurer-payara.ps1 -PoolSeulement -Redemarrer` sur chaque poste, CAISSE44 en premier ;
   - mettre à jour DESKTOP-CEPK07B.
   - Ces deux gestes mettent fin aux blocages de 2 h, aux clôtures perdues et à la plus grosse part des lenteurs.
2. **Choisir une limite de connexions :** `max-pool-size` des caisses (par exemple 10) ou `max_connections` de MariaDB
   au-dessus de 320. C'est une question pour l'utilisateur ; ensuite, ajout au script et à l'auto-diagnostic, avec
   test.
3. **N2 :** garde de `onBtnCancelClient`. Effet direct en caisse : un message au lieu d'un écran bloqué. **Fait** (`cd7d9233e`).
4. **N1 :** pas d'envoi pour une ligne retirée, et refus clair côté serveur. **Fait** (`536b2c0ea`).
5. **N4 :** suspension des SMS qui tient, à reproduire d'abord. **Analysé : pas un défaut** (§ 3.5).
6. **N3 :** facture subrogatoire sans `Me` global. **Fait** (`bde7896ef`). La revue des autres écrans qui utilisent `Me`
   reste à faire.
7. **Déploiement de `plan/support-1811`** (7 correctifs du 20/11), puis N6 (détecteur d'arrêts) et le point 8
   (mesures : `audit/analyse`, `tableau-bord/bfr`, `top-marges`).

Chaque correction suivra la règle du projet :
- un test d'écran qui échoue d'abord sur `4afc885b4` ;
- un test de rapprochement ;
- un bilan avant / après.
