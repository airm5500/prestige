# Rapport du 08/11/2026 : promotions (demande du 07/11) et ventes unités gratuites

Le récapitulatif `RECAP_PROMOTIONS_2026-11-07.md` a été validé « Oui, par défaut ». Il est codé, testé et poussé sur
`integration/recette-2026-10-29` :
- `ec8bf8593` : points 1 à 5 du récapitulatif ;
- `7ddfc0511` : point 6, c'est-à-dire le point 13 du 06/11.

Le tout est déployé sur le poste local (domain1). Le domain2 n'a pas été touché.

État :
- cahier `CAHIER_RECETTE_2026-11-08.xlsx`, feuille « Promotions du 08-11 » : 5 cas sur 5 OK ;
- non-régression : 21 tests rejoués, tous verts (section 4) ;
- aucune régression connue.

## 1. Ce qui est fait

| Point | Ce qui change | Test d'écran | Sur l'ancien code | Sur le nouveau |
|---|---|---|---|---|
| 1. Palier | Option « Par palier de » à côté de « À partir de » : 9 achetés donnent 2 offerts en 4+1 ; « à partir de » n'offre qu'une fois. L'option est gardée dans l'historique. | `retours/test-promotion-palier-0811.js` | 3/5 | 33/33 |
| 2. Ticket | Mention « PROMOTION x+n OFFERT(S) » sur la ligne, le ticket, l'aperçu et la réimpression. La ligne de vente garde la promotion du jour de la vente, même si la promotion est modifiée ou supprimée ensuite. | idem | idem | idem |
| 3. Écran d'ajout | Le champ de recherche prend toute la largeur. La liste montre le prix et le stock. Rappel « Prix actuel » ou « Prix actuel → Prix après remise » selon le type, et « Stock » pour les unités gratuites. | `retours/test-promotion-ajout-produit-0811.js` | 5/12 | 12/12 |
| 4. Journal et onglets | Toutes les actions sont journalisées : création, modification, clôture, ajout, modification et retrait d'un produit, retrait sur une vente passée en assurance. Chaque ligne garde l'utilisateur et les valeurs d'avant. L'écran Promotions a quatre onglets : Promotions, Historique, Ventes en promotion, Analyse. Tri, filtres, PDF et Excel. | `retours/test-promotion-suivi-0811.js` | 8/10 | 35/35 |
| 4. Assurance | Quand une vente au comptant passe en assurance, le retrait de sa promotion est noté au journal avec la référence de la vente. | `audits/test-ecran-promotion-vente.js` (contrôle ajouté) | voir la section 3 | voir la section 4 |
| 5. Analyse | Pour une période et un vendeur : tuiles (ventes, boîtes payées et offertes, montant, coût des offertes), répartition par type, par promotion, par vendeur et par jour, top 10 des produits en barres. PDF et Excel. | `retours/test-promotion-suivi-0811.js` | idem | idem |
| 6. UG fournisseur (point 13) | Écran « Ventes unités gratuites » déclaré. Colonne Vendeur à l'écran et sur le PDF. La recherche filtre (CIP, nom, référence). La pagination est faite par le serveur, et les totaux du bas portent sur toute la période. | `retours/test-ventes-ug-0811.js` | 7/15 | 16/16 |

Tests unitaires :
- `PromotionLigneCoherenceTest` : 8 tests, sur des milliers de cas tirés au hasard avec une graine fixe ;
- `PromotionAnalyseCoherenceTest` : 3 tests, sur 20 000 lignes.

Tous les tests unitaires passent.

## 2. Rapprochement, cohérence, bilan

### Palier et ticket (points 1 et 2)

- **Où apparaît la donnée.** Grille de vente (quantité, offertes, mention), ticket, aperçu, réimpression, ventes
  terminées et base (`t_preenregistrement_detail` : `int_UG`, `promo_*`, montant).
- **Rapprochement.**
  - `test-promotion-palier-0811.js` : attendu = écran = ticket = base, ligne par ligne, et total = vente = caisse.
  - `test-ecran-promotion-rapprochement.js` : non-régression.
- **Règles et test de cohérence** (`PromotionLigneCoherenceTest`) :
  - à partir de s : offertes = n si payées ≥ s, sinon 0 ;
  - par palier de s : offertes = ⌊payées ÷ s⌋ × n ;
  - montant = prix × payées ;
  - quantité de la ligne = payées + offertes ;
  - jamais négatif ;
  - mention = « PROMOTION (payées)+(offertes) OFFERT(S) » si offertes > 0, sinon « PROMOTION ».
- **Traces attendues et test de bilan** (`test-promotion-palier-0811.js`) :
  - le stock baisse des boîtes payées et des offertes, une seule sortie par ligne ;
  - une annulation rend tout le stock, offertes comprises ;
  - si le stock manque pour les offertes, la quantité est refusée.
