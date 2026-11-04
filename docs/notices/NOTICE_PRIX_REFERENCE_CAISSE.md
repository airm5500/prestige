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
- Libellé discret sous la grille : légende des couleurs et rappel de la règle du minimum (Q2.5, non tranché : avec
  plusieurs tiers-payants, le moteur retient le plus petit des prix de référence de la vente). Lot séparé à ouvrir.

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

## Points à connaître

- Une vente assurance ne peut pas être repassée au comptant par le type de vente (refus de l'application, comportement
  d'origine) : le retrait des colonnes se teste par la mise en attente.
- Avec deux tiers-payants, les colonnes tiennent dans la grille sur un écran de 1 500 px ; au-delà, elle défile.
- Recette officine : activer le paramètre sur un poste pilote une semaine avant généralisation (plan §6).
