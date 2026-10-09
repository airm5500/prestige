# Réception mobile des bons de livraison — Vision complète et évolutions

**Version :** 1.0  
**Date :** 9 octobre 2026  
**Horizon :** MVP puis évolutions progressives.

## 1. Vision produit

La réception mobile doit devenir le point d'entrée fiable de tout produit dans Prestige.

Elle ne doit pas être un simple formulaire adapté au téléphone. Elle doit combiner :

- import documentaire ;
- contrôle physique ;
- scan 1D et 2D ;
- OCR ciblé ;
- gestion des lots ;
- contrôle des péremptions ;
- rapprochement commande–BL–livraison ;
- travail collaboratif ;
- fonctionnement hors connexion ;
- traçabilité ;
- préparation du rangement ;
- contrôle financier et fournisseur.

La règle d'expérience utilisateur est :

> **Tout ce qui est conforme s'enchaîne sans interruption. Tout ce qui est incertain est visible et regroupé pour traitement. Tout ce qui est dangereux est bloqué immédiatement.**

## 2. Décisions métier de référence

| Sujet | Décision |
|---|---|
| Origine du BL | Import grossiste ou BL papier |
| Identification initiale | Produit reconnu avant le contrôle lot/péremption |
| DataMatrix | Extraction prioritaire GTIN, lot, péremption et série |
| OCR | Photo recadrée sur LOT/EXP lorsque nécessaire |
| Quantité métier | Boîte |
| Scans répétés | Paramétrables, désactivés par défaut |
| Péremption courte | Confirmation et rapport, sans blocage systématique |
| Collaboration | Plusieurs employés sur le même BL |
| Doublon | Signaler produit + lot déjà traité |
| Mise à jour du stock | Transaction finale après contrôle |

## 3. Architecture fonctionnelle

```text
Source du BL
├── Import extranet/API grossiste
├── Import fichier
└── Document papier
        │
        ▼
Session de réception
├── Participants
├── Lignes attendues
├── Lignes physiques
├── Lots / péremptions
├── Photos et preuves
└── Anomalies
        │
        ▼
Validation
├── Entrée de stock
├── Création/mise à jour des lots
├── Contrôle financier
├── Reliquats et réclamations
├── Étiquettes
└── Rapports
```

## 4. Sources des BL

### 4.1 API ou extranet grossiste

Priorité maximale lorsque le grossiste permet une intégration structurée.

Données souhaitées :

- identifiant fournisseur ;
- numéro et date du BL ;
- commande d'origine ;
- code produit grossiste ;
- CIP/EAN/GTIN ;
- désignation ;
- quantité ;
- prix d'achat ;
- remise ;
- TVA ;
- montant ;
- lot et péremption lorsqu'ils sont fournis.

### 4.2 Fichier fournisseur

Formats :

- CSV ;
- Excel ;
- XML ;
- JSON ;
- format propriétaire paramétrable.

Utiliser un assistant de mapping similaire au correcteur d'importation : correspondance des colonnes, aperçu, anomalies, confirmation.

### 4.3 BL papier

Niveau initial : création manuelle de l'en-tête et construction des lignes par scan.

Niveau avancé : OCR du document complet pour préremplir les lignes avant contrôle physique.

## 5. Cycle de vie

```text
BROUILLON
IMPORTE
EN_CONTROLE
A_VERIFIER
PRET_A_VALIDER
VALIDE
PARTIELLEMENT_VALIDE
ANNULE
EN_LITIGE
```

Chaque transition enregistre :

- utilisateur ;
- appareil ;
- date ;
- ancien statut ;
- nouveau statut ;
- motif.

## 6. Identification du produit

### 6.1 Codes acceptés

- CIP ;
- EAN-13 ;
- GTIN ;
- code fabricant ;
- code grossiste ;
- code interne Prestige ;
- GS1 DataMatrix ;
- texte/recherche par nom ;
- éventuellement reconnaissance visuelle assistée, jamais seule pour valider.

