# Anomalies du centre de support : étude du 26/10/2026

Ce rapport étudie, sans rien corriger, les signalements du centre de support de la copie `laborex_v1_db`. Il donne pour
chaque anomalie son statut, sa cause, une reproduction et un correctif proposé.

- **Branche** : `PRES-/anomalies-support-954194`, issue de `claude/new-session-xm8ptu` (31622a33). Comparée à
  `PRES-/audits-code-dffa0a`.
- **Scripts joints** : `src/test/e2e/support/anomalies-centre/` (procédures en annexe A).

## Synthèse

Les 41 tickets et les 144 familles d'événements se ramènent à **92 anomalies**, classées de § 4 à § 13.

| Statut | Nombre | Remarque |
|---|---|---|
| Traité (en tout ou en partie), avec le commit | 34 | Dont 12 confirmés par un essai sur la version 31622a33 |
| Reproduit sur la version actuelle | 7 | Dont R1, reproduit par l'essai de la branche d'audit |
| Prouvé par le code ou par les données, essai non joué | 32 | Essai impossible sans écrire de données, ou sans lecture SQL |
| Peut-être traité | 2 | J6, P2 |
| Hypothèse | 14 | |
| Non reproduit | 3 | SC6 (normal), J16, L1 isolé |

Le chemin supposé pour **V3** (`IllegalArgumentException` au message vide en vente) est **réfuté** par l'essai : ce cas
est déjà traité par `974976e0`.

**À traiter en premier (P1)** :

1. **V2** : l'adresse du client est copiée dans le téléphone de la vente (20 caractères). Une adresse longue fait échouer
   l'ajout en vente assurance, et aussi la **clôture comptant**. Il y a 7 endroits à corriger.
2. **M1** : le forfait SMS Orange est épuisé. C'est une question métier, pas de code.
3. **S1** : faux « redémarrages inattendus » (149 événements), dus à l'extinction des postes le soir. Ce bruit cache
   les vraies coupures.
4. **L1** : la cloche « Ventes en avoir » relit la liste complète toutes les 60 s sur chaque poste (733 lenteurs).

**Défauts reproduits, à corriger ensuite (P2-P3)** :

- P1 : `monitoringproduct` sans dates, 500 ;
- L5 : `details-vente` sans vente, 18 s ;
- J3 : « Annuler » de l'import de commande ;
- C5 : prix de BL avec un champ vide, 500 ;
- A4 : texte dans un filtre entier, 404 ;
- A1 : code « .. », 404 ;
- R1 : clé de mouvement des retours carnet.

**Centre de support lui-même** :

- **Tickets en double** (SC1) : le doublon est prouvé par les données.
- **Moniteurs exécutés sur chaque caisse** (SC3).
- **Version des postes inconnue** (SC8) : 25 tickets portent sur des défauts corrigés et restent ouverts.
- **Données de test laissées** par deux tests (SC5).

## 1. Ce qui a été lu

Les signalements ont été lus le 26/10 à 01 h 11, par les API de l'écran, avec le compte super administrateur `e2e-sa`.
Le script est `lire-signalements.js` ; il n'écrit rien.

| Source (écran) | Table | Nombre |
|---|---|---|
| Me contacter | `t_support_demande` | **0** demande |
| Tickets | `t_support_ticket` | **41** tickets automatiques (`BUG_AUTO`), tous `NOUVEAU` |
| Journal des événements | `t_application_event` | **473** événements, en **144 familles** (même module, type et message) |
| Récapitulatif | (vue) | 23 groupes module × type × niveau |
| Contrôles de cohérence | `t_support_controle` | 21 contrôles définis ; 5 ont des cas |

Colonnes nominatives :

- Aucune colonne nominative de client, d'ayant droit ou d'ordonnance n'a été lue.
- Les événements contiennent des noms d'**employés** : utilisateur constaté, et message de `CaisseNotFoundExeception`.
  Ils n'apparaissent pas dans ce rapport.
- Trois vérifications portent sur des données nominatives et attendent ton accord : V2, C3 (b) et J14. Elles sont
  signalées dans les tableaux.

Limites de l'étude :

- **Pas de pile complète pour l'officine.** Les fichiers de détail cités par les événements sont sur les postes de
  l'officine (`C:\Users\CAISSE…`, `C:\Users\DELL…`, `C:\Users\Dr…`), pas sur ce poste. On dispose seulement du message,
  de l'URL, d'un extrait de pile pour une partie des événements, et des 13 fichiers écrits par ce poste les 25 et 26/10.
- **Pas d'accès SQL direct dans cette session.** La lecture du mot de passe MariaDB a été refusée par les permissions.
  Les requêtes de vérification sont donc **fournies mais pas jouées** (annexe B).
- **Origine des événements.** Ceux du 25 et du 26/10 viennent en grande partie de ce poste : tests `e2e`, `admin`,
  dossier `D:\prestige\support\logs`. Ils sont repérés dans les tableaux.

## 2. Constats transverses (à lire en premier)

1. **Chaque caisse fait tourner son propre Payara sur la base centrale.**
   - Le code le dit : `job/SupportPoolMonitor.java:367`, `job/SupportClotureMonitor.java:117`. Les événements le
     confirment (« IP 127.0.0.1 - poste CAISSE31 », tas de 512 Mo et de 4096 Mo).
   - Sept moniteurs du support ne testent pas `isServerMode()` et tournent donc sur chaque poste : `SupportWatchdog`,
     `SupportJobMonitor`, `SupportCoherenceScheduler`, `SupportPurgeScheduler`, `SupportNightlyCatchUp`,
     `SupportPreflight`, `SupportResourceMonitor`.
   - Leurs clés d'événement ne contiennent pas le poste : les occurrences sont multipliées par le nombre de postes
     allumés.
2. **Les postes n'ont pas tous la même version.**
   - Plusieurs événements apparaissent après leur correctif. Le numéro de ligne JS signalé correspond alors à une
     version plus ancienne du fichier, par exemple `VenteCtr.js:3879` le 09/09, qui est la version du 13/08.
   - Causes possibles : mise à jour tardive des caisses, et cache de 24 h des fichiers statiques
     (`filter/StaticResourceCacheFilter.java:29`).
   - **Une apparition après un commit ne prouve donc pas que le correctif a échoué.** Il faudrait journaliser la
     version déployée dans chaque événement.
3. **Les tickets automatiques sont tous `NOUVEAU`.** Personne ne les traite.
   - 25 portent sur des défauts déjà corrigés et peuvent être clôturés après déploiement sur tous les postes.
   - 2 viennent de tests.
   - La liste est en annexe C.

## 3. Légende

- **Statut** :
  - **Traité** : corrigé, avec le commit et la preuve ;
  - **Reproduit** : un essai montre le défaut sur la version actuelle ;
  - **Prouvé par le code** : le chemin est sans ambiguïté, mais l'essai n'a pas été joué ;
  - **Non reproduit** ;
  - **Hypothèse**.
- **Priorité** :
  - **P1** : gêne au comptoir ou très fréquent ;
  - **P2** : gêne réelle mais rare, ou arrière-boutique ;
  - **P3** : bruit ou anecdotique ;
  - **P4** : à surveiller.
- **Essai** : identifiant du cas dans `reproduire-api.js` (annexe A).

## 4. Centre de support lui-même

