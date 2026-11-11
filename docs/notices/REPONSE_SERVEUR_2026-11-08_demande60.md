# Réponse du serveur — demande 60 : voir les suggestions de réserve (08/11/2026)

Pour Prestige Mobile. Demande d'origine : `TRANSMISSION_SERVEUR_2026-11-08_demande59.md`, section « Demande 60 ».

## Ce qui est livré

### Droit

- **Code :** `P_RESERVE_SUGGESTION`.
- **Libellé :** « RÉSERVE - Voir et ouvrir les suggestions de réserve (onglet Suggestions, mobile) ».
- **Migration :** V7.2.70, idempotente.
- **Qui le reçoit :**
  - les rôles qui ont le menu « Gestion des réserves » (`P_SM_RESERVE`) ;
  - les rôles qui ont `P_TRAITER_RESERVE`, car ils ouvraient déjà les suggestions sur le mobile ;
  - le rôle du compte `admin`.

  Personne ne perd ce qu'il voyait la veille. Le pharmacien retire ensuite le droit aux profils de son choix.

### Capacité

`GET v1/reserve/droits` renvoie désormais :

```json
{ "success": true, "traiter": true, "annulerMouvement": false, "voirSuggestions": true }
```

- `voirSuggestions` vaut la présence du droit dans la session (test de rapprochement).
- Mise à jour du 11/11 (demande 61) : si le droit n'existe pas (actif) en base, `voirSuggestions` vaut `true` et
  aucune route ne le contrôle. C'est le comportement d'avant la demande 60, le même que la clôture d'un BL.
- Champ absent (serveur plus ancien) : garder le comportement actuel.
- Les droits sont lus à la connexion. Un droit retiré prend effet à la connexion suivante.

### Routes refusées sans le droit

Réponse : `403 {"success": false, "interdit": true, "msg": "Droit manquant : Voir les suggestions de réserve"}`. Ce
n'est jamais un 401 : ne pas déconnecter l'utilisateur.

| Lectures | Actions sur une suggestion existante |
|---|---|
| `GET liste` | `PUT {id}/ouvrir`, `PUT {id}/liberer` |
| `GET en-attente`, `GET en-attente/count` | `PUT {id}/traiter`, `PUT {id}/reessayer` |
| `GET {id}` | `PUT ligne/{id}/quantite`, `POST {id}/lignes`, `DELETE ligne/{id}` |
| `GET produits` | `DELETE {id}`, `PUT {id}/controler`, `POST {id}/inventaire` |
| `GET {id}/compte-rendu`, `GET {id}/compte-rendu/excel` | `PUT ligne/{id}/annuler`, `PUT {id}/annuler` |

Toutes ces routes sont sous `v1/suggestion-reserve/`.

Ordre des contrôles sur les actions :

1. le droit de traiter la réserve (`P_TRAITER_RESERVE` ou `P_SM_RESERVE`), message « Droit manquant : Traiter la
   réserve » ;
2. puis `P_RESERVE_SUGGESTION`.

Le droit seul suffit pour lire, pas pour agir.

### Restent permis sans le droit

Décision du pharmacien du 08/11.

- `POST creer` et `POST creer-depuis-recherche` : soumis seulement au droit de traiter la réserve.
  - La réponse garde `{lg_SUGGESTION_RESERVE_ID, str_REF}`.
  - Sans `voirSuggestions`, afficher « Demande <str_REF> créée : elle sera traitée par une personne habilitée » et ne
    pas ouvrir la suggestion : les routes de lecture et d'ouverture répondent 403.
- `GET motifs`.

### Autres points d'accès filtrés

| Route | Sans le droit |
|---|---|
| `GET v1/notifications-centre/catalogue` | sans la catégorie `reserve` |
| `GET v1/notifications-centre/compteurs` | sans la clé `reserve` |
| `GET v1/tableau-bord/alertes` | sans `suggestionsReserve` ni `suggestionsRayon` |
| `GET v1/tableau-bord/alertes/liste?type=rayon` | 403 |

## Web

Sans le droit :

- l'onglet SUGGESTIONS de « Gestion des réserves » est masqué ;
- la catégorie « Suggestions de réserve » est masquée dans la cloche et dans « Choisir les notifications » ;
- les deux lignes « Sugg. réserve » et « Sugg. rayon » sont masquées dans le tableau de bord ;
- après une création, le message « Demande … créée » remplace l'ouverture de la suggestion.

Un profil qui a le droit ne voit aucun changement.

## Fenêtre « Réserve après entrée » (mise à jour du 11/11, demande 61)

Cette notice disait, le 08/11, que la fenêtre n'était pas traitée. Ce n'est plus vrai depuis la fusion : c'est le code
qui fait foi. À la clôture d'un BL, le champ `reserve` est vide (`[]`) pour un profil sans le droit ; la suggestion est
créée quand même. Si le droit n'existe pas en base, tout le monde voit les lignes, comme avant.
Test : `test-reserve-apres-entree-droit-suggestions`.
