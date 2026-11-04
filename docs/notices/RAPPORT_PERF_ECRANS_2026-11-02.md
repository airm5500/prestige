# Ouverture et chargement des écrans (demande du 02/11)

**Conditions.** Mesures sur domain2 (9080) et la copie `laborex_perf`, qui porte le volume réel de l'officine.
La version mesurée est l'intégration 78bb2687, avec puis sans les changements ci-dessous. Le poste était libre :
aucun autre test d'écran ne tournait.

**Méthode.** Script `src/test/e2e/perf/test-perf-ouverture-ecrans.js`. Il passe par le vrai chemin de l'écran :
- clic sur le menu, puis sur chaque onglet ;
- clic sur « Modifier » d'une vente, puis sur « Retour ».

Un écran est compté comme chargé quand le réseau est calme et qu'aucun masque « Chargement » n'est affiché. Chaque
écran est ouvert deux fois. Au-delà du budget de 3 s, le script cite les appels de plus d'une seconde.

## Résultats (à chaud, en ms)

| Écran | Ouverture | Onglets / geste |
|---|---|---|
| Ventes terminées | 570 à 660 | « Modifier » : 470 à 610 ; « Retour » (copie supprimée) : 490 à 560 |
| État de contrôle des achats | 410 à 480 | Tableau de bord 113, BL annulés 79 |
| Pilotage | 1 000 à 1 230 | 8 onglets sous 250 ; Stock 170 à 1 480 ; **À suivre : 12 500 au premier accès**, 140 ensuite |
| Audit et rapprochements | **3 600 à 3 860** | Rapports 70 à 145 ; Régularisations 420 à 470 |
| Comparaison CA familles | **4 200 à 4 540** | — |
| Statistiques des ventes | 470 à 1 040 | — |
| Clients désactivés | 430 à 940 | — |
| Tiers payants désactivés | 380 à 450 | — |
| Balance âgée (récap) | 810 à 940 | — |

- **Premier passage après un déploiement**, caches froids : pilotage 10,7 s, « À suivre » 13,9 s, audit 11 s et
  comparaison CA 8,8 s.
- **Modification de vente :** aucune copie ne reste après « Retour ».
- **Erreurs JavaScript :** aucune.

## Changements faits

1. **Menus déclarés dans `correctifs-affichage.js`** : `comparaisonChiffreAffaireManager`,
   `statistiqueventemanager`, `clientdesactive` et `tierspayantdesactive` sont ajoutés à `ECRANS_COLLES` et
   `ECRANS_STYLE_VENTE`. `balanceagee` y figurait déjà.
   - Mesuré avant et après : aucun écart sur les quatre écrans (430 à 1 040 ms dans les deux cas).
   - Aucune erreur JavaScript.
2. **Comparaison CA familles : chaque famille était envoyée douze fois.**
   - Dans `StatisticsFamilleArticle.getFamilleCA_Data`, l'ajout à la réponse se trouvait dans la boucle des mois.
   - Le défaut existe déjà dans dev : ce n'est pas une régression.
   - La grille fusionnait les doublons, qui portaient le même identifiant : l'écran affichait 14 lignes, mais la
     réponse en portait 168.
   - Reproduit par `src/test/e2e/perf/test-comparaison-ca-familles.js` : échec avant correction, réussite après.
   - Gain : la réponse passe de 148 Ko à 12 Ko. Le temps reste à environ 4,2 s, car il se passe dans la requête SQL.

## Lenteurs restantes (non corrigées, aucune n'est une régression)

1. **Comparaison CA familles, environ 4 s.**
   - La requête agrège deux ans de lignes de vente, filtrées sur `t_preenregistrement_detail.dt_CREATED`.
   - Aucun index ne porte sur cette colonne seule : il n'existe que `(lg_FAMILLE_ID, dt_CREATED)`.
   - Piste : un index `(dt_CREATED)`, ou un filtre sur la date de la vente. À valider par un `EXPLAIN` sur une
     copie : aucun accès à une base n'était disponible sur ce poste pour cette mesure.
2. **Audit et rapprochements, environ 3,4 s** (`api/v1/audit/analyse`).
   - Sept contrôles s'enchaînent, dont la section « Stock » : elle regroupe tout `hmvtproduit` par produit et
     emplacement, sans filtre de date.
   - Écran récent, réservé au super administrateur.
   - Piste : mesurer chaque section en base, puis ne recalculer la section « Stock » que sur demande.
