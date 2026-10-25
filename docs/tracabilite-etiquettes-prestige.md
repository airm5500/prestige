# Traçabilité des étiquettes dans Prestige

**Document de cadrage fonctionnel et technique**  
**Date :** 8 octobre 2026  
**Statut :** proposition à valider avec les pharmaciens, responsables stock et équipes techniques.

## 1. Objet

Ce document développe la recommandation suivante :

> Prestige possède déjà un module d’étiquettes et plusieurs moteurs de codes-barres, mais il faut renforcer la liaison explicite **étiquette–lot–mouvement–vente** pour fournir une traçabilité complète, contrôlable et exploitable lors des ventes, inventaires, transferts, péremptions et rappels de lots.

:codex-annotation{index="1"}

L’objectif n’est pas seulement d’imprimer un code-barres. Une étiquette devient réellement traçable lorsque le système peut répondre, de façon fiable, aux questions suivantes :

1. quel produit cette étiquette identifie-t-elle ?
2. à quel lot et à quelle date de péremption se rapporte-t-elle ?
3. où se trouve actuellement le stock correspondant ?
4. de quelle réception provient-il ?
5. quels mouvements a-t-il subis ?
6. quelle vente a consommé le lot ou l’unité ?
7. qui a imprimé, réimprimé, scanné, déplacé ou annulé l’étiquette ?
8. que reste-t-il à isoler lors d’un rappel ?

## 2. État actuel de Prestige

### 2.1 Capacités disponibles

Prestige possède déjà plusieurs éléments utiles :

- une entité `TEtiquette` ;
- un écran de gestion des étiquettes ;
- une API de consultation et de suppression ;
- des impressions unitaires et massives ;
- des générateurs Code 39, Code 128 et DataMatrix ;
- une gestion des produits, emplacements, lots et péremptions ;
- des mouvements de stock, ventes, réceptions, retours et inventaires.

L'entité actuelle rattache directement une étiquette à :

- un produit ;
- un type d'étiquette ;
- un emplacement ;
- un code ;
- une quantité ;
- une date de péremption.

### 2.2 Limites du modèle actuel

La structure actuelle ne démontre pas une relation explicite et obligatoire entre :

```text
Étiquette → Lot → Réception → Mouvement → Vente
```

Les principales limites à traiter sont :

- absence de référence explicite au lot dans `TEtiquette` ;
- date de péremption portée directement par l'étiquette, avec un risque de divergence par rapport au lot ;
- absence d'identifiant de travail d'impression ;
- absence de statut détaillé de l'étiquette ;
- absence d'historique des impressions et réimpressions ;
- absence de relation démontrée entre le code scanné à la vente et le lot décrémenté ;
- absence de sérialisation unitaire optionnelle ;
- absence de journal uniforme couvrant réception, transfert, vente, retour, rappel et destruction ;
- risque de duplication d'un code interne sans contrôle d'unicité métier.

## 3. Niveaux de traçabilité

Prestige doit proposer des niveaux clairement distincts. L'officine choisit le niveau adapté à son activité et à ses obligations.

### 3.1 Niveau 0 — Code produit uniquement

Le code identifie seulement la référence produit :

```text
CIP / EAN → Produit
```

Toutes les boîtes d'un même produit sont interchangeables pour le système.

**Avantages :**

- fonctionnement rapide ;
- aucune réétiquette obligatoire ;
- compatible avec le code du fabricant ou du grossiste.

**Limites :**

- pas de lot exact à la vente ;
- FEFO guidé uniquement visuellement ;
- rappel de lot manuel ;
- inventaire non valorisé par lot.

### 3.2 Niveau 1 — Traçabilité par lot, recommandé

Le code interne identifie :

```text
Produit + Lot + Péremption + Prix applicable
```

Toutes les unités du même lot peuvent porter le même code, mais chaque scan décrémente le lot correspondant.

**Fonctions rendues possibles :**

- sortie FEFO ;
- blocage d'un lot périmé ou rappelé ;
- inventaire par lot ;
- transfert conservant le lot ;
- valorisation du risque de péremption ;
- recherche des ventes alimentées par un lot.

