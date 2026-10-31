# Haute disponibilité de Payara Server pour Prestige

## Objectif

Mettre en place un second serveur Payara capable de reprendre le trafic si le
serveur principal ou sa machine tombe en panne.

La mise en place de deux serveurs ne suffit pas, à elle seule, à garantir la
haute disponibilité. Il faut également traiter les sessions HTTP, les jobs
planifiés, la base MySQL, les fichiers partagés et le répartiteur de charge.

## Réponse courte

Oui, un serveur relais est possible. Pour Prestige, la trajectoire recommandée
est la suivante :

1. commencer par deux Payara en **actif/passif** avec un répartiteur de charge ;
2. accepter, dans cette première phase, qu'une panne oblige les utilisateurs à
   se reconnecter ;
3. sécuriser tous les traitements planifiés avec un verrou distribué ;
4. seulement ensuite, passer en **actif/actif** et répliquer les sessions.

Il ne faut pas mettre immédiatement deux instances Prestige en mode `server` :
les timers et les jobs `@Schedule` seraient exécutés par les deux instances et
pourraient produire des SMS, emails ou traitements métier en double.

## Architecture cible

```text
                       +------------------------+
Utilisateurs --------->| Load balancer          |
                       | HAProxy/Nginx/appliance |
                       +-----------+------------+
                                   |
                      +------------+------------+
                      |                         |
                      v                         v
             +----------------+        +----------------+
             | Machine A      |        | Machine B      |
             | Payara + JDK 17|        | Payara + JDK 17|
             | prestige.war   |        | prestige.war   |
             +-------+--------+        +--------+-------+
                     |                          |
                     +------------+-------------+
                                  |
                                  v
                       +------------------------+
                       | MySQL partagé ou HA    |
                       +------------------------+
```

Les deux instances doivent utiliser exactement :

- la même version de Payara ;
- le même JDK 17 ;
- le même WAR ;
- les mêmes ressources JNDI ;
- le même schéma de base de données ;
- les mêmes paramètres applicatifs, sauf les paramètres explicitement liés au
  rôle actif ou passif.

Les deux Payara doivent être installés sur deux machines différentes. Deux
instances sur la même machine protègent contre le crash d'une JVM, mais pas
contre la panne de la machine, du disque, du système ou du réseau.

## Version de Payara

Prestige reste un WAR Java EE 8 utilisant les packages `javax.*`, compilé pour
Java 17. La cible naturelle est donc une version maintenue de **Payara
Enterprise 5 compatible JDK 17**.

Une migration directe vers Payara 6 ne doit pas être confondue avec ce chantier :
elle implique normalement le passage de `javax.*` vers `jakarta.*`. Cette
migration devra être qualifiée séparément.

## Phase 1 — actif/passif

### Principe

- Payara A est le serveur principal.
- Payara B est installé, démarrable et maintenu à la même version.
- Le load balancer envoie normalement les requêtes à A.
- Si A ne répond plus, il redirige les requêtes vers B.
- Les deux serveurs accèdent au même MySQL.

Une variante prudente consiste à utiliser :

```properties
# Machine A
application.mode=server
```

```properties
# Machine B
application.mode=client
```

Cela évite que certains traitements réservés au serveur s'exécutent deux fois.
Cependant, ce mode ne constitue pas une élection automatique : si A tombe, il
faut promouvoir B en mode `server` de façon contrôlée pour reprendre également
les jobs métier.

### Sessions dans cette première phase

Le load balancer doit activer l'affinité de session, ou **sticky sessions**, afin
qu'un utilisateur reste dirigé vers la même instance tant qu'elle fonctionne.

Dans la configuration actuelle, les sessions ne sont pas déclarées
distribuables. Lors du basculement de A vers B, un utilisateur peut donc devoir
se reconnecter. Cette limitation est acceptable pour une première étape si elle
est clairement prévue dans la procédure d'exploitation.