### 6.2 Résolveur unique

Toutes les sources passent par un service unique :

```text
code brut
→ normalisation
→ type de code
→ recherche des correspondances
→ contrôle d'unicité
→ résultat ou file de correction
```

### 6.3 Codes multiples

Un produit peut posséder plusieurs codes actifs avec :

- type ;
- valeur ;
- fournisseur ;
- date de validité ;
- priorité ;
- utilisateur ayant confirmé l'association.

### 6.4 Produit inconnu

Actions :

```text
[ Rechercher par nom ]
[ Associer à un produit ]
[ Créer une fiche provisoire ]
[ Mettre de côté ]
```

Une fiche provisoire n'est pas vendable avant validation de ses données essentielles.

## 7. GS1 DataMatrix

### 7.1 Identifiants pris en charge

```text
(01) GTIN
(10) lot
(17) péremption
(21) série
```

Prévoir un parseur extensible pour les autres Application Identifiers.

### 7.2 Premier scan adaptatif

- DataMatrix complet : produit + lot + péremption en une étape ;
- EAN/CIP : produit reconnu, puis demande du DataMatrix ;
- DataMatrix incomplet : réutiliser les informations valides et demander seulement les données manquantes.

### 7.3 Contrôles

- checksum et format ;
- GTIN connu ;
- cohérence produit ;
- date valide ;
- lot non vide ;
- série non dupliquée ;
- lot rappelé ou bloqué ;
- statut du produit.

### 7.4 Bibliothèque mobile

Le scanner doit lire réellement le GS1 DataMatrix et restituer les séparateurs FNC1. Tester sur les modèles Android utilisés en officine et sur des codes :

- petits ;
- brillants ;
- incurvés ;
- faiblement imprimés ;
- partiellement endommagés.

## 8. OCR ciblé LOT/EXP

### 8.1 Capture guidée

- cadre fixe ;
- contrôle de netteté ;
- contrôle de luminosité ;
- torche automatique proposée ;
- capture automatique lorsque l'image est stable ;
- recadrage local avant analyse.

### 8.2 Lexique

Reconnaître :

```text
LOT, BATCH, BN, LOTE
EXP, EX, PER, EXPIRY, USE BY
MFG, FAB, PROD, DOM
```

### 8.3 Formats de date

- `MM/YYYY` ;
- `MM/YY` ;
- `DD/MM/YYYY` ;
- `YYYY-MM-DD` ;
- mois en lettres ;
- formats configurables par pays/fournisseur.

### 8.4 Confiance

Conserver :

- texte brut OCR ;
- valeur normalisée ;
- confiance globale ;
- confiance par caractère ;
- méthode de correction ;
- utilisateur ayant confirmé.

### 8.5 Confidentialité et stockage

Paramètres possibles :

- supprimer l'image après validation ;
- garder seulement le recadrage en cas d'anomalie ;
- conserver toutes les preuves pendant une durée définie.

## 9. Quantités

### 9.1 Valeur directe

Mode par défaut, avec quantité du BL préremplie.

### 9.2 Assistance cartons

```text
nombre de cartons × boîtes par carton + boîtes isolées
```

Le résultat métier reste exprimé en boîtes.

### 9.3 Scans répétés

- option utilisateur ;
- compteur ;
- son et vibration ;
- délai anti-rebond ;
- annulation du dernier scan ;
- compteur maximal de sécurité ;
- confirmation finale.

### 9.4 Balance ou comptage externe

Évolution possible pour certains produits, uniquement si le matériel et l'unité métier le justifient.

## 10. Collaboration

### 10.1 Participants

- rejoindre par liste, lien ou QR de session ;
- voir les participants actifs ;
- voir la progression ;
- voir les produits en cours ;
- conserver l'auteur de chaque action.

### 10.2 Verrou léger

Clé indicative :

