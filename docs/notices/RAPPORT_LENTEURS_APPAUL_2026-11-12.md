# Rapport — lenteurs chez appaul (journal de support du 12/11/2026)

**Pièces** : archive de journaux du 12/11 et journal de support `journal_support_20261112.xls`.
**Écrans signalés** : la fiche article et la balance vente caisse. D'autres écrans lents ressortent des journaux.
**Banc** : une copie locale de la base d'appaul (`appaul_perf`, 20 Go, données jusqu'au 27/10/2026), sur une instance
MariaDB à part (port 3307) et un Payara à part (domain4, port 11090). **Aucune écriture n'a été faite dans la base de
l'officine ni dans `laborex_v1_db`.**

## 1. Ce qu'il faut retenir

| Écran / route | Chez appaul (journal) | Copie locale, avant | Copie locale, après | Cause | État |
|---|---|---|---|---|---|
| `ca-all` (1 jour, applications mobile / ERP) | 7,97 s | 3,8 à 6,6 s | **0,02 s** | filtre `DATE(colonne)` : l'index de date n'est pas utilisé, 3 ans relus | **confirmé, corrigé** |
| `ws/ca-achats-ventes` (11 jours) | 8,1 s | 4,8 s | **0,45 s** | même cause, sur les ventes et sur les BL | **confirmé, corrigé** |
| « Détail sur l'article » | 10,5 s + 10,4 s | 0,1 à 0,2 s + 0,02 s | une seule demande | la fenêtre calculait la fiche deux fois (`produits/{id}`, puis `fiche?produitId=`) | double calcul **confirmé, corrigé** ; les 10 s **suspectées** (sauvegardes, § 3) |
| Liste des articles, touche Entrée | — | 2 recherches | **1 recherche** | Entrée lance la recherche, puis la pause de frappe la relance | **confirmé, corrigé** |
| Sauvegardes automatiques | 15 échecs de 23:05 à 01:05 ; requêtes de 10 à 52 s | — | une seule sauvegarde, sur le serveur, aux horaires choisis | chaque poste (Payara) lançait sa sauvegarde à hh:05 et marquait « interrompues » celles des autres | **confirmé, corrigé** |
| Balance vente caisse, 1 mois | (signalée lente) | 1,0 s seule ; **4,2 à 5,0 s** juste après le tableau de bord ; 10 à 13 s par l'écran | **0,98 s** juste après le tableau de bord ; par l'écran : 1,1 s avec 5 Go de mémoire tampon, 5 à 10 s avec 2 Go | le tableau de bord chassait les ventes du mois de la mémoire ; un mois de ventes occupe environ 3,7 Go de pages (clés aléatoires) | **confirmé, corrigé côté code** ; reste un **réglage du serveur** (§ 5) |
| Tableau de bord (`alertes`, `tuiles`) | 10,6 s et 7,1 s à 22:04 | alertes 1,2 à 4,6 s ; tuiles 0,4 à 2,8 s | **alertes 0,08 à 0,12 s ; tuiles 0,07 à 0,12 s** | « non vendus » relisait tout l'historique de chaque article ; ruptures calculées deux fois | **confirmé, corrigé** (§ 4 bis) |
| Cloche (compteur des avoirs), sur chaque poste | — | 0,4 à 2 s par passage | **3 à 4 ms** | MariaDB partait des utilisateurs et relisait toutes leurs ventes | **confirmé, corrigé** (§ 4 bis) |
| Connexion (`POST user/auth`) | > 5 s à 01:16 | rapide | — | en même temps que les sauvegardes en échec | **suspecté** |

Demande de l'utilisateur, traitée ici (§ 3) : « la sauvegarde doit se faire uniquement sur le serveur pas sur chaque
poste, je dois pouvoir definir les horaires plutot que chaque heure ».

## 2. Ce que montrent les pièces

- **Organisation** : chaque poste (SERVEUR, CAISSE11 à CAISSE44, DESKTOP-CEPK07B, SERVEURLENOVO) a **son propre
  Payara**, branché sur la base centrale du serveur.
