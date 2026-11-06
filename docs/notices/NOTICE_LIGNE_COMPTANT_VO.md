# Ligne au comptant dans une vente assurance (cas 1 du 03/11/2026)

Analyse et décisions : `docs/analyses/2026-11-03/cas1-ligne-comptant-vente-credit.md` (§0), plan `plan-realisation.md` §5,
maquettes `cas1-ligne-comptant.html` et `cas1-tickets.html`. Option A retenue : **une saisie, deux ventes, deux tickets**.

## Paramètre

`KEY_LIGNE_COMPTANT_VO` (rubrique « Ventes et caisse » du paramétrage), **0 par défaut**.

- À `0` : rien ne change. La colonne « C » n'est pas créée dans la grille, le rail de paiement est celui d'aujourd'hui,
  le service de cochage répond 403, la clôture et les tickets suivent le code actuel. Test d'écran 1 : capture de
  l'en-tête identique au pixel, clôture sans vente liée.
- À `1` : en **vente assurance (type 2) seulement** (jamais en carnet ni au comptant), chaque ligne a une case « C ».

## Règles (décisions validées)

| Point | Règle |
|-------|-------|
| Cochage | Tout vendeur, tant que la vente n'est pas close. Refusé sur une ligne en promotion (Q1.2). `PUT v1/vente/item/{id}/comptant {comptant}`. La coche survit à `update/item/vno`, à la mise en attente et à la reprise, et à la copie de modification. |
| Calcul du net | Les lignes cochées sortent du moteur tiers-payant (`SalesNetComputingServiceImpl`, via `LigneComptant.lignesPourLeCalcul`) ; le moteur `TiersPayantCalculationService` n'est pas modifié. La remise produit s'applique aussi aux lignes cochées (Q1.1). Net = part client des lignes assurance + lignes comptant ; `MontantAPaye` porte `montantComptant` (arrondi à 5) et `montantPartClient`. |
| Écran | Colonne « C » (40 px, avant la poubelle), ligne cochée sur fond jaune pâle avec la pastille COMPTANT, rail « DONT COMPTANT » / « DONT PART CLIENT ». Après la clôture : bandeau « Vente terminée et scindée : … », jamais de fenêtre. |
| Clôture | `updateVenteClotureAssurance` : si le paramètre est actif **et** qu'au moins une ligne est cochée, `scinderLignesComptant` crée une vente comptant liée (même client, vendeur, caisse, remise, médecin, emplacement), y déplace les lignes cochées (déstockage unique), ramène les totaux de la vente assurance aux lignes restantes ; la vente assurance est close par le code actuel, la vente comptant par `updateVenteClotureComptant`, dans la même transaction et sous le même verrou. Un refus annule les deux. `cloturer/assurance` renvoie `venteLiee`, `refVente`, `refVenteLiee`, `montantComptant`, `partClient`. |
| Règlement | Imputé d'abord sur le comptant, puis sur la part client de la vente assurance (Q1.3, `LigneComptant.imputation` et `repartirReglements`) ; la monnaie reste sur la vente assurance ; le différé suit la règle actuelle. |
| Annulation | Rien de lié (Q1.5) : chaque vente s'annule seule. Le détail de vente affiche « Vente liée n° … ». |
| Tickets | `VENTE_ASSURANCE` : « Crédit : T[taux %] — Mont. : part » sous chaque ligne, par tiers-payant, **seulement si le paramètre est actif** (Q1.9), parts ramenées au total de l'organisme (`CreditLigne`). Nouveau modèle `VENTE_MIXTE` (menu « Modèles de ticket ») = reçu client combiné : les deux ventes, « LIGNE COMPTANT », un seul code-barres (vente assurance). `ticket/vo` imprime les exemplaires tiers-payant, le reçu caisse existant, puis le ticket combiné quand il y a une vente liée (impression et réimpression). |

## Base

Migration `V7.2.35__ligne_comptant_vo.sql` (rejouable) : `t_preenregistrement_detail.comptant TINYINT(1) NOT NULL DEFAULT 0`,
`t_preenregistrement.lg_VENTE_LIEE_ID VARCHAR(40)` + index `ix_vente_liee`, paramètre `KEY_LIGNE_COMPTANT_VO = 0`.

## Code

- Règles pures : `rest/service/vente/LigneComptant.java` (tests `LigneComptantTest`).
- Tickets : `rest/service/ticket/CreditLigne.java`, `TicketCombine.java`, `ConversionTicket` (sections, mentions sous la
  ligne), `ExemplesTicket` (aperçu VENTE_MIXTE), tests `TicketLigneComptantTest` et `RenduTicketTest`.
- Écran : `model/caisse/VenteItem.js` (`comptant`), `view/vente/VenteVNO.js` (colonne, rail, fond de ligne),
  `controller/VenteCtr.js` (paramètre, cochage, rail, bandeau), `vente-theme.css`, `DetailVente.js`.
