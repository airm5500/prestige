# Clients assurés et tiers-payants : plan à valider (02/11/2026)

Ce plan fait suite à J5 (rapport du centre de support, § 22). Une vente assurance a planté parce que le client choisi n'avait
aucun tiers-payant. J5 empêche le plantage, mais ne règle pas la cause. **Plan validé le 02/11 ; travail en cours sur `PRES-/support-0211`.**

## 1. Ce que j'ai compris

1. **Règle métier.** Un client assurance n'existe que par son assurance. Un client assuré sans tiers-payant actif n'est
   pas un client assurance. Il ne doit apparaître dans aucune vue : ni dans la recherche des ventes assurance, ni dans les
   listes de clients assurés.
2. **Retrait du tiers-payant principal (validé le 02/11).**
   - S'il ne reste **aucun** tiers-payant actif, le client est désactivé dans la même opération.
   - S'il reste un complémentaire actif, celui-ci devient principal : il passe en priorité 1, sans devenir régime
     obligatoire. Le bouton « Retirer » l'annonce avant la confirmation (« Le complémentaire X deviendra le tiers-payant
     principal »), et la confirmation se fait dans le bouton.
   - Si une partie de l'opération échoue, rien n'est enregistré. On ne laisse jamais un état intermédiaire.
3. **Création.** Un client assuré est créé avec son tiers-payant principal, ou il n'est pas créé.
4. **Lecture.** Une donnée incohérente ne doit plus se traduire par « aucun tiers-payant ». Il faut empêcher ces données
   d'exister, et ne plus masquer l'erreur à la lecture.
5. **Architecture.** Ces opérations passent par l'API REST, plus par les anciennes JSP. On ne supprime pas les JSP, mais
   les écrans ne les appellent plus.
6. **Données déjà en base.** Les clients assurés qui n'ont déjà plus de tiers-payant actif doivent être traités. Rien ne
   sera écrit en production sans ton accord : d'abord une liste en lecture seule.

## 2. Ce que le code montre aujourd'hui

### Comment un client assuré se retrouve sans tiers-payant

| Chemin | Ce qui se passe | Écrans |
|---|---|---|
| Retrait d'un tiers-payant | `tierspayantManagement.delete_compteclt_tierspayant` efface le lien, **sans vérifier qu'il en reste un**, ni que c'était le principal. Le client reste actif et de type « assuré » | Fiche client, « Tiers-payants » (`showclttierspayant.js` → REST `client/gestion/tiers-payants/delete`, qui appelle la même méthode) ; vente, « Tiers-payant » du client (`addTiersPayant.js` → `compteclienttierspayant/ws_transaction_clt.jsp`) ; deux autres JSP (`ws_compteclient_tierspayant_transaction.jsp`, `clienttierspayant/ws_transaction.jsp`) |
| Création dans l'ancienne gestion des clients | `client/ws_transaction.jsp` (mode `create`) passe par `clientManagement.createClient`. Le client est enregistré d'abord (`persiste`). Son compte, son ayant droit et son lien tiers-payant sont créés ensuite, dans un bloc dont les erreurs sont ignorées (`catch (Exception e) {}` vide, sans journal) : un organisme introuvable ou un champ vide laisse un client assuré sans lien, et l'écran affiche quand même un succès. Le mode `createother` crée un client sans aucun tiers-payant, du type choisi | « Clients », « Ajouter » (`configmanagement/client/action/add.js`) |
| Création depuis la vente (REST) | `createClientCarnet` crée le client et son compte, puis le lien. Si le lien échoue avant l'enregistrement (organisme absent, champ vide), l'exception est avalée (`catch` → `return null`) et la transaction **valide quand même** le client sans lien | Vente, « Nouveau client » carnet |
| Changement de carnet (REST) | Le nouveau lien est créé avant que l'ancien soit désactivé, dans la même transaction. **Ce n'est pas un chemin vers un client sans tiers-payant**, contrairement à ce que j'ai écrit plus tôt. Il garde le défaut commun du `catch` qui avale l'erreur | Vente, fiche client |
| Organisme désactivé | La lecture ne vérifie que le lien (`TCompteClientTiersPayant.strSTATUT`), pas l'organisme : un client rattaché à un organisme désactivé paraît assuré | Gestion des tiers-payants |

