# Plan du 19/11/2026 : compte rendu

Branche `PRES-/plan-19112026-e7b871`. Un commit par point. Rien n'a été fusionné.

Les essais ont tourné sur le serveur domain3 (port 10090), sur la copie de travail `laborex_audit`. Aucune base de
production n'a été touchée. Chaque test d'écran a été lancé seul et retire ses données à la fin.

Points non traités, comme convenu : 0, 1 et 5. Le BFR (ancien point 16) est traité après le point 16 (§ BFR).

Abréviations :
- **R** : test de rapprochement (une donnée comparée partout où elle apparaît) ;
- **C** : test de cohérence (règles de calcul, sur des milliers de cas tirés au hasard avec une graine fixe) ;
- **B** : test de bilan (traces laissées en base, ni plus ni moins).

Chaque nouveau test a d'abord échoué sur l'ancien code, puis il est passé.

| Point | Commit | Sujet |
|---|---|---|
| 2 | 249acad21 | Import d'un BL au modèle DPCI : une ligne à PA = PV = 0 est une ligne d'UG |
| 3 | 256b8b43d | Analyse tiers payant : produits chargés au clic et paginés |
| 4 | 05c95fd97 | Inventaire : filtre « vendus après la création » en une requête |
| 6 | a7c5ee9b8 | Fiche article : zone « Ordonnancier » lisible ; détail article en moins de lectures |
| 7 | a66ad9064 | « Modifier infos client » sans changement n'écrit rien ; retour à la recherche |
| 8 | 4fc5150fc | Ticket « vente modifiée » : vente d'origine, vente modifiée, différences |
| 9 | 58c3be177 | Import des réserves : tous les codes inconnus, les doublons un par un, Excel et impression |
| 10 | 1c58297a7 | « Créer une facture » : boutons au nouveau style |
| 11 | 5ac36d37d | Pointage des bons par groupe d'organismes |
| 12 | 103997437 | Modifications et règlements de BL tracés au journal, onglet « Modifications des BL » |
| 13 | f39a8fc20 | Top 10 des marges au tableau de bord ; produits par marge dans l'Analyse |
| 14 | 764edb782 | Relevé des factures de groupe en Excel |
| 15 | ffe5da468 | Export Excel et CSV de « Liste de caisse » et « Visualiser la caisse » |
| 16 | af581a162 | Onglet « Règlements fournisseurs » |
| 16 (suite) | 5a77da562 | « Régler les BL » passe par le cumul et l'historique des règlements |
| BFR | 33dc6b6c3 | BFR : carte du tableau de bord et menu « BFR » (ANALYSE DE GESTION) |

---

## Point 2 : import DPCI et UG

**Où apparaît la donnée** : fichier importé, commande, BL (colonne UG), lot, stock, compteur d'UG, PAF de la fiche.
- **R** : `retours/test-import-dpci-ug-1911.js` compare fichier, commande, BL et écran. Ancien code 11/24, nouveau 24/24.
- **C** : `CumulLigneImportCoherenceTest` porte sur les cas réels du fichier et sur 20 000 fichiers tirés au hasard.
  Les lignes payées d'un même CIP s'additionnent. Montant = somme des payées × leur PA. Une ligne d'UG ne remet jamais
  le montant ni le PAF à 0.
- **B** : stock + (payées + UG) ; compteur d'UG + UG ; un seul mouvement ; PAF inchangé.
- **Défaut grave corrigé** : une ligne d'UG lue avant la ligne payée mettait le PAF de la fiche à 0.
- **Cas variés** : CIP répété, UG avant ou après la payée, plusieurs grossistes (LABOREX, COPHARMED).
- **Non-régression** : import avec produit répété 17/17 ; bilan d'entrée en stock 34/34.

## Point 3 : analyse tiers payant

- **R** : `analyse/test-analyse-tierspayant-ouverture-1911.js` vérifie que la ligne du tiers payant = la somme de ses
  produits = le pied de grille. Ancien code 5/11, nouveau 14/14.
