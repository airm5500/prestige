# Confirmation des audits de code — reproductions du 25/10/2026

**Objet.** Reprendre, constat par constat, les notices rédigées sans correction :

- `MECANISMES_CODE_VENTE_COMPTANT.md` (VC-xx) ;
- `MECANISMES_CODE_VENTE_ASSURANCE_CARNET.md` (CR-xx, CA-xx) ;
- `MECANISMES_CODE_FACTURATION_TIERS_PAYANT.md` (F1 à F6) ;
- `MECANISMES_CODE_ASSURANCES.md` (M1 à M6) ;
- `MECANISMES_CODE_DIFFERES.md` (D1 à D7, DIF-xx) ;
- les notices de reprise `REPRISE_DONNEES_ASSURANCES.md` et `REPRISE_DONNEES_DIFFERES.md`.

Pour chaque constat, le document donne :
- le module ;
- un cas concret ;
- la procédure à suivre à l'écran ;
- le résultat attendu et le résultat obtenu ;
- le test qui le reproduit ;
- la preuve.

Les §0 à §8 décrivent l'état **avant correction** (25/10). Les corrections, faites ensuite à la demande de
l'utilisateur, lot par lot, et leurs résultats après correction sont au **§9** (26/10).

**Règle de verdict, appliquée sans exception.**
- **Reproduit** : le défaut a été provoqué en passant par les routes de l'écran, et la mesure est citée.
- **Non reproduit** : le test a été joué, et le défaut ne s'est pas produit.
- **À vérifier** : le test n'a pas pu être joué ici. La raison est donnée, et aucune conclusion n'est tirée.
- **Corrigé** : le test de non-régression passe.

L'analyse du code (fichier:ligne) n'est jamais, à elle seule, une preuve.

---

## 0. Ce qu'il faut retenir

1. **50 constats reproduits** sur la copie de travail, dont 6 nouveaux (N1, N2, N3, N5, N8, N9). Pour plusieurs d'entre eux, l'argent ou le
   stock devient faux :
   - une dette de différé enregistrée à **0 F** pour un client qui doit 201 F (N3) ;
   - l'organisme porte **100 F de trop** sur une vente de 1 809 F (CR-06) ;
   - l'encours d'un organisme **double** à chaque annulation (CR-01) ;
   - le même bon facturé **deux fois** (F2) ;
   - **5 paires de factures sur 5** générées en même temps reçoivent le même numéro (F3) ;
   - une vente modifiée puis annulée laisse **0 F en caisse** pour une vente de 3 475 F (VC-04).
2. **6 non reproduits** : CR-04, F2 en provisoire, F4, F6, VC-15, M2/M3 avec la case « principal » cochée. Le cas
   de F4 compte : le code visé n'est atteint par aucun écran, car les factures de groupe passent par un autre
   contrôleur, et ce contrôleur donne des montants justes.
3. **2 corrigés**, confirmés par les tests existants : VC-03 et la partie comptant de VC-10.
4. **À vérifier** : les volets mobiles (dépôt absent ici), DIF-10 (écran), CA-01, CA-10, CA-07 (bloqué par N9) et
   la cause de N8.
5. **La base `elysees`** (lecture seule) confirme plusieurs familles par les données :
   - 961 comptes avec plusieurs RO actifs, 250 liens fantômes, 147 doublons ;
   - 110 numéros de facture en double ;
   - 10 ventes annulées alors qu'elles étaient déjà réglées (174 770 F restés en caisse sans contrepartie) ;
   - 43 stocks négatifs, 24 lots sur-crédités ;
   - un relevé de différés faux pour 24 clients sur 79.
6. **Deux nouveaux défauts graves** sont apparus pendant les essais :
   - **N8** : la création d'un client assuré par l'écran répond « succès » mais n'enregistre rien. Cela a été
     constaté trois fois, mais la cause n'est pas trouvée : à confirmer à l'écran avant toute conclusion.
   - **N9** : la clôture d'un retour carnet échoue dès que l'identifiant de sa ligne existe déjà comme clé d'un
     mouvement de stock.

---

## 1. Conditions des essais

**Code exécuté.** C'est l'application déployée sur le Payara local par la session principale (dernier commit poussé
de `claude/new-session-xm8ptu` : `fe047863`). Aucun fichier audité n'a changé entre les commits audités
(`81f5f2a1`, `2967314f`, `da68033e`, `910c18f6`, `a306c98a`) et `fe047863` : `git diff --stat` est vide sur ces
fichiers. Payara a été redéployé par la session principale à 23:09, 23:20 et 23:38. Les passages coupés par ces
redéploiements ont été rejoués ; les résultats cités viennent des passages complets.

