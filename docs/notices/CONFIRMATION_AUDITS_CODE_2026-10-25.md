# Confirmation des audits de code — 25/10/2026

**Objet.** Reprendre, constat par constat, les notices de transmission rédigées
sans correction :

- `MECANISMES_CODE_VENTE_COMPTANT.md` (VC-01 à VC-17) ;
- `MECANISMES_CODE_VENTE_ASSURANCE_CARNET.md` (CR-xx, CA-xx) ;
- `MECANISMES_CODE_FACTURATION_TIERS_PAYANT.md` (F1 à F6) ;
- `MECANISMES_CODE_ASSURANCES.md` (M1 à M6) ;
- `MECANISMES_CODE_DIFFERES.md` (D1 à D7, DIF-xx) ;
- et leurs notices de reprise `REPRISE_DONNEES_ASSURANCES.md` et
  `REPRISE_DONNEES_DIFFERES.md`.

Pour chaque constat : verdict au code actuel (fichier:ligne), confirmation par les
données de la copie de travail quand c'est possible, correction minimale, chemins
qui partagent le même code (risque de régression) et test d'écran qui doit d'abord
échouer. **Aucun code n'est corrigé ici.**

---

## 0. Ce qu'il faut retenir

1. **Tous les constats vérifiables côté serveur sont confirmés.** Deux étaient déjà
   corrigés (VC-03/CR-08 et VC-10), comme les notices l'indiquaient. Aucun constat
   n'est infirmé. Les numéros de ligne des notices sont justes à quelques
   exceptions près (§7).
2. **Les données de la copie confirment neuf constats** : ventes encaissées
   remises « en cours » (VC-02), dont une au total différent de sa transaction
   (VC-01) ; une clôture assurance refusée qui a gardé sa ligne tiers payant
   (CR-03) ; 31 bons facturés deux fois (F2) ; 17 numéros de facture en double
   (F3) ; 814 comptes à plusieurs RO, 353 carnets marqués RO (dont 172 créés en
   2026), 12 liens fantômes (M1 à M4) ; 12 stocks négatifs (VC-09) ; 8 lots
   sur-crédités de 1 412 unités (VC-11).
3. **La copie ne permet pas de tout mesurer.** Elle ne contient ni remise, ni
   différé, ni tiers payant exclu ou carnet dépôt, ni facture de groupe, ni retour
   carnet. Pour ces familles, le verdict repose sur le code. Les tests d'écran
   proposés devront les reproduire.
4. **Sept constats nouveaux** (§3). Deux touchent l'argent ou le stock : une
   annulation qui échoue en route reste à moitié enregistrée (N1) ; la remise est
   aussi retranchée deux fois de la **dette différée** d'une vente assurance (N3).
5. **Plan proposé** (§5) : d'abord un lot de gardes simples, à faible risque,
   qui stoppent l'argent faux (L1) ; ensuite les compteurs d'encours (L2) ; puis
   les liens d'assurance, qui se dégradent encore chaque mois (L3). Six décisions
   métier doivent être prises avant certains lots (§6).

---

## 1. Conditions de la vérification

**Code.** Worktree au commit `c42b174c` (= tête de `claude/new-session-xm8ptu`).
Aucun fichier audité n'a changé depuis les commits cités par les notices
(`81f5f2a1`, `2967314f`, `da68033e`, `910c18f6`, `a306c98a`) : `git diff --stat`
est vide sur `SalesServiceImpl`, `ClientServiceImpl`, `ReglementServiceImpl`,
`ReglementDiffereControle`, `GenererFactureServiceImpl`, `FacturationServiceImpl`,
`FacturationRessouce`, `ReglementFactureRessource`, `reglementManager`,
`TiersPayantCalculationService`, `RetourCarnetServiceImpl`,
`CarnetDepotServiceImpl`, `LotServiceImpl`, `MvtProduitServiceImpl`,
`CaisseServiceImpl`, `TransactionServiceImpl`, `TiersPayantParams`, `TLot`,
`FaireReglementCtr.js`. Les lignes citées ci-dessous sont celles du HEAD.

**Données.** Base `laborex_v1_db` (MariaDB 127.0.0.1), **lecture seule** (session
`READ ONLY`, aucune écriture). Aucune colonne nominative lue : uniquement des
comptages, des montants, des dates et des identifiants techniques. Contenu de la
copie : 476 272 ventes jusqu'au 24/10/2026 ; **aucune remise** (`t_remise` vide,
`int_PRICE_REMISE = 0` partout) ; **aucune ligne de différé**
(`t_preenregistrement_compte_client` vide, aucun mouvement de caisse de type
« règlement différé ») ; aucun tiers payant exclu ni carnet dépôt ; aucune facture
de groupe ; aucun retour carnet. Certaines lignes peuvent venir du banc peuplé
(`outils/banc/peupler_banc.py`). Les chiffres sont donc **indicatifs** et doivent
être remesurés site par site.

**Gravité.** Trois classes, comme demandé :
- **A** : argent ou stock faux (caisse, encours, facture, TVA, quantités) ;
- **D** : données incohérentes (liens, dates, historiques, numérotation) ;
- **Af** : affichage seulement.

---

## 2. Tableau récapitulatif

Légende des verdicts : **Confirmé**, **Confirmé (serveur)** (le volet mobile n'a
pas été revu), **Corrigé** (déjà corrigé avant cette vérification), **Non
vérifiable** (le code est dans le dépôt mobile, absent ici). « Lot » renvoie au
plan du §5. `SSI` = `SalesServiceImpl.java`, `CSI` = `ClientServiceImpl.java`,
`RSI` = `ReglementServiceImpl.java`, `GFSI` = `GenererFactureServiceImpl.java`.

### 2.1 Vente comptant