- **C** : `PageAnalyseCoherenceTest` (3 000 listes). Les totaux de toute la liste ne dépendent pas de la page affichée.
- **B** : lecture seule ; aucune écriture.
- **Mesures** :
  - « Rechercher » : 1 241 ms → environ 500 ms ;
  - clic sur un tiers payant : environ 300 ms, en une requête.
- **Reste** : `test-analyse-tierspayant.js` est à 12/13. L'échec vient du jeu d'essai (CIP 3532111 et son
  déconditionné) ; l'endpoint concerné n'a pas été modifié.

## Point 4 : inventaire, « vendus après la création »

- **R** : `test-filtre-vendus-apres-creation-1011.js`, 19/19. Il couvre 4 inventaires réels, soit 11 464 lignes ;
  filtre et quantités = base.
- **C et B** : `test-inventaire-vendus-apres-une-requete-1911.js`. Une seule requête par choix de filtre ; aucune
  écriture. Ancien code 5/8, nouveau 8/8.
- **Mesures** :
  - inventaire de 5 000 lignes : API 2 998 ms → 36-42 ms ; écran 4 315 ms → environ 430 ms ;
  - inventaire réel de 11 203 lignes : 650-750 ms, inchangé.

## Point 6 : fiche article

- **R** : `test-detail-article-rapide-1911.js` compare avant / après 5 381 champs sur 42 produits variés, et les
  droits pour les 39 utilisateurs.
- **Ergonomie** : `test-fiche-ordonnancier-zone-1911.js`, 12/12.
- **Mesure** : 20 lectures en base → 14. Les 622 ms signalés ne sont pas reproduits ici (18 ms, lectures en cache).
  Piste chez le pharmacien : lectures disque à froid ; vérifier le tampon InnoDB.
- **Non-régression** : ordonnancier 29/29 ; dernière entrée 13/13 ; dernière vente 5/5.

## Point 7 : « Modifier infos client » sans changement

- **C** : `InfosClientSansChangementCoherenceTest` (60 000 cas).
- **B** : `test-infos-client-sans-changement-1911.js`, 14/14. Sans changement, rien n'est écrit : ni notification, ni
  trace.
- **Non-régression** : pointage 19/19 ; bons par organisme 21/21 ; changement de tiers payant 7/7 ; infos client 7/7.

## Point 8 : ticket « vente modifiée »

- **Où apparaît la donnée** : aperçu, image 58/80 mm, impression, base.
- **R** : `vente/test-ticket-vente-modifiee-1911.js`, 64/64.
- **C** : `TicketVenteModifieeCoherenceTest` (20 000 cas). Il vérifie les différences de total, de remise, de parts
  et de part client, ainsi que le reste à payer ou à rendre.
- **B** : aucune écriture.
- **Délai** : environ 330 ms, plafond 4 s.

## Point 9 : import des réserves

- **R** : `stock/test-liste-reserve-non-retenus-1911.js`, 19/19. Panneau = Excel = impression = fichier.
- **C** : `ImportCodesEnDoubleCoherenceTest` (5 000 fichiers).
- **B** : aucune écriture.
- **Délais** :
  - Excel : 2,3 s, plafond 4 s ;
  - impression : 80 ms, plafond 2 s.
- **Non-régression** : 29/29.

## Point 10 : « Créer une facture »

- **Ergonomie et B** : `facturation/test-creer-facture-boutons-1911.js`, 16/16, en 1366 × 700 et en 1600 × 900. Il
  vérifie le style, l'ordre, les gestes et l'absence d'écriture.
- **Non-régression** : disposition 7/7 ; sortie 29/29.

## Point 11 : pointage des bons par groupe

- **R** : `facturation/test-pointage-bons-groupe-1911.js`, 19/19. Les compteurs du groupe = la somme des organismes.
- **C** : `SommeCompteursGroupeCoherenceTest` (10 000 groupes).
- **Non-régression** : pointage 47/47, 19/19 et 9/9 ; bons par organisme 21/21.

## Point 12 : modifications et règlements de BL au journal

- **R** : `achats/test-modification-bl-journal-1911.js`, 20/20. Onglet = journal = écran Journal = base.
- **C** : `ModificationBlCoherenceTest` (40 000 cas). Reste à payer = TTC − réglé ; jamais négatif ; statut dérivé.
- **B** : une ligne de journal par opération ; aucune si rien ne change.
- **Constat** : « Régler les BL » (`reglerBons`) ne mettait pas à jour le reste à payer du mouvement d'achat. C'est
  corrigé au § 16 (suite) : l'ancien chemin passe désormais par le même calcul que l'onglet.

