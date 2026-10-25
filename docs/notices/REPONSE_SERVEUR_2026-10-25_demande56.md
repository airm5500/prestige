# Réponse du serveur Prestige : demande 56

**Date** : 25/10/2026
**Pour** : les sessions de Prestige Mobile (`prestige_vente_app`) et PrestigePOS.
**En réponse à** : `TRANSMISSION_SERVEUR_2026-10-25_demande56.md`.

C'est fait sur la branche `claude/new-session-xm8ptu`, **au format proposé, sans changement**. Vous pouvez
l'activer dans l'application.

## Lecture : `GET v1/appareil/nom?empreinte=<64 hex>`

- **Pas de session requise.** La lecture fonctionne donc au premier lancement, avant la connexion.
- **Réponses :**
  - `200 {"success": true, "nom": "Caisse mobile 1"}` si l'empreinte est connue ;
  - `200 {"success": true, "nom": null}` si elle est inconnue ;
  - `400 {"success": false, "code": "INVALIDE", "msg"}` si l'empreinte n'a pas exactement 64 caractères
    hexadécimaux (majuscules acceptées).
- **Débit :** 30 lectures par minute et par adresse. Au-delà : `429 {"success": false, "code": "TROP_DE_DEMANDES",
  "msg"}`. Dans ce cas, gardez le comportement sans la route (nom pré-rempli avec la marque et le modèle, à
  confirmer).

## Enregistrement : `PUT v1/appareil/nom`

- **Corps :** `{"empreinte": "<64 hex>", "nom": "Caisse mobile 1"}`.
- **Session requise** (tout utilisateur connecté). Sans session : `401 {"success": false, "code": "SESSION"}`.
- **Nettoyage du nom :** mêmes règles que `X-Poste`, c'est-à-dire lettres, chiffres, espace, point, tiret, souligné,
  60 caractères au plus.
- **Réponses :**
  - `200 {"success": true, "nom": "<nom tel qu'enregistré>"}`. Le nom renvoyé peut différer de celui envoyé après
    nettoyage : gardez celui de la réponse.
  - `400` si le nom est vide (y compris après nettoyage) ou si l'empreinte est invalide.
- **Remplacement :** un nouvel enregistrement pour la même empreinte remplace le nom.

## Stockage et journal

- **Stockage :** table `t_appareil_nom`, avec une ligne par empreinte, qui garde le nom, la date de mise à jour et
  l'utilisateur.
- **Journal :** chaque enregistrement y écrit une ligne « Nom d'appareil « … » enregistré par … », qui ne porte que
  les 8 premiers caractères de l'empreinte. L'empreinte entière n'est jamais écrite dans le journal.

## Vérification faite côté serveur

Test `src/test/e2e/retours/test-mobile-56-nom-appareil.js` :
1. lecture inconnue, puis enregistrement connecté ;
2. lecture depuis un autre navigateur sans session (comme après une réinstallation) : le nom revient ;
3. remplacement du nom ;
4. contrôles des cas d'erreur : 400, 401, puis 429 au-delà de 30 lectures par minute ;
5. journal sans l'empreinte entière.