3. **Pilotage, onglet « À suivre » : 15 s dès que le cache a plus de 10 minutes. Corrigé : 2 s.**
   - Cause : `PilotageSuiviService.evolution`, avec six appels `suivi/evolution` (une courbe par grandeur).
   - Le cache (`DUREE_CACHE`) ne dure que 10 minutes, et tout était recalculé, y compris les années N-1 à N-3, qui
     ne changent plus. Onglet absent de dev.
   - **Correction (1f25f282) :** les années closes sont gardées jusqu'au lendemain, et seule l'année en cours est
     relue.
   - Test d'écran `src/test/e2e/perf/test-pilotage-a-suivre-cache.js` : il rouvre l'onglet après l'expiration du
     cache.
     - Avant : 15,1 s, échec.
     - Après : 8,0 s, encore au-dessus du budget de 3 s.
     - Les empreintes des six courbes sont identiques avant et après : les chiffres ne changent pas.
   - **Seconde correction :** les mois clos de l'année en cours sont aussi gardés jusqu'au lendemain. Seul le mois
     en cours est relu en direct.
     - Les requêtes restent les mêmes, découpées par période : les sommes et les comptes s'additionnent.
     - Les agrégats mensuels du pilotage n'ont pas été utilisés : pour la marge et la TVA, leurs définitions
       diffèrent de celles des courbes (jointure stricte sur la TVA, CA pris dans l'en-tête de la vente, arrondis
       séparés). Les chiffres auraient changé.
     - Le contrôle des corrections tardives, lancé à l'ouverture du pilotage, et le bouton « Recalculer » vident ces
       caches (`PilotageSuiviService.oublier()`) : une vente annulée après coup sur un mois clos est donc reprise.
   - Résultat du test, onglet rouvert après l'expiration du cache : **1,96 s** (contre 15,1 s, puis 8,0 s).
     - Les empreintes des six courbes sont identiques à celles d'avant toute correction.
     - Les 34 tests Java du pilotage passent.
   - Le premier affichage de la journée reste à environ 14 s, car il calcule toutes les années.
   - **Troisième correction : lecture dans les agrégats mensuels du pilotage, et calcul d'avance.**
     - Pas mensuel et annuel : CA, panier, encaissé, achats et marge sont lus dans les agrégats mensuels, comme
       dans les autres onglets. Si un mois n'est pas encore agrégé, l'année est relue dans les ventes, comme avant.
     - Cumul à date d'une année close : seul le mois entamé est relu dans les ventes, gardé jusqu'au lendemain.
     - **La TVA reste lue dans les ventes.** Les agrégats gardent CA HT et CA TTC arrondis au franc : leur
       différence s'écartait de quelques francs (empreinte changée au premier essai, identique après correction).
     - **Marge : changement voulu.** C'est celle des autres onglets, figée au calcul du mois. L'ancienne courbe
       prenait le prix d'achat du jour : elle était de 0,4 à 0,9 % plus basse de janvier 2025 à août 2026, et
       identique pour septembre et octobre 2026.
     - Pas hebdomadaire : inchangé (lecture dans les ventes, avec les caches ci-dessus).
     - Au démarrage du serveur et chaque nuit à 0 h 25, après les agrégats, toutes les courbes (six grandeurs,
       trois pas) sont calculées d'avance (`PilotageSuiviService.prechauffer`, appelé par
       `PilotageAgregatScheduler`).
   - Résultat du test : premier affichage juste après le déploiement 4,7 s (contre environ 14 s), le calcul
     d'avance n'étant sans doute pas encore fini ; onglet rouvert après l'expiration du cache **2,06 s**.
     - Empreintes identiques à celles d'avant toute correction pour achats, CA, encaissé, panier et TVA ; marge
       changée comme prévu.
     - Les tests Java du pilotage passent.

## Entrée en stock d'un bon de livraison (demande du 03/11)

**Constat.** Le clic sur « Oui » à « Confirmer l'entrée en stock » était lent : environ 100 ms par ligne du bon.
- Test d'écran `src/test/e2e/perf/test-perf-entree-stock.js` : menu, détail du bon, « ENTRÉE EN STOCK », les deux
  « Oui », chronomètre jusqu'à la question d'impression. Bon d'essai sur la copie `laborex_perf`, retiré à la fin.
- Avant : 40 lignes 6,5 s et 5,8 s (échec, budget 3 s) ; 150 lignes 15,6 s.

**Cause.** La procédure `proc_indicateur_sugges`, appelée par le déclencheur de `t_warehouse` à chaque ligne entrée
(et par ceux des lignes de commande et de suggestion), avait été créée avec un paramètre en `utf8mb4`, jeu par défaut
de la base. Les colonnes `lg_FAMILLE_ID` sont en `utf8mb3` : la comparaison convertit la colonne et l'index n'est plus
utilisé. Chaque appel parcourait tout l'index de `t_famille` (22 170 lignes) et toute la table
`t_suggestion_order_details` (15 942 lignes). Trouvé par des instantanés des fils de domain2 et la liste des requêtes
en cours. Les requêtes Java de la boucle prennent moins de 2 ms chacune en base.

