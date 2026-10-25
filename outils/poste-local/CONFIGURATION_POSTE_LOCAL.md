# Prestige : configuration du poste local pour Claude Code

Aide-mémoire du 25/10/2026. Le détail est dans `outils/poste-local/LISEZMOI.md`.

## Principe

- Une session Claude dans le cloud n'a **aucun chemin réseau** vers le PC de l'officine, et c'est voulu : ouvrir
  MariaDB sur Internet serait dangereux.
- On lance donc **Claude Code sur le PC** : en ligne de commande, dans l'application de bureau ou dans VS Code.
- Il accède alors directement à :
  - MariaDB, par `mariadb.exe` ;
  - Payara et ses journaux ;
  - Maven, `asadmin`, et Node + Playwright pour les tests d'écran.
- Aucun serveur MCP n'est nécessaire.
- On travaille **uniquement sur la copie de travail `laborex_v1_db`**, jamais sur la base où se font les ventes.

## Mise en place (une seule fois)

- [ ] **1. Changer le mot de passe root de MariaDB.** L'ancien est passé dans une conversation.
- [ ] **2. Créer l'utilisateur `claude_banc`.**
  - Dans `outils\poste-local\preparer-base.sql`, remplacer `MOT_DE_PASSE_A_CHOISIR`, **sans enregistrer ce fichier
    modifié dans Git**.
  - Lancer :
    ```
    mariadb -u root -p < outils\poste-local\preparer-base.sql
    ```
  - Droits de `claude_banc` :
    - tous les droits sur `laborex_v1_db`, et rien d'autre (ce n'est pas root) ;
    - lecture des mesures : `performance_schema`, journal des requêtes lentes, requêtes en cours.
  - Le script active aussi le journal des requêtes de plus d'une seconde.
- [ ] **3. Garder ce journal après un redémarrage de MariaDB** : dans `my.ini`, section `[mysqld]`, ajouter :
  ```
  performance_schema = ON
  slow_query_log = 1
  long_query_time = 1
  log_output = TABLE
  ```
- [ ] **4. Installer les outils** : Git, JDK 11, Maven, Node 22, Claude Code. Playwright télécharge Chromium
  lui-même.
- [ ] **5. Cloner le dépôt** et passer sur la branche **`claude/new-session-xm8ptu`**.
- [ ] **6. Copier les réglages locaux.**
  - Copier `outils\poste-local\settings.local.json.exemple` vers **`.claude\settings.local.json`**. Ce fichier n'est
    jamais versionné.
  - Il ouvre la lecture de :
    - `D:\Payara_Server\glassfish\domains\domain1\logs` ;
    - `D:\CONF\LABOREX\REPORTS`.
  - Il fixe `DB_TEST=laborex_v1_db`.
- [ ] **7. Ne pas ouvrir `D:\CONF\LABOREX\CONF`.** Le fichier `config_laborex_v1.xml` contient des mots de passe.
  Toute lecture hors des dossiers autorisés passe par ton accord.

## Avant chaque série de tests

- **Sauvegarder la copie de travail :**
  ```
  mariadb-dump -u root -p --single-transaction laborex_v1_db > laborex_avant.sql
  ```
- **Migrations :** déployer la branche applique les migrations Flyway à la copie (jusqu'à V7.2.17 aujourd'hui). On ne
  revient en arrière qu'en rechargeant la sauvegarde.
- **Construire et déployer :**
  - construction (JDK 11) : `mvn -o -q -DskipTests package` ;
  - déploiement : `asadmin redeploy --name prestige --contextroot prestige target/prestige.war` ;
  - Prestige répond sur `http://localhost:8080/prestige`.
- **Tests d'écran :** les lancer un par un, jamais deux en même temps.

## À faire par Claude lors de la première session locale

Les tests d'écran ont été écrits pour le banc Linux. Il faut les rendre paramétrables :

- [ ] l'adresse de Prestige (`localhost:8080/prestige`) ;
- [ ] le compte d'essai ;
- [ ] le nom de la base (`DB_TEST`) ;
- [ ] les identifiants MariaDB, lus dans un fichier d'options local et jamais dans le dépôt ;
- [ ] les scripts `sh`, à remplacer par du Node.

## Sécurité et données de santé

- Aucun mot de passe ni jeton dans le dépôt, le JavaScript, les statuts ou les journaux.
- Ne jamais écrire dans une base de production.
- Pour les lenteurs, Claude travaille sur :
  - les plans d'exécution (`EXPLAIN`) ;
  - les volumes ;
  - le journal des requêtes lentes ;
  - `performance_schema`.
- Il ne lit pas les colonnes nominatives (clients, ayants droit, ordonnances) sans ton accord.

## Démarrage

Une fois les étapes 1 à 6 faites :

1. ouvrir Claude Code dans le dossier du dépôt sur le PC ;
2. lui demander de lire `outils/poste-local/LISEZMOI.md` et ce fichier, puis de reprendre.
