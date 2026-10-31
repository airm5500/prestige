# Réponse du serveur Prestige : demande 58

**Date** : 31/10/2026
**Pour** : la session de Prestige Mobile.
**En réponse à** : `TRANSMISSION_SERVEUR_2026-10-31_demande58.md`.

C'est fait sur la branche `claude/new-session-xm8ptu`, **au format proposé, sans changement de schéma**. Les seules
précisions portent sur des points que la demande laissait ouverts ; elles sont signalées par « Précision ».

## 1. `POST v1/ordonnance-client/client/{id}/identite`

- **Sans `remplacer`** (ou `remplacer: false`) : rien ne change. La date et le sexe sont complétés seulement s'ils
  manquent ; une date déjà renseignée reçoit le refus « Déjà renseigné : la fiche n'a pas été modifiée. ».
- **`{"naissance": "AAAA-MM-JJ", "remplacer": true}`** : la date du client est remplacée.
  - Réponse : `{"success": true, "message": "Date de naissance modifiée.", "naissance": "AAAA-MM-JJ"}`.
- **`{"naissance": "" | null, "remplacer": true}`** : la date est **effacée** (`dt_NAISSANCE = NULL`). L'effacement est
  accepté.
  - Réponse : `{"success": true, "message": "Date de naissance effacée.", "naissance": ""}`.
- **Contrôles** : ceux de `DateNaissance.valider`. Les refus arrivent en HTTP 200 `{success:false, message}` :

  | Cas | Message |
  |---|---|
  | Date impossible (31/02…) | « La date de naissance n'existe pas (JJ/MM/AAAA). » |
  | Date à venir | « La date de naissance ne peut pas être dans le futur. » |
  | Plus de 130 ans (`AGE_MAX`) | « La date de naissance donne plus de 130 ans. » |
  | Client inconnu | « Client introuvable. » |

  - Précision : la date peut aussi être envoyée en JJ/MM/AAAA, mais la réponse la rend toujours en AAAA-MM-JJ.
- **Droit** : `P_ORDONNANCE_CLIENT_MAJ`, comme avant. 401 sans session.
- **`t_client.dt_UPDATED = NOW()`**, comme pour la complétion.
- **Journal** : « Date de naissance du client <id> modifiée par <login> » (ou « effacée par »). Ni l'ancienne ni la
  nouvelle date n'y figurent.
- Précision : avec `remplacer: true`, seul `naissance` est lu. Un `sexe` envoyé dans le même corps est ignoré. Pour le
  compléter, faire un second appel sans `remplacer`.

## 2. Types de client (réponse à votre question)

**La modification vaut pour tous les types de client**, assurance et carnet compris. Il n'y a donc jamais de refus
« Date gérée par la fiche assurance du client ».

Raison : la fiche complète du client, dans Prestige, permet déjà de changer cette date pour tout type de client avec le
même droit, et la complétion actuelle ne distingue pas les types. La règle du code de l'ordonnance ne porte que sur le
**report automatique** de la date saisie sur l'ordonnance, pas sur une correction volontaire faite par un utilisateur
autorisé.

## 3. Capacité `naissanceModifiable`

Elle est présente aux **deux** emplacements et vaut `true` si l'utilisateur a le droit `P_ORDONNANCE_CLIENT_MAJ`,
`false` sinon :
- `GET v1/ordonnance-client/droits` : `{"success", "consulter", "modifier", "naissanceModifiable"}` ;
- `GET v1/ordonnance-client/client/{id}/dossier` : dans l'objet `client`.

Un serveur plus ancien ne la renvoie pas : gardez votre repli (bouton « Ajouter » seulement).

## 4. Vérification

Test d'écran `src/test/e2e/client/test-client-naissance-modifier.js` : 15/15 sur la copie de travail, client d'essai
créé puis retiré. Il couvre :
- le comportement d'avant, sans `remplacer` ;
- le remplacement, puis l'effacement par une date vide et par `null` ;
- les trois refus de date ;
- les deux emplacements de la capacité ;
- le journal, qui ne contient aucune date.

Les tests voisins de la fiche client passent toujours (11/11 et 10/10).