```text
BL + produit + lot éventuel
```

Expiration après inactivité, abandon ou déconnexion.

### 10.3 Doublons

#### Même produit et même lot validés

Avertissement fort avec auteur, heure et quantité.

#### Même produit et autre lot

Autoriser une autre ligne.

#### Même produit en cours

Afficher l'utilisateur et permettre attente, reprise autorisée ou autre lot.

### 10.4 Gros BL

Évolutions :

- attribution par carton ;
- attribution par rayon ;
- attribution des produits froids ;
- équilibrage automatique de la charge ;
- supervision en direct.

## 11. Contrôles de péremption

### 11.1 Règles

- date passée : blocage ;
- date courte : confirmation ;
- date très éloignée : suspicion OCR ;
- date antérieure à la fabrication : blocage ;
- jour absent : dernier jour du mois avec indication ;
- durée minimale configurable par produit, famille ou fournisseur.

### 11.2 Décision

```text
ACCEPTE
REFUSE
ACCEPTE_AVEC_MOTIF
RETOUR_FOURNISSEUR
MISE_EN_QUARANTAINE
```

### 11.3 Suivi après réception

Une péremption courte acceptée crée :

- une ligne de rapport ;
- une alerte persistante ;
- une date de réévaluation ;
- éventuellement une proposition de transfert, retour ou mise en avant.

## 12. Rapprochement commande–BL–physique

Pour chaque ligne :

```text
Quantité commandée
Quantité portée au BL
Quantité physiquement reçue
Quantité acceptée en stock
Quantité refusée
Reliquat
```

Types d'écarts :

- quantité manquante ;
- quantité excédentaire ;
- produit non commandé ;
- produit commandé non reçu ;
- substitution fournisseur ;
- prix différent ;
- remise différente ;
- lot refusé ;
- péremption courte.

## 13. Contrôle financier

### 13.1 Prix

Comparer :

- prix commandé ;
- prix du BL ;
- dernier prix d'achat ;
- prix moyen pondéré ;
- prix public ;
- marge avant/après.

### 13.2 Alertes

- augmentation au-delà d'un pourcentage ;
- marge sous le minimum ;
- prix public incohérent ;
- remise attendue absente ;
- TVA différente ;
- total des lignes différent du BL.

### 13.3 Validation séparée

La réception physique peut être terminée alors que le contrôle financier reste à traiter. Prévoir des statuts distincts :

```text
CONTROLE_PHYSIQUE_OK
CONTROLE_FINANCIER_OK
```

## 14. Réclamations, avoirs et reliquats

À partir des écarts, Prestige peut générer :

- une demande d'avoir ;
- une réclamation fournisseur ;
- un reliquat ;
- une nouvelle commande chez un autre grossiste ;
- un retour de lot refusé.

Suivre :

- montant réclamé ;
- réponse fournisseur ;
- avoir reçu ;
- délai de résolution ;
- statut.

## 15. Étiquettes

### 15.1 Réutiliser le code fabricant

Ne pas réétiqueter lorsque le GS1 DataMatrix contient toutes les informations nécessaires et reste lisible.

### 15.2 Imprimer une étiquette Prestige

Si :

- code absent ou illisible ;
- lot non encodé ;
- péremption non encodée ;
- prix public à afficher ;
- besoin interne ou réglementaire.

### 15.3 Moment d'impression

Recommandation : après validation, par lot et regroupé par rayon, plutôt qu'après chaque scan.

### 15.4 Réimpression

Motif, auteur, quantité et ancienne étiquette obligatoirement tracés.

La conception détaillée est décrite dans `docs/tracabilite-etiquettes-prestige.md`.

## 16. Rangement assisté

Après validation, produire une liste priorisée :

1. chaîne du froid ;
2. produits réglementés ou sensibles ;
3. produits en rupture au rayon ;
4. péremptions courtes ;
5. autres produits par rayon.

