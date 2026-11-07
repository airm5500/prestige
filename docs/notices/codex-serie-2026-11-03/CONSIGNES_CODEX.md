# Série complète des tests d'écran par Codex (03/11/2026)

Codex joue seul la série complète des 507 tests d'écran. Claude ne lance aucune série en même temps.
Le résultat sert à confirmer ou à contester, test par test, le cahier de recette `CAHIER_RECETTE_2026-11-03.xlsx`
(dans ce dossier).

## Version testée

- Branche `integration/recette-2026-10-29`, commit `b58934651` (06/11, 03 h), dans `D:\projet\p3\prestige-integration`.
  Nouveau depuis `0348b1905` (à tester en priorité) :
  - fusion du cas 1 (ligne au comptant dans une vente assurance), du cas 2 (prix et taux de référence à la caisse)
    et du lot Q2.5 (base de calcul par tiers-payant, KEY_PRIX_REF_BASE_PAR_TP) ;
  - ticket : prix de référence et taux sur une seule ligne `P[2 235] * T[70%] : 1 565` (précédée du nom de
    l'organisme quand la vente en a plusieurs), plus de ligne « P.REF » à part ; sans prix de référence, inchangé
    (`Taux 70 % : 700`) ;
  - récapitulatif « N lignes · M articles » (au lieu de « boîtes ») ;
  - Modèles de ticket : nouveau bloc « Date du ticket », séparé du code-barres, chacun avec sa taille (réglage commun
    à tous les tickets) ;
  - tests : `retours/test-modeles-ticket-date-0611.js` (10/10), `retours/test-modeles-ticket-0511.js` (19/19),
    `prix-reference/test-rapprochement-ticket.js` (18/18), unitaires `CreditLigneFormatCompactTest`,
    `RecapArticlesTest`, `PiedDateSeparesTest`.
  - fusionnés ensuite le 06/11 : tests du cas 3 (ordonnancier), audits (promotions : unités gratuites corrigées ;
    caisse, litiges, date de recette), contrôle des achats (période imprimée), retour complet d'un BL (lots hors
    service). Tests d'écran rejoués : promotions 39/39, 15/15, caisse 16/16, recette 17/17, contrôle des achats
    23/23, retour de BL 36/36, ticket 18/18 et 10/10.
  - cas 3, tests corrigés (`d791fdc39`, seuls des fichiers de test et la notice changent, le serveur reste
    `b58934651`) : les écarts étaient tous côté test (triangles au lieu des pastilles, PDF de domain3 écrits dans le
    dossier de domain1, téléchargement lu comme page HTML). Rejoués sur 8080 : `ordonnancier/test-rapprochement-motif.js`
    23/23, `ordonnancier/test-bilan-cochage-cloture.js` 42/42.
  - **07/11, corrections du plan du 06/11** (`27f58dedb`, à tester en priorité) :
    - point 3.4 (`0fb711f1e`) : l'historique des promotions restait vide (erreur du serveur à la lecture du mode) ;
      `audits/test-ecran-historique-promotions.js` 16/16 (10/16 sur l'ancien code), promotions 15/15 ;
    - point 6 (`b0357fc1e`) : ticket d'une vente différée, « Règlement : Différé », plus d'« Espèces : 0 » (tickets
      assurance, comptant lié et combiné) ; `ligne-comptant/test-ticket-differe.js` 14/14 (9/13 sur l'ancien code),
      unitaire `ReglementTicketCoherenceTest` (5 000 cas) ; non-régression ligne comptant 19/19 et 23/23 ;
    - point 1 (`ad227e517`) : la date du ticket **revient à côté du code-barres** (le bloc « Date du ticket » du 06/11
      n'existe plus), avec sa propre taille (« Taille de la date ») ; `retours/test-modeles-ticket-date-0611.js`
      réécrit, 10/10 (1/4 sur l'ancien code), `PiedDateSeparesTest` réécrit ; modèles 19/19, ticket 18/18 ;
    - point 2 (`0c939055f`) : Pilotage, onglet « À suivre », le défilement va jusqu'au bas des dernières cartes ;
      `retours/test-pilotage-suivi-defilement-0611.js` 20/20 (8/16 sur l'ancien code) ; Pilotage 4/4, 12/12, 25/25.
  - **07/11, nuit : suite du plan du 06/11** (`1ed45eacc`, à tester en priorité ; migrations V7.2.38 à V7.2.40) :
    - 5.1 : le prix ou taux de référence saisi en caisse est gardé sur la vente et ne va sur la fiche qu'à la
      clôture ; annulation d'une vente close notée au journal ; `prix-reference/test-saisie-validee-cloture-0611.js`
      18/18 (9/18 sur l'ancien code), `prix-reference/test-annulation-vente-journal-0611.js` 16/16 (9/13) ; les huit
      tests du cas 2 suivent la nouvelle règle ;
    - 5.2 : rien sous une ligne au taux de l'assurance sur le ticket ; `test-rapprochement-ticket.js` 19/19 (18/19),
      `CreditLigneAffichageTest` (10 000 cas) ;
    - 15 : PSCODE sur la fiche article, recherche en fiche et en vente ; `retours/test-fiche-pscode-0611.js` 15/15 (2/5) ;
    - 3.1 : « PROMOTION » en vert ; `retours/test-vente-promotion-vert-0611.js` 8/8 (5/8) ;
    - 9 : icônes distinctes, suggestion cachée ; `retours/test-ventes-terminees-icones-0611.js` 7/7 (3/7) ;
    - 12 : colonne RES de la suggestion ; `retours/test-suggestion-stock-reserve-0611.js` 11/11 (6/11) ;
    - 4 : colonne C.CIP à 13 caractères (140 px) ; `retours/test-vente-colonne-cip-0611.js` 9/9 (5/9) ;
    - 14 : « Modèles de messages » sous Campagnes ; `retours/test-menu-modeles-messages-0611.js` 7/7 (4/7).
    Non-régression rejouée : 39 tests, tous verts (liste en bas de la feuille « Corrections du 07-11 »).
  Version précédente : `0348b1905`.
  Depuis `0acc63ef` : la connexion juste après un déploiement (profils spéciaux lus par la base, scripts d'écran
  préparés au démarrage ; identifiants acceptés en 0,29 s au lieu de 3,5 s). Le test
  `perf/test-connexion-apres-deploiement.js` se joue pendant un déploiement : hors de la série ordinaire.
- Elle contient, en plus de la série du 02/11 :
  - les audits (promotions, caisse G1 à G6, litiges, lots, retours, périmés, entrée en stock) ;
  - les anomalies du centre de support (clients assurés, filtres du diagnostic, journal du 03/11, avec cinq menus aux
    JSP supprimées masqués) ;
  - les scripts à jour sur tous les postes après un déploiement (jeton du déploiement dans leur adresse, retour du
    03/11 sur le rappel de l'horloge) ;
  - les performances (onglet « À suivre » du pilotage, mesures d'ouverture d'écrans) ;
  - le cache des éditions PDF, les modèles de ticket et l'onglet « Postes » ;
  - les trois fonctionnalités du 03/11 : ligne au comptant dans une vente assurance (cas 1, migration V7.2.35),
    prix et taux de référence par tiers-payant saisis à la caisse (cas 2, V7.2.34), ordonnancier et produits
    sensibles (cas 3, V7.2.33) ; chacune derrière son paramètre, à 0 par défaut ;
  - le ticket de vente à crédit (retours du 03/11) : « ORGANISME [70%] » avec le taux en gras, « : » après les
    libellés du bloc client, numéro de bon sous le bénéficiaire (jamais entre la part du client et celle de
    l'assurance), « Taux 70 % : 2 432 » sous chaque produit avec le montant en gras, « Total des deux ventes » et
    plus de mention « LIGNE COMPTANT » sur le ticket combiné, téléphones et adresse sur une ligne, numéro du ticket
    une seule fois, cadre du net à payer facultatif (menu « Modèles de ticket ») ;
  - la police du nouveau modèle de ticket, réglable dans « Modèles de ticket » : Segoe UI par défaut, Arial Narrow,
    Tahoma, Calibri ou Verdana (test `retours/test-ticket-police.js`, juste après celui du cadre du net) ;
  - les retours du 03/11 au soir : vente à crédit avec une ligne au comptant imprimée en deux tickets (assurance et
    combiné, sans reçu de caisse en plus), suggestion de réserve ouverte en moins d'une seconde, suggestions en cours
    toujours listées dans l'onglet Suggestions, boutons de « Gestion des réserves » et entêtes de colonnes lisibles au
    survol (tests `retours/test-reserve-boutons-lisibles.js` et `retours/test-entetes-survol-lisibles.js`, juste
    après celui de la police) ;
  - une suggestion de réserve par bon (retour du 04/11) : l'entrée en stock crée sa suggestion, datée du jour et au
    numéro du bon, avec les seuls produits du bon ; la ligne restée dans une suggestion plus ancienne y est reprise
    (tests `retours/test-reserve-apres-entree.js` et `retours/test-entree-stock-0825.js`) ;
  - les styles du 04/11 : plus de filets de couleur en bordure ; sections à bandeau gris, tuiles à pastille, messages
    à fond teinté, gravité par badge, élément choisi sur fond bleu clair en gras (test
    `retours/test-sans-filet-colore.js`, juste après celui des entêtes) ; les couleurs douces gardées en fond (retour
    du 04/11 au soir : bandeaux teintés du tableau de bord et des cartes, tuiles du pilotage teintées avec l'icône de
    leur indicateur ; test `retours/test-couleurs-douces.js`, juste après) ;
  - le pilotage, onglet « À suivre », en affichage progressif (courbes avant la fin du calcul de l'onglet) ; test
    `perf/test-pilotage-a-suivre-progressif.js`, juste après `perf/test-pilotage-a-suivre.js` ;
  - les largeurs de la grille de caisse du cas 2 (P.REF 80, TAUX 60, C.CIP 100, QD / QS 55) ; les deux tests de grille du
    prix de référence posent désormais la ligne comptant (cas 1) à 0 le temps du test ;
  - le lot Q2.5, base de calcul par tiers-payant, derrière `KEY_PRIX_REF_BASE_PAR_TP` à 0 (migration V7.2.36) ; tests
    `prix-reference/test-base-par-tp-non-regression.js` et `prix-reference/test-base-par-tp-deux-tiers-payants.js`,
    juste après `prix-reference/test-saisies-refusees.js` ;
  - « Suppression de lot » sur un BL sans gestion des lots : plus d'« erreur interne » (régression de l'audit 06 ;
    test `retours/test-bl-quantite-sans-lot.js`, juste après le précédent). `retours/test-bl-suppression-lot.js`
    pose désormais ses lots avec le grossiste du BL ;
  - l'entrée en stock accélérée : procédure de l'indicateur de commande remise sur l'index (script Flyway répétable
    `R__proc_indicateur_sugges.sql`, appliqué au démarrage) ; test `perf/test-perf-entree-stock.js`, juste après le
    précédent (bon de 40 lignes sous 3 s ; rejouer le premier essai s'il suit de près un déploiement) ;
  - les retours du 05/11, cinq tests juste après celui de l'entrée en stock : réimpression d'une vente assurance =
    un seul ticket (`retours/test-reedition-un-ticket.js`, lit le journal de domain1 : à analyser s'il échoue sur
    domain2) ; vente assurance + comptant en deux lignes dans la caisse (`retours/test-caisse-vente-scindee.js`) ;
    triangles « ! » et colonnes de la grille de vente assurance (`retours/test-grille-vente-triangles.js`) ; numéro du
    client dans l'analyse de l'ordonnancier (`retours/test-ordonnancier-numero-client.js`) ; menu « Historique
    ordonnancier », migration V7.2.37 (`retours/test-historique-ordonnancier.js`). Les tests de grille du prix de
    référence et de la ligne comptant attendent désormais une colonne LG sans titre ;
  - le lot A du 05/11 (modèles de ticket), deux tests juste après l'historique de l'ordonnancier : écran des modèles
    (`retours/test-modeles-ticket-0511.js`) et bouton « Nouveau » de la fiche du badge
    (`retours/test-rh-badge-bouton-nouveau.js`). La grille de la vente assurance contrôle aussi P.U à 80 px et le taux collé au nom du tiers-payant
    (`retours/test-grille-vente-triangles.js`). Les réglages communs (police, marge, en-tête, pied) passent désormais
    sur tous les tickets à l'enregistrement : `retours/test-modeles-ticket.js`, `retours/test-ticket-police.js` et
    `retours/test-ticket-cadre-net.js` mettent de côté et remettent toute la table `ticket_modele`. Un ticket jamais
    enregistré prend Arial Narrow ; un réglage enregistré avant garde ses valeurs ;
  - le rapprochement écran / ticket / base du 05/11 (`prix-reference/test-rapprochement-ticket.js`), juste après les
    tests de la base par tiers-payant : vente assurance à trois taux (80, 70 saisi dans la cellule, P.REF) clôturée par
    l'écran, puis le ticket relu par l'aperçu `vente/ticket/vo/{id}/apercu` (rien n'est imprimé). Il pose
    KEY_LIGNE_COMPTANT_VO à 1 le temps du test et le remet.
- Le correctif des litiges du 03/11 (`e4621aae`, migration V7.2.32.1) est inclus.
- `target/prestige.war` de cette version (`b58934651`) est **déjà déployé sur domain2** (06/11, 03 h). Les migrations
  sont passées. Ne pas redéployer, sauf si la branche a reçu du code depuis `b58934651`.

## Où jouer

| Serveur | Base | Liste |
|---|---|---|
| domain2, `http://localhost:9080/prestige` (administration 9048) | `laborex_perf` (port 3307) | `serie-2026-11-03.txt`, dans l'ordre |

- **Ne pas toucher à domain1 (8080) ni à `laborex_v1_db`.**
- Un seul test à la fois. Le lanceur les enchaîne un par un.
- Ordre imposé : `client/test-desactivation-organisme.js` passe avant `client/test-creation-client-assure.js`, car il
  crée l'organisme d'essai dont le second a besoin. La liste est déjà dans cet ordre.

## Lancement

Avec Git Bash, depuis ce dossier :

```bash
bash lancer-serie-domaine2.sh resultats-codex-2026-11-03.txt
```

- Il y a 492 tests. Compter plusieurs heures.
- `prix-reference/test-grille-identique-parametre-0.js` et `ligne-comptant/test-parametre-0-identique.js` comparent
  des captures au pixel près, avec une tolérance d'arrondi de couleur. Le lanceur leur donne le dossier
  `captures-pixel` (ici) : sans lui, ils comparent des empreintes exactes et échouent à tort.
- `ligne-comptant/test-une-ligne-cochee.js` imprime trois tickets ; avec « Microsoft Print to PDF », compter 30 s à
  4 min par ticket.
- Le PDF de l'ordonnancier lit `ordonnancier.jrxml` dans `D:\CONF\LABOREX\REPORTS` (dossier des modèles, pas celui de
  la configuration) : il y a déjà la version du cas 3.
- Chaque test est encadré par `=== <test>` et `--- code <n>` (0 = réussi). Le total s'affiche à la fin.
- Le lanceur lit l'identifiant de connexion à la base dans `domain.xml` de domain2. Il n'écrit aucun mot de passe en
  clair, ni dans le dépôt ni dans les journaux.

## Règles du projet, toujours valables

- **Ne jamais écrire dans une base de production.** Seule `laborex_perf` sert ici.
- Ne pas ouvrir `D:\CONF\LABOREX\CONF`.
- Aucun envoi réel de message :
  - les tests WhatsApp et SMS utilisent des instances d'essai ou des envois simulés ;
  - ne pas arrêter ni modifier le service Windows « Prestige - WhatsApp ».
- Pas de purge globale et pas de changement de la date système.
- Ne pas journaliser le texte des messages, ni les valeurs nominatives des clients, ayants droit ou ordonnances.

## Tests à traiter à part

- `support/test-reglages-serveur-payara.js` et `support/test-reglages-serveur-application.js` modifient Payara ou
  MariaDB. Ils refusent domain1, et sont donc « en échec » dans le cahier. Sur domain2, vérifier qu'ils ne visent que
  domain2 (`PAYARA_DOMAINE` et port 3307) avant de les laisser tourner.
- `audits/test-ecran-import-bl-meme-produit.js` a besoin du fichier du grossiste `FACTURE-YOP-157519.csv`, absent du
  poste de Claude. S'il manque aussi chez toi, le classer « environnement ».
- Mesures de temps (`perf/*`, `*rapidite*`, `ergonomie/*`) : un dépassement n'est un défaut que s'il se reproduit quand
  le test est rejoué seul. Le cahier signale trois écrans au-delà de 3 s sur `laborex_v1_db` : Comparaison CA
  familles, Audit & rapprochements, onglet « À suivre » du pilotage.
- WhatsApp et sauvegardes (`retours/test-whatsapp*.js`, `support/test-sauvegardes.js`,
  `support/test-valorisation-sauvegarde.js`) : ressources partagées. À rejouer seuls avant de conclure.

## Le cahier de recette

- `CAHIER_RECETTE_2026-11-07.xlsx` (07/11, à utiliser) : le cahier du 06/11 plus la feuille « Corrections du 07-11 »
  (13 cas : COR-01 historique des promotions, COR-02 ticket différé, COR-03 date à côté du code-barres, COR-04
  défilement du Pilotage, COR-05 ticket 5.2, COR-06 et COR-07 prix de référence 5.1, COR-08 PSCODE, COR-09 promotion
  en vert, COR-10 icônes des ventes terminées, COR-11 colonne RES, COR-12 colonne C.CIP, COR-13 menu des modèles) et
  la non-régression rejouée. NOU-03 (bloc « Date du ticket ») est marqué « Remplacé » par
  COR-03 : ne plus le jouer.
- `CAHIER_RECETTE_2026-11-06.xlsx` (06/11, gardé) : le cahier du 05/11 plus la feuille « Nouveautés du 06-11 »
  (15 cas : ticket compact, « articles », bloc « Date du ticket », cas 1, cas 2, lot Q2.5, cas 3, promotions,
  contrôle des achats, retour complet d'un BL, connexion après déploiement) et, en bas de cette feuille, les six cas
  déjà au cahier dont le test a changé (VEN-04, VEN-55, VEN-56, VEN-57, CAI-16, CAI-17), à rejouer. La synthèse
  compte la nouvelle feuille.
- `CAHIER_RECETTE_2026-11-03.xlsx` (ancien, gardé) : 492 cas répartis en 21 modules, avec pour chacun l'existant, les étapes, les
  résultats attendus et le dernier résultat de Claude (date et source).
- La feuille « Échecs à analyser » liste les 29 tests en échec au dernier passage de Claude, avec un classement
  provisoire. Les colonnes « Résultat Codex », « Classement Codex » et « Commentaire » sont à remplir.

## À rendre

1. Le fichier `resultats-codex-2026-11-03.txt` complet.
2. Le cahier, avec la feuille « Échecs à analyser » remplie :
   - pour chaque échec, la première ligne `FAIL` ou l'exception ;
   - un classement : « vrai défaut », « donnée de la base `laborex_perf` » ou « environnement ».
   Ajouter aussi les tests qui échouent chez toi alors qu'ils passent dans le cahier.
3. Pour chaque vrai défaut : d'abord un test qui échoue, puis la correction, selon les règles de `CLAUDE.md`, sur une
   branche à part. Ne jamais pousser sur `dev`, ne jamais fusionner.

## Ton rôle : contre-vérifier

La stratégie de test est décrite dans `docs/notices/STRATEGIE_TESTS.md` (branche `claude/new-session-xm8ptu`).
Claude Code produit : exploration, tests, corrections. Toi, tu vérifies de ton côté :

- couverture des menus et des fonctionnalités ;
- tests critiques rejoués ;
- chaque défaut annoncé confirmé ou contesté, avec la preuve ;
- API et journaux de Payara contrôlés indépendamment ;
- vérifications des tests Playwright auditées : un test qui ne vérifie pas le résultat en base, à l'écran et sur les
  documents est à signaler ;
- effets des corrections et régressions contre-vérifiés.

Pour chaque opération, contrôler selon le cas :

- le stock du produit, avant et après ;
- les mouvements créés (stock, caisse, recette, règlement), un seul par opération ;
- la cohérence du suivi des mouvements ;
- le solde du client ;
- les parts des organismes.

Le résultat est un rapport d'audit dans `qa/reports`, avec les défauts classés en critique, majeur ou mineur, et pour
chacun : confirmé ou suspecté, les étapes pour reproduire, la capture et les journaux.

## Défauts suspectés à confirmer ou contester (vague 1 du 05/11)

Mise à jour du 06/11 : le cas 1, le cas 2 et le lot Q2.5 sont maintenant **dans l'intégration** (donc sur domain2) ;
les reproduire directement sur domain2. L'annulation de BL est aussi fusionnée. Dire « confirmé » (avec la preuve)
ou « contesté ».

| Branche | Défaut suspecté |
|---|---|
| `PRES-/vigorous-northcutt-ec550e` (cas 1, ligne au comptant) | Deux organismes, RO plafonné par vente et RC à 20 % : la part de RC calculée vaut 0, et le ticket n'imprime qu'une ligne « Taux 70 % ». |
| `PRES-/quirky-shtern-c8f3ea` (cas 2, prix de référence) | Vente avec un taux mémorisé différent du taux du compte et un prix de référence sur un produit : le premier calcul donne une part de l'organisme de 1 820, les suivants 524, pour le même total de 4 020 (1 vente sur 40, test de non-régression à 7/8). |
| `PRES-/quizzical-solomon-415068` (Q2.5, base par organisme) | (a) un seul P.REF imprimé par ligne alors que chaque organisme a sa référence ; (b) taux en float, 1 F d'écart possible sur une grosse ligne ; (c) `vente_reglement.montant_attentu` et `mvttransaction.montantRegle` gardent la part client non arrondie (2 144 pour un net de 2 145). |
| `PRES-/annulation-bl-lots` (annulation de BL) | Corrigé, à contre-vérifier : les lots d'un BL rendu en entier comptaient encore à la ressaisie sous le même numéro. |