## Point 13 : top des marges

- **R** : `retours/test-marges-top-analyse-1911.js`, 25/25. Carte = Analyse = Excel = impression.
- **C** : `TopMargesCoherenceTest` (3 000 périodes).
- **Mesure** : l'Analyse affiche la période en 0,1 s au lieu de 1,4 s.

## Point 14 : relevé des factures de groupe en Excel

- **R** : `facturation/test-releve-groupe-excel-1911.js`, 45/45.
  - Excel = PDF, ligne par ligne.
  - Excel = base, facture par facture.
  - Excel = liste de l'écran.
- **C** : `ReleveGroupeExcelCoherenceTest` (5 000 relevés, deux modes).
- **B** : aucune écriture.
- **Constats** (existants avant ce plan) :
  - deux relevés PDF édités dans la même seconde ont le même nom de fichier, et le second écrase le premier ;
  - à 1600 px, le bouton « Inventaire / Créer inventaire » déborde de sa barre sur `etatscontrolemanager`,
    `retourfrsmanager` et `ajustementmanager`.

## Point 15 : export de la caisse

- **R** : `caisse/test-liste-caisse-export-1911.js`, 63/63. Export = écran, ligne par ligne sur toutes les pages ;
  Excel = CSV ; export = base ; totaux = barre de l'écran.
- **C** : `ListeCaisseExportCoherenceTest` (3 000 listes).
- **B** : aucune écriture.
- **Mesures** : septembre entier en Excel 2,8 s au lieu de 52 s ; en CSV 1,1 s au lieu de 97 s.
- **Constat** : sur domain3, `perf/test-liste-caisse-export.js` reçoit une page HTML. Il passe par l'impression en mode
  LISTECAISSE, chemin `caisseService.cumul`, que ce point n'a pas modifié.

## Point 16 : règlements fournisseurs

Le travail porte sur un nouvel onglet « Règlements fournisseurs » de « État de contrôle Achats ». Il passe uniquement
par l'API REST `v1/reglements-fournisseurs`, sans nouvelle JSP.

- **Onglet** :
  - **Bandeau** : « Suivi des règlements depuis le JJ/MM/AAAA ». « Appliquer » demande sa confirmation dans le bouton
    lui-même (« Confirmer : les BL avant le … seront considérés comme réglés »).
  - **À régler** : ce qui reste dû par grossiste, par tranche d'âge (0-30, 31-60, 61-90, plus de 90 jours), et le total.
  - **Saisir** : grossiste, montant, date, mode et référence. Une colonne « Part du règlement » montre la répartition
    qui sera enregistrée : les BL les plus anciens d'abord, ou seulement les BL cochés.
  - **Historique** : chaque règlement avec sa répartition. L'annulation se confirme dans le bouton. Le relevé par
    grossiste existe en Excel et en PDF.
- **Base** :
  - nouvelles tables `reglement_fournisseur` et `reglement_fournisseur_bl` (migration `V7.6.41.1919`) ;
  - les règlements s'additionnent sur le BL, dans les colonnes que « Régler les BL » utilise déjà : montant réglé
    cumulé, reste à payer = TTC − réglé, statut dérivé ;
  - le reste à payer du mouvement d'achat suit.
- **Paramètres** :
  - `KEY_REGLEMENT_FRS_SORTIE_CAISSE` vaut 1 par défaut et apparaît dans l'écran des paramètres ;
  - `KEY_REGLEMENT_FRS_DATE_DEPART` vaut 2026-11-01. Il est absent de l'écran des paramètres : la date se change dans
    l'onglet.
- **Droit** : `P_REGLEMENT_FRS_DATE_DEPART`, donné aux rôles Super Administrateur, Administrateur et Pharmacien, et
  aux rôles du compte `admin`.
- **Journal** : trois nouveaux types, ajoutés en fin de liste (rangs 46 à 48) :
  - règlement fournisseur ;
  - annulation de règlement fournisseur ;
  - changement de la date de départ, avec l'ancienne date, la nouvelle et l'auteur.
