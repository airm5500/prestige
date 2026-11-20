# Réponse du serveur Prestige : demandes 67 et 68 (20/11/2026)

**Pour** : la session de l'application Prestige Pharmacien 3.16.0+56.
**État** : fait sur la branche `correctif/demandes67-68-2011`. Elle n'est pas encore fusionnée dans
`integration/recette-2026-10-29` : la fusion se fera après validation du pharmacien. Nous vous transmettrons la date
de déploiement en officine.

Aucune réponse existante ne change.

## Demande 67 : `GET v1/ca-credit`, pagination et totaux côté serveur

### Ce qui ne change pas

Sans `limit`, la réponse reste la liste d'aujourd'hui : mêmes objets, même ordre, octet pour octet. Si `query` ou
`tiersPayant` est donné sans `limit`, la liste est filtrée, mais elle reste une liste.

### Avec `limit`

```json
{ "total": 3680, "montant": 33041849, "clients": 2757, "tiersPayants": ["…"], "data": [ … ] }
```

Paramètres :
- **`start`** : début de la page. Absent ou négatif : 0.
- **`limit`** : taille de la page. Avec `limit=0`, la réponse ne contient que les totaux, et `data` est vide.
- **`query`** : recherche « contient », sans tenir compte de la casse, sur :
  - le nom du client ;
  - le nom de l'ayant droit ;
  - le numéro de facture (`numFacturation`, qui vaut « 0 » si la part n'est pas facturée) ;
  - le libellé du tiers payant.
- **`tiersPayant`** : le libellé, sans tenir compte de la casse ni des espaces autour, ou l'identifiant
  (`tiersPayantId`). En base, certains libellés commencent par une espace, par exemple « VITALIS NSIA » : vous pouvez
  envoyer le libellé tel quel ou sans les espaces.

Contenu de la réponse :
- **Ordre** : date (`mvtDate`) décroissante, puis numéro de facture (ordre alphabétique).
- **`total`, `montant`, `clients`** : calculés sur toutes les lignes retenues par les filtres, pas seulement sur la
  page. `clients` compte les clients distincts : par identifiant, ou par nom quand l'identifiant manque.
- **`tiersPayants`** : les libellés distincts de toute la période, avant `query` et `tiersPayant`, triés.
- **`data`** : les mêmes objets que la liste, avec les mêmes champs : `mvtDate`, `tiersPayantId`,
  `tiersPayantLibelle`, `numFacturation`, `clientId`, `clientName`, `ayantDroitId`, `ayantDroitName`, `montant`.

### Délai : à lire avant de régler le défilement

Le serveur lit toujours toute la période, puis il découpe la page. Mesures sur la copie de travail, pour octobre
(3 680 lignes) :

| Appel | Délai |
|---|---|
| Première page | 12 à 16 s |
| Pages suivantes | environ 10 ms |

Les pages suivantes sont rapides parce que la période lue est gardée 60 secondes par le serveur, pour la même
`dtStart` et la même `dtEnd`. Les recherches et le filtre par tiers payant utilisent aussi cette période gardée.

Une première page sans `query` ni `tiersPayant` (`start` à 0 ou absent) relit toujours la base. Tirer pour rafraîchir
donne donc des chiffres à jour.

La lenteur de la lecture elle-même (environ 12 s pour un mois chargé) existait déjà avant ce changement. Elle n'est
pas traitée ici : le gain porte sur le transfert et sur le décodage côté téléphone.

## Demande 68 : `GET v1/tableau-bord/tva`

- **Paramètres** :
  - `date` : le jour, au format `AAAA-MM-JJ`. Absent ou invalide : aujourd'hui.
  - `frais` : 1 pour recalculer.
- **Période** : du 1er du mois de `date` jusqu'à `date`.
- **Réponse** :

  ```json
  { "success": true, "data": [ { "taux": 0, "ht": …, "tva": …, "ttc": … }, { "taux": 9, … }, { "taux": 18, … } ] }
  ```

  Une ligne par taux, triée par taux croissant.
- **Montants** : ce sont exactement ceux de `api/v3/tvas` avec `typeVente=TOUT` sur la même période. La route reprend
  le même calcul et les mêmes paramètres, avec l'emplacement du compte connecté.
- **Cache** : 3 minutes, comme `top-mois`.

  Un écart avec la demande : la clé du cache est `tva|<jour>|<emplacement>`, et non `tva|<mois>|<emplacement>`. Avec
  une clé par mois, une demande portant sur le 10/11 aurait pu recevoir les chiffres calculés pour le 20/11. Pour
  l'application, qui demande le jour même, cela ne change rien.
- **Sans session** : le filtre de sécurité commun répond « Veuillez vous connecter », comme pour les autres routes.

## Tests

- **`test-demandes67-68-2011.js`** (API, vraie session, domain3, copie de travail) : 19/19. Sur l'ancien code, il
  échouait dès la première page demandée.
  - **67** :
    - sans paramètre, la liste est inchangée ;
    - rapprochement avec la base : le nombre de lignes et le montant de la liste (3 680 lignes, 33 041 849) sont égaux
      à un calcul SQL indépendant ;
    - période vide : total 0 ;
    - `limit=50` donne 50 lignes, avec le total et le montant de toute la liste ;
    - les pages mises bout à bout redonnent la liste triée, avec les mêmes objets ;
    - la dernière page contient le reste (30 lignes) ;
    - `tiersPayants` (191) et `clients` (2 757) sont justes ;
    - `query` et `tiersPayant` combinés donnent le même résultat qu'un filtre recalculé ;
    - le filtre par identifiant donne le même résultat que par libellé ;
    - la page suivante est servie par la période gardée ;
    - rien n'est écrit en base.
  - **68** :
    - sur octobre, les montants sont égaux à ceux de `api/v3/tvas`, taux par taux : 0 %, 9 % et 18 %, pour un TTC de
      134 258 733 ;
    - le second appel est servi par le cache ;
    - `frais=1` recalcule ;
    - sans session, la route refuse.
- **`PageCaCreditCoherenceTest`** : 5 000 périodes tirées au hasard, avec une graine fixe. Il vérifie :
  - le total, le montant et les clients ;
  - les tiers payants avant filtre ;
  - que les pages mises bout à bout redonnent les lignes filtrées et triées ;
  - qu'aucune page ne dépasse `limit` ;
  - qu'au-delà du total, la page est vide ;
  - qu'un libellé entouré d'espaces est bien trouvé ;
  - que la liste d'origine n'est pas modifiée.
- **`TvaTableauBordCoherenceTest`** : 10 000 réponses tirées au hasard, avec les noms réels des champs de `TvaDTO`
  (« TAUX », « Total HT », « Total TVA », « Total TTC »). Il vérifie qu'il y a une ligne par taux, que les sommes sont
  conservées et que ttc = ht + tva.