**Rejeu sur la tête de branche (26/10, 00:03).** La session principale a redéployé la tête de
`claude/new-session-xm8ptu` (`c0d4acd6`, migrations jusqu'à V7.2.22). Entre `fe047863` et `c0d4acd6`, aucun
fichier audité ne change : seuls les droits, la fidélité et l'horloge sont touchés. `repro-assurances-liens.js`,
rejoué sur cette version, donne les mêmes résultats, N8 compris (preuve : `repro-assurances-liens-tete.txt`).

**Bases.**
- **Essais** : uniquement sur la copie de travail `laborex_v1_db`.
  - Sauvegardée avant le premier essai : `D:\sauvegardes_banc\laborex_v1_db_avant_repro_audits_2026-10-25.sql.gz`
    (592 Mo, vidage complet et vérifié).
- **`elysees`** : **lecture seule** (session MariaDB `READ ONLY`), comptages uniquement, aucune colonne nominative.
- **Copie de travail** : elle ne contient ni remise, ni différé, ni carnet dépôt, ni tiers payant exclu, ni facture
  de groupe, ni retour carnet. Les essais posent donc leur propre jeu de données, retiré ensuite.

**Scripts de reproduction** (dossier `src/test/e2e/audits/`). Chacun joue le parcours de l'écran par ses routes
REST, avec la session du compte de test `e2e`, et affirme le comportement **attendu**. Une ligne `FAIL` signifie
« défaut reproduit », avec la mesure entre crochets.

| Script | Module | Constats |
|---|---|---|
| `repro-vente-comptant.js` | Vente comptant | VC-01, 02, 04, 08, 09, 11, 12, 14, N1, N2 |
| `repro-remise-caisse.js` | Remise comptant, caisse | VC-05, 06, 07, 16 |
| `repro-vente-assurance.js` | Vente assurance | CR-01, 02, 03, 04, 07, 09, 10, CA-03, CA-09, N5 |
| `repro-vo-remise.js` | Remise en vente assurance | CR-05, N3, CR-06 |
| `repro-assurances-liens.js` | Liens client / tiers payant | N8, M1, M2, M3, M4 |
| `repro-facturation.js` | Facturation | F1, F2, F3, F4, F5, F6 |
| `repro-differes.js` | Différés | DIF-01, 02, 03, D2, D3, D4, D5, DIF-07, 08, 09 |
| `repro-carnet.js` | Carnet dépôt, retours | CA-06, CA-07, CA-08, CA-12, CA-15, N9 |
| `commun.js`, `nettoyer.js` | Outils | jeu d'essai marqué `ZZAUDIT`, nettoyage, reprise d'un nettoyage interrompu |

**Lancement** : un seul test à la fois, jamais en même temps qu'un test de la session principale. Les scripts
refusent de démarrer si un `node.exe` tourne déjà.

```bash
node src/test/e2e/audits/repro-vente-comptant.js
```

(avec `NODE_PATH`, `PLAYWRIGHT_BROWSERS_PATH` et le fichier d'options MariaDB décrits dans
`outils/poste-local/LISEZMOI.md`).

**Preuves.** La sortie brute de chaque passage est conservée dans `docs/notices/preuves-audits-2026-10-25/`.

**Gravité.** **A** = argent ou stock faux ; **D** = données incohérentes ; **Af** = affichage.

---

## 2. Tableau récapitulatif

Légende : **R** reproduit · **NR** non reproduit · **AV** à vérifier · **C** corrigé.
« elysees » = constat par les données de la base `elysees`, en lecture seule.

### 2.1 Vente comptant, caisse

| ID | Constat | Verdict | Mesure obtenue | elysees | Grav. |
|---|---|---|---|---|---|
| VC-01 | Ligne d'une vente encaissée modifiable | **R** | ligne 2 → 5 boîtes acceptée, vente 6 950 → 17 375 F, stock déstocké de 2 seulement, transaction 6 950 | 6 ventes au total ≠ transaction | A |
| VC-02 | « Terminer la prévente » remet une vente encaissée en cours | **R** | réponse succès, statut `is_Closed` → `is_Process`, transaction conservée | 0 (copie : 4) | A |
| VC-03 | Double annulation | **C** | `test-annulation-vente-double.js` 11/11 | 1 646 cas, le dernier le 13/10/2026 (veille du correctif) | — |
| VC-04 | Annulation pendant une modification | **R** | annulation acceptée, clôture de la copie acceptée ; l'origine est annulée **3 fois** ; stock 97 → 97 au lieu de 96 ; caisse nette **0 F** pour une vente de 3 475 F | voir VC-03 | A |
| VC-05 | TVA doublée avec remise | **R** | TVA de l'en-tête **998**, somme des lignes **499**, mouvement de caisse 998 | aucune remise | A |
| VC-06 | Net sans remise, remise conservée | **R** | net demandé sans remise 3 270 F (plein tarif) ; la vente enregistre une remise de 327 F | aucune remise | A |
| VC-07 | Remise enregistrée ≠ remise encaissée | **R** | remise affichée 325, enregistrée 327 ; net payé 2 945, prix − remise enregistrée 2 943 | aucune remise | A |
| VC-08 | Client d'une vente encaissée remplacé | **R** | client inconnu envoyé → succès, client de la vente devenu NULL | — | D |
| VC-09 | Stock négatif à la validation | **R** | stock 1, deux ventes validées → stock **−1** | 43 stocks négatifs | A |
| VC-10 | Mouvement VENTE et déconditionnement | **C** (comptant) / **AV** (dépôt) | comptant : 2 → 16 → 13, cohérent ; dépôt : aucun dépôt sur la copie | — | — |
| VC-11 | Annulation : stock rendu au mauvais lot | **R** | vente sortie du lot B ; annulation : A = 2, B = 3 au lieu de A = 0, B = 5 | 24 lots sur-crédités | A |
| VC-12 | Modification d'une vente passée : dates mélangées | **R** | transaction de la copie et contre-passation au 24/10 ; recette et stock au 25/10 | — | A |
| VC-13 | Hors-ligne : date et caissier | **AV** | mobile, hors dépôt | — | D |
| VC-14 | Montants du poste pris tels quels | **R** | clôture « 1 F payé » d'une vente de 6 950 F acceptée ; transaction payé 1, recette 1 F | — | A |
| VC-15 | Ligne de stock non déterministe | **NR** | index unique `un_stock_emp` présent sur les deux bases : doublon impossible | 0 doublon | — |
| VC-16 | Mouvement de caisse antidaté | **R** | mouvement et règlement au 24/10, transaction au 25/10 ; date de demain acceptée | 7 mouvements (2022-2024) | D |
| VC-17 | Historique mobile tronqué | **AV** | mobile | — | Af |
| N1 | Annulation échouée à moitié enregistrée | **R** | réponse « Erreur annulation », mais vente annulée, 1 copie d'annulation, 1 contre-passation | — | A |
| N2 | Modification d'une vente annulée | **R** | ouverture acceptée ; l'écran reçoit l'annulation (−3 475 F) comme « copie » | — | D |

### 2.2 Vente assurance, carnet

| ID | Constat | Verdict | Mesure obtenue | elysees | Grav. |
|---|---|---|---|---|---|
| CR-01 | Annulation : encours augmenté | **R** | encours organisme et client 564 → **1 128** après annulation (attendu 0) | — | A |
| CR-02 | Modification : ancienne part comptée deux fois | **R** | modification sans changement : encours **1 692** pour une part de 564 | — | A |
| CR-03 | Clôture refusée sans rollback | **R** | bon refusé ; encours A 353 → 706, ligne A close sur une vente en cours ; second essai → 1 059 | 0 (copie : 1) | A |
| CR-04 | Encours sans verrou | **NR** | 3 paires de clôtures simultanées : encours = somme exacte | — | — |
| CR-05 | Remise déduite deux fois (transaction) | **R** | part client 201, transaction : réglé **0** pour 200 payés | aucune remise | A |
| N3 | Remise déduite deux fois (dette différée) | **R** | dette du client **0 F** au lieu de 201 F | aucune remise | A |
| CR-06 | Remise > part client | **R** | TP 1 909 + client 0 = 1 909 pour un net de 1 809 : **+100 F** à l'organisme | aucune remise | A |
| CR-07 | Taux et part du poste enregistrés | **R** | clôture avec part 1 F et taux 1 % acceptée ; ligne 1 F / 1 % | — | A |
| CR-08 | Vente annulée deux fois | **C** | voir VC-03 | — | — |
| CR-09 | Taux hors 0-100 | **R** | complémentaire à **250 %** acceptée | 0 | A |
| CR-10 | `removetp` sur vente encaissée | **R** | ligne tiers payant supprimée d'une vente encaissée : plus facturable | 1 VO close sans ligne | A |
| CA-01 | Multi-carnets mobile | **AV** | mobile | — | A |
| CA-03 | Champ d'état dans l'EJB sans état | **R** | après une vente « exclue », **8 ventes ordinaires sur 8** enregistrées comme exclues ; suppression du tiers payant exclu → clôtures assurance en échec sur cette instance | aucun TP exclu | A |
| CA-06 | Règlement carnet dépôt ≤ 0 | **R** | −1 000 F accepté, solde 5 000 → **6 000** | aucun dépôt | A |
| CA-07 | Retour carnet rejoué | **AV** | clôture impossible sur la copie (N9) | — | A |
| CA-08 | Quantité de retour ≤ 0 | **R** | retour de −3 boîtes accepté | — | A |
| CA-15 | Motif absent | **R** | HTTP **500** | — | Af |
| CA-09 | Changement d'organisme sans suivi des encours | **R** | encours A reste 564, B reste 0 | — | A |
| N5 | Changement d'organisme d'une vente facturée | **R** | ligne « charged » **supprimée**, nouvelle ligne « unpaid » : refacturable | — | A |
| CA-10 | Solde dépôt / relevé | **AV** | non joué | — | D |
| CA-12 | Retour carnet : historique faux | **R** (détail) | stock final noté 98 pour 100 + 2 ; historique de mouvement non mesurable (N9) | — | D |
| N9 | Clôture de retour carnet impossible | **R** | `Duplicate entry '7499' for key 'pkey_unq'` à chaque clôture | latent : collision à partir du 18 796ᵉ retour | A |

### 2.3 Facturation

| ID | Constat | Verdict | Mesure obtenue | elysees | Grav. |
|---|---|---|---|---|---|
| F1 | Suppression d'une définitive | **R** | `DELETE facturation/{id}` → 200 ; facture supprimée, bon resté « charged » | 0 | A |
| F2 | Bons non recontrôlés | **R** (définitive) / **NR** (provisoire) | même bon sur les factures **6220 et 6221** ; provisoire : bon écarté | 0 | A |
| F3 | Numéros de facture en double | **R** | **5 paires sur 5** avec le même numéro (6222/6222 … 6226/6226) | 110 numéros en double (le dernier le 02/01/2024) | A/D |
| F4 | Totaux de groupe perdus | **NR** | code non atteint par les écrans ; le chemin réel (`t_groupe_factures`) donne 2 292 + 2 292 = 4 584, juste | aucune facture de groupe | — |
| F5 | Remise à zéro globale des encours | **R** | facturer 1 bon sur 2 : encours client 4 584 → **0** ; organisme inchangé à 4 584 | — | A |
| F6 | Règlement de facture sans contrôle | **NR** (montant négatif) | −5 000 F refusé (« Echec de reglement »), facture inchangée ; verrou non testé | 23 détails ≤ 0 | — |

### 2.4 Liens client / tiers payant

| ID | Constat | Verdict | Mesure obtenue | elysees | Grav. |
|---|---|---|---|---|---|
| N8 | Création de client assuré non enregistrée | **R** (3 fois), cause **AV** | réponse succès + identifiant ; en base client / compte / ayant droit = 0 / 0 / 0 | — | D |
| M1 | Carnet qui remplace l'assurance | **R** | assurance `delete` priorité −1, carnet `enable` RO = 1 priorité 1 | 1 carnet RO (copie : 353) | D |
| M2 | RO empilés | **R** (case non cochée) / **NR** (cochée) | 2 RO actifs | 961 comptes multi-RO | D |
| M3 | Lien ressuscité en priorité −1 | **R** (case non cochée) / **NR** (cochée) | complémentaire `enable` priorité **−1** | 250 liens actifs priorité < 1 | D |
| M4 | Bascule silencieuse du RO | **R** | sans rien changer : carnet RO = 1, assurance RO = 0, lien supprimé reclassé priorité 2 | 1 583 comptes sans RO ; 118 liens supprimés reclassés | D |
| M5 | « Principal » = priorité | constat structurel | — | 1 163 RO actifs en priorité ≠ 1 | D |

### 2.5 Différés

| ID | Constat | Verdict | Mesure obtenue (vente de 5 510 F) | elysees | Grav. |
|---|---|---|---|---|---|
| DIF-01 | Règlement pendant la modification | **R** | règlement accepté ; dette 5 510 + réglé 2 755 = **8 265** | 0 copie ouverte | A |
| DIF-02 | Acompte retiré deux fois | **R** | caisse 0 + dette 2 755 = **2 755** (manque 2 755) | 46 ventes avec acompte | A |
| DIF-03 | Changement de client après règlement | **R** | dettes 0 + 5 510, plus 2 755 réglés = **8 265** | — | A |
| D2 | Annulation d'une vente réglée | **R** | annulation acceptée, 2 755 F restés en caisse | **10 ventes, 174 770 F** | A |
| D3 | Liste des règlements vide | **R** | 0 ligne ; `NullPointerException` en `ReglementServiceImpl.java:1093` | — | Af |
| D4 | Relevé : acompte compté comme dû | **R** | relevé 5 510, reste dû 2 755 | 24 clients sur 79, écart total 144 114 F (indicatif) | D |
| D5 | Ligne de dette en double | **R** | après annulation, la ligne en double reste active | 1 vente | D |
| DIF-07 | Partiel : montant reçu non contrôlé | **R** | « 1 F reçu pour 2 755 payés » accepté | — | A |
| DIF-08 | Le règlement change la date de la dette | **R** | ligne datée de la vente (25/09) → 25/10 | — | Af |
| DIF-09 | Ventilation dans l'ordre des clics | **R** | la vente récente est soldée, l'ancienne reste due | — | D |
| DIF-10 | Valider à 0 F sans message | **AV** | non joué à l'écran | — | Af |

---

## 3. Fiches par module

Chaque fiche : **cas** (données posées), **à l'écran** (procédure pour l'utilisateur), **attendu / obtenu**,
**test**, **code**, **correction** (minimale) et **à rejouer** (chemins qui partagent le code).

