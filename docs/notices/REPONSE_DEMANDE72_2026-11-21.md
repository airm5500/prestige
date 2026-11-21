# Réponse à la demande 72 : confirmation JSON de la saisie d'inventaire (21/11/2026)

**De** : l'équipe du serveur Prestige.
**Pour** : Prestige Inventaire V3 5.0.3.
**Code** : branche `correctif/demande72-2111`, à partir de l'intégration `2f609bc4a`. Elle n'est pas encore fusionnée,
ni livrée en officine.

Merci pour l'analyse : elle est exacte. Avec le seul code 200 sans corps, un intermédiaire qui répond 200 sans corps
ne se distinguait pas de Prestige. Nous confirmons aussi votre lecture de l'idempotence : la saisie pose la quantité
totale, un renvoi ne crée pas de doublon.

## Ce qui change

`PUT v1/ws/inventaires/details`, quand la quantité est enregistrée, répond désormais :

```
HTTP 200
Content-Type: application/json

{"success":1,"id":118468,"quantite":7}
```

- `id` est l'id de la ligne reçu, écrit en entier exact (aussi au-delà de 2^53) ;
- `quantite` est la quantité enregistrée en base, relue sur la ligne après écriture ;
- le corps porte ces trois clés, et rien d'autre.

**Inchangé** :
- 400 `QUANTITE_INVALIDE` ;
- 404 `LIGNE_INCONNUE` ;
- 409 `INVENTAIRE_CLOTURE` ;
- 401 sans session (filtre de session) ;
- l'écriture elle-même : quantité totale, auteur, heure.

Les refus portent toujours `success: 0`, jamais `1`.

Aucune autre route ne change. `POST inventaire/ligne/quantite` et `POST inventaire/{id}/versement` confirmaient déjà
en JSON.

## Pour une version suivante de l'application

Une fois ce serveur déployé partout, l'application pourra exiger ce corps. Aucun indicateur dédié n'est ajouté à la
connexion pour l'annoncer. Si vous en voulez un, dites-le-nous : un champ dans la réponse de `user/auth` est le plus
simple.

## Tests

Chaque nouveau test a d'abord échoué sur l'ancien code.

- **`ConfirmationSaisieInventaireTest`** (unitaire, cohérence) : 20 000 cas tirés au hasard (graine 72) et des cas
  limites (quantité 0, id au-delà de 2^53, `Long.MAX_VALUE`). Le corps se relit en JSON, avec exactement
  `success`, `id`, `quantite`. `success` vaut 1 ; l'id est celui reçu, écrit en entier exact ; la quantité est celle
  enregistrée.
- **Test d'écran `test-demande72-2111.js`**, par la route de l'application avec une vraie session (`v1/user/auth`),
  sur un inventaire ouvert du banc : 22/22. Sur l'ancien code, toutes les saisies échouent (corps vide).
  - Quatre lignes, quantités 0, 1, 7 et 23, puis 1 250 et un renvoi identique sur la première. Chaque réponse est
    200, `application/json`, `{success:1, id, quantite}` égaux à l'envoi.
  - Rapprochement : réponse du PUT = base (`int_NUMBER`, auteur) = liste de l'application (`detailsAll`,
    `quantiteSaisie`, `auteurLogin`).
  - Refus inchangés : 401 sans session, 404, 400 (quantité négative ou absente), 409 sur inventaire clôturé. Rien
    n'est écrit.
  - Bilan : seules les quatre lignes saisies changent. Tout est remis à l'identique (`CHECKSUM` de
    `t_inventaire_famille`, `t_inventaire`, `t_famille_stock`, `mvttransaction`).
- **Non-régression** :

  | Test | Résultat |
  |---|---|
  | `test-inventaire-saisie-cloture.js` | 6/6 |
  | `test-inventaire-etat-rayons.js` | 11/11 |
  | `test-inventaire-creation-produits.js` | 16/16 |
  | `test-inventaire-lecture-panne.js` | 3/3 |
  | `test-licence-mobile.js` | 11/11 |
  | Tests unitaires d'inventaire | Tous passent |

## Limites

- Le comportement des anciens terminaux (5.0.2 et avant) devant ce corps n'est pas testé ici. Votre transmission
  indique qu'ils ne lisent que le code.
- Le test d'écran tourne sur le banc, pas sur la copie d'appaul : la route n'a pas de lecture lourde.
