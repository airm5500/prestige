# Proposition d’application de réplication MariaDB

## 1. Objectif

Construire une application autonome permettant de **déployer, surveiller, réparer et auditer** la réplication de bases MariaDB, notamment les bases Prestige installées chez plusieurs clients.

L’application ne doit pas réimplémenter le protocole de réplication ligne par ligne. Elle doit piloter les fonctions natives de MariaDB : journal binaire, GTID, réplication asynchrone ou semi-synchrone, sauvegardes physiques et restauration. Cette approche est plus fiable qu’un programme qui relirait périodiquement les tables avec des `SELECT` et recopierait les lignes.

Le produit proposé porte provisoirement le nom **Prestige Replica Manager**.

## 2. Résultats attendus

L’application doit permettre de :

- répliquer une base complète, y compris les tables, données, vues, procédures, déclencheurs et événements ;
- initialiser automatiquement une nouvelle réplique depuis une sauvegarde cohérente ;
- reprendre après une coupure réseau sans recopier toute la base ;
- afficher le retard de réplication et l’état des threads d’entrée/sortie ;
- détecter les erreurs SQL, conflits GTID, manque d’espace et ruptures de connexion ;
- suspendre, reprendre et reconstruire une réplique ;
- effectuer un basculement planifié avec contrôles préalables ;
- proposer un basculement d’urgence, mais jamais sans règles explicites ;
- conserver un journal d’audit de toutes les actions administratives ;
- vérifier les sauvegardes par de vraies restaurations périodiques ;
- notifier les responsables par courriel, SMS ou WhatsApp ;
- gérer plusieurs pharmacies et plusieurs environnements sans mélanger leurs secrets.

## 3. Principe d’architecture

```text
                         ┌─────────────────────────────┐
                         │  Interface Web sécurisée    │
                         │  supervision et opérations  │
                         └──────────────┬──────────────┘
                                        │ HTTPS / API
                         ┌──────────────▼──────────────┐
                         │       Control Plane         │
                         │ topologie, règles, audit,   │
                         │ alertes et orchestrateur    │
                         └───────┬─────────────┬───────┘
                                 │ mTLS         │ mTLS
                    ┌────────────▼───┐      ┌──▼─────────────┐
                    │ Agent primaire │      │ Agent réplique │
                    │ commandes      │      │ commandes      │
                    │ autorisées     │      │ autorisées     │
                    └───────┬────────┘      └──────┬─────────┘
                            │ localhost SQL         │ localhost SQL
                    ┌───────▼────────┐      ┌──────▼─────────┐
                    │ MariaDB source │─────▶│ MariaDB replica│
                    │ binlog + GTID  │      │ relay log      │
                    └────────────────┘      └────────────────┘
                              │
                              └──────── sauvegardes chiffrées
                                        vers stockage distinct
```

### 3.1 Control Plane

Service central responsable de :

- l’inventaire des serveurs et des topologies ;
- la collecte des métriques ;
- l’exécution des workflows contrôlés ;
- la gestion des utilisateurs et approbations ;
- l’audit immuable ;
- les notifications ;
- le chiffrement des secrets.

Le Control Plane ne doit pas être nécessaire à la réplication quotidienne : si celui-ci tombe, la réplication native MariaDB continue.

### 3.2 Agent local

Un agent léger est installé près de chaque serveur MariaDB. Il ne reçoit pas de SQL arbitraire depuis l’interface. Il expose uniquement des opérations autorisées et validées :

- lire l’état MariaDB et les GTID ;
- démarrer ou arrêter les threads de réplication ;
- appliquer une configuration préparée ;
- lancer `mariadb-backup` ;
- vérifier et restaurer une sauvegarde dans un environnement isolé ;
- collecter les journaux et métriques ;
- exécuter un script de promotion signé.

Les communications Control Plane–Agent doivent utiliser TLS mutuel, des certificats courts et une liste blanche de commandes.

### 3.3 Moteur MariaDB natif

