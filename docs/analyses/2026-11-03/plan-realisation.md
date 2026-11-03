# Plan de réalisation — cas 1 à 3 (validé le 03/11/2026)

Base : les analyses [cas 1](cas1-ligne-comptant-vente-credit.md), [cas 2](cas2-prix-taux-reference-caisse.md),
[cas 3](cas3-ordonnancier-produits.md) (§0 « Décisions ») et les maquettes validées. Le cas 4 est repris après.
Rien de ce plan n'est codé ; il décrit l'ordre, les lots, les fichiers, les tests et les garde-fous.

## 1. Principes communs

- **Un paramètre par cas, désactivé par défaut** (`t_parameters`, valeur `0`) : `KEY_LIGNE_COMPTANT_VO`, `KEY_PRIX_REF_CAISSE`.
  Le cas 3 n'a pas de paramètre : il s'appuie sur `KEY_GERE_ORDONCIER` existant et sur une colonne à `0` partout.
- **Garde-fou de non-régression** : paramètre à `0` ⇒ aucune colonne créée dans la grille, aucun nouveau chemin serveur emprunté.
  Chaque lot livre d'abord un test qui prouve l'égalité « avant / après » avec le paramètre à `0`.
- **Une branche par cas**, partant de `integration/recette-2026-10-29` : `PRES-/ligne-comptant-vo`, `PRES-/prix-ref-caisse`,
  `PRES-/ordonnancier-produits`. Jamais de push sur `dev`, jamais de fusion ; l'intégration se fait par la session d'intégration.
- **Migrations Flyway** numérotées à la suite de `V7.2.32` : `V7.2.33__ordonnancier_produits_sensibles.sql`,
  `V7.2.34__prix_reference_journal.sql`, `V7.2.35__ligne_comptant_vo.sql`. Idempotentes (`IF NOT EXISTS`, procédure comme `V4.7.7`).
- **Règles du projet** : pas de JSP, pas de fenêtre surgissante (confirmation dans le bouton), aucun nouveau menu (rien à déclarer dans
  `correctifs-affichage.js`), tests par le vrai chemin de l'écran qui retirent leurs données, un test d'écran à la fois, build
  `mvn -o -q -DskipTests package` puis `asadmin redeploy` sur le domaine autorisé par la session d'intégration.
- **Banc** : les tests de non-régression de calcul (cas 1 et 2) rejouent les ventes assurance du banc peuplé (`outils/banc/peupler_banc.py`)
  et comparent le net au franc près ; la copie locale `laborex_v1_db` sert aux tests d'écran.

## 2. Ordre proposé

| Ordre | Cas | Pourquoi d'abord | Taille estimée |
|------:|-----|------------------|----------------|
| 1 | **Cas 3** Ordonnancier | Le plus petit, indépendant de la vente, corrige au passage la NPE de `checkOrdonnancier` ; sert de rodage aux tests d'écran | 2 à 3 jours |
| 2 | **Cas 2** Prix / taux de référence | Ne touche pas au moteur de calcul ; la journalisation (Q2.6) profite aussi à la fiche article | 3 à 4 jours |
| 3 | **Cas 1** Ligne comptant | Le plus risqué (clôture VO, tickets) ; bénéficie des tests de calcul posés par le cas 2 | 5 à 7 jours |

Les trois cas touchent `VenteVNO.js` / `VenteCtr.js` (cas 1 et 2) et `SalesServiceImpl` (cas 1 et 3) : **un seul cas à la fois** sur ces
fichiers, le suivant ne démarre que quand le précédent est livré sur sa branche, pour éviter les conflits.

## 3. Cas 3 — Ordonnancier : produits et produits sensibles

### Lot 3.1 Règle centralisée et colonne (serveur)

1. Test rouge : clôture d'une vente dont un produit a `is_scheduled = 1` et `int_T` NULL ⇒ NullPointerException dans
   `SalesServiceImpl.checkOrdonnancier` (l. 2542).
2. Migration `V7.2.33` : `ALTER TABLE t_famille ADD COLUMN IF NOT EXISTS is_sensible TINYINT(1) NOT NULL DEFAULT 0`.
3. `dal/TFamille.java` : champ `sensible` ; `FamilleDTO` recopie.
4. Méthode unique `TFamille.estProduitOrdonnancier()` = `sensible || (scheduled && isNotBlank(intT))`, appelée par
   `SalesServiceImpl.checkOrdonnancier` et `SalesStatsServiceImpl.produitsOrdonnancier` (l. 1381). Le test rouge passe au vert.
5. Test de non-régression : sur le banc, la liste des ventes du registre et le détail sont identiques avant / après (aucun produit sensible).

