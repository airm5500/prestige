# Prix et taux de référence par tiers-payant, saisis à la caisse (cas 2 du 03/11/2026)

Réalisation du cas 2 de `docs/analyses/2026-11-03/` (analyse `cas2-prix-taux-reference-caisse.md` §0, plan
`plan-realisation.md` §4, maquette `cas2-prix-reference-caisse.html`, disposition **B**). Branche de la session :
`PRES-/quirky-shtern-c8f3ea`, à partir de l'intégration du 03/11 (`ae592541`). Cas 1, 3 et 4 non touchés.

## Paramètre

`KEY_PRIX_REF_CAISSE` dans `t_parameters` (rubrique « Ventes et caisse »), **à 0 par défaut**.

- **À 0** : aucune colonne n'est créée dans la grille de vente, la réponse `v1/vente/deatails` est strictement celle
  d'aujourd'hui (pas de champ `referencesTp`), et les services de la caisse répondent **403**. Le test d'écran 3 compare
  l'en-tête de la grille au pixel près (comptant et assurance, paramètre à 0 puis à 1 au comptant).
- **À 1**, en vente **Assurance** (type 2) seulement : un groupe de colonnes par tiers-payant de la vente, en-tête au
  nom du tiers-payant (coupé par des points de suspension, nom complet en info-bulle) → **P.REF | TAUX** (80 et 60 px), placé entre P.U et MONTANT ; C.CIP passe à 100 px (code
  lisible en entier), QD et QS à 55 px, DESIGNATION garde 170 px au minimum. Les groupes suivent les tiers-payants de la vente (ajout par « Ajouter une
  Assurance complémentaire », « Retirer », rappel d'une vente) et disparaissent au comptant / carnet et à la remise à
  zéro de l'écran (mise en attente, retour).

## Règles de saisie (Q2.1, Q2.2, Q2.3)

- **Valeurs par défaut** en gris italique, jamais enregistrées : prix de vente de la ligne et taux du tiers-payant pour
  ce client (taux de la vente, sinon taux du compte). Une référence existante de la fiche article s'affiche en violet et
  se modifie de la même façon.
- **Entrée valide, Échap annule** ; un clic ailleurs ou Tab abandonne la saisie en silence. Entrée sur une valeur
  inchangée n'écrit rien.
- **Bornes**, vérifiées à l'écran puis revérifiées par le serveur : prix de référence entier de **5 au prix de vente**
  de la ligne (hypothèse C2 du plan, appliquée) ; taux entier de **5 à 100**. Refus à l'écran = cellule rouge, message
  sous la grille, ancienne valeur rétablie, **aucun appel serveur**. Les lettres sont refusées à la frappe.
- **Écriture permanente** dans `prix_reference`, toujours en **MIX_TAUX_PRIX** (quelle que soit l'option précédente de
  la fiche), par `PUT v1/prix-reference/vente/{venteId}/ligne/{detailId}` ; même effet qu'une saisie en fiche article.
  Aucun droit particulier (toute personne qui saisit une vente assurance).
- Le net est recalculé par le **même service** que `net/assurance` et appliqué à l'écran ; le focus revient au champ
  produit ; aucun `update/item/vno` ne part pour ces cellules (interception avant `onGridEdit`).
- Libellé discret sous la grille : légende des couleurs et rappel de la règle du minimum (Q2.5 : avec plusieurs
  tiers-payants, le moteur retient le plus petit des prix de référence de la vente). Le lot séparé « base de calcul
  par tiers-payant » (`NOTICE_PRIX_REFERENCE_BASE_PAR_TP.md`, paramètre `KEY_PRIX_REF_BASE_PAR_TP`) remplace cette
  règle quand il est activé ; le rappel disparaît alors.

## Journal (Q2.6)

Table `prix_reference_journal` (migration `V7.2.34__prix_reference_journal.sql`, idempotente) : une ligne par
**AJOUT / MODIFICATION / SUPPRESSION**, que l'écriture vienne de la **fiche article** ou de la **caisse** : ancienne et
nouvelle valeur, taux et type, utilisateur (identifiant et nom), date, poste, et la **vente d'origine** quand la saisie
vient de la caisse. Les identifiants sont copiés (pas de clé étrangère) : l'historique survit à la suppression
physique du prix. Aucune donnée de patient.

Fiche article (`view/produits/PrixReference.js`) : grille « Historique des références » en lecture sous la liste des
prix (`GET v1/prix-reference/{produitId}/journal`), colonnes Date · Qui · Origine (« Fiche article » ou « Caisse — vente
VO-… ») · Tiers-payant · Action · Avant · Après ; rechargée après chaque enregistrement ou suppression.

## Services REST (`PrixReferenceRessource`)

| Méthode | Chemin | Rôle |
|---------|--------|------|
| GET | `v1/prix-reference/vente/{venteId}` | par ligne × tiers-payant : `{detailId, tpId, compteTpId, libelle, valeur, taux, type, defaut, prixReferenceId}` ; 403 si paramètre à 0 |
| PUT | `v1/prix-reference/vente/{venteId}/ligne/{detailId}` `{tiersPayantId, valeur, taux, tierspayants, remiseId}` | bornes (400), vente assurance ouverte et tiers-payant de la vente (400), écriture MIX + journal, puis `net` (même JSON que `net/assurance`) ; 403 si paramètre à 0 |
| GET | `v1/prix-reference/{produitId}/journal` | journal du produit, du plus récent au plus ancien |

`VenteDetailsDTO.referencesTp` est rempli par `PrixReferenceService.completerReferencesTp` depuis `detailsVente`,
seulement si le paramètre est actif et la vente de type 2 ; sinon le champ reste null et absent du JSON.

`partTp` par ligne et par tiers-payant (prévu au plan) n'est pas renvoyé : le moteur ne persiste pas ce montant par
ligne (`taux_produit` ne garde que le taux) et la disposition B ne l'affiche pas. La « PART ASSURANCE » de la vente est
celle du serveur.

## Moteur de calcul : inchangé

`SalesNetComputingServiceImpl` et `TiersPayantCalculationService` ne sont pas modifiés (aucune ligne dans le diff).
Preuve par `src/test/e2e/prix-reference/test-non-regression-net.js` : 40 ventes assurance closes de la copie de
travail (20 à un tiers-payant, 20 à deux) sont copiées en ventes en cours, `net/assurance` est demandé pour chacune
avec le paramètre à 0 puis à 1 : net, part tiers-payant, remise et part de chaque organisme identiques au franc près ;
puis 12 références d'essai (MIX, PRIX_REFERENCE, TAUX) sont posées sur les produits de 6 copies et les deux séries
coïncident encore (6 ventes dont le net change : le chemin des prix de référence est bien exercé). Copies, références,
journal et `taux_produit` retirés ; les ventes d'origine ne sont jamais écrites. Résultat du 03/11 : 8/8.

## Tests

- Unitaires : `ReferenceCaisseTest` (bornes, journal avant / après, copie détachée), `PrixReferenceJournalDTOTest`
  (origine, avant / après, ligne complète).
- Écran (`src/test/e2e/prix-reference/`, un à la fois, jeu d'essai ZZAUDIT retiré, paramètre remis), résultats du
  03/11 sur `laborex_v1_db` :
  1. `test-saisie-un-tiers-payant.js` — 25/25 : colonnes, défauts en gris, P.REF puis TAUX par Entrée, ligne MIX
     créée, journal AJOUT puis MODIFICATION avec la vente, net = `net/assurance`, focus, aucun `update/item/vno`,
     fiche article (liste + historique), suppression en fiche → SUPPRESSION.
  2. `test-saisies-refusees.js` — 20/20 : 4, 101, 4 en taux, prix > prix de vente, lettres, Entrée sans changement,
     Tab : cellule rouge / message / valeur rétablie / aucune requête ; une saisie valide passe ensuite.
  3. `test-grille-identique-parametre-0.js` — 12/12 : en-tête d'origine, `deatails` sans `referencesTp`, 403, captures
     identiques (comptant / assurance, paramètre 0 / 1), colonnes retirées sur la même grille après « Mettre en
     attente ». Comparaison par `comparer-png.py` (Pillow) : mêmes dimensions, aucun pixel écarté de plus de 1/255.
  4. `test-deux-tiers-payants.js` — 12/12 : deux groupes dans l'ordre de priorité, saisie sur le second écrite pour
     ce tiers-payant seulement, A reste en gris, net = serveur, « Retirer » → un groupe.
- Non-régression d'un parcours existant : `audits/test-ecran-promotion-vente.js` (édition de QD dans la grille).

## Tests de la règle du 05/11 (rapprochement, cohérence, bilan)

Compte rendu demandé par la règle, pour le cas 2 :

- **Où la donnée apparaît, et le test de rapprochement** (`test-rapprochement-caisse-fiche-base.js`, sur domain3 /
  `laborex_audit`) : un prix ou un taux saisi à la caisse est lu dans la cellule de la grille, le modèle de la ligne,
  `GET v1/prix-reference/vente/{id}`, la fiche article (service `GET v1/prix-reference/{produitId}` et écran, liste et
  historique), la table `prix_reference`, le journal, le net affiché et `net/assurance` ; puis, la vente close par
  l'écran (TERMINER LA VENTE), la part de l'organisme (`t_preenregistrement_compte_client_tiers_payent`), la part du
  client et `taux_produit` par ligne. Quatre lignes aux valeurs différentes (P.REF seul, TAUX seul, P.REF puis TAUX,
  rien), quantités 1, 2, 3, 1 posées par la cellule QD. Le ticket imprimé est rapproché par
  `test-rapprochement-ticket.js` (branche d'intégration, aperçu du ticket) : taux et P.REF de chaque ligne.
- **Règles de calcul, et le test de cohérence** (`ReferenceCaisseCoherenceTest`, graine fixe 20261105) :
  acceptation si et seulement si 5 ≤ prix ≤ prix de vente (borne haute seulement si le prix de vente est connu) et
  5 ≤ taux ≤ 100, zéro et vide refusés, sur 20 000 cas ; moteur (inchangé, mais consommateur des références) : part de
  l'organisme = Σ (prix de référence ou prix de vente) × quantité × taux de la ligne, jamais au-dessus de la base,
  écrêtée au plafond par vente, part du client = total − part ≥ 0, taux mémorisé = taux de l'organisme, sur 5 000
  ventes à un organisme et 5 000 à deux (le second prend au plus le reste de la base) ; journal : avant / après
  recopiés, modification à l'identique = pas de changement, copie détachée fidèle, sur 20 000 tirages. Échec montré
  d'abord sur un code faussé (borne basse à 4, taux ignoré dans la détection de changement : 2 échecs), puis vert.
- **Traces attendues, et le test de bilan** (`test-bilan-avant-apres.js`) : relevé avant / après chaque opération de
  `prix_reference`, journal, `taux_produit`, ventes, lignes, organismes de la vente, caisse (`mvttransaction`),
  mouvements de produit (`hmvtproduit`), recettes, règlements, stock, prix du produit, paramètre. Ajout par P.REF :
  + 1 référence, + 1 journal AJOUT, + 1 taux de ligne, parts de la vente ouverte recalculées (= règle) ; modification
  du taux : référence modifiée, + 1 journal, taux de ligne remplacé, parts recalculées ; saisie refusée (0) et saisie
  sans changement : rien ; ajout par TAUX : idem ajout ; paramètre à 0 : 403, rien ; suppression en fiche : − 1
  référence, + 1 journal SUPPRESSION, rien d'autre. Jamais : stock, mouvements, caisse, recettes, règlements, lignes de
  vente, prix du produit.
- **Cas variés** : quantités 1, 2, 3 ; prix de référence égal au prix de vente, à 5, en dessous ; taux 5 à 100 ;
  zéro, vide, négatif, prix au-dessus du prix de vente ; plafond par vente atteint ; un et deux organismes ; paramètre
  à 0 et à 1 ; ajout, modification, suppression.

**Défaut confirmé et corrigé** (révélé par le rapprochement, test en échec d'abord) : à chaque recalcul du net, les
taux de ligne s'empilaient dans `taux_produit` (six lignes pour une ligne de vente après six recalculs, dont les
anciens taux). `SalesNetComputingServiceImpl` efface les taux de la ligne avant d'enregistrer ceux du dernier calcul,
mêmes lignes que le correctif `74e359ee5` de la branche d'intégration (ticket 2912673621 du 05/11), pour une fusion
sans conflit. Les montants ne changent pas (`test-non-regression-net.js` rejoué).

Résultats sur domain3 (`laborex_audit`), un test à la fois, le 05/11 au soir : rapprochement 21/21, bilan 23/23,
saisie d'un tiers-payant 25/25, saisies refusées 20/20, grille identique à paramètre 0 12/12, deux tiers-payants 12/12,
cohérence (unitaire) 4/4. Sur le code faussé (taux de ligne empilés, prix de référence ignoré) : rapprochement 8/21,
bilan 11/21.

**Second défaut confirmé et corrigé** (`test-non-regression-net.js`, rouge d'abord à 7/8 sur une vente sur 40, reproduit
trois fois) : quand une vente porte un taux saisi différent du taux de la fiche du compte (100 saisi, 20 à la fiche) et
qu'un prix de référence existe pour l'un de ses produits, le premier calcul du net appliquait le taux saisi (part 1 820
sur 4 020) puis réécrivait le taux de la fiche sur la ligne de l'organisme ; le calcul suivant, identique, donnait 524.
Règle tranchée le 05/11 : le taux saisi fait foi (s'il est présent, c'est qu'il a été voulu un jour), le taux de la fiche
ne sert qu'en son absence ; un produit à prix de référence seul vaut prix de référence × taux du client, un produit à
taux de référence vaut prix de vente × taux de référence, les deux ensemble prix de référence × taux de référence, un
produit sans référence prix de vente × taux du client. `SalesNetComputingServiceImpl` ne réécrit plus le taux de la
fiche quand une option de prix existe (deux chemins de calcul) ; le test imprime le détail de la vente (lignes,
organismes, références, taux) quand les deux séries divergent.

## Points à connaître

- Une vente assurance ne peut pas être repassée au comptant par le type de vente (refus de l'application, comportement
  d'origine) : le retrait des colonnes se teste par la mise en attente.
- Avec deux tiers-payants, les colonnes tiennent dans la grille sur un écran de 1 500 px ; au-delà, elle défile.
- Recette officine : activer le paramètre sur un poste pilote une semaine avant généralisation (plan §6).
