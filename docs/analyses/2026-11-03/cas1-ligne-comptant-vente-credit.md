# Cas 1 : ligne « au comptant » dans une vente à crédit — une saisie, deux tickets

Demande d'origine : [analyse_new.md](analyse_new.md), cas 1. Maquettes : [cas1-ligne-comptant.html](cas1-ligne-comptant.html)
(écran) et [cas1-tickets.html](cas1-tickets.html) (tickets).

## 1. L'existant

### Un seul écran pour les trois types de vente

- `view/vente/VenteView.js` (coquille, xtype `doventemanager`) + `view/vente/VenteVNO.js` (corps, 1 340 lignes) + `controller/VenteCtr.js`
  (10 587 lignes). Comptant (type 1), Assurance (2) et Carnet (3) partagent l'écran ; le sélecteur « Type » (`#typeVente`, segments)
  montre/cache le bandeau assurance `#assureContainer` et « PART ASSURANCE » `#montantTp`, et ramène la grille à 250 px.
- Modèle de ligne `model/caisse/VenteItem.js` : `intQUANTITY`, `intQUANTITYSERVED`, `intPRICEUNITAIR`, `intPRICE`, `calculationBasePrice`,
  `bISAVOIR`, `promotion`… **Aucun champ « hors assurance / comptant »** — ni dans `t_preenregistrement_detail`.
- Grille `#venteGrid` (VenteVNO.js l. 511-669) : LG (45 px) · C.CIP (flex 1) · DESIGNATION (flex 2,5) · QD · QS · P.U · P.REF (**cachée**) ·
  MONTANT (flex 1 chacun) · action 42 px. Colonne gauche en `flex:1`, rail de paiement fixe à 400 px.

### Modèle de données : identique pour comptant et crédit

| | Comptant | Crédit |
|---|---|---|
| Création | `POST v1/vente/add/vno` → `createPreVente`, `str_TYPE_VENTE="VNO"` | `add/assurance` → `createPreVenteVo`, `"VO"`, tiers-payant obligatoire, liens `t_preenregistrement_compte_client_tiers_payent` |
| Net | `net/vno` | `net/assurance` → `SalesNetComputingServiceImpl.calcule` → `TiersPayantCalculationService` |
| Clôture | `cloturer/vno` → `updateVenteClotureComptant` : `MvtTransaction VENTE_COMPTANT`, `int_CUST_PART = total − remise` | `cloturer/assurance` → `updateVenteClotureAssurance` : `int_PERCENT`/`int_PRICE` par tiers-payant, encours client / organisme, `addRecette` sur la part client seulement, `addTransaction(montantCredit = partTP)` |
| Ticket | `ticket/vno` | `ticket/vo` (un exemplaire par tiers-payant + reçu caisse) |
| Promotions | autorisées | retirées à la clôture |

- Le moteur (`TiersPayantCalculationService.calculateSaleItem`, l. 182-243) s'applique à **toutes** les lignes : base = (prix de référence
  ou P.U) × qté, part = base × taux par tiers-payant (par priorité), plafonds appliqués ensuite sur le total de la vente (`applyCeilings`),
  part client = `max(0, total − totalTP − remise)`, net arrondi au multiple de 5.
- **Aucun mécanisme pour scinder une vente** (`scinder`, `split`, `venteLiee` : rien). Existent : `transformerVente` (bascule d'une vente
  entière VO ↔ VNO, supprime les liens tiers-payant) et la **copie de vente** (`lg_PARENT_ID` + `copy`, `POST v1/vente/copy/{id}`) utilisée
  pour la modification — modèle possible pour une « vente liée ».
- Faux amis : `bool_ACCOUNT` (= pris dans le CA, comptant seulement), `to_be_exclude`/`vente_exclu` (organisme exclu de facturation),
  `sansBon` (vente entière). Rien de tout cela n'est une ligne hors assurance.

### Ticket

Impression Java2D directe (`ImpressionServiceImpl` implémente `Printable`) ; nouveau gabarit configurable `rest/service/ticket/ConversionTicket`
+ `ModeleTicket` (`VENTE`, `VENTE_ASSURANCE`, `VENTE_CARNET`…) via le menu « Modèles de ticket ». Lignes = `qté * désignation PU montant`
(**aucun taux ni part par ligne**), puis bloc tiers-payant (« Matricule Assuré », « Bénéficiaire », « Part du Client », une ligne
`NOM taux% :: montant` par tiers-payant), résumé (remise, net, règlements, versé, monnaie), code-barres `str_REF_TICKET`.

Les tickets de l'exemple fourni (taux et montant pris en charge **par ligne**, mention « LIGNE COMPTANT ») n'existent pas aujourd'hui.