- **Sauvegardes** : « Sauvegarde de la base en échec » 15 fois entre 23:05 et 01:05. Les requêtes de plus de 10 s (29
  entre 00:05 et 01:15, 14 entre 22:15 et 23:15) sont des sauvegardes : `SELECT /*!40001 SQL_NO_CACHE */ … FROM
  t_outboud_message`.
- **Fiche article** : à 00:50, `produit-search/produits/{id}` prend 10,5 s, puis `produit-search/fiche?produitId=`
  10,4 s pour le **même article**. Ces deux demandes se succèdent en pleine série de sauvegardes.
- **Tableau de bord** : 22:04, juste après le démarrage de 21:54 et pendant le contrôle de cohérence de 22:00.
- Les fichiers COMMANDE, FACTURATION, INVENTAIRE, REGLEMENT et STOCK de l'archive sont des contrôles de cohérence,
  sans rapport avec les lenteurs.
- Aucune colonne nominative (clients, ayants droit, ordonnances) n'a été lue.

## 3. Sauvegardes : une seule, sur le serveur, aux horaires choisis

**Défaut (confirmé par le code, puis par un test qui échoue)**

- Tous les Payara de l'officine avaient la sauvegarde automatique : **chaque poste** lançait un dump de la base centrale
  à hh:05, par le réseau.
- Le verrou « sauvegarde en cours » ne valait **que dans un Payara**.
- En démarrant, chaque poste passait à `INTERROMPUE` toutes les sauvegardes `EN_COURS`, y compris celles des autres
  postes.

Il en résulte jusqu'à 7 dumps simultanés de 20 Go, des échecs en chaîne, et des requêtes de 10 à 52 s pour tous les
écrans.

**Correction**

| | Avant | Après |
|---|---|---|
| Qui sauvegarde | chaque poste | **le serveur seul** : le poste dont la base est locale (localhost, 127.x, ::1, son nom ou une de ses adresses). Le paramètre `KEY_SAUVEGARDE_POSTE` permet de désigner un autre poste. |
| Quand | toutes les heures à hh:05 | **horaires au choix**, `KEY_SAUVEGARDE_HORAIRES` (ex. « 12:00, 20:00 » ; « 12h » et « 8h30 » sont acceptés ; minutes par pas de 5). Vide : toutes les heures à hh:05, comme avant. |
| Verrou | dans un Payara | **dans la base** (`GET_LOCK`, un par base) : « Sauvegarder maintenant » est refusé si une sauvegarde est en cours ailleurs |
| Sauvegarde d'un autre poste | marquée « interrompue » | laissée telle quelle |
| Contrôle de fraîcheur (alerte « pas de sauvegarde récente ») | par rapport à 2 h | par rapport au **dernier horaire prévu**, et sur le serveur seulement |

**Écran** : Support › Serveur, bloc Sauvegarde.
- Nouveaux champs : « Horaires » et « Poste serveur ». Un horaire impossible (12:07) est refusé dans la barre d'état,
  sans fenêtre.
- L'état affiche les horaires, la prochaine sauvegarde, « Ce poste : X », « serveur des sauvegardes » ou « poste
  client », et « Sauvegarde en cours sur un autre poste… ».
- Sur un poste client, « Sauvegarder maintenant » est grisé.

**À faire chez appaul** : saisir les horaires voulus sur le serveur. Si son Payara atteint la base par une adresse qui
n'est pas la sienne, renseigner « Poste serveur » = `SERVEUR`. Demander aussi les lignes de `t_sauvegarde` (statut,
message, durée, poste) : elles ne contiennent aucune donnée de patient.

**Lien avec la fiche lente : suspecté, non reproduit.** Cinq dumps simultanés sur la copie locale (SSD, sortie
vers nulle part) ralentissent peu les écrans. Chez appaul, les dumps des caisses passent par le réseau et écrivent sur
les disques des postes. Cela reste l'explication la plus probable des 10 s (fiche) et des 5 s (connexion), mais elle
n'est pas prouvée.

## 4. Autres corrections

