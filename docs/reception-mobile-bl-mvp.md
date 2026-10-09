# Réception mobile des bons de livraison — MVP

**Version :** 1.0  
**Date :** 9 octobre 2026  
**Statut :** cadrage fonctionnel initial à valider.

## 1. Objectif

Permettre à un ou plusieurs employés de contrôler rapidement un bon de livraison depuis un téléphone, avec le minimum de saisie manuelle et des contrôles empêchant les erreurs les plus graves.

Le MVP doit permettre de :

- ouvrir un BL importé du grossiste ou créer un BL reçu sur papier ;
- reconnaître un produit par CIP, EAN, code interne ou nom ;
- extraire le lot et la péremption depuis un GS1 DataMatrix ;
- utiliser une photo OCR recadrée lorsque le DataMatrix est absent ou incomplet ;
- saisir la quantité reçue en boîtes ;
- travailler à plusieurs sur le même BL ;
- signaler immédiatement un produit ou un lot déjà traité ;
- regrouper les anomalies avant la validation finale ;
- alimenter le stock seulement après validation du BL.

## 2. Décisions métier validées

| Sujet | Décision MVP |
|---|---|
| Origine du BL | Import grossiste ou document papier reçu à la livraison |
| Unité de réception | Boîte |
| Péremption courte | Confirmation obligatoire, sans blocage systématique |
| Rapport péremption courte | Oui, généré automatiquement |
| Travail collaboratif | Oui, plusieurs employés sur le même BL |
| Produit déjà traité | Signalement immédiat avec auteur, lot et quantité |
| Comptage par scans répétés | Optionnel et désactivé par défaut |
| Mise à jour du stock | Seulement après validation finale |

## 3. Parcours utilisateur

```text
Ouvrir le BL
→ scanner le produit
→ reconnaître le produit
→ scanner le DataMatrix
→ sinon photographier LOT/EXP
→ saisir ou confirmer la quantité
→ valider la ligne
→ passer immédiatement au produit suivant
→ traiter les anomalies
→ valider le BL
```

Les lignes conformes ne doivent provoquer aucune fenêtre supplémentaire. Seules les erreurs et anomalies nécessitent une action.

## 4. Création de la session de réception

### 4.1 BL importé du grossiste

Prestige importe au minimum :

- fournisseur ;
- numéro du BL ;
- date ;
- produits ;
- quantités en boîtes ;
- prix, lorsqu'ils sont disponibles.

Le BL importé reçoit le statut `IMPORTE`. Il ne modifie pas encore le stock.

### 4.2 BL papier

L'utilisateur renseigne :

- fournisseur ;
- numéro du BL ;
- date du BL.

Le système refuse un doublon portant le même fournisseur et le même numéro de BL.

### 4.3 Statuts

```text
IMPORTE
EN_CONTROLE
A_VERIFIER
VALIDE
ANNULE
```

## 5. Reconnaissance du produit

L'écran s'ouvre directement sur la caméra.

Ordre de recherche :

1. GS1 DataMatrix ;
2. EAN fabricant ;
3. CIP ;
4. code interne Prestige ;
5. recherche par nom.

Si le premier scan est un DataMatrix complet, Prestige extrait immédiatement produit, lot et péremption et passe à la quantité.

Si le premier scan est un CIP ou un EAN simple, Prestige reconnaît le produit puis demande le DataMatrix ou la photo LOT/EXP.

Après reconnaissance, afficher :

```text
Nom du produit
Dosage et présentation
CIP / EAN
Quantité prévue sur le BL
Quantité déjà contrôlée
Quantité restant à contrôler
```

## 6. Lecture du DataMatrix

Prestige doit interpréter au minimum :

```text
AI (01) : GTIN
AI (10) : lot
AI (17) : péremption
AI (21) : série éventuelle
```

Contrôles :

- le GTIN correspond au produit reconnu ;
- le lot n'est pas vide ;
- la date est valide ;
- le lot n'est pas périmé ;
- le code n'a pas déjà été utilisé lorsqu'il contient une série.

Une incohérence entre le produit initial et le GTIN du DataMatrix est bloquante.

## 7. OCR LOT/EXP

Si le DataMatrix est absent ou incomplet, l'utilisateur photographie uniquement la zone utile.

```text
┌─────────────────────────────────┐
│ Placez LOT et EXP dans ce cadre │
│                                 │
│ LOT AB25K012    EXP 08/2028     │
└─────────────────────────────────┘
```

Les zones extérieures au cadre sont ignorées.

L'écran de confirmation affiche :

```text
Lot détecté       AB25K012       96 %
Péremption        08/2028        92 %
```

Actions :

```text
[ CONFIRMER ] [ CORRIGER ] [ REPRENDRE LA PHOTO ]
```

Une saisie manuelle reste toujours disponible.

## 8. Contrôles de date

### Bloquants

- date déjà dépassée ;
- format impossible ;
- date de fabrication reconnue comme péremption ;
- année manifestement incohérente.

### Avec confirmation

- péremption inférieure au seuil de l'officine ;
- score OCR insuffisant ;
- jour absent et date normalisée au dernier jour du mois.

Exemple :

```text
EXP 08/2028 → 31/08/2028
```

## 9. Péremption courte

Paramètre initial proposé :

```text
Péremption courte si durée restante < 6 mois
```

Message :

```text
PÉREMPTION COURTE
Ce lot expire dans 82 jours.
Quantité : 24 boîtes.

[ ACCEPTER ] [ REFUSER ] [ CORRIGER LA DATE ]
```

Une acceptation conserve :

- utilisateur ;
- date ;
- produit ;
- lot ;
- péremption ;
- quantité ;
- fournisseur ;
- BL ;
- motif facultatif ou obligatoire selon paramètre.

## 10. Quantité