Ce niveau offre le meilleur rapport entre sécurité et simplicité pour la majorité des officines.

### 3.3 Niveau 2 — Sérialisation unitaire

Chaque boîte possède un identifiant unique :

```text
Produit + Lot + Numéro de série unique
```

Deux boîtes du même lot ne possèdent pas le même code.

**Fonctions supplémentaires :**

- parcours complet d'une unité ;
- détection de double vente ou double scan ;
- gestion des produits sensibles ou coûteux ;
- rappel unitaire ;
- preuve précise de réception, transfert et sortie.

**Contraintes :**

- impression et scan de chaque unité ;
- volume de données supérieur ;
- procédures plus exigeantes ;
- risque de ralentissement au comptoir si l'ergonomie est mauvaise.

La sérialisation doit donc rester optionnelle, activable par produit, famille ou réglementation.

## 4. Principes fonctionnels

### 4.1 Une seule source de vérité pour le lot

La date de péremption et le numéro de lot doivent être portés par l'entité lot. L'étiquette ne doit pas posséder une copie indépendante modifiable.

```text
Étiquette → lot_id → numéro de lot, péremption, produit
```

L'étiquette peut conserver un instantané imprimé pour l'audit, mais les décisions de stock doivent utiliser le lot référencé.

### 4.2 Un code stable et non réutilisable

Une valeur de code-barres déjà attribuée ne doit jamais être réaffectée à un autre produit, lot ou numéro de série, même après annulation.

### 4.3 Toute réimpression doit être tracée

Une réimpression peut être légitime, mais elle augmente le risque de double étiquette. Le système doit enregistrer :

- l'étiquette d'origine ;
- l'utilisateur ;
- la date ;
- le motif ;
- le nombre d'exemplaires ;
- l'imprimante ou le poste ;
- l'annulation éventuelle des anciens exemplaires.

### 4.4 Une vente doit consommer un lot déterminé

En mode lot, une ligne de vente doit référencer le lot effectivement scanné. Une quantité globale produit ne suffit plus.

### 4.5 Le FEFO doit guider sans bloquer abusivement

Lorsque plusieurs lots sont disponibles, Prestige propose celui qui périme en premier. Si le vendeur scanne un autre lot, le comportement doit être paramétrable :

- simple information ;
- avertissement avec confirmation ;
- blocage avec privilège de dérogation.

Toute dérogation doit conserver son motif et son utilisateur.

## 5. Modèle de données cible

Les noms sont indicatifs et doivent être alignés sur les conventions SQL du projet.

### 5.1 Table `traceability_label`

```sql
CREATE TABLE traceability_label (
    id                    VARCHAR(40)  NOT NULL,
    barcode_value         VARCHAR(160) NOT NULL,
    product_id            VARCHAR(40)  NOT NULL,
    lot_id                VARCHAR(40)  NULL,
    serial_id             VARCHAR(40)  NULL,
    label_mode            VARCHAR(20)  NOT NULL,
    status                VARCHAR(20)  NOT NULL,
    printed_price         DECIMAL(15,2) NULL,
    printed_expiry_date   DATE NULL,
    print_count           INT NOT NULL DEFAULT 0,
    created_at            DATETIME NOT NULL,
    created_by            VARCHAR(40) NOT NULL,
    invalidated_at        DATETIME NULL,
    invalidated_by        VARCHAR(40) NULL,
    invalidation_reason   VARCHAR(255) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_traceability_barcode (barcode_value)
);
```

Valeurs proposées pour `label_mode` :

```text
PRODUCT
LOT
SERIAL
```

Valeurs proposées pour `status` :

```text
ACTIVE
CONSUMED
INVALIDATED
LOST
DAMAGED
RECALLED
QUARANTINED
```

### 5.2 Table `traceability_serial`

Cette table n'est utilisée que pour les produits sérialisés.

