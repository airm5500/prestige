# Environnement de déploiement/test temps réel et catalogue des tests

Ce document décrit **l'environnement complet** reconstitué pour déployer Prestige
sur un vrai serveur (Payara + MariaDB + données client) et le **tester en temps réel**,
ainsi que **tous les types de tests** utilisés pour éviter les régressions.
Objectif : pouvoir tout reproduire à l'identique dans une autre session.

> À jouer sur une base de **TEST** uniquement, jamais la production.

---

## 1. Vue d'ensemble

Trois briques :

1. **Build** — Maven + JDK, avec les jars maison (`lib/`) et un fallback iText.
2. **Serveur applicatif** — Payara 5 (le WAR y est déployé et re-déployé).
3. **Base de données** — MariaDB avec une vraie base client (`capitale`) pour des
   tests réalistes, plus des données de test caisse.

Le tout permet deux niveaux de test : **hors serveur** (unitaire, intégration SQL)
et **serveur vivant** (API, UI navigateur, concurrence, négatifs).

---

## 2. Composants et versions

| Composant | Version / chemin |
|---|---|
| OS | Linux (conteneur) |
| Java build | JDK 17 (`/usr/lib/jvm/java-17-openjdk-amd64`) — JDK 11 et 21 aussi présents |
| Java runtime Payara | JDK 11 |
| Payara | 5.2022.5 — `/opt/payara5` (HTTP 8080, admin 4848) |
| MariaDB | 10.11 (client `mariadb`, démon `mariadbd`) |
| Node | v22 (pour Playwright) |
| Navigateur E2E | Chromium préinstallé : `/opt/pw-browsers/chromium` |
| Connecteur JDBC | mysql-connector 5.1.49 (5.1.23 provoque un NPE avec MariaDB 10.11) |
| Base de test | `capitale` (client réel), aussi `laborex_v1_db`, `prestige_test` |

Détails d'infrastructure importants :

- `-Xmx2g` sur le domaine Payara (512m par défaut = OOM au déploiement).
- `lower_case_table_names=1` côté MariaDB (Linux est sensible à la casse ; certaines
  tables sont référencées en majuscules dans le code).
- Timer EJB en mode **Database** avec la table `EJB__TIMER__TBL` créée (voir §3.5) —
  sinon le composant `NotificationJob` (timer persistant) fait échouer le déploiement.

---

## 3. Reconstruction pas à pas

### 3.1 Build du WAR

```sh
cd /home/user/prestige
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
mvn clean package -DskipTests        # le "clean" est OBLIGATOIRE
# -> target/prestige.war
```

- Les jars maison sont dans `lib/` (TOOLKITS, MULTILANGUE) avec leurs `.pom`,
  installés au dépôt Maven local via `-DpomFile`.
- `mvn clean` est indispensable : sans lui, un `target/classes` obsolète crée des
  **versions Flyway en double** (erreur fatale au démarrage).

### 3.2 MariaDB

```sh
# démarrer le démon si besoin
mkdir -p /run/mysqld && chown mysql:mysql /run/mysqld
nohup mariadbd --user=mysql >/tmp/mariadb.log 2>&1 &
sleep 10
mariadb -N -e "SELECT 'db up';"
```

Configuration (fichier `/etc/mysql/mariadb.conf.d/99-prestige.cnf`) :
```
[mysqld]
lower_case_table_names=1
```

Bases attendues : `capitale` (données client réelles pour tester au plus près),
`laborex_v1_db`, `prestige_test`.

> Astuce **EntityNotFoundException** : à l'import d'un dump partiel, copier aussi
> les petites tables de référence (groupefournisseur, t_type_reglement, t_typedepot,
> t_compte_client, t_language, t_officine…). Les `@ManyToOne` eager échouent sinon
> avec des erreurs trompeuses ressemblant à des NPE.

### 3.3 Fichier de configuration jdom (REQUIS pour la page de login)

