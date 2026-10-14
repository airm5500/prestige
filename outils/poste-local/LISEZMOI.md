# Travailler sur le poste local (copie de travail laborex_v1_db)

Ce dossier sert à faire travailler Claude Code **sur le PC de l'officine**, contre la **copie de travail** de la base et
le Payara local. Les mesures et les tests portent alors sur les vraies données, au vrai volume.

> Uniquement sur une copie qu'on peut supprimer et recharger, jamais sur la base où se font les ventes.

## Pourquoi sur le PC, et pas depuis la session dans le cloud

Une session dans le cloud tourne dans un conteneur à distance, qui n'a aucun chemin réseau vers le PC, et c'est
voulu : ouvrir MariaDB sur Internet serait dangereux. Lancé **sur le PC** (ligne de commande, application de bureau
ou VS Code), Claude Code a directement :

- MariaDB par `mariadb.exe`, sans serveur MCP à installer ;
- les fichiers (journaux de Payara, `.jrxml`) par ses outils de lecture ;
- le build (Maven), le déploiement (`asadmin`) et les tests d'écran (Node + Playwright).

Pas besoin de serveur MCP. Les paquets `npx` prévus au départ ne conviennent pas : `server-postgres` ne sait pas
parler à MariaDB. Et chaque paquet téléchargé est du code tiers qui s'exécute sur le poste.

## Mise en place (une fois)

1. **Changer le mot de passe root de MariaDB.** L'ancien est passé dans une conversation.
2. Remplacer `MOT_DE_PASSE_A_CHOISIR` dans `preparer-base.sql`, sans enregistrer ce fichier modifié dans Git, puis :
   ```
   mariadb -u root -p < outils\poste-local\preparer-base.sql
   ```
   Cela crée l'utilisateur `claude_banc`. Il a tous les droits sur `laborex_v1_db` et rien d'autre (pas root), plus la
   lecture des mesures. Le script active aussi le journal des requêtes lentes (plus d'1 s).
3. Pour garder ce journal après un redémarrage de MariaDB, ajouter dans `my.ini`, section `[mysqld]` :
   ```
   performance_schema = ON
   slow_query_log = 1
   long_query_time = 1
   log_output = TABLE
   ```
4. Outils nécessaires : Git, JDK 11, Maven, Node 22, Claude Code. Chromium sera téléchargé par Playwright.
5. Cloner le dépôt, puis passer sur la branche de travail.
6. Copier `settings.local.json.exemple` vers `.claude\settings.local.json`. Ce fichier n'est jamais versionné. Il
   ouvre la lecture des journaux Payara et du dossier `REPORTS`.
7. **Ne pas** ouvrir `D:\CONF\LABOREX\CONF` : `config_laborex_v1.xml` contient des mots de passe. Si Claude en a
   besoin, il le demandera, et toute lecture hors des dossiers autorisés passe par ton accord.

## Avant chaque série de tests

- Faire une sauvegarde pour pouvoir revenir en arrière :
  `mariadb-dump -u root -p --single-transaction laborex_v1_db > laborex_avant.sql`
- Le déploiement de la branche **applique les migrations Flyway** à la copie. C'est voulu (ce sont celles qui iront
  en production), mais on ne revient en arrière qu'en rechargeant la sauvegarde.

## Ce qui reste à adapter lors de la première session locale

Les tests d'écran ont été écrits pour le banc Linux. Lors de la première session, Claude les rendra paramétrables :

- adresse de Prestige (`localhost:8080/prestige`) ;
- compte d'essai ;
- nom de la base (`DB_TEST`) ;
- identifiants MariaDB lus dans un fichier d'options local, jamais dans le dépôt ;
- scripts `sh` à remplacer par du Node.

Aucun mot de passe n'est écrit dans le dépôt.

## Données de santé

Tout ce que Claude lit passe par le modèle. Pour les lenteurs, il travaille sur les plans d'exécution (`EXPLAIN`),
les volumes, le journal des requêtes lentes et `performance_schema`. Il ne lit pas les colonnes nominatives (clients,
ayants droit, ordonnances), sauf si c'est nécessaire et que tu l'as accepté.