| ID | Constat | Verdict | Code au HEAD | Données de la copie | Grav. | Lot |
|---|---|---|---|---|---|---|
| VC-01 | Ligne d'une vente encaissée encore modifiable | Confirmé | `SSI:1615` sans contrôle d'état ; `controleVenteModifiable` (`:1771`) non appelé ; ressources `SalesRessource.java:528-533`, `VenteRessource.java:291-302` sans garde | 1 vente encaissée remise en cours dont le total (4 355) ≠ sa transaction (4 155), 16/11/2025 | A | L1 |
| VC-02 | « Terminer la prévente » remet une vente encaissée en cours | Confirmé | `SSI:5274-5281` écrit `is_Process` sans lire le statut | **4 ventes** VNO encaissées (14/11 → 01/12/2025) en `is_Process` avec transaction, `completion_date` postérieure à la transaction | A | L1 |
| VC-03 | Double annulation | **Corrigé** (`9a954ba3`) | verrou `SSI:409-410`, `refusAnnulation` `:433-447` | 62 ventes annulées deux fois (une, trois fois), toutes ≤ 2025 : aucune depuis le correctif | — | test |
| VC-04 | Origine annulée deux fois pendant une modification | Confirmé | `refusAnnulation` (`:433`) ignore la copie ouverte ; `annulerVenteAnterieur` `:4737` → `cloneVente` pose `b_IS_CANCEL` sans garde | non isolable des 62 cas ci-dessus | A | L4 |
| VC-05 | TVA doublée sur vente avec remise | Confirmé — **précision** : seules les lignes de produits « comptés » (`boolACCOUNT`) sont doublées | `SSI:3478` + `:3503` ; `:5169` + `:5193` | non mesurable (aucune remise) | A | L1 |
| VC-06 | Net sans `remiseId` : remise conservée puis déduite | Confirmé (serveur) | `SSI:3419-3424` ; déduction `:2930` | non mesurable | A | L5 |
| VC-07 | Remise enregistrée non arrondie ≠ net encaissé | Confirmé | `SSI:3514` vs `:3520-3521` ; `:5219` vs `:5226` | non mesurable | A | L5 |
| VC-08 | Client de la vente remplacé sans contrôle | Confirmé (serveur) | `SSI:4059-4071` : ni statut, ni client inconnu (`null` posé) | — | D | L1 |
| VC-09 | Stock négatif malgré `FORCER_STOCK_VENTE = 0` | Confirmé | `forcerStock` à la saisie seulement (`:1630`) ; clôture `:2889` ne rejoue que le détail | **12** lignes `t_famille_stock` négatives | A | L6 |
| VC-10 | Mouvement VENTE incohérent avec déconditionnement | **Corrigé** | `MvtProduitServiceImpl.java:228`, `:335` | — | — | test |
| VC-11 | Annulation : quantités rendues au mauvais lot | Confirmé | `SSI:977` → `LotServiceImpl.java:239-247` (liste des lots non périmés, sans filtre de stock, `TLot.java:32`) → `decrementerLots` `:280-296` crédite tout au premier lot | **8** lots avec `current_stock > int_NUMBER` (+1 412 unités) | A | L6 |
| VC-12 | Modification d'une vente passée : caisse antidatée, stock et recette du jour | Confirmé | `SSI:2970-2972` ; `cloneMvtTransaction` `:4891-4897` reprend les dates d'origine | — | A | L7 |
| VC-13 | Hors-ligne : date et caissier de la synchronisation | Confirmé (serveur) | caissier = utilisateur courant `:2844`, date du jour `:2971` | — | D | L7 |
| VC-14 | Prix et montants du poste pris tels quels | Confirmé | `controleMontantsCloture` `SSI:3872-3881` : absent ou négatif seulement | — | A | L5 |
| VC-15 | Choix de la ligne de stock non déterministe | Confirmé dans le code ; **sans effet sur la copie** | `findStock` `SSI:1016-1025` (ni statut, ni ordre) | index unique `un_stock_emp (lg_FAMILLE_ID, lg_EMPLACEMENT_ID)` présent sur la copie mais **dans aucune migration du dépôt** : 0 doublon ici, à vérifier site par site | A (selon site) | L6 |
| VC-16 | Mouvement de caisse antidaté : dates incohérentes | Confirmé | date saisie `CaisseServiceImpl.java:857`, `:882` ; transaction à `now()` `TransactionServiceImpl.java:184-186` | 2 804 mouvements, 0 écart (personne n'a antidaté sur la copie) | D | L7 |
| VC-17 | Historique mobile tronqué | Non vérifiable | dépôt mobile | — | Af | mobile |

### 2.2 Vente assurance (VO) et carnet

| ID | Constat | Verdict | Code au HEAD | Données de la copie | Grav. | Lot |
|---|---|---|---|---|---|---|
| CR-08 | Vente annulée deux fois | **Corrigé** (`9a954ba3`) | comme VC-03 | idem VC-03 | — | test |
| CR-01 / CA-04 | Annulation : encours **augmenté** (organisme ordinaire) | Confirmé | `SSI:655-666` : `updateClientAccount(cpClient)` `:663` ajoute la part positive ; `:5644-5661` | non recalculable (remises à zéro non datées, F5) | A | L2 |
| CR-02 / CA-04 | Modification : ancienne part comptée deux fois | Confirmé | `clonePreenregistrementTp` → `:4885` (ligne d'origine positive) | idem | A | L2 |
| CR-03 / CA-02 | Clôture refusée sans rollback, tiers payants déjà traités | Confirmé — **étendu** : même retour sans rollback sur la branche caution `:2645-2647` | `SSI:2650-2654` ; boucle `:3147-3185` qui continue après un bon refusé ; `catch` `:3197-3201` sans rollback | **1** vente VO restée `is_Process` (11/02/2026) portant une ligne tiers payant **close** de 1 208 F | A | L1 |
| CR-04 / CA-05 | Encours et solde dépôt sans verrou | Confirmé | `@Version` seulement sur `TFamilleStock` ; lecture + écriture absolue `SSI:5649-5652` | — | A | L2 |
| CR-05 | Remise déduite deux fois de la part client | Confirmé — **étendu** (N3) | `SSI:273` alors que `int_CUST_PART` est déjà net de remise (`SalesNetComputingServiceImpl.java:209-210`, `:261`, `:435`) ; snapshot `:952-953` | non mesurable (aucune remise) | A | L5 |
| CR-06 | Remise > part client : parts + part client ≠ net | Confirmé | `TiersPayantCalculationService.java:246-251` | 3 ventes VO (2025-2026) avec parts TP = 0 et part client = 0 pour 4 535 à 10 600 F : écart **d'une autre origine**, à instruire | A | L5 |
| CR-07 | Taux et `tpnet` du poste enregistrés | Confirmé | `SSI:3161-3162`, `:5880-5881` | — | A | L5 |
| CR-09 | Taux hors 0-100 accepté | Confirmé | `addtierspayant` `SSI:3311` | 0 taux hors bornes | A | L1 |
| CR-10 | `removetp`/`addtp` sans contrôle d'état | Confirmé | `SSI:3294-3326`, `:3329-3372` (deux variantes) | 0 VO close sans ligne TP | A | L1 |
| CA-01 | Multi-carnets : somme des parts > vente | Confirmé (serveur) | `TiersPayantCalculationService.java:252-262` : la ligne 0 reçoit le total | — | A | L5 |
| CA-03 | Champ d'état dans l'EJB sans état : ventes « exclues » fantômes | Confirmé | champ `SSI:201`, écrit `:3177`, lu `:2733` ; `CarnetDepotServiceImpl.create` ne vérifie pas que le tiers payant est sur la vente | non mesurable (aucun tiers payant exclu) | A | L1 |
| CA-06 | Règlement carnet dépôt ≤ 0 accepté | Confirmé | `RSI:441` (seul contrôle : ≤ solde) | table vide | A | L8 |
| CA-07 | Retour carnet non idempotent | Confirmé | `RetourCarnetServiceImpl.java:86-98` | table vide | A | L8 |
| CA-08 / CA-15 | Quantité ≤ 0 acceptée ; motif absent → erreur 500 | Confirmé | `:120`, `:138`, `:151` ; `em.find(…, null)` `:198` | — | A | L8 |
| CA-09 | Changement client/tiers payant d'une vente clôturée sans suivi des compteurs | Confirmé — **étendu** (N5) : vaut aussi pour la VO | carnet `SSI:5388-5440` ; VO `:5448-5518` ; seul contrôle : caisse + somme des taux `:4596-4610` | — | A | L3 |
| CA-10 | Solde dépôt et relevé divergent après passage en dépôt | Confirmé | `CarnetDepotServiceImpl.java:269`, `:277` | aucun carnet dépôt | D | L8 |
| CA-12 | Retour carnet : historique de stock faux | Confirmé | `stockFinal = stock − qté` `:127` pour une entrée ; `qteDebut` lu à la création du détail (`:126`) et réutilisé à la clôture (`:93`) | — | D | L8 |
| CR-11, CA-11, CA-13, CA-14 | Volets mobiles | Non vérifiable | dépôt mobile | — | — | mobile |

### 2.3 Facturation des tiers payants

| ID | Constat | Verdict | Code au HEAD | Données de la copie | Grav. | Lot |
|---|---|---|---|---|---|---|
| F1 | `DELETE /facturation/{id}` supprime une définitive | Confirmé | `FacturationRessouce.java:441-451` → `FacturationServiceImpl.java:632-637` | 0 bon `charged` sans facture | A | L1 |
| F2 | Mode « BONS » : lignes non recontrôlées | Confirmé | `GFSI:217-231`, appelé `:277`, `:481`, `:510` | **31 bons sur deux factures définitives** (ex. factures 589 du 01/08/2024 et 1166 du 09/12/2024) : refacturation d'un bon déjà `charged` | A | L1 |
| F3 | Génération : ni verrou des bons, ni numéro sûr | Confirmé | compteur lu `GFSI:665`, avant `begin` `:692`, réécrit en absolu `:735` | **17 numéros en double** (34 factures, 2024-2026), dont 10 sur une même matinée (01/05/2025, 10:34 et 10:38) | A (double facturation) / D (numérotation) | L7 |
| F4 | Facture de groupe : brut, remise et forfait perdus | Confirmé | `GFSI:712-714` (résultat de `BigDecimal.add` jeté) | aucune facture de groupe | A | L1 |
| F5 | Facturation : remise à zéro globale et asymétrique des encours | Confirmé | `updateInvoicePlafond` `GFSI:456-470`, appelé `:721` ; RAZ organisme seulement si bloqué | non recalculable | A | L2 |
| F6 | Règlement de facture : code historique sans contrôle ni verrou | Confirmé — **précision** : un trop-perçu (`restamount > 0`) n'est pas traité (`reglementManager.java:581-586`, même code `:1898+`) | `ReglementFactureRessource.java:315` ; `reglementManager.java:1496`, `:1511` sans verrou | 3 détails de règlement ≤ 0 ; aucune facture surpayée | A | L7 |

### 2.4 Assurances (liens client ↔ tiers payant)

| ID | Constat | Verdict | Code au HEAD | Données de la copie | Grav. | Lot |
|---|---|---|---|---|---|---|
| M1 | Créer un carnet pour un assuré remplace son assurance | Confirmé | `CSI:1331-1338` → `updateClientCarnet` `:1195-1200` ; RO forcé `:807` ; désactivation `:1209-1213` | **353** liens carnet RO actifs (41 en 2024, 140 en 2025, **172 en 2026**) | D | L3 |
| M2 | La vente empile les RO | Confirmé — **étendu** (N6) : 4e appelant `addNewTiersPayantToClient` `CSI:1451-1456` | `CSI:1403-1409`, `:1435-1440` ; appelants `SSI:5407`, `:5504` | **814** comptes avec plus d'un RO actif | D | L3 |
| M3 | Clonage d'un lien désactivé : fantômes | Confirmé | `CSI:1444-1448` ; appelant `SSI:5501` | **12** liens actifs à priorité < 1 ; doublons (compte, TP) actifs : 0 sur la copie | D | L3 |
| M4 | `updateTiersPayantPriority` rebascule le RO | Confirmé | `CSI:1858-1898` ; pré-cochage `TiersPayantParams.java:195`, `:255` | **142** comptes sans RO actif (hors carnet) ; **74** liens `delete` reclassés en priorité ≥ 1 | D | L3 |
| M5 | « Principal » = priorité au lieu de `b_IS_RO` | Confirmé (structurel) | `CSI:1010`, `TiersPayantParams.java:195`, `:255` | **847** RO actifs de priorité ≠ 1 | D | L3 |
| M6 | Défense en profondeur (audit) | Recommandation | — | — | — | L3 |

### 2.5 Différés

Aucune donnée de différé dans la copie : tous les verdicts reposent sur le code.

| ID | Constat | Verdict | Code au HEAD | Grav. | Lot |
|---|---|---|---|---|---|
| D1 / DIF-01 | Règlement pendant la modification ignoré | Confirmé | photo `SSI:4322` + `addDiffere` `:4442-4452` ; aucun contrôle de copie ouverte `ReglementDiffereControle.java:77-96` ; liste `RSI:189-242` | A | L4 |
| D1 / DIF-02 | Acompte retiré deux fois | Confirmé | `RESTE = PRICE − acompte` `SSI:2238-2240` ; `dejaRegle` `:3072-3073` ; contre-passation `:4761-4763` | A | L4 |
| D1 / DIF-03 | Changement de client : règlements ni reportés ni rendus | Confirmé | `memeClient` `:3070-3072` ; neutralisation `:3089-3095` | A | L4 |
| D2 / DIF-05 | Annulation d'une vente déjà réglée, sans contrepartie | Confirmé | `annulerVente` `SSI:588-709` : aucun contrôle des règlements ; ligne mise à 0 `:622-629` | A | L4 |
| D3 / DIF-06 | Un client sans différé vide la liste des règlements | Confirmé | `getSoldeByClient` `RSI:1023-1050` (jointure interne) ; NPE `:1093` ; liste vide `:1100-1103` | Af | L1 |
| D4 / DIF-04 | Le relevé compte l'acompte comme dû | Confirmé | `RSI:1151-1183` : débit `tp.int_PRICE`, crédit des seuls mouvements de type « 2 » | D | L9 |
| D5 | Ligne de dette choisie au hasard | Confirmé | `findOptionalCmt` `SSI:449-460` (`setMaxResults(1)` sans `ORDER BY`) | D | L4 |
| DIF-07 | Partiel : montant reçu et récapitulatif non contrôlés | Confirmé (appel direct seulement) | `RSI:777-791` ; `TransactionServiceImpl.java:244-250` | A | L9 |
| DIF-08 | Le règlement réécrit la « date de vente » | Confirmé | `RSI:862`, `:886` | Af | L9 |
| DIF-09 | Ventilation dans l'ordre des clics | Confirmé | `RSI:759` | D | L9 |
| DIF-10 | Valider à 0 F : rien, sans message | Confirmé | `FaireReglementCtr.js:508` (pas de `else`) | Af | L1 |
| D7 | Garde-fous en base (audit) | Recommandation | — | — | L4 |

---

## 3. Constats nouveaux (non cités par les notices)

| ID | Constat | Preuve | Grav. | Lot |
|---|---|---|---|---|
| N1 | **Annulation à moitié enregistrée.** Le `catch` de `annulerVente` répond « échec » sans annuler la transaction : tout ce qui a été écrit avant l'erreur reste validé. Exemple : un produit sans ligne de stock dans l'emplacement (`findStock` renvoie `null`) provoque une `NullPointerException` sur la ligne `familleStock.getIntNUMBERAVAILABLE()`. La vente est alors déjà annulée (`clonePrevente`), la ligne de dette mise à 0 et la transaction contre-passée, mais une partie du stock seulement est rendue. | `SSI:709-714` (pas d'`annulerClotureIncomplete()`, contrairement aux clôtures `:2746`, `:3006`) ; `findStock` `:1028-1030` | A | L1 |
| N2 | **Ouverture d'une modification sans contrôle d'état.** `modificationVenteCloturee` ne vérifie ni l'annulation, ni le statut, ni la facturation. `findByParent` cherche `lg_PARENT_ID = vente`. Or l'annulation (`clonePrevente`) et la contre-passation d'une modification (`cloneVente`) posent aussi ce champ. Sur une vente annulée, l'annulation est donc renvoyée comme « copie ». Sur une vente déjà modifiée, `getSingleResult` échoue (deux lignes) et une nouvelle copie est ouverte. L'écran masque le bouton pour une vente annulée (`VentesFinis.js:527`) : le défaut n'est atteignable que par appel direct ou depuis un écran périmé. | `SSI:4283-4291`, `:4305-4337` | D (puis A via VC-04) | L4 |
| N3 | **CR-05 touche aussi la dette différée.** Pour une vente assurance réglée en différé, la dette est `int_CUST_PART − remise`, alors que `int_CUST_PART` est déjà net de remise. La dette du client est donc sous-évaluée du montant de la remise. | `addDiffere` `SSI:2238-2239` ; `updateDiffere` `:3060-3061` | A | L5 |
| N4 | **Branche caution de la clôture VO sans rollback** (même nature que CR-03). | `SSI:2645-2647` | A | L1 |
| N5 | **Modification client/tiers payant d'une VO** : les anciennes lignes de tiers payant sont **supprimées** (`em.remove`), même si elles sont déjà facturées. Les nouvelles sont créées sans mise à jour d'encours, et rien n'est retiré à l'ancien organisme. | `SSI:5517` ; `createNewPreenregistrementCompteClientTiersPayant` sans compteur | A | L3 |
| N6 | **M2 a un quatrième appelant** : la création d'un tiers payant depuis la vente (`addNewTiersPayantToClient`) passe par `updateOrCreateClientAssurance(TClient, p, taux)`. Elle crée donc aussi un RO de plus. | `CSI:1451-1456` | D | L3 |
| N7 | **Règlement de différé : dates incohérentes** (même famille que VC-16). Le dossier et le mouvement de caisse portent la date choisie, mais la transaction est datée du jour. | `RSI:690`, `:775` ; `TransactionServiceImpl.java:254-256` | D | L7 |

---

## 4. Corrections par chantier

Chaque chantier donne : la correction **minimale**, les chemins qui passent par
le même code (à rejouer pour éviter une régression) et le test d'écran à écrire
**d'abord**. Ce test doit échouer avant la correction. Il passe par le vrai
chemin de l'écran, retire ses données, et se lance seul. La copie
`laborex_v1_db` est sauvegardée avant chaque série.

### L1 — Gardes oubliées et erreurs ponctuelles (faible risque, gain immédiat)

| ID | Correction minimale | Chemins à rejouer (régression) | Test d'écran à écrire d'abord |
|---|---|---|---|
| VC-01 | `controleVenteModifiable(detail.venteId)` en tête de `updateTPreenregistrementDetail` ; refus avec motif, sans erreur 500 | Vente comptant (`VenteCtr.js`), vente en dépôt (`VenteEnDepotCtr.js`, `DepotCtr.js`), proforma (`DevisCtr.js`, statut `devis`), prévente (`pending`), API mobile `v2/vente/update/item/vno`. `venteEnCours` accepte déjà `pending`/`devis` | `vente/test-vente-encaissee-immuable.js` : deux onglets sur la même vente ; l'un encaisse, l'autre change la quantité → refus attendu, ligne inchangée |
| VC-02 | `closePreventeVente` : verrou + refus si statut ≠ `pending` | Bouton « Terminer la prévente » (`VenteCtr.js`, `VenteEnDepotCtr.js`) ; vérifier le parcours prévente → encaissement → impression | même fichier, cas « prévente encaissée sur un poste, terminée sur l'autre » → refus, statut `is_Closed` conservé |
| VC-08 | `updateclient` : `controleVenteModifiable` + refus si client inconnu (ne jamais poser `null`) | Web (`VenteCtr.js`, `DevisCtr.js`, `VenteEnDepotCtr.js`) et **mobile**. L'appli mobile envoie le nom du mode de règlement avant chaque encaissement : livrer d'abord le seul refus « client inconnu », puis le contrôle d'état une fois l'appli corrigée | `vente/test-client-vente-encaissee.js` |
| CR-09 / CR-10 | Bornes 0-100 sur `addtierspayant` ; `controleVenteModifiable` en tête des trois méthodes `addtierspayant`/`removetierspayant` | Vente assurance web (`v1/vente/addtp`, `removetp`) et mobile (`v2/vente`) ; ajout d'une complémentaire en cours de vente (`test-deuxieme-assurance.js` à rejouer) | `vente/test-tiers-payant-vente-close.js` : `removetp` sur une VO close → refus, vente toujours facturable |
| CR-03 / N4 | `annulerClotureIncomplete()` sur **tout** retour d'échec de la clôture VO (`:2647`, `:2652-2653`) et dans le `catch` de `createPreenregistrementCompteClientTierspayant` ; contrôle de **tous** les bons avant la première écriture ; message nommant le tiers payant et le bon fautifs | Clôture VO et carnet, avec et sans bon (`sansBon`), avec caution ; modification d'une VO (copie) | `vente/test-cloture-vo-bon-refuse.js` : deux tiers payants, le second avec un bon déjà utilisé → refus, **aucun** encours modifié, aucune ligne close |
| CA-03 | Supprimer le champ `tiersPayant` ; la méthode renvoie le tiers payant exclu/dépôt, passé en variable locale à `carnetAsDepotService.create` | Clôture VO/carnet ; écrans « ventes exclues » et carnet dépôt | `carnet-depot/test-vente-exclue-fantome.js` : vente exclue puis vente ordinaire → aucune `vente_exclu` pour la seconde |
| F1 | `removeFacture` : refuser si `template` faux (définitive). Le chemin de suppression d'une définitive (privilège, libération des bons) est livré avec la décision §6 | Seul appelant : `FactureProvisoire.js:904`. La purge provisoire et la purge de nuit `JobCalendar` passent par `supprimerProvisoires` (déjà gardé) | `facturation/test-suppression-definitive.js` : écran provisoire resté ouvert, facture passée en définitive ailleurs → suppression refusée, bons `charged` |
| F2 | `getSelectedBons` : refiltrer en base avec les prédicats de `findBonsByTierpayantId` (`unpaid`, close, vente non annulée, montant > 0) et renvoyer les écartés | Trois générateurs : provisoire (`:277`), définitive (`:481`), carnet dépôt (`:510`). L'écran affiche le nombre de bons écartés | `facturation/test-bons-deja-factures.js` : générer en mode BONS une liste contenant un bon déjà `charged` → bon écarté |
| F4 | `x = x.add(...)` pour les trois `BigDecimal` (`GFSI:712-714`) | Factures de groupe, bordereaux et états de groupe (`ReleveGroupeFactureEtatTest` à rejouer) | `facturation/test-facture-groupe-totaux.js` : groupe de deux organismes → brut du groupe = somme des filles |
| VC-05 | Supprimer le second `montantTva.add` (`SSI:3503`, `:5193`) | Net à payer et clôture comptant (avec et sans contrôle des UG), mouvement de caisse (`montantTva`), états de TVA, ticket Z | `vente/test-tva-vente-remise.js` : vente avec remise et un produit « compté » → TVA de l'en-tête = somme des lignes |
| N1 | `annulerClotureIncomplete()` dans le `catch` de `annulerVente(TUser, TPreenregistrement)` ; refuser proprement si `findStock` renvoie `null` | Annulation web (`v1/vente` `:353`, `:399`), mobile (`v2/vente` `:224`) ; test `retours/test-annulation-vente-double.js` à rejouer | `retours/test-annulation-sans-ligne-stock.js` : produit sans ligne de stock dans l'emplacement → refus, vente **non** annulée |
| D3 | Solde absent = 0, nom lu sur `t_client` ; ne pas vider la liste sur une ligne fautive | Onglet « Liste des règlements » des différés, ses impressions | compléter `reglement/test-liste-reglements.js` avec un client réglé sans différé actif |
| DIF-10 | `else` : message « Saisissez le montant reçu » et focus | Écran « Faire un règlement » des différés | même fichier (ergonomie) |

### L2 — Compteurs d'encours (CR-01, CR-02, F5, CR-04)

Les quatre constats touchent le même compteur et se corrigent **ensemble** :

- une méthode de **décrément** symétrique à `updateCompteClientTiersPayantEncourAndPlafond`, avec plancher à 0 et journal des cas planchés, appelée à l'annulation (`SSI:663`) et dans `clonePreenregistrementTp` (`:4885`) ;
- des écritures en **SQL relatif** (`SET db_CONSOMMATION_MENSUELLE = db_CONSOMMATION_MENSUELLE + ?`, idem `account`), qui suppriment la perte d'écriture de CR-04 sans verrou long ;
- facturation : décrémenter du montant **facturé**, lien par lien et organisme par organisme, au lieu de la remise à zéro de `updateInvoicePlafond` (décision §6).

**Chemins à rejouer.** Clôture VO et carnet, annulation, modification, facturation
définitive (tous modes), règlement carnet dépôt (`payantExclusService`, mêmes
colonnes), plafonds (`PlafondsTiersPayantTest`) et calcul écrêté
(`TiersPayantCalculationServiceTest`).
**Tests d'abord.** `vente/test-encours-annulation.js` (vente puis annulation →
encours inchangé) ; `vente/test-encours-modification.js` ;
`facturation/test-encours-facturation-partielle.js` ; deux clôtures simultanées
du même organisme (`concurrence-`, sur le modèle de
`concurrence-derniere-boite.sh`) → somme des deux parts.

### L3 — Liens d'assurance (M1 à M4, N6, puis CA-09/N5, M5, M6)

Correction minimale, comme dans la notice, centrée sur
`createComptClientTierspayant` paramétrique (`CSI:1411`), point de passage de
`SSI:5407`, `:5501`, `:5504` et `CSI:1451` :
- un carnet n'est jamais RO (`:807` et la variante paramétrique) ;
- un lien RO désactive d'abord le RO actif du compte ;
- un seul lien par (compte, tiers payant), réutilisé ou réactivé ;
- jamais de priorité < 1.

Dans `updateCreateClientCarnet`, ne désactiver l'ancien lien que s'il est un
carnet. Dans `updateTiersPayantPriority` : liens actifs seulement ; aucune
correspondance ou carnet → ne rien toucher.

Implémentations de référence sur la branche `differe` (`8f1c21f5`, `2b12a292`,
`8b0eebf1`) : **à porter fichier par fichier, ne pas fusionner**.

CA-09/N5 ensuite, dans le même lot : refuser la modification si une ligne n'est
plus `unpaid` (vente facturée). Sinon, retirer la part de l'ancien lien et
l'ajouter au nouveau (encours ou solde dépôt), et contrôler le bon
(`boonDejaUtilise`).

**Chemins à rejouer.** Fiche client (création, changement d'assurance `CSI:1269`,
déjà correct), client carnet pur, vente carnet, vente assurance avec une et deux
complémentaires, « Modifier client / tiers payant » d'une vente terminée
(`journal/test-vente-changer-tiers-payant.js`), ajout d'un nouveau tiers payant
depuis la vente.
**Tests d'abord.** `client/test-carnet-ne-remplace-pas-assurance.js` (R1) ;
`client/test-ro-unique-modification-vente.js` (R2, R2bis) ;
`client/test-lien-desactive-pas-ressuscite.js` (R3) ;
`client/test-priorite-sans-bascule.js` (R4, avec des données sales : carnet en
priorité 1, liens `delete`). Critère d'acceptation : aucune nouvelle ligne pour
les requêtes B1, B3 et B4 de la reprise.

### L4 — Annulation et modification des ventes (VC-04, N2, D1, D2, D5, D7)

- `modificationVenteCloturee` (N2) : refuser une vente annulée, non close, ou
  dont une copie `copy = 1` est en cours. `findByParent` limité à `copy = 1`.
- `refusAnnulation` (VC-04, D2) : refuser si une copie `copy = 1` en
  `is_Process` pointe la vente, et si la ligne de dette porte des règlements
  (`t_dossier_reglement_detail.str_REF`).
- `annulerVenteAnterieur` (VC-04) : verrouiller l'origine ; sortir proprement si
  `b_IS_CANCEL = 1`.
- Règlement de différé (DIF-01) : refuser une ligne dont la vente a une copie
  ouverte (`lignesControle` `RSI:820-835` + `ReglementDiffereControle`).
- `updateDiffere` (DIF-02/03) : recalculer le « déjà réglé » à partir des
  règlements réels de la ligne d'origine, lue sous verrou, **sans l'acompte**.
  Changement de client avec règlements : suivre la décision §6.
- `findOptionalCmt` (D5) : `ORDER BY dt_CREATED` et avertissement s'il y a
  plusieurs lignes actives.

**Chemins à rejouer.** Abandon de modification (`DELETE copie/{id}`, `:4380-4395`,
qui doit lever le refus) ; clôture d'une copie comptant et VO ; annulation simple
sans règlement ; cycle complet clôture → règlement → modification → clôture de la
copie, avec et sans acompte ; `retours/test-differes-modification.js`,
`test-differes-reglement.js`, `test-differes-solde.js`.
**Tests d'abord.** `retours/test-annulation-pendant-modification.js` (VC-04) ;
`retours/test-differes-modification.js` **complété** par une vente avec acompte
et par un règlement fait pendant la modification (DIF-01/02/03) ;
`retours/test-annulation-vente-reglee.js` (D2). Invariant à vérifier : caisse
nette + dette restante = prix de la vente. Les triggers D7 viennent **après** D2.

### L5 — Le serveur fait autorité sur les montants (VC-06, VC-07, VC-14, CR-05, N3, CR-06, CR-07, CA-01)

- Net sans `remiseId` : remettre `int_PRICE_REMISE` à 0 ou appliquer la remise
  de la vente (VC-06).
- Enregistrer la remise **arrondie**, celle qui est affichée (VC-07).
- `addTransaction` (VO), `createAnnulleSnapshot`, `addDiffere` et
  `updateDiffere` : utiliser `int_CUST_PART` tel quel (CR-05, N3).
- Plafonner la remise à la part client (CR-06).
- Branche carnet : répartir la remise, ou refuser plus d'un carnet (CA-01).
- À la clôture : recalculer net, parts et taux (`computeVONet`) et refuser un
  écart au calcul serveur (plafonds compris, CR-07, VC-14).

**Chemins à rejouer.** Net à payer comptant, avec et sans contrôle des UG ;
vente VO avec et sans remise, avec plafond ; vente carnet ; ventes mobiles ;
`TiersPayantCalculationServiceTest`.
**Précaution.** Les refus serveur doivent être coordonnés avec les versions
mobiles déployées (§6) : livrer d'abord un mode « journaliser l'écart sans
refuser », puis le refus.
**Tests d'abord.** `vente/test-remise-comptant-net.js` (VC-06/07) ;
`vente/test-vo-remise-parts.js` (parts + part client = net, CR-05/06,
transaction et dette différée) ; `vente/test-cloture-montants-forges.js` (appel
de clôture avec `tpnet` et montant payé modifiés → refus).

### L6 — Stock et lots (VC-09, VC-11, VC-15)

- À la validation, rejouer `forcerStock` ligne par ligne, cumul par produit,
  avant toute écriture (place : `SSI:2889`, `:2613`).
- Annulation : recréditer les lots réellement sortis (`str_LOTS_SCANNES` et le
  lot de sortie à mémoriser), sinon le lot le plus récent, plafonné à
  `int_NUMBER`.
- `findStock` : ordre explicite. Ajouter une migration `un_stock_emp` **si
  absente** (elle existe sur la copie mais pas dans le dépôt), après un contrôle
  des doublons.

**Chemins à rejouer.** Vente détail avec déconditionnement
(`ui-caisse-deconditionnement.js`, VC-10 à garder), vente en dépôt d'extension,
annulation, modification, lots et péremption (`test-lots.js`,
`test-gs1-controle-lot.js`).
**Tests d'abord.** `stock/test-stock-negatif-deux-postes.js` (deux ventes
ouvertes sur la dernière boîte) ; `stock/test-annulation-lot-rendu.js`.

### L7 — Dates de caisse, numérotation et règlement des factures (VC-12, VC-13, VC-16, N7, F3, F6)

- **Dates.** Une seule règle pour toutes les écritures d'une même opération
  (décision §6). Refuser les dates futures. Pour les ventes hors-ligne, recevoir
  la date et le caissier de la vente.
- **F3.** Compteur lu **dans** la transaction, verrouillé (`SELECT … FOR
  UPDATE`) ou incrémenté en SQL relatif. Bons rechargés en `PESSIMISTIC_WRITE`,
  en écartant ceux qui ne sont plus `unpaid`. Garder le `flush/clear` périodique.
- **F6.** Service transactionnel : contrôles avant écriture (montant > 0,
  ≤ restant, facture définitive non soldée), verrou sur la facture et ses
  détails, rollback complet.

**Chemins à rejouer.** Ticket Z et récapitulatifs de caisse
(`caisse/test-ticketz.js`, `lot4/test-recap-caisse-modes.js`), mouvements de caisse
(`caisse/test-mvt-caisse.js`), règlement de facture simple et de groupe
(`reglementGroupe`), les quatre natures de paiement, le bordereau.
**Tests d'abord.** `caisse/test-mvt-caisse-antidate.js` ;
`facturation/test-generation-concurrente.js` (deux générations simultanées, en
banc) ; `facturation/test-reglement-facture-negatif.js`.

### L8 — Carnet dépôt et retours (CA-06, CA-07, CA-08/15, CA-12, CA-10)

Corrections :
- refuser un montant ≤ 0 au règlement de carnet dépôt (CA-06) ;
- `updateRetourCarnet` sous verrou, sortie si le retour est déjà `completed`
  (CA-07) ;
- refuser une quantité ≤ 0 et un motif absent (CA-08/15) ;
- historique de stock lu à la clôture : `stock_final = initial + quantité`
  (CA-12) ;
- dater le passage en dépôt et borner le relevé à cette date (CA-10).

**Chemins à rejouer.** Facturation carnet dépôt
(`carnet-depot/test-facturation-carnet-depot.js`), suivi du solde
(`diagnostic_solde_carnet_depot.sql`), retours carnet
(`journal/test-retour-carnet-code-encode.js`).
**Tests d'abord.** `carnet-depot/test-retour-carnet-rejoue.js`,
`carnet-depot/test-reglement-carnet-negatif.js`.

### L9 — Différés secondaires (D4, DIF-07, DIF-08, DIF-09)

Corrections :
- relevé : débiter la part réellement différée (prix − acompte), aligné avec la
  liste des clients, à l'écran, en PDF et en Excel (D4) ;
- partiel : refuser un montant reçu < montant payé et recalculer le
  récapitulatif côté serveur (DIF-07) ;
- afficher et filtrer sur la date de la vente (DIF-08) ;
- ventiler du plus ancien au plus récent (DIF-09).

**Tests d'abord.** `retours/test-differes-solde.js` complété (relevé = liste
des clients, avec acompte).

