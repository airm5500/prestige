# Réponse du serveur Prestige — demande 63 (19/11/2026)

**Pour** : la session des applications Prestige Mobile 4.14.0+45 et PrestigePOS 1.12.0+31.
**Branche** : `correctif/demande63-1911` (partie de `integration/recette-2026-10-29`, f0282bf06). Pas encore
fusionnée : la fusion se fait après validation du pharmacien.

## 1. Image du ticket : `GET v1/vente/ticket/{type}/{id}/image?largeur=58|80&dpi=203` (P1) — fait

- Types : `vno` (comptant, différé compris), `vo` (assurance, carnet), `prevente` (ticket de prévente avec QR code).
- Réponse : `{success:true, largeur:58|80, dpi, tickets:[{modele, png, largeurPoints, hauteurPoints}]}`.
  - `png` : PNG en base64, niveaux de gris, fond blanc, à imprimer tel quel.
  - `largeurPoints` : 384 en 58 mm, 576 en 80 mm à 203 dpi (largeur imprimable 48 / 72 mm).
  - Largeur demandée : 57 ou moins → 58 ; au-dessus de 58 → 80 (100 → 80). Absente → 80.
  - `dpi` : 203 par défaut ; accepté de 100 à 600.
  - `tickets` : dans l'ordre d'impression du poste (vente assurance à deux organismes comprise).
- Construction : le même chemin que la réimpression du poste (`ticket/vno/{id}`, `ticket/vo/{id}`,
  `ticket/prevente/{id}`), au nouveau modèle et avec les réglages du menu « Modèles de ticket » pour la largeur
  demandée. Lecture seule : rien en base, rien vers l'imprimante du serveur.
- L'image garde 1 point de bord de chaque côté (le cadre du net dépassait d'un demi-trait) et finit sous le dernier
  élément dessiné.
- Refus :
  - sans session : 401 ;
  - type inconnu : 400 `{success:false, msg}` ;
  - vente inconnue, ou vente sans mouvement de caisse (vente non terminée) : 200 `{success:false, msg}`.
  - Pas de 403 : la réimpression du poste n'exige que la session, la route suit la même règle.
- **1d. Date de déploiement en officine** : à fixer par le pharmacien après validation de la branche ; nous vous la
  transmettrons. Gardez le gabarit local jusque-là (404 / 405 → gabarit local, comme prévu).

## 2. Droit `P_REMISE_VENTE`, « Remise sur une vente » (P1) — fait

- Migration `V7.6.41.1912__droit_remise_vente.sql` : crée le droit et le donne à **tous les rôles existants**.
  Jusqu'ici, tout compte connecté pouvait remiser : personne ne perd donc la remise au déploiement. Le pharmacien le
  retire ensuite aux rôles qui ne doivent pas remiser (Gestion des rôles). Un rôle créé plus tard ne l'a pas.
- `POST v1/vente/remise` (et `v2/vente/remise`) : 401 sans session ; 403 `{success:false, interdit:true,
  msg:"Droit manquant : Remise sur une vente"}` sans le droit.
- `GET v1/user/droits` le liste (droits de la session, lus à la connexion : se reconnecter après un changement de
  rôle).
- Au poste : le refus affiche « Droit manquant : Remise sur une vente » (ventes, ventes en dépôt, devis).

## 3. « Sans remise » quand le client a une remise sur sa fiche (P2) — question au pharmacien

- Règle actuelle gardée en attendant sa réponse : vente assurance / carnet sans remise → la remise de la fiche du
  client s'applique.
- `remiseId:"0"` est déjà compris comme « sans remise » par `vente/remise` et `net/vno` ; pour l'assurance, il ne
  retire pas encore la remise de la fiche. Nous vous dirons si la règle change.

## 4. `net/vno` sans `remiseId` (information) — inchangé

## 5. Réponse de `vente/remise` (P2) — fait

- `remiseId` inconnu → `{success:false, msg:"Cette remise n'existe pas (ou plus) : choisissez une remise de la
  liste."}` ; la vente n'est pas touchée.
- Vente terminée, annulée ou supprimée → `{success:false, msg}` (même message que l'ajout d'un produit à une vente
  terminée) ; la vente n'est pas touchée.
- Vente inconnue → `{success:false, msg:"Cette vente n'existe plus : …"}`.
- `remiseId` vide ou `"0"` → sans remise.
- Vente au comptant : `data` = le net recalculé, identique à `data` de `net/vno` (pas de second appel).
- Vente assurance / carnet : pas de `data` (le calcul a besoin des tiers payants et des bons) : appelez
  `net/assurance` comme aujourd'hui.

## Tests

- `ImageImprimanteCoherenceTest` (unitaire) : chaque modèle de ticket, largeurs 57 / 58 / 80 / 100, résolutions
  tirées au hasard (graine fixe) : largeur = 48 ou 72 mm × dpi / 25,4 (384 / 576 à 203 dpi), fond blanc, rien
  coupé (le même dessin sur une image plus grande ne déborde ni à gauche, ni à droite, ni en bas), hauteur qui suit
  la résolution.
- `test-demande63-1911.js` (écran et API, domain3) : 31/31 sur la branche ; 4/12 sur l'ancien code
  (route absente : 404). Couvre les largeurs 58 / 80 / 57 / 100 (dimensions lues dans le PNG), le rapprochement des
  tickets avec l'aperçu du poste (vno, vo à deux organismes), le QR de la prévente (trois motifs de repérage, aucun
  sur un ticket de vente), 401 / 400, le bilan (rien en base, aucun travail d'impression), le droit (403, absent de
  `user/droits`, message à l'écran de vente, droit rendu) et les refus de `vente/remise` (net renvoyé = `net/vno`,
  net = montant − remise, « 0 » = sans remise).
- Non-régression : repro-vo-remise 9/9, repro-remise-caisse 8/8, rapprochement-ticket 19/19, ticket-differe 14/14,
  modeles-ticket-date 10/10, une-ligne-cochee 23/24 (même échec sur l'ancien code : mesure absente du journal).