La page de connexion JSP appelle `jdom.LoadRessource()` qui lit un fichier XML sur
un chemin standard de poste. Sans lui, `/security/index.jsp` renvoie **500**.

```sh
mkdir -p /opt/CONF/LABOREX/CONF
# fichier minimal : APP_NAME, APP_VERSION et les clés attendues, sinon NPE
cat > /opt/CONF/LABOREX/CONF/config_laborex_v1.xml <<'XML'
<?xml version="1.0" encoding="UTF-8"?>
<racine>
  <config>
    <APP_NAME>PRESTIGE</APP_NAME>
    <APP_VERSION>TEST-E2E</APP_VERSION>
    <!-- ... les autres cles lues par LoadRessource, valeur "test" par defaut ... -->
  </config>
</racine>
XML
```

Chemins recherchés par le toolkit (un seul suffit) : `/home/prestige2/…`,
`/opt/CONF/LABOREX/CONF/…`, `/root/CONF/LABOREX/CONF/…`, etc.

### 3.4 Payara

```sh
/opt/payara5/bin/asadmin start-domain domain1
# pool JDBC vers MariaDB (base capitale) : jdbc/__laborex_pool -> laborex_pool
#   url = jdbc:mysql://localhost:3306/capitale?zeroDateTimeBehavior=convertToNull&characterEncoding=utf8
# -Xmx2g deja pose dans domain.xml
```

### 3.5 Timer EJB (sinon le déploiement échoue sur NotificationJob)

`NotificationJob` crée un timer **persistant** ; Payara exige une base de timer.

```sh
# 1) mode Database (defaut) et pool timer vers MariaDB
/opt/payara5/bin/asadmin set \
  "configs.config.server-config.ejb-container.ejb-timer-service.ejb-timer-service=Database"
/opt/payara5/bin/asadmin set \
  "resources.jdbc-resource.jdbc/__TimerPool.pool-name=laborex_pool"

# 2) creer la table de timers (DDL fourni par Payara)
mariadb capitale < /opt/payara5/glassfish/lib/install/databases/ejbtimer_mysql.sql

/opt/payara5/bin/asadmin restart-domain domain1
```

### 3.6 Déploiement / redéploiement

```sh
# premier deploiement
/opt/payara5/bin/asadmin deploy   --name prestige /home/user/prestige/target/prestige.war
# mises a jour suivantes
/opt/payara5/bin/asadmin redeploy --name prestige /home/user/prestige/target/prestige.war
# smoke test
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/prestige/security/index.jsp   # 200 attendu
```

> **Cache navigateur** : les fichiers JS (ex. `VenteCtr.js`) sont statiques et mis
> en cache. Après un redéploiement, faire **Ctrl+Shift+R** dans le navigateur, sinon
> l'ancien JS continue de s'exécuter. Vérif : en console (F12),
> `testextjs.app.getController('VenteCtr').controlerVendableAvantModif` doit être une
> fonction (et non `undefined`).

---

## 4. Jeu de données de test (caisse)

