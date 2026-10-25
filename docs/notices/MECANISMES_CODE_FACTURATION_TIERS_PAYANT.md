# Mécanismes à corriger dans le code — Facturation des tiers-payants

**Objet.** Document de transmission pour la branche/personne qui corrigera le
**code** de la facturation des tiers-payants : génération (provisoire,
définitive, groupe, carnet dépôt), suppression, numérotation, compteurs
d'encours, règlement des factures. **Aucune correction n'est appliquée ici.**

**Sources.** Analyse directe du code au commit `da68033e` de
`claude/new-session-xm8ptu` (il n'existe pas de rapport d'audit dédié à la
facturation : les rapports 02 et 04 ne la couvrent qu'en périphérie, leurs
points adjacents sont rappelés en fin de notice). Chaque constat ci-dessous est
adossé à une lecture ligne à ligne ; les fichiers principaux :
`GenererFactureServiceImpl.java`, `FacturationServiceImpl.java`,
`FacturationRessouce.java`, `ReglementFactureRessource.java`,
`bll/facture/reglementManager.java` (règlement, code historique).

**Acquis à préserver** (vérifiés — durcissements déjà en place) :
- la sélection des bons facturables (modes période/TP/type/groupe) filtre
  correctement : `unpaid`, ligne et vente closes, vente non annulée, montant > 0
  (`GenererFactureServiceImpl.java:238-246`, `:326-335`) ;
- la facture **définitive** marque les bons `charged` (`:601-602`, `:806-807`) ;
- la suppression de masse des provisoires **refuse** les définitives
  (`FacturationServiceImpl.java:655-689`) ; la suppression d'une facture de
  carnet dépôt refuse une facture réglée et **repasse les bons à `unpaid`**
  (`:731-790`) ;
- le menu carnet dépôt ne facture que des carnets dépôt, relus en base
  (`GenererFactureServiceImpl.java:517-528`) ; le tiers payant est relu dans la
  transaction (`:695-703`) ; le lot entier est généré dans une transaction
  utilisateur unique (`:692-737`).

---

## F1 — `DELETE /facturation/{id}` supprime n'importe quelle facture, sans aucune garde (critique)

**Analyse.** `FacturationRessouce.java:442-451` → `removeFacture`
(`FacturationServiceImpl.java:632-637`) : seul contrôle, la session. Ni statut
provisoire/définitive, ni règlement reçu, ni remise des bons à `unpaid`.
Supprimer une **définitive** : la facture disparaît mais ses bons restent
`charged` → ces ventes ne seront **jamais refacturables** (la part tiers payant
est perdue, elle n'apparaît plus dans aucune liste de facturation) ; si la
facture avait reçu des règlements, le dossier de règlement devient orphelin.
Contraste voulu ailleurs : `supprimerProvisoires` refuse les définitives,
`supprimerFacturesCarnetDepot` refuse une facture réglée et libère les bons.

**Reproduction (HTTP, session ouverte).** `DELETE /api/v1/facturation/<id d'une
facture définitive>` → 200 ; les bons de la facture restent `charged`
(requête : lignes `charged` dont le `str_REF` n'apparaît dans aucun
`t_facture_detail`).

**Correction proposée.** Dans `removeFacture` : refuser une facture non
provisoire (ou l'autoriser **uniquement** si `dblMONTANTPAYE = 0`, avec remise
des bons à `unpaid` et journalisation, comme le fait déjà la suppression carnet
dépôt) ; prévoir un privilège dédié.

**Vigilance.** Si des officines utilisent cette suppression pour corriger une
définitive erronée, leur donner le chemin propre (suppression contrôlée avec
libération des bons) en même temps que le refus, sinon blocage métier.

## F2 — Mode « BONS » : les lignes sélectionnées ne sont pas re-contrôlées (critique)

**Analyse.** `getSelectedBons` (`GenererFactureServiceImpl.java:217-231`)
charge les lignes **par identifiant**, sans re-vérifier `str_STATUT_FACTURE`,
le statut de la ligne, ni l'état de la vente — contrairement aux autres modes.
Depuis un écran périmé (ou deux postes), une ligne déjà `charged` peut être
mise sur une **seconde** facture définitive (l'organisme est facturé deux
fois), et une vente annulée entre l'affichage et la génération est facturée.
Utilisé par les trois générateurs (provisoire `:277`, définitive `:481`,
carnet dépôt `:510`).

**Correction proposée.** Re-filtrer en base les identifiants reçus avec les
mêmes prédicats que `findBonsByTierpayantId` (unpaid, close, non annulée,
montant > 0) et ignorer/rapporter les écartés.

## F3 — Génération : ni verrou sur les bons, ni numérotation sûre (critique)

**Analyse.** Deux générations simultanées du même périmètre (deux postes, ou
double clic sur un écran lent) lisent la même liste `unpaid` et créent **deux
factures portant les mêmes bons** : aucune ligne n'est verrouillée et le
marquage `charged` n'est relu nulle part dans la transaction. Par ailleurs le
compteur de numéros (`KEY_CODE_FACTURE`) est lu **avant** l'ouverture de la
transaction (`:665-667`) et réécrit en valeur absolue à la fin (`:735-736`) :
deux générations concurrentes produisent des **numéros de facture en double**
et l'un des incréments est perdu.

**Correction proposée.** Dans la transaction : recharger les lignes avec
`PESSIMISTIC_WRITE`, écarter celles qui ne sont plus `unpaid` ; compteur par
`UPDATE t_parameters SET str_VALUE = str_VALUE + n` (ou table de séquence), lu
après verrou.

**Vigilance.** Le verrouillage d'un gros lot (facturation mensuelle d'un grand
organisme) allonge la transaction : conserver le `flush/clear` périodique
(`:726-727`) et mesurer sur banc.