### 3.1 Vente comptant

**VC-01 — Ligne d'une vente encaissée encore modifiable (A).**
- **Cas.** Produit à 3 475 F, stock 100. Vente de 2 boîtes, encaissée en espèces.
- **À l'écran.** Ouvrir la même prévente sur deux postes (ou deux onglets). Encaisser sur le poste B. Sur le poste
  A, resté ouvert, changer la quantité de la ligne à 5 dans la grille.
- **Attendu.** Refus « vente déjà clôturée ».
- **Obtenu.** Succès. Ligne 5 boîtes, vente 17 375 F, stock 98 (2 seulement déstockées), transaction de caisse
  6 950 F.
- **Test.** `repro-vente-comptant.js`, cas VC-01.
- **Code.** `SalesServiceImpl.java:1615` (aucun appel à `controleVenteModifiable`).
- **Correction.** `controleVenteModifiable` en tête de `updateTPreenregistrementDetail`.
- **À rejouer.** Vente comptant, vente en dépôt, proforma (`devis`), prévente (`pending`), route mobile
  `v2/vente/update/item/vno`.

**VC-02 — « Terminer la prévente » remet une vente encaissée en cours (A).**
- **Cas.** Vente d'une boîte encaissée.
- **À l'écran.** Sur le poste resté sur la prévente, cliquer « Terminer la prévente » après l'encaissement fait
  ailleurs.
- **Obtenu.** Succès. Statut `is_Process`, transaction conservée : la vente sort de la caisse du jour.
- **Test.** `repro-vente-comptant.js`, VC-02.
- **Code.** `SalesServiceImpl.java:5274-5281`.
- **Correction.** Verrou et refus si le statut n'est pas `pending`.
- **À rejouer.** « Terminer la prévente » dans `VenteCtr.js` et `VenteEnDepotCtr.js`.

**VC-04 — Annulation pendant une modification (A).**
- **Cas.** Vente d'une boîte à 3 475 F encaissée.
- **À l'écran.**
  1. Poste A : « Ventes terminées » → Modifier (la copie s'ouvre).
  2. Poste B : « Ventes terminées » → Annuler la même vente.
  3. Poste A : valider la copie.
- **Attendu.** Refus de l'annulation, ou une seule annulation de l'origine.
- **Obtenu.** Tout est accepté :
  - **3** enregistrements d'annulation pour l'origine ;
  - stock 97 → 97 alors que la copie vend une boîte ;
  - caisse nette (origine + copie + annulations) **0 F**.
- **Test.** `repro-vente-comptant.js`, VC-04.
- **Code.** `refusAnnulation` (`:433`), `annulerVenteAnterieur` (`:4737`).
- **Correction.** `refusAnnulation` refuse si une copie `copy = 1` est en cours. `annulerVenteAnterieur` verrouille
  l'origine et sort si elle est déjà annulée.
- **À rejouer.** Annulation simple, modification (comptant et assurance), abandon de modification.

**VC-05, VC-06, VC-07 — Remises de la vente comptant (A).**
- **Cas.** Remise d'essai de 10 % sur un produit à 3 270 F, TVA 18 %, compté dans le CA.
- **À l'écran.** Vente comptant → choisir la remise → « Net à payer » → encaisser.
  - **VC-05** : comparer la TVA du ticket Z à la somme des lignes.
  - **VC-06** : demander le net **sans** remise après l'avoir posée (cas de l'appli mobile), puis encaisser.
- **Obtenu.**
  - **VC-05** : TVA de la vente 998 pour 499 sur les lignes ; le mouvement de caisse porte 998.
  - **VC-06** : encaissé 3 270 F au plein tarif, mais remise de 327 F enregistrée.
  - **VC-07** : remise affichée 325, enregistrée 327 ; payé 2 945, prix − remise = 2 943.
- **Test.** `repro-remise-caisse.js`.
- **Code.** `SalesServiceImpl.java:3478` et `:3503` (double ajout de TVA), `:3419-3424`, `:3514` vs `:3521`.
- **Correction.**
  - Supprimer le second ajout de TVA (`:3503`, `:5193`).
  - Remise à 0 quand le net est demandé sans remise.
  - Enregistrer la remise arrondie.
- **À rejouer.** Net à payer avec et sans contrôle des UG, ticket Z, états de TVA, ventes mobiles.

**VC-08 — Client d'une vente encaissée remplacé (D).**
- **Cas.** Vente encaissée pour le client d'essai.
- **Appel.** `POST vente/update/client` avec un identifiant inconnu, comme le fait l'appli mobile.
- **Obtenu.** Succès, client de la vente = NULL.
- **Test.** `repro-vente-comptant.js`, VC-08.
- **Code.** `SalesServiceImpl.java:4059-4071`.
- **Correction.** Refuser un client inconnu ; contrôle d'état coordonné avec l'appli mobile.