---

## 5. Plan de correction ordonné

L'ordre suit la gravité, puis le risque. Un lot est livré quand son test échoue
avant la correction et passe après, et que les tests des chemins listés passent
encore.

| Ordre | Lot | Contenu | Pourquoi à ce rang | Dépend de |
|---|---|---|---|---|
| 1 | **L1** | VC-01, VC-02, VC-05, VC-08 (client inconnu), CR-03/N4, CR-09, CR-10, CA-03, F1, F2, F4, N1, D3, DIF-10 | Corrections locales de quelques lignes, qui arrêtent de l'argent faux. F2 et VC-02 sont **prouvés en base** | rien ; F1 : décision 4 pour le chemin propre |
| 2 | **L2** | CR-01, CR-02, F5, CR-04 | Même compteur ; l'encours faux bloque ou débloque les plafonds | décision 5 |
| 3 | **L3** | M1 → M4, N6, CA-09/N5, puis M5, M6 | Données contaminées **en continu** (172 carnets RO créés en 2026) ; la reprise des assurances attend ce lot | L2 pour CA-09/N5 (compteurs) |
| 4 | **L4** | N2, VC-04, D2, D1, D5, puis D7 | Argent (caisse et dette) ; demande des décisions | décisions 1 et 2 |
| 5 | **L5** | VC-06, VC-07, VC-14, CR-05/N3, CR-06, CR-07, CA-01 | Argent, mais touche toutes les ventes avec remise et le mobile | décision 6 ; mode « journaliser » d'abord |
| 6 | **L6** | VC-09, VC-11, VC-15 | Stock ; à mesurer sur banc (latence de la validation) | rien |
| 7 | **L7** | VC-12, VC-13, VC-16, N7, F3, F6 | F3 et F6 : concurrence et code historique, refonte plus lourde | décision 3 |
| 8 | **L8** | CA-06, CA-07, CA-08/15, CA-12, CA-10 | Peu de sites concernés (aucun carnet dépôt sur la copie) | L2 |
| 9 | **L9** | D4, DIF-07, DIF-08, DIF-09 | Affichage et contrôles secondaires | L4 |
| 10 | Reprises | `REPRISE_DONNEES_ASSURANCES.md` (après L3) ; `REPRISE_DONNEES_DIFFERES.md` (après L4) ; requêtes VC/F du §8 | Corriger le code avant les données, sinon elles se recontaminent | lots correspondants |