**`ca-all`, `ca-comptant`, `ws/ca-achats-ventes`** (`ErpServiceImpl`) : `DATE(m.mvtdate) BETWEEN ?1 AND ?2` devient
`m.mvtdate BETWEEN ?1 AND ?2` (la colonne `mvtdate` est déjà une date). Pour `dt_UPDATED` et `dt_CREATED`, le filtre
devient `>= début AND < lendemain de la fin`. SQL : `ca-all` passe de 8,35 s + 0,9 s à 0,005 s + 0,009 s ;
`ca-achats-ventes` de 5,87 s à 0,43 s. Les résultats sont identiques (voir les tests).

**Fiche article** (`detailArticle.js`, `FamilleManager.js`) : « Détail sur l'article » reprend la fiche déjà reçue
par `produits/{id}` au lieu de la redemander par `fiche?produitId=` (même calcul, `buildProduitData`). Les autres
ouvertures de la fenêtre ne changent pas.

**Liste des articles** (`FamilleManager.js`) : la pause de frappe ne relance plus la recherche si les critères sont
exactement ceux de la dernière liste demandée. Chaque recherche recalcule 20 fiches.

## 4 bis. Tableau de bord, cloche et balance (suite du 12/11)

**Articles entrés non vendus** (`TableauBordServiceImpl`, carte Alertes et sa liste).
- Avant : pour chaque article entré dans la période, MariaDB cherchait une vente postérieure dans **tout son
  historique**. Cela faisait 638 000 lignes lues, et des ventes de 3 ans lues au hasard sur le disque : 2,7 à 6,4 s.
  Ces lectures chassaient aussi le reste de la mémoire tampon.
- Après : la dernière vente de chaque article est prise parmi les ventes **de la période** seulement (index de date).
- Le résultat est identique : l'entrée est toujours dans la période, donc une vente postérieure à l'entrée l'est aussi.
  Le test le vérifie contre la formule d'origine, sur 5 périodes et 2 857 lignes.

**Ruptures** : les tuiles et les alertes, demandées ensemble à l'ouverture et par « Actualiser », faisaient chacune le
même calcul (jusqu'à 2,4 s). Le second appel reprend désormais le résultat du premier s'il a moins de 20 s, ou l'attend
s'il est en cours (`CalculPartage`). Le cache d'une minute du tableau de bord existait déjà.

**Cloche** (`NotificationsCentreServiceImpl`, compteur des avoirs, relu sur chaque poste) : l'index (avoir, date) de
la migration V6.2.9 est imposé. Le compteur passe de 0,4 à 2 s à 3 ms, avec le même nombre. L'index n'est imposé que
s'il existe ; sinon, la requête d'origine s'applique.

**Balance vente caisse** : son code n'a pas changé. Ses trois requêtes (lignes, règlements, TVA) sont justes, avec des
plans normaux. Elle était lente pour deux raisons :
1. Le tableau de bord la chassait de la mémoire. C'est corrigé ci-dessus : sur la copie, la balance d'octobre reste à
   0,98 s juste après le tableau de bord (avant : 4,2 à 5,0 s).
2. **Un mois de ventes ne tient pas dans la mémoire tampon de MariaDB.** Les identifiants des ventes, des lignes, des
   mouvements et des règlements sont des UUID aléatoires : chaque vente d'un mois est sur une page différente. Un mois
   touche environ 235 000 pages, soit près de 3,7 Go, et la copie n'a que 2 Go de mémoire tampon.
   - Mesure par l'écran (connexion, « Actualiser » du tableau de bord, puis balance d'octobre) : 1,1 s avec 5 Go, 5 à
     10 s avec 2 Go.
   - Avec 5 Go, seule la toute première balance après un redémarrage de MariaDB lit le disque (8,8 s).

## 4 ter. Démarrage de Payara et fiche article (suite du 12/11)

**Démarrage de Payara** (`PilotageAgregatScheduler`).
- Constat : sur la copie d'appaul, le déploiement durait 299 à 310 s. L'étape « Agrégats du menu de pilotage » du
  pipeline de démarrage en prenait 4 min 11 à 4 min 40 (1 min sur le poste local).
- Cause : 48 photos des threads (`jstack`, toutes les 5 s pendant le déploiement) montrent tout ce temps dans
  `PilotageSuiviService.evolution`. Il s'agit du précalcul des courbes « À suivre » du 02/11 : six grandeurs, trois
  pas, quatre années, lues dans les ventes. Les agrégats mensuels eux-mêmes ne coûtent rien (aucun mois manquant).
  Le déploiement attendait la fin de ce calcul.