## F4 — Facture de groupe : les totaux brut/remise/forfaitaire sont perdus (critique, calcul)

**Analyse.** Dans l'agrégation du groupe (`:710-718`), les montants `double`
sont bien cumulés (`dblMONTANTRESTANT += ...`), mais les trois `BigDecimal`
sont appelés **sans récupérer le résultat** :
```java
dblMONTANTFOFETAIRE.add(facture.getDblMONTANTFOFETAIRE());   // résultat jeté
dblMONTANTREMISE.add(facture.getDblMONTANTREMISE());         // résultat jeté
totalBrut.add(facture.getDblMONTANTBrut());                  // résultat jeté
```
`BigDecimal` est immuable : la facture de groupe est enregistrée avec
**brut = remise = forfaitaire = 0** (`updateGroupInvoice`, `:645-657`), alors
que `MONTANTCMDE`/`MONTANTRESTANT` sont justes. Tout état ou bordereau de
groupe qui lit ces colonnes est faux.

**Reproduction.** Générer une facture définitive **avec groupe** sur deux
organismes : `t_facture` du groupe porte `dbl_MONTANT_Brut = 0`.

**Correction proposée.** `totalBrut = totalBrut.add(...)` (idem remise,
forfaitaire) ; reprise des factures de groupe déjà émises par recalcul depuis
leurs factures filles (`str_PERE`).

## F5 — La facturation remet des compteurs d'encours à zéro, globalement et asymétriquement (majeure)

**Analyse.** `updateInvoicePlafond` (`:456-470`), appelé pour **chaque** facture
définitive (`:721`) : la consommation mensuelle de **tous** les liens clients
non « absolus » du tiers payant est remise à 0 — même si la facture ne couvre
qu'une partie des bons ou de la période (mode BONS, période partielle) ; celle
du tiers payant lui-même n'est remise à 0 que s'il était **bloqué**
(`b_CANBEUSE = false`). Conséquences : des consommations légitimes (ventes non
facturées) sont effacées → plafonds sous-contrôlés ; et l'encours organisme
non bloqué n'est jamais purgé → cumul (voir CR-01/CA-04 : l'annulation
l'augmente déjà au lieu de le réduire). C'est aussi ce reset non daté qui rend
l'encours **non recalculable** depuis l'historique (limite déjà actée dans la
notice ventes assurance/carnet).