- Au passage : `ImpressionServiceImpl.estLigneArticle` ne compte plus les mentions sous la ligne (promotion, crédit) comme
  des articles lors de la mise en page d'un ticket de plus de 40 lignes.

## Tests d'écran (un par un, `node src/test/e2e/ligne-comptant/<test>.js`, base de travail seulement)

1. `test-parametre-0-identique.js` : paramètre à 0, écran identique au pixel, clôture inchangée ; paramètre à 1 en comptant, rien de visible.
2. `test-une-ligne-cochee.js` : un tiers-payant, remise 5 %, une ligne cochée : rail, clôture en deux ventes, imputation, stock, bandeau, annulation de la vente comptant sans toucher l'assurance.
3. `test-promotion-et-carnet.js` : refus sur une ligne en promotion (écran et serveur), colonne cachée en carnet et au comptant.
4. `test-attente-reprise.js` : mise en attente puis reprise, la coche survit.
5. `test-non-regression-cloture.js` : paramètre à 0 et à 1 sans coche ⇒ mêmes lignes écrites ; échec simulé pendant la clôture de la vente comptant ⇒ aucune des deux ventes close.

## Tests de la règle du 05/11 (rapprochement, cohérence, bilan)

| Famille | Test | Ce qu'il compare ou vérifie |
|---|---|---|
| Rapprochement (e2e) | `src/test/e2e/ligne-comptant/test-rapprochement-ligne-comptant.js` | Trois lignes (quantités 2, 1 cochée, 3), remise 5 %, un organisme à 70 % : écran (grille, rail) = base (lignes des deux ventes, part de l'organisme, part client, mouvements de caisse) = ticket assurance (aperçu `ticket/vo/{id}/apercu` : lignes assurance seules, « Taux 70 % : part », somme = part en base = bloc client, net = part client) = ticket client combiné (aperçu `ticket/vo/{id}/apercu-combine` : sections, Part du client, Comptant, Total des deux ventes, net) = détail de vente (`ventestats/find-one` : vente liée et sa référence, dans les deux sens). `E2E_DEFAUT=1` altère le prix de la vente comptant en base après la clôture : le test doit échouer (3 rapprochements sur 19). |
| Cohérence (unitaire) | `LigneComptantCoherenceTest` (5 000 ventes tirées, graine fixe) | Lignes du moteur = lignes non cochées (ordre, rien de perdu) ; montants des lignes cochées (prix, remise, TVA, CA, marge) ; arrondi à 5 ; imputation comptant d'abord, somme = payé, jamais négatif ; répartition des modes de règlement (un mode une fois par vente, versé ≥ montant) ; charge de la vente liée (payé, reçu, monnaie, total, marge, règlements partagés sans perte). Preuve « échoue d'abord » : avec l'assurance servie avant le comptant, 2 propriétés sur 6 échouent. |
| Cohérence (unitaire) | `CreditLigneCoherenceTest` (intégration du 05/11) | Parts par ligne du ticket assurance : part = base × taux, somme = total, jamais négative, plafond au prorata. |
| Bilan avant / après (e2e) | `src/test/e2e/ligne-comptant/test-bilan-ligne-comptant.js` | A : deux organismes (RO plafonné par vente, RC), quantités 2, 3 et 1, deux lignes cochées : stock −quantité une fois par produit, mouvements de stock sur la bonne vente, un mouvement de caisse, une recette et un règlement par vente, lignes tiers-payant (RO au plafond, somme = écran), ticket assurance (parts par organisme = base) ; annulation de la vente comptant (ses produits reviennent, l'assurance ne bouge pas) puis de la vente assurance (tout le stock rendu). B : différé : une dette par vente (part client, comptant), solde du client = somme des dettes = net, aucune recette. C : organisme à 100 % : part client 0, net = comptant seul, l'assurance n'encaisse rien. |
| Bilan (e2e, déjà livré) | `test-non-regression-cloture.js`, `test-une-ligne-cochee.js` | Paramètre 0 / 1 sans coche : mêmes lignes écrites ; échec simulé ⇒ aucune des deux ventes close ; annulation de la vente comptant sans toucher l'assurance. |

Défaut confirmé le 05/11 par le test de rapprochement : la vente liée (`lg_VENTE_LIEE_ID`) était écrite en base mais le
détail de vente (`ventestats/find-one`, `SalesStatsServiceImpl.getOne`) ne la relisait pas. Corrigé : le DTO du détail porte
`venteLiee` et `venteLieeRef`.

## Recette officine

Activer le paramètre sur un poste pilote une semaine avant généralisation. Le paramètre se lit à chaque ouverture de
l'écran de vente.