### Avantages

- mise en œuvre plus simple ;
- risque réduit de traitements en double ;
- possibilité de tester rapidement le redémarrage sur la seconde machine ;
- retour arrière plus facile.

### Limites

- perte possible de la session lors du crash ;
- promotion du rôle métier potentiellement manuelle ;
- interruption des requêtes en cours ;
- pas de protection si MySQL ou le load balancer reste un point unique de panne.

## Phase 2 — sécurisation des jobs

### Pourquoi elle est obligatoire

Un `@Singleton` EJB est unique dans une instance Payara, pas dans l'ensemble des
machines. Avec deux instances actives, chacune crée donc ses singletons, ses
timers et ses `@Schedule`.

Prestige contient notamment des traitements de :

- stock journalier ;
- réapprovisionnement ;
- purge et expiration ;
- agrégats de pilotage ;
- SMS et emails ;
- notification récapitulative ;
- contrôles et tâches de support.

Un verrou Java local, tel qu'un `AtomicBoolean`, ne protège que la JVM qui le
contient. Il ne peut pas empêcher la seconde machine d'exécuter le même job.

### Solution recommandée

Chaque job ayant des effets métier doit acquérir un verrou distribué en base
avant de commencer. Une table de contrôle peut contenir :

```text
nom_job
cle_execution
instance
date_acquisition
date_expiration
statut
date_fin
```

La combinaison `(nom_job, cle_execution)` doit être unique. Pour un job
journalier, `cle_execution` peut être la date métier. Pour un traitement
périodique, elle peut représenter la fenêtre d'exécution.

Le mécanisme doit respecter les règles suivantes :

1. une seule instance peut obtenir le verrou ;
2. l'autre instance abandonne proprement si le verrou existe ;
3. le verrou possède une expiration afin de permettre la reprise après le crash
   du détenteur ;
4. le traitement est idempotent autant que possible ;
5. l'émission d'un SMS ou d'un email possède sa propre clé d'idempotence ;
6. la fin et l'échec du traitement sont journalisés.

Une instance de secours ne doit reprendre un job expiré qu'après un délai
suffisant pour éviter qu'une simple lenteur soit interprétée comme une panne.

## Phase 3 — actif/actif et sessions répliquées

Après sécurisation des jobs, les deux Payara peuvent recevoir simultanément du
trafic.

Pour conserver les sessions après la perte d'une instance, il faut au minimum :

1. ajouter `<distributable/>` dans `WEB-INF/web.xml` ;
2. auditer tous les objets placés dans `HttpSession` ;
3. rendre ces objets sérialisables ;
4. retirer des sessions les connexions, fichiers ouverts, ressources JNDI et
   autres objets non réplicables ;
5. activer le Data Grid/Hazelcast de Payara ;
6. activer le service de disponibilité Web ;
7. configurer la persistance de session Hazelcast dans le descripteur Payara ;
8. déployer l'application avec la disponibilité activée ;
9. conserver les sticky sessions sur le load balancer ;
10. synchroniser les horloges des machines avec NTP.

Exemple indicatif à qualifier selon la version exacte de Payara :

```xml
<distributable/>

<session-config>
    <session-timeout>30</session-timeout>
</session-config>
```

```xml
<payara-web-app>
    <context-root>/prestige</context-root>
    <session-config>
        <session-manager persistence-type="hazelcast">
            <manager-properties>
                <property name="persistenceFrequency" value="web-method"/>
            </manager-properties>
            <store-properties>
                <property name="persistenceScope" value="session"/>
            </store-properties>
        </session-manager>
    </session-config>
</payara-web-app>
```

La configuration actuelle utilise une session sans expiration. Avant la
réplication, il est recommandé de définir une durée maîtrisée : des sessions
illimitées augmentent la mémoire consommée et le volume de données à répliquer.

## Base de données