- **Caisse** : avec le paramètre à 1, un règlement en espèces fait une sortie de caisse dans la caisse ouverte de
  l'utilisateur.
  - Le libellé de la sortie est « Règlement fournisseur RF… - grossiste ».
  - Si la caisse est fermée, le règlement est refusé avec « Ouvrez votre caisse pour régler en espèces. », et rien
    n'est écrit.
  - L'annulation rend la somme par une entrée de caisse du même montant.
- **Date de départ** : les BL datés d'avant sont considérés comme réglés, mais seulement à la lecture ; aucun BL n'est
  modifié. Dans « Liste des BL », la nouvelle colonne « Reste à payer » les affiche à 0, en gris.

**Où apparaît la donnée, et test de rapprochement** : `achats/test-reglements-fournisseurs-1911.js`, 52/52.
- Reste à payer, BL par BL : onglet = « Liste des BL » = relevé Excel = relevé PDF = base, avec les totaux.
- Sortie de caisse :
  - visible avec le même montant dans la liste de caisse et dans « Visualiser la caisse » (export) ;
  - ajoutée à « Espèce Sortie » dans le ticket Z ;
  - dans le billetage, la vraie clôture d'une caisse d'essai donne la ligne règlement espèces = −montant et le
    montant de clôture = −montant ;
  - en base : `t_mvt_caisse` de type 4 et `MvtTransaction` SORTIE.
- Date de départ : identique dans le bandeau, en base, dans « Liste des BL » (un BL de septembre vaut 0) et dans
  « À régler ».
- À régler : par grossiste, nombre de BL, tranches et total = base, pour 15 grossistes.

**Règles de calcul, et test de cohérence** : `ReglementFournisseurCoherenceTest` porte sur 5 000 grossistes tirés au
hasard avec une graine fixe : 0 à 25 BL, de 1 à 6 règlements successifs, des annulations.
- La somme des parts est égale au montant.
- Un BL déjà réglé ne reçoit aucune part.
- Un BL plus loin dans l'ordre ne reçoit rien avant que les précédents soient soldés.
- Le reste à payer n'est jamais négatif.
- Le statut est dérivé du montant réglé.
- Une annulation rend exactement les parts.
- Un montant nul, négatif ou supérieur au dû est refusé.
- Le total dû est égal à la somme des restes des BL datés du jour de départ ou après, et à la somme des tranches.
- Les tranches ont les bornes 30, 60 et 90 jours.

Le test échoue si l'on retire le refus du dépassement (« cas 15 : refus attendu »), puis il repasse.

**Traces attendues, et test de bilan** (même e2e) :
- règlement en espèces, paramètre à 1 : 1 règlement, 2 parts, 1 ligne de journal, 1 sortie de caisse ;
- règlement par chèque : 0 mouvement de caisse ;
- règlement en espèces, paramètre à 0 : 0 mouvement de caisse ;
- caisse fermée, ou montant supérieur au dû (refusé à l'écran comme par le serveur) : rien n'est écrit ;
- annulation : 1 ligne de journal, 1 entrée de caisse ; le net de caisse du règlement est 0 ; une seconde annulation
  est refusée ;
- changement de date : 1 ligne de journal, 0 BL modifié (empreinte de tous les BL), 0 mouvement de caisse ;
- droits : sans le droit, la date est en lecture seule et le serveur refuse le changement ; aucune ligne de journal.

**Cas variés** :
- BL entier puis BL en partie ;
- BL cochés dans l'ordre de l'écran ;
- second règlement sur un même BL (réglé cumulé) ;
- espèces, chèque, paramètre à 0 et à 1 ;
- caisse fermée ;
- dépassement ;
- annulation.

**Mesure** : le relevé PDF s'affiche en moins de 10 s, sous plafond.

**Non-régression** :
- test-modification-bl-journal-1911 20/20 ;
- test-controle-achats-contient-annules 8/8 ;
- test-onglets-gauche 22/22 ;
- test-controle-achats-tableau 13/13. Son attendu listait encore 3 onglets ; il en compte désormais 5, dont
  « Modifications des BL », ajouté au point 12.

**Remarque** :
- Le billetage ne voit les sorties qu'à la clôture. Le « solde » affiché avant clôture (`t_caisse`) ne bouge pas avec
  une sortie de caisse ; c'était déjà le cas avant ce plan, pour toute sortie de caisse.

## Point 16 (suite) : l'ancienne fenêtre « Régler les BL »

**Défaut, confirmé par un test qui échoue.** L'ancienne fenêtre (`reglerBons`, `paybls.js`, route
`etat-control-bon/reglement`) écrivait un montant réglé absolu. Exemple : un BL réglé deux fois dans l'onglet (1 000 puis
2 000), puis passé « en partie » à 5 000 par l'ancienne fenêtre. Le BL affichait 5 000 réglés, mais l'historique n'en
connaissait que 3 000. Le mouvement d'achat gardait aussi l'ancien reste à payer. Sur l'ancien code, le test donne 5/19.

