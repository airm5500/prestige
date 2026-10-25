# Mécanismes à corriger dans le code — Vente comptant (VNO), stock, caisse

**Objet.** Document de transmission pour la branche/personne qui corrigera le
**code** de la vente comptant. **Aucune correction n'est appliquée ici.**

**Sources.** Rapport d'audit 01 du 11/10/2026 (anomalies VC-01 à VC-17, audité au
commit `8349d38d`) et **contre-vérification du 25/10/2026** : chaque point
côté serveur a été relu ligne à ligne au commit `81f5f2a1` de
`claude/new-session-xm8ptu`. La branche a évolué depuis l'audit : **deux
anomalies sont déjà corrigées** (VC-03, VC-10), les autres sont toujours
présentes ; les points purement mobiles (dépôt `prestige_vente_app`, absent ici)
n'ont pas pu être re-vérifiés et sont repris tels quels du rapport 01.

## État au 25/10 (commit `81f5f2a1`)

| ID | Anomalie (titre court) | État au HEAD | Preuve (mes lignes) |
|---|---|---|---|
| VC-03 | Double annulation / annulation d'une vente non encaissée | **CORRIGÉ** (commit `9a954ba3`, 14/10) | verrou `PESSIMISTIC_WRITE` + `refusAnnulation` (`SalesServiceImpl.java:419`, `:433-448`) : déjà annulée, copie d'annulation, non terminée → refus |
| VC-10 | Mouvement VENTE incohérent avec déconditionnement | **CORRIGÉ** | stock de début relu **après** le déconditionnement, dans les deux chemins (`MvtProduitServiceImpl.java:228`, `:335` + commentaire) |
| VC-01 | Ligne d'une vente encaissée encore modifiable | **PRÉSENT** | `updateTPreenregistrementDetail` (`:1615-1699`) sans aucun contrôle d'état, alors que `controleVenteModifiable` existe (`:1771`) et est appelé à l'ajout (`:1816`) et au retrait (`:1796`) |
| VC-02 | « Terminer la prévente » remet une vente encaissée en `is_Process` | **PRÉSENT** | `closePreventeVente` (`:5304-5311`) écrit le statut sans le lire |
| VC-04 | Annulation pendant modification → origine annulée deux fois | **PRÉSENT** | `refusAnnulation` ne connaît pas la copie de modification ouverte ; `annulerVenteAnterieur` (`:4737+`) sans garde `b_IS_CANCEL` |
| VC-05 | TVA doublée sur vente avec remise | **PRÉSENT** | double `montantTva.add` : `:3478`/`:3503` (`getRemiseVno`) et `:5169`/`:5193` (`getRemiseVnoCheckUg`) |
| VC-06 | Prévente avec remise encaissée plein tarif (mobile) | **PRÉSENT côté serveur** | `shownetpayVno(SalesParams)` sans `remiseId` : net recalculé, **`int_PRICE_REMISE` non remis à 0** (`:3419-3424`) ; la clôture déduit la remise (`:2930`). Partie mobile non re-vérifiable ici |
| VC-07 | Net enregistré (remise non arrondie) ≠ net encaissé (arrondi à 5) | **PRÉSENT** | `:3514`/`:3520` et `:5219`/`:5225` |
| VC-08 | Client de la vente remplacé par « especes » (mobile) | **PRÉSENT côté serveur** | `updateclient` (`:4059-4072`) sans contrôle de statut ni du client reçu |
| VC-09 | Stock négatif à la validation malgré `FORCER_STOCK_VENTE = 0` | **PRÉSENT** | la clôture ne recontrôle que le détail (`refuserVenteDetailInvendable`, `:2889`) ; aucun `forcerStock` |
| VC-11 | Annulation : quantités rendues au mauvais lot | **PRÉSENT** | restitution = `pickLot(produit, qté<0)` → `TLot.findByProduitId` (lots **non périmés**, sans filtre de stock, tri péremption, `TLot.java:32`) ; `decrementerLots` crédite tout au **premier** lot (`LotServiceImpl.java:239-296`). Amélioré seulement côté vente (lots scannés, imputation des périmés) |
| VC-12 | Modification d'une vente passée : caisse datée du jour d'origine, stock/recette du jour | **PRÉSENT** | `if (!tp.getCopy()) setDtUPDATED(new Date())` (`:2970-2972`) ; contre-passation et transaction copiée antidatées (`:370-395`) |
| VC-13 | Hors-ligne : date/caissier de la synchronisation ; « Renvoyer » déclare un montant non perçu | **PRÉSENT côté serveur** | clôture = utilisateur courant (`:2844`) et date du jour ; aucun champ date/caissier dans le corps. Partie mobile non re-vérifiable ici |
| VC-14 | Prix unitaire et montants du poste pris tels quels | **PRÉSENT** | `controleMontantsCloture` ne refuse que absent/négatif (`:3872-3882`) ; montants recopiés dans recette/transaction/règlements |
| VC-15 | Recherche de ligne de stock non déterministe | **PRÉSENT** | `findStock` (`:1016-1025`) : ni filtre de statut, ni `ORDER BY`, `setMaxResults(1)` |
| VC-16 | Mouvement de caisse antidaté : dates incohérentes entre tables | **PRÉSENT** | `CaisseServiceImpl.java:857`, `:882` (date saisie) vs transaction datée du jour |
| VC-17 | Historique mobile tronqué | Non re-vérifiable ici (mobile) | repris du rapport 01 |