- Correction : les agrégats restent calculés avant l'ouverture. Les courbes, simple cache en mémoire, sont calculées
  en tâche de fond par l'exécuteur géré de Payara, ou sur place s'il manque ou refuse. Le traitement de nuit est
  inchangé.
- Ce pipeline ne tourne que sur le poste déclaré serveur : les autres postes ne le relancent pas.
- Mesure : le déploiement passe de 299 s à 28 s, et l'étape de 255 s à 0,012 s. Les courbes sont prêtes 244 s plus
  tard. L'onglet « À suivre » s'ouvre ensuite en 0,9 s.
- Rapprochement : le CA par semaine affiché est égal à la base sur les 46 semaines de 2026.

**Fiche article, monographie** (demande du 12/11 : « ne doit plus être lancée automatiquement »).
- Avant : la fiche Vidal n'était déjà demandée qu'au clic (31/10). Mais à l'ouverture du détail, le panneau affichait
  « Chargement… », dessinait la rangée des rubriques et recalculait deux fois la mise en page de toute la fenêtre.
- Après : à l'ouverture, seul le bouton « Afficher la monographie » apparaît. Les rubriques et la fiche n'arrivent
  qu'au clic.
- La petite demande d'état du service reste à l'ouverture, pour masquer la section quand le service est coupé
  (c'est le cas sur la copie d'appaul).
- « Modifier » ne contient pas de monographie.

**Ce qui prend vraiment du temps à l'ouverture de « Détail » et « Modifier »** (copie d'appaul, 3 articles) :

| Ouverture | Article très vendu | Articles au hasard |
|---|---|---|
| « Modifier » | 0,16 s | 0,13 et 0,14 s |
| « Détail » | **5,2 s**, dont 4,9 s pour `suivi-stock-vente/stat-vente-famille` | 0,3 et 0,4 s |

`stat-vente-famille` donne les quantités vendues par mois pour toutes les années. Pour un article très vendu, elle
relit toutes ses lignes de vente depuis l'origine, avec une lecture au hasard de chaque vente (UUID). Ce point n'est
pas corrigé (§ 5).

**Balance à froid en un seul passage** (prototype SQL, non intégré).
- Les chiffres sont identiques (24 lignes), mais il n'y a aucun gain : 11,7 s contre 11,6 s. Les trois requêtes ne
  relisent pas les mêmes pages : elles lisent des tables différentes (ventes et mouvements, lignes, règlements). Le
  coût est la première lecture de chaque page.
- En revanche, les trois requêtes actuelles lancées **en parallèle** donnent les mêmes chiffres en **5,2 et 5,3 s** à
  froid, au lieu de 11,5 et 11,6 s.

## 5. Ce qui reste (non corrigé, à décider)

1. **Mémoire de MariaDB chez appaul : réglage du serveur, à décider avec l'officine.** Il faut demander la mémoire du
   serveur et la valeur actuelle de `innodb_buffer_pool_size`. Pour que la balance d'un mois reste rapide, il faut au
   moins 4 à 5 Go, si le serveur a la mémoire nécessaire (par exemple 16 Go). Ce réglage se fait dans `my.ini` du
   serveur, hors du code.
2. **Balance à froid** (première ouverture après un redémarrage). Le passage unique n'apporte rien (§ 4 ter). Les
   trois requêtes en parallèle divisent le temps à froid par deux (11,6 à 5,2 s) : c'est à décider.
3. **« Détail sur l'article » d'un article très vendu** : 4,9 s pour la statistique de ventes par mois
   (`stat-vente-famille`). Il y a deux pistes : la charger à la demande, comme la monographie, ou ne lire que les
   années affichées. C'est à décider.
4. **Tableau de bord.**
   - La carte Valorisation (« dormants », 0,4 à 1,4 s) lit un index de 2,6 millions d'entrées. La réécriture avec
     `MAX` a été essayée : pas plus rapide, abandonnée.
   - Le contrôle de cohérence de 22:00 pourrait être décalé hors des heures d'ouverture.