Afficher l'emplacement habituel et permettre de le corriger.

### Mode chariot

Regrouper les lignes selon l'ordre physique des rayons pour réduire les déplacements.

## 17. Mode mains libres

Évolutions possibles :

- téléphone fixé sur support ;
- capture automatique ;
- lecture vocale du produit et du lot ;
- quantité dictée ;
- commande « suivant », « corriger », « annuler » ;
- casque ou oreillette en environnement bruyant.

La voix reste optionnelle et toute valeur doit être visible avant validation.

## 18. OCR complet du BL

### 18.1 Pipeline

```text
Photo/PDF
→ détection du fournisseur
→ correction perspective
→ OCR
→ détection du tableau
→ extraction lignes
→ mapping catalogue
→ pré-réception
→ contrôle physique
```

### 18.2 Modèles fournisseurs

Enregistrer des profils :

- position des colonnes ;
- formats numériques ;
- codes produits ;
- libellés ;
- totaux ;
- règles de remise et TVA.

### 18.3 Validation

L'OCR ne crée jamais directement le stock. Il prépare les lignes que le contrôle physique valide.

## 19. Hors connexion

### 19.1 Données locales

- catalogue utile ;
- codes ;
- commandes et BL ;
- règles de contrôle ;
- session ;
- événements ;
- photos en attente.

### 19.2 Événements idempotents

```text
device_id + local_event_id
```

### 19.3 Conflits

- même produit + même lot : fusion proposée ;
- lots différents : conserver ;
- BL clôturé ailleurs : bloquer la synchronisation et créer une anomalie ;
- série déjà reçue : rejet ;
- règles modifiées : réévaluation.

### 19.4 Stratégie collaborative dégradée

Lorsque le réseau est mauvais, attribuer des cartons ou rayons afin de réduire les doublons.

## 20. Sécurité et audit

### Privilèges

```text
BL_MOBILE_CREER
BL_MOBILE_IMPORTER
BL_MOBILE_SCANNER
BL_MOBILE_CORRIGER
BL_MOBILE_ACCEPTER_PEREMPTION_COURTE
BL_MOBILE_CONTROLER_PRIX
BL_MOBILE_VALIDER
BL_MOBILE_VALIDER_AVEC_ECART
BL_MOBILE_ANNULER
BL_MOBILE_EXPORTER
```

### Audit

Journaliser :

- ouverture ;
- import ;
- scan ;
- correction OCR ;
- modification de quantité ;
- acceptation d'anomalie ;
- suppression de ligne ;
- validation ;
- annulation ;
- synchronisation et conflit.

Le journal ne doit pas être modifiable depuis l'interface métier.

## 21. Modèle de données conceptuel

### Réception

```text
receipt_session
receipt_participant
receipt_expected_line
receipt_received_line
receipt_anomaly
receipt_attachment
receipt_event
receipt_lock
```

### Relations principales

```text
receipt_session
├── supplier
├── order éventuelle
├── participants
├── expected_lines
├── received_lines
│   ├── product
│   ├── lot
│   ├── quantity
│   └── scanned_by
├── anomalies
└── events
```

### Contraintes

- fournisseur + numéro BL unique ;
- identifiant événement unique ;
- quantité positive ;
- lot obligatoire lorsque le mode l'exige ;
- version optimiste pour les modifications concurrentes ;
- validation transactionnelle.

## 22. API conceptuelle

```http
POST   /api/v1/receptions
POST   /api/v1/receptions/imports
GET    /api/v1/receptions/{id}
POST   /api/v1/receptions/{id}/rejoindre
POST   /api/v1/receptions/{id}/scanner
POST   /api/v1/receptions/{id}/lignes
PUT    /api/v1/receptions/{id}/lignes/{lineId}
DELETE /api/v1/receptions/{id}/lignes/{lineId}
POST   /api/v1/receptions/{id}/verrous
DELETE /api/v1/receptions/{id}/verrous/{lockId}
GET    /api/v1/receptions/{id}/anomalies
POST   /api/v1/receptions/{id}/anomalies/{anomalyId}/resoudre
POST   /api/v1/receptions/{id}/valider
POST   /api/v1/receptions/{id}/annuler
GET    /api/v1/receptions/{id}/rapport
GET    /api/v1/receptions/peremptions-courtes
```