**Acquis à préserver** (vérifiés au HEAD, à ne pas régresser) : clôture sous
verrou avec réponse idempotente et contrôle « déjà clôturée » **avant** la
branche des copies (`:2856-2870`) ; annulation verrouillée et refusée si déjà
annulée / non terminée (`:419`, `:433-448`) ; rollback de toute clôture
incomplète (`annulerClotureIncomplete`) ; total de l'en-tête comparé aux lignes
(`diffAmount`, `:2914`) ; l'origine d'une modification n'est annulée qu'après
tous les contrôles (`:2941-2952`).

---

## Mécanismes à corriger (groupés par chantier)

### C1 — Écritures acceptées sur une vente déjà encaissée (VC-01, VC-02, VC-08)

**Analyse.** Trois points d'entrée écrivent sans lire l'état de la vente :
`update/item/vno` → `updateTPreenregistrementDetail` (`:1615`),
`terminerprevente` → `closePreventeVente` (`:5304`), `update/client` →
`updateclient` (`:4059`). Un poste resté sur une vente qu'un autre poste vient
d'encaisser peut la dénaturer : quantité/prix d'une ligne déjà déstockée,
retour en `is_Process` d'une vente encaissée (elle sort du solde de clôture de
caisse et devient inclôturable — index unique `pkey_unq` sur `MvtTransaction`),
client remplacé ou effacé.

**Reproduction.** Rapport 01, VC-01/02/08 (deux postes, même prévente).

**Correction proposée.** Appliquer `controleVenteModifiable` (déjà écrit,
`:1771`) en tête des trois méthodes ; pour `closePreventeVente`, n'accepter que
les statuts d'une vente non encaissée et refuser explicitement sinon ; pour
`updateclient`, refuser aussi un identifiant client inconnu (ne jamais poser
`null` silencieusement).

**Vigilance.** L'appli mobile appelle `update/client` avec le nom du mode de
règlement avant chaque encaissement (rapport 01, VC-08) : le refus serveur ne
doit pas bloquer l'encaissement mobile — corriger aussi l'appli (hors dépôt).

### C2 — Vente d'origine annulée deux fois pendant une modification (VC-04)

**Analyse.** `refusAnnulation` (`:433-448`) ne refuse pas l'annulation d'une
vente dont une **copie de modification est ouverte** ; et `annulerVenteAnterieur`
(`:4737+`), appelé à la clôture de la copie, ne vérifie pas `b_IS_CANCEL`.
Séquence : B annule V pendant que A modifie V ; A clôture la copie → V est
ré-annulée (stock recrédité deux fois, caisse remboursée deux fois).