**VC-09 — Stock négatif malgré `FORCER_STOCK_VENTE = 0` (A).**
- **Cas.** Stock 1, paramètre à 0.
- **À l'écran.** Deux postes saisissent chacun 1 boîte du même produit, puis valident l'un après l'autre.
- **Obtenu.** Les deux validations passent, stock **−1**.
- **Test.** `repro-vente-comptant.js`, VC-09.
- **Code.** Clôture `SalesServiceImpl.java:2889` (seul le détail est recontrôlé).
- **Correction.** Rejouer `forcerStock` ligne par ligne à la validation.
- **À rejouer.** Vente détail avec déconditionnement (`vente/test-historique-deconditionnement.js`).

**VC-11 — Annulation : stock rendu au mauvais lot (A).**
- **Cas.** Lot A (péremption à 200 jours) épuisé, lot B (400 jours) à 5. La vente de 2 boîtes sort du lot B.
- **À l'écran.** Annuler la vente, puis consulter les lots du produit.
- **Obtenu.** A = 2, B = 3 au lieu de A = 0, B = 5.
- **Test.** `repro-vente-comptant.js`, VC-11.
- **Code.** `SalesServiceImpl.java:977` → `LotServiceImpl.java:239-247`, `:280-296`.
- **Correction.** Mémoriser le lot de sortie et le recréditer à l'annulation.

**VC-12 — Modification d'une vente de la veille (A).**
- **Cas.** Vente encaissée, datée de la veille.
- **À l'écran.** Modifier cette vente sans rien changer, puis valider.
- **Obtenu.** Transaction de la copie et contre-passation datées de la veille ; recette et mouvement de stock datés
  du jour. Une caisse déjà clôturée change après coup.
- **Test.** `repro-vente-comptant.js`, VC-12.
- **Code.** `SalesServiceImpl.java:2970-2972`, `:4891-4897`.
- **Correction.** Une seule date pour toutes les écritures (décision n° 3).

**VC-14 — Montants du poste pris tels quels (A).**
- **Cas.** Vente de 6 950 F.
- **Appel.** Clôture avec « montant payé = 1 », par appel direct : l'écran bloque ce cas.
- **Obtenu.** Acceptée. Transaction : payé 1 ; recette 1 F.
- **Test.** `repro-vente-comptant.js`, VC-14.
- **Code.** `controleMontantsCloture` `:3872-3881`.
- **Correction.** Recalculer le net côté serveur et refuser un montant payé différent.

**VC-16 — Mouvement de caisse saisi à une autre date (D).**
- **À l'écran.** « Mouvement de caisse » → entrée de 1 000 F datée d'hier, puis une autre datée de demain.
- **Obtenu.**
  - Mouvement et règlement à la date saisie, transaction au jour même.
  - La date future est acceptée.
- **Test.** `repro-remise-caisse.js`, VC-16.
- **Code.** `CaisseServiceImpl.java:857`, `:882` ; `TransactionServiceImpl.java:184-186`.

**N1 — Annulation échouée mais à moitié enregistrée (A).**
- **Cas.** Vente encaissée, puis la ligne de stock du produit est retirée de l'emplacement. On simule ainsi un
  produit sans stock dans le dépôt de la vente ; la ligne est remise à l'identique ensuite.
- **À l'écran.** Annuler la vente.
- **Obtenu.** Message « Erreur annulation de la vente », mais la vente **est annulée**, avec une copie d'annulation
  et une contre-passation de caisse.
- **Test.** `repro-vente-comptant.js`, N1.
- **Code.** `SalesServiceImpl.java:709-714` (le `catch` n'annule pas la transaction).
- **Correction.** `annulerClotureIncomplete()` dans ce `catch` ; refus propre si la ligne de stock manque.

**N2 — Modification d'une vente annulée (D).**
- **Cas.** Vente encaissée, puis annulée.
- **Appel.** `PUT vente/modifier-vente-terme/{id}` (le bouton est masqué à l'écran pour une vente annulée :
  appel direct ou écran périmé).
- **Obtenu.** Succès. La « copie » renvoyée est l'enregistrement d'annulation (−3 475 F).
- **Test.** `repro-vente-comptant.js`, N2.
- **Code.** `SalesServiceImpl.java:4283-4291`, `:4305`.
- **Correction.** Refuser une vente annulée ou non close ; `findByParent` limité à `copy = 1`.

### 3.2 Vente assurance et carnet

Organisme d'essai à 80 %, client posé en base (voir N8). Produit sans TVA.

**CR-01 — Annulation : l'encours augmente (A).**
- **Cas.** Vente assurance encaissée : part tiers payant 564, encours organisme et client = 564.
- **À l'écran.** « Ventes terminées » → Annuler.
- **Obtenu.** Encours **1 128** (attendu 0).
- **Test.** `repro-vente-assurance.js`, CR-01.
- **Code.** `SalesServiceImpl.java:663`.

**CR-02 — Modification : ancienne part comptée deux fois (A).**
- **À l'écran.** Modifier la vente sans rien changer, puis valider.
- **Obtenu.** Encours **1 692** pour une part de 564.
- **Code.** `:4885`.

**Correction commune (CR-01, CR-02, F5) :** méthode de décrément, avec plancher à 0 ; incrément SQL relatif.

**CR-03 — Clôture refusée sans retour arrière (A).**
- **Cas.** Client à deux organismes (50 % et 30 %). Le bon « ZZAUDIT-DOUBLON » est déjà utilisé sur le second.
- **À l'écran.** Nouvelle vente avec ce bon → valider → refus. Revalider.
- **Obtenu.**
  - Refus « numéro déjà utilisé », mais l'encours du premier organisme passe de 353 à 706, et sa ligne est close
    sur une vente restée en cours.
  - Le second essai porte l'encours à 1 059.
- **Test.** `repro-vente-assurance.js`, CR-03.
- **Code.** `:2650-2654`, boucle `:3147-3185`, `catch` `:3197-3201` (et la branche caution `:2645-2647`).
- **Correction.** Contrôler tous les bons avant toute écriture ; `annulerClotureIncomplete()` sur tout échec.

**CR-05 et N3 — Remise déduite deux fois de la part client (A).**
- **Cas.** Organisme à 80 %, remise de 10 %, produit à 2 010 F : part client 201.
- **À l'écran.**
  - Vente assurance avec remise, encaissée en espèces.
  - Même vente en différé, 0 F reçu.
- **Obtenu.**
  - Espèces : transaction « réglé » **0** pour 200 encaissés.
  - Différé : dette du client **0 F** (attendu 201).
- **Test.** `repro-vo-remise.js`.
- **Code.** `:273` ; `addDiffere` `:2238-2239` ; `updateDiffere` `:3060-3061`.
- **Correction.** Utiliser `int_CUST_PART` tel quel (il est déjà net de remise).

**CR-06 — Remise supérieure à la part client (A).**
- **Cas.** Organisme à 95 %, remise de 10 %.
- **Obtenu.** Part TP 1 909 + part client 0 = 1 909 pour un net de 1 809 : l'organisme est facturé de **100 F** en
  trop.
- **Test.** `repro-vo-remise.js`.
- **Code.** `TiersPayantCalculationService.java:246-251`.
- **Correction.** Plafonner la remise à la part client (décision : qui supporte la remise ?).

**CR-07 — Part et taux du poste enregistrés (A).**
- **Appel.** Clôture renvoyant une part de 1 F et un taux de 1 % (le calcul serveur donne 80 %).
- **Obtenu.** Accepté ; ligne enregistrée 1 F / 1 %.
- **Code.** `:3161-3162`.

**CR-09 — Taux hors bornes (A).**
- **À l'écran.** Ajouter une complémentaire et saisir 250 %.
- **Obtenu.** Accepté.
- **Code.** `:3311`.

**CR-10 — Retrait d'un tiers payant sur une vente encaissée (A).**
- **Appel.** `GET vente/removetp/{lien}/{vente}` sur une vente encaissée.
- **Obtenu.** Ligne supprimée : la vente sort de la facturation.
- **Code.** `:3329-3372`.

**CA-03 — Ventes « exclues » fantômes (A).**
- **Cas.** Organisme d'essai exclu, puis organisme ordinaire.
- **À l'écran.** Une vente sur l'organisme exclu, puis 8 ventes ordinaires.
- **Obtenu.**
  - Les **8** ventes ordinaires sont enregistrées dans `vente_exclu` au nom de l'organisme exclu.
  - Après suppression de cet organisme, les clôtures assurance servies par la même instance échouent toutes
    (`TransientPropertyValueException`, `:2733`). C'est l'incident du §5.
- **Test.** `repro-vente-assurance.js`, CA-03.
- **Code.** `:201`, `:3177`, `:2733`.
- **Correction.** Supprimer le champ et passer le tiers payant en variable locale.

**CA-09 et N5 — Changement d'organisme d'une vente encaissée (A).**
- **À l'écran.** « Ventes terminées » → Modifier client / tiers payant → remplacer l'organisme A par B.
- **Obtenu.**
  - Encours de A inchangé (564), B reste à 0.
  - **N5** : sur une vente déjà facturée, la ligne « charged » est **supprimée** et remplacée par une ligne
    « unpaid », donc refacturable.
- **Test.** `repro-vente-assurance.js`, CA-09.
- **Code.** `:5388-5440`, `:5448-5518` (`ListUtils.removeAll(...).remove` en `:5517`).
- **Correction.** Refuser si une ligne n'est plus `unpaid` ; transférer l'encours de l'ancien lien au nouveau.

**CA-06, CA-08, CA-15, CA-12, N9 — Carnet dépôt et retours.**
- **CA-06 (A).** « Carnet dépôt » → Régler −1 000 F. Obtenu : accepté, solde 5 000 → **6 000**.
  Code `ReglementServiceImpl.java:441`.
- **CA-08 (A).** « Retour carnet » de −3 boîtes : accepté.
- **CA-15 (Af).** Retour sans motif : erreur **500** (`RetourCarnetServiceImpl.java:198`).
- **CA-12 (D).** Le détail du retour note un stock final de 98 pour 100 + 2 (`:127`).
- **N9 (A).** La clôture du retour (`PUT v2/retour-carnet-depot/{id}`) échoue :
  `Duplicate entry '7499' for key 'pkey_unq'`.
  - Le mouvement de stock prend pour clé l'identifiant numérique de la ligne de retour (`:93`, `:110`).
  - Cette clé est déjà prise par d'anciens mouvements d'inventaire.
  - Sur `elysees`, ces clés commencent à 18 796 : la panne surviendra au 18 796ᵉ retour.
  - **Correction** : préfixer la clé (`RC-` + id) ou utiliser un UUID.
- **Test.** `repro-carnet.js`.

### 3.3 Facturation

Factures définitives par le chemin de l'écran « Édition des factures » (`groupe-tierspayant/facturation-bons`,
ancien `GroupeTierspayantController`).