### Lot 3.2 Services REST

- `rest/FicheArticleRessource.java`, sous `v1/fichearticle/ordonnancier` (modèle `account*`) :
  - `GET` paginé : `query`, `filtre` (`coches` / `noncoches` / `tous`), `champ` (`ordonnancier` / `sensible`), `rayon` ; renvoie CIP,
    désignation, prix, stock, `scheduled`, `intT`, `sensible` ;
  - `PUT {id}` `{champ, valeur}` : écrit `is_scheduled` ou `is_sensible` ;
  - `PUT lot` `{query, filtre, champ, valeur, simuler}` : renvoie le nombre si `simuler`, applique sinon.
- Droit : `P_SM_ORDONNANCIER` (celui du menu) pour lecture et écriture (Q3.4).
- Journal d'audit existant : une ligne « produit X coché/décoché sensible/ordonnancier par U » (Q3.5), sans donnée patient.

### Lot 3.3 Écran Ordonnancier

- `view/vente/Ordonnancier.js` (tabpanel l. 167-299) : deux onglets « Produits ordonnancier » et « Produits sensibles », chacun bâti sur
  le gabarit `configmanagement/famille/Products.js` (recherche, filtre, compteur, cochage unitaire enregistré au clic, boutons de lot en
  deux temps « Cocher N produits ? » → « Confirmer » dans le bouton). Onglet ordonnancier : badge « SANS CODE TABLEAU » quand `intT` vide.
- Barre de filtres commune (dates / médecin) masquée sur ces deux onglets au `tabchange`, rétablie sur Registre / Analyse.
- `controller/OrdonnancierCtrl.js` : chargement à la demande dans `surChangementOnglet`, handlers recherche / checkchange / lot.
- `app/model/Famille.js` : champ `sensible`.

### Lot 3.4 Vente et éditions

- Pastille sur la ligne de vente (`VenteVNO.js` renderer DESIGNATION ou colonne LG) : « ORDONNANCIER » fixe, « SENSIBLE » clignotante
  (3 pulsations puis fixe, `prefers-reduced-motion` ⇒ contour fixe). Le JSON de recherche produit renvoie déjà `scheduled`
  (`SearchProduitServcieImpl` l. 741/871) : ajouter `sensible` et `intT`. CSS dans `vente-theme.css`.
- Colonne « Motif » (Ordonnancier / Sensible) : `OrdonnancierLigneDTO`, `DetailProduitsVente.js`, `ordonnancier.jrxml`,
  `analyse_ordonnancier.jrxml`.

### Tests d'écran (un par un, données retirées)

1. Cocher un produit « sensible » dans l'onglet, l'ajouter à une vente comptant avec `KEY_GERE_ORDONCIER = 1` ⇒ pastille clignotante,
   clôture exige un médecin, la vente apparaît au registre avec motif « Sensible » ; décocher ⇒ tout redevient comme avant.
2. Produit ordonnancier sans code tableau ⇒ badge dans l'onglet, pas de médecin exigé (règle conservée), pas de plantage.
3. Cochage en lot sur un filtre : le bouton affiche le compte, confirme, applique ; « Décocher » remet l'état initial.

## 4. Cas 2 — Prix et taux de référence à la caisse

### Lot 2.1 Journal et services (serveur)

1. Migration `V7.2.34` : table `prix_reference_journal` (id, prix_reference_id, produit_id, tiers_payant_id, action
   AJOUT/MODIFICATION/SUPPRESSION, ancienne_valeur, nouvelle_valeur, ancien_taux, nouveau_taux, ancien_type, nouveau_type, utilisateur_id,
   date, vente_id origine NULL, poste) ; paramètre `KEY_PRIX_REF_CAISSE = 0`.
2. `PrixReferenceServiceImpl` : journalisation dans `add` / `update` / `delete` (fiche article **et** caisse, Q2.6) ; test unitaire : une
   ligne de journal par action, anciennes valeurs correctes.