**Correction proposée.** ① Dans `refusAnnulation` : refuser si une copie
`copy = 1` en `is_Process` pointe la vente (`lg_PARENT_ID`). ② Dans
`annulerVenteAnterieur` : verrouiller la vente d'origine et sortir (ou échouer
proprement) si `b_IS_CANCEL = 1`. Les deux gardes sont nécessaires (l'une sans
l'autre laisse une fenêtre).

### C3 — TVA doublée sur toute vente comptant avec remise (VC-05)

**Analyse.** `getRemiseVno` et `getRemiseVnoCheckUg` ajoutent la TVA de chaque
ligne une fois pour toutes les lignes (`:3478`, `:5169`) puis une seconde fois
pour les lignes comptées (`:3503`, `:5193`). Test exécuté du rapport 01 : TVA
3 960 au lieu de 2 160. La valeur fausse est recopiée dans le mouvement de
caisse ; les états de TVA sont faux.

**Correction proposée.** Supprimer le second ajout dans les deux méthodes (même
règle que `sumVenteSansRemise`). **Reprise associée** : recalculer
`t_preenregistrement.montantTva` des ventes avec remise depuis la somme des
lignes (requête de vérification du rapport 01, VC-05).

### C4 — Remises et montants non maîtrisés par le serveur (VC-06, VC-07, VC-14)

**Analyse.**
- Net demandé **sans** `remiseId` : recalcul sans remise mais `int_PRICE_REMISE`
  conservé (`:3419-3424`) ; la clôture déduit cette remise (`:2930`) → un poste
  qui ignore les remises (mobile) encaisse le plein tarif pendant que la base
  enregistre la remise.
- La remise enregistrée n'est pas arrondie alors que le net affiché/encaissé
  l'est (`:3514` vs `:3520`) → écarts de 1-2 F systématiques entre
  `montantNet`, `montantPaye`, `vente_reglement` et `t_recettes`.
- `controleMontantsCloture` (`:3872-3882`) ne refuse qu'absent/négatif : prix
  unitaire, montant payé, marge et montants des règlements sont pris tels
  qu'envoyés (clôture possible à 0 F par appel direct).

**Correction proposée.** Faire du serveur la seule autorité : le net suit la
remise portée par la vente (ou la remet à 0 explicitement) ; enregistrer la
remise arrondie (celle affichée) ; à la clôture, recalculer net/marge côté
serveur et refuser `montantPaye` ≠ net (hors monnaie) et une somme de règlements
différente du net ; à l'ajout de ligne, relire le prix de la fiche et appliquer
la même autorisation de changement de prix qu'à la modification.

### C5 — Stock non recontrôlé à la validation (VC-09)

**Analyse.** `FORCER_STOCK_VENTE = 0` n'est contrôlé qu'à la saisie ; la
validation ne recontrôle que les produits détail (`:2889`). Deux ventes en
cours sur deux postes → stock négatif ; le `@Version` de `TFamilleStock`
n'empêche que la perte de mise à jour simultanée, pas le passage sous zéro en
validations successives.

**Correction proposée.** À la validation, rejouer `forcerStock` ligne par ligne
avant toute écriture (même place que `refuserVenteDetailInvendable`).

### C6 — Lots et lignes de stock non déterministes (VC-11, VC-15)

**Analyse.** À l'annulation, la restitution appelle la sortie de lot en négatif :
la liste est `TLot.findByProduitId` (lots **non périmés**, sans filtre de stock,
triés par péremption, `TLot.java:32`) et `decrementerLots` crédite tout au
**premier** lot (`LotServiceImpl.java:280-296`) — pas à celui d'où les boîtes
sont sorties ; si tout venait d'un lot désormais périmé, rien n'est recrédité
(les périmés sont exclus de cette liste). Par ailleurs `findStock`
(`SalesServiceImpl.java:1016-1025`) choisit « la » ligne de stock sans filtre de
statut ni ordre : l'annulation et les contrôles de saisie peuvent viser une
autre ligne que celle débitée (si doublons en base — requête de vérification du
rapport 01, VC-15).

**Correction proposée.** Mémoriser à la vente les lots réellement sortis (le
mécanisme « lots scannés » `:5343-5345` en pose la base) et les recréditer à
l'annulation ; aligner `findStock` sur la recherche du déstockage (statut actif,
ordre explicite) puis fusionner les doublons et poser une contrainte unique.