```sql
CREATE TABLE traceability_serial (
    id                  VARCHAR(40)  NOT NULL,
    product_id          VARCHAR(40)  NOT NULL,
    lot_id              VARCHAR(40)  NOT NULL,
    serial_number       VARCHAR(160) NOT NULL,
    current_location_id VARCHAR(40)  NULL,
    status              VARCHAR(20)  NOT NULL,
    received_at         DATETIME NOT NULL,
    sold_at             DATETIME NULL,
    sale_id             VARCHAR(40) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_traceability_serial (serial_number)
);
```

### 5.3 Table `traceability_event`

Le journal doit être append-only : une correction produit un nouvel événement, elle n'efface pas l'événement précédent.

```sql
CREATE TABLE traceability_event (
    id                VARCHAR(40) NOT NULL,
    event_type        VARCHAR(30) NOT NULL,
    label_id          VARCHAR(40) NULL,
    product_id        VARCHAR(40) NOT NULL,
    lot_id            VARCHAR(40) NULL,
    serial_id         VARCHAR(40) NULL,
    quantity          INT NOT NULL,
    source_location_id VARCHAR(40) NULL,
    target_location_id VARCHAR(40) NULL,
    business_type     VARCHAR(30) NULL,
    business_id       VARCHAR(40) NULL,
    user_id           VARCHAR(40) NOT NULL,
    device_id         VARCHAR(120) NULL,
    reason            VARCHAR(255) NULL,
    occurred_at       DATETIME NOT NULL,
    recorded_at       DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_traceability_lot_date (lot_id, occurred_at),
    KEY idx_traceability_business (business_type, business_id),
    KEY idx_traceability_label (label_id)
);
```

Types d'événements proposés :

```text
RECEIVED
LABEL_PRINTED
LABEL_REPRINTED
MOVED
TRANSFERRED
RESERVED
SOLD
SALE_CANCELLED
RETURNED_BY_CUSTOMER
RETURNED_TO_SUPPLIER
COUNTED
ADJUSTED
QUARANTINED
RECALLED
RELEASED
DESTROYED
LABEL_INVALIDATED
```

### 5.4 Table `traceability_print_job`

```sql
CREATE TABLE traceability_print_job (
    id                VARCHAR(40) NOT NULL,
    product_id        VARCHAR(40) NOT NULL,
    lot_id            VARCHAR(40) NULL,
    requested_count   INT NOT NULL,
    printed_count     INT NOT NULL DEFAULT 0,
    status            VARCHAR(20) NOT NULL,
    printer_name      VARCHAR(160) NULL,
    requested_by      VARCHAR(40) NOT NULL,
    requested_at      DATETIME NOT NULL,
    completed_at      DATETIME NULL,
    error_message     VARCHAR(500) NULL,
    PRIMARY KEY (id)
);
```

Cette table empêche une impression massive non contrôlée et permet de reprendre un travail interrompu sans générer de codes concurrents.

## 6. Contenu d'une étiquette

### 6.1 Données lisibles

Une étiquette lot devrait afficher au minimum :

```text
Nom court du produit
Dosage / présentation
Prix public
Lot
Date de péremption
```

### 6.2 Données encodées

Deux stratégies sont possibles.

#### Identifiant opaque recommandé

```text
Code-barres → identifiant interne unique
```

Exemple :

```text
PL26-8F4K-92MQ-7X
```

Le serveur résout cet identifiant vers le produit et le lot.

**Avantages :** code court, stable et difficile à interpréter ou modifier manuellement.

#### Données structurées dans le code

```text
Produit|Lot|Péremption|Prix
```

**Inconvénients :** code plus long, modification difficile, exposition des données et contrôle de format plus complexe.

Pour Prestige, l'identifiant opaque est préférable. Les informations détaillées restent dans la base et peuvent évoluer sans réimpression, sauf lorsque la réglementation impose de les afficher en clair.

### 6.3 Symbologie

- **Code 128** : compact, adapté aux identifiants alphanumériques internes ;
- **DataMatrix** : forte densité et bonne résistance, utile sur de petites étiquettes ;
- **QR Code** : lecture mobile facile, mais parfois trop volumineux ;
- **EAN-13** : à conserver comme code produit officiel, insuffisant seul pour le lot.

Prestige sait déjà générer Code 39, Code 128 et DataMatrix. La cible recommandée est Code 128 par défaut, avec DataMatrix pour les petites surfaces ou les usages réglementés.

