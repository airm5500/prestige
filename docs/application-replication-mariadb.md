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
replication_topology    groupe primaire/répliques
replication_channel     relation source → réplique
node_metric             métriques horodatées
health_incident         incident et cycle de résolution
operation               workflow demandé
operation_step          étapes, sorties et statuts
approval                 approbations sensibles
backup                   artefact et métadonnées GTID
restore_test             résultat d’une restauration vérifiée
secret_reference        référence vers le coffre, jamais le secret
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
GET    /api/v1/incidents
GET    /api/v1/audit
```

Les opérations dangereuses suivent toujours le cycle : **planifier → analyser → approuver → exécuter → vérifier → auditer**.

## 11. Technologies recommandées

### Backend

- Java 21 avec Quarkus ou Spring Boot ;
- API REST et tâches asynchrones ;
- PostgreSQL ou MariaDB séparé pour les métadonnées du Control Plane ;
- file de travaux persistante ;
- intégration Vault ou coffre compatible ;
- métriques Prometheus et traces OpenTelemetry.

### Agent

- Go, sous forme d’un binaire unique ;
- faible consommation ;
- exécution sous un utilisateur système dédié ;
- aucune interface publique autre que mTLS ;
- liste fermée de commandes ;
- mises à jour signées.

### Interface

- Vue ou React ;
- tableau de bord temps réel ;
- assistant pas-à-pas ;
- affichage clair des conséquences avant chaque action ;
- responsive, mais opérations destructives réservées à un écran administrateur.

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
