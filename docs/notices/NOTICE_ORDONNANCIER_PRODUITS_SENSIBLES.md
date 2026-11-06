# Ordonnancier : onglets Produits et produits sensibles (cas 3 du 03/11/2026)

Réalisation du cas 3 de `docs/analyses/2026-11-03/` (analyse `cas3-ordonnancier-produits.md` §0, plan
`plan-realisation.md` §3, maquette `cas3-ordonnancier-produits.html`). Aucun paramètre nouveau : l'écran s'appuie sur
`KEY_GERE_ORDONCIER` existant et sur une colonne à `0` partout.

## Règles

- **Une seule règle**, `TFamille.estProduitOrdonnancier()` : un produit entre dans l'ordonnancier s'il est coché
  **sensible**, OU s'il est soumis à ordonnance (`is_scheduled`) **et** porte un code tableau (`int_T` non vide).
  Elle est appelée par la clôture de vente (`SalesServiceImpl.checkOrdonnancier`) et par le registre, le détail, les
  éditions et l'analyse (`SalesStatsServiceImpl.produitsOrdonnancier`), qui dupliquaient la règle.
- **Règle historique conservée** (Q3.1) : coché « ordonnancier » sans code tableau, le produit n'entre pas au registre
  et la clôture n'exige pas de médecin. L'onglet le signale par le badge « SANS CODE TABLEAU ».
- **Produit sensible** : même traitement qu'un produit ordonnancier partout (Q3.2) ; le code tableau est facultatif.
  Médecin obligatoire à la clôture si `KEY_GERE_ORDONCIER = 1` (comptant : client exigé aussi, comme avant).
- **Motif** (`Ordonnancier` / `Sensible`) : colonne dans le détail d'une vente du registre, dans l'édition PDF et
  l'export Excel ; l'analyse l'ajoute au complément du palmarès des produits (« … - sensible »).
- **Défaut corrigé au passage** : un produit `is_scheduled = 1` avec `int_T` à NULL faisait planter la clôture
  (NullPointerException sur `trim()`). Test rouge d'abord : `ProduitOrdonnancierTest`.
- **Non-régression** : sans aucun produit coché sensible, la règle unique rend exactement ce que rendait l'ancienne
  (table de vérité dans `ProduitOrdonnancierTest.sansSensibleRienNeChange`) ; le registre, le détail, les éditions et
  l'analyse de `etape3/test-ordonnancier.js` passent à l'identique (62/62).

## Base

Migration `V7.2.33__ordonnancier_produits_sensibles.sql`, idempotente :
`ALTER TABLE t_famille ADD COLUMN IF NOT EXISTS is_sensible TINYINT(1) NOT NULL DEFAULT 0`.

## Services REST (`FicheArticleRessource`, droit `P_SM_ORDONNANCIER`, Q3.4)

| Méthode | Chemin | Rôle |
|---------|--------|------|
| GET | `v1/fichearticle/ordonnancier?query&rayon&filtre&champ&start&limit` | liste paginée ; `filtre` = `coches` / `noncoches` / `tous`, `champ` = `ordonnancier` / `sensible` ; renvoie CIP, désignation, prix, stock, `scheduled`, `intT`, `sensible` |
| PUT | `v1/fichearticle/ordonnancier/{id}` `{champ, valeur}` | coche ou décoche un produit |
| PUT | `v1/fichearticle/ordonnancier/lot` `{query, rayon, filtre, champ, valeur, simuler}` | tout le résultat ; `simuler` rend seulement le nombre |

Journal d'audit (Q3.5) : type `ORDONNANCIER_PRODUIT` (ajouté en fin d'énumération, le rang est persisté), une ligne
« Produit CIP désignation coché / décoché sensible | ordonnancier » par cochage unitaire, une ligne par lot avec le
nombre et la recherche ; aucune donnée de patient.

## Écran

- `view/vente/Ordonnancier.js` : deux onglets « Produits ordonnancier » et « Produits sensibles » après Registre et
  Analyse, sur le gabarit de `configmanagement/famille/Products.js` : recherche « Nom ou CIP… (Entrée) », emplacement,
  filtre Afficher (cochés par défaut sur l'onglet ordonnancier, tous sur l'onglet sensibles), compteur, colonnes LG,
  C.CIP, Désignation, Code tableau, Prix vente, Stock, case Ordonnancier / Sensible.