L'unité enregistrée est toujours la boîte.

### 10.1 Saisie directe — mode par défaut

La quantité du BL importé est préremplie :

```text
Quantité BL : 24
Quantité physique : 24

[ CONFIRMER 24 ]
```

### 10.2 Aide au conditionnement

```text
Cartons : 3
Boîtes par carton : 24
Boîtes isolées : 5
Total enregistré : 77 boîtes
```

### 10.3 Scans répétés

Option désactivée par défaut. Chaque scan identique ajoute une boîte.

Prévoir :

- son ;
- vibration ;
- compteur visible ;
- protection contre le double scan très rapproché ;
- bouton « Annuler le dernier scan ».

## 11. Panier de réception

Chaque ligne contient :

- produit ;
- lot ;
- péremption ;
- quantité BL ;
- quantité physique ;
- écart ;
- utilisateur ;
- statut de contrôle.

Statuts de ligne :

```text
NON_CONTROLEE
EN_COURS
CONFORME
AVERTISSEMENT
BLOQUEE
```

## 12. Travail collaboratif

Plusieurs employés rejoignent la même session de réception.

Afficher :

- participants connectés ;
- progression totale ;
- produit actuellement traité par chacun ;
- lignes conformes ;
- anomalies restantes.

### Produit et lot déjà contrôlés

```text
DÉJÀ CONTRÔLÉ
Validé par Awa à 10:42
Lot AB25K012 — 24 boîtes

[ VOIR ] [ AJOUTER UNE QUANTITÉ ] [ ANNULER ]
```

### Même produit, autre lot

Autoriser une nouvelle ligne, avec une simple information sur les autres lots déjà présents.

### Produit actuellement ouvert

Utiliser un verrou temporaire, expirant après inactivité. Il ne doit pas bloquer le traitement d'un autre lot du même produit.

## 13. Anomalies

### Bloquantes

- produit différent entre le premier scan et le DataMatrix ;
- lot périmé ;
- BL déjà validé ;
- code série déjà consommé ;
- quantité nulle ou négative ;
- produit interdit ou rappelé.

### À confirmer

- péremption courte ;
- quantité différente du BL ;
- produit non prévu ;
- lot déjà existant ;
- quantité anormalement élevée ;
- prix différent lorsque le prix est importé.

Les avertissements sont regroupés pour traitement final et ne doivent pas interrompre chaque ligne conforme.

## 14. Fonctionnement hors connexion

Une réception peut continuer en brouillon sans réseau.

Le téléphone conserve :

- BL ;
- catalogue minimal ;
- lignes scannées ;
- lots et dates ;
- quantités ;
- identifiants uniques des événements.

En mode hors ligne, afficher un avertissement sur le risque de doublons entre participants.

À la reconnexion :

- synchroniser ;
- dédupliquer ;
- fusionner produit + lot identiques uniquement après contrôle ;
- conserver séparément les lots différents ;
- soumettre les conflits au validateur.

## 15. Validation finale

La validation finale affiche :

```text
Nombre de produits attendus
Nombre de produits contrôlés
Produits non reçus
Produits non prévus
Écarts de quantité
Péremptions courtes
Lots périmés ou bloqués
Écart financier si disponible
Participants et durée
```

La validation :

1. verrouille le BL ;
2. applique les entrées de stock dans une transaction ;
3. crée ou met à jour les lots ;
4. journalise les mouvements ;
5. conserve les anomalies ;
6. produit les rapports.

## 16. Rapports MVP

### Rapport de réception

- conforme ;
- manquants ;
- excédents ;
- produits non prévus ;
- produits non reçus ;
- lots multiples ;
- prix différents, si disponibles.

### Rapport des péremptions courtes

- fournisseur ;
- BL ;
- produit ;
- lot ;
- péremption ;
- jours restants ;
- quantité ;
- valeur ;
- utilisateur ;
- motif ;
- statut de traitement.

## 17. Privilèges

```text
BL_MOBILE_SCANNER
BL_MOBILE_CORRIGER
BL_MOBILE_ACCEPTER_PEREMPTION_COURTE
BL_MOBILE_VALIDER
BL_MOBILE_VALIDER_AVEC_ECART
```

## 18. Critères d'acceptation

Le MVP est acceptable lorsque :

1. un BL importé ou papier peut être ouvert sur mobile ;
2. un produit est reconnu par CIP, EAN, DataMatrix ou nom ;
3. le DataMatrix extrait lot et péremption ;
4. l'OCR recadré propose des données corrigibles ;
5. la quantité est enregistrée en boîtes ;
6. une péremption courte nécessite une confirmation ;
7. plusieurs utilisateurs peuvent participer ;
8. produit + lot déjà traités sont signalés ;
9. un autre lot du même produit reste autorisé ;
10. le stock n'est modifié qu'à la validation ;
11. les anomalies sont présentes dans les rapports ;
12. la session peut reprendre après une coupure.

## 19. Indicateurs

- temps moyen par ligne ;
- temps total du BL ;
- taux de scans reconnus au premier essai ;
- part des lots obtenus par DataMatrix ;
- part des lots obtenus par OCR ;
- corrections OCR ;
- écarts de quantité ;
- doublons évités ;
- lots sans péremption ;
- réceptions courtes acceptées ;
- conflits collaboratifs ;
- satisfaction utilisateur.

## 20. Hors périmètre MVP

- OCR complet de toutes les lignes du BL papier ;
- reconnaissance vocale ;
- sérialisation obligatoire de toutes les boîtes ;
- génération automatique des réclamations fournisseur ;
- optimisation du rangement ;
- impression avancée d'étiquettes ;
- apprentissage automatique des modèles de BL ;
- statistiques avancées des fournisseurs.

Ces évolutions sont décrites dans le document complet.