### Où les vues lisent les clients assurés

- `ClientServiceImpl.findClientAssurance` (recherche de la vente assurance, `client/all`) : tout client actif du type
  demandé, sans condition sur les tiers-payants.
- `findTiersPayantByClientId` : sur n'importe quelle exception (lien vers un organisme absent, par exemple), renvoie une
  **liste vide** au lieu de signaler l'erreur. C'est le troisième chemin vers « client sans tiers-payant ».
- Les autres listes de clients (gestion des clients, choix du client dans d'autres écrans) seront recensées à l'étape 1.

### Ce qui existe déjà

- La désactivation d'un client existe, avec la vue « Clients désactivés » (`ClientDesactiveManager.js`), d'où l'on peut
  réactiver un client.
- La fiche client passe déjà par l'API REST (`client/gestion/...`). Il reste à changer la règle métier qu'elle appelle, et
  l'écran de vente, qui appelle encore une JSP.

## 3. Ce que je propose

| Étape | Contenu | Test qui échoue d'abord |
|---|---|---|
| 1. Recensement | Lister toutes les routes et tous les écrans qui créent, modifient, suppriment ou listent un client assuré ou ses tiers-payants. Résultat : un tableau ajouté à cette notice | — |
| 2. Règle unique côté serveur | Un seul service REST porte la règle : <br>- retirer le dernier tiers-payant actif désactive aussi le client, dans la même transaction ; <br>- retirer le principal quand il reste un complémentaire : ce complémentaire passe en priorité 1 (pas régime obligatoire) ; <br>- retirer un complémentaire ne touche pas au client ; <br>- un échec annule tout (plus de `catch` qui avale l'erreur et valide quand même) | Test unitaire du service, puis tests d'écran : retirer le dernier tiers-payant, le client passe dans « Clients désactivés » ; retirer le principal avec un complémentaire, celui-ci passe en priorité 1 |
| 3. Écrans passés en REST | Fiche client et fenêtre « Tiers-payant » de la vente appellent ce service. Les JSP restent mais ne sont plus appelées. La confirmation se fait dans le bouton lui-même, qui annonce l'effet : « Retirer » → « Confirmer : le client sera désactivé » pour le dernier tiers-payant actif, « Confirmer : X deviendra le tiers-payant principal » quand il reste un complémentaire, « Confirmer le retrait » sinon | Test d'écran par chemin, rejouant les clics |
| 4. Création sûre | Création d'un client assuré (gestion des clients et vente) par le service REST, en une seule transaction : client, compte et tiers-payant principal ensemble, ou rien. Pas de client assuré sans tiers-payant principal | Test d'écran : création avec un organisme refusé, rien n'est créé |
| 5. Lecture sans masquage | `findTiersPayantByClientId` ne transforme plus une erreur en liste vide : l'erreur est journalisée et signalée. Les clients assurés sans lien actif vers un organisme actif sont exclus de la recherche de vente et des listes de clients assurés | Test d'écran : un client sans tiers-payant actif n'apparaît plus dans la recherche |
| 6. Données existantes | Requête **en lecture seule** : clients assurés actifs sans lien actif, et liens vers un organisme absent ou désactivé (comptages seulement, sans colonnes nominatives). Après ton accord, une migration qui désactive ces clients, réversible depuis « Clients désactivés » | Comptage avant et après sur la copie de travail |
| 7. Garde J5 | Gardée en défense, au cas où une donnée incohérente arriverait encore d'ailleurs | Déjà en place (`test-j5-client-sans-tiers-payant.js`) |

Chaque étape : test qui échoue d'abord, correction, tests voisins un par un sur le 9080, commit et push sur `PRES-/support-0211`.

## 4. Étape 1 : recensement (02/11)

Il est fait sur `PRES-/support-0211`, identique à l'intégration au 02/11. « Écran → route → règle métier » ; ✗ marque un
chemin qui peut aujourd'hui laisser un client assuré sans tiers-payant actif, ou le montrer.

### 4.1 Retirer ou désactiver un tiers-payant

| Écran | Route | Règle métier appelée | Constat |
|---|---|---|---|
| Gestion des clients > « Tiers-payants » du client (`showclttierspayant.js`, ouvert depuis `ClientManager` et `ClientDesactiveManager`) | REST `client/gestion/tiers-payants/delete` | `tierspayantManagement.deleteComptecltTierspayant(id)` (rectifié le 02/11 : ce n'est pas `delete_compteclt_tierspayant`) : marque le lien comme supprimé, refuse s'il porte des ventes non réglées, marque aussi supprimés les liens des ventes en attente | ✗ aucun contrôle du dernier lien ni du principal ; aucune promotion du complémentaire. **Corrigé à l'étape 2** |
| Ancien écran de vente (`sm_user/dovente/action/addTiersPayant.js`, fenêtres `addtp`, `addclt`) | JSP `compteclienttierspayant/ws_transaction_clt.jsp?mode=delete` | même méthode | ✗ même défaut. **Écran à confirmer** : ouvert seulement depuis l'ancien flux `sm_user/dovente` |
| Aucun écran trouvé | JSP `client/ws_compteclient_tierspayant_transaction.jsp`, `clienttierspayant/ws_transaction.jsp` et `ws_transaction_vente.jsp` (mode `delete`) | `delete_compteclt_tierspayant(compte, organisme)` | ✗ même défaut ; restent appelables directement |
| Gestion des tiers-payants > activer ou désactiver un organisme | REST `TiersPayantRessource` et JSP `tierspayant/ws_transaction.jsp` | `enableOrDisableTierspayant` | **Déjà la règle voulue en partie** : les liens vers l'organisme passent à `disable`, et le client dont c'était le seul lien est désactivé avec son compte. **Mais** : aucune promotion du complémentaire quand l'organisme était le principal ; ancien gestionnaire de données, sans garantie que tout soit annulé en cas d'échec |
| Vente, changement de carnet ou de régime obligatoire (`VenteCtr` → « Modifier infos client ») | REST `client/add/carnet`, `client/add/assurance`, `update-infos-client/{id}` | `updateClientCarnet`, `changerRo` (ClientServiceImpl) | Le nouveau lien est créé avant que l'ancien soit désactivé, dans la même transaction : pas de client sans lien. Reste le `catch` qui renvoie `null` (étape 2) |

### 4.2 Créer un client assuré ou lui ajouter un tiers-payant

| Écran | Route | Règle métier | Constat |
|---|---|---|---|
| Gestion des clients > « Ajouter » / « Modifier » (`addClientLast.js`) | REST `client/gestion/create`, `gestion/update` | `clientManagement.createClient`, `update2` (ancien gestionnaire) | ✗ le client est enregistré, puis compte, ayant droit et lien dans un `catch {}` vide : client assuré sans lien possible, écran en succès |
| Ancienne fenêtre « Ajouter » (`configmanagement/client/action/add.js`), et `ClientDesactiveManager` (modifier, supprimer, activer, désactiver) | JSP `client/ws_transaction.jsp` (`create`, `update`, `createother`, `delete`, `enable`, `disable`) | mêmes méthodes, plus `createClient` sans tiers-payant (`createother`) | ✗ même défaut ; `createother` crée un client du type choisi **sans aucun tiers-payant**. La vue « Clients désactivés » passe encore entièrement par cette JSP |
| Gestion des clients > « Tiers-payants » > ajouter, modifier | REST `client/gestion/tiers-payants/create`, `create-standard`, `update` (`addclttierspayant.js`) | `create_compteclt_tierspayant`, `createCompteClientTiersPayant`, `updateComptecltTierspayant` | La modification peut changer la priorité ou le régime : à contrôler à l'étape 2 (un principal doit rester) |
| Vente, « Nouveau client » assuré ou carnet (`VenteCtr`, `VenteEnDepotCtr`, `DevisCtr`) | REST `client/add/assurance`, `client/add/carnet` | `updateOrCreateClientAssurance`, `updateCreateClientCarnet` | ✗ `createClientCarnet` : le `catch` avale l'erreur du lien, la transaction valide le client sans lien. `updateOrCreateClientAssurance` : à vérifier de la même façon |
| Vente, ajout d'un tiers-payant (`UpdateVenteClientTpForm.js`) | REST `add-tierspayant/{client}/{type}/{taux}` | `addNewTiersPayantToClient` | Ajout seulement : pas de risque de client sans lien |
| Imports | REST `client/import/*` ; import de ventes (`ImportationVente`, `ImportationVenteDepot`) | `importerClients` (clients **standard** seulement) ; `findOrCreateOneCmpt` | Hors sujet pour la création de clients assurés ; l'import de ventes crée des liens, jamais n'en retire |

### 4.3 Lire et lister les clients assurés

| Écran | Route | Constat |
|---|---|---|
| Vente et vente en dépôt, recherche du client assuré (`RechercheClientAss`) ; devis (`DevisClientGrid`) | REST `client/all` → `findClientAssurance` | ✗ tout client actif du type, sans condition sur les liens. **J5 protège la vente**, pas encore la liste |
| Vente, changement de client (`UpdateVenteClientTpForm`) | REST `client/bytype/{type}` → `findClientAssurance` | ✗ même requête |
| Gestion des clients (`ClientManager`) | REST `client/gestion` | Liste de gestion : elle doit continuer de montrer un client pour qu'on puisse le corriger, mais un client désactivé passe dans « Clients désactivés » |
| Notifications, ordonnances | REST `client/list` → `fetchClients` | Tous types confondus : pas une vue « assurance » |
| Toutes les vues ci-dessus | `findTiersPayantByClientId` | ✗ toute erreur (lien vers un organisme absent, etc.) donne une liste vide ; et le statut de l'**organisme** n'est pas vérifié, seulement celui du lien |

### 4.4 Ce que cela change au plan

- **Étape 2** : la règle unique remplace `delete_compteclt_tierspayant` pour **tous** les retraits (fiche client, JSP restantes,
  désactivation d'un organisme). La désactivation d'un organisme fait déjà la désactivation du client ; il faut y ajouter la
  promotion du complémentaire et l'annulation complète en cas d'échec.
- **Étape 3** : écrans à passer en REST : « Clients désactivés » (`ClientDesactiveManager`, entièrement en JSP) et, s'il est
  encore au menu, l'ancien écran de vente `sm_user/dovente`. La fiche client est déjà en REST : seul son bouton change.
- **Étape 4** : création à reprendre dans `clientManagement.createClient` (appelé par REST et JSP), `createClientCarnet` et
  `updateOrCreateClientAssurance` ; supprimer la possibilité `createother` pour un type assuré.
- **Étape 5** : filtrer `findClientAssurance` (utilisé par `client/all` et `client/bytype`) sur « au moins un lien actif vers
  un organisme actif ».

### 4.5 Étape 2 : fait (02/11)

- **Règle** : `rest.service.impl.client.RetraitTiersPayant` décide de l'effet d'un retrait (dernier lien : client
  désactivé ; principal retiré : le complémentaire de plus petite priorité passe en priorité 1, sans devenir régime
  obligatoire ; complémentaire : rien d'autre). Le principal est le régime obligatoire actif, sinon la priorité 1.
- **Écriture** : `ClientServiceImpl.retirerTiersPayant`, en une seule transaction et sans `catch` qui avale l'erreur :
  refus si des ventes non réglées utilisent le lien (même contrôle qu'avant), liens des ventes en attente marqués
  supprimés comme avant, puis promotion ou désactivation du client et de son compte. Toute erreur annule tout ; l'écran
  affiche alors « rien n'a été modifié ».
- **Routes** : `client/gestion/tiers-payants/delete` appelle ce service ; `client/gestion/tiers-payants/effet-retrait`
  (lecture seule) donne l'effet à annoncer dans le bouton (étape 3).
- **Défaut trouvé en chemin** : « Ajouter un tiers payant au client » (fiche client, `addclttierspayant.js`) chargeait
  ses organismes depuis `tierspayant/ws_data.jsp`, supprimée le 04/12/2024 : la liste restait vide (404) et l'on ne
  pouvait plus ajouter de tiers-payant depuis la fiche. Elle lit maintenant `client/tiers-payants` (REST) ; la valeur
  envoyée reste le nom de l'organisme, comme avant.
- **Tests** : `RetraitTiersPayantTest` (7 cas) ; `src/test/e2e/client/test-retrait-tiers-payant.js` par les vues
  (création des clients d'essai par « Créer », ajout du second tiers-payant, retrait confirmé dans l'icône, contrôle de
  la liste et de « Désactivés », suppression des clients d'essai par l'icône « Supprimer »). Sur le code d'avant : 5
  contrôles en échec (pas de promotion, client sans tiers-payant toujours actif) ; après : 12/12. J5 : 3/3.
- **Suite (05780b06)** : les JSP de retrait restantes (§ 4.1, lignes 2 et 3) appellent `delete_compteclt_tierspayant`
  et `deleteComptecltTierspayant`, qui délèguent maintenant au même service (une JSP effaçait encore le lien
  physiquement : il est désormais marqué supprimé). La désactivation d'un organisme (`enableOrDisableTierspayant`)
  promeut le complémentaire quand l'organisme était le principal ; organisme, liens et clients sont enregistrés dans la
  même validation. À la réactivation de l'organisme, le complémentaire promu reste principal.
- **Test d'écran** `src/test/e2e/client/test-desactivation-organisme.js` : organisme d'essai créé par « Créer » (ou
  réactivé), deux clients, désactivation par l'icône : 10/10. L'organisme d'essai reste désactivé en base (l'écran ne
  supprime pas un organisme qui a eu des clients) ; il est réutilisé au passage suivant. Son nom complet est doublé
  (« … RETRAITZE2E ORGANISME RETRAIT ») : le champ « Nom » de la fiche organisme se recopie dans « Nom complet », et la
  première version du test a saisi les deux. Ce test n'a pas été passé sur le code d'avant la correction.

### 4.6 Étape 3 : fait (02/11)

- **Bouton « Retirer » de la fiche client** : il lit l'effet (`effet-retrait`) avant de demander confirmation, et
  l'annonce dans l'icône même : « Confirmer : le client sera désactivé » (dernier tiers-payant), « Confirmer : X
  deviendra le tiers-payant principal » (complémentaire promu), sinon « Confirmer le retrait ». Un retrait refusé
  (ventes non réglées) est dit tout de suite, sans proposer de confirmer.
- **Réactivation** (`enableOrDisableClient`, depuis « Clients » comme depuis « Clients désactivés ») : refusée pour un
  client assuré ou carnet sans tiers-payant actif chez un organisme actif ; le message dit d'en ajouter un d'abord. S'il
  en a mais qu'aucun n'est principal (données anciennes), celui de plus petite priorité passe en priorité 1.
- **Choix fait par défaut** : un client désactivé peut recevoir un tiers-payant (sinon, désactivé faute de
  tiers-payant, il ne pouvait plus revenir). La fiche d'un client désactivé montre ses tiers-payants actifs. Un client
  supprimé reste exclu.
- **« Clients désactivés »** : liste, activation, désactivation et suppression passent par l'API REST. Restent en JSP :
  la modification directe dans la grille (la route REST équivalente a d'autres valeurs par défaut et risquait de toucher
  aux tiers-payants : une route dédiée viendra), l'impression, l'import et les exports.
- **Ancienne fenêtre de tiers-payants de la vente** : son retrait passe par la même route REST que la fiche client.
- **Tests (domain2, `laborex_perf`)** : `test-retrait-tiers-payant.js` étendu (textes des boutons, refus de réactivation
  par les deux écrans, ajout au client désactivé, réactivation) : en échec sur la version d'avant, 19/19 après ;
  `test-desactivation-organisme.js` 10/10 ; J5 3/3.

### 4.7 Étape 4 : fait (02/11)

- **Défaut reproduit** : l'organisme choisi est désactivé (par un autre poste) entre le choix et « Enregistrer ».
  - Gestion des clients : le client et son compte étaient enregistrés **sans tiers-payant**, l'écran annonçait le succès.
  - Vente (« nouveau client » assurance) : le client était créé **sur l'organisme désactivé**.
- **Gestion des clients** (`clientManagement.createClient`, appelé par la route REST et la JSP) : pour un client
  assurance ou carnet, l'organisme doit être actif, sinon refus avant toute écriture. Client, compte, ayant droit et
  tiers-payant sont enregistrés dans **une seule validation** (mode « transaction groupée » de l'ancien gestionnaire) :
  un lien non créé annule tout. Les autres types de client gardent leur comportement.
- **Création sans tiers-payant** (`createother`, ancienne JSP) : refusée pour un type assurance ou carnet ; le seul
  écran qui l'appelle crée des clients de rétrocession, non concernés.
- **Vente** (`updateOrCreateClientAssurance`, `updateCreateClientCarnet`) : organisme désactivé refusé à la création ;
  une erreur annule toute la transaction (avant : l'erreur était avalée et ce qui avait été écrit était validé).
- **Test d'écran** `src/test/e2e/client/test-creation-client-assure.js`, deux onglets du même compte : « Créer » rempli
  en A, organisme désactivé en B, « Enregistrer » en A ; même course depuis la vente ; puis création normale (client avec
  son principal). Version d'avant : 2/7 ; après : 9/9. Voisins : retrait 19/19, organisme 10/10, J5 3/3.
- **Non couvert par un test d'écran** : l'annulation après un échec du lien lui-même (organisme actif). Aucun geste
  d'écran ne la provoque ; elle est assurée par la validation unique. La création normale depuis la vente n'est pas
  rejouée : les tests existants de ce chemin préparent leurs données par SQL.

### 4.8 Étape 5 : fait (02/11)

- **Recherche de la vente, de la vente en dépôt et du devis** (`findClientAssurance`, routes `client/all` et
  `client/bytype`) : un client assurance ou carnet n'est proposé que s'il a un tiers-payant actif chez un organisme
  actif. Les autres types ne sont pas concernés.
- **Tiers-payants d'un client** (`findTiersPayantByClientId`) : seuls les liens vers un organisme actif sont rendus.
- **Erreurs de lecture** : elles ne deviennent plus une liste vide (« aucun client », « aucun tiers-payant »). Elles
  remontent au gestionnaire global de l'API, qui les journalise au Centre de support ; la vente, la vente en dépôt et
  le devis affichent « La recherche du client a échoué » au lieu de fermer la recherche en silence.
- **Défaut non reproductible par l'écran** : après les étapes 2 à 4, je n'ai trouvé aucun geste qui laisse un client
  assuré actif sans tiers-payant actif ; il n'en reste que dans des données anciennes (l'étape 6 les comptera). Pistes
  écartées : la modification en grille de « Clients désactivés » n'a plus d'éditeur ; « Modifier » sur un client
  désactivé dont l'organisme est désactivé échoue (voir ci-dessous) sans le réactiver.
- **Test d'écran** `src/test/e2e/client/test-recherche-client-sans-tp.js` (non-régression) : client créé sur
  l'organisme d'essai, organisme désactivé, la vente « Assurance » ne propose pas le client. Gestes partagés avec le
  test de l'étape 4 dans `src/test/e2e/client/outils-clients.js`.
- **Constats hors périmètre** :
  - « Modifier » puis « Enregistrer » sur un client sans tiers-payant principal actif répond une erreur technique
    (« Cannot invoke … commit() … is null », `clientManagement.update2`) ;
  - une création de client a été refusée une fois pour « code interne existe déjà », sans code saisi (le passage
    suivant a réussi).

### 4.9 Étape 6 : comptages (02/11) et reprise (03/11)

- **Comptage en lecture seule** : deux contrôles de cohérence du support, en observation (aucun ticket, aucune
  correction), migration `V7.2.30.40__controle_clients_assures_sans_tp.sql` :
  - `CLIENT_ASSURE_SANS_TP_ACTIF` : client assurance ou carnet actif sans lien actif vers un organisme actif ;
  - `LIEN_TP_ORGANISME_INACTIF` : lien client / tiers-payant actif dont l'organisme est absent ou inactif.
  Ils ne lisent que des identifiants techniques et des statuts, aucune colonne nominative. Ils tournent avec les
  autres contrôles (planificateur, ou CENTRE DE SUPPORT > Santé application, « Lancer les contrôles de cohérence ») ;
  le détail est dans Diagnostic & bugs (type COHERENCE, module CLIENT).
- **Numéro de migration** : V7.2.31 et V7.2.32 sont pris sur d'autres branches, d'où V7.2.30.40 (Flyway accepte
  l'ordre décalé).
- **Test d'écran** `src/test/e2e/client/test-comptage-clients-assures.js` : 2/4 avant (contrôles absents), 4/4 après.
- **Comptages sur le banc (domain2, `laborex_perf`)** : 1 client assuré actif sans tiers-payant actif, 0 lien actif
  sur un organisme absent ou inactif. À relever sur la base de l'officine par le même bouton.
- **Reprise (accord du 03/11)** : migration `V7.2.30.41__reprise_clients_assures_sans_tp.sql`, même effet que la
  désactivation d'un organisme, rien n'est supprimé :
  1. lien actif vers un organisme absent ou inactif : désactivé (il revient si l'organisme est réactivé) ;
  2. client qui garde des liens actifs sans principal (ni régime obligatoire, ni priorité 1) : celui de plus petite
     priorité passe en priorité 1, sans devenir régime obligatoire ;
  3. client assuré ou carnet actif sans lien actif vers un organisme actif : désactivé avec son compte. Il revient par
     « Clients désactivés » une fois un tiers-payant actif ajouté (étape 3).
- **Test** : `test-comptage-clients-assures.js` vérifie aussi qu'aucun cas ne reste : 5/6 avant la reprise (1 client),
  6/6 après. Sur le banc, aucun lien n'était concerné : les points 1 et 2 ont tourné sans cas (aucun chemin d'écran ne
  produit plus cet état). Tests clients relancés un par un après la reprise (voir le commit).
- **En officine** : contrôles et reprise arrivent dans le même déploiement ; la reprise passe au démarrage, avant le
  premier contrôle, qui doit donc trouver 0 et 0. Les clients repris apparaissent dans « Clients désactivés ». Pour
  connaître leur nombre avant la reprise, déployer d'abord une version qui ne contient que V7.2.30.40.
- **Incident de banc** : le redéploiement sur domain2 a saturé la mémoire du serveur (tas plein après de nombreux
  redéploiements, sans lien avec la migration) ; domain2 a été arrêté de force puis redémarré, domain1 n'a pas bougé.

## 5. Questions tranchées (02/11)

1. **Tiers-payant « principal ».** Je le définis comme le régime obligatoire (`bISRO`) ou, s'il n'y en a pas, le lien de
   priorité 1. **Validé.** Pour un client « carnet », le carnet est son seul tiers-payant : son retrait désactive le
   client.
2. **Principal retiré, complémentaire restant : tranché le 02/11.** Le complémentaire restant devient principal
   (priorité 1, pas régime obligatoire), annoncé dans le bouton « Retirer ». Le client n'est désactivé que s'il ne lui
   reste aucun tiers-payant actif.
3. **Réactivation.** Réactiver un client depuis « Clients désactivés » doit-il exiger d'abord un tiers-payant principal
   actif ? **Oui, validé.**
4. **Données existantes (étape 6).** Je te soumets d'abord les comptages, et la migration n'est écrite qu'après ton accord.
   **Validé.**