- **F1 (A).**
  - **À l'écran.** Liste des factures provisoires ouverte ; la facture devient définitive ailleurs ; supprimer la
    ligne depuis la liste restée ouverte.
  - **Obtenu.** HTTP 200 : facture supprimée, bon resté « charged », plus jamais facturable.
  - **Code.** `FacturationRessouce.java:441-451` → `FacturationServiceImpl.java:632-637`.
- **F2 (A).**
  - **À l'écran.** Générer la définitive d'un bon, puis, depuis le même écran resté ouvert, générer de nouveau avec
    ce bon coché.
  - **Obtenu.** Le bon est porté par les factures 6220 et 6221.
  - **Non reproduit en provisoire** : le bon y a été écarté.
- **F3 (A/D).**
  - **À l'écran.** Deux postes génèrent en même temps une définitive pour deux organismes.
  - **Obtenu.** 5 paires sur 5 avec le même numéro (6222/6222 … 6226/6226).
  - **Code.** Le compteur `KEY_CODE_FACTURE` est lu avant la transaction, dans l'ancien contrôleur
    (`GroupeTierspayantController.java:1383`) comme dans `GenererFactureServiceImpl.java:665`.
- **F5 (A).**
  - **À l'écran.** Deux ventes sur un organisme ; facturer un seul des deux bons.
  - **Obtenu.** Encours client 4 584 → **0** (la vente non facturée n'y est plus) ; encours organisme inchangé à
    4 584.
  - **Code.** `GroupeTierspayantController.java` `updateInvoicePlafond` (même logique qu'en
    `GenererFactureServiceImpl.java:456-470`).
- **F4 (NR).**
  - `genererFactureTiersPayants` (`GenererFactureServiceImpl.java:661+`) n'est appelé que par la facturation des
    carnets dépôt, avec un groupe toujours nul.
  - L'agrégation de groupe défaillante n'est donc atteinte par aucun écran.
  - L'écran de groupe range les membres dans `t_groupe_factures` (2 292 + 2 292 = 4 584) : c'est juste.
  - Le bug de code existe, mais il est mort ; à corriger seulement si ce chemin est réactivé.
- **F6 (NR).**
  - Règlement de −5 000 F refusé (« Echec de reglement »).
  - Les autres volets de F6 (verrou, deux règlements simultanés, trop-perçu) n'ont pas été joués : **AV**.

### 3.4 Liens client / tiers payant

**N8 — Création d'un client assuré non enregistrée (D, cause à vérifier).**
- **Cas.** `POST client/add/assurance` avec le corps de l'écran de vente (`VenteCtr.js:5205-5262`), en clientèle
  d'essai, essayé avec un organisme d'essai puis un organisme réel.
- **Obtenu**, trois fois : réponse `success: true` avec un identifiant de client, mais client, compte client et ayant
  droit absents de la base. La vente qui suit échoue (« lien null », `SalesServiceImpl.java:2014`).
- **Journal Payara.** Aucune erreur.
- **Hypothèse non vérifiée.** Une exception rattrapée dans le service marque la transaction « à annuler », et le
  conteneur annule en silence.
- **Le test existant `vente/test-deuxieme-assurance.js` échoue aussi**, ce soir, sur cette route (« tiers-payant
  invalide »).
- **À l'écran, avant toute correction.** Créer un client assuré depuis l'écran de vente, puis le rechercher dans la
  liste des clients. S'il est absent, le défaut est réel en officine.
- **Test.** `repro-assurances-liens.js`, cas N8.

**M1 (D).**
- **Cas.** Client assuré, organisme A à 80 %, RO.
- **À l'écran.** Vente carnet → associer un carnet à ce client.
- **Obtenu.** Assurance A `delete` priorité −1 ; carnet `enable`, RO = 1, priorité 1.
- **Code.** `ClientServiceImpl.java:1331-1338` → `:1195-1200`, `:807`.

**M2 et M3 (D).**
- **À l'écran.** « Modifier client / tiers payant » d'une vente ; changer l'organisme d'une ligne dont la case
  « Nouveau TP principal » n'est **pas cochée** (`UpdateVenteClientTpForm.js:416-418` ne la coche que pour la
  priorité 1).
- **Obtenu.**
  - **M2** : 2 RO actifs.
  - **M3** : la nouvelle complémentaire est créée `enable` en priorité **−1**, clonée du lien supprimé.
- **Case cochée** : non reproduit, car `updateTiersPayantPriority` remet les RO et les priorités d'aplomb après coup.

**M4 (D).**
- **Cas.** Carnet en priorité 1, assurance en priorité 2 (état produit par M1/M2), plus un lien supprimé.
- **À l'écran.** Modifier client / tiers payant sans rien changer, puis valider.
- **Obtenu.** Carnet RO = 1, assurance RO = 0, lien supprimé reclassé en priorité 2.
- **Code.** `ClientServiceImpl.java:1858-1898`.

**Corrections M1 à M4** : comme dans `MECANISMES_CODE_ASSURANCES.md` (implémentations de référence sur la branche
`differe`, à porter et non à fusionner), plus le quatrième appelant `addNewTiersPayantToClient`
(`ClientServiceImpl.java:1451`).