Les tests de non-régression des points déjà corrigés (VC-03/CR-08, VC-10)
s'écrivent avec L1. `retours/test-annulation-vente-double.js` couvre déjà en
partie VC-03 : y ajouter « annulation d'une vente en cours » et « annulation
d'une copie d'annulation ».

---

## 6. Décisions métier à prendre avant certains lots

1. **DIF-03 (L4)** : vente différée déjà en partie réglée, modifiée pour un autre
   client ou payée autrement. Deux options : **refuser** (le plus sûr), ou
   reporter (avoir tracé + complément à encaisser).
2. **D2 (L4)** : annuler une vente différée déjà réglée. Deux options :
   **refuser** (le plus sûr), ou créer l'avoir ou le remboursement dans la même
   transaction.
3. **VC-12/13/16, N7 (L7)** : quelle date porte une opération de caisse ? La date
   de l'opération réelle, pour toutes ses écritures (recommandation du rapport 01),
   ou la date du jour de saisie ?
4. **F1 (L1)** : qui peut supprimer une facture définitive, et à quelles
   conditions ? Proposition : privilège dédié, facture non réglée, bons rendus
   `unpaid`, journal.
5. **F5 (L2)** : la facturation remet-elle les encours à zéro (règle actuelle,
   à dater et rendre symétrique) ou les diminue-t-elle du montant facturé
   (recommandé) ?