```sh
# 4.1 Compte operateur avec mot de passe connu (hash MD5)
mariadb capitale -e "UPDATE t_user SET str_PASSWORD=MD5('e2etest') \
  WHERE lg_USER_ID='14111218823703825750';"
# login applicatif : KGA3 / e2etest  (POST /api/v1/user/auth)

# 4.2 Ouvrir une caisse (necessaire pour valider une vente)
mariadb capitale -e "INSERT IGNORE INTO t_resume_caisse \
  (ld_CAISSE_ID,lg_USER_ID,int_SOLDE_MATIN,int_SOLDE_SOIR,dt_DAY,dt_CREATED,dt_UPDATED,str_STATUT) \
  VALUES ('E2ECAISSE','14111218823703825750',0,0,CURDATE(),NOW(),NOW(),'is_Using');"

# 4.3 Produit DETAIL de test + sa boite parente
#   detail : 8835833D = lg_FAMILLE_ID 050404522400544
#   boite  : lg_FAMILLE_ID 15812143745224612844 (int_NUMBERDETAIL = contenance)
# rendre le detail trouvable par la recherche caisse (sinon total=0)
mariadb capitale -e "INSERT IGNORE INTO t_famille_grossiste \
  (lg_FAMILLE_GROSSISTE_ID,lg_FAMILLE_ID,lg_GROSSISTE_ID,str_CODE_ARTICLE,dt_CREATED,dt_UPDATED,str_STATUT) \
  SELECT 'E2E-FG-DET','050404522400544',g.lg_GROSSISTE_ID,'999999',NOW(),NOW(),'enable' \
  FROM t_grossiste g LIMIT 1;"

# 4.4 Poser un scenario : contenance, stock detail, stock boite
mariadb capitale -e "UPDATE t_famille SET int_NUMBERDETAIL=10 WHERE lg_FAMILLE_ID='15812143745224612844'; \
  UPDATE t_famille_stock SET int_NUMBER_AVAILABLE=4,int_NUMBER=4 WHERE lg_FAMILLE_ID='050404522400544' AND lg_EMPLACEMENT_ID='1'; \
  UPDATE t_famille_stock SET int_NUMBER_AVAILABLE=1,int_NUMBER=1 WHERE lg_FAMILLE_ID='15812143745224612844';"
```

Paramètres utiles (`t_parameters`) : `FORCER_STOCK_VENTE` (0/1),
`KEY_VALORISATION_SOURCE` (JSON/TABLE), `KEY_VALORISATION_JOURNALIERE`,
`KEY_VALORISATION_ECRITURE_JSON`, `KEY_HEURE_ENVOI_SMS_RECAP_ACTIVITE`.

> **Toujours nettoyer** les données de test après (ventes créées, stocks remis,
> mot de passe restauré, `int_NUMBERDETAIL` remis, lignes E2E-*). Voir §8.

---

## 5. Catalogue des tests (anti-régression)

### 5.1 Tests unitaires (JUnit 5) — logique pure, sans serveur
Cœur métier extrait en méthodes statiques testables.