**Correction.** L'ancienne fenêtre donne maintenant le montant réglé voulu (0, la partie saisie ou le TTC) :
- **hausse** : ce qui manque devient un règlement « Régler les BL », avec sa part sur le BL et sa ligne de journal. Il ne
  touche pas la caisse. Il apparaît dans l'historique de l'onglet ;
- **baisse sous les règlements de l'onglet** : refusée pour tout le lot, avant toute écriture, avec un message clair :
  « Le BL n° … a des règlements dans l'onglet « Règlements fournisseurs » (réglé : 3 000) : annulez-les depuis
  l'onglet. » ;
- **baisse sans règlement de l'onglet** : les règlements « Régler les BL » du BL sont annulés, avec une ligne de journal.
  Un réglé ancien, saisi avant le suivi, est ramené à la cible ;
- le statut, le reste à payer, la date de règlement et le mouvement d'achat suivent le même calcul que l'onglet ;
- la trace « Règlement du BL » du point 12 (valeurs avant et après) est conservée.

**Tests** :
- **R** : `achats/test-regler-bls-ancien-chemin-1911.js`, 19/19 (5/19 sur l'ancien code). BL par BL, le reste à payer est
  le même dans l'onglet, dans « Liste des BL », en base (TTC − réglé, reste du BL, reste du mouvement d'achat) et dans
  l'historique (TTC − parts actives). L'historique vu par l'écran contient la ligne « Régler les BL ».
- **C** : `ReglementFournisseurCoherenceTest.ancienneFenetreEtOngletCumulent`. 3 000 BL tirés au hasard, 40 opérations
  chacun, mêlant onglet, annulations et ancienne fenêtre. Règles vérifiées :
  - réglé = réglé ancien sans historique + parts actives ;
  - jamais sous les parts de l'onglet ;
  - jamais négatif ni au-dessus du TTC ;
  - un refus ne change rien.

  Une mutation (le refus retiré) est détectée.
- **B** : à chaque étape, le nombre de règlements, de parts, de lignes de journal (règlement, annulation, trace du BL)
  et de mouvements de caisse (toujours 0) est exactement celui attendu. Un refus n'écrit rien.

**Cas couverts** :
- 2 règlements de l'onglet (chèque, virement), puis « en partie » au-dessus ;
- « en partie » sous l'onglet : refusé ;
- « réglé » en entier ;
- « non réglé » : refusé ;
- un BL sans onglet : hausse, puis remise à 0 ;
- un lot mixte de 2 BL : tout le lot est refusé.

**Non-régression** :
- test-reglements-fournisseurs-1911 52/52 ;
- test-modification-bl-journal-1911 20/20 (le premier passage a donné une précondition vide, non reproduite ensuite).

## BFR : carte du tableau de bord et menu « BFR »

Menu ANALYSE DE GESTION > « BFR », déclaré dans `correctifs-affichage.js`, droit `P_SM_BFR`. La migration le donne aux
rôles qui voient le Pilotage et au rôle du compte admin. Lecture seule. Sans le droit, il n'y a ni menu ni carte, et le
serveur refuse.

