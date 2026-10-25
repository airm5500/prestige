# Mécanismes à corriger dans le code — Vente assurance (VO) et vente carnet

**Objet.** Document de transmission pour la branche/personne qui corrigera le
**code** des ventes assurance (type 2, « VO ») et carnet (type 3). Les deux
partagent la même clôture (`updateVenteClotureAssurance`), la même annulation et
les mêmes compteurs : ils sont traités ensemble, par mécanisme.
**Aucune correction n'est appliquée ici.**

**Sources.** Rapports d'audit 02 (vente à crédit VO) et 04 (vente carnet et
suivi de compte) du 11/10/2026, audités au commit `8349d38d` —
**contre-vérifiés le 25/10/2026 ligne à ligne** au commit `2967314f` de
`claude/new-session-xm8ptu`. Les reproductions pas à pas et les requêtes de
vérification des rapports restent valides : elles ne sont pas recopiées ici.
Les volets purement mobiles (dépôt `prestige_vente_app`, absent ici) sont
repris des rapports sans re-vérification.

## État au 25/10 (commit `2967314f`)

| ID | Anomalie | État | Preuve (mes lignes, `SalesServiceImpl.java` sauf mention) |
|---|---|---|---|
| CR-08 | Vente annulée deux fois | **CORRIGÉ** (`9a954ba3`, 14/10) | verrou + `refusAnnulation` (`:419`, `:433-448`) — même correctif que VC-03 |
| CR-01 / CA-04 | Annulation : encours **augmenté** au lieu de réduit (organisme ordinaire) | **PRÉSENT** | `:655-666` : branche dépôt/exclu passe `(-1)*`, branche ordinaire appelle `updateClientAccount(cpClient)` (ligne positive) |
| CR-02 / CA-04 | Modification : ancienne part comptée deux fois | **PRÉSENT** | `annulerVenteAnterieur` → `clonePreenregistrementTp` → `updateCompteClientTiersPayantEncourAndPlafond(a)` (`:4885`, ligne d'origine positive) |
| CR-03 / CA-02 | Clôture refusée mais tiers payants déjà traités **validés** (pas de rollback), redébités à chaque essai | **PRÉSENT** | `:2650-2655` : `if (result.has("success")) return result;` sans `annulerClotureIncomplete()` ; boucle `:3150-3180` qui continue après un bon refusé |
| CR-04 / CA-05 | Encours et solde dépôt mis à jour **sans verrou** (écriture perdue entre deux caisses) | **PRÉSENT** | aucun `@Version` sur `TTiersPayant` ni `TCompteClientTiersPayant` (vérifié : 0) ; écritures absolues `setDbCONSOMMATIONMENSUELLE(get...+x)` ; `setAccount(get...±montant)` |
| CR-05 | Remise déduite deux fois : `montantRegle` sous-évalué, `montantTP` du snapshot faux | **PRÉSENT** | `:273` `montantClient = intCUSTPART − intPRICEREMISE` ; snapshot `:953` ; même formule au différé `:3064` |
| CR-06 | Remise > part client : parts + part client ≠ net | **PRÉSENT** | `TiersPayantCalculationService.java:249-251` (`patientPart.max(ZERO)`, part TP sur le brut) |
| CR-07 | Clôture enregistre taux/`tpnet`/`partTP` envoyés par le poste | **PRÉSENT** | `:3161-3162` et `:5880-5881` (`setIntPERCENT(params.getTaux())`, `setIntPRICE(params.getTpnet())`) |
| CR-09 | Taux hors 0-100 accepté (complémentaire web) | **PRÉSENT** | `addtierspayant` `:3294-3311` (`setIntPERCENT(params.getQte())` sans borne) |
| CR-10 | `removetp`/`addtp` sans contrôle d'état ; bon vide accepté dès qu'un autre est rempli | **PRÉSENT** | `removetierspayant` `:3329-3350` (`emg.remove(op)` sans `controleVenteModifiable`) |
| CA-01 | Multi-carnets (mobile) : somme des parts > montant de la vente | **PRÉSENT côté serveur** | `TiersPayantCalculationService.java:253-262` : la ligne 0 reçoit le **total**, les autres gardent leur part |
| CA-03 | Champ d'état dans l'EJB `@Stateless` : ventes « exclues » fantômes | **PRÉSENT** | champ `:201`, écrit `:3177`, lu à chaque clôture `:2733` (`carnetAsDepotService.create(..., this.getTiersPayant())`) |
| CA-06 | Règlement carnet dépôt : montant ≤ 0 accepté | **PRÉSENT** | `ReglementServiceImpl.java:432-441` (seul contrôle : montant ≤ solde) |
| CA-07 | Retour carnet non idempotent (stock + solde rejoués) | **PRÉSENT** | `RetourCarnetServiceImpl.java:88` (`setStatus("completed")` sans lire l'état) |
| CA-08 / CA-15 | Quantité de retour ≤ 0 acceptée ; motif absent → erreur 500 | **PRÉSENT** | `:120`, `:138`, `:151` sans contrôle |
| CA-09 | Changement de client/carnet d'une vente clôturée : encours/solde non suivis, pas de contrôle « facturée », bon non contrôlé | **PRÉSENT** | `updateCompteClientVenteCarner` (`:5388+`) : aucun appel aux compteurs ; contrôles limités caisse + somme des taux |
| CA-10 | Solde dépôt et relevé divergent après passage en dépôt | **PRÉSENT** | `CarnetDepotServiceImpl.java:269`, `:277` (`setIsDepot(TRUE)` sans initialiser `account`) |
| CA-12 | Retour carnet : historique de stock faux | **PRÉSENT** | `RetourCarnetServiceImpl.java:126-127` (`stockFinal = stock − qty` pour une entrée) |
| CR-11 / CA-11 / CA-13 / CA-14 + volets mobiles | Non re-vérifiables ici (dépôt mobile absent) | — | repris des rapports 02 et 04 |

**Acquis à préserver** (vérifiés) : verrou + idempotence de la clôture, refus
d'annulation (déjà annulée / non terminée / facturée), montants absents ou
négatifs refusés à la clôture, total en-tête = somme des lignes, rollback sur
exception, facturation limitée aux lignes closes `unpaid`.

---

## Chantiers de correction (groupés)

### A1 — Les compteurs d'encours : annulation et modification doivent **retirer** (CR-01, CR-02, CA-04)

Écrire une méthode de **décrément** (plancher à 0) symétrique à
`updateClientAccount`, et l'appeler à l'annulation (`:663`) et dans
`clonePreenregistrementTp` (`:4885`) pour les organismes ordinaires — la
branche dépôt/exclu le fait déjà avec `(-1)*`. Test : vente puis annulation →
encours inchangé ; modification → encours = nouvelle part.
**Vigilance :** la facturation remet l'encours à zéro
(`GenererFactureServiceImpl`) : décrémenter après une facturation intermédiaire
peut produire un négatif — d'où le plancher, et un rapport des cas planchés.

### A2 — Clôture tout-ou-rien (CR-03, CA-02)

Dans `createPreenregistrementCompteClientTierspayant` : une boucle de
**contrôle** de tous les tiers payants (bon libre, bon non vide si `sansBon`
faux, ligne présente sur la vente, taux 0-100) **avant** la première écriture ;
et dans la clôture, `annulerClotureIncomplete()` sur **tout** retour d'échec
(`:2650-2655`), pas seulement dans les `catch`.
**Vigilance :** après correction, un bon fautif annule toute la clôture — le
message doit nommer le tiers payant et le bon fautifs pour que la caissière
corrige en un geste.

### A3 — Compteurs sans verrou (CR-04, CA-05)

Remplacer lecture+écriture absolue par un **incrément SQL relatif**
(`UPDATE ... SET db_CONSOMMATION_MENSUELLE = db_CONSOMMATION_MENSUELLE + ?`,
idem `account`), ou verrou pessimiste pris dans un **ordre fixe**
(compte puis organisme).
**Vigilance :** si verrous, surveiller la latence aux heures de pointe et les
interblocages avec la clôture (qui verrouille déjà la vente).

### A4 — Champ d'état dans l'EJB sans état (CA-03)

Supprimer le champ `tiersPayant` (`:201`) : faire porter le tiers payant
dépôt/exclu par le **retour** de `createPreenregistrementCompteClientTierspayant`
et le passer en variable locale à `carnetAsDepotService.create` (`:2733`).
Correction sans risque métier ; test : vente ordinaire après une vente exclue
→ aucune ligne `vente_exclu`.

### A5 — Règles de calcul remise et multi-carnets (CR-05, CR-06, CA-01)

- `addTransaction` (VO) : utiliser `int_CUST_PART` tel quel (il contient déjà
  la remise) ; corriger `createAnnulleSnapshot` (`:953`) de la même façon.
- Remise : la plafonner à la part client (ou l'appliquer avant le calcul des
  parts) pour garantir **parts TP + part client = net** — test dédié.
- Branche CARNET du calcul (`TiersPayantCalculationService.java:253-262`) :
  répartir la remise sur les lignes au lieu d'écraser la ligne 0 par le total ;
  ou refuser plus d'un carnet sur une vente de type 3 (c'est la règle du web).

### A6 — Le serveur fait autorité sur les valeurs (CR-07, CR-09, CR-10, CA-06, CA-08, CA-15)

À la clôture, **recalculer** les parts côté serveur (`computeVONet`) et refuser
un `tpnet`/`partTP`/taux différent ; borner le taux 0-100 dans `addtierspayant`
et la clôture ; `controleVenteModifiable` en tête de `addtierspayant`/
`removetierspayant` (et `removetp` en POST/DELETE) ; exiger un bon par tiers
payant quand `sansBon` est faux ; refuser montant ≤ 0 au règlement carnet dépôt
et quantité ≤ 0 / motif absent aux retours.
**Vigilance :** le refus de `tpnet` différent doit comparer au calcul serveur
**avec plafonds** (un écart taux nominal/part écrêtée est légitime).

### A7 — Retours carnet : idempotence et historique (CA-07, CA-12)

`updateRetourCarnet` : lire le retour **sous verrou**, sortir si déjà
`completed` ; refuser toute écriture de ligne sur un retour clôturé. Historique :
`qteDebut` lu au moment de la clôture et `stock_final = initial + quantité`.

### A8 — Modification client/tiers payant d'une vente clôturée (CA-09)

Dans `updateCompteClientVenteCarner`/`clonePreenregistrementTp`
(modification) : retirer la part de l'ancien lien et l'ajouter au nouveau
(encours ou solde dépôt selon le type), refuser si une ligne n'est plus
`unpaid` (vente facturée), contrôler le bon (`boonDejaUtilise`).
Ce chantier rejoint `MECANISMES_CODE_ASSURANCES.md` (M2/M3 : ces mêmes chemins
créent les liens client↔tiers payant fautifs) : **à corriger ensemble**.

### A9 — Suivi du carnet dépôt (CA-10)

Dater le passage en dépôt et borner le relevé à cette date, ou initialiser le
solde d'ouverture au passage ; afficher le solde recalculé à côté du solde
stocké. La requête de contrôle solde/relevé du rapport 04 (CA-10) sert de
contrôle permanent après A1-A3.

### A10 — Volets mobiles (CR-07, CR-11, CA-01, CA-11, CA-13, CA-14)

À traiter dans `prestige_vente_app` : taux non modifiable après le premier
produit (ou transmis au serveur), un seul carnet par vente carnet, affichage de
`hasRestructuring`/`msg` et écran de paiement quand la part client > 0,
`removetp` au décochage, filtre du type dans l'historique. **Les refus serveur
de A2/A6 doivent être coordonnés avec les versions mobiles déployées** : un
serveur durci face à une appli ancienne transforme des ventes passantes en
refus — prévoir le message et la rétro-compatibilité.

---

## Corrigé depuis l'audit — à verrouiller par un test

**CR-08** (vente annulée deux fois) : corrigé par `9a954ba3`. Test de
non-régression : deux annulations successives et simultanées → refus « Vente
déjà annulée », stock inchangé (couvre aussi VC-03 du rapport 01).

## Critères d'acceptation

1. Chaque mécanisme d'abord **reproduit par un test qui échoue** (reproductions
   des rapports 02 §CR-xx et 04 §CA-xx), via le vrai chemin de l'écran, données
   retirées ensuite, tests un par un.
2. Invariants de banc : vente + annulation = encours et solde inchangés ;
   parts TP + part client = net, avec et sans remise, un ou deux tiers payants ;
   clôture refusée = **aucune** écriture ; deux clôtures simultanées du même
   organisme = somme des deux parts ; retour carnet rejoué = une seule écriture ;
   `qteDebut ± qteMvt = qteFinale` sur tout mouvement de retour.
3. Aucune régression sur les acquis listés en tête, ni sur la facturation
   (lignes retenues, remise à zéro de l'encours) — rejouer une facturation
   complète après A1.
4. La reprise des données d'encours/soldes ne peut être **que partielle** :
   l'encours n'est pas recalculable depuis l'historique (remises à zéro de
   facturation non datées, CR-04) — après déploiement, recaler les compteurs
   par une **facturation de régularisation** ou une remise à zéro arbitrée,
   site par site, et contrôler ensuite avec la requête CA-10.
