# Cas 2 : prix et taux de référence par tiers-payant, saisis à la caisse

Demande d'origine : [analyse_new.md](analyse_new.md), cas 2. Maquette : [cas2-prix-reference-caisse.html](cas2-prix-reference-caisse.html).

## 0. Décisions prises le 03/11/2026 ([reponses_evolution.md](reponses_evolution.md))

| Point | Décision |
|-------|----------|
| Activation | Nouveau paramètre `KEY_PRIX_REF_CAISSE` dans `t_parameters`, **désactivé par défaut**. Désactivé : les colonnes ne sont pas créées, la grille est strictement celle d'aujourd'hui. |
| Disposition | **B** : colonnes groupées par tiers-payant de la vente (en-tête de groupe au nom du tiers-payant → **P.REF** | **TAUX**), visibles en vente Assurance seulement. Au-delà de deux tiers-payants, les groupes s'ajoutent (défilement horizontal de la grille), DESIGNATION garde une largeur minimale et l'info-bulle. |
| Contrôles de saisie | P.REF : entier, **≥ 5** et **≤ prix de vente** de la ligne (un prix de référence au-dessus du prix de vente n'a pas de sens pour le remboursement — à confirmer), vide = prix de vente. TAUX : entier, **5 à 100**, vide = taux du tiers-payant pour ce client. Valeur refusée → cellule rouge et message sous la grille, l'ancienne valeur est rétablie, aucun appel serveur. |
| Q2.1 | **Permanente** : écriture dans `prix_reference`, même effet que la fiche article. |
| Q2.2 | **Pas de droit spécifique** : toute personne qui saisit une vente assurance peut saisir. |
| Q2.3 | **Aucune option à choisir** : la caisse écrit toujours en `MIX_TAUX_PRIX`. Si le produit a déjà une référence pour ce tiers-payant, elle est affichée et modifiable ; sinon la grille affiche par défaut le **prix de vente** comme référence et le **taux du compte client** pour ce tiers-payant, et rien n'est écrit tant que l'utilisateur ne modifie pas une cellule. *(La réponse parle d'« infos sur le grossiste » : lu comme « infos déjà saisies pour ce tiers-payant » ; à confirmer.)* |
| Q2.5 | Non tranché : voir recommandation ci-dessous. |
| Q2.6 | **Oui** : journal des ajouts, modifications et suppressions (fiche article **et** caisse), avec qui, quand, ancienne et nouvelle valeur, vente d'origine. |
| Exigence | **Aucune régression** : le moteur de calcul n'est pas modifié dans ce lot ; la saisie à la caisse ne fait qu'alimenter `prix_reference` puis relancer `net/assurance`, exactement comme une saisie en fiche article. |

**Recommandation sur Q2.5 (prix de référence par tiers-payant).** Avec la disposition B, l'utilisateur saisit un prix de référence *par
tiers-payant* ; or le moteur retient aujourd'hui le **minimum** de tous les prix de référence de la vente pour calculer la base de toutes les
parts. Avec deux tiers-payants et deux prix différents, la part du second ne sera pas celle que la colonne laisse attendre. Je recommande
de **livrer le cas 2 sans toucher au moteur** (zéro régression), en affichant dans l'aperçu « Pris en charge » la valeur réellement calculée
par le serveur, puis d'ouvrir un **lot séparé « base de calcul par tiers-payant »** avec son jeu de tests de non-régression sur le banc
(ventes multi-tiers-payants avant/après). Tant que ce lot n'est pas livré, un libellé discret sous la grille rappelle la règle du minimum.

## 1. L'existant

### Sur la fiche article (aujourd'hui)

- Entrée : liste des articles `configmanagement/famille/FamilleManager.js`, action de ligne « Prix de référence » (`FA_ACTIONS.PRIX`,
  l. 55-63) → fenêtre `view/produits/PrixReference.js`.
- Fenêtre : grille (Tiers payant · Option de prix · Valeur · Taux · Éditer · Supprimer) + formulaire : prix de base affiché, combo des
  tiers-payants (`v1/client/tiers-payants/assurance`), option `PRIX_REFERENCE` / `TAUX` / `MIX_TAUX_PRIX`, `valeur` (min 5), `taux`
  (5 à 100), affichés selon l'option.
- REST `rest/PrixReferenceRessource.java` (`v1/prix-reference`) : `POST` add (update si id), `PUT` update, `GET {produitId}`, `DELETE {id}`
  (suppression physique). Service `PrixReferenceServiceImpl`.
- Table **`prix_reference`** (`dal/PrixReference`) : `tiersPayant_id`, `produit_id` (**unique sur le couple**), `valeur` (prix de référence,
  entier ≥ 5), `type_prix`, `valeur_taux` (float, %), `enabled`.
- **Aucune historisation**, aucun journal (ni qui, ni quand). `prix_reference_vente` (prix figé par vente) a été **supprimée** par
  `V5.7.5` ; l'entité `PrixReferenceVente` reste mappée (code mort).

### Effet sur la vente

- Les prix de référence sont **relus à chaque calcul du net** (`SalesNetComputingServiceImpl.buildSaleItemInputs`, l. 334-370 :
  `prixReferenceService.getActifByProduitIdAndTiersPayantIds`) → une modification sur la fiche s'applique au prochain `net/assurance`
  de toute vente non close. Une vente close garde ses valeurs figées (`int_PERCENT`/`int_PRICE` par tiers-payant,
  `calculation_base_price` par ligne).
- Formule (`TiersPayantCalculationService.calculateSaleItem`, l. 182-243) : prix de référence retenu = **minimum des `valeur`** (types ≠
  `TAUX`) **sur tous les tiers-payants de la vente** (pas tiers-payant par tiers-payant) ; base = (prixRef ou P.U) × qté ; pour chaque
  tiers-payant (par priorité) : taux = `int_PERCENT` de la vente, remplacé par `valeur_taux` si un prix de référence de type `TAUX` ou
  `MIX_TAUX_PRIX` existe pour ce tiers-payant ; part = base × taux plafonnée au reste ; puis plafonds sur le total.
- `calculation_base_price` est renvoyé au front (`VenteDetailsDTO`, `v1/vente/deatails`) : la colonne **P.REF existe déjà dans la grille
  mais est cachée** (`VenteVNO.js` l. 633-643, `hidden: true`, sans éditeur).
- Le taux effectif par ligne et par tiers-payant est persisté dans `taux_produit` (`dal/Rate`) **à chaque calcul, sans purge et jamais
  relu** (doublons qui s'accumulent — anomalie à noter).
- Le taux n'existe **par ligne** nulle part dans le modèle ExtJS (`VenteItem.js`) : seulement par vente × tiers-payant (`int_PERCENT`).

### La grille et sa place

Colonne gauche `flex:1`, rail droit 400 px. Colonnes : LG 45 · C.CIP flex 1 · DESIGNATION flex 2,5 · QD · QS · P.U · P.REF (cachée) ·
MONTANT (flex 1 chacun) · action 42. Sur un écran 1 600 px la grille fait ≈ 1 100 px : ajouter deux colonnes éditables de 80-90 px
suppose de rogner C.CIP (fixer à 80 px) et DESIGNATION.

## 2. Ce qui est possible

**Oui**, à condition de bien définir « le même effet qu'en fiche article » : écrire dans `prix_reference` (couple tiers-payant × produit)
par `PrixReferenceService.add/update`, puis relancer `net/assurance`. La saisie à la caisse devient alors **permanente** pour le produit
et ce tiers-payant (c'est ce que demande le cas), ce qui touche toutes les ventes futures et toutes les ventes en cours.

Trois dispositions proposées (maquette) :

- **A. Deux colonnes dans la grille** : « P.REF » (réactivation de la colonne cachée, avec éditeur) et « TAUX ». Avec **un seul**
  tiers-payant sur la vente, c'est direct. Avec plusieurs, la cellule affiche le tiers-payant principal (priorité 1) et une pastille
  « +1 » ; le clic ouvre le volet C.
- **B. Colonnes groupées par tiers-payant** (en-tête de groupe « MCI-CARE » → P.REF | TAUX ; « CNPS » → P.REF | TAUX) : c'est la
  transposition exacte de la fenêtre de la fiche article (une ligne par tiers-payant) dans la grille ; prend ~150 px par tiers-payant,
  viable jusqu'à deux tiers-payants (le cas courant RO + RC), repli sur C au-delà.

**Les trois dispositions donnent les mêmes montants qu'aujourd'hui** : elles écrivent la même ligne `prix_reference` que la fiche article
et le net est recalculé par le même `net/assurance`. Aucune ne modifie le moteur de calcul. Le choix entre A, B et C est purement un
choix d'affichage et de place à l'écran.
- **C. Volet « Référence tiers-payant » sous la grille** (pas de fenêtre) : au clic sur la ligne, un bandeau dockable sous la grille
  montre un bloc par tiers-payant de la vente (option de prix, valeur, taux), avec le prix de base et le montant pris en charge calculé.
  Enregistrement par bouton « Appliquer à la fiche article » avec confirmation dans le bouton. **Recommandé** en combinaison avec A
  (A pour voir, C pour saisir quand il y a plusieurs tiers-payants).

## 3. Règles métier à trancher

| # | Question | Proposition |
|---|----------|-------------|
| Q2.1 | Saisie **permanente** (écrit la fiche article, comme demandé) ou **ponctuelle** (seulement cette vente) ? La ponctuelle demande de recréer une table type `prix_reference_vente`. | Permanente, avec une case « Pour cette vente seulement » plus tard si besoin. |
| Q2.2 | **Qui** peut saisir : même droit que la fiche article (gestion des articles) ou nouveau droit caisse `P_SAISIE_PRIX_REF_CAISSE` ? | Nouveau droit, par défaut aux pharmaciens/gérants ; la cellule est en lecture seule sans ce droit. |
| Q2.3 | Que saisit-on exactement par ligne ? Le prix de référence (`valeur`), le taux (`valeur_taux`), ou les deux (`MIX_TAUX_PRIX`) ? Doit-on choisir l'option de prix à la caisse ou la déduire (prix seul → `PRIX_REFERENCE`, taux seul → `TAUX`, les deux → `MIX`) ? | Déduire l'option des champs remplis ; l'option reste visible dans le volet C. |
| Q2.4 | Le **taux saisi par ligne** remplace-t-il le taux de la vente (`int_PERCENT`, 70 %) pour cette ligne seulement ? C'est le comportement actuel du type `TAUX` : oui, pour ce tiers-payant et ce produit. | Oui, c'est déjà la règle du moteur. |
| Q2.5 | **Observation hors périmètre, sans incidence sur le cas 2.** En lisant le moteur : quand une vente a plusieurs tiers-payants avec des prix de référence différents, la base de calcul est le **minimum** de ces prix, appliqué à tous (l. 191-193), et non le prix propre à chaque tiers-payant. Ce comportement existe aujourd'hui avec la fiche article et sera identique avec A, B ou C. Est-ce voulu (à documenter) ou un défaut (lot séparé, avec ses tests et son annonce) ? | Ne rien changer dans le cas 2 ; le volet C affiche le montant réellement calculé par le serveur. Trancher à part. |
| Q2.6 | **Traçabilité** : la saisie à la caisse doit-elle être journalisée (qui, quand, ancienne/nouvelle valeur, vente d'origine) ? La fiche article ne l'est pas aujourd'hui. | Oui : table `prix_reference_journal` alimentée par les deux chemins (fiche et caisse). |
| Q2.7 | Effet sur les **ventes en attente** d'autres postes contenant le même produit : elles seront recalculées au prochain net. Acceptable ? | Oui (c'est déjà le cas depuis la fiche), à dire dans le volet. |
| Q2.8 | Contraintes : `valeur ≥ 5`, taux 5-100 (comme la fiche). Un taux 0 (= non pris en charge) ? → c'est le cas 1. | Garder les bornes de la fiche. |

## 4. Risques de régression

- **Moteur de calcul** : **non modifié**, quelle que soit la disposition ; la caisse relance juste `net/assurance`. Garantie par un test
  qui compare, sur un jeu de ventes du banc, le net calculé avant et après la livraison (identique au franc près). La question Q2.5,
  si elle est tranchée « défaut », est un lot séparé avec ses propres tests.
- **`onGridEdit`** (`VenteCtr.js` l. 4082-4180) envoie `update/item/vno` pour toute cellule éditée : les nouvelles colonnes doivent
  être interceptées **avant** (pas d'appel `update/item/vno` pour P.REF/TAUX) et déclencher `net/assurance` après l'enregistrement.
- **Édition cellule et saisie douchette** : le plugin `CellEditing` à 1 clic + focus produit (`vp-focus-zone`) ; une colonne éditable de
  plus augmente le risque de clic involontaire. Confirmer la saisie par Entrée seulement, et garder le focus retour au champ produit.
- **Largeur** : rogner DESIGNATION tronque les libellés longs ; prévoir l'info-bulle (déjà gérée par `correctifs-affichage.js` §1).
- **`taux_produit`** : nettoyer ou arrêter l'accumulation avant d'ajouter des recalculs plus fréquents.
- **Comptant** : colonnes cachées en type 1 (aucun changement).

## 5. Ce qu'il faudrait toucher

| Couche | Fichier | Modification |
|--------|---------|--------------|
| REST | `rest/PrixReferenceRessource.java` | `GET v1/prix-reference/vente/{venteId}` (prix/taux par ligne × tiers-payant de la vente, avec montant pris en charge) ; `PUT v1/prix-reference/vente/{venteId}/ligne/{detailId}` `{tiersPayantId, valeur, taux}` → `add/update` + journal + retour du net recalculé. |
| Service | `PrixReferenceServiceImpl` | déduction de l'option, journalisation ; `SalesNetComputingServiceImpl` et `TiersPayantCalculationService` inchangés. |
| SQL | migration | `prix_reference_journal` (id, prix_reference_id, produit, tiers-payant, ancienne/nouvelle valeur, taux, utilisateur, date, vente_id origine) ; privilège `P_SAISIE_PRIX_REF_CAISSE`. |
| DTO | `VenteDetailsDTO` | `tauxTp` (tiers-payant principal), `nbTiersPayants`, liste `referencesTp[{tpId, libelle, valeur, taux, type, partTp}]`. |
| ExtJS modèle | `model/caisse/VenteItem.js` | champs ci-dessus. |
| ExtJS vue | `view/vente/VenteVNO.js` | P.REF visible (type 2/3) + éditeur ; colonne TAUX ; C.CIP fixé à 80 px ; conteneur `#refTpPanel` docké sous la grille (volet C), caché par défaut. |
| ExtJS ctrl | `controller/VenteCtr.js` | `beforeedit` (droit, type de vente), `edit` → PUT puis `net/assurance` ; affichage du volet sur sélection de ligne ; bouton « Appliquer » à confirmation intégrée (`PrestigeConfirmation`). |
| Fiche article | `view/produits/PrixReference.js` | rien d'obligatoire ; afficher le journal (Q2.6). |
| Affichage | `correctifs-affichage.js` | rien (pas de nouveau menu). |

Aucune JSP nouvelle. Aucune fenêtre surgissante : le volet est docké sous la grille, la confirmation est dans le bouton.