La réplication doit utiliser des identifiants globaux de transaction **GTID**, qui permettent à une réplique de reprendre depuis la transaction connue et facilitent le changement de source. Pour une réplique, la position recommandée est `MASTER_USE_GTID=slave_pos`, afin que des écritures locales accidentelles ne modifient pas le point de reprise attendu. Voir la [documentation officielle MariaDB sur GTID](https://mariadb.com/docs/server/ha-and-performance/standard-replication/gtid).

Le provisionnement initial doit être réalisé avec `mariadb-backup`, puis la réplique reprend à la position enregistrée par la sauvegarde. Voir la [procédure officielle de création d’une réplique avec mariadb-backup](https://mariadb.com/docs/server/server-usage/backup-and-restore/mariadb-backup/setting-up-a-replica-with-mariadb-backup).

## 4. Modes proposés

### Mode A — Continuité standard

- un primaire ;
- une réplique en lecture seule ;
- réplication asynchrone par GTID ;
- sauvegardes exécutées depuis la réplique ;
- basculement manuel assisté.

C’est le mode recommandé pour un premier déploiement Prestige.

### Mode B — Protection renforcée

- un primaire ;
- au moins deux répliques ;
- réplication semi-synchrone vers au moins une réplique proche ;
- réplique distante asynchrone ;
- basculement automatique soumis à des conditions strictes.

La réplication semi-synchrone attend l’accusé de réception d’au moins une réplique, avec un coût de latence à mesurer. Voir la [documentation officielle MariaDB](https://mariadb.com/docs/server/ha-and-performance/standard-replication/semisynchronous-replication).

### Mode C — Reprise après sinistre

- primaire sur le site d’exploitation ;
- réplique distante ;
- sauvegardes chiffrées et versionnées dans un troisième emplacement ;
- procédure de promotion documentée ;
- exercices de restauration planifiés.

La réplication seule n’est pas une sauvegarde : une suppression accidentelle est elle aussi répliquée. MariaDB le rappelle dans sa documentation sur la [réplication comme composant d’une stratégie de sauvegarde](https://mariadb.com/docs/server/server-usage/backup-and-restore/replication-as-a-backup-solution).

### Mode D — Base relais prête à l’usage et protégée des incidents logiques

Oui, une pharmacie peut disposer d’une base **relais**, préinstallée et régulièrement mise à jour, que l’on peut promouvoir lorsque la base A devient indisponible. Il faut toutefois distinguer deux objectifs incompatibles sur un seul flux :

- une réplique temps réel reproduit fidèlement les écritures légitimes **et** les suppressions, corruptions logiques ou transactions produites par un script malveillant ;
- une base qui ne reçoit que des échanges métier validés n’est plus une copie bit à bit de A : elle constitue une base de secours reconstruite par un canal sélectif.

Par conséquent, aucune option de réplication MariaDB ne peut déterminer avec certitude qu’une transaction SQL techniquement valide est malveillante. Un antivirus, une liste de tables ou un filtre de réplication ne suffit pas : un `UPDATE` destructeur sur une table autorisée ressemble à une opération normale dans le binlog. Les [filtres de réplication MariaDB](https://mariadb.com/docs/server/ha-and-performance/standard-replication/replication-filters) sélectionnent des bases ou tables ; ils ne comprennent pas l’intention métier et les DDL demandent des précautions particulières.

La protection recommandée utilise **trois couches indépendantes** :

```text
Base A active
   ├── flux 1 : réplique B chaude, rapide, en lecture seule
   │            (continuité après panne matérielle)
   ├── flux 2 : réplique C différée de 6 à 24 heures
   │            (fenêtre pour arrêter une erreur avant application)
   └── flux 3 : sauvegardes immuables + binlogs archivés hors site
                (restauration propre à l’instant précédant l’incident)

Prestige / canal d’échange contrôlé
   └── événements métier validés → base relais sanitaire D
       (produits, stocks, clients et ventes selon une liste blanche)
```

#### B : réplique chaude prête à l’usage

- MariaDB installé avec la même version, le même schéma et la même configuration utile que A ;
- réplication GTID continue et supervision du retard ;
- `read_only=1`, aucun compte applicatif autorisé à écrire et retrait du privilège `READ ONLY ADMIN` aux comptes ordinaires ;
- application Prestige installée mais arrêtée, ou configurée pour ne jamais écrire tant que B n’est pas officiellement promue ;
- test automatique quotidien de connexion, cohérence, espace disque et démarrage applicatif ;
- promotion seulement après **fencing** de A, contrôle antivirus/EDR, examen des dernières transactions et double validation.

B protège très bien contre une panne de serveur. Elle ne protège pas à elle seule contre un script malveillant déjà exécuté sur A, car sa transaction peut avoir été répliquée avant la détection.

#### C : réplique différée

MariaDB permet de retarder l’application des événements avec `MASTER_DELAY`. Une réplique différée conserve donc pendant quelques heures un état antérieur et laisse le temps de stopper son thread SQL lorsqu’une suppression ou modification massive est détectée. Voir la [documentation officielle sur la réplication différée](https://mariadb.com/docs/server/ha-and-performance/standard-replication/delayed-replication).

Cette réplique doit être isolée de B, ne jamais servir les utilisateurs au quotidien et déclencher une alerte avant que son délai ne soit consommé. Un délai n’est cependant pas une analyse de sécurité : si personne ne réagit, la transaction malveillante sera finalement appliquée.

#### D : relais sanitaire par échanges métier

Pour répondre littéralement à « juste échange », l’application doit publier une **outbox métier** plutôt que donner à D un accès direct au binlog complet. Chaque événement porte notamment :

- `event_id` unique et idempotent ;
- pharmacie, type d’objet, version et horodatage ;
- données minimales nécessaires, sans mot de passe ni secret ;
- identité du service producteur ;
- signature cryptographique et empreinte du contenu ;
- numéro de séquence permettant de détecter un trou ou un rejeu.

La passerelle de D refuse par défaut tout événement qui n’est pas dans une liste blanche de schémas et de règles métier. Elle impose les contraintes de volume, contrôle les références, met en quarantaine les anomalies et interdit le SQL libre, les DDL, les procédures, les comptes et les privilèges provenant de A. Les suppressions sont représentées par des événements explicites et sensibles, avec délai ou approbation, plutôt que par un `DELETE` répliqué aveuglément.

Ce relais sanitaire limite fortement la propagation d’un script SQL exécuté directement sur A. Il ne constitue toutefois pas une garantie absolue si l’application autorisée ou ses clés de signature sont compromises. Il faut donc séparer les identités et secrets de A et D, protéger les clés dans un coffre, imposer mTLS, faire tourner l’agent sous un compte système minimal et conserver les événements dans un journal append-only.

#### Procédure de bascule après suspicion de script malveillant

1. isoler A du réseau sans l’éteindre brutalement et préserver les preuves ;
2. bloquer la promotion automatique et arrêter l’application des relay logs de C ;
3. relever le dernier instant et le dernier GTID considérés sains ;
4. ne pas promouvoir B sans vérifier si la transaction suspecte y existe ;
5. restaurer une sauvegarde immuable dans une instance neuve et rejouer les binlogs **jusqu’avant** l’incident, ou repartir de C si son état est sain ;
6. exécuter les contrôles fonctionnels Prestige et comparer les totaux critiques ;
7. changer tous les secrets, comptes MariaDB, certificats et clés potentiellement exposés ;
8. clôturer l’accès à A par fencing, puis promouvoir la base validée ;
9. conserver A, ses journaux et leurs empreintes pour l’analyse forensique.

Le bon compromis pour chaque pharmacie est donc : **B prête à l’usage pour la disponibilité, C différée et des sauvegardes immuables pour revenir avant l’incident, D facultative pour les échanges métier filtrés**. La base relais ne doit jamais être présentée comme « immunisée » : sa propreté dépend de l’isolement, du délai, des validations et de la capacité à restaurer un état antérieur.

## 5. Fonctions de l’application

### Tableau de bord

Pour chaque topologie :

- état global : sain, dégradé, critique ou maintenance ;
- primaire courant et répliques ;
- retard en secondes et retard GTID ;
- état des threads IO et SQL ;
- dernière transaction reçue et appliquée ;
- débit d’événements ;
- espace disque, croissance du binlog et relay log ;
- dernière sauvegarde réussie ;
- dernière restauration vérifiée ;
- objectif estimé de perte de données (RPO) ;
- durée estimée de reprise (RTO).

### Assistant de création d’une réplique

1. tester la compatibilité des versions ;
2. vérifier `server_id`, binlog, format, GTID et rétention ;
3. créer un compte de réplication au privilège minimal ;
4. générer une sauvegarde physique cohérente ;
5. transférer et vérifier l’empreinte du fichier ;
6. restaurer sur la cible ;
7. configurer la source avec GTID ;
8. démarrer la réplication ;
9. attendre le rattrapage ;
10. vérifier les données ;
11. produire un rapport signé.

### Surveillance et alertes

Alertes configurables :

- source ou réplique inaccessible ;
- thread IO ou SQL arrêté ;
- retard supérieur à un seuil ;
- erreur de réplication ;
- disque inférieur au seuil de sécurité ;
- binlogs purgés avant consommation par une réplique ;
- écart de schéma ;
- sauvegarde absente ou trop ancienne ;
- restauration de contrôle en échec ;
- certificat ou secret proche de l’expiration.

Chaque alerte doit avoir un niveau, une date de début, un accusé de réception, un responsable et une date de résolution.

### Lecture et extraction des journaux binaires

L’application pourra analyser les fichiers **binlog** et **relay log** MariaDB, mais elle ne doit pas tenter de décoder elle-même leur format binaire. L’agent local appellera la version compatible de l’outil officiel `mariadb-binlog` dans un processus isolé, avec des limites de durée, de mémoire, de taille de sortie et une liste fermée d’options autorisées.

Deux sorties différentes doivent être proposées :

1. **Vue d’audit lisible** : transactions, GTID, horodatage, serveur d’origine, base, table, type d’opération et valeurs avant/après disponibles. Pour les événements au format `ROW`, l’agent utilisera notamment `--base64-output=DECODE-ROWS --verbose`; le résultat sert au diagnostic et n’est pas un script de restauration fidèle.
2. **Flux rejouable** : extraction conservant les événements `BINLOG` encodés avec le comportement `--base64-output=AUTO`. Seul ce flux peut être préparé pour une restauration à un instant précis, puis appliqué dans une instance isolée après validation.

L’extraction doit pouvoir être filtrée par :

- fichier et positions de début/fin ;
- date et heure de début/fin ;
- GTID, domaine ou serveur d’origine lorsque la version MariaDB le permet ;
- base de données ;
- table, après décodage et indexation des événements ;
- type d’événement (`INSERT`, `UPDATE`, `DELETE`, DDL, transaction) ;
- référence métier recherchée dans les valeurs décodées.

Le résultat dépend du format du journal :

- en `STATEMENT`, les instructions SQL originales sont généralement visibles ;
- en `ROW`, le journal contient les changements de lignes et non nécessairement la requête SQL originale ;
- en `MIXED`, les deux formes peuvent être présentes dans un même fichier.

Un binlog n’est pas une photographie complète de la base. Il contient les changements enregistrés pendant sa période de conservation. Pour reconstruire l’état d’une base à une date donnée, l’application doit restaurer une sauvegarde complète cohérente, puis rejouer les binlogs jusqu’à l’heure, la position ou le GTID choisi.

Les journaux chiffrés exigent un traitement particulier. L’application ne doit jamais copier les clés de chiffrement dans le Control Plane. Elle demandera au serveur MariaDB détenteur des clés de lire et transmettre les événements au moyen de `mariadb-binlog --read-from-remote-server`, sur une connexion TLS et avec un compte dédié au privilège minimal. Si le serveur et les clés historiques ne sont plus disponibles, un fichier binlog chiffré ne doit pas être présenté comme extractible.

Chaque extraction doit produire un manifeste contenant l’empreinte SHA-256 du fichier source, sa taille, la version de MariaDB et de `mariadb-binlog`, les paramètres utilisés, la plage extraite, l’opérateur, la date et l’empreinte du résultat. Les données extraites sont aussi sensibles que la base : elles doivent être chiffrées, soumises à une durée de conservation, masquées dans l’interface selon les droits et systématiquement auditées.

### Basculement planifié

Le workflow doit :

1. placer l’application en mode maintenance ou lecture seule ;
2. bloquer les nouvelles écritures sur l’ancien primaire ;
3. attendre que la cible ait appliqué tous les GTID ;
4. vérifier l’absence d’erreur et l’intégrité de la cible ;
5. promouvoir la cible ;
6. modifier la destination des connexions applicatives ;
7. vérifier une lecture et une écriture de contrôle ;
8. rattacher les autres répliques ;
9. conserver l’ancien primaire isolé jusqu’à validation ;
10. produire le rapport d’audit.

### Basculement automatique

Il doit être désactivé par défaut. Avant toute promotion automatique, l’application doit exclure une simple partition réseau et utiliser un mécanisme de **fencing** empêchant l’ancien primaire d’accepter encore des écritures. Sans fencing, deux serveurs peuvent devenir primaires et produire des historiques divergents.

Une intégration optionnelle à MariaDB MaxScale peut être envisagée : son moniteur sait surveiller une topologie, exécuter un switchover et effectuer un failover. Voir le [MariaDB Monitor de MaxScale](https://mariadb.com/docs/maxscale/reference/maxscale-monitors/mariadb-monitor).

## 6. Sauvegarde et restauration

La politique proposée est :

- une sauvegarde physique complète hebdomadaire ;
- une sauvegarde incrémentale quotidienne ;
- conservation des binlogs permettant une restauration à un instant précis ;
- chiffrement avant transfert ;
- stockage hors du serveur MariaDB et hors du Control Plane ;
- règle de rétention configurable ;
- empreinte SHA-256 de chaque artefact ;
- restauration automatique de contrôle dans une instance isolée ;
- test applicatif après restauration ;
- rapport indiquant la durée et le dernier GTID restauré.

Une sauvegarde n’est considérée comme valide qu’après une restauration réussie.

### 6.1 Récupération effective des données

Oui, l’application doit permettre de **récupérer les données**, et pas seulement de superviser leur réplication. Elle doit toutefois distinguer quatre opérations afin d’éviter qu’une récupération n’écrase accidentellement la production :

1. **Restauration complète** : reconstruire une instance à partir d’une sauvegarde complète, puis appliquer les sauvegardes incrémentales disponibles.
2. **Restauration à un instant précis (PITR)** : restaurer la dernière sauvegarde antérieure à l’incident, puis rejouer les binlogs jusqu’à la date, la position ou le GTID choisi, sans rejouer l’opération fautive.
3. **Récupération sélective** : restaurer d’abord la base dans une instance isolée, puis exporter une base, une table ou les lignes validées vers un fichier SQL ou CSV. La réinjection dans la production constitue une opération séparée, soumise à prévisualisation, sauvegarde préalable et approbation.
4. **Annulation ciblée par flashback** : lorsque les prérequis MariaDB sont satisfaits (`binlog_format=ROW` et images de lignes complètes), préparer l’inverse d’un ensemble d’opérations DML. Le flashback inverse les `INSERT`, `DELETE` et `UPDATE`, mais ne doit pas être présenté comme une solution générale pour les opérations DDL telles que `DROP`, `TRUNCATE` ou `ALTER`.

Exemples de besoins couverts :

- retrouver un client ou une vente supprimée par erreur ;
- reconstruire une table avant un import défectueux ;
- restaurer toute la base juste avant une corruption logique ;
- comparer les valeurs avant/après d’une transaction ;
- exporter les lignes récupérées sans modifier immédiatement la production.

Le workflow de récupération sélective doit être :

1. choisir le point de récupération et afficher les sauvegardes/binlogs nécessaires ;
2. vérifier que toute la chaîne est disponible et que ses empreintes sont valides ;
3. restaurer dans une instance temporaire isolée et non dans la production ;
4. exécuter les contrôles de cohérence et une recherche des données attendues ;
5. présenter un aperçu des lignes à récupérer, avec les dépendances et conflits de clés ;
6. produire un export signé et chiffré ;
7. demander une approbation distincte avant toute réinjection ;
8. sauvegarder la production juste avant la réinjection ;
9. appliquer la correction dans une transaction lorsque le volume le permet ;
10. vérifier le résultat fonctionnel et conserver un rapport d’audit.

L’application ne doit jamais promettre une récupération impossible. Une donnée ne peut être reconstruite que si elle existe dans une sauvegarde conservée ou si les informations nécessaires figurent encore dans les binlogs disponibles. Avec `binlog_row_image=MINIMAL`, certaines anciennes valeurs non modifiées peuvent manquer ; avec `binlog_row_image=FULL`, les événements `ROW` conservent toutes les colonnes avant et après, ce qui facilite l’audit et le flashback au prix d’un volume de journal supérieur. Une purge des binlogs, une sauvegarde corrompue, la perte d’une clé de chiffrement ou une rétention trop courte peut rendre une période irrécupérable.

La restauration à un instant précis doit être testée automatiquement. La sauvegarde fournit l’état initial et la position de départ, tandis que les binlogs fournissent les changements à rejouer jusqu’au point demandé. Le résultat doit toujours être ouvert dans une nouvelle instance, comparé à la production et validé avant toute promotion ou extraction.

### 6.2 Récupération InnoDB à partir des fichiers physiques

La majorité des bases Prestige utilisant InnoDB, l’application doit inventorier et préserver les fichiers physiques utiles. Elle ne doit toutefois jamais promettre qu’un fichier isolé est automatiquement restaurable.

| Fichier | Contenu utile | Peut-il suffire seul ? | Usage de récupération |
|---|---|---:|---|
| `table.ibd` | pages de données et index d’une table lorsque `innodb_file_per_table=ON` | Non, en général | import de tablespace avec définition exacte, version compatible et métadonnées nécessaires |
| `table.cfg` | métadonnées d’export du tablespace | Non | accompagne le `.ibd` pour un import transportable fiable |
| `table.frm` | ancienne définition de table sur les versions qui utilisent ce format | Non | aide à retrouver le schéma ; ne contient pas les lignes InnoDB |
| `ibdata1` | tablespace système InnoDB et, selon la configuration, données de tables, dictionnaire et undo | Non | récupération globale avec les autres fichiers cohérents ; pas un fichier à importer comme une table |
| `ib_logfile*` ou redo logs | journal redo circulaire de reprise après crash | Non | cohérence/crash recovery avec le datadir correspondant, pas restauration métier autonome |
| undo tablespaces | anciennes versions nécessaires aux transactions et rollbacks | Non | composant interne d’un ensemble cohérent, pas une sauvegarde exploitable seule |
| binlogs | événements de modification validés | Non sans état initial | PITR, réplication, audit et rejeu après restauration d’une sauvegarde |
| sauvegarde `mariadb-dump` | schéma et données sous forme logique | Oui si complète et cohérente | restauration flexible, généralement plus lente pour les gros volumes |
| sauvegarde `mariadb-backup` préparée | ensemble physique cohérent | Oui, avec configuration et clés requises | méthode principale pour restauration complète ou extraction contrôlée |

#### Cas d’un fichier `.ibd`

Un `.ibd` peut permettre de retrouver les données d’une table si toutes les conditions suivantes sont satisfaites :

- la table utilisait un tablespace fichier-par-table ;
- le fichier n’est pas tronqué ou irrémédiablement corrompu ;
- la définition `CREATE TABLE` est connue exactement, notamment colonnes, ordre, types, index et options ;
- la version et les paramètres InnoDB cibles sont compatibles ;
- les clés et plugins sont disponibles si le tablespace est chiffré ;
- l’import est effectué dans une instance de laboratoire, jamais directement dans la production ;
- le tablespace est importé selon la procédure `DISCARD TABLESPACE` / `IMPORT TABLESPACE` après préparation et contrôles.

Le couple `.ibd` + `.cfg` provenant d’un export cohérent est préférable. MariaDB indique que la restauration individuelle depuis `mariadb-backup` repose sur les tablespaces transportables et que la préparation avec `--prepare --export` crée les `.cfg`. Selon la version et le cas, un `.ibd` sans `.cfg` peut parfois être importé, mais l’application doit classer cette tentative comme **récupération forensique non garantie**.

#### Cas d’un fichier `.frm`

Un `.frm` ne contient pas les données InnoDB. Il ne permet donc pas de récupérer les clients, ventes ou stocks à lui seul. Sur les anciennes versions, il peut aider à reconstruire la définition de table nécessaire pour tenter l’import du `.ibd`. Un `.frm` orphelin peut aussi être incohérent avec le dictionnaire InnoDB ; il ne doit jamais être copié aveuglément dans une production.

#### Cas d’un datadir complet

Une copie cohérente de l’ensemble du répertoire de données peut contenir `ibdata1`, les `.ibd`, redo/undo, définitions, bases système et autres fichiers de moteurs. Elle a beaucoup plus de valeur qu’un fichier isolé. L’application doit :

1. monter une copie en lecture seule et calculer les empreintes ;
2. conserver l’original intact ;
3. identifier la version MariaDB, les options InnoDB, le jeu de caractères, les plugins et le chiffrement ;
4. dupliquer les fichiers dans un laboratoire isolé ;
5. tenter le démarrage avec la version compatible ;
6. n’utiliser `innodb_force_recovery` qu’en dernier recours, en commençant au niveau le plus faible ;
7. exporter logiquement tout ce qui reste lisible ;
8. reconstruire ensuite une base saine au lieu de remettre le datadir endommagé en production.

`innodb_force_recovery` ne répare pas la corruption : il sert uniquement à tenter une lecture et un export. Les niveaux élevés peuvent donner des résultats incomplets ou incohérents.

#### Interdiction de la copie brute à chaud

Copier manuellement `.ibd`, `ibdata1` et redo logs pendant que MariaDB écrit ne constitue pas une sauvegarde cohérente. L’application doit privilégier `mariadb-backup`, un snapshot de stockage correctement coordonné ou un arrêt propre. Toute récupération à partir de fichiers trouvés après incident est effectuée sur des copies forensiques, avec manifeste, empreintes et journal d’actions.

## 7. Contrôles de cohérence

Trois niveaux sont nécessaires :

1. **Topologie** : versions, variables, GTID, source attendue, état des threads.
2. **Schéma** : tables, colonnes, index, routines, vues, événements et déclencheurs.
3. **Données** : comptages et sommes de contrôle par plages de clés, exécutés progressivement pour ne pas bloquer l’exploitation.

Les écarts ne doivent jamais être corrigés automatiquement par des `UPDATE` générés sans validation. L’outil produit un diagnostic, une proposition et une sauvegarde préalable.

## 8. Sécurité

- aucun mot de passe en clair dans la base de l’application ou les journaux ;
- coffre de secrets ou chiffrement par clé maîtresse externe ;
- comptes MariaDB distincts pour supervision, sauvegarde et réplication ;
- moindre privilège ;
- TLS pour les connexions MariaDB distantes ;
- TLS mutuel entre agents et Control Plane ;
- MFA pour les administrateurs ;
- rôles lecture, exploitation, approbation et administration ;
- double approbation pour promotion, reconstruction et suppression ;
- masquage des données sensibles dans les diagnostics ;
- audit append-only exportable ;
- expiration et rotation des certificats et secrets.

## 9. Modèle de données du Control Plane

Tables principales :

```text
tenant                  client ou organisation
site                    emplacement physique ou cloud
database_node           serveur MariaDB inventorié
agent                   identité, version et état de l’agent local
replication_topology    groupe primaire/répliques
replication_channel     relation source → réplique
configuration_snapshot  configuration observée et dérives
node_metric             métriques horodatées
health_incident         incident et cycle de résolution
operation               workflow demandé
operation_step          étapes, sorties et statuts
approval                 approbations sensibles
backup                   artefact et métadonnées GTID
backup_artifact          fichier, empreinte, chiffrement et emplacement
binlog_archive           fichier/positions/GTID et période couverte
restore_test             résultat d’une restauration vérifiée
recovery_plan            point cible, sources, risques et approbations
recovered_dataset        export sélectif, manifeste et durée de conservation
secret_reference        référence vers le coffre, jamais le secret
certificate             identité mTLS, expiration et révocation
notification_rule       seuils et destinataires
audit_event              journal immuable
```

## 10. API proposée

```text
POST   /api/v1/nodes/register
GET    /api/v1/nodes/{id}/health
GET    /api/v1/topologies
POST   /api/v1/topologies
POST   /api/v1/topologies/{id}/replicas/provision
POST   /api/v1/channels/{id}/pause
POST   /api/v1/channels/{id}/resume
POST   /api/v1/channels/{id}/repair/plan
POST   /api/v1/topologies/{id}/switchover/plan
POST   /api/v1/operations/{id}/approve
POST   /api/v1/operations/{id}/execute
POST   /api/v1/backups
POST   /api/v1/backups/{id}/verify
GET    /api/v1/binlogs
POST   /api/v1/binlogs/extractions/plan
POST   /api/v1/recoveries/plan
POST   /api/v1/recoveries/{id}/restore-isolated
GET    /api/v1/recoveries/{id}/preview
POST   /api/v1/recoveries/{id}/export
POST   /api/v1/recoveries/{id}/reinject/plan
POST   /api/v1/comparisons
GET    /api/v1/incidents
GET    /api/v1/audit
```

Les opérations dangereuses suivent toujours le cycle : **planifier → analyser → approuver → exécuter → vérifier → auditer**.

## 11. Choix technologiques retenus

Pour éviter une architecture indécise, la recommandation finale est la suivante :

### Control Plane backend

- **Java 21 LTS avec Quarkus** ;
- MariaDB Connector/J pour les contrôles SQL, sans réimplémenter le protocole de réplication ;
- API REST OpenAPI, Server-Sent Events pour la progression et tâches asynchrones persistantes ;
- PostgreSQL dédié pour les métadonnées du Control Plane afin qu’une panne de la base MariaDB administrée ne rende pas la console incohérente ;
- migrations Flyway, file de travaux transactionnelle et verrous distribués ;
- intégration Vault en production et coffre local chiffré pour une installation autonome mono-site ;
- métriques Prometheus, journaux structurés et traces OpenTelemetry.

Java/Quarkus est retenu pour le moteur central parce que le produit concentre des workflows durables, des validations, des autorisations, des API et des intégrations. Il offre aussi une continuité de compétences avec Prestige. Il ne faut pas imposer une compilation native au démarrage : un paquet JVM est plus simple à diagnostiquer, et une image native pourra être ajoutée après validation de toutes les bibliothèques.

### Agent local et CLI

- **Go**, dans une version stable encore supportée, sous forme d’un binaire unique par système et architecture ;
- faible consommation ;
- service `systemd` sous Linux et service Windows natif ;
- exécution sous un utilisateur système dédié ;
- aucune interface publique autre que mTLS ;
- liste fermée de commandes ;
- mises à jour signées, vérification de l’empreinte et retour à la version précédente ;
- même code partagé avec une CLI d’administration utilisable lorsque l’interface centrale est indisponible.

Go est retenu pour l’agent parce qu’il facilite le déploiement d’un exécutable autonome sans JVM sur chaque serveur, tout en fournissant les primitives nécessaires pour TLS, processus, fichiers, flux et concurrence. L’agent orchestre les binaires MariaDB présents sur le serveur ; il ne remplace ni `mariadb-binlog` ni `mariadb-backup`.

### Interface Web

- **Vue 3, TypeScript strict, Vite et Composition API** ;
- Pinia pour l’état client, Vue Router et une bibliothèque de composants accessible dont le thème reste personnalisable ;
- tableau de bord temps réel ;
- assistant pas-à-pas ;
- affichage clair des conséquences avant chaque action ;
- responsive et installable en PWA pour la consultation ;
- opérations destructives réservées à un écran administrateur et jamais exécutables hors connexion.

Une application de bureau n’est pas nécessaire au départ. Une interface Web auto-hébergée permet l’accès depuis Linux, Windows et tablette sans multiplier les clients à maintenir. Si un emballage bureau devient nécessaire, il devra réutiliser cette interface plutôt que créer un second produit.

### Distribution

- Control Plane livré en conteneurs OCI avec un paquet `docker compose` ou Podman Compose documenté ;
- distribution autonome native contenant l’application, l’interface Web et une image d’exécution Java privée ; l’utilisateur ne doit pas installer Java séparément ;
- image d’exécution minimale produite avec `jlink`, puis installateurs produits avec `jpackage` pour chaque plateforme ;
- installateur Windows `MSI`/`EXE`, paquets Linux `DEB`/`RPM` et archive serveur portable ;
- le JRE embarqué est privé à l’application, n’est pas ajouté au `PATH` système et est mis à jour avec chaque version du produit ;
- mode haute disponibilité livré avec manifests Kubernetes/Helm seulement dans un second temps ;
- agents livrés en paquets DEB/RPM, archive Linux et installateur Windows ;
- registre local et bundle d’installation hors ligne pour les sites sans Internet ;
- toutes les images et tous les binaires signés, avec SBOM et sommes SHA-256 publiées.

`jpackage` doit être exécuté sur chaque système cible : le paquet Windows est construit et signé sous Windows, et les paquets Linux sous la distribution de construction prévue. Le pipeline ne doit pas supposer qu’un installateur natif unique fonctionne sur tous les systèmes.

### JRE embarqué, service système et démarrage par navigateur

Le Control Plane reste une application serveur Web, même lorsqu’il est installé sur un seul ordinateur. Le paquet autonome contient :

```text
prestige-replica-manager/
├── bin/                 lanceur et gestion du service
├── app/                 application Quarkus
├── runtime/             JRE privé construit avec jlink
├── web/                 interface Vue compilée
├── config/              configuration sans secret en clair
├── logs/                journaux avec rotation
└── licenses/            licences des composants distribués
```

Le lanceur utilise exclusivement `runtime/bin/java`. Il ne recherche pas `JAVA_HOME` et ne dépend pas d’un Java déjà installé sur la machine. Le paquet embarque un **runtime**, pas les outils de développement complets du JDK. Les modules Java nécessaires sont dérivés et testés pendant la construction ; les fournisseurs de services requis doivent être inclus explicitement.

Le **Control Plane doit obligatoirement fonctionner comme un service système**. Il ne doit jamais dépendre d’une session utilisateur, d’une fenêtre de terminal ou du navigateur. L’installateur enregistre le service, configure son démarrage automatique et le démarre à la fin de l’installation après validation de sa configuration.

#### Service Windows

- nom de service stable : `PrestigeReplicaManager` ;
- type de démarrage : automatique avec démarrage différé ;
- compte de service dédié, sans ouverture de session interactive et sans droit administrateur permanent ;
- répertoires d’application, données, configuration et journaux protégés par ACL ;
- actions de récupération : redémarrage après les premiers échecs, puis alerte sans boucle infinie ;
- arrêt propre lors d’un redémarrage Windows avec délai suffisant pour enregistrer l’état des opérations ;
- événements importants envoyés au journal applicatif et au journal d’événements Windows.

#### Service Linux

- unité `systemd` nommée `prestige-replica-manager.service` ;
- activation avec `systemctl enable --now prestige-replica-manager` ;
- utilisateur système sans shell et groupe dédiés ;
- dépendances déclarées envers le réseau et PostgreSQL local lorsqu’il est géré sur la même machine ;
- `Restart=on-failure`, délai progressif et limite de redémarrages ;
- répertoires protégés, limites de ressources et durcissement `systemd` ;
- arrêt propre par `SIGTERM`, avec persistance des workflows avant expiration du délai d’arrêt.

L’agent Go installé près de chaque MariaDB doit lui aussi fonctionner comme un service Windows ou `systemd`, avec une identité différente de celle du Control Plane. En conteneurs, la politique de redémarrage et les sondes de disponibilité/liveness remplissent ce rôle, sans lancer de processus de fond non supervisé dans le conteneur.

Le service expose au minimum :

```text
/health/live       processus actif
/health/ready      API, métadonnées et composants indispensables disponibles
/health/startup    initialisation et migrations terminées
```

Les tâches longues sont persistées dans PostgreSQL. Après un redémarrage du service, elles doivent reprendre à une étape sûre ou passer dans un état explicite `INTERVENTION_REQUISE` ; elles ne doivent jamais être considérées comme réussies uniquement parce que le processus a redémarré.

Trois modes d’ouverture sont prévus :

1. **Application locale** : le service est déjà démarré automatiquement avec le système. Le raccourci « Prestige Replica Manager » vérifie `/health/ready`, propose de redémarrer le service s’il est arrêté, puis ouvre le navigateur par défaut sur `https://127.0.0.1:8443`.
2. **Serveur du réseau** : le Control Plane démarre comme service sans ouvrir de navigateur ; les utilisateurs autorisés accèdent à `https://nom-du-serveur:8443` ou au nom DNS configuré.
3. **Conteneurs** : l’image contient déjà son runtime Java ; l’interface est accessible par navigateur derrière le reverse proxy TLS.

Fermer le navigateur ou fermer la session Windows/Linux ne doit jamais arrêter la réplication, les sauvegardes ou le Control Plane. L’interface n’est qu’un client de l’API. Le lanceur local doit pouvoir afficher l’état du service, ouvrir l’interface, demander un redémarrage autorisé et produire un dossier de diagnostic, sans exposer de commande SQL libre.

L’ouverture automatique du navigateur doit être facultative, désactivée sur un serveur sans interface graphique et ne se produire qu’après confirmation que le service écoute. En production, l’écoute distante exige TLS, authentification et configuration explicite ; la valeur par défaut du mode local reste liée à `127.0.0.1` afin de ne pas exposer accidentellement la console sur le réseau.

Le paquet autonome peut installer PostgreSQL localement en mode mono-site, avec un compte et un répertoire de données propres à l’application. Le mode entreprise doit aussi accepter un PostgreSQL externe ou hautement disponible. Dans les deux cas, le mécanisme de sauvegarde du Control Plane doit inclure les métadonnées PostgreSQL, la configuration, les certificats et les références de secrets.

## 12. Première version réaliste

### Lot 1 — Observation sans risque

- inventaire manuel des nœuds ;
- agent en lecture seule ;
- état de réplication ;
- métriques, alertes et audit ;
- aucune commande modifiant MariaDB.

### Lot 2 — Provisionnement et sauvegardes

- assistant de prérequis ;
- sauvegarde `mariadb-backup` ;
- transfert, restauration et création de réplique ;
- tests automatiques de restauration.

### Lot 3 — Opérations contrôlées

- pause et reprise ;
- reconstruction d’une réplique ;
- switchover avec approbation ;
- rapports d’opération.

### Lot 4 — Haute disponibilité

- proxy de connexion ;
- fencing ;
- failover automatique optionnel ;
- exercices de panne ;
- gestion multi-sites.

## 13. Critères d’acceptation du MVP

Le MVP est accepté lorsque :

- une base Prestige peut être répliquée sans arrêter durablement l’exploitation ;
- une coupure réseau de 30 minutes est rattrapée automatiquement ;
- un arrêt du thread SQL déclenche une alerte en moins de deux minutes ;
- le tableau de bord montre l’erreur exacte sans exposer le mot de passe ;
- une nouvelle réplique peut être reconstruite depuis une sauvegarde ;
- une restauration complète est vérifiée automatiquement ;
- un switchover planifié ne perd aucune transaction confirmée ;
- toutes les actions sont attribuées à un utilisateur et horodatées ;
- l’indisponibilité du Control Plane n’interrompt pas la réplication MariaDB ;
- un administrateur ne peut pas déclencher une promotion sans l’approbation requise.

## 14. Décisions nécessaires avant le développement

Les réponses suivantes déterminent l’architecture finale :

1. MariaDB est-il installé sur Linux, Windows, Docker ou plusieurs de ces environnements ?
2. Quelles versions MariaDB sont actuellement utilisées chez les clients ?
3. La cible est-elle une réplication locale, distante, cloud, ou les trois ?
4. Quel volume maximal et quel débit d’écriture faut-il supporter ?
5. Quel RPO est acceptable : zéro transaction, quelques secondes ou quelques minutes ?
6. Quel RTO est attendu : moins de 5 minutes, 30 minutes ou plusieurs heures ?
7. Le basculement doit-il être manuel, assisté ou automatique ?
8. Les clients disposent-ils d’une IP fixe, d’un VPN ou seulement d’une connexion Internet sortante ?
9. Faut-il centraliser plusieurs pharmacies dans une seule console SaaS ?
10. Où les sauvegardes doivent-elles être stockées et pendant combien de temps ?

## 15. Recommandation de démarrage

Commencer par le **Lot 1 en lecture seule**, sur une topologie pilote composée d’un primaire et d’une réplique. Ce lot permet de mesurer les versions, volumes, retards, coupures et contraintes réseau réelles sans autoriser l’application à modifier la production.

Après deux à quatre semaines d’observation, activer le provisionnement et les sauvegardes vérifiées. Le basculement automatique ne doit être envisagé qu’après plusieurs exercices de restauration et de switchover réussis.

## 16. Fonctions à ajouter pour couvrir le produit complet

La proposition précédente définit le cœur de réplication. Pour obtenir un produit réellement complet et autonome, les modules suivants doivent être inclus dans le périmètre final.

### 16.1 Inventaire et découverte

- découverte contrôlée des instances MariaDB sur des plages autorisées ;
- enregistrement manuel lorsque le scan réseau est interdit ;
- détection de la version, édition, système, architecture, moteur de stockage et taille ;
- inventaire des bases, tables, vues, routines, événements, déclencheurs et utilisateurs sans lire leurs mots de passe ;
- détection des paramètres incompatibles avec la réplication ;
- matrice de compatibilité source/réplique et prérequis avant mise à niveau ;
- étiquettes par client, pays, site, environnement et criticité ;
- cartographie visuelle des dépendances et canaux.

### 16.2 Configuration et conformité

- analyse de `server_id`, GTID, format et rétention des binlogs, `read_only`, TLS et fuseaux horaires ;
- recommandations versionnées sans modification automatique ;
- comparaison de configuration entre nœuds ;
- export d’un plan de correction et retour arrière ;
- détection de dérive après chaque changement ;
- profils de conformité par type d’installation Prestige ;
- contrôle de capacité disque, mémoire, réseau et nombre maximal de connexions.

### 16.3 Réplication

- réplication asynchrone et semi-synchrone ;
- topologies primaire/répliques, relais et réplique différée ;
- GTID, position fichier/offset et conversion assistée des anciennes installations ;
- création, pause, reprise et reconstruction d’un canal ;
- changement de source planifié ;
- filtres de réplication affichés explicitement ;
- mesure du retard en temps, octets et GTID ;
- diagnostic des threads IO/SQL et proposition de réparation ;
- interdiction par défaut de `SQL_SLAVE_SKIP_COUNTER` ou équivalent sans analyse et approbation.

### 16.4 Sauvegarde, archivage et récupération

- sauvegardes physiques complètes, incrémentales et partielles avec `mariadb-backup` ;
- sauvegardes logiques ciblées avec `mariadb-dump` ;
- catalogue des sauvegardes, binlogs, GTID, empreintes et clés de chiffrement référencées ;
- stockage local, SFTP et objet compatible S3 sans dépendance obligatoire à un fournisseur cloud ;
- politiques de rétention, verrouillage, réplication hors site et protection contre l’effacement ;
- restauration complète, PITR, récupération d’une base/table et récupération sélective de lignes ;
- explorateur de binlogs, comparaison avant/après et préparation de flashback ;
- exercices automatiques de restauration et preuve de restaurabilité ;
- estimation du temps, de l’espace et des artefacts nécessaires avant de lancer une restauration.

### 16.5 Cohérence et comparaison

- comparaison de schéma avec exclusions explicites ;
- comptages, agrégats et checksums par plages de clés ;
- limitation de débit pour ne pas dégrader la production ;
- reprise d’un contrôle interrompu ;
- diagnostic des lignes divergentes dans une instance isolée ;
- génération d’un plan de resynchronisation ;
- aucune correction de données silencieuse ou automatique.

### 16.6 Haute disponibilité

- switchover assisté ;
- failover optionnel avec quorum, fencing et prévention du split-brain ;
- intégration facultative avec MaxScale, DNS, IP virtuelle ou proxy compatible ;
- réattachement de l’ancien primaire après reconstruction ;
- tests de panne programmés ;
- procédures d’urgence imprimables et accessibles sans Control Plane ;
- mesure réelle du RPO et du RTO après chaque exercice.

### 16.7 Supervision et exploitation

- métriques temps réel et historiques ;
- seuils statiques et détection de tendances ;
- alertes groupées pour éviter les tempêtes de notifications ;
- fenêtres de maintenance et acquittement ;
- escalade courriel, SMS, WhatsApp ou webhook via connecteurs remplaçables ;
- rapports quotidiens, hebdomadaires et mensuels ;
- calendrier des sauvegardes, tests, rotations de clés et mises à niveau ;
- dossier de support chiffré et expurgé des secrets.

### 16.8 Sécurité et gouvernance

- multi-tenant avec isolation stricte des clients ;
- RBAC par organisation, site, topologie et opération ;
- MFA, SSO OIDC/SAML optionnel et comptes locaux de secours ;
- séparation demandeur/approbateur/exécutant ;
- coffre de secrets, rotation, révocation et expiration ;
- certificats mTLS propres à chaque agent ;
- journal d’audit append-only signé et exportable ;
- masquage des données personnelles dans l’explorateur ;
- interdiction du SQL libre depuis l’interface ;
- analyse des dépendances, SBOM, signature des versions et politique de correctifs de sécurité.

### 16.9 Administration du produit

- assistant d’installation et contrôle automatique des prérequis ;
- sauvegarde et restauration du Control Plane lui-même ;
- mise à jour progressive du serveur et des agents ;
- compatibilité ascendante d’au moins une version d’agent ;
- retour automatique à la version précédente en cas d’échec ;
- gestion de licence éventuelle sans bloquer une restauration d’urgence ;
- paramètres exportables et importables ;
- mode maintenance et page d’état ;
- internationalisation française d’abord, puis anglais ;
- fuseaux horaires explicites et stockage des dates en UTC.

### 16.10 Performance InnoDB et analyse des requêtes

La comparaison avec Percona PMM montre qu’un produit complet ne peut pas se limiter à la réplication et aux sauvegardes. Il doit également proposer :

- analyse des requêtes par empreinte, sans stocker par défaut les valeurs sensibles des paramètres ;
- fréquence, latence moyenne, percentiles, lignes examinées/retournées et taux d’erreur ;
- détection des requêtes lentes, plans d’exécution et régressions après mise à jour ;
- tableaux InnoDB : buffer pool, taux de succès du cache, pages sales, checkpoint age, débit redo, fsync et latence disque ;
- verrous de lignes, attentes, transactions longues, deadlocks et historique de purge ;
- connexions, threads, tables temporaires, tris disque, ouvertures de fichiers et saturation ;
- capacité et prévision de croissance des données, binlogs, sauvegardes et tables principales ;
- conseillers hors ligne versionnés pour configuration, sécurité, réplication et performance ;
- recommandations accompagnées de preuves, impact et retour arrière, jamais appliquées automatiquement.

### 16.11 Cycle de vie MariaDB

Pour approcher le niveau d’automatisation d’un service managé comme IONOS DBaaS, ajouter :

- inventaire des versions et dates de fin de support ;
- détection des correctifs disponibles sans installation automatique obligatoire ;
- fenêtres de maintenance par pharmacie ;
- analyse préalable de compatibilité, espace, sauvegarde et réplication ;
- mise à niveau d’abord sur une réplique ou un laboratoire ;
- validation applicative Prestige avant basculement ;
- plan de retour arrière fondé sur sauvegarde/restauration lorsque le downgrade direct est impossible ;
- historique signé des changements de version et configuration ;
- intégrations optionnelles aux API d’infrastructure pour redimensionner un serveur, sans rendre le produit dépendant d’un cloud.

## 17. Écrans de l’interface complète

L’interface ne doit pas être un simple tableau de métriques. Elle doit guider les opérations et empêcher les erreurs.

1. **Accueil du parc** : état de tous les clients/sites, incidents critiques, sauvegardes non vérifiées et capacité.
2. **Topologie** : graphe primaire/répliques, canaux, retard, GTID, flux et rôle de chaque nœud.
3. **Fiche nœud** : version, configuration, capacité, connexions, journaux, certificats et historique.
4. **Assistant de réplication** : prérequis, sauvegarde initiale, transfert, restauration, démarrage et validation.
5. **Centre de sauvegardes** : calendrier, catalogue, rétention, stockage, chiffrement et état de vérification.
6. **Centre de récupération** : choix du point dans le temps, simulation, restauration isolée, recherche et export des données.
7. **Explorateur de binlogs** : chronologie, GTID, tables, opérations, valeurs masquées et export autorisé.
8. **Comparateur** : schéma et données, progression, différences et plan de resynchronisation.
9. **Centre d’opérations** : plans en attente, approbations, étapes, progression, arrêt sûr et retour arrière.
10. **Incidents** : diagnostic, chronologie, actions, responsable et rapport post-incident.
11. **Sécurité** : utilisateurs, rôles, MFA, agents, certificats, secrets référencés et sessions.
12. **Audit** : recherche immuable par utilisateur, action, ressource, date et résultat.
13. **Paramètres** : notifications, stockage, rétention, maintenance, connecteurs et personnalisation.

Pour chaque opération sensible, l’écran doit afficher avant confirmation : cible exacte, impact, durée estimée, espace requis, risque, sauvegarde disponible, plan de retour arrière et approbations manquantes. La confirmation doit demander une saisie explicite du nom de la topologie et non un simple bouton « Oui ».

## 18. Autonomie sans dépendance au cloud

Le produit est considéré comme autonome uniquement s’il continue à assurer ses fonctions essentielles sans accès Internet :

- réplication MariaDB native indépendante du Control Plane ;
- console, agents, coffre local et base de métadonnées auto-hébergés ;
- paquet autonome avec JRE privé : aucune installation globale de Java n’est exigée ;
- interface Web intégrée, accessible avec un navigateur standard depuis la machine locale ou le réseau autorisé ;
- installation et mises à jour depuis un bundle hors ligne signé ;
- notifications locales par SMTP ou webhook interne ;
- documentation, procédures de crise et schémas embarqués ;
- export/import manuel des licences, signatures et mises à jour si nécessaire ;
- stockage local ou S3 compatible auto-hébergé ;
- CLI de secours pour observer, sauvegarder et restaurer ;
- aucune télémétrie obligatoire ;
- aucune restauration bloquée par l’indisponibilité d’un service commercial externe.

L’autonomie ne signifie pas tout réécrire. L’application doit piloter et vérifier les outils MariaDB officiels installés localement. Elle embarque une matrice de compatibilité, détecte la bonne version de chaque outil et refuse une opération si la combinaison n’est pas supportée.

## 19. Architecture de déploiement finale

```text
Utilisateurs
    │ HTTPS + MFA/SSO
    ▼
Reverse proxy / terminaison TLS
    │
    ├── Interface Vue 3 statique
    │
    └── API Quarkus ───── PostgreSQL métadonnées
            │              File de travaux persistante
            │              Coffre de secrets
            │              Stockage des audits
            │
            ├── mTLS ── Agent Go site A ── MariaDB primaire
            │                         └──── stockage sauvegardes
            │
            ├── mTLS ── Agent Go site B ── MariaDB réplique
            │
            └── mTLS ── Agent Go site C ── MariaDB réplique distante
```

Le Control Plane ne reçoit jamais les clés privées de chiffrement des bases. Les agents exécutent les opérations au plus près des serveurs, transmettent des résultats structurés et déposent les artefacts directement dans le stockage autorisé. Les transferts volumineux ne doivent pas transiter inutilement par l’API centrale.

### 19.1 Utilisation locale ou à distance

L’installation locale dans chaque pharmacie n’est **pas obligatoire**. Trois modèles sont supportés :

1. **Centralisé recommandé pour plusieurs pharmacies** : un seul Control Plane est installé au siège, dans un datacenter ou sur un serveur cloud privé. Un agent Go est installé comme service dans chaque pharmacie. Les administrateurs utilisent un navigateur pour accéder à la console centrale.
2. **Autonome par pharmacie** : chaque pharmacie possède son propre Control Plane et son agent. Ce mode convient aux sites isolés ou soumis à une interdiction de centralisation, mais multiplie les mises à jour, sauvegardes et comptes administrateurs.
3. **Hybride** : une console centrale supervise tous les sites, tandis qu’une CLI et des procédures locales permettent les sauvegardes et restaurations d’urgence si la liaison distante est indisponible.

Pour un exploitant qui gère plusieurs pharmacies, le modèle recommandé est le premier : **une console centrale et un agent local par pharmacie**. Les bases MariaDB restent dans les pharmacies ; la console centralise principalement les métadonnées, états, audits, plans et alertes. Les sauvegardes peuvent rester localement, être copiées dans un stockage central chiffré, ou utiliser les deux destinations selon la politique de chaque site.

```text
                            Console centrale
                      https://replication.exemple
                                  │
               connexions sortantes mTLS sur HTTPS/443
                  ┌───────────────┼───────────────┐
                  │               │               │
           Pharmacie A      Pharmacie B      Pharmacie C
           Agent service    Agent service    Agent service
                │                │                │
             MariaDB          MariaDB          MariaDB
```

L’agent initie la connexion sécurisée vers la console. Il ne faut pas exposer MariaDB sur Internet ni ouvrir un port entrant d’administration dans chaque pharmacie. Une liaison VPN privée reste recommandée lorsqu’elle est disponible, mais le fonctionnement doit aussi être possible avec une connexion sortante mTLS strictement authentifiée.

En cas de coupure Internet, la réplication locale déjà configurée et les sauvegardes locales continuent. L’agent conserve une file bornée d’événements et renvoie les métriques lors du retour de la connexion. La console indique le site comme déconnecté et interdit toute opération distante tant que l’identité et l’état réel du site ne sont pas de nouveau vérifiés.

### 19.2 Isolation de chaque pharmacie

Chaque pharmacie doit posséder un périmètre isolé. Un simple dossier portant son nom ne suffit pas à garantir cette isolation. Le modèle doit associer à chaque ressource un `tenant_id` et un `site_id` non réutilisables :

```text
Organisation / tenant
├── Pharmacie A / site
│   ├── agents
│   ├── nœuds MariaDB
│   ├── topologies
│   ├── sauvegardes et binlogs
│   ├── incidents
│   ├── secrets référencés
│   ├── certificats
│   └── audit
├── Pharmacie B / site
└── Pharmacie C / site
```

Si les pharmacies appartiennent à des propriétaires différents, chacune constitue un `tenant`. Si elles appartiennent à la même organisation, celle-ci constitue le `tenant` et chaque pharmacie est un `site`. Un administrateur global autorisé peut voir plusieurs tenants/sites ; un responsable de pharmacie ne voit que son périmètre.

L’isolation est appliquée à plusieurs niveaux :

- toutes les tables du Control Plane portent le `tenant_id` et, lorsque nécessaire, le `site_id` ;
- chaque requête vérifie le périmètre autorisé côté serveur, indépendamment des filtres de l’interface ;
- chaque agent possède son propre certificat mTLS révocable et lié à un seul site ;
- les comptes MariaDB, références de secrets et politiques de rétention sont propres au site ;
- les sauvegardes utilisent des clés ou enveloppes de chiffrement séparées par tenant ;
- les quotas, notifications, approbations et journaux d’audit sont isolés ;
- les exports temporaires expirent et ne peuvent pas être téléchargés depuis un autre tenant.

### 19.3 Dossiers et stockage par pharmacie

Lorsque le stockage utilise un système de fichiers, chaque pharmacie dispose effectivement de son propre espace, identifié par des UUID plutôt que seulement par un nom modifiable :

```text
/data/prestige-replica-manager/
└── tenants/<tenant-uuid>/
    └── sites/<site-uuid>/
        ├── backups/
        ├── binlogs/
        ├── recovered-data/
        ├── reports/
        ├── manifests/
        └── quarantine/
```

Sur un stockage objet, la même séparation est obtenue par préfixes et politiques d’accès :

```text
s3://replication/tenants/<tenant-uuid>/sites/<site-uuid>/backups/...
```

Le nom commercial de la pharmacie reste une métadonnée d’affichage ; il ne doit pas servir seul de clé ou de chemin, car il peut changer ou contenir des caractères ambigus. Le service crée les dossiers, refuse les traversées de chemin, applique les permissions, chiffre les artefacts et vérifie qu’un chemin résolu reste dans le périmètre attendu.

Les métadonnées PostgreSQL restent séparées des fichiers volumineux : PostgreSQL conserve le propriétaire, le site, le type d’artefact, l’empreinte, le GTID, la période, la taille, l’état de vérification et la référence de stockage. Le fichier de sauvegarde ou de binlog reste dans le stockage configuré.

### 19.4 Accès des utilisateurs

L’interface doit proposer au minimum les rôles suivants :

- **Super-administrateur du parc** : voit toutes les pharmacies explicitement rattachées à son organisation ;
- **Exploitant central** : supervise plusieurs sites, traite les alertes et prépare les opérations ;
- **Approbateur** : valide les restaurations, switchovers et réinjections ;
- **Administrateur de pharmacie** : gère uniquement son site ;
- **Auditeur** : consultation et export des audits sans pouvoir exécuter une opération ;
- **Lecture seule** : tableaux de bord sans accès aux données récupérées ni aux secrets.

L’utilisateur choisit une pharmacie dans un sélecteur visible en permanence. Le nom, la couleur et l’environnement de la pharmacie active sont rappelés sur chaque écran sensible afin d’éviter de lancer une restauration ou un basculement sur le mauvais site. Pour les actions critiques, la confirmation rappelle le site et exige de ressaisir son code court.

## 20. Stratégie de tests indispensable

La complétude fonctionnelle ne suffit pas ; le produit doit prouver qu’il récupère réellement les données.

- tests unitaires des plans, permissions, filtres et transitions d’état ;
- tests d’intégration contre toutes les versions MariaDB supportées ;
- tests de compatibilité Linux et Windows ;
- bases de test en formats `ROW`, `STATEMENT` et `MIXED` ;
- récupération InnoDB à partir d’une sauvegarde complète, d’un datadir copié après arrêt propre et de tablespaces `.ibd` avec/sans `.cfg` ;
- vérification qu’un `.frm` seul est refusé comme source de données et qu’une copie brute à chaud est signalée comme non cohérente ;
- corruption de pages InnoDB et export de sauvetage en laboratoire avec progression prudente de `innodb_force_recovery` ;
- tablespaces chiffrés avec clé disponible, clé incorrecte et clé perdue ;
- binlogs chiffrés, compressés, incomplets et corrompus ;
- coupure réseau pendant sauvegarde, transfert, rattrapage et switchover ;
- disque plein, certificat expiré, secret révoqué et horloge décalée ;
- crash du Control Plane et de l’agent à chaque étape d’un workflow ;
- coupure Internet d’une pharmacie avec poursuite des fonctions locales, mise en file bornée et resynchronisation au retour du réseau ;
- tests d’isolation empêchant toute lecture, export, commande ou téléchargement entre deux tenants/sites ;
- révocation du certificat d’un agent sans impact sur les autres pharmacies ;
- contrôle des chemins de stockage, traversées de répertoires et politiques des préfixes objet ;
- restauration de volumes réalistes avec mesure du RTO ;
- chaos tests avec primaire isolé pour vérifier le fencing ;
- tests de montée et retour de version ;
- installation sur une machine vierge ne contenant ni JDK ni JRE ;
- vérification que le lanceur utilise le runtime privé et qu’une installation Java système incompatible est ignorée ;
- installation, enregistrement, démarrage automatique, arrêt, redémarrage et désinstallation propres du service Windows et de l’unité `systemd` ;
- redémarrage de la machine et fermeture de la session utilisateur pendant une tâche longue, avec reprise contrôlée du workflow ;
- simulation d’échecs répétés pour vérifier la politique de redémarrage sans créer de boucle ;
- ouverture locale du navigateur, accès distant autorisé, démarrage headless et refus d’une exposition réseau non configurée ;
- mise à jour de l’application et du JRE embarqué avec retour arrière atomique ;
- tests de pénétration, dépendances et fuite de secrets ;
- exercice trimestriel de restauration signé.

Une version ne peut être déclarée prête pour la production si elle n’a pas restauré automatiquement une sauvegarde représentative, rejoué les binlogs, validé les checksums et produit un rapport exploitable.

## 21. Ordre de réalisation recommandé

### Phase 0 — Laboratoire

- matrice des versions MariaDB réellement utilisées ;
- jeux de données anonymisés ;
- environnements Linux et Windows ;
- scénarios de panne et objectifs RPO/RTO mesurables.

### Phase 1 — Observer et sauvegarder

- agent Go en lecture seule ;
- inventaire, santé, métriques, alertes, audit ;
- sauvegardes complètes et catalogue ;
- restauration automatique isolée.

### Phase 2 — Répliquer et récupérer

- provisionnement de réplique par GTID ;
- reconstruction après rupture ;
- archivage des binlogs ;
- PITR et récupération sélective ;
- explorateur de binlogs.

### Phase 3 — Opérer

- plans, approbations et workflows durables ;
- switchover ;
- comparaison et resynchronisation assistée ;
- mises à jour signées et mode hors ligne.

### Phase 4 — Haute disponibilité

- fencing ;
- proxy ;
- failover automatique facultatif ;
- multi-site et exercices de catastrophe.

Il ne faut pas commencer par le failover automatique. La priorité est de prouver la sauvegarde, la restauration et la traçabilité avant d’autoriser l’outil à promouvoir un serveur.

## 22. Définition d’un produit « complet »

Le produit pourra être qualifié de complet lorsque :

- il installe et supervise une topologie sans manipulation SQL quotidienne ;
- il fonctionne sur les versions et systèmes déclarés dans sa matrice de support ;
- il continue à répliquer lorsque le Control Plane est arrêté ;
- il peut être installé, mis à jour et restauré sans Internet ;
- le Control Plane et chaque agent fonctionnent comme services système, démarrent automatiquement après un redémarrage et restent actifs sans utilisateur connecté ;
- il démarre avec son JRE privé sur une machine dépourvue de Java et ouvre son interface dans le navigateur en mode local ;
- son interface reste accessible depuis un navigateur sans installer de client lourd sur les postes autorisés ;
- une console centrale peut administrer plusieurs pharmacies tout en isolant strictement leurs agents, secrets, sauvegardes, opérations et audits ;
- une coupure avec la console centrale n’arrête pas les fonctions locales déjà configurées dans la pharmacie ;
- chaque sauvegarde est cataloguée, chiffrée, vérifiée et restaurée périodiquement ;
- une donnée supprimée peut être recherchée et récupérée dans une instance isolée lorsque les artefacts nécessaires existent ;
- un switchover respecte le RPO/RTO annoncé ;
- aucun failover ne peut créer deux primaires accessibles ;
- chaque opération sensible possède un plan, une approbation, un retour arrière et un audit ;
- les secrets ne figurent ni dans les journaux, ni dans les commandes, ni dans les exports ;
- l’échec ou l’expiration d’une licence n’empêche jamais une restauration d’urgence ;
- les procédures de crise sont utilisables par un opérateur formé sans intervention du développeur.

Le choix recommandé est donc : **Java 21 + Quarkus pour le Control Plane, Go pour les agents et la CLI, Vue 3 + TypeScript pour l’interface Web, PostgreSQL pour les métadonnées et les outils MariaDB officiels pour les opérations de réplication, sauvegarde et binlog**.

## 23. Comparaison avec IONOS, Percona et les outils MariaDB

La comparaison suivante porte sur les fonctions publiquement documentées, pas sur un audit interne des produits. Elle doit être révisée avant chaque version majeure.

| Domaine | IONOS MariaDB DBaaS / Backup | Percona PMM et outils | Prestige Replica Manager cible |
|---|---|---|---|
| Hébergement | service cloud managé IONOS | auto-hébergé, multi-bases | auto-hébergé central ou local, sans cloud obligatoire |
| Multi-sites | ressources du compte cloud | supervision centralisée de nombreuses instances | tenants/sites conçus pour plusieurs pharmacies |
| Supervision | monitoring et reporting du service | dashboards profonds, alertes et métriques | supervision, alertes, capacité et tableaux InnoDB à implémenter |
| Analyse des requêtes | dépend du service et de ses outils | Query Analytics, latence et requêtes lentes | empreintes, percentiles, plans et régressions ajoutés au périmètre |
| Conseillers | service managé et automatisations | advisors hors ligne et contrôles | conseillers locaux versionnés à construire |
| Sauvegardes | sauvegardes automatiques et restauration autonome | outils de sauvegarde ; support PMM variable selon moteur/version | `mariadb-backup`, logique, incrémental, catalogue et vérification |
| PITR | restauration MariaDB à un instant précis, avec rétention publiée par l’offre | possible avec les outils adaptés | sauvegarde + binlogs, période configurable et testée |
| Haute disponibilité | nœuds redondants et failover gérés dans IONOS | composants Percona spécialisés selon la distribution | réplication MariaDB, switchover et failover optionnel avec fencing |
| Patching | maintenance du service gérée par IONOS | observation et outils, selon produit déployé | workflow de mise à niveau contrôlé, non automatique par défaut |
| Récupération `.ibd`/datadir | non exposée comme fonction utilisateur standard du DBaaS | outils experts disponibles séparément | laboratoire forensique et récupération sélective prévus |
| Fonctionnement sans Internet | non pour le service DBaaS | PMM peut être auto-hébergé et certains advisors fonctionnent hors ligne | exigence centrale : installation, exploitation et restauration hors ligne |
| Intégration Prestige | aucune spécifique | aucune spécifique | contrôles et validations fonctionnelles propres aux pharmacies |

Sources de référence :

- [IONOS MariaDB — sauvegardes et restauration à un instant précis](https://docs.ionos.com/cloud/databases/mariadb/overview/backups) ;
- [IONOS MariaDB — fonctions, haute disponibilité et maintenance](https://docs.ionos.com/cloud/databases/mariadb/overview/features-benefits) ;
- [Percona PMM — supervision, Query Analytics, advisors et fonctionnement auto-hébergé](https://docs.percona.com/percona-monitoring-and-management/3/discover-pmm/why-pmm.html) ;
- [MariaDB — sauvegarde et restauration](https://mariadb.com/docs/server/server-usage/backup-and-restore/backup-and-restore-overview) ;
- [MariaDB — restauration de tables InnoDB individuelles](https://mariadb.com/docs/server/server-usage/backup-and-restore/mariadb-backup/restoring-individual-tables-and-partitions-with-mariadb-backup).

### 23.1 Conclusion du benchmark

La proposition est plus spécialisée que IONOS ou Percona pour la gestion de pharmacies MariaDB installées sur plusieurs sites, la récupération de données et l’exploitation sans cloud. En revanche, Percona PMM est une référence plus mature pour l’analyse de performance et les requêtes ; les fonctions de la section 16.10 sont donc obligatoires pour éviter un angle mort. IONOS est une référence pour l’expérience de service managé, les sauvegardes automatiques, le PITR, la maintenance et le failover ; les fonctions de cycle de vie de la section 16.11 rapprochent le produit de ce niveau d’automatisation sans lui retirer son autonomie.

Le produit ne doit pas intégrer Percona XtraBackup pour sauvegarder MariaDB : la documentation MariaDB recommande `mariadb-backup`, issu historiquement de XtraBackup mais maintenu pour les formats et fonctions MariaDB. Percona PMM peut néanmoins servir de référence fonctionnelle et éventuellement de source de métriques compatible, sous réserve d’une étude d’intégration, de licence et de coût de maintenance.

### 23.2 Éléments qui restent à construire

Le document couvre désormais le périmètre attendu, mais la parité réelle ne sera acquise qu’après implémentation et tests. Les principaux travaux supplémentaires révélés par la comparaison sont :

1. moteur d’analyse des requêtes et tableaux InnoDB ;
2. conseillers hors ligne et base de règles versionnée ;
3. workflow de maintenance et mise à niveau MariaDB ;
4. laboratoire automatisé de récupération `.ibd`, datadir et corruption ;
5. mesure de capacité et prévision de croissance ;
6. restauration en libre-service avec garde-fous comparables à un DBaaS ;
7. campagne de compatibilité sur toutes les versions MariaDB réellement présentes dans les pharmacies.