### C7 — Dates de caisse incohérentes (VC-12, VC-13 côté serveur, VC-16)

**Analyse.**
- Clôture d'une **copie** de modification : `dt_UPDATED` d'origine conservé
  (`:2970-2972`), mouvement de caisse et contre-passation **antidatés au jour
  d'origine** (`:370-395`) pendant que stock et recette positive sont datés du
  jour → les totaux d'une caisse déjà clôturée changent après coup, la caisse du
  jour ne voit pas l'encaissement.
- Vente synchronisée (hors-ligne) : datée de la synchronisation et attribuée au
  caissier connecté (`:2844`, `:2971`) — aucun champ date/caissier dans le corps
  de clôture.
- Mouvement de caisse manuel : la date saisie ne va que dans `t_mvt_caisse` et
  `t_reglement` (`CaisseServiceImpl.java:857`, `:882`), la transaction reste au
  jour courant ; date future acceptée par appel direct.

**Correction proposée.** Décider **une** règle (recommandation du rapport 01 :
la date de l'opération réelle pour tout ce qui touche la caisse) et l'appliquer
à toutes les écritures d'une même opération ; transmettre date et caissier des
ventes hors-ligne ; refuser les dates futures côté serveur.

---

## Corrigés depuis l'audit — à verrouiller par des tests

- **VC-03** (double annulation, annulation d'une vente non encaissée) : corrigé
  par `9a954ba3`. Écrire le test de non-régression (deux annulations, annulation
  d'une vente en cours, annulation d'une copie d'annulation → trois refus).
- **VC-10** (mouvement VENTE avec déconditionnement) : corrigé (stock relu après
  déconditionnement, deux chemins). Test : vente de détail déclenchant un
  déconditionnement → `qteDebut − qteMvt = qteFinale` sur la ligne VENTE.

## Traces en base à reprendre (après correctifs)

Les requêtes de vérification du rapport 01 restent valides et servent
d'affichage ; corrections **manuelles** (sauvegarde + transaction, comme les
notices de reprise différés/assurances) :
- TVA des ventes avec remise à recalculer (VC-05) — correction sûre, formule =
  somme des `montantTva` des lignes ;
- doubles annulations déjà produites (VC-03/04) — stock et caisse à arbitrer cas
  par cas (requête VC-03) ;
- ventes `is_Process` portant une transaction (VC-02) — à requalifier
  `is_Closed` après contrôle ;
- écarts net/encaissé (VC-06/07, requête VC-06) et montants hors net (VC-14) —
  chiffrage puis arbitrage ;
- stocks négatifs (VC-09), lots `current_stock > int_NUMBER` (VC-11), doublons
  `t_famille_stock` (VC-15), lignes vente ≠ sorties stock (VC-01),
  `HMvtProduit` incohérents antérieurs au correctif (VC-10) — inventaire
  physique ou fusion à arbitrer ;
- fiches client nommées comme des modes de règlement (VC-08) — à neutraliser.

## Critères d'acceptation

1. Règles du projet : chaque mécanisme corrigé est d'abord **reproduit par un
   test qui échoue**, via le vrai chemin de l'écran ; tests un par un ; les
   données de test sont retirées.
2. Invariants à vérifier sur banc après correctifs : une vente encaissée est
   immuable hors annulation/modification contrôlées ; stock jamais négatif avec
   `FORCER_STOCK_VENTE = 0` ; `qteDebut − qteMvt = qteFinale` sur tout mouvement ;
   somme des règlements = net encaissé = recette ; une annulation rend le stock
   au lot débité ; les écritures d'une même opération portent la même date.
3. Aucune régression sur les acquis listés en tête (idempotence clôture,
   refus d'annulation, rollback).
4. Les points mobiles (VC-06/08/13/17 côté application) se traitent dans le
   dépôt `prestige_vente_app` — hors de portée de cette branche serveur, mais
   les refus serveur de C1/C4 doivent être coordonnés avec l'appli.