## 2. Ce qui est possible : deux architectures

### Option A — Deux ventes liées, créées à la clôture (recommandée)

La saisie reste **une seule vente VO** à l'écran, avec une colonne à cocher « Comptant » par ligne (nouveau champ `comptant` sur
`t_preenregistrement_detail` et `VenteItem.js`). Le moteur de calcul ignore les lignes cochées (filtre dans `buildSaleItemInputs`) ; le rail
affiche en plus « DONT COMPTANT » et le net = part client (lignes assurance) + lignes comptant.

À la clôture (`cloturer/assurance`), **en une seule transaction JPA** :

1. les lignes cochées sont déplacées dans une **nouvelle vente VNO** (`str_TYPE_VENTE="VNO"`, même client, même vendeur, même caisse,
   `lg_PARENT_ID` → vente VO, nouveau champ `lien_vente` ou réutilisation de `lg_PARENT_ID` + un type de lien) ;
2. la vente VO est clôturée comme aujourd'hui sur les lignes restantes (`createPreenregistrementCompteClientTierspayant`, encours, recette,
   `MvtTransaction` VO) ;
3. la vente VNO est clôturée comme un comptant (`MvtTransaction VENTE_COMPTANT`, recette) ;
4. le règlement reçu est **réparti** : d'abord la vente comptant, puis la part client de la VO (ou l'inverse — Q1.3) ;
5. deux tickets : `ticket/vno` puis `ticket/vo` (et le reçu caisse), ou un ticket combiné (voir maquette).

Avantages : **aucune régression** sur les ventes existantes (le flag est à `0` partout) ; facturation tiers-payant, balance, journal de
caisse, statistiques, avoirs, annulations et réimpressions voient **deux ventes ordinaires**, chacune de son type ; l'exemple de l'autre
logiciel est reproduit (deux reçus). Inconvénients : le code de clôture (l. 2962-3197) doit être découpé pour réutiliser la clôture comptant
sans repasser par le contrôle « caisse ouverte / verrou » deux fois ; une annulation doit proposer d'annuler la vente liée (Q1.5).

### Option B — Une seule vente avec lignes exclues de l'assurance