- **Cas couverts.**
  - Palier 4+1 avec 3, 4 et 9 tapées (9 tapées donnent 11 boîtes, soit 8+2).
  - À partir de 5+1 avec 12.
  - Stock juste : 9 tapées refusées, 8 acceptées.
  - Promotion modifiée puis supprimée : la réimpression garde « 8+2 » et « 5+1 ».
  - Annulation.

### Écran d'ajout (point 3)

- **Où apparaît la donnée.** Liste de recherche (prix, stock), rappel sous le champ, ligne enregistrée et fiche article.
- **Rapprochement.** Liste = base. Rappel = prix de la fiche. Prix après remise = prix enregistré.
- **Règle.** Prix après remise = arrondi(prix × (100 − remise) / 100). Le stock affiché est le stock vendable de
  l'officine, sans les dépôts.
- **Cas couverts.** Prix spécial, remise de 15 % et unités gratuites, avec des stocks de 23, 7 et 0.

### Journal, onglets et analyse (points 4 et 5)

- **Où apparaît la donnée.**
  - Journal : base (`t_promotion_history`), onglet Historique, PDF, Excel.
  - Ventes en promotion : base, ticket, onglet, PDF, Excel.
  - Analyse : tuiles, tableaux, barres, PDF, Excel.
- **Rapprochement** (`test-promotion-suivi-0811.js`) :
  - Historique : écran = base ligne par ligne ; tri par Action = ordre de la base ; PDF = Excel = écran.
  - Ventes : lignes = base = ticket ; la vente annulée est absente ; totaux = somme des lignes ; PDF = Excel = écran,
    avec une ligne TOTAL.
  - Analyse : total = somme de l'onglet Ventes pour le même vendeur ; tuiles = total ; PDF = Excel = écran.
- **Règles et test de cohérence** (`PromotionAnalyseCoherenceTest`) :
  - coût des offertes = prix d'avant × quantité − montant ;
  - somme par type = somme par promotion = somme par vendeur = somme par jour = total ;
  - top 10 trié par montant ;
  - jamais négatif.
- **Traces attendues et test de bilan.** Le journal contient exactement, dans cet ordre :
  1. CRÉATION ;
  2. MODIFICATION PROMOTION, avec la période d'avant ;
  3. AJOUT ;
  4. AJOUT ;
  5. MODIFICATION, avec les valeurs d'avant ;
  6. AJOUT ;
  7. RETRAIT, avec les valeurs du produit ;
  8. CLÔTURE.

  Chaque ligne porte l'utilisateur. Il n'y a qu'un seul AJOUT pour le produit en remise. Le passage en assurance
  laisse une ligne RETRAIT VENTE ASSURANCE par ligne en promotion, avec la référence de la vente.
- **Droits.**
  - Sans « Historique des promotions » : l'onglet Historique est caché et le service répond 403.
  - Les onglets Ventes en promotion et Analyse restent visibles avec le droit Promotions.
- **Cas couverts.**
  - Trois types de promotion.
  - Palier et à partir de.
  - Produit rajouté avec 2 offertes.
  - Ajout puis retrait.
  - Trois ventes, dont une annulée.
  - Clôture.
  - Filtres produit, action et vendeur.
  - Utilisateur sans droit.

### Ventes unités gratuites du fournisseur (point 6, soit le point 13 du 06/11)

- **Où apparaît la donnée.** Base (`int_UG`, stock UG), grille, totaux du bas, pagination, PDF.
- **Rapprochement** (`test-ventes-ug-0811.js`) : base = écran = PDF, ligne par ligne, avec le vendeur. La pagination
  totale et les totaux du bas sont égaux à la base.
- **Règles.**
  - Montant UG = UG × prix.
  - Les totaux du bas ne changent pas d'une page à l'autre.
  - La page 2 contient les lignes suivantes de la liste complète.
- **Traces attendues.** Le stock UG est consommé, jusqu'à être épuisé. Une vente annulée n'apparaît pas.
- **Cas couverts.**
  - Trois produits, avec des stocks UG de 3, 10 et 0.
  - Quantité supérieure au stock UG.
  - Vente annulée.
  - 2 lignes par page.
  - Recherche par nom.

## 3. Écarts avec le récapitulatif, et points à confirmer

