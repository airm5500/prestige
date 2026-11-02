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
3. **Pilotage, onglet « À suivre » : environ 12 s dès que le cache a plus de 10 minutes.**
   - Cause : `PilotageSuiviService.evolution`, avec quatre appels `suivi/evolution` de 2 à 10,5 s.
   - Le cache (`DUREE_CACHE`) ne dure que 10 minutes, alors que les années N-1 à N-3 ne changent plus.
   - Onglet absent de dev.
   - Piste : garder en cache les années closes jusqu'au lendemain et ne recalculer que l'année en cours.