## 7. Parcours métier cible

### 7.1 Réception

1. ouvrir le bon de livraison ;
2. sélectionner le produit reçu ;
3. saisir ou scanner le numéro de lot ;
4. saisir la date de péremption ;
5. contrôler la quantité et le prix ;
6. rechercher un lot existant identique ;
7. créer ou compléter le lot ;
8. choisir le mode d'étiquette ;
9. générer le travail d'impression ;
10. imprimer et contrôler un exemplaire ;
11. confirmer la quantité réellement imprimée ;
12. journaliser réception et impression.

Contrôles obligatoires :

- date de péremption postérieure à la date de réception ;
- produit cohérent avec le bon ;
- code de lot non vide en mode lot ;
- absence de code-barres déjà utilisé ;
- nombre d'étiquettes cohérent avec la quantité reçue ;
- autorisation explicite pour une réimpression.

### 7.2 Vente

1. scanner l'étiquette ;
2. résoudre produit, lot et éventuelle série ;
3. vérifier que l'étiquette est active ;
4. vérifier que le lot n'est ni périmé, ni rappelé, ni en quarantaine ;
5. contrôler l'emplacement ;
6. ajouter le produit à la vente ;
7. réserver temporairement la quantité ;
8. à la clôture, consommer le lot et créer l'événement `SOLD` ;
9. en cas d'annulation, restaurer le lot et créer `SALE_CANCELLED`.

### 7.3 Inventaire

Le scan doit présenter :

- produit ;
- lot ;
- péremption ;
- quantité théorique ;
- quantité comptée ;
- différence ;
- valeur de l'écart.

Une étiquette inconnue doit être placée dans une file de correction, jamais rattachée silencieusement à un produit approchant.

### 7.4 Transfert

Un transfert doit conserver :

- produit ;
- lot ;
- série éventuelle ;
- quantité ;
- origine ;
- destination ;
- utilisateur ;
- date d'expédition et de réception.

La réception du transfert confirme ce qui a réellement été reçu et signale les écarts.

### 7.5 Retour client

Avant de réintégrer une boîte :

- vérifier le code ;
- vérifier qu'elle a été vendue par l'officine ;
- vérifier son statut ;
- appliquer les règles sanitaires de retour ;
- réintégrer le lot uniquement si la remise en stock est autorisée.

### 7.6 Rappel de lot

Le workflow doit permettre de :

1. rechercher le lot ;
2. bloquer immédiatement toute vente ;
3. calculer la quantité reçue, vendue, transférée, retournée et restante ;
4. identifier les emplacements concernés ;
5. créer une tâche d'isolement physique ;
6. imprimer la liste des unités ou quantités attendues ;
7. enregistrer la mise en quarantaine ;
8. documenter le retour ou la destruction ;
9. clôturer le rappel avec un compte rendu.

## 8. API cible

### Résoudre un scan

```http
GET /api/v1/tracabilite/etiquettes/{barcode}
```

Réponse indicative :

```json
{
  "success": true,
  "labelId": "...",
  "mode": "LOT",
  "status": "ACTIVE",
  "product": { "id": "...", "cip": "...", "name": "..." },
  "lot": { "id": "...", "number": "LOT-001", "expiryDate": "2028-08-31" },
  "location": { "id": "1", "name": "RAYON" },
  "availableQuantity": 18,
  "saleAllowed": true,
  "warnings": []
}
```

### Créer un travail d'impression

```http
POST /api/v1/tracabilite/impressions
```

### Confirmer l'impression

```http
POST /api/v1/tracabilite/impressions/{id}/confirmer
```

### Réimprimer

```http
POST /api/v1/tracabilite/etiquettes/{id}/reimprimer
```

Le motif doit être obligatoire.

### Historique d'un lot

```http
GET /api/v1/tracabilite/lots/{id}/evenements
```

### Déclarer un rappel

```http
POST /api/v1/tracabilite/rappels
```

### Mettre en quarantaine

```http
POST /api/v1/tracabilite/lots/{id}/quarantaine
```