6. **L5 et VC-08** : calendrier de la version mobile. Un serveur durci face à une
   appli ancienne refuserait des ventes aujourd'hui acceptées.

---

## 7. Écarts relevés dans les notices sources

Ces écarts ne changent aucun verdict :
- `MECANISMES_CODE_VENTE_COMPTANT.md`, VC-01 : `:1796` n'est pas le contrôle du
  « retrait ». C'est `controleCalculNetAssurance`. Le retrait d'une ligne est
  contrôlé par `controleRetraitLigne` (`SSI:1724`), appelé par la ressource
  (`SalesRessource.java:505-522`). Le constat reste vrai : la **modification**
  de ligne n'a aucune garde.
- Même notice, VC-02 : `closePreventeVente` est en `SSI:5274-5281` (et non
  `:5304-5311`).
- `MECANISMES_CODE_DIFFERES.md`, D2 : `refusAnnulation` est en `SSI:433-447` (et
  non `:403-428`).
- `REPRISE_DONNEES_ASSURANCES.md`, analyse §3 : la variante à 4 arguments est en
  `CSI:1444-1448` (et non `:1904-1908`).
- `MECANISMES_CODE_ASSURANCES.md`, M2 : « trois appelants ». Il y en a quatre
  (N6).
- `MECANISMES_CODE_VENTE_ASSURANCE_CARNET.md`, CA-09 : présenté comme propre au
  carnet. Le chemin VO (`SSI:5448-5518`) a le même défaut, et supprime en plus
  des lignes déjà facturées (N5).