- Case **enregistrée au clic** ; en cas de refus elle revient à son état et le motif s'affiche à côté du compteur.
- **Cochage en lot sans fenêtre** : premier clic → le bouton affiche « Cocher N produit(s) ? Confirmer » (nombre
  réel renvoyé par le serveur), second clic dans les 10 s → application, grille rechargée, « N produit(s) coché(s) » ;
  sans second clic le bouton revient à l'état initial et rien n'est écrit. Même chose pour « Décocher ».
- La barre commune (période, médecin, recherche, éditions) est masquée sur ces deux onglets et rétablie sur Registre
  et Analyse (`OrdonnancierCtrl.surChangementOnglet`). Chargement à la demande, à la première ouverture.
- Aucun menu nouveau (même écran `ordonnancier`), aucune JSP, aucune fenêtre surgissante.
- Ligne de vente (`VenteVNO.js`, colonne DESIGNATION) : pastille « ORDONNANCIER » fixe (bleu), « SENSIBLE » violette
  qui clignote trois fois puis reste ; avec « réduire les animations » : contour fixe, sans clignotement
  (`vente-theme.css`). Le JSON de la vente et de la recherche produit portent `scheduled`, `sensible`, `motif`.

## Déploiement : modèles d'édition

`ordonnancier.jrxml` (colonne Motif) est modifié. Sur un poste, `ReportUtil` charge d'abord le `.jasper` puis le
`.jrxml` du dossier REPORTS de l'officine (`D:\CONF\LABOREX\REPORTS`) et ne retombe sur le modèle du WAR que s'ils
sont absents. **Au déploiement, copier `src/main/resources/reports/ordonnancier.jrxml` dans REPORTS et retirer
`ordonnancier.jasper`** (il est recompilé au premier PDF). Sans cela, l'édition reste à l'ancienne mise en page, sans la
colonne Motif. Fait sur le poste local le 03/11/2026 (anciens fichiers gardés en `*.avant-cas3`).

## Tests

Unitaires (`mvn -o -q test -Dtest=…`, JDK 11) : `ProduitOrdonnancierTest` (5), `OrdonnancierJrxmlTest` (1),
`AnalyseOrdonnancierTest` : verts.

Tests d'écran, un par un, sur `http://localhost:8080/prestige` avec le compte `e2e`, données retirées à la fin
(`src/test/e2e/ordonnancier/`) :

| Test | Résultat | Parcours |
|------|---------:|----------|
| `test-produit-sensible-vente.js` | 27/27 | onglet Produits sensibles (barre commune masquée), case cochée au clic et journalisée, pastille SENSIBLE clignotante sur la ligne de vente, clôture refusée sans médecin, parcours client puis médecin suivi à l'écran, vente close, vente au registre, détail avec motif Sensible, décochage : le produit sort du registre., PDF avec la colonne Motif et la mention Sensible (après remplacement du jrxml dans REPORTS, ci-dessus) |
| `test-sans-code-tableau.js` | 13/13 | case Ordonnancier cochée au clic, badge « SANS CODE TABLEAU », pas de pastille, clôture sans médecin et sans plantage, produit absent du registre |
| `test-cochage-lot.js` | 16/16 | compteur, premier clic = nombre dans le bouton sans fenêtre, délai de 10 s sans écriture, second clic = lot appliqué et journalisé, Décocher = état initial |
| `etape3/test-ordonnancier.js` (régression) | 62/62 | registre, détail, recherche, éditions, inventaire, analyse inchangés ; deux assertions mises à jour (quatre onglets) |

Commandes (poste Windows) :

```
set NODE_PATH=D:\outils-e2e\node_modules
set PLAYWRIGHT_BROWSERS_PATH=D:\pw-browsers
node src\test\e2e\ordonnancier\test-produit-sensible-vente.js
```

## Règle de tests du 05/11/2026 : les trois tests, joués le 06/11 sur domain3 (`laborex_audit`)

Chaque test a d'abord été mis en échec sur un défaut (ancienne règle ou défaut simulé), puis joué sur le vrai code.
Tests d'écran joués un par un sous le verrou commun `D:\projet\p3\verrou-e2e`, WAR de la branche redéployé sur
domain3 (`http://localhost:10090/prestige`).