**Calcul** :
- BFR = stock valorisé + créances clients − dettes fournisseurs ;
- BFR en jours = BFR / CA HT des 360 derniers jours × 360, arrondi à une décimale ;
- avec un CA HT nul, le résultat est « non calculable » (aucune division par zéro).

**Sources** :

| Composante | Source | Rapprochée avec |
|---|---|---|
| Stock valorisé (achat, rayon + réserve) | `valorisationStock` | écran « Valorisation du stock » |
| Différés clients | solde global du relevé des différés (même calcul) | relevé des différés |
| Factures tiers payant non réglées | reste des factures, par organisme | base |
| Parts tiers payant non facturées | mêmes ventes que la carte « Encours tiers payants », toutes dates | base |
| Dettes fournisseurs | « À régler » de l'onglet « Règlements fournisseurs » | onglet « À régler » |
| CA HT 360 j | règle de l'Analyse des marges | Marges › Analyse, même période |

Postes à 0 avec « non suivi dans Prestige » :
- dettes fiscales et sociales ;
- autres créances ;
- autres dettes.

Le menu et la carte portent la mention « Dettes fournisseurs suivies depuis le JJ/MM/AAAA ». Le menu détaille les factures
et les parts par organisme, et les dettes par grossiste.

**Tests** :
- **R** : `analyse/test-bfr-1911.js`, 30/30. Composante par composante : carte = menu = API = écrans sources = base,
  la base étant un calcul SQL indépendant. Le détail du menu est comparé à la base ligne par ligne, et sa somme à la
  composante. Deux organismes portent le même nom : les lignes sont comparées triées, pas par nom.
- **C** : `BfrCoherenceTest`, 20 000 cas tirés au hasard avec une graine fixe. Règles vérifiées :
  - BFR = stock + créances − dettes ;
  - créances = différés + factures + parts ;
  - jours = BFR / CA HT × 360 à 0,05 près, même signe que le BFR ;
  - CA HT à 0 ou négatif : non calculable.

  Les cas couvrent des stocks négatifs, des BFR négatifs, des montants au-delà de 2,1 milliards et des composantes à 0.
  Une mutation (base de 365 jours) est détectée.
- **B** : lecture seule. L'empreinte de toutes les tables concernées est identique avant et après :
  - ventes, BL et leurs règlements ;
  - factures, règlements fournisseurs ;
  - caisse, mouvements, stock ;
  - paramètres, journal.

**Chiffres de la copie de travail** (date de départ mise au 01/10/2026 le temps du test, puis remise) :

| Composante | Montant |
|---|---|
| Stock | 305 211 472 |
| Différés | 7 639 |
| Factures tiers payant non réglées | 517 889 691 |
| Parts non facturées | 47 822 410 |
| Dettes fournisseurs (415 BL) | 106 826 053 |
| **BFR** | **764 105 159** |
| CA HT (360 j) | 1 580 095 877 |
| **Jours de CA HT** | **174,1 j** |

**Mesures** :

| Mesure | Durée |
|---|---|
| Calcul complet, côté serveur | 2,3 à 2,5 s |
| Carte BFR, relue sans cache | 2,4 s (plafond 15 s) |
| Premières cartes, « Actualiser » sans cache, avec la carte BFR (médiane de 3) | 520 ms |
| Premières cartes, même mesure, sans la carte BFR | 497 ms |
| Menu « BFR » ouvert depuis le menu | 3 s |

Le tableau de bord ne ralentit pas : la carte BFR a sa propre route, se charge quand elle est visible et reste en cache
15 minutes.

**Non-régression** :
- test-tableau-bord 61/61. Son attendu passe de 16 à 17 cartes ;
- test-tableau-bord-impression 11/11 ;
- test-marges-top-analyse-1911 25/25.

---

## Poste et serveur d'essai

- Le disque C: était plein (273 Mo libres au point 14). Le dossier temporaire de Maven et les WAR ont été déplacés sur
  D:.
- domain3 est tombé en `OutOfMemoryError` (tas plein après de nombreux redéploiements). Il a été arrêté, puis
  redémarré, et redémarré de nouveau avant la série « Régler les BL » et BFR.
- Une nouvelle interface EJB oblige à supprimer `generated/policy/prestige` entre `undeploy` et `deploy`.