### 3.5 Différés

**Cas commun.** Vente comptant de 2 boîtes (5 510 F) en différé (mode 4) pour un client d'essai. Règlement par
« Faire un règlement » (route `reglement/reglementdiffere`).

**Invariant attendu** : caisse nette + dette restante = prix.

- **DIF-01.**
  - **À l'écran.** Ouvrir « Modifier » sur la vente ; dans un autre onglet, régler 2 755 F ; valider la copie en
    différé.
  - **Obtenu.** Le client doit encore 5 510 F alors que 2 755 F sont en caisse : total 8 265 F.
- **DIF-02.**
  - **À l'écran.** Vente avec 2 755 F d'acompte ; Modifier sans rien changer ; valider en différé à 0 F.
  - **Obtenu.** Caisse 0 + dette 2 755 = 2 755 : il manque 2 755 F.
- **DIF-03.**
  - **À l'écran.** Régler 2 755 F, Modifier, valider pour un autre client.
  - **Obtenu.** Le client 2 doit 5 510 F ; le règlement du client 1 n'est ni reporté ni rendu.
- **D2.**
  - **À l'écran.** Régler une partie de la vente, puis l'annuler.
  - **Obtenu.** Annulation acceptée, 2 755 F restés en caisse sans contrepartie.
  - **elysees** : 10 ventes dans ce cas, pour 174 770 F.
- **D3.**
  - **À l'écran.** Ouvrir la liste des règlements de différés du jour.
  - **Obtenu.** Liste vide pour tous ; `NullPointerException` en `:1093`.
- **D4.**
  - **À l'écran.** Relevé d'un client ayant versé un acompte.
  - **Obtenu.** Solde 5 510 F pour un reste dû de 2 755 F.
- **D5.**
  - **Cas.** Ligne de dette dupliquée sur la vente (cas des données de production).
  - **Obtenu.** Après annulation, la ligne en double reste active.
- **DIF-07.** « 1 F reçu » pour 2 755 F payés : accepté (appel direct).
- **DIF-08.** Après un règlement, la ligne de dette prend la date du jour (25/10) au lieu de celle de la vente
  (25/09).
- **DIF-09.** En cochant la vente récente puis l'ancienne, la récente est soldée et l'ancienne reste due.

**Test** : `repro-differes.js`. **Corrections** : comme dans `MECANISMES_CODE_DIFFERES.md`, D1 à D6 ; aucune ne
doit affaiblir `ReglementDiffereControle`.

---

## 4. Non reproduits, à vérifier : ce qui reste ouvert

| ID | Pourquoi | Ce qu'il faut pour trancher |
|---|---|---|
| CR-04 | 3 paires simultanées sans perte d'écriture | Plus de paires sur banc, ou décision de corriger quand même (lecture + écriture absolue, sans verrou) |
| F2 provisoire | Bon écarté de la provisoire | Rien : non reproduit |
| F4 | Code non atteint | Rien côté écran ; signaler le code mort |
| F6 (autres volets) | Seul le montant négatif a été joué | Deux règlements simultanés, trop-perçu |
| VC-15 | Index unique présent sur les deux bases | Vérifier l'index sur chaque site avant de clore |
| VC-13, VC-17, CR-11, CA-01, CA-11, CA-13, CA-14 | Volets mobiles, dépôt absent | Jouer sur l'appli mobile |
| CA-07, historique CA-12 | Clôture du retour bloquée par N9 | Corriger N9, puis rejouer `repro-carnet.js` |
| CA-10 | Non joué | Scénario de relevé du carnet dépôt |
| DIF-10 | Non joué à l'écran | Écran « Faire un règlement », partiel, 0 F, valider |
| VC-10 (dépôt) | Aucun dépôt sur la copie | Base avec dépôt d'extension |
| N8 (cause) | Réponse succès sans enregistrement, journal muet | Création à l'écran, puis recherche du client |
| N4 (clôture VO avec caution, sans retour arrière) | Non joué : il faut une vente sous caution | Vente assurance avec caution déjà facturée |
| N6 (`addNewTiersPayantToClient` crée un RO de plus) | Non joué | Écran de vente → créer un nouvel organisme pour un client assuré |
| N7 (règlement de différé : dossier à la date choisie, transaction au jour) | Non mesuré | Règlement de différé daté d'hier, puis comparer les dates |

---

## 5. Incidents pendant les essais (transparence)

1. **Instance empoisonnée (CA-03), 23:35 → 23:38.** Après le cas CA-03, le nettoyage a supprimé l'organisme exclu
   d'essai. Le champ de l'EJB pointait encore sur lui, et les clôtures assurance servies par cette instance ont
   échoué jusqu'au redéploiement de 23:38, fait par la session principale.
   - Un test de la session principale lancé dans cet intervalle a pu échouer pour cette raison.
   - Le scénario neutralise désormais l'instance (ventes sur un carnet dépôt non exclu) avant le nettoyage.
2. **Quatre mouvements de stock réels supprimés puis restaurés.** Le nettoyage du cas carnet supprimait les
   mouvements par leur clé numérique, partagée avec d'anciens mouvements d'inventaire (clés 7498 à 7501, 29/12/2024).
   - Les quatre lignes ont été **restaurées à l'identique** depuis la sauvegarde.
   - Le nettoyage filtre désormais sur le type de mouvement, le produit et la date.
3. **Un stock resté à 500** après un arrêt brutal de script. Il a été remis à sa valeur d'origine (30 / 30 / UG 20)
   lue dans la sauvegarde. Le nettoyage se déclenche désormais aussi à la sortie du processus.
4. **Fin de campagne** : aucune vente, client, tiers payant, facture, groupe, lot, remise ou caisse d'essai
   restant ; paramètres `FORCER_STOCK_VENTE` et `KEY_CODE_FACTURE` à leur valeur.

---

## 6. Plan de correction ordonné (constats reproduits uniquement)

| Ordre | Lot | Constats | Raison du rang |
|---|---|---|---|
| 1 | Gardes simples | VC-01, VC-02, VC-08 (client inconnu), CR-03, CR-09, CR-10, CA-03, F1, F2, N1, N2, D3, CA-06, CA-08, CA-15 | Quelques lignes chacune ; l'argent faux s'arrête tout de suite |
| 2 | Calculs faux | VC-05, CR-05, N3, CR-06 | Argent faux sur chaque vente avec remise, dès qu'une remise est utilisée |
| 3 | Encours | CR-01, CR-02, CA-09, N5, F5 (CR-04 avec) | Même compteur |
| 4 | Liens d'assurance | M1 → M4, puis M5 et N8 | Les données se dégradent encore (172 carnets RO créés en 2026 sur la copie) ; la reprise attend ce lot |
| 5 | Annulation et modification | VC-04, D2, DIF-01, DIF-02, DIF-03, D5 | Caisse et dette ; décisions 1 et 2 |
| 6 | Numérotation | F3, F2 (verrou) | 5 sur 5 en concurrence ; 110 doublons sur `elysees` |
| 7 | Montants du poste et remises | VC-06, VC-07, VC-14, CR-07 | Coordination avec l'appli mobile |
| 8 | Stock et lots | VC-09, VC-11, N9 | — |
| 9 | Dates | VC-12, VC-16, DIF-08 | Décision 3 |
| 10 | Différés secondaires | D4, DIF-07, DIF-09 | — |

Pour chaque lot, le test de `src/test/e2e/audits/` qui échoue aujourd'hui devient le test de non-régression : il
doit passer après la correction. Les tests existants des chemins cités au §3 doivent passer encore.

## 7. Décisions métier à prendre