Même colonne à cocher, mais la vente reste unique : les lignes cochées ont `int_PERCENT = 0` pour tous les tiers-payants, et leur montant va
intégralement dans `int_CUST_PART`. Un seul ticket (lignes marquées « COMPTANT »). Moins de code à la clôture, mais : la facture tiers-payant
(`FactureTiersPayant`, détail par ligne) doit **exclure** ces lignes ; le CA comptant / crédit des journaux et statistiques est faussé
(la vente est VO alors qu'une partie est comptant) ; les avoirs/retours sur une ligne comptant d'une vente VO sont ambigus. Beaucoup de
points de régression diffus. **Déconseillée.**

### Option C — Deux ventes dès l'ajout de la ligne

Créer la VNO liée au moment où l'on coche. Simple côté clôture, mais la grille devrait afficher deux stores, la mise en attente et la reprise
de pré-vente doivent gérer la paire, et décocher = redéplacer la ligne. Plus lourd à l'écran que A pour le même résultat.

## 3. Règles métier à trancher

| # | Question | Proposition |
|---|----------|-------------|
| Q1.1 | Les lignes comptant portent-elles la **remise** de la vente ? La remise crédit (`remiseSurPartClient`) et la remise comptant sont calculées différemment. | Remise appliquée seulement aux lignes assurance (part client) ; la vente comptant liée sans remise, sauf remise choisie explicitement. |
| Q1.2 | Les **promotions** (interdites en VO, retirées à la clôture) s'appliquent-elles aux lignes comptant ? | Oui dans la vente VNO liée (c'est un comptant) — mais à l'écran la vente est VO : le serveur devra accepter la promotion sur une ligne cochée. |
| Q1.3 | **Ordre d'imputation** du montant reçu : comptant d'abord, puis part client ? Et si le client paie moins que le total, laquelle reste impayée ? | Comptant d'abord (il n'y a pas de crédit possible dessus) ; la part client de la VO peut rester en différé comme aujourd'hui. |
| Q1.4 | **Un ou deux tickets** ? Deux reçus (comme l'exemple) ou un ticket combiné avec un bloc « LIGNES AU COMPTANT » ? | Deux tickets : le ticket VO (exemplaires tiers-payant) ne doit pas montrer les lignes comptant ; le ticket VNO sert de reçu. Plus un ticket client combiné facultatif (`KEY_TICKET_COMBINE`). |
| Q1.5 | **Annulation / modification** : annuler une des deux ventes annule-t-elle l'autre ? | Proposer d'annuler les deux (confirmation dans le bouton), sans obligation. |
| Q1.6 | Qui peut cocher ? Tout vendeur, ou un droit ? Une ligne cochée peut-elle être décochée après le calcul du net ? | Tout vendeur ; décochable tant que la vente n'est pas close. |
| Q1.7 | En **Carnet** (type 3) la même colonne a-t-elle un sens ? | Oui, même mécanisme (les carnets ne couvrent pas tout) — à confirmer. |
| Q1.8 | Numérotation : la vente VNO liée a-t-elle sa propre référence et son propre `str_REF_TICKET` ? | Oui (deux ventes ordinaires), avec mention « liée à <ref VO> » sur le ticket. |
| Q1.9 | Affichage par ligne sur le ticket crédit : montant · taux · pris en charge (comme l'exemple) — nouveau pour Prestige. Le veut-on pour toutes les ventes VO ? | Oui, via le modèle de ticket `VENTE_ASSURANCE` (optionnel par paramètre). |

## 4. Risques de régression

- **Clôture VO** (`updateVenteClotureAssurance`, 235 lignes, verrou `prendreVerrouCloture`, reprise `apresEchecCloture`) : tout découpage
  doit garder le verrou et la reprise. Tests : clôture VO sans ligne cochée = bit-à-bit identique (même `MvtTransaction`, mêmes
  encours, même ticket).
- **Moteur de calcul** : exclure des lignes change `total`, les plafonds (`applyCeilings` sur le total) et la répartition prorata
  (`partsClientParLigne`). Anomalies connues CR-05/06/07, CA-01 (`docs/notices/MECANISMES_CODE_VENTE_ASSURANCE_CARNET.md`) à ne pas
  aggraver.
- **`update/item/vno`** est utilisé pour modifier une ligne même en VO ; il doit préserver le flag.
- **Mise en attente / reprise de pré-vente** : le flag doit survivre (`deatails` + `VenteDetailsDTO`).
- **Facturation tiers-payant, balance âgée, journal de caisse, statistiques** : avec l'option A rien ne change (deux ventes normales) ;
  avec B, chaque écran est à revoir.
- **Ticket** : le gabarit Java2D est partagé par tous les types ; ajouter taux/pris en charge par ligne doit rester optionnel.
- **Stock** : `updateVenteStock` est appelé une fois par vente ; avec deux ventes, s'assurer qu'une ligne n'est déstockée qu'une fois (elle
  n'appartient qu'à une vente après le déplacement).

## 5. Ce qu'il faudrait toucher (option A)

| Couche | Fichier | Modification |
|--------|---------|--------------|
| SQL | migration Flyway | `t_preenregistrement_detail.comptant TINYINT(1) DEFAULT 0` ; `t_preenregistrement.lg_VENTE_LIEE_ID` (+ index) ; paramètres `KEY_LIGNE_COMPTANT_VO` (activation), `KEY_TICKET_COMBINE`. |
| Entités | `dal/TPreenregistrementDetail`, `dal/TPreenregistrement`, `VenteDetailsDTO`, `VenteDTO` | champs `comptant`, `venteLiee`. |
| REST | `rest/SalesRessource.java` | `PUT v1/vente/item/{id}/comptant {comptant}` ; `cloturer/assurance` renvoie les deux ids et les deux références. |
| Service | `SalesServiceImpl.updateVenteClotureAssurance` | extraction des lignes cochées → `scinderLignesComptant()` → clôture VNO liée ; répartition du règlement. |
| Calcul | `SalesNetComputingServiceImpl.buildSaleItemInputs` / `calcule` | ignorer les lignes `comptant`, ajouter `montantComptant` dans `MontantAPaye`. |
| Ticket | `GenerateTicketServiceImpl`, `ConversionTicket`, `ImpressionServiceImpl`, `ModeleTicket` | taux et pris en charge par ligne (optionnel) ; mention « Vente liée n° … » ; ticket combiné (optionnel). |
| ExtJS modèle | `model/caisse/VenteItem.js` | champ `comptant`. |
| ExtJS vue | `view/vente/VenteVNO.js` | checkcolumn « CPT » (46 px) visible seulement en type 2/3 ; ligne « DONT COMPTANT » dans le rail ; renderer de ligne (fond jaune pâle + pastille). |
| ExtJS ctrl | `controller/VenteCtr.js` | `checkchange` → PUT puis `net/assurance` ; clôture : impression des deux tickets ; affichage « 2 tickets imprimés ». |
| Annulation | écran d'annulation de vente | proposer la vente liée (Q1.5). |
| Affichage | `correctifs-affichage.js` | rien (pas de nouveau menu). |

Aucune JSP nouvelle ; aucune fenêtre : la case se coche dans la grille et la clôture reste sur « TERMINER LA VENTE ».