1. **Retrait d'un produit.** La ligne est toujours supprimée de `t_promotion_product`, et non « marquée retirée ».
   - Le journal garde toutes ses valeurs (action RETRAIT, valeurs d'avant, utilisateur), donc rien n'est perdu pour
     la traçabilité.
   - Une marque « retiré » obligerait à filtrer chaque lecture des promotions, en caisse comprise. Le risque de
     régression est plus grand que le gain.
   - À confirmer.
2. **Point 13, onglet Analyse.** Le plan du 06/11 proposait aussi un onglet Analyse (top 10, par vendeur, par jour)
   pour les unités gratuites du fournisseur. Le récapitulatif validé du 07/11 (§6) ne le reprend pas : il n'est pas
   fait. À confirmer si vous le voulez.
3. **Ancien menu « Historique des promotions ».**
   - La migration V7.2.42 le désactive, puisque l'historique est maintenant un onglet.
   - Le menu reste en place pour un rôle qui l'aurait sans le menu Promotions, pour que ce rôle ne perde pas l'accès.
   - Son test (`test-ecran-historique-promotions.js`) ouvre l'écran directement et reste vert.
4. **Retrait sur une vente passée en assurance.** Le contrôle du journal a été ajouté au test existant
   `test-ecran-promotion-vente.js`. Il n'a pas été joué à part sur l'ancien code. L'absence du journal sur l'ancien
   code est déjà prouvée par le rouge de `test-promotion-suivi-0811.js` (colonne `str_ACTION` absente).
5. **Incohérence existante, non touchée.** Le stock UG n'est pas compté de la même façon dans StockImpl et dans le
   suivi des mouvements. C'est à traiter à part.

## 4. Non-régression

Série rejouée le 08/11, de 02 h 34 à 02 h 50, sur `7ddfc0511`, un test à la fois : **21 tests sur 21 verts**, aucun
faux échec à rejouer. `test-ecran-promotion-vente.js` a été rejoué seul, sous le verrou, après l'ajout du contrôle du
journal : 12/12.

| Test | Résultat |
|---|---|
| `audits/test-ecran-promotion-rapprochement.js` | 39/39 |
| `audits/test-ecran-promotion-vente.js` (avec le contrôle du journal) | 12/12 |
| `retours/test-vente-promotion-vert-0611.js` | 8/8 |
| `audits/test-ecran-promotions.js` | 15/15 |
| `audits/test-ecran-historique-promotions.js` | 16/16 |
| `ligne-comptant/test-promotion-et-carnet.js` | 10/10 |
| `prix-reference/test-rapprochement-ticket.js` | 19/19 |
| `prix-reference/test-rapprochement-caisse-fiche-base.js` | 26/26 |
| `prix-reference/test-bilan-avant-apres.js` | 25/25 |
| `ligne-comptant/test-rapprochement-ligne-comptant.js` | 19/19 |
| `ligne-comptant/test-une-ligne-cochee.js` | 24/24 |
| `retours/test-grille-vente-triangles.js` | 19/19 |
| `ordonnancier/test-produit-sensible-vente.js` | 27/27 |
| `retours/test-vente-colonne-cip-0611.js` | 9/9 |
| `retours/test-modeles-ticket.js` | 15/15 |
| `audits/test-ecran-modifier-tp-vente-encours.js` | 11/11 |
| `retours/test-analyse-article.js` | 28/28 |
| `retours/test-promotion-palier-0811.js` | 33/33 |
| `retours/test-promotion-ajout-produit-0811.js` | 12/12 |
| `retours/test-promotion-suivi-0811.js` | 35/35 |
| `retours/test-ventes-ug-0811.js` | 16/16 |

Cahier : `CAHIER_RECETTE_2026-11-08.xlsx` (`docs/recette` et `docs/notices/codex-serie-2026-11-03`).
- Feuille « Promotions du 08-11 » : **5 cas sur 5 OK** (PRO-01 à PRO-05) ; résultat sur l'ancien code noté pour PRO-01, 02, 03 et 05.
- Non-régression : 16 sur 16 OK.
- Une ligne a été ajoutée à la synthèse.

## 5. Mise en officine

- **Migrations Flyway**, jouées au déploiement et rejouables :
  - `V7.2.41__promotion_palier_ligne_vente.sql` : option palier, et promotion gardée sur la ligne de vente ;
  - `V7.2.42__promotion_journal_onglets.sql` : colonnes du journal, index, désactivation conditionnelle de l'ancien
    menu Historique.
- **Déploiement.** De nouveaux EJB ont été ajoutés (`PromotionSuiviService`) et une signature a changé
  (`CaisseService.venteUg`). Un simple `redeploy` laisse donc la politique JACC figée, ce qui donne des erreurs 500.
  Il faut :
  1. `asadmin undeploy prestige` ;
  2. supprimer `glassfish/domains/<domaine>/generated/policy/prestige` ;
  3. `asadmin deploy --name prestige --contextroot prestige target/prestige.war`.
- **Droits.**
  - Onglet Historique : `P_SM_PROMOTION_History`.
  - Ventes en promotion et Analyse : `P_SM_PROMOTIONS` ou `P_SM_PROMOTION_History`.

## 6. Reste à faire (en attente de votre ordre)

- Déploiement sur le domain2.
- Plan du 06/11 : points 9 (détail), 10, 11, 7 et 8.
- Export et import du PSCODE.
- Points 1 et 2 de la section 3, à confirmer.
