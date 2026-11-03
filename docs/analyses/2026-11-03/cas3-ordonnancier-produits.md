# Cas 3 : Ordonnancier — onglet « Produits » et produits sensibles

Demande d'origine : [analyse_new.md](analyse_new.md), cas 3. Maquette : [cas3-ordonnancier-produits.html](cas3-ordonnancier-produits.html).

## 1. L'existant

### Ce qu'est l'ordonnancier aujourd'hui

- **Pas de table propre.** Le registre est *calculé* à partir des ventes closes : `t_preenregistrement` (la vente, avec sa colonne
  `medecin_id`) et `t_preenregistrement_detail` (les lignes).
- Une vente entre dans le registre dès qu'elle est close **et qu'elle a un médecin** (`SalesStatsServiceImpl.findAllVenteOrdonnancier`,
  l. 1298-1370). Le filtre « produit ordonnancier » ne joue que sur le détail, les éditions PDF/Excel et l'onglet Analyse.
- Un produit est « ordonnancier » s'il remplit **deux conditions** sur `t_famille` (`dal/TFamille.java`) :
  - `is_scheduled = 1` (champ Java `scheduled`, « soumis à ordonnance ») ;
  - **et** un code tableau `int_T` non vide (texte libre, référentiel `t_tableau` non relié par clé étrangère).
- Cette règle est **dupliquée** à deux endroits :
  - `SalesServiceImpl.checkOrdonnancier` (l. 2542-2546) — contrôle à la clôture de vente ;
  - `SalesStatsServiceImpl.produitsOrdonnancier` (l. 1381-1385) — registre, détail, éditions, analyse.
- Activation : paramètre `KEY_GERE_ORDONCIER` (`t_parameters`, défaut `0`). À `1`, la clôture d'une vente contenant un produit
  ordonnancier exige un médecin (vente assurance l. 3052-3060 ; vente comptant l. 3418-3434 exige aussi un client). Le front ouvre alors
  le parcours « VENTE ORDONNANCIÈRE : CLIENT PUIS MÉDECIN » (`view/vente/user/OrdonnanceParcours.js`, déclenché par `VenteCtr.js`
  l. 2612-2622 et 7943-7973 ; idem `VenteEnDepotCtr.js`).