**Correction proposée.** Décrémenter les compteurs du **montant effectivement
facturé** par lien (et par organisme), au lieu d'une remise à zéro globale ;
ou, si la remise à zéro est le choix métier, la dater et l'appliquer
symétriquement (TP et liens), en la journalisant. À corriger **avec** A1 du
chantier ventes assurance/carnet — c'est le même compteur.

## F6 — Règlement de facture : code historique sans contrôles ni verrou (majeure)

**Analyse.** `POST reglement-facture` (`ReglementFactureRessource.java:272-352`)
délègue au code historique `bll/facture/reglementManager.makeInvoicePayment`
(`:1489+`) : transactions **manuelles** hors JTA (`dataManager`), seul contrôle
métier la caisse ouverte ; la ressource calcule
`finalamout = netAPayer <= amountRecu ? netAPayer : amountRecu` (`:316`) sans
refuser un montant **nul ou négatif** ; la facture n'est **pas verrouillée**
(`montantattendu = facture.getDblMONTANTRESTANT()` lu sans verrou, `:1510`) :
deux règlements simultanés de la même facture produisent un restant faux, et le
calcul du restant jongle avec le signe (`:578-585`). Le règlement « par
dossiers » réécrit aussi `int_PRICE_RESTE` et `str_STATUT_FACTURE` des lignes
de vente (`:1545+`) — mêmes colonnes que la clôture, sans synchronisation.

**Correction proposée.** Porter le règlement de facture dans un service
transactionnel moderne sur le modèle du règlement des différés : contrôles purs
avant toute écriture (montant > 0, ≤ restant de la facture, facture définitive
non soldée), verrou `PESSIMISTIC_WRITE` sur la facture et ses détails, rollback
complet sur échec, montants recalculés côté serveur.

**Vigilance.** Flux de caisse sensible et écrans historiques (form-encoded) :
garder la signature HTTP, tester les quatre natures de paiement existantes et
le règlement de groupe (`reglementGroupe`, même refonte).

---

## Points adjacents déjà portés par d'autres notices

- **CR-10** (rapport 02) : `removetp` sur une vente terminée fait disparaître
  des ventes de la facturation — corrigé par le chantier A6 de
  `MECANISMES_CODE_VENTE_ASSURANCE_CARNET.md`.
- **CR-07** : le taux enregistré à la clôture est celui du poste ; c'est lui
  qui est imprimé sur la facture (`invoiceDetail`, `:438`).
- **CA-09 / CA-10** : réaffectation de ventes clôturées et solde du carnet
  dépôt — chantiers A8/A9 de la même notice.
- **Modification d'une vente déjà facturée** : toujours **non couvert**
  (comme dans le rapport 02) — le chemin `updateclientortierpayant` ne contrôle
  pas la facturation ; à instruire avec A8.

## Critères d'acceptation

1. Chaque mécanisme d'abord reproduit par un test qui échoue (F1/F2 par appel
   HTTP, F3 par deux générations concurrentes sur banc, F4 par une facture de
   groupe, F6 par un règlement négatif puis deux règlements simultanés).
2. Invariants : un bon `charged` apparaît dans **exactement un**
   `t_facture_detail` de facture définitive ; numéros de facture uniques et
   croissants ; facture de groupe = somme de ses filles (brut, remise,
   forfaitaire, cmde, restant) ; règlements d'une facture ≤ son montant ;
   suppression d'une facture ⇒ ses bons redeviennent facturables ou la
   suppression est refusée.
3. Aucune régression sur les acquis listés en tête (filtres de sélection,
   gardes des suppressions provisoires/carnet dépôt, transaction de lot).
4. Reprise des données associée (à chiffrer avant correction, lecture seule) :
   bons `charged` sans facture (victimes de F1), bons présents sur deux
   factures (F2/F3), numéros de facture en double (F3), factures de groupe à
   brut nul (F4), règlements ≤ 0 (F6).