| Test | Rouge d'abord | Vert |
|---|---|---|
| Cohérence `ProduitOrdonnancierCoherenceTest` (6 propriétés, 20 000 produits, 5 000 ventes, graine 20261105) | ancienne règle remise dans `TFamille` : 3 NullPointerException + 3 assertions | 6/6 |
| Rapprochement `test-rapprochement-motif.js` | `E2E_DEFAUT_SIMULE=1` (code tableau de P2 effacé en base après la clôture) : 19/23, les 4 échecs portent tous sur P2 (détail écran, PDF, Excel, marques à paramètre 0) | 23/23 |
| Bilan `test-bilan-cochage-cloture.js` | `E2E_DEFAUT_SIMULE=1` (un témoin coché en base dans le dos de l'écran) : 41/42, le seul échec est le témoin (« seuls les drapeaux attendus changent ») | 42/42 |
| Régression `test-produit-sensible-vente.js` | — | 27/27 |
| Régression `test-sans-code-tableau.js`, `test-cochage-lot.js` | — | 13/13, 16/16 |
| Régression `etape3/test-ordonnancier.js` | — | 62/62 |

### Où la donnée apparaît et comment elle est rapprochée

Pour cinq produits variés (sensible ; ordonnancier avec code A ; sensible **et** ordonnancier avec code II ;
scheduled sans code ; ordinaire), le motif, le code tableau, la quantité et le montant sont lus et comparés ligne par
ligne dans : la grille de vente (marques), la base (`t_preenregistrement_detail`), le détail du registre à l'écran,
le service du détail, le PDF (`pdftotext -raw`, fichier écrit par le serveur) et l'export Excel (`outils/lire_xls.py`).
Le paramètre à 0 garde les mêmes marques et sort la vente du registre.

### Règle de calcul et test de cohérence

Règle unique `TFamille.estProduitOrdonnancier() = sensible || (scheduled && code tableau non vide)`, motif « Sensible »
prioritaire sur « Ordonnancier ». Le test de cohérence la vérifie sur des milliers de produits et de ventes tirés au
hasard (codes nuls, vides, blancs, variés), avec la réversibilité cocher / décocher et l'accord clôture / registre.

### Traces attendues et test de bilan

- Cochage (unitaire, lot, décochage, onglet ordonnancier) : seuls les drapeaux attendus changent, **lus avant
  l'opération** et jamais relus après ; une ligne de journal `t_journal_cochage` par opération, du compte connecté ;
  `dt_UPDATED` n'avance et `t_famille_history` ne grossit (déclencheur `t_famille_before_upd_tr`) que pour les produits
  touchés ; stocks, ventes, lignes, mouvements, caisse, recettes, règlements inchangés (empreinte CRC32 de chaque table).
- Clôture d'une vente (A1 sensible ×2, A2 ordinaire ×3) : refus sans médecin, puis stock −2 / −3 sur l'emplacement 1,
  un mouvement de stock par ligne (début − quantité = fin = stock lu), un mouvement de caisse au prix, une recette, un
  règlement, +1 vente, +2 lignes, journal du cochage inchangé, **aucune ligne de `t_famille` mise à jour**, registre
  +1 dont le détail ne porte que A1 (motif Sensible, quantité 2).

### Écarts signalés sur la branche d'intégration (06/11) : tous côté test, aucun côté code

- P3 (sensible + ordonnancier) montre les deux marques : l'intégration a remplacé les pastilles par des triangles ;
  le test accepte la marque du motif plus les marques justifiées par les drapeaux.
- Contrôle base : séparateur `
` de `GROUP_CONCAT` cassé par le client mariadb sous Windows ; remplacé par ` ~~ `.
- PDF : quantités `NaN` parce que `pdftotext -layout` mélange les lignes quand une cellule passe sur deux lignes ;
  lecture en `-raw`. L'URL rendue n'est pas servie par l'application : le fichier est lu sur le disque.
- Bilan « rien d'autre ne bouge » : `VERSION` (JPA) et `dt_UPDATED` (déclencheur) bougent à chaque mise à jour ;
  exclues de l'empreinte et contrôlées à part.
- `etape3/test-ordonnancier.js` visait `localhost:8080` en dur tout en semant ses données dans la base de domain3 :
  il respecte désormais `BASE`.