- Ce que le flag ne fait **pas** : pas de numéro d'ordonnance, pas d'écriture dans une table dédiée, pas d'indicateur visuel sur la ligne de
  vente (le JSON de recherche produit renvoie bien `scheduled`, `SearchProduitServcieImpl` l. 741/871, mais aucun JS ne l'affiche).

### L'écran Ordonnancier

- Menu : `t_sous_menu` id `27092020`, composant `ordonnancier`, privilège `P_SM_ORDONNANCIER` (migration `V4.5.7`). Habillage déclaré
  dans `correctifs-affichage.js` l. 905 et 961 ; icône dans `metro/metro-icones.js` l. 34 et 324.
- Vue `view/vente/Ordonnancier.js` : barre de filtres dockée **commune** (Du / Au / Médecin / Nom du client ou référence / rechercher /
  Imprimer / Exporter / Créer inventaire), puis tabpanel `#ongletsOrdonnancier` avec deux onglets : **Registre** (grille `#grilleRegistre`)
  et **Analyse** (`ongletAnalyse()`, trois palmarès). Point d'insertion d'un troisième onglet : le tableau `items` l. 167-299.
- Contrôleur `controller/OrdonnancierCtrl.js` : `surChangementOnglet` (l. 168-172) charge l'analyse à la première ouverture — modèle à
  reprendre pour l'onglet Produits.
- REST : `rest/SalesStatsRessource.java`, `@Path("v1/ventestats")`, chemins `ventesordonnanciers`, `.../detail/{id}`, `.../analyse`,
  `.../pdf`, `.../excel`, `POST .../inventaire`.

### Où se coche aujourd'hui « soumis à ordonnance »

- **Pas dans la fiche article** (`famille/action/add.js` ne propose que le code tableau).
- Liste des articles `configmanagement/famille/FamilleManager.js` l. 541-577 : checkcolumn « O » (`scheduled`) **cachée par défaut**,
  sauvegarde immédiate par `POST ../api/v1/commande/update/scheduled` (`CommandeRessource` l. 162-167 → `OrderServiceImpl` l. 903-914).
- MAJ sélective en lot `famille/action/maj_selective.js` (champ `ORDONNANCIER` Oui/Non → `FicheArticleServiceImpl` l. 1836-1839).

### Modèle d'écran « liste d'articles à cocher » déjà en place

`configmanagement/famille/Products.js` (xtype `produitsxx`) : grille CIP / Désignation / Prix / Stock / case « Coché », recherche
« Nom ou CIP… », filtres rayon et grossiste, combo « Produits cochés / non cochés / Tous », compteur de résultat, boutons « Cocher tout le
résultat » / « Décocher tout le résultat » (en deux temps : `simuler: true` pour le nombre, puis application). REST
`rest/FicheArticleRessource.java` `account/{id}`, `account`, `account-lot`. **C'est le gabarit à reprendre tel quel.**

### Notion de « produit sensible »

**Inexistante** dans le code (recherche `sensible`, `stupef`, `psychotrop`, `liste I/II`, `surveill` : rien de pertinent). Aucun
référentiel de catégories réglementaires ; seul classement = le code tableau libre.

## 2. Ce qui est possible

Oui, sans refonte :

1. **Onglet « Produits »** dans le tabpanel de l'ordonnancier, copie fonctionnelle de `Products.js` avec deux cases par ligne :
   « Ordonnancier » et « Sensible ». Chargement à la demande (comme Analyse). Sauvegarde immédiate au clic (pas de bouton Enregistrer, pas
   de fenêtre), et cochage en lot sur le résultat filtré avec compteur dans le bouton (confirmation dans le bouton lui-même).
2. **Produit sensible** : une colonne `t_famille.is_sensible` (option a, recommandée) intégrée dans **une seule** méthode
   `estProduitOrdonnancier(TFamille)` appelée par les deux prédicats aujourd'hui dupliqués. Un produit sensible se comporte alors
   exactement comme un produit ordonnancier : médecin obligatoire à la clôture (si `KEY_GERE_ORDONCIER = 1`), présence dans le détail,
   les éditions et l'analyse.
3. Nouveaux services REST, sous le même chemin `v1/ventestats/ventesordonnanciers/produits` ou mieux `v1/fichearticle/ordonnancier` :
   `GET` (liste paginée, filtres `query`, `filtre` = ordonnancier / sensible / aucun / tous, `rayon`), `PUT {id}` (`{ordonnancier, sensible}`),
   `PUT lot` (`{filtres, champ, valeur, simuler}`).

## 3. Règles métier à trancher

| # | Question | Proposition |
|---|----------|-------------|
| Q3.1 | Un produit **sensible** doit-il avoir un **code tableau** pour entrer au registre ? Aujourd'hui, sans `int_T`, un produit « soumis à ordonnance » n'y entre pas. | Non : « sensible » suffit seul. Pour « ordonnancier », garder la règle actuelle (coché **et** code tableau) ou la relâcher ? À trancher — relâcher change le contenu du registre existant. |
| Q3.2 | « Sensible » est-il un **sous-type** d'ordonnancier (même traitement partout) ou doit-il être **distingué** dans le registre, les éditions et l'analyse (colonne « Motif : Ordonnancier / Sensible ») ? | Même traitement, plus une colonne « Motif » dans le détail et les éditions. |
| Q3.3 | Faut-il un **indicateur visuel** sur la ligne de vente (pastille « ORD » / « SENS ») dès l'ajout du produit, plutôt que de découvrir le blocage à la clôture ? | Oui (hors périmètre strict, mais ergonomie). |
| Q3.4 | Le cochage en lot (« tout le résultat ») est-il réservé à un **droit** distinct ? | Un seul privilège d'écriture dérivé de `P_SM_ORDONNANCIER`, lecture pour tous ceux qui voient le menu. |
| Q3.5 | Doit-on **tracer** qui a coché / décoché (journal) ? | Oui : ligne dans le journal d'audit existant (sans texte de message patient). |
| Q3.6 | La colonne « O » cachée de la liste des articles et la MAJ sélective restent-elles ? | Oui, elles écrivent le même champ ; aucune suppression. |

## 4. Risques de régression et points de vigilance

- **Contenu du registre** : si l'on relâche la règle « code tableau obligatoire », des ventes passées entrent/sortent du registre et des
  éditions. À documenter, et à ne faire que sur décision.
- **NullPointerException latente** : `SalesServiceImpl.checkOrdonnancier` (l. 2544) fait `getIntT().trim()` ; si `is_scheduled = 1` et
  `int_T` NULL, la clôture plante. La centralisation de la règle corrige ce défaut au passage — test de non-régression à écrire d'abord
  (défaut reproduit par un test qui échoue).
- **Barre de filtres commune** (dates / médecin) : sans sens sur l'onglet Produits. Masquer ou désactiver ces champs sur `tabchange`, et
  donner à l'onglet sa propre barre (recherche / filtre / rayon) — ne pas toucher au comportement des deux onglets existants.
- **Inventaire** : `InventaireServiceImpl.produitIdsFromVentes` prend tous les produits des ventes, pas seulement les ordonnancier ;
  inchangé ici.
- **Volume** : la liste des articles peut dépasser 20 000 lignes ; pagination serveur obligatoire (comme `Products.js`), pas de store local.
- Les tests d'écran passent par le vrai chemin (clic sur la case, pas l'API) et retirent leurs données.

## 5. Ce qu'il faudrait toucher

| Couche | Fichier | Modification |
|--------|---------|--------------|
| SQL | `src/main/resources/db/migration/V?.?.?__produits_sensibles.sql` | `ALTER TABLE t_famille ADD is_sensible TINYINT(1) NOT NULL DEFAULT 0` (idempotent, comme `V4.7.7`). Privilège d'écriture. |
| Entité | `dal/TFamille.java` | champ `sensible`. `FamilleDTO` (copie / création). |
| Règle | `rest/service/impl/SalesServiceImpl.java` l. 2542 et `SalesStatsServiceImpl.java` l. 1381 | remplacer les deux prédicats par un appel à une méthode unique (utilitaire statique ou méthode de `TFamille`). |
| REST | `rest/FicheArticleRessource.java` (ou `SalesStatsRessource`) | `GET/PUT` liste + unité + lot, sur le modèle de `account`, `account/{id}`, `account-lot`. |
| Vue | `view/vente/Ordonnancier.js` l. 167-299 | troisième onglet « Produits » ; masquage de la barre commune sur cet onglet. |
| Ctrl | `controller/OrdonnancierCtrl.js` | refs + handlers (recherche, checkchange, lot), chargement à la demande dans `surChangementOnglet`. |
| Modèle JS | `app/model/Famille.js` | champ `sensible`. |
| Détail / éditions | `OrdonnancierLigneDTO`, `ordonnancier.jrxml`, `analyse_ordonnancier.jrxml`, `DetailProduitsVente.js` | colonne « Motif » (si Q3.2 = distinguer). |
| Menu | `correctifs-affichage.js` | rien de nouveau : même écran `ordonnancier` déjà déclaré (l. 905). |

Aucune JSP nouvelle. Pas de fenêtre surgissante : le cochage en lot confirme dans le bouton (« Cocher 128 produits ? » → « Confirmer »).