Les événements de synchronisation doivent accepter une clé d'idempotence.

## 23. Notifications

Notifier :

- responsable lorsqu'un BL est prêt ;
- validateur lorsqu'une anomalie exige son privilège ;
- acheteur pour un manquant ou un reliquat ;
- responsable stock pour une péremption courte ;
- support pour des échecs répétés d'import ou synchronisation.

Éviter les notifications par scan ; regrouper par BL et gravité.

## 24. Rapports et tableaux de bord

### Réception

- temps par BL ;
- lignes conformes ;
- écarts ;
- personnes participantes ;
- produits non reconnus ;
- corrections OCR.

### Fournisseurs

- taux de service ;
- manquants ;
- excédents ;
- substitutions ;
- écarts de prix ;
- péremptions courtes ;
- délai de résolution des litiges.

### Qualité des données

- produits sans code ;
- codes en doublon ;
- lots sans péremption ;
- faible confiance OCR ;
- conditionnements incohérents.

## 25. Indicateurs de performance

| Indicateur | Cible initiale à valider |
|---|---:|
| Scan vers résultat local | < 500 ms |
| Ligne standard complète | < 5 secondes hors comptage |
| Reconnaissance code au premier essai | > 95 % |
| DataMatrix correctement interprétés | > 98 % sur codes lisibles |
| Dates OCR sans correction | > 90 % après apprentissage |
| BL validé sans correction postérieure | > 98 % |
| Lots reçus avec péremption | > 99 % |
| Doublons collaboratifs non détectés | 0 |
| Conflits perdus silencieusement | 0 |

## 26. Tests

### Unitaires

- parseur GS1 ;
- formats de date ;
- normalisation lot ;
- règles de péremption ;
- quantités ;
- doublons ;
- idempotence ;
- transitions de statut.

### Intégration

- import grossiste ;
- réception papier ;
- rapprochement commande ;
- lots multiples ;
- travail concurrent ;
- validation transactionnelle ;
- annulation ;
- étiquettes ;
- rapport.

### Mobile

- appareils bas et milieu de gamme ;
- autofocus ;
- torche ;
- veille ;
- rotation ;
- reprise après fermeture ;
- stockage faible ;
- permissions caméra ;
- réseau instable.

### Terrain

- réception réelle avec plusieurs grossistes ;
- emballages brillants ;
- petits DataMatrix ;
- textes LOT/EXP variés ;
- plusieurs utilisateurs ;
- gros BL ;
- utilisateurs novices.

## 27. Accessibilité et ergonomie

- boutons suffisamment grands ;
- contraste élevé ;
- information non dépendante uniquement de la couleur ;
- son désactivable ;
- vibration ;
- police lisible ;
- écran utilisable à une main ;
- actions principales au même emplacement ;
- pas de clavier complet lorsque seul un nombre est requis ;
- retour arrière sans perte.

## 28. Déploiement progressif

### Phase 0 — Observation terrain

- observer plusieurs réceptions ;
- mesurer le temps actuel ;
- collecter emballages et BL ;
- recenser téléphones et scanners ;
- documenter les erreurs fréquentes.

### Phase 1 — MVP mono-utilisateur

- BL importé/papier ;
- scan produit ;
- DataMatrix ;
- saisie manuelle LOT/EXP ;
- quantité ;
- panier ;
- validation.

### Phase 2 — OCR ciblé et contrôles

- cadre LOT/EXP ;
- confiance ;
- péremption courte ;
- rapports ;
- rapprochement détaillé.

