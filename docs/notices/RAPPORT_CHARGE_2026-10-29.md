# Essai de charge d'une officine — 29 octobre 2026

> Question posée : à partir de quand Prestige ralentit-il ou plante-t-il, pour une pharmacie qui fait jusqu'à
> 1 200 ventes par jour sur 15 postes ? Qu'en est-il des sauvegardes, devenues lourdes, et des plantages de Payara ?
> **Aucune correction n'a été faite** : ce rapport sert à choisir les corrections. Chaque point est marqué **prouvé**
> (reproduit, avec la trace du serveur) ou **hypothèse**.

## 1. En bref

**La charge normale ne fait pas tomber Prestige.** À 15 postes simultanés (9 caisses, 2 postes de recherche, 2 de
commande, 1 d'états, 1 de facturation), le serveur passe **1 500 à 1 700 ventes à l'heure**. C'est l'équivalent de la
journée de 1 200 ventes en 45 minutes. Une vente se termine en 1,9 à 2,2 s, contre 1,5 s avec une seule caisse, et la
mémoire Java reste sous 1 Go.

Les plantages et erreurs viennent de **quatre défauts précis**, classés par gravité :

| Rang | Défaut | Ce que voit l'utilisateur | Quand | Preuve |
|---|---|---|---|---|
| 1 | **Payara ne traite que 5 requêtes à la fois** (réglage par défaut du `http-thread-pool`) | tout le monde attend dès que des états lourds tournent | suggestion, Ticket Z long, récap 3 mois | prouvé (réglage lu sur domain1 et domain2) ; effet mesuré au § 3.3 |
| 2 | **Deux caisses vendent le même article au même moment** : conflit de version du stock, sans nouvel essai | « Erreur du serveur 500 » ou « Echec de validation de la vente » ; la vente reste à refaire | environ 1 vente sur 150 à 300, à 8–15 postes | prouvé, reproduit 4 fois (un par essai) |
| 3 | **Première vente du jour sur deux caisses en même temps** : la ligne de numérotation du jour est créée deux fois | « server-side failure with status code 500 » à l'ajout du premier article | chaque matin à l'ouverture | prouvé, reproduit 1 fois |
| 4 | **Scan perdu sous charge** : le code et Entrée arrivent avant la réponse de la recherche produit | l'article n'est pas ajouté, la caissière doit rescanner | à partir de 15 postes, ou pendant un état lourd | prouvé par capture ; mécanisme à confirmer |

Les **saturations de mémoire** relevées dans les journaux de domain1 (35 `OutOfMemoryError`) n'ont **pas** été
reproduites : ni la charge à 15 postes, ni le Ticket Z sur 12 mois d'appaul ne dépassent 1 Go de mémoire Java (§ 3.5).
Leur cause reste inconnue ; le § 6 propose de quoi la capturer la prochaine fois.

**Sauvegardes** : la sauvegarde complète ne gêne pas les caisses (aucun ralentissement mesurable pendant 107 s de
sauvegarde d'appaul). Le problème est ailleurs. **L'objectif « une heure de perte au plus » n'est pas tenu** : le
journal binaire de MariaDB est désactivé, donc entre la sauvegarde du soir et celle de midi, une panne fait perdre
jusqu'à 14 heures de ventes. Voir § 5.

## 2. Méthode

- Script : `src/test/e2e/perf/charge-officine.js`. Chaque poste suit le vrai chemin de l'écran, avec son propre compte
  et sa propre caisse (`e2e-c01` à `e2e-c15`) :
  - **caisse** : 1 à 3 articles tapés par leur code CIP, puis Entrée ; montant reçu tapé ; « Terminer la vente » ;
    8 s de pause ;
  - **recherche** : un mot tapé dans la Fiche article, puis l'aperçu d'une ligne ;
  - **commande** : « NOUVELLE COMMANDE », puis 3 articles ;
  - **états** : Ticket Z du jour, ventes terminées du jour, récap des 7 derniers jours ;
  - **facturation** : factures du mois, puis « Créer » et recherche des bons du mois.
- Montée par paliers : 1, 2, 4, 8 puis 15 postes, 5 minutes chacun. Ensuite, trois essais de 10 minutes à 15 postes :
  avec 3 suggestions lourdes en même temps, avec une sauvegarde complète, puis sur appaul.
- Toutes les 5 s : mémoire Java (`jstat`), connexions et requêtes en cours de MariaDB, attentes de verrou,
  interblocages, processeur du poste de test.
- **Bases** : copies de mesure `laborex_perf` (7 Go) et `appaul_perf` (15,5 Go), dans un second MariaDB (port 3307),
  avec les envois coupés. **L'impression du ticket est bloquée** dans le navigateur. Aucune base d'origine n'a été
  écrite.
- **Serveur** : Payara `domain2`, 4 Go de mémoire Java, comme `domain1`. Pendant l'essai, `domain1` et `domain3` ont été
  arrêtés, avec l'accord de l'utilisateur, pour libérer la mémoire du poste.
- **Limite** : les 15 navigateurs tournent sur la même machine que le serveur (16 cœurs, 23,6 Go). Le processeur du
  poste a atteint 60 à 88 %. Une vraie officine a 15 postes séparés : les temps mesurés ici sont donc **pessimistes**.

## 3. Mesures

### 3.1 Montée en charge (laborex_perf)

| Postes | Ventes en 5 min | Ventes / heure | Ajout d'article (médiane / 90 %) | Vente terminée (médiane / 90 %) | Erreurs | Mémoire Java max |
|---|---|---|---|---|---|---|
| 1 | 20 | 230 | 568 / 681 ms | 1 514 / 2 916 ms | 0 | 706 Mo |
| 2 | 38 | 442 | 549 / 673 ms | 1 520 / 1 654 ms | 0 | 707 Mo |
| 4 | 56 | 654 | 629 / 801 ms | 1 602 / 1 817 ms | 0 | 710 Mo |
| 8 | 87 | 984 | 659 / 839 ms | 1 689 / 2 020 ms | 1 vente refusée (conflit de stock) | 702 Mo |
| 15 | 153 | **1 728** | 782 / 977 ms | **1 921 / 2 158 ms** | 0 | 716 Mo |

Autres gestes à 15 postes (médiane) :
- recherche dans la Fiche article : 643 ms ;
- article ajouté à une commande : 1,9 s ;
- Ticket Z du jour : 2,2 s ;
- ventes terminées du jour : 2,4 s ;
- récap sur 7 jours : 2,3 s ;
- factures du mois : 2,3 s.

Pendant tout l'essai, MariaDB n'a jamais eu plus de 9 connexions ouvertes ni plus de 3 requêtes en cours.

### 3.2 Sauvegarde complète pendant la charge (15 postes)

| Base | Sauvegarde (`mysqldump --single-transaction`, comme `SAUVEGARDE_COMPRESSION.bat`) | Vente terminée avant / pendant / après |
|---|---|---|
| laborex_perf | 40 s, 2,3 Go de SQL | médiane 1,88 s sur l'essai (1,92 s sans sauvegarde) ; 1 conflit de stock, 2 scans perdus |
| appaul_perf | 107 s, 5,8 Go de SQL | 2,16 s / **2,07 s** / 2,00 s |

**Prouvé : la sauvegarde complète ne ralentit pas la caisse.** `--single-transaction` lit une image figée de la
base, sans verrou. La sauvegarde de midi peut donc rester à midi.

### 3.3 Trois suggestions lourdes pendant la charge (15 postes + 3)

Trois postes lancent chacun une suggestion par quantités vendues sur 30 jours, pendant que les 15 autres
travaillent :
- chaque suggestion a pris **573 s**, contre 401 s seule (rapport du 28/10) ;
- les gestes des 15 postes ont ralenti de 20 à 30 % : vente terminée 2,2 s au lieu de 1,9 s, Ticket Z du jour
  2,7 s au lieu de 2,2 s ;
- 2 caisses ont perdu un scan (défaut 4) et une vente a été refusée pour conflit de stock (défaut 2). Après le scan
  perdu, mon script tapait le code suivant à la suite de l'ancien et le poste est resté bloqué : ce défaut du script
  est corrigé, et les erreurs qui en découlent ne sont pas comptées.

Avec 3 suggestions, 3 des 5 fils de Payara sont occupés pendant 10 minutes. Les 15 postes se partagent alors les 2
fils restants. Avec 5 états lourds en même temps, aucun fil ne reste libre : toutes les caisses attendent jusqu'à la
fin d'un état. C'est le mécanisme le plus probable des « plantages » vus en officine. **Hypothèse** pour le cas à
5 états : non reproduit ici.

### 3.4 appaul_perf, 15 postes

| | Résultat |
|---|---|
| Ventes | 263 en 10 min (1 524 / h) |
| Ajout d'article / vente terminée (médiane) | 864 ms / 2 050 ms |
| Connexion (médiane / max) | 6,1 s / **16 s** (premier chargement de 935 scripts par poste, en même temps sur 15 postes) |
| Incidents | 1 première vente du jour refusée (« Duplicate entry '20261029' », défaut 3), 1 vente refusée pour conflit de stock (défaut 2), 1 scan perdu (défaut 4), 2 interblocages à la connexion simultanée (§ 4.6). Les 25 autres erreurs relevées viennent du poste resté bloqué derrière le message d'erreur du défaut 3 : mon script ne fermait pas ce message (corrigé). |

### 3.5 Ticket Z sur une longue période (appaul_perf)

Hypothèse de départ : les piles des `OutOfMemoryError` de domain1 passent par `CaisseRessource.fetchTicketZ`, et le
Ticket Z charge en mémoire toutes les transactions de la période avec leurs règlements
(`GenerateTicketServiceImpl.dataPerUser`). Script : `src/test/e2e/perf/charge-ticketz-memoire.js` (par l'écran,
mémoire relevée toutes les 2 s).

| Période | Temps | Réponse | Mémoire Java avant → pic | Ramasse-miettes complets |
|---|---|---|---|---|
| 1 mois | 7,4 s | 5 Ko | 574 → 590 Mo | 0 |
| 3 mois | 5,3 s | 6 Ko | 488 → 630 Mo | 0 |
| 6 mois | 4,8 s | 8 Ko | 484 → 640 Mo | 0 |
| 12 mois | 9,1 s | 10 Ko | 646 → **973 Mo** | 0 |

**L'hypothèse est écartée** pour un Ticket Z seul : 12 mois d'appaul coûtent environ 330 Mo, loin des 4 Go. Les
saturations du 25 octobre (29 en une soirée) ont donc une autre cause, ou plusieurs états lourds simultanés. On ne
peut pas trancher sans image de la mémoire au moment de l'erreur (§ 6).

## 4. Causes, solutions, risques, tests

### 4.1 Payara : 5 requêtes à la fois *(prouvé pour le réglage)*

- **Constat** : `configs.config.server-config.thread-pools.thread-pool.http-thread-pool` a `max-thread-pool-size=5`
  et `min-thread-pool-size=5`. Ce sont les valeurs par défaut, car `domain.xml` ne les fixe pas. Le réglage est le même
  sur domain1 et domain2. Toute requête au-delà de 5 attend dans une file de 4 096 places.
- **Solution** : porter le pool à 32 fils, au même niveau que le pool de connexions à la base (`max-pool-size=32`) :
  `asadmin set configs.config.server-config.thread-pools.thread-pool.http-thread-pool.max-thread-pool-size=32`
  (et `min-thread-pool-size=8`). Une seconde mesure isole les états lourds : borner leur durée (§ 4.2) ou les
  passer dans un pool de fils séparé.
- **Risque** : faible. Plus de requêtes en parallèle veut dire plus de mémoire au même moment ; à surveiller avec
  `jstat` pendant un essai à 15 postes et 5 états lourds.
- **Test** : `charge-officine.js` avec `PALIERS=15 LOURDS=5`, avant et après. Critère : la médiane de « vente
  terminée » reste sous 3 s et aucune caisse ne dépasse 10 s.

### 4.2 États lourds sans limite de période ni de durée

- **Constat** : le Ticket Z, le récap et la suggestion acceptent n'importe quelle période. La suggestion sur 3 mois
  dure 13 minutes sur laborex (rapport du 28/10, cause 1). Le Ticket Z charge toute la période en mémoire, mais
  sans excès mesuré (§ 3.5).
  Le pool de connexions n'a pas de délai de requête (`statement-timeout-in-seconds=-1`), et MariaDB non plus
  (`max_statement_time=0`).
- **Solution** :
  1. corriger la suggestion (rapport du 28/10, cause 1) ;
  2. limiter la période des états les plus lourds (par exemple 3 mois), avec un message clair.
- **Risque** : faible pour la limite ; moyen pour la suggestion (voir le rapport du 28/10).
- **Test** : `charge-officine.js` avec `LOURDS=3` avant et après : durée des suggestions et temps des caisses.

### 4.3 Conflit de stock entre deux caisses *(prouvé)*

- **Constat** : `TFamilleStock` porte une version (`@Version`, `TFamilleStock.java:71`). À la clôture,
  `MvtProduitServiceImpl.updateVenteStock` (l. 298) met à jour le stock de chaque article. Si une autre caisse vient
  de vendre le même article, la mise à jour échoue (`OptimisticLockException`) et toute la vente est annulée. Deux
  messages possibles : erreur 500, ou « Echec de validation de la vente » quand l'erreur surgit dans `findStock`
  (l. 141-151). Celle-ci avale l'exception et renvoie `null`, ce qui provoque une `NullPointerException` à la l. 325.
- **Fréquence mesurée** : environ 1 vente sur 150 à 300 à 8–15 caisses, sur 126 à 175 articles tirés au hasard. Dans une
  vraie officine, les articles les plus vendus (paracétamol, etc.) sont concentrés : le risque est plus élevé.
- **Solution** : décrémenter le stock par une mise à jour atomique (`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE
  = int_NUMBER_AVAILABLE - :q ... WHERE ...`). Autre option : relire puis rejouer automatiquement la clôture une ou
  deux fois en cas de conflit de version.
- **Risque** : moyen. Il faut garder les mouvements (`hmvtproduit`), le déconditionnement et le contrôle du stock
  disponible.
- **Test** : un test d'écran à deux postes qui terminent au même instant deux ventes du même article. Aujourd'hui,
  l'un des deux échoue ; après la correction, les deux ventes passent et le stock baisse de la somme des deux.

### 4.4 Première vente du jour sur deux caisses *(prouvé)*

- **Constat** : `SalesServiceImpl.buildRefTmp` (vers la l. 5041) crée la ligne `Reference` du jour (clé `yyyyMMdd`) à
  la première vente. Deux caisses qui ouvrent leur première vente au même instant la créent toutes les deux : la
  seconde échoue sur « Duplicate entry '20261029' for key 'PRIMARY' ». Le message « server-side failure with status
  code 500 » s'affiche à l'ajout du premier article.
- **Solution** : `INSERT ... ON DUPLICATE KEY UPDATE` (ou `INSERT IGNORE`), puis relecture de la ligne. Autre
  option : créer la ligne du jour à l'avance, par la tâche de nuit.
- **Risque** : faible.
- **Test** : un test d'écran à deux postes qui ajoutent leur premier article au même instant, sur une copie sans
  vente du jour.

### 4.5 Scan perdu sous charge *(constat prouvé, mécanisme à confirmer)*

- **Constat** : la capture montre le code CIP dans le champ et le produit trouvé dans la liste, mais aucun ajout.
  La touche Entrée est arrivée avant la réponse de la recherche. Ce cas apparaît à 15 postes et pendant les états
  lourds : 1 à 2 fois par essai de 10 minutes.
- **Solution** : quand Entrée arrive pendant une recherche en cours, la garder en attente et ajouter le produit dès
  la réponse, si la recherche ne trouve qu'un seul produit.
- **Test** : un test d'écran qui tape le code et Entrée sans délai pendant que le serveur est ralenti.

### 4.6 Petits points

- **Interblocage à la connexion simultanée** : deux `INSERT INTO t_session_utilisateur` au même instant
  (`ix_session_user`). MariaDB annule l'un des deux. Sans effet visible ici, mais à rejouer automatiquement.
- **Connexion à 15 postes en même temps** : jusqu'à 16 s, pour 935 fichiers JavaScript chargés par poste (rapport du
  28/10, cause 5).

## 5. Sauvegardes

### 5.1 Ce qui existe

`D:\SAUVEGARDE_JOURNALIERE\SAUVEGARDE_COMPRESSION.bat` fait :
1. `mysqldump --single-transaction --skip-lock-tables --routines laborex_v1_db` dans un fichier `.sql` ;
2. `rar a -m3` du fichier ;
3. suppression du `.sql`.

| Constat | Conséquence |
|---|---|
| Journal binaire désactivé (`log_bin=0`) | rien entre deux sauvegardes : jusqu'à 14 h de ventes perdues (du soir à midi) ; **objectif « 1 heure » non tenu** |
| `.sql` complet écrit sur le disque avant compression | il faut 2 à 6 Go de libre de plus, et le disque est lu et écrit deux fois |
| Pas de rotation | les `.rar` s'accumulent |
| Mot de passe `root` écrit en clair dans les `.bat` | toute personne qui lit le dossier obtient l'accès complet à la base |
| Sauvegarde sur le même disque que la base | une panne du disque emporte la base et ses sauvegardes |
| Aucun essai de restauration | on ne sait pas si une sauvegarde se recharge, ni en combien de temps |

### 5.2 Poids réel des bases

| Base | Total | Données | Index | SQL sauvegardé |
|---|---|---|---|---|
| appaul | 15,5 Go | 5,3 Go | 10,2 Go | 5,8 Go |
| zanzan | 9,9 Go | 2,9 Go | 7,1 Go | — |
| laborex_v1_db | 7,0 Go | 2,3 Go | 4,7 Go | 2,3 Go |

Les deux tiers de chaque base sont des index, que `mysqldump` ne sauvegarde pas : il les reconstruit au rechargement.
Le gros du volume, ce sont les ventes et leurs mouvements, qu'il faut garder :
- `t_preenregistrement`, `t_preenregistrement_detail`, `mvttransaction` et `hmvtproduit` pèsent 2 à 2,7 Go chacune
  sur appaul.

Tables de journal qui pèsent sans servir à la caisse :

| Base | Table | Poids | Lignes |
|---|---|---|---|
| laborex | `stock_snapshot` | **705 Mo** | 25 407 (28 Ko par ligne) |
| appaul | `t_snap_shop_daly_stat` | 319 Mo | 518 664 |
| appaul | `t_famille_history` | 286 Mo | 2,7 M |
| appaul | `t_snap_shop_daly_sortie_famille` | 209 Mo | 721 869 |
| zanzan | `t_event_log` | 175 Mo | 479 521 |
| appaul | `t_outboud_message` | 94 Mo | 387 092 |

### 5.3 Proposition (perte d'une heure au plus)

1. **Activer le journal binaire** (`log_bin`, `binlog_format=ROW`, `expire_logs_days=8`) et le copier **toutes les
   heures** sur un autre disque ou une clé USB, avec `mariadb-binlog --read-from-remote-server` ou une copie des
   fichiers fermés après `FLUSH BINARY LOGS`. Avec la sauvegarde de la nuit et ce journal, on peut tout rejouer jusqu'à
   la dernière heure copiée. **C'est la seule mesure qui tient l'objectif d'une heure.**
2. **Sauvegarde complète la nuit** (plus à midi : inutile avec le journal), compressée **à la volée** :
   `mariadb-dump --single-transaction --routines --triggers --events laborex_v1_db | zstd -T0 -10 >
   sauvegarde.sql.zst`. Pas de fichier intermédiaire. zstd compresse plus vite que RAR, avec un taux voisin sur du
   SQL.
3. **Rotation** : garder 7 sauvegardes de nuit, 4 de semaine et 12 de mois. Supprimer le reste par le même script.
4. **Copie hors de la machine** : un second disque, un NAS ou un dossier synchronisé.
5. **Mot de passe** : un compte MariaDB dédié aux sauvegardes (`SELECT, SHOW VIEW, TRIGGER, EVENT, LOCK TABLES,
   RELOAD, REPLICATION CLIENT`), dont le mot de passe est rangé dans un fichier d'options lisible par le seul compte de
   service (`--defaults-extra-file`). Plus aucun mot de passe dans les `.bat`.
6. **Purge des journaux** : `stock_snapshot`, `t_snap_shop_daly_*`, `t_event_log` et `t_outboud_message` au-delà de
   12 mois, après accord sur ce qu'il faut garder. Sur laborex, `stock_snapshot` seul représente 30 % du SQL
   sauvegardé.
7. **Essai de restauration mensuel** sur une copie, avec mesure de la durée.

Pour aller plus loin : `mariabackup` (sauvegarde physique, avec index) en complète le dimanche et en différentielle
chaque nuit. La restauration est plus rapide (pas de reconstruction des index), mais le volume est triple. Ce n'est
utile que si la restauration par `mysqldump` dépasse le temps d'arrêt accepté.

- **Risque** : faible. Le journal binaire ajoute 2 à 5 % d'écritures et quelques centaines de Mo par jour.
- **Test** : sur une copie, rejouer la sauvegarde de la nuit plus le journal jusqu'à une heure donnée. Comparer le
  nombre de ventes et le total du Ticket Z de la journée.

## 6. Éviter les plantages de Payara

Constats des journaux de domain1 (avant cet essai) :
- **35 `OutOfMemoryError: Java heap space`**, les 2 août, 3 septembre et 25 octobre (29 fois le 25). Quatre piles
  passent par `CaisseRessource.fetchTicketZ`, mais un Ticket Z de 12 mois ne sature pas la mémoire (§ 3.5) : la cause
  reste à établir ;
- **64 « Unable to acquire JDBC Connection »**, du 13 septembre au 25 octobre.

Réglages proposés, à appliquer sur le serveur de l'officine :

| Réglage | Aujourd'hui | Proposé | Pourquoi |
|---|---|---|---|
| `http-thread-pool` max | 5 | 32 | § 4.1 |
| `-Xmx` | 4 Go | 4 à 6 Go sur un serveur de 16 Go | garder 6 Go pour MariaDB et 4 Go pour Windows |
| `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=...` | absent | présent | savoir ce qui a rempli la mémoire |
| `-XX:+ExitOnOutOfMemoryError` + service Windows à redémarrage automatique | absent | présent | un serveur à moitié mort est pire qu'un redémarrage en 2 minutes |
| `-Xlog:gc*:file=gc.log:time:filecount=5,filesize=20m` | absent | présent | voir les pauses du ramasse-miettes |
| pool JDBC : `statement-timeout-in-seconds` | -1 (aucun) | 300 | une requête bloquée ne garde pas une connexion pour toujours |
| pool JDBC : `connection-leak-timeout-in-seconds` + `reclaim` | 0 / false | 120 / true | rendre les connexions oubliées |
| pool JDBC : `is-connection-validation-required` | false | true | après une coupure de MariaDB, ne pas distribuer de connexions mortes |
| MariaDB `innodb_buffer_pool_size` | 3,5 Go pour 4 bases (39 Go) | 6 à 8 Go sur un serveur dédié de 16 Go | les lectures disque dominent les mesures à froid |

Et dans le code : les défauts 2 à 4 ci-dessus, puis les causes 1 et 2 du rapport du 28/10 (suggestion, statistiques).

## 7. Rejouer l'essai

```powershell
# Copie de mesure (une seule fois), envois coupés, Prestige deploye dessus (voir RAPPORT_PERFORMANCES_2026-10-28.md, § 6)
$env:BASE='http://localhost:9080/prestige'; $env:DB_TEST='laborex_perf'; $env:E2E_BASE_LIBRE='1'
$env:MARIADB_OPTIONS='<fichier d''options hors du depot>'; $env:SERVEUR_PID='<processus Java de Payara>'
# Montee en charge
$env:PALIERS='1,2,4,8,15'; $env:DUREE_PALIER='300'; node src/test/e2e/perf/charge-officine.js
# 15 postes + 3 suggestions lourdes
$env:PALIERS='15'; $env:LOURDS='3'; $env:DUREE_PALIER='600'; node src/test/e2e/perf/charge-officine.js
# Ticket Z sur 1 a 12 mois, memoire du serveur
$env:DATE_REF='2026-10-27'; $env:MOIS='1,3,6,12'; node src/test/e2e/perf/charge-ticketz-memoire.js
```

L'essai écrit dans la copie (comptes `e2e-c01` à `e2e-c15`, caisses, ventes, commandes). La copie est rechargée
depuis l'original ou supprimée après l'essai.