| N° | Résumé | Module | Statut | Cause | Reproduction | Correctif proposé (risque) | Prio. |
|---|---|---|---|---|---|---|---|
| SC1 | **Tickets en double** : 6 événements ont chacun 2 tickets créés à la même seconde (12 tickets, ex. `TCK-20260814-1A953FCF` et `-B45412BF`) | Support | Traité en partie : `4943d90d` (10/10). Un doublon du 17/10 vient d'un poste pas à jour (hypothèse) | Course entre deux `record` asynchrones du même défaut (`SupportEventServiceImpl.java:72-94`, `applyAutoTicket` `:713-739`). Les deux lisent `ticket_id` vide et créent chacun un ticket ; aucune contrainte d'unicité | **Constat prouvé par les données** : pour chacun des 6 événements, `ticket_id` ne désigne qu'un des deux tickets. L'autre est orphelin : `TCK-20260814-1A953FCF`, `20260818-56D969A7`, `20260818-F51026A6`, `20260825-BF3ACB76`, `20260831-C0EB7857`, `20261017-57D7E196`. Essai : `SUPPORT_AUTO_TICKET_SEUIL=1`, puis 10 appels simultanés en échec, puis requête B.1 | Réserver le ticket par `UPDATE … SET ticket_id=? WHERE id=? AND ticket_id IS NULL` avant de le créer (risque très faible) | P2 |
| SC2 | Chaque blocage donne un ticket **CRITIQUE** dès la 1re occurrence (10 tickets) | Support | Prouvé par le code (comportement voulu) | `filter/BlocageWatchdog.java:76-93` classe FATAL toute requête de plus de 20 s ; un FATAL donne un ticket immédiat (`SupportEventServiceImpl.java:727-730`) | Lecture des tickets `BLOCAGE` | ERROR de 20 à 120 s (le seuil de 5 occurrences s'applique alors), FATAL au-delà (faible) | P3 |
| SC3 | **Occurrences multipliées par le nombre de postes** (jobs en retard, mémoire, préflight, cohérence) | Support | Prouvé par le code | Moniteurs exécutés sur chaque Payara de caisse, avec une clé sans nom de poste (constat 2.1) | Le 15/10 à 11 h 10 : « veilleur en retard », 5 occurrences dans la même minute | Ne lancer ces moniteurs que si `isServerMode()`, avec un repli si aucun poste serveur n'a signé depuis 24 h (moyen : une officine sans poste serveur perdrait sa surveillance) | P2 |
| SC4 | Diagnostic « Suggestion lente à l'ouverture : index manquant » rattaché à `suggestion-reserve` (8 occurrences) | Support | Prouvé par le code | `rest/DiagnosticSuggestionLente.java:70` teste `contains("/api/v1/suggestion")`, ce qui attrape aussi `suggestion-reserve`. Le constat sur l'index est juste : `idx_tpd_famille_date` (V7.1.8) manquait en officine au 18/10 | Requête B.2 (index) | Tester le préfixe `/api/v1/suggestion/` ; vérifier V7.1.8 en officine (faible) | P3 |
| SC5 | **Données de test restées au centre de support** : ticket `TCK-20261025-73302D5E` (« Erreur simultanée E2E »), PERFORMANCE `app-params/update` et `vente/ticket/vo`, 404 `mobile/catalogue-essai` | Tests | Prouvé par le code | `src/test/e2e/retours/test-lot-c-surveillance.js` : `nettoyer()` (l. 30) retire TICKET et BLOCAGE mais pas PERFORMANCE. `securite/test-sessions.js:55` appelle une ressource inexistante : il reçoit 404 au lieu du 401 attendu et ne teste donc plus rien | Lecture des événements du 25-26/10 (utilisateur e2e) | Compléter le nettoyage ; viser une ressource mobile réelle dans `test-sessions.js` (nul) | P3 |
| SC6 | « Me contacter » : liste vide | Support | Non reproduit : comportement normal | La table n'est remplie que par le formulaire (`SupportContactServlet.java:64`), sans filtre ni purge : personne n'a écrit | `GET support/demandes` → `total:0` | Aucun | — |
| SC7 | Le message de `CaisseNotFoundExeception` contient **le nom de l'employé**, qui part dans les journaux et dans les événements | Billetage | Prouvé par le code | `BilletageServiceImpl.java:168` | Lecture des événements BILLETAGE | Retirer le nom, garder l'identifiant (nul) | P3 |
| SC8 | Version déployée inconnue par poste : les signalements postérieurs aux correctifs sont ininterprétables | Support | Prouvé (numéros de ligne JS, constat 2.2) | Ni la version ni le commit ne sont joints à l'événement | — | Joindre la version (commit) et le poste à chaque événement (nul) | P2 |

## 5. Vente

| N° | Résumé | Module | Statut | Cause | Reproduction | Correctif proposé (risque) | Prio. |
|---|---|---|---|---|---|---|---|
| V1 | `TransientPropertyValueException … TPreenreg` sur `vente/add/assurance` et `add/vno` (70 occ., 17/08 → 22/10 ; 4 tickets ; + Ajax 500) | VENTE | **Traité** : `d0c4092c` (23/10) | Le vendeur tapé sans être choisi partait comme `new TUser(id)`, absent de la base ; refus au commit | Test existant `src/test/e2e/journal/test-vente-vendeur-saisi.js` | En place : le vendeur est lu en base ; inconnu, la caissière est retenue | — |
| V2 | **`Data too long for column 'str_PHONE_CUSTOME'`** sur `add/assurance` et `PUT vente/client/{id}` (19 occ., 17/10 ; 2 tickets) | VENTE | Prouvé par le code (essai non joué : il faut un client de test à longue adresse) | L'**adresse** du client (50 car.) est copiée dans le **téléphone** de la vente (20 car.) : `SalesServiceImpl.java:1082`, `:4210`. Même défaut à `:2665`, `:2675` (clôture assurance), `:2937` (**clôture comptant**), `:4710`, `:5528` et `ClientServiceImpl.java:123`. `351ef6bc` n'en a corrigé qu'un | Écran : client assuré de test avec une adresse de 30 caractères, vente assurance, ajout d'un produit → 500. Comptage `t_client` soumis à ton accord (nominatif, B.3) | Remplacer `getStrADRESSE()` par `getStrTELEPHONE()` aux 7 endroits, en coupant à 20 car. (faible : aucun écran ni état ne lit cette colonne) | **P1** |
| V3 | `IllegalArgumentException` au message vide sur `vente/add/item` et `net/assurance` (16 occ., 23/08 → 17/10 ; ticket `20260901-693D2EAA` ; + Ajax 500) | VENTE | **Traité** : `974976e0` (23/10). Prouvé par les essais V2a à V2g : 400 « Données envoyées illisibles » ou « Valeur saisie invalide », sans événement | Un `null` ou un texte vide dans un champ primitif (`taux`, `qte`, `devis`, `cmu`) fait échouer la lecture du corps. Yasson lève une `JsonbException` dont la cause est une `IllegalArgumentException` sans message ; l'événement affichait cette cause, d'où le message vide. Déclencheur probable à l'écran : taux vide, `parseInt` donne `NaN`, envoyé `null` (`VenteCtr.js:7120`) (hypothèse). Dernière apparition le 17/10, avant le correctif | `reproduire-api.js`, cas V2a à V2g (V2g : contre-épreuve, la méthode est atteinte) | En place côté serveur. Écran : refuser un taux vide plutôt que d'envoyer `null` (nul) | — |
| V4 | `JsonbException … Integer` sur `update/item/vno` (1 occ., 03/09) | VENTE | **Traité** : `974976e0` (23/10), `c6469deb` (25/10). Essai V3 : 400 « Valeur saisie invalide pour « qte » » | Quantité décimale dans un champ entier | Cas V3 ; test existant `journal/test-vente-quantite-decimale.js` | En place | — |
| V5 | Clé étrangère `hmvtproduit` sur `remove/vno/item` (18 occ., 18/08 → 03/09 ; 2 tickets) | VENTE | **Traité** : `3254e207` (05/09) | Retrait d'une ligne d'une vente déjà clôturée | Lecture B.4, puis `POST vente/remove/vno/item/<id>` → `success:false` | En place : `controleRetraitLigne` refuse | — |
| V6 | `NullPointerException` sur `vente/ticket/vno/{id}` (12 occ., 31/08 → 09/09 ; 2 tickets) | VENTE | **Traité** : `c9ad2f0d` (03/09). **5 ventes restent à régulariser** (données) | La clôture en erreur était validée sans mouvement de caisse ; le ticket lisait ce mouvement absent. Les 4 ventes en cause figurent dans le contrôle « vente terminée sans mouvement de caisse » (H4) | Requête B.5, puis `POST vente/ticket/vno/<id>` → `success:false` | En place pour le code ; régulariser les 5 ventes après accord (données) | P2 |
| V7 | `Duplicate entry … 'pkey_unq'` sur `cloturer/vno` (1 occ., 24/08) | VENTE | **Traité** : `913f6aa5` (23/08), `4bbea8c4` (01/09) | Double clôture simultanée de la même vente | Deux `cloturer/vno` simultanés sur une vente de test, puis `COUNT(*)` de `mvttransaction` = 1 | En place : verrou `FOR UPDATE` et réponse idempotente | — |
| V8 | `Deadlock found when trying to get lock` sur `cloturer/vno` (1 occ., 07/10) | VENTE | Hypothèse | Probable : deux ventes différentes avec les mêmes produits mises à jour dans un ordre inverse (`getItems` sans `ORDER BY`, `SalesServiceImpl.java:901`) | Deux ventes, l'une P1 + P2, l'autre P2 + P1, clôturées ensemble en boucle ; `SHOW ENGINE INNODB STATUS` | Trier les lignes par produit avant la mise à jour du stock (faible) | P3 |

## 6. Caisse, billetage, ventes ratées

| N° | Résumé | Module | Statut | Cause | Reproduction | Correctif proposé (risque) | Prio. |
|---|---|---|---|---|---|---|---|
| K1 | `CaisseUsingExeception` sur `ouvrir-caisse` (25 occ., 14/08 → 10/09 ; 2 tickets ; + Ajax 500, ticket `20260818-59A63EA1`) | CAISSE | **Traité** : `3254e207` (05/09) | Exception métier non déclarée `@ApplicationException` : erreur 500 au lieu d'un message | `POST caisse/ouvrir-caisse` sur une caisse déjà ouverte → 200, `success:false`. Non joué : l'appel ouvrirait la caisse si elle était fermée | En place | — |
| K2 | `CaisseNotFoundExeception` sur `billetage/cloture-data` (9 occ., 24/08 → 22/10 ; ticket Ajax `20260921-35CC1438`) | BILLETAGE | **Traité** : `2575c3a0` (07/10), `38ba4d65` (09/10). Essai B1 : 200 « Aucune caisse ouverte à votre nom » | Écran de clôture ouvert sans caisse ouverte ; l'exception traversait l'EJB enveloppée | Cas B1 ; test unitaire `CaisseNotFoundExeceptionTest` | En place (voir aussi SC7) | — |
| K3 | `UnknownHostException : serveur` et `XAException` sur `ventes-ratees/compteur-jour` (5 occ., 29/09 → 20/10) | VENTES-RATÉES | Prouvé par les piles : réglage, pas défaut de code | Le pool désigne la base par le nom « serveur », non résolu, et ne valide pas ses connexions. Le compteur, appelé à intervalle régulier, est simplement le premier à échouer | Écran « Stabilité du serveur » du poste | Réglages du pool (IP fixe, `is-connection-validation-required`, `fail-all-connections`) ; en option, compteur silencieux en cas d'échec (nul) | P2 |

## 7. Commandes, produits, retours carnet

| N° | Résumé | Module | Statut | Cause | Reproduction | Correctif proposé (risque) | Prio. |
|---|---|---|---|---|---|---|---|
| C1 | `JsonbException … Integer` sur `commande/bon/items/checked-quantities` (5 occ., 03/09 → 16/09 ; ticket `20260916-7D31A090`) | COMMANDE | **Traité** côté serveur : `974976e0` (23/10). Essai C1 : 400 « … un nombre entier est attendu » | L'application mobile envoie une quantité non entière (décimale, vide ou code-barres) | Cas C1 | En place (400). Côté mobile : clavier numérique entier et contrôle avant envoi | P3 |
| C2 | `TimeoutException`, et **blocage de 28 s**, sur la même URL (05/10 ; ticket `20261005-5CEFB272`) | COMMANDE | Prouvé par la pile | Le serveur attendait un corps que le client mobile n'a jamais fini d'envoyer (Wi-Fi). Ni verrou ni pool | Socket brute : annoncer `Content-Length: 200`, envoyer 15 octets, attendre 60 s. Non joué : l'essai crée un blocage et un ticket | 408 sans événement ERROR quand la lecture du corps expire ; détecteur de blocage qui ignore ces fils (faible) | P3 |
| C3 | `NullPointerException` au message vide sur `commande/item/add` (4 occ., 27/08 ; + Ajax 500) | COMMANDE | Prouvé par le code : deux chemins possibles (celui du 27/08 = hypothèse) | (a) répartiteur tapé sans être choisi : grossiste introuvable, NPE à `OrderServiceImpl.java:1181` ; (b) `t_famille_grossiste.int_PAF` NULL : déballage à `:1208` et `:1224` | (a) `POST commande/item/add` avec un `grossisteId` inconnu (transaction annulée) ; (b) requête B.6 | Refus lisible si le grossiste est introuvable ; PAF de repli ; `forceSelection` sur la liste (faible) | P2 |
| C4 | `IllegalArgumentException … delete event with null entity` sur `DELETE commande/order/{id}` (16/10) | COMMANDE | **Traité** : `f23f4e26` (17/10). Essai C4 : 200, aucun événement | Double envoi de la suppression | Cas C4 ; test existant `journal/test-suppression-commande-double.js` | En place | — |
| C5 | Ajax 500 sur `ws_transaction.jsp?mode=modifproductprice` (25/08), suivi de l'erreur JS `Ext.JSON.decode` (J19) | COMMANDE (BL) | **Reproduit** (essai F1 : 500, page d'erreur HTML de Payara) | `Integer.parseInt` hors `try` sur les 4 prix (JSP, l. 47-56). Les champs PAF et PA tarif de `editprice.js` peuvent rester vides | Cas F1 | Champs numériques obligatoires à l'écran ; à terme, route REST (pas de nouvelle JSP) (faible) | P3 |
| P1 | **`NullPointerException : text`** sur `produit/monitoringproduct` et `-complet` (18 occ., 24/08 → 26/09 ; ticket `20260824-BF981EA1` ; + Ajax 500 `20260824-566C65F4`) | PRODUIT | **Reproduit** (essai P1 : 500, l'événement « NullPointerException : text » passe de 14 à 15 occurrences) | `LocalDate.parse(null)` (`ProduitRessource.java:351`, `:268`). Les dates manquent parce que « Actualiser » ou un changement de page recharge le magasin sans paramètres : `beforechange` est déclaré comme propriété et non dans `listeners` (`MvtArticleCtr.js:631`, `MvtArticleCompletCtr.js:881`, `FamilleManager.js:3411`) | Cas P1. Écran : « Suivi mouvement article », détail d'une ligne, puis « Actualiser » | Paramètres en `extraParams` du proxy ; côté serveur, 400 « période manquante » (faible) | P2 |
| P2 | `TransactionRolledbackLocalException` sur `produit-search/fiche` (29/09) | PRODUIT-SEARCH | Peut-être traité : `45d9a610` (06/10), si le déclencheur était un émoji. Essai S1 : 400 « Les émojis … ne sont pas acceptés » ; les autres causes SQL restent possibles | Une lecture précédente de la même transaction a échoué et l'a marquée pour annulation ; ces lectures avalent leurs exceptions (`SearchProduitServcieImpl:491-524`) | Cas S1 (déclencheur émoji seulement) | Ne plus avaler les exceptions de requête, ou faire ces lectures hors transaction (**moyen** : fiche très utilisée) | P3 |
| R1 | `Duplicate entry … 'pkey_unq'` sur `PUT v2/retour-carnet-depot/{id}` (8 occ., 25/10 ; ticket `20261025-62667DE5`) | RETOUR CARNET | Reproduit **par l'essai de la branche d'audit** (`audits/repro-carnet.js`, sur ce poste) ; non corrigé (constat N9) | La clôture écrit un mouvement `hmvtproduit` dont la clé est l'identifiant numérique de la ligne de retour, déjà utilisé (`RetourCarnetServiceImpl.java:93`). À vérifier : les migrations suppriment l'index `pkey_unq` de `hmvtproduit` (V5.3.7), la copie l'a encore (B.7) | `repro-carnet.js` (branche d'audit) | Clé `"RC-"+id` ; refus d'une seconde clôture (CA-07) (faible) | P2 |
| R2 | `IllegalArgumentException : id to load is required` sur `POST v2/retour-carnet-depot/creeation` (4 occ., 25/10, essai E2E) | RETOUR CARNET | **Traité sur la branche d'audit seulement** : `fe7b075b` (CA-15), pas encore dans `claude/new-session-xm8ptu` | Motif absent : `em.find(…, null)` (`RetourCarnetServiceImpl.java:198`) | Fichier de détail `event-RETOURCARNETDEPOT-b454d799…` ; même appel que R1 avec `valueFour:null` | Reprendre `fe7b075b` à la fusion ; refuser aussi un motif inexistant (nul) | P3 |

