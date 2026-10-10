# Rapport de comparaison — Prestige et Phénix (AS PHARM)

**Date de l'analyse :** 8 octobre 2026  
**Périmètre :** couverture fonctionnelle, expérience produit, architecture, exploitation et axes d'amélioration.

## 1. Objet et méthode

Ce rapport positionne Prestige face à Phénix, le logiciel de gestion d'officine présenté par AS PHARM.

Les niveaux de preuve ne sont pas identiques :

- **Prestige** est évalué à partir de son code source, de son modèle de données, de ses API et de ses écrans ;
- **Phénix** est évalué à partir des informations publiques de l'éditeur, sans accès à son code, à ses données ni à une instance de recette.

Les affirmations concernant Phénix sont donc des fonctionnalités **annoncées par AS PHARM**, et non les conclusions d'un audit indépendant. Une comparaison définitive des performances, de l'ergonomie et de la disponibilité nécessiterait une démonstration sur des scénarios et jeux de données identiques.

Sources publiques consultées :

- [Présentation générale de Phénix](https://www.as-pharm.com/)
- [Présentation des modules](https://www.as-pharm.com/produit/)
- [Annonce de lancement de Phénix](https://www.as-pharm.com/2026/07/09/as-pharm-lance-phenix-son-lgo-nouvelle-generation/)
- [Présentation publique de la gestion du stock](https://www.as-pharm.com/2026/07/09/5-signes-que-votre-officine-perd-de-largent-sur-son-stock/)

## 2. Résumé exécutif

Prestige dispose d'une **profondeur métier importante**, particulièrement sur :

- le stock et les mouvements ;
- les inventaires et leurs écarts ;
- les tiers payants et leur facturation ;
- les dépôts et réserves ;
- les éditions et analyses ;
- la personnalisation des règles d'officine.

Phénix possède un **positionnement produit plus moderne et plus lisible**, centré sur :

- une expérience utilisateur fluide ;
- un déploiement SaaS sans serveur à maintenir dans l'officine ;
- l'accès distant ;
- le mobile et le fonctionnement hors connexion annoncés ;
- la consolidation multi-officines ;
- les intégrations grossistes ;
- une offre et une tarification simples à comprendre.

L'écart principal ne semble donc pas être l'absence de métier dans Prestige. Il réside plutôt dans la **présentation, l'unification des parcours, le cloud, le mobile, l'exploitation industrielle et la mesure de la qualité de service**.

### Positionnement recommandé

> **Prestige : la plateforme de gestion d'officine la plus profonde pour le stock, le tiers payant et le pilotage, modernisée pour le cloud, le mobile et le multi-sites.**

## 3. Tableau comparatif

| Domaine | Prestige — constat dans le dépôt | Phénix — annonce publique | Position apparente |
|---|---|---|---|
| Vente et caisse | Couverture métier étendue, ventes ordinaires et dépôt, règlements, tickets, vendeurs et contrôles | Comptoir rapide, recherche instantanée, raccourcis, carte et Mobile Money | Prestige profond ; Phénix mieux présenté |
| Stock | Ruptures, seuils, négatifs, dormants, valorisation, lots, mouvements et surstocks | Suivi temps réel, alertes, commandes préparées automatiquement | Prestige plus analytique |
| Inventaire | Inventaires par rayon, lignes touchées/non touchées, écarts, exports et inventaires ciblés | Inventaire assisté au lecteur code-barres | Prestige plus profond ; Phénix probablement plus simple |
| Péremption | Suivi par lot, alertes, valorisation des lots proches de l'échéance | Alertes et suivi par lot/date annoncés | Équilibre sur la promesse, avantage Prestige sur la preuve |
| Commandes grossistes | Commandes, bons, suggestions, ruptures et intégration PharmaML | Connexion aux extranets et commandes sans ressaisie annoncées | Phénix sur l'intégration annoncée |
| Tiers payant | Dossiers, ayants droit, plafonds, factures, bordereaux, règlements, modèles et analyses | Contrôle intégré au point de vente | Avantage fonctionnel probable Prestige |
| Reporting | Grand nombre d'états, pilotage, ABC, ventes, caisse, achats, stock et tiers payant | Tableaux en temps réel, rapports email et vue consolidée | Prestige profond ; Phénix plus accessible |
| Dépôts | Stocks, ventes, carnets et mouvements dédiés | Gestion des dépôts annoncée sur mobile | Prestige métier ; Phénix mobilité |
| Multi-officines | Emplacements et dépôts ; consolidation globale à renforcer | Vue par site et consolidée annoncée | Avantage Phénix |
| Mobile/hors ligne | APIs existantes, mais pas d'expérience homogène démontrée | Application Android et synchronisation hors ligne annoncées | Avantage Phénix |
| RH et pointage | Socle backend récent pour employés, absences, pointages et imports CSV | Non mis en avant publiquement | Opportunité de différenciation Prestige |
| Déploiement | WAR Java EE, GlassFish, MySQL, fichiers et configuration locale | SaaS accessible au navigateur, sans serveur officinal annoncé | Avantage Phénix |
| Personnalisation | Forte richesse de règles et d'écrans spécialisés | Adaptation aux pays et besoins annoncée | Avantage probable Prestige |
| Sécurité | Rôles, privilèges et sessions présents ; homogénéité à auditer | Rôles et sauvegardes annoncés ; détails techniques non publiés | Audit nécessaire des deux côtés |
| Offre commerciale | Non documentée dans le dépôt | Prix par session, migration, formation et assistance annoncés | Avantage Phénix |

## 4. Analyse par domaine

### 4.1 Vente et caisse

Prestige possède de nombreux parcours de vente et de règlement. Cette richesse constitue un actif, mais elle augmente le risque de fragmentation entre écrans historiques et écrans récents.

Phénix met davantage en avant le résultat utilisateur : rapidité, recherche immédiate, encaissement sans quitter le comptoir et prise en charge des paiements locaux.

**Enjeu pour Prestige :** mesurer et réduire le temps réel d'une vente plutôt que multiplier les fonctions visibles.

Indicateurs à suivre :

- temps médian de création d'un ticket ;
- temps de recherche d'un produit ;
- nombre de clics ou touches par vente ;
- taux d'abandon et de vente ratée ;
- erreurs de règlement et écarts de caisse ;
- temps de réponse au 95e percentile pendant les heures de pointe.

### 4.2 Stock, seuils et couverture

Prestige possède déjà les seuils minimum/maximum, la consommation, le délai de réapprovisionnement, la moyenne de vente et un coefficient de sécurité. Il sait aussi détecter les ruptures, les stocks négatifs, les produits sous seuil et les produits sans seuil.

La prochaine évolution ne doit pas se limiter à une alerte `stock < seuil`. Elle doit expliquer le risque par la couverture :

```text
VMJ = quantité vendue / nombre de jours où le produit était disponible

Couverture = stock vendable / VMJ

Horizon de protection = délai fournisseur + jours de sécurité

Risque de rupture officine si couverture <= horizon de protection
```

Le diagnostic doit distinguer :

- rupture interne évitable ;
- rupture fournisseur ;
- erreur de stock ;
- demande exceptionnelle ;
- commande déjà en cours ;
- produit dormant ou non suggérable.

**Promesse recommandée :** « Prestige anticipe les risques de rupture et propose l'action adaptée », plutôt que « Prestige empêche toutes les ruptures ».

### 4.3 Péremptions

Prestige suit déjà les lots et les échéances. Le prochain niveau consiste à calculer non seulement qu'un lot expire bientôt, mais la quantité qui risque réellement de ne pas être vendue :

```text
Quantité vendable avant péremption = VMJ × jours restants

Quantité à risque = max(0, stock du lot - quantité vendable)

Valeur à risque = quantité à risque × prix d'achat
```

Les actions associées doivent être explicites : retour fournisseur, transfert, mise en avant, commande suspendue, inventaire ou destruction réglementaire.

### 4.4 Commandes et fournisseurs

Prestige possède le socle commande et PharmaML. Pour rivaliser sur l'automatisation, il faut enregistrer la qualité réelle de chaque fournisseur :

- quantité demandée, confirmée et livrée ;
- indisponibilités ;
- délais annoncés et observés ;
- livraisons partielles ;
- prix et conditions ;
- taux de service.

La suggestion de commande doit intégrer :

```text
stock disponible
+ commandes confirmées
- réservations
- demande prévue pendant le délai
+ stock de sécurité
```

Chaque proposition doit afficher sa formule afin de rester contrôlable par le pharmacien.

### 4.5 Tiers payant

Prestige paraît disposer d'un avantage métier significatif grâce à ses dossiers, factures, bordereaux, règlements et modèles dynamiques. Cet avantage doit être rendu plus visible dans le parcours de vente : contrôle des droits, plafonds, exclusions, part patient et accord sans changer d'écran.

### 4.6 Reporting et décision

Prestige possède de nombreux états, mais une collection de rapports ne constitue pas automatiquement un pilotage efficace. Chaque indicateur prioritaire doit ouvrir une action :

- rupture → commander, transférer ou inventorier ;
- péremption → retourner ou transférer ;
- surstock → suspendre la commande ou créer un inventaire ciblé ;
- impayé → relancer ou ouvrir le dossier ;
- anomalie de caisse → consulter les opérations responsables.

### 4.7 SaaS et multi-sites

Prestige est déjà une application web Java empaquetée en WAR et connectée à MySQL par une source de données serveur. Il peut être hébergé, mais un véritable SaaS demande davantage qu'une mise en ligne.

La trajectoire la moins risquée est :

1. une instance et une base isolées par pharmacie ;
2. une plateforme centrale de déploiement, supervision et sauvegarde ;
3. des services mutualisés pour l'identité, les notifications et connecteurs ;
4. une consolidation multi-officines ;
5. éventuellement, après audit complet, un modèle multi-tenant plus poussé.

Passer directement à une base partagée serait risqué à cause du volume de SQL natif, des hypothèses d'emplacement et du besoin d'isolation stricte des données.

### 4.8 Mobile et hors connexion

Le hors-ligne ne doit pas se limiter à mettre les pages en cache. Il faut :

- un journal local des opérations ;
- des identifiants d'événement uniques ;
- une synchronisation idempotente ;
- une gestion de l'ordre des opérations ;
- des règles de résolution des conflits ;
- un état visible de synchronisation ;
- une stratégie pour les prix, stocks, plafonds et numéros de ticket pendant la coupure.

### 4.9 RH et pointage

Le socle récemment ajouté doit être considéré comme une fondation, pas comme un module terminé. Pour devenir une différenciation commerciale, il manque notamment :

- les écrans employés ;
- les plannings ;
- les soldes et demandes de congés ;
- la validation hiérarchique ;
- les règles d'horaires, pauses, retards et heures supplémentaires ;
- le rapprochement des pointages ;
- la correction avec traçabilité ;
- les rapports RH ;
- l'authentification des appareils mobiles et pointeuses.

## 5. Principaux axes d'amélioration

### Axe 1 — Unifier l'expérience du comptoir

**Objectif :** rendre les opérations fréquentes plus rapides que chez les concurrents.

Actions :

1. redessiner le parcours vente–encaissement ;
2. rendre toutes les opérations utilisables au clavier et au code-barres ;
3. intégrer tiers payant et règlements sans changement d'écran ;
4. instrumenter les temps de réponse et le nombre d'actions ;
5. tester avec des vendeurs en conditions de pointe.

**Priorité : critique.**

### Axe 2 — Créer un centre de décision stock

**Objectif :** réunir les nombreux moteurs existants dans une seule liste d'actions.

Le centre doit présenter :

- couverture et date prévisionnelle de rupture ;
- commande en cours ;
- suggestion expliquée ;
- disponibilité par grossiste ;
- surstock et dormant ;
- péremption et valeur à risque ;
- transfert possible entre sites ;
- anomalie nécessitant un inventaire.

**Priorité : critique.**

### Axe 3 — Fiabiliser et automatiser le réapprovisionnement

**Objectif :** passer du seuil manuel à une recommandation dynamique contrôlable.

Actions :

1. calculer la VMJ corrigée des jours de rupture ;
2. mesurer le délai réel par fournisseur ;
3. intégrer commandes en cours et réservations ;
4. calculer stock de sécurité et couverture ;
5. arrondir aux conditionnements ;
6. mesurer l'efficacité des alertes et suggestions.

**Priorité : élevée.**

### Axe 4 — Construire une offre SaaS industrialisée

**Objectif :** déployer, mettre à jour et superviser les officines sans intervention manuelle.

Actions :

1. conteneuriser Prestige ;
2. externaliser configuration et secrets ;
3. supprimer les dépendances au disque local ;
4. automatiser Flyway, sauvegardes et restaurations ;
5. centraliser journaux, métriques et alertes ;
6. commencer par une base isolée par pharmacie ;
7. auditer toutes les requêtes avant toute mutualisation de données.

**Priorité : critique pour la stratégie produit.**

### Axe 5 — Ajouter un fonctionnement hors connexion fiable

**Objectif :** maintenir les opérations essentielles pendant les coupures.

Commencer par un périmètre réduit :

- recherche produit ;
- vente comptant ;
- règlement ;
- ticket ;
- inventaire ;
- synchronisation.

Ne pas commencer par les opérations les plus conflictuelles, comme la facturation complexe des tiers payants.

**Priorité : élevée selon les pays et la qualité de connexion.**

### Axe 6 — Consolider les officines et organiser les transferts

**Objectif :** offrir une vraie vue groupe, distincte des dépôts d'une seule officine.

Actions :

- identité groupe/officine/site/emplacement ;
- droits par site ;
- consolidation du CA, stock et trésorerie ;
- transferts tracés ;
- proposition d'un transfert avant une nouvelle commande ;
- indicateurs comparables entre sites.

**Priorité : élevée.**

### Axe 7 — Renforcer sécurité et traçabilité

**Objectif :** rendre le produit exploitable en SaaS sans augmenter le risque métier.

Actions :

- audit des routes et privilèges ;
- authentification renforcée des administrateurs ;
- journal d'audit homogène ;
- chiffrement des secrets ;
- isolation stricte des clients ;
- sauvegardes testées par restauration ;
- gestion des appareils et révocation ;
- tests automatiques empêchant les accès inter-clients.

**Priorité : critique.**

### Axe 8 — Moderniser progressivement, sans réécriture totale

**Objectif :** conserver la connaissance métier accumulée tout en réduisant la dette technique.

Approche :

1. stabiliser les règles critiques par des tests ;
2. documenter les API ;
3. créer une façade cohérente devant le métier historique ;
4. remplacer les parcours un à un ;
5. extraire uniquement les services qui doivent évoluer indépendamment ;
6. supprimer ensuite les anciennes routes devenues inutiles.

**Priorité : continue.**

### Axe 9 — Terminer le module RH

**Objectif :** transformer le socle technique en produit utilisable.

Actions :

- workflow employés et contrats ;
- congés/repos avec validation ;
- planning ;
- import de pointeuse assisté à l'écran ;
- rapprochement entrée/sortie ;
- anomalies et corrections tracées ;
- calcul des heures ;
- exports de préparation de paie ;
- règles de confidentialité et conservation.

**Priorité : moyenne, après sécurisation du cœur officinal.**

### Axe 10 — Clarifier l'offre commerciale

**Objectif :** vendre des résultats, pas une liste de menus.

Proposition :

- **Prestige Officine** : vente, stock, caisse et commandes ;
- **Prestige Plus** : tiers payant, pilotage et automatisations ;
- **Prestige Groupe** : multi-sites, mobile, consolidation et transferts.

Messages recommandés :

- vendre plus vite ;
- anticiper les risques de rupture ;
- réduire surstocks et péremptions ;
- récupérer les impayés ;
- piloter l'officine à distance.

## 6. Feuille de route proposée

### Horizon 0–3 mois : mesurer et sécuriser

- définir les cinq parcours prioritaires ;
- instrumenter les performances ;
- auditer droits, sauvegardes et restauration ;
- inventorier fichiers locaux et SQL natif ;
- établir les KPI de rupture, couverture, péremption et qualité du stock ;
- ajouter des tests sur vente, stock, caisse et tiers payant.

### Horizon 3–6 mois : valeur utilisateur visible

- livrer le centre de décision stock ;
- afficher couverture, horizon de protection et suggestion expliquée ;
- moderniser le comptoir sur les opérations fréquentes ;
- produire une première instance hébergée reproductible ;
- centraliser logs, métriques et sauvegardes.

### Horizon 6–12 mois : SaaS et réseau

- automatiser la création d'une officine ;
- déployer le portail d'administration ;
- mettre en place le stockage de documents externalisé ;
- consolider plusieurs sites ;
- proposer les transferts inter-officines ;
- lancer un premier mode hors ligne limité et contrôlé.

### Horizon 12–18 mois : différenciation

- prévision saisonnière ;
- notation des fournisseurs ;
- optimisation commande/transfert ;
- péremption prédictive ;
- mobile étendu ;
- module RH complet ;
- API partenaires documentée.

## 7. Indicateurs de réussite

Le programme doit être évalué par des résultats mesurables :

| Objectif | Indicateur |
|---|---|
| Réduire les ruptures | Taux de rupture et nombre de jours de rupture |
| Améliorer l'anticipation | Part des alertes traitées avant stock zéro |
| Réduire l'immobilisation | Valeur du surstock et couverture médiane |
| Réduire les pertes | Valeur périmée et valeur à risque |
| Fiabiliser le stock | Taux de concordance inventaire/informatique |
| Accélérer le comptoir | Temps médian et P95 d'une vente |
| Améliorer les fournisseurs | Taux de service et délai réel |
| Fiabiliser le SaaS | Disponibilité, erreurs, RTO et RPO testés |
| Réussir l'adoption | Utilisateurs actifs, tâches terminées et tickets support |

## 8. Décision recommandée

Prestige ne doit pas être remplacé uniquement parce que Phénix présente une expérience plus moderne. Le dépôt révèle une richesse métier difficile et coûteuse à reconstruire.

La stratégie recommandée consiste à :

1. **conserver le moteur métier de Prestige** ;
2. **simplifier les parcours critiques** ;
3. **unifier le pilotage du stock autour d'actions** ;
4. **industrialiser progressivement l'hébergement SaaS** ;
5. **ajouter le mobile et le hors-ligne sur un périmètre maîtrisé** ;
6. **mesurer la valeur obtenue avec des indicateurs opérationnels**.

La priorité n'est pas d'ajouter davantage d'écrans. Elle est de rendre les capacités existantes plus simples, plus explicables, plus accessibles et plus fiables.