1. **DIF-03.** Vente différée réglée puis passée à un autre client : refuser, ou reporter avec un avoir.
2. **D2.** Annulation d'une vente déjà réglée : refuser, ou créer un avoir.
3. **VC-12, VC-16.** Quelle date porte une écriture de caisse : celle de l'opération réelle, ou celle de la saisie ?
4. **F1.** Qui peut supprimer une facture définitive, et à quelles conditions ?
5. **F5.** La facturation remet-elle les encours à zéro, ou les diminue-t-elle du montant facturé ?
6. **CR-06.** Remise supérieure à la part client : qui la supporte, le client ou l'organisme ?
7. **Calendrier de l'appli mobile** pour les refus serveur (VC-08, VC-06, VC-14, CR-07).

## 8. Requêtes de constat (lecture seule)

Comptages sans colonne nominative, joués sur la copie et sur `elysees`. Ils servent de contrôle après correction :
aucune nouvelle ligne ne doit apparaître.

```sql
-- VC-02 : ventes en cours portant une transaction de caisse
SELECT COUNT(DISTINCT p.lg_PREENREGISTREMENT_ID) FROM t_preenregistrement p
  JOIN mvttransaction m ON m.pkey = p.lg_PREENREGISTREMENT_ID WHERE p.str_STATUT = 'is_Process';
-- VC-09 / VC-11 : stocks negatifs, lots sur-credites
SELECT COUNT(*) FROM t_famille_stock WHERE int_NUMBER_AVAILABLE < 0;
SELECT COUNT(*) FROM t_lot WHERE current_stock > int_NUMBER;
-- VC-16 : mouvement de caisse et transaction a des dates differentes
SELECT COUNT(*) FROM t_mvt_caisse c JOIN mvttransaction m ON m.pkey = c.lg_MVT_CAISSE_ID WHERE DATE(c.dt_DATE_MVT) <> m.mvtdate;
-- F2 / F3 : bon sur plusieurs factures definitives ; numeros de facture en double
SELECT COUNT(*) FROM (SELECT d.str_REF FROM t_facture_detail d JOIN t_facture f ON f.lg_FACTURE_ID = d.lg_FACTURE_ID
  WHERE COALESCE(f.template, 0) = 0 GROUP BY d.str_REF HAVING COUNT(DISTINCT d.lg_FACTURE_ID) > 1) x;
SELECT COUNT(*) FROM (SELECT str_CODE_FACTURE FROM t_facture GROUP BY 1 HAVING COUNT(*) > 1) x;
-- M1-M4 : multi-RO, carnets RO, liens actifs a priorite < 1, liens supprimes reclasses
SELECT COUNT(*) FROM (SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client_tiers_payant
  WHERE str_STATUT = 'enable' AND b_IS_RO = 1 GROUP BY 1 HAVING COUNT(*) > 1) x;
SELECT COUNT(*) FROM t_compte_client_tiers_payant c JOIN t_tiers_payant t ON t.lg_TIERS_PAYANT_ID = c.lg_TIERS_PAYANT_ID
  WHERE c.str_STATUT = 'enable' AND c.b_IS_RO = 1 AND t.lg_TYPE_TIERS_PAYANT_ID = '2';
SELECT COUNT(*) FROM t_compte_client_tiers_payant WHERE str_STATUT = 'enable' AND int_PRIORITY < 1;
SELECT COUNT(*) FROM t_compte_client_tiers_payant WHERE str_STATUT = 'delete' AND int_PRIORITY >= 1;
-- D2 : ventes annulees deja reglees en differe
SELECT COUNT(DISTINCT o.lg_PREENREGISTREMENT_ID) FROM t_preenregistrement_compte_client o
  JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = o.lg_PREENREGISTREMENT_ID
  JOIN t_dossier_reglement_detail d ON d.str_REF = o.lg_PREENREGISTREMENT_COMPTE_CLIENT_ID
  WHERE p.b_IS_CANCEL = 1 AND d.dbl_AMOUNT > 0;
-- N9 : premiere cle numerique de mouvement de stock (seuil de collision des retours carnet)
SELECT MIN(CAST(pkey AS UNSIGNED)) FROM hmvtproduit WHERE pkey REGEXP '^[0-9]{1,9}$';
```

## 9. Corrections (26/10) et résultats après correction

Corrections faites lot par lot dans l'ordre du §6, un commit par lot, sur la branche `PRES-/audits-code-dffa0a`. Chaque
lot a été testé sur le Payara local (`laborex_v1_db`, sauvegardée avant chaque série), tests d'écran lancés un par un.
Rien n'est fusionné. La branche part de `c42b174c` : elle ne contient pas les commits plus récents de la session
principale (droits, horloge, bornes).

### 9.1 Ce qui a été corrigé, par lot