## 9. Règles de sécurité

### 9.1 Privilèges distincts

Prévoir au minimum :

```text
TRACABILITE_CONSULTER
ETIQUETTE_IMPRIMER
ETIQUETTE_REIMPRIMER
ETIQUETTE_INVALIDER
LOT_CORRIGER
LOT_DEROGER_FEFO
LOT_METTRE_QUARANTAINE
LOT_RAPPEL_GERER
TRACABILITE_EXPORTER
```

### 9.2 Journal non modifiable

Les événements de traçabilité ne doivent pas être supprimables depuis l'interface métier. Une correction ajoute un événement compensatoire.

### 9.3 Protection contre les doublons

- unicité du code-barres ;
- unicité du numéro de série ;
- idempotence des scans mobiles synchronisés ;
- verrou ou contrôle optimiste lors de la consommation du dernier stock ;
- rejet d'une seconde vente d'une série déjà consommée.

### 9.4 Données minimales

Le code ne doit pas contenir de donnée patient. La liaison éventuelle entre une vente et un patient reste protégée par les droits du dossier client.

## 10. Fonctionnement hors connexion

Une étiquette doit rester utilisable pendant une coupure, mais sans compromettre la cohérence.

Le poste conserve localement :

- les codes utiles ;
- le produit ;
- le lot ;
- le statut connu ;
- la péremption ;
- le stock connu ;
- la dernière date de synchronisation.

Chaque scan produit un événement local unique :

```text
device_id + local_event_id
```

Au retour du réseau, le serveur :

1. déduplique l'événement ;
2. vérifie le statut courant ;
3. applique l'opération si elle reste valide ;
4. crée une anomalie si une autre vente a consommé le même numéro de série ou le dernier stock ;
5. ne supprime jamais silencieusement un conflit.

Pour la sérialisation unitaire, une série ne peut être consommée hors ligne que par un seul poste propriétaire ou après réservation préalable, afin d'éviter la double vente.

## 11. Compatibilité avec l'existant

### 11.1 Ne pas casser les étiquettes actuelles

La lecture doit accepter :

1. les codes produit historiques ;
2. les nouvelles étiquettes lot ;
3. les nouvelles séries unitaires.

Le résolveur suit cet ordre :

```text
code traçabilité interne
→ code CIP/EAN produit
→ recherche manuelle contrôlée
```

### 11.2 Migration progressive

Il n'est pas nécessaire de réétiqueter immédiatement tout le stock.

Proposition :

- les anciens produits restent en mode produit ;
- les nouvelles réceptions passent progressivement en mode lot ;
- les produits sensibles peuvent passer en mode série ;
- un inventaire convertit au besoin l'ancien stock en lots identifiés.

### 11.3 Conservation de `TEtiquette`

Deux options :

- enrichir `t_etiquette` avec les nouvelles relations et contraintes ;
- conserver `t_etiquette` pour l'historique et créer un nouveau module `traceability_*`.

La seconde option est plus sûre si les anciens états et JSP dépendent fortement de la table existante. Une façade commune peut présenter les deux modèles à l'écran.

## 12. Indicateurs de pilotage

Le tableau de bord doit suivre :

| Indicateur | Objectif |
|---|---|
| Part du stock rattachée à un lot | Mesurer la couverture de traçabilité |
| Part des ventes avec lot exact | Vérifier l'usage réel au comptoir |
| Lots sans péremption | Identifier les données incomplètes |
| Dérogations FEFO | Détecter les écarts de rangement ou de procédure |
| Réimpressions | Détecter erreurs et risques de double étiquette |
| Scans inconnus | Mesurer la qualité des données et équipements |
| Écarts d'inventaire par lot | Fiabiliser le stock |
| Temps de traitement d'un rappel | Mesurer la capacité de réaction |
| Quantité rappelée retrouvée | Mesurer l'efficacité de la traçabilité |
| Événements hors ligne en conflit | Contrôler la synchronisation |

## 13. Tests indispensables

### Tests unitaires

- génération d'un code unique ;
- résolution produit/lot/série ;
- blocage d'un code invalidé ;
- contrôle de péremption ;
- ordre FEFO ;
- calcul de stock par lot ;
- idempotence d'un événement.

