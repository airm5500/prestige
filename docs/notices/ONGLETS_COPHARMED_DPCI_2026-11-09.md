# Onglets Copharmed et DPCI ajoutés (09/11)

Retour de l'utilisateur du 09/11 :
- « je n'ai pas ces éléments sur Copharmed : arrivages, nouveautés, les commandes en cours, relevés, avoirs,
  réclamations ; je n'ai que les onglets promotions et produits » ;
- « DPCI : je n'ai pas l'onglet produits ».

Relevé fait le 09/11, en lecture seule, sur les extranets connectés. Seules la forme des pages et les en-têtes ont été
relevés, jamais les valeurs.

Les Factures et Avoirs Copharmed existaient déjà, mais seulement sur domain2. Domain3 (10090), que l'utilisateur
regardait, a une version plus ancienne.

## Ajouté

| Onglet | Source sur l'extranet | Colonnes |
|---|---|---|
| Copharmed › Mes documents › Relevés | `ViewPharmacy-Statements` (pages de 25, `ViewPharmacy-PagingStatements`) | Date, N° relevé ; bouton **PDF** (`ViewPharmacy-DownloadStatementsPDF` : StatementNo, SpoolName, Year) |
| Copharmed › Mes commandes › E-Commandes | `ViewOrders-SimpleOrderSearch` (liste de 10 par page) | Date, N° e-commande, Quantité commandée, Quantité à livrer, État, Total |
| Copharmed › Mes commandes › Tous les produits commandés | `ViewEASyOrders-SimpleOrderSearch` (pages de 25) | Date, Code article, Libellé, Quantité commandée, Quantité livrée, Montant total, N° facture |
| Copharmed › Produits › Arrivages | bloc « Arrivages » de l'accueil `/fr/` | colonnes du catalogue |
| Copharmed › Produits › Nouveautés | bloc « Nouveautés » de l'accueil `/fr/` | colonnes du catalogue |
| DPCI › Produits › Tous les produits | `/module/catalogue/RechercheCatalogue.action` (DataTables, en GET, 100 lignes par page) | Désignation, Code, Laboratoire, Agence, Statut, Colisage, Prix, Prix remisé, Prix public, TVA, Offre |

Vérifié sur l'extranet réel : les 25 liens PDF de la première page des relevés ont des références de forme acceptée
(N° de 7 chiffres, nom de fichier de 23 caractères, année). Le bouton PDF est donc proposé sur chaque relevé.

Choix et limites :
- **E-Commandes** : le nom d'utilisateur n'est pas gardé.
- **Arrivages et Nouveautés** : les pages « Voir tout » ne sont pas utilisables.
  - `ViewArrivals-Start` renvoie une recherche « * » de 8 000 produits.
  - `ViewNovelty-Start` renvoie une page vide, remplie par script.
  - Prestige lit donc les blocs de l'accueil, tels que l'extranet les montre (5 produits chacun le 09/11).
- **DPCI Tous les produits** : 10 211 produits le 09/11.
  - Une page de 200 lignes provoque une erreur 500 : Prestige lit donc 100 lignes par page, soit environ 103 appels.
  - L'avancement s'affiche à l'écran (« page n / N »).
- **DPCI, codes gardés** : le code interne est gardé comme code produit. Le CIP est le code facture s'il en a la forme,
  sinon le code interne. C'est la même règle que pour les offres.
- **Réclamations Copharmed : non faites.** Le compte n'a aucune réclamation (« Aucune Réclamation »), donc la forme de
  la liste ne peut pas être relevée. Elle sera ajoutée après une première réclamation.
- **Encours Copharmed** (`ViewPharmacy-OutstandingCredit`) : non demandé, non fait.
- **DPCI Produits** : la rubrique est ajoutée en dernier, pour ne pas changer l'ordre des rubriques existantes.

## Tests

| Contrôle | Test | Résultat |
|---|---|---|
| Relevés : pages suivies, PDF gardé seulement avec ses trois références lisibles, nom `Copharmed_Releve_<n°>.pdf`, total de pages annoncé ; E-Commandes : quantités (somme, à livrer ≤ commandée), nom d'utilisateur jamais gardé, PageSize repris des liens ; produits commandés ; Arrivages et Nouveautés (bloc absent : refus) ; action de pagination étrangère jamais suivie | `CopharmedListesTest` (rapprochement, hasard, graine fixe) | 5/5 |
| DPCI Tous les produits : 0, 1, 100, 101, 250 produits et au hasard ; colonne par colonne ; somme des prix = source ; jamais de prix négatif ; prix remisé ≤ prix ; un appel par page de 100, sans filtre ; GET seulement | `DpciProduitsTest` | 2/2 |
| Catalogue des fichiers : PDF des relevés, paramètres exacts | `FichiersExtranetCoherenceTest` | 9/9 |
| Onglets à leur place ; source = écran = base, ligne par ligne, pour les 6 onglets ; PDF « Enregistrer sous » = PDF servi, octet pour octet ; références en base = liens ; bilan : exactement 6 collectes COMPLETE ; GET seulement | `test-ecran-onglets-0911.js` | 39/39 (ancien écran : échec, onglets absents) |

Non-régression : 2 109 / 2 109 tests unitaires ; écran (domain2) : DPCI en direct 29/29, fichiers 50/50, lectures en étapes 19/19.