| Lot | Commit | Constats | Correction retenue |
|---|---|---|---|
| 1 | `fe7b075b` | VC-01, VC-02, VC-08, CR-03, N4, CR-09, CR-10, CA-03, N1, N2, D3, CA-06, CA-08, CA-15, F1, F2 | Gardes : vente non modifiable une fois clôturée ou annulée ; contrôle du lien, du taux (0 à 100) et du bon avant toute écriture ; client inconnu = client inchangé (compatibilité mobile) ; annulation qui vérifie le stock de chaque ligne avant d'écrire ; refus d'une copie de modification sur une vente annulée ou non clôturée ; facture définitive non supprimable ; bon déjà facturé exclu ; règlement carnet ≤ 0 refusé ; retour carnet ≤ 0 ou sans motif refusé avec un message |
| 2 | `caa92cf1` | VC-05, CR-05, N3, CR-06 | TVA comptée une seule fois ; part du client calculée par une seule fonction (comptant : prix − remise ; assurance : part client ≥ 0) ; remise plafonnée à la part du client (hors carnet), remplacé ensuite par la règle du §9.5 |
| 3 | `03a42d86` | CR-01, CR-02, CA-09, N5, F5 | Encours retiré à l'annulation et à la modification, déplacé quand on change de client ou d'organisme ; ce changement est refusé sur une vente déjà facturée ; à la facturation, l'encours est **recalculé depuis les bons non facturés** (décision 5 prise dans le sens le plus sûr). CR-04 non corrigé (non reproduit) |
| 4 | `d0bff34c` | N8, M1, M2, M3, M4, N6 | Cause de N8 : `find(null)` mettait la transaction en échec silencieux. Un seul RO actif par client, jamais un carnet ; priorités ≥ 1 ; lien existant réutilisé ou réactivé ; un lien supprimé ne transmet ni son RO ni sa priorité |
| 5 | `744b9ee5` | VC-04, D2, DIF-01, DIF-02, DIF-03, D5 | Annulation refusée si une modification est ouverte ou si la vente a déjà été réglée en différé (**décisions 1 et 2 : refus, pas d'avoir**) ; copie refusée à la clôture si l'origine est annulée ou si des règlements existent et que le mode ou le client change ; « déjà réglé » suivi le long de la chaîne des copies |
| 6 | `930bea3c` | F3, F2 en concurrence | Compteur de factures lu sous verrou après le début de la transaction (écran et service) |
| 7 | `94fc2150` | VC-06, VC-07, VC-14, CR-07 | Remise remise à 0 si le net est demandé sans remise ; remise enregistrée = celle encaissée (net arrondi) ; clôture refusée si les règlements ne couvrent pas le net ; prix des lignes calculés par le serveur conservés |
| 8 | `c9e2010c` | VC-09, VC-11, N9, CA-07, CA-12 | Stock vérifié à chaque clôture, quantités cumulées par produit ; retour aux lots d'origine ; clé de mouvement « RC-id » ; retour carnet clos une seule fois ; historique de stock du retour cohérent |
| 9-10 | `0aca4f26`, `31844138` | VC-16 (partiel), DIF-08, DIF-07, DIF-09, D4, DIF-10 | Mouvement de caisse daté du futur refusé ; règlement de différé sans changement de la date de la vente ; règlement partiel refusé si le reçu est insuffisant ; ventilation par date de la vente ; dette différée du relevé = prix − montants payés ; message « Saisissez le montant reçu. » |
| — | `fd72a661` | — | Tests de reproduction : assertions alignées sur le comportement corrigé, nettoyage limité aux données du test |

### 9.2 Résultats des reproductions après correction

Sorties complètes : `docs/notices/preuves-audits-2026-10-25/apres-corrections/`.

| Test | Avant | Après | Reste |
|---|---|---|---|
| `repro-vente-comptant.js` | défauts reproduits | 16/17 | VC-12 : dates des écritures d'une modification d'une vente d'hier, **décision 3 en attente** |
| `repro-remise-caisse.js` | défauts reproduits | 7/8 | VC-16 : mouvement saisi à la date d'hier, règlement et transaction datés du jour, **décision 3 en attente** (le futur est refusé) |
| `repro-vente-assurance.js` | défauts reproduits | 17/17 | — |
| `repro-vo-remise.js` | défauts reproduits | 9/9 | 6 cas d'origine et 3 cas de la règle du §9.5 |
| `repro-assurances-liens.js` | défauts reproduits | 10/10 | — |
| `repro-facturation.js` | défauts reproduits | 10/10 | — |
| `repro-differes.js` | défauts reproduits | 13/13 | — |
| `repro-carnet.js` | défauts reproduits | 10/10 | — |

### 9.3 Non-régression : tests existants des chemins touchés

Rejoués après le dernier lot, un par un, sur le même Payara.

| Test | Résultat | Lecture |
|---|---|---|
| `retours/test-annulation-vente-double` | 11/11 | — |
| `retours/test-differes-modification` | 12/12 | — |
| `retours/test-differes-reglement` | 14/14 | — |
| `retours/test-differe-nom-client` | 14/14 | — |
| `caisse/test-mvt-caisse` | 11/11 | — |
| `vente/test-mode-reglement-client` | 17/17 | — |
| `vente/test-client-credit-course` | 16/16 | — |
| `journal/test-vente-changer-tiers-payant` | 7/7 | — |
| `carnet-depot/test-facturation-carnet-depot` | 33/33 | — |
| `vente/test-deuxieme-assurance` | 14/14 | Premier passage 0/1 : défaut **du test**, corrigé dans le commit de ce document. Sous Windows, `mariadb` rend des fins de ligne `\r\n` et le test découpait sur `\n` seul ; l'identifiant de l'organisme gardait un `\r` et le serveur ne le trouvait pas. Le découpage accepte maintenant `\r\n` |
| `retours/test-differes-solde` | 14/16 | Écran, export Excel et dates inversées passent. Au premier passage, le PDF échouait parce que le dossier de sortie `applications/prestige/data/reports/pdf` n'existait pas sur le Payara local (journal : `FileNotFoundException`). Une fois le dossier créé, le PDF est produit, et son texte (lu par `pdftotext`) porte le titre, le client, les lignes E2E-B, E2E-C, REG-R2, la fin de mois et les totaux de l'écran (4 000 / 8 000 / 2 000 / 10 000). Les 2 échecs restants portent sur l'adresse de la fenêtre ouverte : quand le serveur rend un vrai PDF, le Chromium sans écran le télécharge et n'expose plus l'adresse. Le même code passait ce point quand le serveur rendait une page d'erreur : l'écart vient du poste, pas du code (ni `ReglementRessource` ni `Differe.js` ne sont modifiés) |
| `reglement/test-liste-reglements` | 14/15 | L'édition aboutit et le fichier est écrit dans `data/reports/pdf` ; le test le cherche dans `\opt\CONF\LABOREX\REPORTS\pdf`, chemin d'une autre configuration de poste |
| `vente/test-historique-deconditionnement` | 9/15 | Toute la partie A (vente au comptant, déconditionnement, historique, fiche) passe. La partie B demande un dépôt de type 2 : la copie locale n'en contient aucun (`SELECT COUNT(*) … lg_TYPEDEPOT_ID = '2'` → 0), le jeu d'essai n'est pas trouvé |

Sorties complètes : `docs/notices/preuves-audits-2026-10-25/apres-corrections/regression/`. **Aucun échec n'est
attribuable aux corrections.** Les trois tests marqués ci-dessus sont à rejouer sur un poste qui a des dépôts et le
dossier d'éditions de la configuration standard.

### 9.4 Ce qui reste à décider

- **Décision 3 (VC-12, VC-16)** : date de l'opération ou date de la saisie. Rien n'a été changé dans les dates des
  écritures, à part le refus des dates futures.
- **Décision 6** : tranchée par l'utilisateur le 26/10, voir §9.5.
- **Décisions 1, 2, 5** : prises par défaut dans le sens le plus sûr (refus, recalcul). Elles se changent
  dans les fonctions citées au §9.1 si le métier en décide autrement.
- **Décision 7** : l'appli mobile reçoit désormais des refus serveur (VC-06, VC-14, CR-07) ; à vérifier avec elle.
- **CR-04** non corrigé : non reproduit, et un verrou supplémentaire ajouterait du risque.

### 9.5 Remise de la vente assurance : règle du 26/10 (décision 6)

Règle donnée par l'utilisateur, pour chaque ligne de la vente assurance :

```
part_client_ligne = prix_ligne − part_organismes_ligne
remise_ligne      = part_client_ligne × taux_remise_du_produit / 100   (0 si le produit n'est pas remisable)
remise_vente      = somme des remise_ligne
part_client       = prix − parts des organismes − remise_vente          (net arrondi à 5 F)
```

- Produit non remisable (code remise vide, 2 ou 3, ou absent de la grille) : aucune remise, sa part client reste due.
- Plafond d'un organisme (encours, par vente, crédit) : il s'applique au total de l'organisme ; la réduction est
  répartie sur ses lignes au prorata de sa part sur chacune. Sans plafond, rien n'est réparti.
- Code : `SalesNetComputingServiceImpl`, chemins `calcule` et `calculeRepair` : parts des organismes calculées
  d'abord, sans remise (`partsClientParLigne`), puis remise par produit sur la part client (`remiseSurPartClient`).
  `int_PRICE_REMISE` est écrit par ligne et en total, puis `int_CUST_PART`. `plafonnerRemiseALaPartClient` (lot 2)
  est retiré. Carnet et comptant inchangés.
- `calculeRepair` (outil de maintenance) ne porte pas de remise (`remise = null`, comme avant) : la remise de la
  vente y vaut 0 et la part client = prix − parts des organismes. Avant, l'en-tête passait déjà à 0, mais la part
  client retranchait encore les anciennes remises des lignes.

Cas concrets (`repro-vo-remise.js`, produits à TVA 0, remise d'essai de 10 %, organisme à 80 %) :

| Cas | Avant (version déployée de la branche principale) | Après |
|---|---|---|
| Remisable seul, 2 010 F | remise 201 (sur le prix), part client 201 | part client 402 → remise 40, part client 362, net 360 |
| Remisable 2 010 F + non remisable 2 755 F | — | parts organisme 3 812 ; remise 40 sur la ligne remisable, 0 sur l'autre ; part client 913 |
| Même vente, plafond par vente de 1 000 F | — | organisme 1 000 réparti au prorata ; part client du remisable 1 588 → remise 158 ; part client 3 607 |
| Organisme à 95 % (ancien CR-06) | remise 201, parts + part client = 1 909 ≠ 1 809 | part client 100 → remise 10, part client 91, total = prix − remise |

Avant correction, les cas 2 et 3 du tableau n'ont pas été rejoués avec la remise posée (le premier passage du test
oubliait l'appel de pose de la remise) ; le cas 1 et l'ancien CR-06 suffisent à montrer l'écart de l'ancienne règle.

Non-régression, rejouée sur cette version (sorties : `docs/notices/preuves-audits-2026-10-25/apres-corrections/regle-remise-2026-10-26/`) :
`repro-vente-assurance` 17/17, `repro-carnet` 10/10, `repro-assurances-liens` 10/10, `repro-facturation` 10/10,
`test-vente-changer-tiers-payant` 7/7, `test-facturation-carnet-depot` 33/33, `test-client-credit-course` 16/16,
`test-deuxieme-assurance` 14/14. Au premier passage, ce dernier a donné 13/14 : la référence de bon de la vente
d'essai était lue vide juste après sa pose en SQL, avant tout appel au serveur. Au second passage, il a donné 14/14.
