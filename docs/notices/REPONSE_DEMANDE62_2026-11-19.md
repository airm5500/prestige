# Réponse du serveur à la demande 62 (relance du 19/11/2026)

Branche : `correctif/demande62-1911`. Pas encore fusionnée dans l'intégration : la fusion attend la validation de la
session principale.

## Point 1 : retrouver un client rapide par son numéro

- `GET v1/client/lambda?query=…` (recherche des clients standard) cherche le numéro aussi dans l'**adresse**
  (`strADRESSE`), en plus du téléphone et du mobile.
- Espaces, points et tirets sont ignorés des deux côtés : `07 00 00`, `07.00.00` et `070000` donnent le même résultat.
- Les fiches existantes ne sont **pas** reprises : on ne recopie pas l'adresse dans le téléphone. Sur la copie d'essai,
  168 de ces numéros sont déjà portés par d'autres clients, et le téléphone doit rester unique.
- Rien ne change pour l'application : la recherche suffit.

## Point 2 : type 6 par défaut

- Un client rapide créé sans type (`lgTYPECLIENTID` absent, vide ou blanc) est enregistré en client standard (6).
- Un type donné est gardé tel quel.
- Un type inconnu reste refusé, comme avant.

## Point 3a : droit de la borne

- Nouveau droit `P_BORNE_PAIEMENT_MOBILE` (« BORNE - Clôturer une vente payée par mobile money »).
  - Il est créé par migration, **sans être donné à aucun rôle** : chaque officine le donne au rôle de son compte borne.
  - Il apparaît dans `GET v1/user/droits` pour les comptes qui l'ont.
- `POST paiements-mobile` avec `cloturer:true` accepte ce droit, en plus des droits de « Terminer une vente ».
  - Sans aucun de ces droits : `403`, avec `interdit:true`.
  - Avec `cloturer:false` : aucun droit particulier, comme avant.
- Ce droit seul ne permet **pas** de terminer une vente ordinaire au comptoir.

## Point 3b : prévente payée à la borne, terminée au comptoir

Le cas : le paiement est reçu (`statut = paye`), mais la vente n'a pas été clôturée. Soit `cloturer:false`, soit la
clôture automatique a été refusée (voir plus bas).

- **Liste des préventes** (écran Pré-vente et liste de l'écran de vente) : une colonne « Paiement mobile » affiche
  « Payée Wave 4 125 F … ».
- **Reprise au comptoir** :
  - un bandeau affiche « Déjà payée par Wave : 4 125 F · n° … · date » ;
  - le mode est imposé (liste verrouillée) ;
  - le montant reçu vaut le montant payé et n'est pas modifiable ;
  - « Terminer la vente » termine la vente avec ce règlement, **sans redemander l'argent**.
  - Le paiement est ensuite marqué clôturé (« Vente terminée au comptoir »).
- **Garde-fou serveur** :
  - Une clôture qui ne porte pas exactement le montant payé dans le mode de l'opérateur est refusée. Exemple : la vente
    est terminée en espèces.
  - Réponse : `success:false` et `paiementMobile:true`. Le message nomme l'opérateur, le montant et le numéro.
  - Rien n'est écrit en base.
  - Si le net a augmenté, un complément dans un autre mode reste possible.
- `GET ventestats/{id}` renvoie, pour une prévente à encaisser :
  - `paiementMobile` : id, opérateur, `operateurLibelle`, montant, `referenceFournisseur`, date du paiement ;
  - `typeReglementAttente` : 7 pour Orange, 8 pour Moov, 9 pour MTN, 10 pour Wave.

  L'application peut s'en servir pour afficher le même état.

## Point 3c : client de la vente

- La clôture automatique envoie le client de la vente (`clientId`), et non plus le code de l'opérateur.
- La vente clôturée garde son client.

## Limites à connaître

- **La clôture automatique exige une caisse ouverte pour le compte de la borne.**
  - Elle se fait au nom du compte qui a créé le paiement.
  - Sans caisse ouverte, la vente reste une prévente payée, que le comptoir termine (point 3b).
- **Prévente « assurance » payée par mobile money** : elle est signalée (bandeau, colonne), mais le garde-fou ne
  contrôle que la clôture au comptant.

## Tests côté serveur

- **Tests unitaires**
  - `ClientRapideDemande62Test` : type par défaut sur 5 000 saisies, et liste des droits.
  - `ClotureComptoirCoherenceTest` : 20 000 clôtures tirées au hasard, plus des cas fixes.
- **Tests d'écran et d'API**
  - `mobile/test-demande62-1911.js` : points 1, 2, 3a et 3c, par l'API comme l'application.
  - `mobile/test-demande62-comptoir-1911.js` : point 3b à l'écran. Il couvre la liste, la reprise, la vente terminée,
    le rapprochement entre écran, paiement, règlement et vente, le bilan (stock, caisse), le refus en espèces et le
    nettoyage.