### Phase 3 — Collaboration

- participants ;
- progression temps réel ;
- verrous ;
- doublons ;
- résolution des conflits.

### Phase 4 — Hors ligne

- stockage local ;
- événements idempotents ;
- synchronisation ;
- reprise ;
- conflits.

### Phase 5 — Contrôle financier et fournisseur

- prix ;
- remises ;
- marge ;
- réclamations ;
- reliquats ;
- notation fournisseur.

### Phase 6 — Automatisation avancée

- OCR complet BL ;
- règles apprises par fournisseur ;
- rangement assisté ;
- voix ;
- étiquettes automatiques ;
- sérialisation ciblée.

## 29. Risques

| Risque | Réponse |
|---|---|
| Trop de confirmations | Différer les avertissements non critiques |
| OCR incorrect | Confiance, cadre et confirmation |
| Double réception | Unicité fournisseur + numéro BL |
| Doublon collaboratif | Verrou, temps réel et idempotence |
| Mauvaise date | Règles, lexique MFG/EXP et contrôles |
| Lenteur mobile | Traitement local, catalogue réduit et métriques |
| Réseau instable | Brouillon hors ligne et synchronisation explicite |
| Stock incohérent | Transaction unique à la validation |
| Adoption faible | MVP simple, observation et tests terrain |
| Trop d'étiquettes | Réutiliser le DataMatrix fabricant |
| Surveillance abusive | Activité limitée à l'audit du BL |

## 30. Fonctionnalités supplémentaires possibles

### Photographie de l'état du colis

Conserver une preuve pour carton endommagé, produit cassé ou quantité litigieuse.

### Température à la réception

Pour les produits froids :

- température mesurée ;
- appareil ;
- photo ;
- acceptation ou quarantaine.

### Signature du livreur

Signature ou nom du livreur lors d'un litige constaté immédiatement.

### Géolocalisation facultative

Uniquement si nécessaire pour les réceptions multi-sites, avec finalité et conservation clairement définies.

### Contrôle anti-contrefaçon

Prévoir les connecteurs réglementaires ou industriels lorsqu'ils existent dans le pays, sans prétendre qu'un simple scan interne authentifie le médicament.

### Suggestions de rangement

Priorité selon chaîne du froid, rupture au rayon, péremption et emplacement.

### Analyse de productivité du processus

Mesurer le temps et les causes de blocage du processus, sans transformer le module en outil de surveillance individuelle.

## 31. Questions restant à décider

1. Les prix et remises sont-ils toujours disponibles dans les imports grossistes ?
2. Un produit physique absent du BL peut-il être accepté avec anomalie ?
3. Un produit porté au BL mais non retrouvé crée-t-il automatiquement un reliquat ?
4. Le motif d'une péremption courte est-il obligatoire ?
5. Quelle durée définit une péremption courte ?
6. Qui peut valider un écart de prix ?
7. Quelles photos doivent être conservées et combien de temps ?
8. Quels téléphones constituent le parc minimal supporté ?
9. Faut-il imprimer les étiquettes par produit, lot ou rayon ?
10. Quels fournisseurs peuvent fournir une API ou un format structuré ?

## 32. Décision recommandée

Commencer par un MVP étroit et très rapide :

```text
BL
→ produit
→ DataMatrix ou LOT/EXP
→ quantité en boîtes
→ panier
→ anomalies
→ validation
```

Puis ajouter collaboration, hors-ligne, contrôle financier et OCR complet dans des versions successives mesurées sur le terrain.

La fonctionnalité sera réellement utile si elle réduit simultanément :

- le temps de réception ;
- la ressaisie ;
- les erreurs de produit ;
- les erreurs de lot et de date ;
- les écarts non détectés ;
- les péremptions reçues sans contrôle.

Elle ne doit pas chercher à automatiser toute la réception dès la première version. Elle doit d'abord rendre le geste quotidien évident, rapide et fiable.