Les deux Payara doivent pointer vers le même endpoint JDBC. Toutefois, deux
serveurs d'application avec un seul serveur MySQL ne constituent pas une
architecture hautement disponible : MySQL resterait un point unique de panne.

### Niveau minimal

- MySQL installé sur une machine distincte ;
- sauvegardes automatisées ;
- restauration testée régulièrement ;
- réplica prêt à être promu ;
- endpoint JDBC stable pour éviter de reconfigurer les Payara.

### Niveau HA

- MySQL InnoDB Cluster, Galera ou service MySQL managé HA ;
- basculement automatique ;
- endpoint virtuel unique ;
- sauvegardes indépendantes du cluster ;
- test régulier de perte du primaire.

Les migrations Flyway doivent être exécutées de façon coordonnée. Les deux
instances ne doivent jamais servir deux versions incompatibles de l'application
sur le même schéma.

## Fichiers, impressions et périphériques

Tout fichier métier écrit sur le disque local doit être inventorié. Un fichier
présent uniquement sur A ne sera pas disponible après basculement vers B.

Les solutions possibles sont :

- stockage réseau partagé ;
- stockage objet ;
- réplication contrôlée ;
- stockage en base lorsque cela est approprié.

Les impressions, ports série et autres périphériques locaux nécessitent une
attention particulière. Si seul A est physiquement connecté à un périphérique,
B ne pourra pas automatiquement reprendre ce traitement. Il faut soit rendre le
périphérique accessible sur le réseau, soit accepter une reprise manuelle de
cette fonction.

## Load balancer

Le load balancer doit fournir :

- des contrôles de santé périodiques ;
- un délai court de retrait d'une instance défaillante ;
- les sticky sessions ;
- des délais de connexion et de réponse adaptés ;
- une journalisation des basculements ;
- TLS et la conservation correcte des en-têtes d'origine.

Le contrôle de santé doit vérifier l'application, pas seulement que le port TCP
est ouvert. Idéalement, un endpoint dédié confirme :

- que Payara répond ;
- que le WAR est opérationnel ;
- que la base est accessible ;
- que le schéma attendu est présent.

Un seul load balancer serait lui-même un point unique de panne. Pour une vraie
HA, utiliser un load balancer managé ou deux load balancers avec une IP virtuelle
et un mécanisme tel que Keepalived.

## Supervision

La supervision doit être extérieure aux deux serveurs et contrôler :

- l'URL de santé de chaque instance ;
- l'URL publique ;
- la JVM, le tas mémoire et les pauses GC ;
- les pools JDBC ;
- les temps de réponse ;
- les erreurs HTTP ;
- l'état MySQL ;
- l'espace disque ;
- l'exécution et le retard des jobs ;
- les basculements du load balancer.

Une alerte doit être envoyée lorsqu'il ne reste plus qu'une seule instance
saine. Le fait que le service continue ne doit pas masquer la perte de
redondance.

## Scénarios de recette obligatoires

### Pannes Payara

- arrêt propre de A ;
- arrêt brutal du processus Java de A ;
- redémarrage de A pendant que B sert le trafic ;
- panne de B sans impact sur A ;
- retour de l'instance réparée dans le load balancer.

### Pannes machine et réseau

- arrêt complet de la machine A ;
- perte réseau entre A et le load balancer ;
- perte réseau entre A et MySQL ;
- partition réseau entre A et B ;
- saturation disque ou mémoire.

### Sessions

- utilisateur connecté pendant le crash ;
- saisie en cours au moment du basculement ;
- plusieurs onglets utilisant la même session ;
- expiration et déconnexion ;
- vérification de l'absence de mélange entre deux utilisateurs.

### Jobs

- crash avant acquisition du verrou ;
- crash après acquisition et avant traitement ;
- crash pendant le traitement ;
- expiration puis reprise du verrou par B ;
- preuve qu'un SMS ou email n'est envoyé qu'une fois ;
- redémarrage simultané de A et B.

### Base et transactions