3. `rest/PrixReferenceRessource.java` :
   - `GET v1/prix-reference/vente/{venteId}` : par ligne × tiers-payant de la vente `{detailId, tpId, libelle, valeur, taux, type,
     defaut:true/false, partTp}` ; `defaut` = aucune ligne `prix_reference`, valeur = prix de vente, taux = taux du compte client ;
   - `PUT v1/prix-reference/vente/{venteId}/ligne/{detailId}` `{tiersPayantId, valeur, taux}` : bornes serveur (entier, valeur 5..prix de
     vente, taux 5..100, 400 sinon), écrit `MIX_TAUX_PRIX` (Q2.3), journalise avec `vente_id`, relance le calcul du net et renvoie le net.
   - Refus 403 si `KEY_PRIX_REF_CAISSE = 0` (le chemin n'existe pas sans le paramètre).
4. `VenteDetailsDTO` : liste `referencesTp` (uniquement si paramètre actif, pour ne pas alourdir `deatails` sinon).
5. **Moteur inchangé** : `SalesNetComputingServiceImpl` et `TiersPayantCalculationService` ne sont pas touchés. Test de non-régression :
   net identique au franc près sur les ventes assurance du banc, paramètre à `0` puis à `1` sans saisie.

### Lot 2.2 Grille de vente

- `model/caisse/VenteItem.js` : champ `referencesTp`.
- `view/vente/VenteVNO.js` : si paramètre actif **et** type 2, colonnes groupées par tiers-payant (en-tête = libellé → P.REF | TAUX,
  70 px chacune), C.CIP fixé à 80 px, DESIGNATION `minWidth`, défilement horizontal au-delà de deux tiers-payants. Valeurs par défaut en
  gris italique. Les colonnes sont reconstruites à chaque changement de tiers-payants de la vente (ajout / retrait).
- `controller/VenteCtr.js` : `beforeedit` (type 2 et paramètre seulement), validation locale des bornes (cellule rouge + message sous la
  grille + ancienne valeur rétablie, **aucun appel serveur**), `edit` validé par Entrée ⇒ `PUT .../ligne/{detailId}` puis rafraîchit le
  net ; interception **avant** `onGridEdit` (l. 4082) pour qu'aucun `update/item/vno` ne parte. Retour du focus au champ produit.
- Libellé discret sous la grille rappelant la règle du minimum tant que le lot Q2.5 n'est pas livré.

### Lot 2.3 Fiche article

- `view/produits/PrixReference.js` : onglet ou grille « Journal » en lecture (`GET v1/prix-reference/{produitId}/journal`). Rien d'autre.

### Tests d'écran

1. Vente assurance à un tiers-payant, paramètre actif : saisir P.REF puis TAUX par Entrée ⇒ net recalculé, ligne `prix_reference`
   `MIX_TAUX_PRIX` créée, journal `AJOUT` avec la vente ; corriger ⇒ `MODIFICATION` ; supprimer en fiche ⇒ `SUPPRESSION`.
2. Saisies refusées (4, 101, prix > prix de vente, texte) ⇒ cellule rouge, valeur rétablie, aucune requête réseau.
3. Vente comptant et vente avec paramètre à `0` ⇒ grille identique au pixel (capture comparée).
4. Vente à deux tiers-payants ⇒ deux groupes, défilement, saisie sur le second écrit bien pour ce tiers-payant.

### Lot séparé Q2.5 (hors périmètre, à ouvrir après)

« Base de calcul par tiers-payant » dans `TiersPayantCalculationService.calculateSaleItem` (l. 191-193) avec jeu de ventes
multi-tiers-payants avant / après et annonce aux officines.

## 5. Cas 1 — Ligne au comptant dans une vente assurance

### Lot 1.1 Modèle et calcul (serveur)

1. Migration `V7.2.35` : `t_preenregistrement_detail.comptant TINYINT(1) NOT NULL DEFAULT 0` ; `t_preenregistrement.lg_VENTE_LIEE_ID
   VARCHAR(…) NULL` + index ; paramètre `KEY_LIGNE_COMPTANT_VO = 0`.
2. Entités `TPreenregistrementDetail`, `TPreenregistrement`, DTO `VenteDetailsDTO` (`comptant`), `VenteDTO` (`venteLiee`).
3. REST `PUT v1/vente/item/{id}/comptant {comptant}` (`SalesRessource`) : refus si type ≠ 2, si vente close, si paramètre à `0`, si la
   ligne porte une promotion (Q1.2) ; `update/item/vno` **préserve** le flag ; la mise en attente / reprise le conserve.
4. `SalesNetComputingServiceImpl.buildSaleItemInputs` : les lignes `comptant` sortent des entrées du moteur ; `MontantAPaye` reçoit
   `montantComptant` (somme P.U × qté des lignes cochées, remise produit comprise, Q1.1) ; net = part client + comptant. Le moteur
   (`TiersPayantCalculationService`) n'est pas modifié.
5. Test de non-régression : paramètre à `0` ou aucune ligne cochée ⇒ `calcule` renvoie exactement le même résultat qu'avant (banc).

### Lot 1.2 Scission à la clôture

1. Dans `updateVenteClotureAssurance` (l. 2962-3197), un seul point d'entrée : si paramètre actif **et** au moins une ligne cochée ⇒
   `scinderLignesComptant(vente)` ; sinon le code actuel, inchangé, s'exécute.
2. `scinderLignesComptant`, dans la transaction de clôture, sous le verrou `prendreVerrouCloture` déjà pris :
   - crée une vente VNO (même client, vendeur, caisse ; `lg_VENTE_LIEE_ID` ↔ réciproque), y déplace les lignes cochées (une ligne
     n'appartient qu'à une vente ⇒ déstockage unique) ;
   - clôture la VO sur les lignes restantes par le code actuel ;
   - clôture la VNO par `updateVenteClotureComptant` (sans reprendre le contrôle caisse / verrou) ;
   - impute le règlement : comptant d'abord, puis part client de la VO (Q1.3) ; la part client restante suit la règle actuelle (différé).
   - La reprise `apresEchecCloture` couvre les deux ventes (annulation complète si l'une échoue : une seule transaction JPA).
3. `cloturer/assurance` renvoie les deux ids et références.
4. Annulation / modification : rien (Q1.5) ; le détail de vente affiche « vente liée n° … » en lecture.
5. Tests : clôture VO sans ligne cochée ⇒ mêmes `MvtTransaction`, encours, recette, ticket (comparaison de lignes en base) ; clôture avec
   ligne cochée ⇒ deux ventes, stock décrémenté une fois par ligne, journal de caisse et facturation tiers-payant voient deux ventes
   ordinaires ; échec simulé pendant la clôture VNO ⇒ aucune des deux ventes n'est close.

### Lot 1.3 Tickets

- `ModeleTicket.VENTE_ASSURANCE` : lignes « Crédit : T[taux %] — Mont. : part » par ligne et par tiers-payant (Q1.9), uniquement si
  `KEY_LIGNE_COMPTANT_VO = 1` ; sans mention de la vente comptant.
- Nouveau modèle `ModeleTicket.VENTE_MIXTE` = ticket client combiné (deux ventes, lignes « LIGNE COMPTANT », un seul code-barres sur la VO,
  référence de la vente liée). `GenerateTicketServiceImpl`, `ConversionTicket`, `ImpressionServiceImpl`.
- `ticket/vo` imprime : exemplaires tiers-payant (assurance) + reçu caisse existant + ticket combiné à la place du ticket client simple
  quand il y a une vente liée. Test : rendu texte des trois tickets comparé à une référence.

### Lot 1.4 Écran

- `VenteItem.js` : champ `comptant`.
- `VenteVNO.js` : checkcolumn « C » 40 px créée **seulement si** paramètre actif, visible en type 2 seulement (cachée en 1 et 3, Q1.7) ;
  ligne cochée fond jaune pâle + pastille COMPTANT ; rail « DONT COMPTANT » et « DONT PART CLIENT ».
- `VenteCtr.js` : `checkchange` ⇒ PUT puis `net/assurance` ; promotion refusée sur une ligne cochée et case désactivée sur une ligne en
  promotion ; après clôture, bandeau « 2 ventes créées : VO-… et VNO-… » (toast, pas de fenêtre) ; impression des tickets.

### Tests d'écran

1. Paramètre à `0` : écran de vente assurance identique au pixel, clôture inchangée.
2. Paramètre à `1`, vente à un tiers-payant, une ligne cochée avec remise 5 % : rail DONT COMPTANT / DONT PART CLIENT, clôture ⇒ deux
   ventes, deux tickets, imputation comptant d'abord ; annuler la VNO ne touche pas la VO.
3. Cocher une ligne en promotion ⇒ refus visible ; passer en type Carnet ⇒ colonne cachée.
4. Mise en attente puis reprise ⇒ la coche survit.

## 6. Livraison et recette

- Chaque cas : branche, tests verts (unitaires + écran), capture avant / après avec le paramètre à `0`, note dans
  `docs/notices/` (règles, paramètre, journal), puis remise à la session d'intégration.
- Recette officine : activer le paramètre sur un poste pilote seulement, une semaine, avant généralisation.
- Après les trois cas : reprendre le cas 4 (lot « sans code » d'abord) et trancher Q2.5.

## 7. Points encore à confirmer avant de coder

| # | Point | Hypothèse retenue si pas de réponse |
|---|-------|-------------------------------------|
| C1 | Q2.3 « infos sur le grossiste » | lu comme « référence déjà saisie pour ce tiers-payant » |
| C2 | Borne P.REF ≤ prix de vente | appliquée (sinon seulement ≥ 5 comme la fiche) |
| C3 | Cas 1 : remise produit sur une ligne cochée saisie avant / après la coche | conservée telle quelle, recalculée sur la vente VNO |
| C4 | Cas 3 : journal d'audit des cochages (Q3.5) | oui, journal existant |