**Correction.** Script Flyway répétable `R__proc_indicateur_sugges.sql` : même logique, l'identifiant est recopié dans
des variables du type exact de chaque colonne (`TYPE OF`, MariaDB 10.3 et plus). Appliqué au démarrage, sans action
manuelle.
- Après : 40 lignes 1,9 s et 1,5 s ; 150 lignes 4,8 s. Un bon moyen de la copie (7 lignes) passe sous la seconde.
- Mêmes indicateurs : 15 produits pris dans chaque état présent (0, 1 et 2), procédure appelée dans une transaction
  annulée, résultat identique à la règle d'origine pour tous. La copie n'a aucun produit dans les états 3 et 4.
- Reste environ 30 ms par ligne, réparties entre les écritures normales (lot, mouvement, étiquette, stock) : pas de
  cause unique.
- Profit annexe attendu : la création et la modification des lignes de commande passent par la même procédure.

## Pilotage, onglet « À suivre » : affichage progressif (demande du 04/11)

**Constat**, juste après un démarrage, premier clic sur les vrais menus :
- Onglet entièrement masqué de 5,8 s à 6,4 s, dont `GET pilotage/onglet/asuivre` : 5,3 à 6,0 s.
- Les six courbes sont bien calculées d'avance au démarrage (moins de 0,2 s chacune). Mais l'écran ne les demandait
  qu'après la réponse de l'onglet.
- Ce qui ne l'est pas : le haut de l'onglet (tuiles, alertes, répartitions). Il est calculé au clic, et le cache
  d'écran ne dure que 5 minutes, par utilisateur.
- Lectures mesurées sur la copie, période « Mois en cours » :
  - produits vendus en rupture sur 90 jours : 3,5 s ;
  - demandes par mois sur 13 mois, pour le taux de rupture : 1,4 s ;
  - toutes les autres : moins de 0,2 s.

  Les deux premières s'enchaînaient sur le même fil.
- Synthèse : 0,28 s. La seconde ressentie à l'ouverture du menu vient du contrôle des corrections tardives, voulu à
  l'ouverture.

**Correction :**
- **Écran** (`PilotageCtr.actualiser`, `PilotageManager.preparerSuivi`) :
  - les courbes, la fréquentation et les encaissements partent dès le clic ;
  - seules les tuiles, les alertes et les deux répartitions restent « en chargement » jusqu'à la réponse de l'onglet ;
  - une carte restée sans réponse affiche « Indisponible ».
- **Serveur** : la lecture des ruptures sur 90 jours tourne sur son propre fil, comme les trois autres lectures
  lourdes de l'onglet. Requête inchangée.

**Mesure** (test `src/test/e2e/perf/test-pilotage-a-suivre-progressif.js`, à froid) :

| | Avant | Après |
|---|---|---|
| Courbes et fréquentation affichées | 2,24 s et 2,34 s (échec) | 0,46 s et 0,32 s |
| Onglet entièrement rempli | 2,28 s et 2,37 s | 2,36 s et 1,59 s |

- Ce jour-là, la base avait ses pages en mémoire : le calcul de l'onglet a pris 1,5 à 2,2 s, contre 5,3 s au
  premier passage.
- **Mêmes chiffres.** Les empreintes du contenu (clés triées, nombres relus) sont identiques entre l'ancienne et la
  nouvelle version, pour la réponse de l'onglet et pour les six courbes.
- L'empreinte du texte brut, elle, n'est pas fiable : une réponse resservie par le cache n'écrit ni les clés ni les
  nombres comme la réponse calculée.
- **Ergonomie.** Changer de période dans la liste (« Vs mois précédent ») recalcule l'onglet : tuiles comparées à
  « Octobre 2026 (au 4) », toutes les cartes remplies, aucune erreur JavaScript (8 contrôles sur 8).
- **Test existant** `test-pilotage-a-suivre.js` :
  - il attendait la disparition du masque posé sur tout l'onglet ;
  - il attend désormais les tuiles démasquées et les cartes Emplacements et Familles remplies ;
  - lancé sur la copie (`DB_TEST=laborex_perf`), il passe 4 contrôles sur 4, CA en tête égal à la base.
- Reste : la lecture des ruptures sur 90 jours (environ 3,5 s base froide) fixe la durée du remplissage des tuiles et
  des alertes.