### Tests d'intégration

- réception puis impression ;
- vente puis annulation ;
- transfert puis réception ;
- retour client ;
- rappel de lot ;
- réimpression ;
- inventaire et ajustement ;
- concurrence sur le dernier exemplaire ;
- synchronisation après coupure.

### Tests terrain

- lecteurs de codes-barres utilisés dans les officines ;
- imprimantes thermiques ;
- tailles et qualité des étiquettes ;
- vitesse au comptoir ;
- lisibilité après stockage ;
- comportement sans Internet ;
- formation d'un nouvel utilisateur.

## 14. Critères d'acceptation

Le module peut être considéré comme prêt lorsque :

1. un lot reçu peut être étiqueté sans ressaisie du produit ;
2. le scan retrouve sans ambiguïté le produit et le lot ;
3. une vente décrémente le bon lot ;
4. un lot périmé, rappelé ou en quarantaine est bloqué ;
5. une annulation rétablit correctement le stock ;
6. un transfert conserve la traçabilité ;
7. une réimpression est autorisée, motivée et auditée ;
8. l'historique complet d'un lot est exportable ;
9. un rappel produit une liste des quantités et emplacements concernés ;
10. le scan au comptoir ne dégrade pas perceptiblement le temps de vente ;
11. l'ancien code produit continue de fonctionner ;
12. les droits empêchent une correction non autorisée.

## 15. Feuille de route proposée

### Phase 1 — Cadrage et fiabilisation du lot

- confirmer les usages avec trois à cinq officines ;
- auditer `t_lot`, `t_etiquette`, ventes et mouvements ;
- définir les modes produit, lot et série ;
- imposer une source de vérité pour la péremption ;
- formaliser les privilèges et événements.

### Phase 2 — Étiquette lot

- ajouter les nouvelles tables ;
- développer le résolveur de scan ;
- intégrer réception et impression ;
- rattacher la vente au lot ;
- ajouter le contrôle FEFO ;
- conserver la compatibilité avec les codes historiques.

### Phase 3 — Inventaire, transfert et rappel

- inventaire par lot ;
- transferts traçables ;
- quarantaine ;
- rappel ;
- rapports et exports ;
- tableau de bord de qualité.

### Phase 4 — Hors ligne et sérialisation

- événements idempotents ;
- synchronisation ;
- gestion des conflits ;
- sérialisation pour les produits sélectionnés ;
- validation terrain des performances.

## 16. Risques et mesures de réduction

| Risque | Mesure |
|---|---|
| Ralentissement de la vente | Scan unique, réponse locale rapide et tests P95 |
| Trop d'étiquettes à imprimer | Mode lot par défaut, série seulement si nécessaire |
| Double étiquette | Code unique, journal de réimpression et invalidation |
| Mauvais lot en rayon | Guidage FEFO et inventaire ciblé |
| Divergence lot/étiquette | Lot comme source de vérité |
| Rupture de compatibilité | Résolveur acceptant anciens et nouveaux codes |
| Conflit hors ligne | Identifiants idempotents et résolution explicite |
| Adoption faible | Paramétrage progressif et formation par parcours |
| Fuite de données patient | Aucune donnée patient encodée dans l'étiquette |

## 17. Décision recommandée

Prestige ne doit pas viser immédiatement une sérialisation obligatoire de toutes les boîtes. La cible prioritaire doit être la **traçabilité par lot**, car elle apporte l'essentiel de la valeur :

- FEFO ;
- gestion des péremptions ;
- rappel de lot ;
- inventaire fiable ;
- transferts contrôlés ;
- historique des mouvements.

La sérialisation unitaire doit rester disponible pour les produits ou pays qui la justifient.

La première livraison utile est donc :

> **À la réception, Prestige crée ou sélectionne le lot, génère une étiquette interne unique par lot, puis chaque scan de vente consomme explicitement ce lot et alimente un journal de traçabilité non modifiable.**

Cette évolution valorise les briques déjà présentes sans imposer une réécriture complète du stock, des ventes ou des impressions.