- transaction validée juste avant le crash ;
- transaction interrompue avant commit ;
- basculement du primaire MySQL ;
- épuisement temporaire du pool JDBC ;
- reprise sans doublon métier.

## Plan de déploiement conseillé

### Étape 1 — préparer le secours

1. Installer deux machines distinctes.
2. Installer la même version de JDK 17 et de Payara.
3. Reproduire les ressources JNDI et certificats.
4. Déployer le même WAR.
5. Connecter les deux instances au même environnement de recette.
6. Placer B en mode passif pour les jobs.

### Étape 2 — installer le load balancer

1. Configurer A comme cible principale.
2. Configurer B comme cible de secours.
3. Activer le health check et les sticky sessions.
4. Tester la perte de A.
5. Documenter la promotion métier de B.

### Étape 3 — rendre les jobs distribués

1. Inventorier tous les `@Schedule`, `@Timeout` et `@PostConstruct`.
2. Ajouter le verrou distribué.
3. Ajouter les clés d'idempotence.
4. Tester chaque scénario de crash.

### Étape 4 — activer les sessions HA

1. Auditer `HttpSession`.
2. Ajouter `<distributable/>`.
3. Activer Hazelcast et la disponibilité Web.
4. Passer progressivement en actif/actif.
5. Effectuer une recette complète.

### Étape 5 — supprimer les derniers points uniques de panne

1. Rendre MySQL hautement disponible.
2. Redonder le load balancer.
3. Externaliser les fichiers métier.
4. Installer une supervision externe.
5. Tester les sauvegardes et le plan de reprise.

## Critères de décision

Le passage en actif/passif est autorisé lorsque :

- B démarre et déploie le même WAR ;
- les ressources JNDI sont identiques ;
- le load balancer retire correctement A ;
- la perte de session est comprise et acceptée ;
- la procédure de promotion des jobs est documentée ;
- aucune donnée n'est disponible uniquement sur le disque de A.

Le passage en actif/actif est autorisé uniquement lorsque :

- tous les jobs métier sont protégés contre la double exécution ;
- les émissions externes sont idempotentes ;
- les sessions ont été auditées et testées ;
- les deux instances peuvent fonctionner simultanément sur le même schéma ;
- les tests de panne ont été exécutés avec succès ;
- la base et le load balancer ne sont plus des points uniques de panne.

## Conclusion

Un Payara de secours est réalisable, mais la première cible raisonnable pour
Prestige est un actif/passif avec reconnexion éventuelle des utilisateurs. Le
passage en actif/actif doit venir après la mise en place de verrous distribués
pour les jobs et après la qualification de la réplication des sessions.

La priorité technique n'est donc pas seulement d'installer un second Payara :
elle est d'empêcher les doubles traitements et de supprimer progressivement tous
les points uniques de panne.

## Références Payara

- [Haute disponibilité dans Payara Server](https://docs.payara.fish/community/docs/6.2023.1/Technical%20Documentation/Payara%20Server%20Documentation/High%20Availability/Overview.html)
- [Persistance et basculement des sessions](https://docs.payara.fish/community/docs/6.2023.1/Technical%20Documentation/Payara%20Server%20Documentation/High%20Availability/Configuring%20HA%20Session%20Persistence%20and%20Failover.html)
- [Configuration du load balancing HTTP](https://docs.payara.fish/enterprise/docs/6.30.0/Technical%20Documentation/Payara%20Server%20Documentation/High%20Availability/Configuring%20HTTP%20Load%20Balancing.html)
- [Administration des Deployment Groups](https://docs.payara.fish/enterprise/docs/6.20.0/Technical%20Documentation/Payara%20Server%20Documentation/High%20Availability/Administering%20Deployment%20Groups.html)
- [Plateformes supportées par Payara Enterprise 5](https://docs.payara.fish/enterprise/docs/5.80.0/General%20Info/Supported%20Platforms.html)