## 6. Tests

Tous les tests d'écran ont été lancés un par un, sous le verrou `verrou-e2e`, sur domain4 (copie `appaul_perf`).
Chaque nouveau test a **d'abord échoué sur la version d'avant**.

| Test | Type | Avant | Après |
|---|---|---|---|
| `src/test/e2e/retours/test-detail-article-un-seul-calcul.js` | rapprochement + écran | 15/23 (2 demandes de fiche, 2 recherches) | **23/23** |
| `src/test/e2e/support/test-sauvegarde-serveur-horaires.js` | écran + bilan | 4/18 (sauvegarde de l'autre poste marquée « interrompue ») | **16/16** |
| `src/test/e2e/perf/test-erp-dates-indexees.js` | rapprochement + durée | 40/42 (durées 4,0 s et 4,4 s) | **42/42** |
| `HorairesSauvegardeTest` | cohérence (3 000 cas, graine 20261112) | classe absente | **5/5** |
| `PosteSauvegardeTest` | règle du poste serveur | classe absente | **3/3** |
| `src/test/e2e/perf/test-tableau-bord-balance-appaul.js` | rapprochement + écran + durée | 14/18 (alertes 4,6 s, tuiles 2,6 s, balance 10 à 11,5 s, cloche 390 ms) | **18/18 avec 5 Go** de mémoire tampon ; 17/18 avec 2 Go (balance 5 s au 2e passage, § 4 bis) |
| `CalculPartageTest` | cohérence (5 000 cas, graine 20261112) + 8 appels simultanés = 1 calcul | classe absente | **3/3** |
| `retours/test-cloche.js` (non-régression) | écran + rapprochement | — | **18/18** |
| `retours/test-tableau-bord.js` (non-régression) | écran + rapprochement | — | 32/35 : achats par grossiste et tiers payants vides sur le mois de novembre de la copie (ventes d'anciens essais seulement), routes non modifiées ; sa partie « non vendus » n'est pas atteinte, elle est couverte par le test ci-dessus |
| `ConservationTest`, `PoolMariaDbTest` | non-régression | 3/3, 3/3 | 3/3, 3/3 |
| `PilotageAgregatSchedulerDemarrageTest` | bilan du démarrage + règle « jamais de courbes perdues » (200 cas, graine 20261112) | 1/2 (le démarrage attend 1,5 s) | **2/2** |
| `src/test/e2e/perf/test-demarrage-courbes-fond.js` | bilan du démarrage (journal) + écran « À suivre » + rapprochement CA par semaine écran = base | 0/2 sur le journal de l'ancien démarrage (255 s, 299 s) | **9/9** |
| `src/test/e2e/retours/test-monographie-ouverture-a-la-demande.js` | écran (4 articles variés) + rapprochement fiche affichée = réponse + « Modifier » + service coupé | 28/32 (rubriques, « Chargement… », 2 recalculs à l'ouverture) | **32/32** |
| `retours/test-monographie-sur-demande.js`, `test-detail-article-un-seul-calcul.js` (non-régression) | écran | — | **6/6**, **23/23** |
| `retours/test-monographie.js` (non-régression) | écran + service simulé | — | 18/19 : la bordure jaune des interactions, retirée par les styles du 04/11 (2eccef161), est encore attendue par ce test ; c'est antérieur |
| `retours/test-detail-article-ergonomie.js` | écran | — | non joué : sa précondition (article au nom long avec un lot en stock) n'existe pas dans la copie d'appaul |

**Endroits où la donnée apparaît, et test de rapprochement qui les compare**

- **Fiche article** : `produits/{id}`, `fiche?produitId=` et les champs de la fenêtre (CIP, désignation, stock,
  dernière vente, dernière entrée, livraison, inventaire). Test : `test-detail-article-un-seul-calcul.js`, champ par
  champ (66 à 71 champs). Jeu de 9 articles variés : le plus vendu, 6 au hasard, un jamais vendu, un déconditionné.
  Quatre d'entre eux sont aussi vérifiés à l'écran.
- **CA** : `ca-all`, `ca-comptant`, `ca-achats-ventes`, comparés à la base calculée par la **formule d'origine**
  (`DATE(colonne) BETWEEN`). Champs : crédit, remise, TVA, espèces, ventes, achats. Test :
  `test-erp-dates-indexees.js`, sur 13 périodes : 8 tirées au hasard, un jour, onze jours, un 31/12, février, et une
  période sans vente. 331 jours comparés.
- **Réglages de sauvegarde** : écran, base et état renvoyé. Test : `test-sauvegarde-serveur-horaires.js` (horaires
  rangés et relus dans le champ, poste relu).

**Règles de calcul, et test de cohérence qui les vérifie** (`HorairesSauvegardeTest`, 3 000 cas)

- exactement une sauvegarde par horaire et par jour, aucune en dehors ;
- précédente ≤ instant < suivante, sans horaire entre les deux ;
- la sauvegarde attendue n'est jamais dans l'heure qui vient de s'écouler ;
- le texte rangé se relit à l'identique ;
- valeur vide ou illisible : toutes les heures à hh:05, comme avant.

**Traces attendues, et test de bilan** (`test-sauvegarde-serveur-horaires.js`)

- aucune sauvegarde n'est lancée depuis un poste client, ni par-dessus celle d'un autre poste ;
- la ligne `EN_COURS` de l'autre poste reste `EN_COURS` ;
- à la fin, les réglages sont remis comme avant et aucune ligne de sauvegarde ne reste.

Les deux autres tests ne font que lire.

## 7. Mesures brutes (copie locale, application, 3 passages)

| Route | Avant (ms) | Après (ms) |
|---|---|---|
| `ca-all` 27/10 | 6 357 / 6 499 / 6 369 | 23 / 23 / 21 |
| `ws/ca-achats-ventes` 17 au 27/10 | 6 530 / 4 836 / 4 842 | 446 / 453 / 441 |
| `produit-search/produits/{id}` | 185 / 144 / 133 | 135 / 98 / 82 |
| `produit-search/fiche?produitId=` | 30 / 30 / 24 | n'est plus appelée par la fenêtre |
| balance 27/10 | 670 / 315 / 190 | 335 / 168 / 165 |
| balance 01 au 27/10, après le tableau de bord | 5 521 / 12 014 / 11 797 | 12 805 / 7 985 / 7 897 (inchangé, § 5) |
| balance 01 au 27/10, seule | — | 1 001 / 975 / 987 |
| **Suite du 12/11** | avant | après |
| `tableau-bord/alertes` (Actualiser) | 1 175 / 4 571 ms | 82 / 84 / 88 / 89 ms |
| `tableau-bord/tuiles` (Actualiser) | 386 / 2 621 ms | 76 / 78 / 166 ms (premier appel après déploiement : 2 136 ms) |
| `notifications-centre/compteurs?cles=avoirs` | 390 ms (meilleur de 3) | 3 / 3 / 4 ms |
| balance 01 au 27/10, juste après alertes + tuiles (2 Go) | 5 034 / 4 192 ms | 976 / 978 ms |
| balance 01 au 29/10 par l'écran, après « Actualiser » (2 Go) | 11 536 / 10 104 ms | 9 702 / 5 088 ms |
| balance 01 au 29/10 par l'écran, après « Actualiser » (5 Go) | — | 8 782 (première lecture) / 1 085 ms ; puis 1 087 / 1 092 ms |
| déploiement de Prestige sur la copie d'appaul (domain4) | 299 s (étape du pilotage 255 s) | 28 s (étape 0,012 s) ; courbes prêtes en fond 244 s plus tard |
| onglet « À suivre » après le démarrage | — | 0,9 s |
| « Détail sur l'article », article très vendu / au hasard | 5,2 s / 0,3 à 0,4 s (inchangé) | inchangé : 4,9 s de `stat-vente-famille` (§ 5) |
| « Modifier » | 0,13 à 0,16 s | inchangé |
| balance 01 au 29/10 à froid, SQL seul : trois requêtes l'une après l'autre | 11 637 / 11 531 ms | passage unique 11 731 / 11 684 ms ; en parallèle 5 311 / 5 189 ms (non intégré) |