```sh
mvn test
```
Exemples : `DeconditionnementCalculTest` (calcul des boîtes, équivalence
exhaustive avec l'ancienne boucle), `LigneBorneJourneeTest` (fiche 204),
`RetentionReleveJournalierTest`, `ReserveHistoriqueValeursTest`.
**Quand** : à chaque changement de code. **Force** : rapide, déterministe.

### 5.2 Tests d'intégration SQL (Flyway + comportement réel de la base)
Ce qu'aucun compilateur ne vérifie : le SQL sur un vrai MariaDB.

```sh
mariadb prestige_test < src/main/resources/db/migration/V6.9.1__*.sql
mariadb -t < src/test/resources/valorisation/02_upsert_valorisation_tva.sql
# ...
```
**Quand** : migrations, requêtes, upserts, purge, idempotence.

### 5.3 Tests E2E API (serveur vivant, mêmes endpoints que l'écran)
Authentification réelle puis appel des endpoints métier via `curl`.

```sh
curl -s -c cj.txt -X POST http://localhost:8080/prestige/api/v1/user/auth \
  -H "Content-Type: application/json" -d '{"login":"KGA3","password":"e2etest"}'
curl -s -b cj.txt "http://localhost:8080/prestige/api/v1/vente/stock-vendable/050404522400544"
```
**Quand** : valider un flux métier de bout en bout côté serveur, plus vite qu'en UI.

### 5.4 Tests E2E UI navigateur (Playwright + Chromium)
Pilotage de l'écran ExtJS comme une caissière (vraies frappes, vrais clics).

```sh
npm install playwright-core
node src/test/e2e/ui-caisse-deconditionnement.js
node src/test/e2e/ui-suivi-mvt-article.js
node src/test/e2e/ui-clavier-caisse-detail.js   # frappes clavier reelles + clics dialogues
```
**Quand** : correctifs front (JS), popups, comportement d'écran. **Seul moyen** de
tester le JavaScript réellement exécuté.

### 5.5 Tests négatifs / validation des entrées
Saisies invalides envoyées aux endpoints : le serveur doit **refuser proprement**,
jamais planter ni créer de donnée incohérente.

```sh
BASE_HOST=http://localhost:8080/prestige LOGIN=KGA3 PASSWORD=e2etest DB=capitale \
FAM=050404522400544 USER_ID=14111218823703825750 \
bash src/test/e2e/tests-negatifs-validation-entrees.sh
```
Cas : quantité vide/0/négative, non numérique, JSON cassé, montants incohérents,
ids inexistants. Verdicts : PROPRE / REFUS_DEGRADE / HORS_ROUTAGE / PLANTAGE(échec).

### 5.6 Tests de concurrence
Deux (ou N) requêtes **en parallèle** sur la même ressource (dernière boîte).

```sh
BASE=http://localhost:8080/prestige LOGIN=KGA3 PASSWORD=e2etest DB=capitale \
DETAIL_ID=050404522400544 PARENT_ID=15812143745224612844 USER_ID=14111218823703825750 \
QTE=60 TOURS=5 bash src/test/e2e/concurrence-derniere-boite.sh
```
Vérifie : jamais de stock négatif, jamais deux clôtures. Révèle les défauts que les
tests séquentiels ne voient pas (ici : protégé par le verrou optimiste `@Version`).

---

## 6. Autres types de tests possibles (non encore automatisés)

- **Golden master / comparaison avant-après** : déployer l'ancien WAR puis le
  nouveau sur la même base, appeler les mêmes endpoints, **diff des réponses JSON**.
  La preuve de non-régression la plus large sur un service partagé.
- **Tests de charge** : montée en parallélisme sur un endpoint (recherche,
  valorisation, clôture) avec mesure des percentiles p50/p95/p99. Déjà fait
  ponctuellement (480 ventes simulées pendant un relevé : 0 lock, max 147 ms).
- **Fuzzing des imports de fichiers** : réponse grossiste / inventaire — CSV
  tronqués, colonnes manquantes, quantités non numériques, encodages, `.xlsx`
  déguisé en `.xls`. Transforme un défaut ponctuel en test permanent.
- **Tests de migration/restauration** : rejouer toute la chaîne Flyway sur une
  **copie de base client d'ancienne version** ; vérifier idempotence de la reprise.
- **Rejeu de scénarios réels (données client)** : injecter un cas exact remonté du
  terrain (ex. le « 204 ») et vérifier le résultat. Excellent pour les régressions.
- **Revue de sécurité basique** : injections SQL dans les paramètres de recherche
  (requêtes concaténées repérées dans le code legacy), endpoints accessibles sans
  session, données sensibles dans les logs.
- **Tests de propriété (property-based)** : générer des milliers d'entrées et
  vérifier un invariant (ex. `stock >= 0` après toute séquence de ventes/décon).

Limites connues (non testables ici) : matériel (afficheur, imprimante tickets,
douchette — contournés par l'API), échanges réels avec les serveurs grossistes
(pharmaML), latences réseau multi-postes réelles (la concurrence est simulée sur
une seule instance).

---

## 7. Pièges connus / dépannage

| Symptôme | Cause | Remède |
|---|---|---|
| Déploiement échoue « Persistent timers are not supported » | Timer service en mémoire | §3.5 : mode Database + table `EJB__TIMER__TBL` |
| Déploiement échoue « Initialization failed for Singleton NotificationJob » | Base de timer absente | §3.5 |
| `/security/index.jsp` renvoie 500 (NPE `jdom.racine`) | Fichier de config manquant | §3.3 |
| Flyway « duplicate version » au démarrage | `target/classes` obsolète | `mvn clean package` |
| Le correctif JS « ne marche pas » après déploiement | Cache navigateur | Ctrl+Shift+R ; vérifier une fonction en console |
| Recherche caisse renvoie `total:0` pour le produit | Pas de ligne `t_famille_grossiste` | §4.3 |
| Réponses servlet vides / NPE trompeurs | Table de référence manquante ou session HTTP expirée | copier les tables de réf ; ré-authentifier |
| NPE `buildCollationMapping` | mysql-connector 5.1.23 vs MariaDB 10.11 | connector 5.1.49 |
| OOM / crash Payara au déploiement | `-Xmx512m` | `-Xmx2g` dans domain.xml |
| MariaDB « Can't connect … mysqld.sock » | démon arrêté (inactivité) | relancer `mariadbd` (§3.2) |

---

## 8. Nettoyage après tests (impératif)

```sh
# supprimer les ventes de test du jour sur le produit detail, remettre les stocks,
# restaurer le mot de passe et la contenance, retirer les lignes E2E-*
mariadb capitale <<'SQL'
DELETE d FROM t_preenregistrement_detail d
  JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID=d.lg_PREENREGISTREMENT_ID
  WHERE d.lg_FAMILLE_ID='050404522400544' AND p.dt_CREATED>=CURDATE();
DELETE FROM hmvtproduit WHERE lg_FAMILLE_ID IN ('050404522400544','15812143745224612844') AND (mvtdate=CURDATE() OR uuid LIKE 'E2E-%');
DELETE FROM t_famille_grossiste WHERE lg_FAMILLE_GROSSISTE_ID='E2E-FG-DET';
DELETE FROM t_resume_caisse WHERE ld_CAISSE_ID='E2ECAISSE';
UPDATE t_famille SET int_NUMBERDETAIL=100 WHERE lg_FAMILLE_ID='15812143745224612844';
UPDATE t_famille_stock SET int_NUMBER_AVAILABLE=77 WHERE lg_FAMILLE_ID='050404522400544';
UPDATE t_famille_stock SET int_NUMBER_AVAILABLE=2  WHERE lg_FAMILLE_ID='15812143745224612844';
UPDATE t_user SET str_PASSWORD='<hash_initial>' WHERE lg_USER_ID='14111218823703825750';
SQL
```

---

## 9. Ordre recommandé dans une nouvelle session

1. `mvn clean package -DskipTests` (build).
2. `mvn test` (unitaires — barrière rapide avant tout déploiement).
3. Démarrer MariaDB, poser la config jdom, créer la table timer.
4. Démarrer Payara, déployer le WAR, smoke test HTTP 200.
5. Poser le jeu de données de test (§4).
6. Lancer les E2E : API (5.3), UI (5.4), négatifs (5.5), concurrence (5.6).
7. **Nettoyer** la base (§8).

Automatiser les étapes 1-3 dans un hook `SessionStart` (`.claude/hooks/`) évite de
les refaire à la main à chaque session.


---

## Pièges d'environnement rencontrés sur la fiche article

Deux points bloquent les tests de l'écran **Gestion des Articles** sur une base
restaurée, sans qu'il s'agisse d'une régression applicative.

### La recherche ne remonte aucune ligne

La requête de la fiche article fait un **`INNER JOIN t_famille_grossiste`** :
un article sans lien grossiste est invisible dans la recherche, même s'il a du
stock. Sur un dump partiel, la table peut être remplie pour d'autres articles
que ceux de l'emplacement testé, et la recherche renvoie alors `total: 0`.

```sql
-- combien d'articles sont réellement recherchables pour l'emplacement 1 ?
SELECT COUNT(DISTINCT t.lg_FAMILLE_ID)
FROM t_famille t
INNER JOIN t_famille_stock fs ON t.lg_FAMILLE_ID = fs.lg_FAMILLE_ID
INNER JOIN t_famille_grossiste fg ON t.lg_FAMILLE_ID = fg.lg_FAMILLE_ID
WHERE t.str_STATUT = 'enable' AND fs.lg_EMPLACEMENT_ID = '1';
```

Si le compte est à 0, créer les liens manquants (base de TEST uniquement).

### La section « Ventes réalisées » reste vide

`getListeTSnapshotFamillesell` n'utilise **pas** le pool JDBC de Payara mais la
connexion héritée `jconnexion` / `JdbConnexion`, qui construit son URL à partir
du fichier de configuration jdom. Avec une configuration minimale remplie de
valeurs `test`, la connexion échoue (`CommunicationsException`) et le service
renvoie une liste vide, sans erreur visible côté écran.

Les balises XML à renseigner dans `/opt/CONF/LABOREX/CONF/config_laborex_v1.xml`
sont `host`, `name`, `user`, `password`, `port` (et non les noms de champs Java
`ars_database_*`) :

```xml
<host>localhost:3306</host>
<name>capitale</name>
<user>prestige</user>
<password>prestige</password>
<port>3306</port>
<database_type>mysql</database_type>
```

Le compte doit pouvoir se connecter **en TCP** : `root` est en authentification
par socket Unix et échoue ici. Reprendre l'utilisateur du pool Payara
(`asadmin get "resources.jdbc-connection-pool.laborex_pool.property.*"`).
Redémarrer le domaine après modification : la configuration est lue au démarrage.

La requête des statistiques exige en outre, sur les ventes de test :
`b_IS_CANCEL = 0`, `int_PRICE > 0`, `lg_TYPE_VENTE_ID <> '5'`,
`int_QUANTITY > 0` et `str_STATUT = 'is_Closed'`.

### Tests de la refonte

| Script | Couverture |
|---|---|
| `ui-fiche-article-refonte.js` | Grille (colonnes, menu « ... », filtres) et fiche détail (courbes, sections conservées) — 30 contrôles |
| `smoke-ecrans.js` | Ouverture des principaux écrans sans erreur JavaScript — 7 contrôles |


---

## Tests de montée en charge

`charge-fiche-article.js` simule N utilisateurs simultanés, chacun avec sa **propre
session applicative** (comme autant de postes), qui enchaînent le parcours réel de
la fiche article : recherche d'articles puis aperçu d'un article. Aucune dépendance :
le script n'utilise que le module `http` de Node.

```sh
cd src/test/e2e
node charge-fiche-article.js 25 30      # 25 utilisateurs pendant 30 secondes
LOGIN=XXX PASSWORD=yyy node charge-fiche-article.js 50 20
```

Il affiche, par endpoint, le nombre d'appels, la médiane, le p95 et le maximum, puis
le débit global et les erreurs.

### Relevé sur l'environnement de test

| Utilisateurs | Recherche (méd. / p95) | Aperçu (méd. / p95) | Débit | Erreurs |
|---|---|---|---|---|
| 10 | 92 ms / 138 ms | 40 ms / 73 ms | 141 req/s | 0 |
| 25 | 188 ms / 253 ms | 134 ms / 191 ms | 143 req/s | 0 |
| 50 | 295 ms / 463 ms | 243 ms / 413 ms | 148 req/s | 0 |

Lecture : le **débit plafonne vers 145 requêtes/seconde** et les temps de réponse
croissent proportionnellement au nombre d'utilisateurs — comportement d'une file
d'attente devant un serveur saturé, sans aucune erreur ni dégradation brutale.

> Ces chiffres valent pour ce conteneur de test et un catalogue réduit
> (~300 articles cherchables). Sur le matériel de production et un catalogue complet,
> seuls les ordres de grandeur et la forme de la courbe sont transposables, pas les
> valeurs absolues.

### Contention sur la connexion

Ouvrir **plusieurs sessions simultanées sur le même compte** provoque des
`MySQLTransactionRollbackException: Deadlock found` dans `AccountResource.auth` :
la connexion met à jour la même ligne de `t_user` (date de dernière connexion,
compteur, indicateur connecté) et écrit une ligne de log. Le banc échelonne donc
les connexions de 120 ms pour mesurer les écrans et non cette contention. Des
comptes distincts, cas normal en officine, ne sont pas concernés.