---

## 8. Requêtes de lecture utilisées (copie `laborex_v1_db`, lecture seule)

Aucune ne lit de colonne nominative. Elles peuvent servir de contrôle après
correction (la valeur attendue est 0 pour les nouvelles lignes).

```sql
-- VC-02 : ventes en cours portant une transaction
SELECT COUNT(DISTINCT p.lg_PREENREGISTREMENT_ID) FROM t_preenregistrement p
  JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID WHERE p.str_STATUT = 'is_Process';
-- VC-09 : stocks négatifs ; VC-11 : lots sur-crédités
SELECT COUNT(*) FROM t_famille_stock WHERE int_NUMBER_AVAILABLE < 0;
SELECT COUNT(*), SUM(current_stock - int_NUMBER) FROM t_lot WHERE current_stock > int_NUMBER;
-- VC-03/04 : ventes annulées plusieurs fois
SELECT COUNT(*) FROM (SELECT lg_PREENGISTREMENT_ANNULE_ID FROM t_preenregistrement
  WHERE lg_PREENGISTREMENT_ANNULE_ID <> '' GROUP BY 1 HAVING COUNT(*) > 1) x;
-- CR-03 : VO en cours portant une ligne tiers payant close
SELECT COUNT(DISTINCT p.lg_PREENREGISTREMENT_ID) FROM t_preenregistrement p
  JOIN t_preenregistrement_compte_client_tiers_payent t ON t.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID
  WHERE p.str_STATUT = 'is_Process' AND t.str_STATUT = 'is_Closed';
-- F2/F3 : bon présent sur plusieurs factures définitives
SELECT COUNT(*) FROM (SELECT d.str_REF FROM t_facture_detail d JOIN t_facture f ON f.lg_FACTURE_ID = d.lg_FACTURE_ID
  WHERE COALESCE(f.template, 0) = 0 GROUP BY d.str_REF HAVING COUNT(DISTINCT d.lg_FACTURE_ID) > 1) x;
-- F3 : numéros de facture en double
SELECT COUNT(*) FROM (SELECT str_CODE_FACTURE FROM t_facture GROUP BY 1 HAVING COUNT(*) > 1) x;
-- M1-M5 : liens client / tiers payant
SELECT COUNT(*) FROM (SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client_tiers_payant
  WHERE str_STATUT = 'enable' AND b_IS_RO = 1 GROUP BY 1 HAVING COUNT(*) > 1) x;            -- B1
SELECT COUNT(*) FROM t_compte_client_tiers_payant c JOIN t_tiers_payant t ON t.lg_TIERS_PAYANT_ID = c.lg_TIERS_PAYANT_ID
  WHERE c.str_STATUT = 'enable' AND c.b_IS_RO = 1 AND t.lg_TYPE_TIERS_PAYANT_ID = '2';      -- B3
SELECT COUNT(*) FROM t_compte_client_tiers_payant WHERE str_STATUT = 'enable' AND int_PRIORITY < 1;   -- B4
SELECT COUNT(*) FROM t_compte_client_tiers_payant WHERE str_STATUT = 'delete' AND int_PRIORITY >= 1;  -- M4
```