## 8. Interface (erreurs JavaScript)

Le collecteur d'erreurs (`app.js:1272-1656`) ne provoque ni n'amplifie aucune de ces erreurs, ce que prouve le code :

- la déduplication est posée avant l'envoi ;
- 20 signalements au plus par page ;
- `try/catch` général ;
- l'envoi raté vers `/support/events` est ignoré.

| N° | Résumé | Module | Statut | Cause | Reproduction | Correctif proposé (risque) | Prio. |
|---|---|---|---|---|---|---|---|
| J1 | `too much recursion` et `Maximum call stack size exceeded` dans `ext-all.js` (10 évén., 120 occ., 14/08 → 10/09 ; 4 tickets) | FRONTEND | **Traité** : `4e890c1b` (22/08), `3254e207` (05/09), pour 8 événements sur 10. Les 2 autres (14/08 et 01/09, sans fil « ouvrir-caisse ») : hypothèse | `OuverturecaisseManager.retourNavigation` s'appelait elle-même après « Ouvrir caisse », puis Oui ou Non à l'impression | « Ouverture de Caisse », « Ouvrir caisse », Oui ou Non : aucune erreur. Non joué : l'essai ouvre une caisse | En place | — |
| J2 | `getVentemanagerGrid() is undefined` (`StatVenteDepotCtr.js:175`), 3 libellés selon le navigateur (7 évén., 76 occ. ; 3 tickets) | FRONTEND | **Traité** : `913f6aa5` (23/08) | Le contrôleur du dépôt écoutait la touche Entrée de l'écran « Vente terminées ». Après le correctif, la ligne 175 est `},` : les signalements jusqu'au 10/09 viennent de l'ancien fichier | « Vente terminées », saisir « a » dans Rechercher, Entrée : aucune erreur | En place | — |
| J3 | `Ext.getCmp(...) is undefined` sur `close` (`ImportXLS.js:191`) (6 occ., 20/08 → 17/10 ; ticket `20260929-E81DF44E`) | FRONTEND (commandes) | **Reproduit** (test d'écran `test-import-commande-annuler.js` : « Cannot read properties of undefined (reading 'close') », code 1) | « Annuler » détruit la fenêtre puis appelle `close()` sur le composant détruit (`ImportXLS.js:190-191`) | « Commande en cours », « IMPORTER UNE COMMANDE », « Annuler » | `button.up('window').close()` (nul) | P3 |
| J4 | `client is null` (`VenteCtr.js:3879`) (3 occ., 02 → 09/09) | FRONTEND (vente) | **Traité** : `4bbea8c4` (01/09) | Client lu avant d'être testé dans `onbtnModifierInfo` | Vente, type Assurance sans client, icône « modifier » : aucune erreur | En place | — |
| J5 | `record is undefined` sur `order` et `numBon` (`VenteCtr.js`, `addTpCmp`) (7 occ.) | FRONTEND (vente) | Prouvé par le code (cause d'une liste vide côté serveur = hypothèse) | `onNewClientAssurance` (`VenteCtr.js:5024`) appelle `addTpCmp(tierspayants[0])` sans tester la liste ; le serveur peut la renvoyer vide | `page.route` sur `client/add/assurance` qui renvoie `tiersPayants:[]` → erreur « numBon » | Tester la liste ; `if (!record) return` dans `addTpCmp` (faible) | P2 |
| J6 | `result is null` sur `success` (`VenteCtr.js:1061`, actuellement `:1422`) (23/08) | FRONTEND (vente) | Peut-être traité : `d4531230` (23/10) encode le code saisi ; le défaut de fond reste | Réponse 200 non JSON (code contenant `%`) : `Ext.JSON.decode(…, true)` rend `null` | `page.route` sur `vente/findone/**` qui renvoie du HTML | `if (result && result.success)` (nul) | P3 |
| J7 | `combobox is not defined` (`grossiste/action/add.js:444`) | FRONTEND | **Traité** : `8ae18d45` (08/10) | Variable non déclarée | « Gérer Grossistes », modifier un grossiste qui a un groupe | En place | — |
| J8 | `itemId is not defined` et `tpRecord.data` indéfini (`UpdateVenteClientTpForm.js:1255`, `:1197`) | FRONTEND | **Traité** : `9cf301d4` (23/10) | Variable non déclarée ; tiers payant non choisi | Test existant `journal/test-vente-changer-tiers-payant.js` | En place | — |
| J9 | `client is null` sur `strFIRSTNAME` (`UpdateVenteClientTpForm.js:708`) (3 occ., jusqu'au 20/10) | FRONTEND | **Traité** : `093e531d` (17/10). Le cas du 20/10 porte la ligne de la version du 15/10 | Clic sur « Modifier infos client » avant la réponse du serveur | Retarder `infosclienttpforupdating` de 3 s, cliquer aussitôt : bouton inactif | En place | — |
| J10 | `null` sur `down` (`UpdateVenteClientTpForm.js:1290`, actuellement `:1333`) (3 occ.) | FRONTEND | Prouvé par le code | Fenêtre fermée avant la réponse de `loadVenteById` : `form` vaut `null` | Retarder la réponse de 3 s, fermer la fenêtre | `if (me.isDestroyed || !me.down('form')) return` (nul) | P3 |
| J11 | `null` sur `lgPREENREGISTREMENTID` (`UpdateVenteClientTpForm.js:1356`, actuellement `:1402`) | FRONTEND | Prouvé par le code | « Enregistrer » cliqué avant le chargement de la vente | Retarder la réponse, cliquer « Enregistrer » | Bouton inactif jusqu'au chargement (nul) | P3 |
| J12 | `Me.onRechClick is not a function` (`EtatControleManager.js:405`, `:509`) | FRONTEND | **Traité** : `1e023556` (17/10) | Variable globale `Me` reprise par un autre écran | « Etat de contrôle Achats », ouvrir puis fermer la mise à jour d'un BL, changer un filtre | En place | — |
| J13 | `Me.onRechClick is not a function` (`inventaire/action/addArticle.js:402`) | FRONTEND | Prouvé par le code | Même défaut : fenêtre « Choix des articles » non modale, et `Me` reprise par « Travaux d'Inventaire » rouvert. `Me = this` figure dans environ 220 fichiers | Ouvrir la fenêtre, rouvrir « Travaux d'Inventaire », Entrée dans Recherche | `cmp.up('addarticle').onRechClick()` (faible) | P3 |
| J14 | `reglement is undefined` sur `montantRestant` (`DetailVente.js:182`) (5 occ.) | FRONTEND | Prouvé par le code | Détail d'une vente sans mouvement de caisse (V6 et H4) : la ligne 181 prévoit le cas, pas la ligne 182 | « Vente terminées », détail d'une vente de la requête B.5 (référence seulement) | `reglement ? reglement.montantRestant : 0` (nul) | P3 |
| J15 | `valheight is not defined` (`ReserveManager.js:18`) (3 occ., au démarrage) | FRONTEND | Prouvé par le code (ordre de chargement chez l'utilisateur = hypothèse) | Variable de `Navigation.js` lue dans le corps de la classe, alors que les deux fichiers se chargent en parallèle. Même risque dans `MainMenuManager.js` et `MenuMetroManager.js` | Retarder `Navigation.js` de 2 s par `page.route`, puis se connecter | Valeur de repli, ou lecture dans `initComponent` (nul) | P3 |
| J16 | `SyntaxError: missing : after property id` (`FamilleManager.js:379`) | FRONTEND | Non reproduit | Toutes les versions Git passent `node --check` : fichier modifié sur place ou tronqué pendant un déploiement | — | Garde par le test de fumée `smoke-ecrans.js` | P4 |
| J17 | `selectedBL.get is not a function` (`EtatControleManager.js:748`) | FRONTEND | **Traité** : `da563adf` (20/08) | Case décochée laissée sur une valeur qui n'est pas un enregistrement | Cocher deux BL, en décocher un, « Régler » | En place | — |
| J18 | `this.getStore is not a function` (`FactureenAttendeEditionManager.js:472`) | FRONTEND | **Traité** : `4bbea8c4` (01/09) | Rappel sans `scope` | Ouvrir « dossiers en attente de facturation » | En place | — |
| J19 | `Ext.JSON.decode(): … <!DOCTYPE html` (`editprice.js:325`) | FRONTEND (BL) | Prouvé par le code (lié à C5) | Décodage strict de la page d'erreur 500 de Payara | `page.route` qui renvoie un 500 HTML sur `modifproductprice` | `Ext.JSON.decode(…, true) || {}` (nul) | P3 |
| J20 | `b.store is null` sur `getCount` et `this.store is null` sur `loadPage` (liste déroulante d'ExtJS) | FRONTEND (vente) | Prouvé par le code d'ExtJS (scénario = hypothèse) | Recherche ou frappe différée qui se termine après la destruction de la liste (vente rechargée) | Retarder `vente/search`, recharger la vente pendant la recherche | Surcharge `ComboBox` dans `correctifs-affichage.js` : annuler la tâche à la destruction, garde sur `store` (faible) | P3 |
| J21 | `zIndexManager is undefined` (après une clôture de caisse) | FRONTEND | Hypothèse | Clic sur un composant flottant déjà détruit | Non déterministe | Garde dans `Floating.toFront` (faible) | P4 |
| J22 | `a.el` / `activeResizeHandle` nuls (redimensionnement, 3 évén. le 14/09) | FRONTEND | Hypothèse | Fenêtre fermée ou rechargée pendant un redimensionnement | Aucune procédure fiable | Garde dans `ResizeTracker` (faible) | P4 |

## 9. Interface (erreurs Ajax 404 et 400)

| N° | Résumé | Module | Statut | Cause | Reproduction | Correctif proposé (risque) | Prio. |
|---|---|---|---|---|---|---|---|
| A1 | 404 sur `vente/findone/<valeur>` (environ 55 évén.) : liens de QR publicitaires, libellés avec `/`, `.`, `..`, `?` | FRONTEND (vente) | **Traité en partie** : `e5fc8dee` (17/10, liens refusés) et `d4531230` (23/10, encodage). Reste `..` : **reproduit** (essai A2 : le navigateur envoie `vente/`, puis 404) | La valeur passe dans le chemin. `encodeURIComponent` laisse `.` et `..`, que le navigateur réécrit | Cas A2 | Refuser en JS les codes vides, `.` et `..`, ou passer le code en paramètre de requête (faible) | P3 |
| A2 | 404 sur `commande/produit/commande/{id}` (19 occ., 01-02/09) | FRONTEND (fiche article) | **Traité** : route renommée par `9af460fd` (12/08), plus aucun appelant | Ancien `detailArticle.js` resté en cache | — | En place | — |
| A3 | 404 sur `client/client-assurance//0` (11/09, 22/10) | FRONTEND | **Traité** pour la vente et la vente en dépôt : `d4531230` ; reste `DevisCtr.js:1227` (prouvé par le code ; essai A3 : un identifiant vide donne bien 404) | Identifiant client vide | Cas A3 (montre que le chemin vide donne 404) | Même garde dans `DevisCtr.js` (nul) | P4 |
| A4 | 404 sur `ventestats/article-vendus` et `-recap` (24/09, 22/10) | FRONTEND (statistiques) | **Reproduit** (essai A1 : `stock=abc` donne 404 en page HTML) | Texte saisi dans un filtre entier (`stock`, `int_NUMBER`, `qteVendu`) : JAX-RS ne sait pas le convertir et répond 404, renvoyé tel quel par `SupportExceptionMapper.java:47` | Cas A1 | Champs numériques à l'écran ; ou paramètres texte et refus 400 en JSON (faible) | P3 |
| A5 | 404 sur `tierspayant/ws_data.jsp?str_STATUT=disable` (18-21/10) | FRONTEND (tiers payants) | **Traité** pour l'écran concerné : `2028bf9f` (23/10). Mais 29 fichiers de `webapp/general/app` citent encore cette JSP supprimée le 04/12/2024 (`9d1066e5`), en ligne non commentée ; qu'ils l'appellent vraiment reste à vérifier écran par écran | Ancienne URL | Recherche `tierspayant/ws_data.jsp` dans `webapp/general/app` | Passer ces fichiers à l'API REST, écran par écran (moyen) | P2 |
| A6 | 404 sur `mobile/catalogue-essai` (26/10, poste local) | Tests | Voir SC5 | Ressource inexistante appelée par `test-sessions.js` | — | Voir SC5 | P3 |
| A7 | 400 sur `vente/search` (21/10, 4 occ.) | FRONTEND (vente) | Hypothèse | Probablement `CaracteresSaisieFilter` : émoji ou caractère sur 4 octets envoyé par la douchette | Cas S1 (même filtre) | Message clair à l'écran (nul) | P4 |

## 10. Blocages et lenteurs

Constats transverses :

- En officine, des routes triviales (`common/users`, `villes`, `modereglement`, `client/all`, compteurs de la cloche)
  ralentissent **en même temps** que les lourdes. La cause est souvent générale : tas Java de 512 Mo utilisé à
  88-98 % jusqu'au 16/09, clôtures longues simultanées.
- Les mesures du 26/10 vers 00 h 35 (`v3/tvas`, `pilotage/onglet/asuivre`) sont faussées par une requête manuelle de
  568 s sur `hmvtproduit`, absente du dépôt.
- Les événements `app-params/update` (43,5 s) et `vente/ticket/vo` (15,9 s) ont été **créés exprès** par
  `test-lot-c-surveillance.js` (SC5).

| N° | Résumé | Module | Statut | Cause | Reproduction / mesure | Correctif proposé (risque) | Prio. |
|---|---|---|---|---|---|---|---|
| L1 | **`GET ventestats` lent** (733 occ., 14/08 → 23/10) | PERFORMANCE | Constaté en officine (733 mesures au-delà de 5 s). Non reproduit isolément (essai M2 : 122 ms pour un appel seul sur capitale, aucun avoir dans la période). Cause = hypothèse, à mesurer en officine avec 6 postes en parallèle | La cloche « Ventes en avoir » (`Header.js:1091-1103`) appelle la liste complète sur un mois **toutes les 60 s et sur chaque poste**. `b_IS_AVOIR` n'a pas d'index. Le compteur léger `avoirs-ouverts/count` existe mais n'est pas branché (`AVOIRS_SANS_PERIODE = false`). Traité en partie par `3254e207` et `bf7c8b2f` | Cas M2 ; `EXPLAIN` B.8 | Badge sur le compteur, liste lue à l'ouverture ; index `(b_IS_AVOIR, str_STATUT, dt_UPDATED)` (faible : le badge comptera aussi les avoirs de plus d'un mois) | **P1** |
| L2 | `commande/list-bons` lent et 17 blocages, jusqu'à 27 s (14/08 → 10/09 ; ticket `20260817-CD2C6EC5`) | PERFORMANCE / BLOCAGE | **Traité** : `3254e207` (05/09). Plus rien après le 10/09 ; aucune mesure avant/après consignée | `DATE(dt_UPDATED)` empêchait l'index ; 3 requêtes par bon | `GET commande/list-bons?statut=enable&start=0&limit=100&dtStart=2026-07-01&dtEnd=2026-10-26` < 1 s | En place ; consigner la mesure | — |
| L3 | `caisse/fetch-tickez` et `tickez` lents, 18 blocages jusqu'à 36 s (jusqu'au 25/10 ; 3 tickets) | PERFORMANCE / BLOCAGE | **Traité** : `9ee6cc84` (25/10, 20 h 55). **24 jours : 30 s → 0,9 s** (`caisse/test-ticketz.js`) | Chaque mouvement de caisse était rechargé avec toute sa vente | `POST caisse/fetch-tickez` sur 24 jours < 5 s | En place ; vérifier en officine après déploiement | — |
| L4 | `audit/analyse` : blocage de 29 s et 18 lenteurs (25/10, ce poste ; ticket `20261025-23BB836A`) | PERFORMANCE / BLOCAGE | **Traité en partie** : `fe047863` (25/10). Officine : 1 min 45 → 0,18 s ; copie : 292 s → 6,1 s, encore au-dessus de 5 s | Sommes recalculées client par client (`AuditAnalyseService.differes()`) ; la section stock reste à environ 3 s | `GET audit/analyse?dtStart=2026-10-01&dtEnd=2026-10-25` < 5 s | Sections en `@Asynchronous` ou calculées à l'ouverture (faible) | P2 |
| L5 | `facture-tiers-payant/details-vente` : blocage de 37 s (20/10 ; ticket `20261020-7C0519F6`) | BLOCAGE | **Reproduit** (essai M1 : **18,1 s** sans identifiant de vente, totaux calculés sur toutes les ventes en cours, liste vide) ; déclencheur à l'écran = hypothèse forte | Une requête par ligne et trois totaux de l'ancien code. **Sans identifiant de vente, les totaux parcourent toutes les ventes en cours** (`FactureTiersPayantRessource.java:421`). Déclencheur probable : la barre de pages recharge sans paramètres (`detailTransactionTiersPayant.js:430`) | Cas M1 | Refus sans identifiant ; totaux en SQL ; `extraParams` sur le magasin (moyen : comparer les montants de remise sur 20 ventes) | P2 |
| L6 | `statfamillearticle/vingtQuatreVingt` (analyse 20/80) lent (23 occ., jusqu'au 15/10) | PERFORMANCE | Hypothèse forte | Procédures de V6.0.4 sans `STRAIGHT_JOIN`, même défaut que « Statistique famille », corrigé le 19/10 | `GET statfamillearticle/vingtQuatreVingt?dtStart=2026-09-01&dtEnd=2026-09-30&vingtType=CA` < 3 s | Recréer les 3 procédures selon la méthode de V7.0.1 (faible : comparer 6 jeux de paramètres) | P2 |
| L7 | `commande/bon/items/{id}` lent (40 occ. sur 6 bons, jusqu'au 21/10) | PERFORMANCE | **Traité** : `e7fd59cf` (23/10). 492 lignes : 43-47 s → 1,8-3,2 s | Vérification Hibernate avant chaque requête de la boucle | `perf/test-lignes-bl-mobile.js` | En place | — |
| L8 | `articles/abc` lent (15 occ., jusqu'au 19/09) | PERFORMANCE | **Traité** : `49be4b83` (14/10). 9 mois : 8,4 → 2,4 s | Sommes par ligne au lieu de par produit | `GET articles/abc` sur 9 mois < 3 s | En place | — |
| L9 | `suivi-stock-vente/stat-vente-famille` lent (79 occ., jusqu'au 29/08) | PERFORMANCE | **Traité** : `3254e207` (05/09) | Connexion ouverte hors du pool à chaque appel | `GET …/stat-vente-famille?lg_FAMILLE_ID=<article>` < 1 s | En place | — |
| L10 | `info` (catalogue mobile) : 13-16 s (11 occ.) | PERFORMANCE | Traité en partie (57 → 13 s) ; **décision en attente** (table « dernière vente par produit ») | — | `RAPPORT_LENTEUR_CONNEXION.md` § 7.3 | Décision à prendre | P2 |
| L11 | `commande/validerbl` lent (3 occ.), qui tient des verrous ; `checked-quantities` bloqué 28 s (voir C2) | PERFORMANCE | Hypothèse | Lots et stock relus ligne par ligne dans une transaction longue (`CommandeServiceImpl.java:195`) | BL de test de 200 lignes, puis `PUT commande/validerbl/<id>` < 5 s | `FlushModeType.COMMIT` pendant la boucle ; lots lus en une requête (**élevé** : entrée en stock) | P2 |
| L12 | `tableau-board/tableau` : blocage de 22 s et 9 lenteurs, la nuit (ticket `20260901-22E5AEF6`) | PERFORMANCE / BLOCAGE | Hypothèse | Une ligne Java par vente sur une période longue (`BalanceServiceImpl.java:452`) | `GET tableau-board/tableau?dtStart=2025-10-01&dtEnd=2026-10-26&monthly=true` < 3 s | Agréger en SQL (moyen : comparer le JSON) | P2 |
| L13 | `client/all` et `client/tiers-payants/assurance` lents | PERFORMANCE | Prouvé par le code | 2 requêtes par client, soit jusqu'à 201 requêtes (`ClientServiceImpl.java:315`) | Compter les requêtes du journal SQL du banc | Deux requêtes `IN (:ids)` (faible) | P2 |
| L14 | `common/users` bloqué 21 s (12/10 ; ticket `20261012-84781974`), `villes`, `modereglement`, `v3/tvas` | BLOCAGE / PERFORMANCE | Hypothèse (congestion générale) | Lecture triviale : lente seulement pendant une congestion (clôture longue sur CAISSE31 à la même minute) | Mesurer au repos (< 100 ms attendu) | Rien sur la route ; réglage du tas et du pool de l'officine | P3 |
| L15 | Compteurs de la cloche lents (`perimes/count`, `suggestion-reserve/en-attente/count`, `compteur-jour`) | PERFORMANCE | Hypothèse (congestion) | Appelés toutes les 60 s par poste : bruit de fond des congestions | Mesurer au repos | Voir L1 et SC4 | P3 |
| L16 | `suggestion-reserve` : ouvrir, traiter, créer lents (9 occ., une seule suggestion) | PERFORMANCE | Hypothèse | Inconnue sans le fichier de détail ; le 14/08, juste après un redémarrage | `PUT suggestion-reserve/<id>/ouvrir` sur 100 lignes < 2 s | À mesurer | P3 |
| L17 | Routes du comptoir lentes, une à sept fois (`vente/search`, `findone`, `cloturer/*`, `add/assurance`) | PERFORMANCE | Hypothèse (congestion ; GS1 brut pour `findone` du 02/09) | 20-70 ms sur le banc | `GET vente/search?query=dolip` < 300 ms | Vérifier que le GS1 n'est plus envoyé brut (`141fe4af`, `9b27d484`) | P3 |
| L18 | Analyses du soir lentes (matrice, paires, surstocks, recap des articles vendus, facturation de groupe, création d'inventaire) | PERFORMANCE | Hypothèse | Écrans de fond, appelés rarement | À mesurer un par un au repos | — | P3 |
| L19 | `whatsapp/web/alerte` : 5 038 ms (25/10, ce poste) | PERFORMANCE | Prouvé par le code | Délai de connexion de 5 s au service Node injoignable (`WhatsAppWebServiceImpl.java:87`) | Service arrêté, appel à l'alerte | Délai de 1 s pour l'état, ou état mis en cache (faible) | P3 |
| L20 | `user/auth`, `user/logout` lents (1 fois chacun) | PERFORMANCE | Hypothèse (coupure réseau le 29/08) | — | — | — | P4 |
| L21 | « N requête(s) en cours depuis plus de N s » (16 évén.) | SERVEUR | Prouvé par l'heure : chaque jour à 04 h 15 = veilleur de cohérence, lancé par **chaque poste** (SC3). 25/10 = ancien ticket Z (L3). 26/10 = requête manuelle | `job/SupportDatabaseMonitor.java:56` compte toute la base | — | Écrire la base et l'utilisateur dans le message ; veilleur sur le seul poste serveur (nul) | P3 |

## 11. Serveur et tâches planifiées

| N° | Résumé | Module | Statut | Cause | Reproduction | Correctif proposé (risque) | Prio. |
|---|---|---|---|---|---|---|---|
| S1 | **« Redémarrage inattendu du serveur (arrêt non propre) »** (149 évén., 173 occ.) | SERVEUR | Prouvé par le code : **faux positif pour l'essentiel** | Le fichier témoin `heartbeat.flag` n'est retiré que par `@PreDestroy` (`SupportWatchdog.java:150-159`). Un arrêt de Windows qui tue Payara compte donc comme un plantage. Sur les 80 arrêts de plus de 2 h, 61 ont leur dernier battement entre 20 h et 22 h : c'est l'extinction des postes le soir. La clé `crash-<heure>` n'a pas de poste : deux postes peuvent fusionner. La correction du 14/10 (`46c523eb`, `e588308a`) ignore l'événement Windows 6006 (arrêt propre) | Ce poste : `taskkill /F` de `java.exe`, puis redémarrage → événement ; `asadmin stop-domain` → aucun. Requête B.9 (heures) | Poste dans la clé ; crochet d'arrêt JVM ; arrêt propre de Windows classé INFO (moyen : ne pas masquer une vraie coupure, exiger l'absence des événements 41 et 6008) | **P1** |
| S2 | « Job planifié en retard » : snapshot, purge du support, veilleur, purge de valorisation (42 évén.) | SERVEUR | **Traité** pour les cas « aucun passage » et « 2230 h » : `20fcf178` (V6.9.1), `3254e207`, `2bfc5240` (V7.0.0). **Reste** le cas du 15/10 | Le rattrapage au démarrage (`SupportNightlyCatchUp.java:141-180`) a le même seuil de 30 h que l'alerte : un poste allumé à 07 h 30 ne rattrape pas, puis l'alerte part à 10 h 10 | Requête B.10 (`t_support_job_run`) | Rattraper dès que le créneau du jour est manqué (faible) | P2 |
| S3 | « Des connexions restent ouvertes sans être utilisées » (6 évén., le 29/09 et le 10/10) | SERVEUR | Prouvé par le code : faux positif probable | Le moniteur compte les connexions endormies de **toute** la base, pas celles du pool du poste (`SupportPoolMonitor.java:65`, `:470`). Avec 5 postes, le seuil de 20 est dépassé sans aucune fuite | Requête B.11 | Filtrer par poste ou comparer à la taille de pool × nombre de postes (faible) | P3 |
| S4 | « Mémoire JVM élevée » (5 évén., 26/08 → 16/09) | SERVEUR | Vraie mesure ; réglée par la configuration (plus rien après le 16/09) | Tas de 512 Mo sur un poste | — | Poste dans la clé (nul) | P4 |
| S5 | « Configuration de la supervision : N anomalie(s) » (177 occ.) | SERVEUR | Prouvé par le code : vrai défaut de **paramétrage** | Notification active alors que `SUPPORT_EMAIL` est vide (`SupportPreflight.java:335-350`). Vérifié à chaque démarrage de chaque poste | Requête B.12 | Renseigner `SUPPORT_EMAIL` ou couper la notification (paramétrage) | P3 |
| S6 | « Clôture de vente anormalement longue (CAISSE31) » (3 occ.) | SERVEUR | Vraie mesure (plus de 5 s) | Niveau figé à la première occurrence | — | Faire monter le niveau quand une occurrence le justifie (nul) | P3 |

## 12. SMS

| N° | Résumé | Module | Statut | Cause | Reproduction | Correctif proposé (risque) | Prio. |
|---|---|---|---|---|---|---|---|
| M1 | **Envois SMS refusés par Orange (POL0001)** puis suspendus 60 min (315 occ. ; ticket `20260914-BC86F839`) | SMS | Prouvé par les réponses d'Orange : **forfait épuisé** (« You consumed all available units ») | Pas un défaut de code | — | **Racheter un forfait** (métier) | **P1** |
| M2 | Une nouvelle suspension et un événement chaque heure, par poste | SMS | Prouvé par le code : comportement voulu, mais bruyant | Le coupe-circuit (`SmsCoupeCircuit.java:81-101`) n'est remis à zéro qu'après un succès ; il est en mémoire, par poste | Compte sans unités, puis 3 SMS d'administration | Suspension progressive (60, 120, 240 min) et un événement par série (faible : reprise plus lente après le rachat) | P3 |
| M3 | `SocketTimeout` et `UnknownHost` vers `api.orange.com` (3 occ.) | SMS | Vraies coupures réseau | — | — | Aucun | P4 |

## 13. Contrôles de cohérence

Le veilleur passe chaque nuit à 04 h 15 et compte au plus 500 cas par contrôle
(`SupportCoherenceServiceImpl.java:206`).

| N° | Résumé | Module | Statut | Cause | Vérification | Correctif proposé (risque) | Prio. |
|---|---|---|---|---|---|---|---|
| H1 | « Commande sans ligne de détail » (500 = plafond) | COMMANDE | Prouvé par le code : **faux positif en grande partie** | La requête ne filtre pas le statut ; or l'import de la réponse du grossiste vide la commande et la passe en `delete` (`CommandeServiceImpl.java:1096-1111`) | Requête B.13 (comptage par statut et par année) | Ajouter `o.str_STATUT <> 'delete'` (migration ; nul) | P3 |
| H2 | « Lot périmé en stock non marqué (job de péremption ?) » (212) | STOCK | Prouvé par le code : le contrôle et le job ne regardent pas les mêmes lots ; nature réelle = hypothèse | `JobLot` (`JobLot.java:94-108`) ignore les lots à l'état `enable` et ne lit pas `t_lot.current_stock` : ces lots ne sont jamais marqués périmés | Requête B.14 : produits périmés vraiment en stock, ou stock de lot non décrémenté | Selon B.14 : marquer aussi les lots `enable`, ou corriger le décompte du lot (moyen : stock) | P2 |
| H3 | « Dossier de règlement sans ligne de détail » (10, stables) | RÈGLEMENT | Hypothèse : données de 2018 environ | Identifiants numériques anciens ; le règlement carnet par l'API crée aussi un dossier sans détail par conception (`ReglementServiceImpl.java:482`) | Requête B.15 | Exclure les dossiers du règlement carnet (nul) | P4 |
| H4 | « Vente terminée sans mouvement de caisse » (5) | VENTE | **Vraie anomalie de données** (au moins 4 ventes sur 5 sont celles de V6) | Clôtures interrompues d'avant `c9ad2f0d` | Requête B.5 | Régulariser les 5 ventes après accord ; aligner le contrôle sur sctrl-06 (annulées exclues, lien par `vente_id`) (nul) | P2 |
| H5 | « Snapshot de stock absent pour la veille » (1) | VALORISATION | **Traité** : `bc1995ab` (V7.2.6), appliqué à la copie le 25/10 à 19 h 11 | L'ancien contrôle lisait une table que plus rien n'alimente | Requête B.16 | En place. Risque restant : une caisse allumée avant le serveur signalera un relevé absent (SC3) | P4 |

## 14. Résultats des essais (26/10, de 01 h 55 à 02 h 00)

**Environnement**

- Second domaine Payara `http://localhost:9080/prestige`, version **31622a33** (tête de `claude/new-session-xm8ptu`).
- Base `capitale` (copie du 25/10, migrée en 7.2.23), comptes `e2e-sa` et `e2e`.
- Le domaine 8080 (base `laborex_v1_db`) faisait tourner la version de la branche d'audit : il n'a pas servi aux essais.

| Essai | Anomalie | Appel | Attendu si le défaut est présent | Obtenu | Verdict |
|---|---|---|---|---|---|
| P1 | P1 | `GET produit/monitoringproduct` sans dates | 500 | 500 (30 ms) ; « NullPointerException : text » passe de 14 à 15 occurrences | **Reproduit** |
| V2a | V3 | `POST vente/net/assurance`, `taux:null` | 500 | 400 « Données envoyées illisibles » | Traité |
| V2b | V3 | `POST vente/add/item`, `qte:null` | 500 | 400 « Données envoyées illisibles » | Traité |
| V2c à V2f | V3 | `devis:null`, `cmu:null`, `taux:""`, `qte:""` | 500 | 400 dans les 4 cas | Traité |
| V2g | (contre-épreuve) | `net/assurance` avec un taux valide | — | 200 « Cette vente n'existe plus » : la méthode est atteinte | — |
| V3 | V4 | `POST vente/update/item/vno`, `qte:1.5` | 500 | 400 « Valeur saisie invalide pour « qte » » | Traité |
| C1 | C1 | `POST commande/bon/items/checked-quantities`, `2.5` | 500 | 400 « … un nombre entier est attendu » | Traité |
| A1 | A4 | `GET ventestats/article-vendus?…&stock=abc` | 404 | 404 (page HTML de Payara) | **Reproduit** |
| A2 | A1 | `GET vente/findone/..` | 404 | le navigateur envoie `vente/`, puis 404 | **Reproduit** |
| A3 | A3 | `GET client/client-assurance//0` | 404 | 404 | Reproduit (chemin vide) |
| B1 | K2 | `GET billetage/cloture-data` sans caisse | 500 | 200 « Aucune caisse ouverte à votre nom » | Traité |
| C4 | C4 | `DELETE commande/order/E2E-INEXISTANT` | 500 | 200 | Traité |
| S1 | P2 | `GET produit-search/fiche` avec un émoji | 500 | 400 « Les émojis … ne sont pas acceptés » | Traité (ce déclencheur) |
| F1 | C5 | `POST ws_transaction.jsp?mode=modifproductprice`, PAF vide | 500 | 500 (page HTML de Payara) | **Reproduit** |
| M1 | L5 | `GET facture-tiers-payant/details-vente` sans identifiant | plus de 1 s | **18 083 ms**, liste vide, totaux sur toutes les ventes en cours | **Reproduit** |
| M2 | L1 | `GET ventestats?onlyAvoir=true…` sur un mois | plus de 200 ms | 122 ms (appel seul, aucun avoir) | Non reproduit |
| écran | J3 | « Commande en cours », « IMPORTER UNE COMMANDE », « Annuler » | erreur JS « close » | « Cannot read properties of undefined (reading 'close') », code 1 | **Reproduit** |

**Traces laissées par les essais**

- Aucune donnée métier n'a été écrite.
- Deux événements existants de `capitale` ont pris une occurrence chacun :
  - `7c2429b5-ec1a-4dfa-88bb-49c934117652` (« NullPointerException : text ») ;
  - `50900833-b797-4e5c-92fe-0e961f4385d5` (lenteur `details-vente`).
- Pour les remettre en l'état, sur `capitale` uniquement :
  `UPDATE t_application_event SET occurrences = occurrences - 1 WHERE id IN ('7c2429b5-ec1a-4dfa-88bb-49c934117652','50900833-b797-4e5c-92fe-0e961f4385d5');`
- Les dernières lignes de `t_application_event_occurrence` de ces deux événements sont à retirer de la même façon.
- Le test d'écran a intercepté son propre signalement : il n'a rien écrit.

**Second passage, vers 02 h 05, sur `laborex_v1_db`** (domaine 8080, version 31622a33, données de l'officine)

- **Mêmes verdicts** pour tous les cas, sauf F1.
- **M1** : 15 280 ms. Le défaut est donc reproduit aussi sur les données de l'officine.
- **M2** : 116 ms. L1 reste non reproduit sur un appel seul.
- **F1** : 404 au lieu de 500, ce qui ne vaut rien. L'application déployée sur le domaine 8080 à ce moment n'avait pas
  de dossier `webservices`, si bien que toutes les anciennes JSP répondaient 404, y compris `ws_tree_menu.jsp` à la
  connexion. Défaut d'environnement signalé aux sessions qui déploient. Le domaine a été redéployé avec le même WAR ; **F1, rejoué
  ensuite, est reproduit** : 500, aucun événement ajouté.

Événements touchés sur `laborex_v1_db` :

- `7c2429b5…` : +1 ;
- `50900833…` : +1 ;
- `7e885b9c-3f5c-4f7c-acdd-fe95b3871ffb` (404 de `ws_tree_menu.jsp`, produit par mes connexions pendant ce
  déploiement) : de 1 à 10.

Même remise en état que ci-dessus, avec ces identifiants et ces écarts.

## 15. Lot 1 corrigé (26/10, commit 2419ba39)

Les corrections sont faites sur `PRES-/anomalies-support-954194`. Les tests ont été écrits d'abord et ont échoué
sur 31622a33 (commit 6571cc90 de la même branche). Ils ont été rejoués sur le domaine 9080 redéployé avec la
correction (base `capitale`).

| N° | Correction | Fichiers | Preuve |
|---|---|---|---|
| J3 | « Annuler » ferme la fenêtre par `button.up('window').close()` | `bonlivraison/ImportXLS.js` | `test-import-commande-annuler.js` : échouait (« close »), passe |
| P1 | Écran : produit et période posés en paramètres du proxy, conservés par « Actualiser » et le changement de page. Serveur : sans période, refus « Période manquante… » (200, `success:false`), sans erreur ni événement | `MvtArticleCtr.js`, `MvtArticleCompletCtr.js`, `FamilleManager.js`, `ProduitRessource.java` | `test-lot1-api.js` (4 cas P1) et `test-lot1-ecrans.js` (« Actualiser » : 500 sans dates avant, 200 avec produit et période après) |
| A4 | Paramètre de filtre illisible (`QueryParamException`, `FormParamException` de Jersey) : 400 en JSON « Valeur saisie invalide pour « stock » », au lieu de la page 404 de Payara. Filtres Quantité, Stock et Qté vendue limités aux chiffres à la frappe | `SaisieInvalide.java`, `SupportExceptionMapper.java`, `ArticleVendu.js`, `ArticleVenduBis.js` | `test-lot1-api.js` (3 cas A4, dont `stock=5` inchangé) ; test unitaire `ParametreIllisibleTest` (3/3) |
| A1 | Un code fait seulement de points est refusé sans appel au serveur, message « Code illisible » dans la page | `correctifs-affichage.js` (`PrestigeScan`) | `test-lot1-ecrans.js` : « .. » (404 avant, aucun appel après) ; non-régression : un lien reste refusé, un code ordinaire est toujours cherché |
| C5, J19 | Les 4 prix sont vérifiés avant l'envoi (entier attendu, champ signalé, fenêtre ouverte). Une erreur du serveur donne un message lisible au lieu d'une erreur `Ext.JSON.decode` et de la page HTML | `bonlivraison/action/editprice.js` | `test-prix-bl.js` (9080, `capitale`) : le test crée un bon d'essai par l'écran (« Cloner la commande », puis « Créer le bon de livraison »), joue les deux cas et retire ses données par l'écran. **Avec l'ancien `editprice.js`** (`AVANT=1`) : C5 et J19 échouent (prix vide envoyé et fenêtre fermée ; erreur JavaScript sur la page 500). **Avec le correctif** : 7/7 |

Données de `test-prix-bl.js` (trois passages le 26/10, de 06 h 27 à 06 h 29) :

- bon et copie de commande retirés par l'écran à chaque passage ;
- après coup, on retrouve 1 commande en cours (l'originale, intacte), 0 bon en cours et 17 240 bons clos, comme
  avant ;
- seule trace : le numéro de commande du jour (`KEY_LAST_ORDER_COMMAND_NUMBER`) est passé à 00003. La prochaine
  commande de `capitale` du 26/10 portera donc le n° 00004.

Ni `capitale` ni `laborex_v1_db` n'avaient de bon en cours au départ (vérifié à 06 h 20) : sans ce montage, le volet
C5 de `test-lot1-ecrans.js` ne peut pas se jouer.

Ce qui n'a pas été rejoué :

- Les tests existants qui lisent la base par le client `mariadb`, dont `journal/test-scan-qr-publicitaire.js` pour
  les 5 écrans qui partagent `PrestigeScan`. Il n'y a pas d'accès SQL dans cette session.
- La JSP `ws_transaction.jsp` elle-même n'est pas modifiée (règle : pas de travail neuf en JSP). Appelée hors de
  l'écran avec un prix vide, elle répond encore 500.

## 16. Lot 2 : lenteurs (28/10, commit c379cb38)

| N° | Résultat | Fichiers | Preuve |
|---|---|---|---|
| L5 | **Corrigé.** Côté serveur : sans identifiant de vente, réponse vide de même forme (**14 s → 7 ms**). Côté écran : vente et statut posés en paramètres du proxy, conservés par « Actualiser » et le changement de page | `FactureTiersPayantRessource.java`, `detailTransactionTiersPayant.js` | `test-details-vente.js` (FACTURATION > Factures > « Detail Bordereau » > « Afficher le detail de la vente », puis « Actualiser »). Avant : appel sans vente, 11,6 s, grille vidée (0 ligne sur 7). Après : 65 ms, 7 lignes sur 7. 4/4 |
| L1 | **Non reproduit, non modifié.** `laborex_v1_db` (8080, en lecture) : appel actuel de la cloche 9-12 ms (médiane 10) ; 6 appels simultanés 55 ms au total. Compteur prévu : 5 ms. La copie n'a aucun avoir en cours sur le mois. Les 733 lenteurs de l'officine précèdent pour la plupart `bf7c8b2f` (14/10) et tombent souvent dans des épisodes de congestion générale (§ 10) | — | `mesure-cloche-avoirs.js` |

Pour L1, passer la cloche sur le compteur (`AVOIRS_SANS_PERIODE = true`, prévu dans `Header.js`) changerait ce
qu'elle affiche : les avoirs ouverts de plus d'un mois seraient comptés. C'est une décision métier, et la mesure ne
la justifie pas pour l'instant. À remesurer en officine si les lenteurs reviennent après le déploiement.

Non-régression : `test-lot1-api.js` 8/8, `test-import-commande-annuler.js` OK, `test-lot1-ecrans.js` (P1, A1) 5/5,
sur la même version déployée.

## 17. Lot 3 : le centre de support lui-même (28/10, commit 72505bdc)

| N° | Résultat | Fichiers | Preuve |
|---|---|---|---|
| S1 | **Corrigé.** Un arrêt normal de Windows (événement 6006, ou 1074 demandé par un utilisateur, sans 41 ni 6008) donne la cause « Extinction normale de la machine », niveau INFO. Un redémarrage pour mises à jour reste « Redémarrage de Windows », passé en INFO. Un arrêt INFO ne crée plus d'incident : il reste dans l'historique du serveur (`t_serveur_vie`, écran « Stabilité du serveur »). La clé de l'incident porte le poste (`crash-<poste>-<heure>`), et le message aussi | `CauseArret.java`, `SupportWatchdog.java` | `CauseArretTest` : 3 nouveaux cas **échouaient** avant la règle (extinction du soir 1074 + 6006 ; 6006 seul ; niveau du redémarrage Windows), 11/11 après. Cas gardés : 41 après un 6006 reste une coupure ; un redémarrage sans trace d'arrêt reste un avertissement. `SupportWatchdogCleTest` 3/3 |
| SC3 | **Corrigé en partie.** Poste dans la clé et le message des alertes mémoire, disque et préflight. Le veilleur de cohérence (04 h 15), la purge du support (03 h 45) et leur rattrapage au démarrage ne tournent plus que sur le poste en mode serveur, comme `JobLot` ou le relevé de stock. Le moniteur des tâches en retard reste sur tous les postes : c'est lui qui signale une officine sans poste serveur | `SupportCoherenceScheduler.java`, `SupportPurgeScheduler.java`, `SupportNightlyCatchUp.java`, `SupportResourceMonitor.java`, `SupportPreflight.java` | Tests unitaires des paquets `job`, `util`, `serveur`, `filter` : 240, 0 échec. **Risque** : dans une officine sans poste en mode serveur, cohérence et purge du support ne tournent plus. Le moniteur l'y signale chaque jour (« job en retard »), comme pour les tâches métier qui ont déjà cette règle |
| SC8 | **Corrigé.** Horodatage du build écrit par Maven dans `prestige-build.properties`, le seul fichier filtré (les 552 autres ressources restent identiques octet pour octet, vérifié). La version de la dernière occurrence est gardée avec l'événement (colonne `version_app`, migration **V7.2.25**), affichée dans le journal du support (colonne « Version ») et dans la description des tickets | `pom.xml`, `VersionBuild.java`, `ApplicationEvent.java`, `SupportEventServiceImpl.java`, `SupportDiagnostic.js`, `V7.2.25__support_evenement_version.sql` | `VersionBuildTest` 3/3. **Vérification sur Payara en attente** (migration, colonne remplie) |
| SC1 | **Traité par `4943d90d` (10/10), prouvé par le code, sans modification.** `record` (une transaction par appel, le ticket créé dans la même transaction) compte par `UPDATE … occurrences + 1` ou `INSERT … ON DUPLICATE KEY UPDATE`. Ces deux écritures prennent le verrou de la ligne : la seconde occurrence simultanée attend la validation de la première, puis relit `ticket_id` déjà posé et ne crée pas de second ticket. Le doublon du 17/10 vient sans doute d'un poste resté sur une version antérieure, ce que SC8 permettra désormais de vérifier | — | Lecture du code. Pas d'essai : il créerait des événements et des tickets que l'écran ne permet pas de supprimer. Une contrainte unique en base serait plus sûre, mais elle échouerait sur les 6 doublons existants : il faudrait d'abord les nettoyer dans la base de l'officine |

## 18. Lot 4 : derniers points ouverts (28/10)

Avant ce lot, les autres branches ont été relues : **V2** (P1) est corrigé sur `claude/new-session-xm8ptu` par
`f662d980` (26/10, test `vente/test-telephone-client-vente.js`, 7/7) ; **R1** est corrigé sur la branche d'audit
par `c9e2010c` (lot 8 : N9, CA-07). Ils ne sont pas repris ici.

| N° | Résultat | Fichiers | Preuve |
|---|---|---|---|
| S3 | **Corrigé.** Le moniteur ne compte plus que les connexions dormantes du même compte et de la même machine (adresse sans le port) que sa propre connexion, c'est-à-dire du pool de ce poste. Les caisses voisines ne font plus dépasser le seuil de 20 | `job/SupportPoolMonitor.java` | `SupportPoolMonitorTest.dormantesDeCePosteSeulement` : échoue avant, passe après. Requête vérifiée sur MariaDB (ci-dessous) |
| A3 | **Corrigé.** Proforma sans client : plus d'appel `client-assurance//<vente>` (404, « Problème avec le server ») ; les montants sont mis à jour et, en comptant, la clôture est permise comme après l'ajout d'un produit. Identifiants encodés | `controller/DevisCtr.js` | `test-lot4-ecrans.js`, volet A3 : joué ci-dessous |
| J6 | **Corrigé.** Une réponse 200 qui n'est pas du JSON à la recherche par douchette (`findone`) ne lève plus « result is null » : on reste sur le champ | `controller/VenteCtr.js` | `test-lot4-ecrans.js`, volet J6 (avec non-régression) : joué ci-dessous |

Tests unitaires : tous passent.

### Vérification sur le 9080 (29/10, base `capitale`, build du 2026-10-28 22:43 UTC, commit eac9b3be)

| Point | Avant (version de la branche tests-performance) | Après (cette branche) | Script |
|---|---|---|---|
| SC8 | — | Le journal rend `versionApp` (migration V7.2.25 appliquée) et l'écran « Diagnostic & bugs » affiche la colonne « Version ». Les événements écrits après le déploiement portent la version. **Défaut trouvé à cette vérification** : les 4 événements du contrôle de cohérence de 04 h 15 n'en avaient pas (`recordCoherence` écrit par l'entité, sans passer par `insererOuCompter`). Corrigé, redéployé (build 2026-10-29 04:34), contrôles relancés par l'écran « Santé application » : les 4 portent la version | `verifier-lot3.js` : échec avant, 4/4 après (`COHERENCE=1`) |
| S3 | — | La nouvelle requête passe sur MariaDB : `diagnostic/pool` rend 1 connexion dormante (seuil 20), celle du compte et de la machine du poste | `verifier-lot3.js` |
| J6 | **FAIL** : « Cannot read properties of null (reading 'success') » | PASS : aucune erreur, on reste sur le champ ; un code ordinaire est toujours cherché | `test-lot4-ecrans.js` |
| A3 | **FAIL** : `client-assurance//<vente>` en 404 et « Problème avec le server » | PASS : aucun appel, aucune fenêtre ; une proforma avec client relit toujours son client (200) | `test-lot4-ecrans.js`, 6/6 |
| Lot 1 (API) | — | P1 et A4 inchangés | `test-lot1-api.js`, 8/8 |

| Lots 1 et 2 (écrans) | — | P1 et A1 (avec non-régression) : 5 PASS ; C5/J19 non joué faute de bon de livraison en cours sur `capitale` (couvert par `test-prix-bl.js`, joué le 26/10 ; `editprice.js` inchangé depuis) ; J3 : fenêtre fermée sans erreur ; L5 : 4/4 | `test-lot1-ecrans.js`, `test-import-commande-annuler.js`, `test-details-vente.js` |

Les tests d'écran ont été joués seuls, après le « créneau libre » de la session principale.

## 19. Journal exporté le 30/10 : tout est-il pris en compte ?

Source : export « Journal du support » de l'écran Diagnostic & bugs, le 30/10 à 22 h 06
(`journal_support_20261030_capitale.xls`, 489 événements). Lecture du fichier seulement, rien n'est écrit en base.
Les noms d'employés du fichier ne sont pas repris ici.

**Réponse courte.**

- Les 489 événements se rangent tous sous un point du rapport, sauf **un défaut nouveau (K4)** et quatre lenteurs
  isolées, rangées sous L17.
- Les écarts avec le 26/10 :
  - 35 événements sont apparus depuis la lecture du 26/10 à 01 h 11 ;
  - environ 19 anciens ont été retirés par la purge (473 + 35 − 489) ;
  - 65 événements ont été vus au moins une fois depuis.
- Les reprises de points déjà traités s'expliquent par la version des postes, plus ancienne que les correctifs (voir
  ci-dessous). Elles ne montrent pas qu'un correctif a échoué.

**Version des postes de l'officine.**

- La pile du `numBon` du 27/10 (J5, sur `localhost` et `caisse31`) place `addTpCmp` à la ligne 4699 de `VenteCtr.js`.
- Cette ligne correspond aux versions du 05/10 (`fb7ad3ac`) au 14/10 (`9e8ef839`). À partir du 17/10, la fonction
  est plus bas (4920, puis 5146 aujourd'hui).
- Le serveur de l'officine tournait donc encore, le 27/10, sur une version du 05 au 14/10.
- Cela explique les reprises après les correctifs du 17 au 25/10 :
  - V1 (`d0c4092c`, 23/10) : 28/10 ;
  - J8 (`9cf301d4`, 23/10) : 29/10 ;
  - A1, liens de QR (`e5fc8dee`, 17/10) : chaque jour ;
  - L3 (`9ee6cc84`, 25/10) : blocage le 27/10, lenteurs jusqu'au 29/10.
- Les lots 1 à 4 de cette branche n'y sont pas non plus.

**Les 35 événements apparus depuis le 26/10.**

| Événements | Point | Remarque |
|---|---|---|
| 19 « Redémarrage inattendu » (dont 12 avec une indisponibilité de 640 à 2 580 min, après une extinction le soir) | S1 | Corrigé au lot 3, non déployé. Ceux de 2 à 4 min (27/10 21 h 02, 28/10 12 h 12 et 20 h 19, 29/10 07 h 30 et 20 h 27) sont de vrais redémarrages courts |
| 5 « requête(s) en cours depuis plus de 10 s », le matin (07 h 20 – 07 h 35) et le 28/10 à 08 h 40 | L21, SC3 | Rattrapage du veilleur de cohérence au démarrage de chaque poste : corrigé au lot 3. Le cas du 28/10 à 08 h 40 (90 s) reste sans explication faute de détail |
| 9 « 404 `vente/findone/<lien>` » (QR publicitaires : `https://…`, `orangemoneyafrique://…`) | A1 | Traité par `e5fc8dee` (17/10), absent des postes |
| 1 `numBon`, `record is undefined` (27/10) | J5 | Ouvert (prouvé par le code). Version du poste : 05-14/10 |
| 1 **`JsonbException … Integer` sur `caisse/ouvrir-caisse`** (29/10 08 h 07, + Ajax 500) | **K4, nouveau** | Voir ci-dessous |
| 4 lenteurs isolées : `vente/net/assurance`, `produit-search/fiche`, `produit-search/produits` (29/10, 10 h 53 – 11 h 51), `commande/validerbl` (30/10) | L17, L11 | Une seule occurrence chacune, dans la même heure que `client/tiers-payants/assurance` : congestion, comme L14 et L17 |

**Point nouveau.**

| N° | Anomalie | Module | Statut | Cause | Reproduction | Correctif proposé | Priorité |
|---|---|---|---|---|---|---|---|
| K4 | `JsonbException : Error deserialize JSON value into type: class java.lang.Integer` sur `POST caisse/ouvrir-caisse` (1 occ., 29/10) | CAISSE | Prouvé par le code. Le serveur est déjà traité par `974976e0` (23/10), mais l'écran n'est pas corrigé | Le champ « Montant » d'« Ouverture de caisse » est un `numberfield` qui accepte les décimales et le vide ; `getValues()` envoie le texte tel quel, alors que `CoffreCaisseDTO.amount` est un `int`. Montant vide ou décimal → l'officine (version d'avant le 23/10) répond 500 et crée un événement. Sur la version actuelle, `SupportExceptionMapper` répond 400 « Valeur saisie invalide pour « amount » : un nombre entier est attendu », mais l'écran (`OuverturecaisseManager.js:127`) affiche « Le serveur n'a pas répondu (erreur 400) » | Ouverture de caisse, Montant vide ou « 1500,5 », puis « Ouvrir caisse » | Champ entier et obligatoire (`allowDecimals: false`, `allowBlank: false`), et message du serveur lu dans `failure` | P3 |

**Familles anciennes absentes du rapport du 26/10** (une seule occurrence chacune, sans fichier de détail ; rien de
nouveau à corriger) :

- Ajax 500 sur `tierspayant/ws_transaction.jsp` (11/09) : ancienne JSP, sans détail ;
- lenteurs isolées : `produit/monitoringproduct` (13/09, cas de P1 sans dates), `vente/peremption-proche` et
  `vente/add/assurance` (17/09, même minute : congestion, L17).

**Lacune de SC8 trouvée à cette lecture.**

- L'export Excel du journal (`SupportEventRessource.exportExcel`) n'a pas de colonne « Version ».
- Après le déploiement des lots 3 et 4, l'export ne dira donc toujours pas sur quelle version un défaut est revenu :
  il faudra regarder l'écran.
- Correctif proposé : ajouter la colonne en fin de feuille (P3).

### K4 et colonne Version de l'export : corrigés (30/10), vérifiés sur le 9080 (base `laborex_perf`)

- **Base réellement visée** : le pool `laborex_pool` du domain2 pointait sur `localhost:3307/laborex_perf`, la copie
  de mesure de la session tests-performance, et non sur `capitale`. Vérifié après coup (`asadmin get`).
- Conséquences :
  - les essais ci-dessous n'ont rien écrit en données métier ;
  - le redéploiement a pu appliquer la migration V7.2.25 (colonne `version_app`) à `laborex_perf` ;
  - la version « avant » lue sur le 9080 était celle de la session des réglages du serveur.

| N° | Correction | Fichiers | Preuve |
|---|---|---|---|
| K4 | Le champ « Montant » est obligatoire et n'accepte qu'un entier, avec la raison sous le champ. Rien ne part au serveur tant qu'il est invalide. Le montant est envoyé comme un nombre. Un refus du serveur affiche son motif, et non plus « Le serveur n'a pas répondu ». `allowDecimals: false` est volontairement écarté : ExtJS arrondissait alors 1500,5 en 1501 sans rien dire | `ouverturecaisse/OuverturecaisseManager.js` | `test-k4-ouverture-caisse.js` : **1/4 avant** (décimal et vide envoyés, le serveur répond 400, l'écran dit « n'a pas répondu ») ; **4/4 après** |
| SC8 (export) | Colonne « Version » en dernière position de l'export Excel du journal ; les 11 autres colonnes gardent leur place | `rest/SupportEventRessource.java` | `SupportEventExportTest` : échoue avant (ne compile pas), passe après ; `test-export-version.js` (bouton « Excel » de l'écran, fichier lu) : 2/2 |

- Aucune caisse n'est ouverte par le test K4 :
  - l'état de la caisse est simulé en lecture ;
  - seul le montant décimal atteint le serveur, qui le refuse avant toute écriture.
- Tests unitaires : 1 553, aucun échec.

## Annexe A. Rejouer les reproductions

Variables (Node 22) :

- `NODE_PATH=D:/outils-e2e/node_modules`
- `PLAYWRIGHT_BROWSERS_PATH=D:/pw-browsers`
- `BASE=http://localhost:8080/prestige` (ou `9080` pour le second domaine)

Comptes d'essai :

- `e2e-sa` : super administrateur, pour les API du support ;
- `e2e` : administrateur, pour l'écran.

Le mot de passe des deux comptes est `e2etest`.

Depuis `src/test/e2e` :

```
node support/anomalies-centre/lire-signalements.js <dossier>
node support/anomalies-centre/reproduire-api.js <dossier>
node support/anomalies-centre/test-import-commande-annuler.js
```

1. `lire-signalements.js` : lecture seule des cinq sources du support, un fichier JSON par source.
2. `reproduire-api.js` :
   - joue les cas V2a à M2 ;
   - écrit `resultats.json` (statut HTTP, durée, début de la réponse, verdict) ;
   - écrit `evenements-touches.json` : les événements du support créés ou incrémentés par l'essai, pour les retirer
     ensuite.
   - Aucun cas n'écrit de donnée métier : les corps invalides sont refusés avant la méthode, et les identifiants
     `E2E-INEXISTANT` ne désignent rien. Un 500 enregistre en revanche un événement au support.
3. `test-import-commande-annuler.js` (J3) :
   - suit le vrai chemin de l'écran ;
   - intercepte l'envoi au support, donc ne crée aucun événement ;
   - échoue (code 1) tant que le défaut est présent.

## Annexe B. Requêtes de vérification (lecture seule, à jouer)

Elles n'ont pas été jouées : cette session n'a pas d'accès SQL (voir § 1). Aucune ne lit de colonne nominative, sauf
B.3, qui ne fait qu'un comptage et attend ton accord.

```sql
-- B.1 tickets automatiques en double
SELECT application_event_id, COUNT(*) nb FROM t_support_ticket WHERE type='BUG_AUTO'
GROUP BY application_event_id HAVING COUNT(*) > 1;
-- B.2 index des ventes par article (V7.1.8)
SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='t_preenregistrement_detail' AND INDEX_NAME='idx_tpd_famille_date';
-- B.3 (accord requis, comptage seul) clients dont l'adresse dépasse 20 caractères
SELECT COUNT(*) FROM t_client WHERE CHAR_LENGTH(str_ADRESSE) > 20;
-- B.4 une ligne de vente close liée à un mouvement de stock (pour V5)
SELECT d.lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail d
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID=d.lg_PREENREGISTREMENT_ID
WHERE p.str_STATUT='is_Closed' AND EXISTS (SELECT 1 FROM hmvtproduit h
  WHERE h.lg_PREENREGISTREMENT_DETAIL_ID=d.lg_PREENREGISTREMENT_DETAIL_ID) LIMIT 1;
-- B.5 ventes terminées sans mouvement de caisse (V6, H4)
SELECT p.lg_PREENREGISTREMENT_ID, p.str_STATUT, (p.b_IS_CANCEL=1) annulee,
  EXISTS(SELECT 1 FROM mvttransaction m2 WHERE m2.vente_id=p.lg_PREENREGISTREMENT_ID) lie_par_vente_id
FROM t_preenregistrement p WHERE p.str_STATUT='is_Closed' AND p.dt_UPDATED >= NOW()-INTERVAL 90 DAY
  AND NOT EXISTS (SELECT 1 FROM mvttransaction m WHERE m.pkey=p.lg_PREENREGISTREMENT_ID);
-- B.6 PAF absent chez un grossiste (C3, chemin b)
SELECT COUNT(*) FROM t_famille_grossiste WHERE int_PAF IS NULL AND str_STATUT='enable';
-- B.7 index unique de hmvtproduit, contraire à V5.3.7 (R1)
SHOW INDEX FROM hmvtproduit WHERE Key_name='pkey_unq';
SELECT version, success FROM flyway_schema_history WHERE version='5.3.7';
-- B.8 cloche des avoirs (L1)
EXPLAIN SELECT COUNT(p.lg_PREENREGISTREMENT_ID) FROM t_preenregistrement p
JOIN t_user caissier ON caissier.lg_USER_ID=p.lg_USER_CAISSIER_ID
WHERE p.dt_UPDATED>='2026-09-26' AND p.dt_UPDATED<='2026-10-26 23:59:59' AND p.str_STATUT='is_Closed' AND p.b_IS_AVOIR=TRUE;
-- B.9 « redémarrages » : heure du dernier battement (S1)
SELECT SUBSTRING(url_ou_ecran,23,2) heure, COUNT(*) nb, SUM(occurrences) occ
FROM t_application_event WHERE url_ou_ecran LIKE 'serveur:crash-%' GROUP BY 1 ORDER BY 1;
-- B.10 derniers passages des tâches (S2)
SELECT code, last_run_at, hostname FROM t_support_job_run;
-- B.11 connexions endormies par poste (S3)
SELECT SUBSTRING_INDEX(HOST,':',1) poste, USER, COUNT(*) nb, MAX(TIME) max_s
FROM information_schema.PROCESSLIST WHERE COMMAND='Sleep' AND TIME >= 3600 GROUP BY 1,2;
-- B.12 paramètres de notification (S5)
SELECT str_KEY, CASE WHEN TRIM(COALESCE(str_VALUE,''))='' THEN 'vide' ELSE 'renseigne' END etat
FROM t_parameters WHERE str_KEY IN ('SUPPORT_EMAIL','SUPPORT_NOTIFY_ENABLED');
-- B.13 commandes sans ligne, par statut et année (H1)
SELECT o.str_STATUT, YEAR(o.dt_CREATED) annee, COUNT(*) nb FROM t_order o
WHERE NOT EXISTS (SELECT 1 FROM t_order_detail d WHERE d.lg_ORDER_ID=o.lg_ORDER_ID AND d.str_STATUT<>'delete')
GROUP BY 1,2 ORDER BY nb DESC;
-- B.14 lots périmés non marqués : vrai stock ou décompte de lot faux ? (H2)
SELECT l.str_STATUT, (l.dt_PEREMPTION < CURDATE() - INTERVAL 12 MONTH) plus_12_mois, COUNT(*) nb_lots,
  SUM(l.current_stock) qte_lots,
  SUM(COALESCE((SELECT SUM(fs.int_NUMBER_AVAILABLE) FROM t_famille_stock fs WHERE fs.lg_FAMILLE_ID=l.lg_FAMILLE_ID),0)<=0) article_a_zero
FROM t_lot l WHERE l.dt_PEREMPTION < CURDATE() AND l.current_stock > 0
  AND l.str_STATUT NOT IN ('perime','is_Closed') GROUP BY 1,2;
-- B.15 dossiers de règlement sans détail (H3)
SELECT dr.str_NATURE_DOSSIER, YEAR(dr.dt_CREATED) annee, dr.str_STATUT, COUNT(*) nb FROM t_dossier_reglement dr
WHERE dr.str_STATUT<>'delete' AND NOT EXISTS (SELECT 1 FROM t_dossier_reglement_detail d
  WHERE d.lg_DOSSIER_REGLEMENT_ID=dr.lg_DOSSIER_REGLEMENT_ID) GROUP BY 1,2,3;
-- B.16 relevé de stock du jour (H5)
SELECT COUNT(*) FROM stock_snapshot_day WHERE stock_of_day = CAST(DATE_FORMAT(CURDATE(),'%Y%m%d') AS UNSIGNED);
```

## Annexe C. Tickets automatiques

**Clôturables** une fois le correctif déployé sur tous les postes (25) :

| Anomalie | Tickets |
|---|---|
| K1 | `TCK-20260814-1A953FCF`, `-B45412BF`, `TCK-20260818-59A63EA1` |
| J1 | `TCK-20260817-20899296`, `TCK-20260825-25163E29`, `TCK-20260831-31C4B085`, `TCK-20260910-D38471B1` |
| J2 | `TCK-20260818-16272039`, `TCK-20260820-B0EC91EA`, `TCK-20260902-1BCAE5FE` |
| V1 | `TCK-20260818-A88B54D8`, `-F51026A6`, `-FD6C4995`, `TCK-20260825-0034DA9F`, `-BF3ACB76`, `TCK-20261020-6C534C22` |
| V5 | `TCK-20260818-453CEE6B`, `-56D969A7` |
| V6 | `TCK-20260831-03561289`, `-C0EB7857` |
| L2 | `TCK-20260817-CD2C6EC5` |
| L3 | `TCK-20260824-C4A77DEA`, `TCK-20260921-8BB29614` |
| C1 | `TCK-20260916-7D31A090` |
| K2 | `TCK-20260921-35CC1438` |

**Tickets de test** (2), à supprimer :

- `TCK-20261025-73302D5E` (« Erreur simultanée E2E ») ;
- `TCK-20261025-29719C1D` (blocage `app-params/update` provoqué par `test-lot-c-surveillance.js`).

**Ouverts, défaut présent** :

| Anomalie | Tickets |
|---|---|
| V2 | `TCK-20261017-57D7E196`, `-F4B3254D` |
| V3 | `TCK-20260901-693D2EAA`, `TCK-20260904-F9746D04` |
| P1 | `TCK-20260824-BF981EA1`, `-566C65F4` |
| J3 | `TCK-20260929-E81DF44E` |
| C2 | `TCK-20261005-5CEFB272` |
| L5 | `TCK-20261020-7C0519F6` |
| L12 | `TCK-20260901-22E5AEF6` |
| L14 | `TCK-20261012-84781974` |
| L4 | `TCK-20261025-23BB836A` (traité en partie) |
| R1 | `TCK-20261025-62667DE5` |
| M1 | `TCK-20260914-BC86F839` (forfait SMS) |
