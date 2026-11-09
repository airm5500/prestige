# Réponse du serveur Prestige : demande 59 et retours fournisseurs en attente

**Date** : 08/11/2026
**Pour** : la session de Prestige Mobile.
**En réponse à** : `TRANSMISSION_SERVEUR_2026-11-08_demande59.md` et
`TRANSMISSION_2026-11-07_retours_fournisseur_attente.md`.

C'est fait sur la branche `PRES-/bl-recu-retours-fournisseurs-bdafcc`, avec les migrations `V7.2.60` et `V7.2.61`.
Les points que les demandes laissaient ouverts sont signalés par « Précision ».

Toutes les routes répondent en JSON :

- 401 sans session ;
- 403 `{success:false, interdit:true, msg}` sans le droit ;
- les refus métier arrivent avec leur code HTTP et un `code` stable, comme listé plus bas.

## Capacités

`GET v1/reception/parametres` annonce désormais deux capacités :

- `"clotureRecu": true` : la route `validerbl?mode=RECU` existe ;
- `"retourManquants": true` : la route `retour-manquants` existe.

Si une capacité est absente, le serveur est plus ancien : ne pas proposer la fonction.

## Partie 1 : demande 59, clôture « entrer le reçu »

### `PUT v1/commande/validerbl/{id}?mode=RECU`

- **Droit** : `P_ENTREE_EN_STOCK`. Sans ce droit, réponse 403 et rien n'entre.
- **En-tête `X-Client-Ref`** : facultatif. La même clé renvoie la réponse d'origine sans rien rejouer. Type interne :
  `CLOTURE_BL_RECU`.
- **Ce qui entre** :
  - une ligne avec lots entre la somme de ses lots, UG comprises, avec le plafond actuel (commande + UG prévues) ;
  - une ligne sans lot n'entre rien : ni lot, ni stock, ni prix. Elle est seulement close, avec `int_QTE_RECUE` = 0
    et `int_QTE_MANQUANT` = quantité commandée.
- **Péremption** : contrôlée seulement sur les lots saisis, et seulement si le paramètre de péremption obligatoire est
  à 1.
- **BL dont aucune ligne n'a de lot** : refus `{success:false, code:"AUCUN_RECU", msg}`. Rien n'entre, le BL reste
  ouvert.
- **BL déjà clos** : refus `{success:false, msg}`, comme avant.
- **Réponse** :

  ```json
  {"success": true, "mode": "RECU", "msg": "…",
   "ecarts": [{"detailId": "…", "cip": "…", "nom": "…", "commande": 10, "recu": 7, "ug": 0, "manquant": 3}],
   "totalManquant": 10}
  ```

  `ecarts` ne liste que les lignes dont le reçu est inférieur à la commande. `manquant` vaut max(0, commande − reçu).
- **Journal** : « BL <ref> entré avec écart : n ligne(s), m boîte(s) manquante(s), par <utilisateur> ». Cette ligne
  n'est écrite que s'il y a un écart.
- **Base** : `t_bon_livraison.int_MANQUANT_RECEPTION` reçoit le total manquant. Une valeur renseignée signale un
  « BL entré au reçu ».
- **Inchangé** : sans paramètre, et avec `avecEcart=true`, la clôture se comporte exactement comme avant.
  - Sans paramètre, le refus « Produits non saisis » nomme les lignes commencées et incomplètes. Une ligne sans lot y
    entre en entier, comme avant.
  - Avec `avecEcart=true`, toute ligne incomplète ou non saisie est refusée.

### `GET v1/reception/{blId}/ecarts`

```json
{"success": true, "blId": "…", "ref": "…", "mode": "RECU", "provisoire": false,
 "ecarts": [ …mêmes objets que ci-dessus… ], "totalManquant": 10,
 "retourManquants": {"retourId": "…", "ref": "…", "statut": "is_Waiting"}}
```

- `mode` vaut :
  - `RECU` : BL entré au reçu, écarts lus en base ;
  - `PROVISOIRE` : BL encore ouvert, écarts calculés sur les lots saisis avec la même règle (`provisoire: true`) ;
  - `COMPLET` : BL clos par l'ancienne voie.
- `retourManquants` vaut `null` tant qu'aucun retour des manquants n'existe.
- Refus : 404 `BL_INCONNU`.

### `POST v1/reception/{blId}/retour-manquants`

- **Droits** : `P_SM_RETOUR_FRS` ou `P_VALIDER_RETOUR_FRS`. `X-Client-Ref` est respecté (type `RETOUR_MANQUANTS`).
- **Création** : un retour en attente de validation (`is_Waiting`), avec le commentaire « Manquants du BL <ref> ».
  - Il contient une ligne par manquant : quantité = `int_QTE_MANQUANT`, motif « Manquant ».
  - Il porte `bool_SANS_SORTIE_STOCK = 1`.
- **Second appel** : renvoie le retour déjà créé, avec `deja: true`. Un seul retour par BL, grâce au verrou sur le BL.
- **Réponse** :

  ```json
  {"success": true, "deja": false, "retourId": "…", "ref": "…", "statut": "is_Waiting",
   "lignes": 3, "totalManquant": 10, "route": "…", "msg": "…"}
  ```

- **Refus** :
  - 409 `BL_NON_ENTRE_AU_RECU` : BL ouvert, ou clos par l'ancienne voie ;
  - 409 `AUCUN_MANQUANT` ;
  - 404 `BL_INCONNU`.
- **Validation** : la validation habituelle (`POST v1/produit/validerretourfour`, ou le bouton de l'écran web) ne sort
  rien du stock pour ce retour. Les boîtes n'ont jamais été entrées.
  - Aucun stock, aucun mouvement ni aucun lot ne bouge.
  - Les lignes passent à l'état validé et le montant est calculé (quantité × PAF).
  - La réponse porte `sansSortieStock: true`.
  - Journal : « Retour des manquants <ref> validé sans sortie de stock : … ».
- **Web** : le retour figure dans la liste « Retour fournisseur » avec la mention « Manquants · sans sortie de stock ».
  La colonne « Manquants » de l'« État de contrôle Achats » affiche « N boîtes · M lignes », avec le détail par
  produit en infobulle.

## Partie 2 : retours fournisseurs en attente (07/11)

### États

| `str_STATUT` | Libellé (`etat`) | Sort du stock ? |
|---|---|---|
| `is_Process` | En saisie | non |
| `is_Waiting` | En attente de validation | non |
| `is_Refused` (nouveau) | Refusé | non |
| `is_Abandoned` (nouveau) | Abandonné | non |
| `enable` | Validé | **oui, une seule fois** |

Un retour refusé ou abandonné ne se valide pas. La validation renvoie `{success:false, code:"ETAT", msg}`.

### Routes

| Route | Droit | Corps | Effet |
|---|---|---|---|
| `GET v1/retourfournisseur/droits` | session | — | `{peutValider, enAttente, refusesACorriger}` |
| `POST v1/retourfournisseur/mettre-en-attente` | `P_SM_RETOUR_FRS` | `{ref, refTwo, description}` | trace `MISE_EN_ATTENTE` ; sans `description` ni `refTwo`, le commentaire et la réponse du retour sont gardés (avant : effacés) |
| `POST v1/retourfournisseur/refuser/{id}` | `P_VALIDER_RETOUR_FRS` | `{motif}` (obligatoire) | `is_Waiting` → `is_Refused` |
| `POST v1/retourfournisseur/remettre-en-attente/{id}` | auteur ou valideur | — | `is_Refused` → `is_Waiting` ; le motif est effacé |
| `POST v1/retourfournisseur/abandonner/{id}` | auteur ou valideur | — | `is_Refused` → `is_Abandoned` |
| `GET v1/retourfournisseur/en-attente/nombre` | `P_VALIDER_RETOUR_FRS` | — | `{success, nombre}` (pastille) |
| `GET v1/retourfournisseur/{id}/historique` | session | — | `{success, data:[{action, motif, par, parId, le}]}` |

- **Champs de `droits`** :
  - `enAttente` : nombre de retours en attente, seulement pour un valideur (0 sinon) ;
  - `refusesACorriger` : nombre de retours refusés dont l'utilisateur est l'auteur.
  - Ils servent à la notice discrète, non bloquante, affichée à la connexion (choix 3 du 08/11).
- **Réponse d'une transition** : `{success:true, retourId, statut, etat, msg}`.
- **Refus d'une transition** :
  - 400 `MOTIF_OBLIGATOIRE` ;
  - 404 `INTROUVABLE` ;
  - 409 `ETAT` : mauvais état de départ ;
  - 409 `VIDE` : remise en attente d'un retour sans ligne ;
  - 403 `interdit` : ni l'auteur ni un valideur.
- **Verrou** : chaque transition verrouille la ligne du retour. Deux valideurs ne refusent pas, ni ne valident, le
  même retour en même temps.
- **Auteur** : l'utilisateur du retour (`lg_USER_ID`) ou celui qui l'a mis en attente (`lg_USER_ATTENTE`). C'est lui,
  ou un valideur, qui corrige un retour refusé (choix 1 du 08/11). La correction des lignes passe par les routes
  habituelles (`update-item`, `add-item`, `remove-item`), puis par `remettre-en-attente`.
  - Lignes, quantités, motifs et lots se corrigent ainsi. Pour changer le motif ou le lot d'une ligne : la retirer
    (`remove-item`), puis la reprendre (`add-item` avec `lgMOTIFRETOUR` et `lotId` ou `numLot`).
  - Un lot non reçu sur ce BL pour ce produit est refusé (`success:false`), rien n'est ajouté.
  - **Nouveau** : sur un retour validé ou abandonné, ces trois routes répondent 409 `ETAT` et ne modifient rien.
    Avant, une ligne d'un retour validé pouvait encore changer après la sortie du stock.
- **Historique** (`t_retour_fournisseur_historique`) : actions `MISE_EN_ATTENTE`, `REFUS` (avec le motif),
  `REMISE_EN_ATTENTE`, `ABANDON`, `VALIDATION`, avec l'auteur et la date.
- **Colonnes du refus** :
  - `t_retour_fournisseur.str_MOTIF_REFUS` (500 caractères au plus), `dt_REFUS` et `lg_USER_REFUS` ;
  - elles sont effacées à la remise en attente. Le motif reste lisible dans l'historique.

### Liste des retours (`GET v1/produit/retours-data`)

- **Paramètre `etat`** : `ATTENTE`, `REFUSE`, `VALIDE`, `ABANDONNE`. Vide : tous les états.
  - `VALIDE` et `ABANDONNE` sont filtrés sur la période.
  - Sans filtre, la liste montre les retours validés ou abandonnés de la période, plus tous les retours en attente ou
    refusés, quelle que soit leur date.
- **Champs ajoutés à chaque ligne** : `etat`, `motifRefus`, `refusPar`, `refusLe`, `attentePar`, `attenteLe`,
  `nombreRefus`, `sansSortieStock` et `peutCorriger`.

### État, motif et auteur : les mêmes partout

- **Auteur de l'état** (champ `auteur`, avec `dateEtat` au format `jj/mm/aaaa hh:mm`) :
  - refusé : le valideur qui a refusé ;
  - en attente : qui l'a mis, ou remis, en attente ;
  - abandonné : qui l'a abandonné (historique) ;
  - validé : qui l'a validé (historique) ; pour un retour validé avant l'historique, l'opérateur du retour.
- `GET v1/produit/retours-data` renvoie aussi `auteur` et `dateEtat` sur chaque ligne. La liste web les montre en
  infobulle de l'état, pour tous les états.
- **Export Excel de la liste** (`GET v1/retourfournisseur/export-excel`) :
  - nouveau paramètre `etat`, mêmes valeurs que la liste, plus `TOUS`. L'écran l'envoie toujours : l'export suit le
    filtre d'état affiché ;
  - sans `etat`, l'export reste celui des seuls retours validés de la période, comme avant ;
  - cinq colonnes ajoutées après les huit d'origine : « Etat », « Motif du refus », « Auteur de l'etat », « Date de
    l'etat » et « Reference du retour ».
- **Tableau de bord** (`GET v1/retourfournisseur/tableau-bord`) : nouveau bloc `etats`.

  ```json
  "etats": {"attente": {"retours": 2, "lignes": 3, "quantite": 5}, "refuse": {…}, "abandonne": {…}, "valide": {…},
            "aTraiter": [{"id": "…", "ref": "…", "statut": "is_Refused", "etat": "Refusé", "motifRefus": "…",
                          "auteur": "…", "dateEtat": "…", "lignes": 1, "quantite": 3}]}
  ```

  - Même règle que la liste par défaut : validés et abandonnés de la période ; en attente et refusés quelle que soit
    leur date. Les filtres grossiste et utilisateur s'appliquent.
  - Les autres rubriques (totaux, mois, produits, motifs, utilisateurs) ne comptent que les retours validés : un
    retour refusé ou abandonné n'y entre jamais.
  - `aTraiter` liste les retours en attente, refusés et abandonnés (200 au plus, les plus récents d'abord).
  - L'écran montre quatre tuiles par état et le tableau « Retours en attente, refusés ou abandonnés ».
  - Le classeur (`tableau-bord/excel`) garde ses feuilles et en ajoute deux : « États » et « Retours à traiter ».

### Le « droit introuvable » `P_VALIDER_RETOUR_FRS`

Le droit a été vérifié sur la base du poste local le 08/11 :

- la migration `V7.0.4` est passée (le 30/10) ;
- le droit est actif, de type CUSTOMER, avec sa description ;
- il est attribué à 9 rôles : SYSTEM_USER, Pharmacien, Développeur, Administrateur du système, Super Administrateur du
  système, Chargé Commande et Stock, Caissière / Chargé Commande et Stock, Gestionnaire Pharmacie et Pharmacien
  Assistant.

Dans l'écran des rôles, il apparaît dans la liste des droits « attribués » du rôle. S'il manque sur un poste, c'est que
`V7.0.4` n'y est pas passée : lancer la migration, sans rien créer à la main.

## Réserve après entrée et droit `P_RESERVE_SUGGESTION` (demande 60)

La clôture d'un BL (`PUT v1/commande/validerbl/{id}`, avec ou sans `mode=RECU`) renvoie dans `reserve` les lignes des
suggestions de réserve automatiques, que montre la fenêtre « Seuil de réserve atteint ».

- Un profil sans le droit `P_RESERVE_SUGGESTION` reçoit `reserve: []` : la fenêtre ne s'ouvre pas.
  - La clôture n'est pas gênée.
  - La suggestion est créée en base comme avant.
- Tant que ce droit n'existe pas (actif) en base, rien ne change. Il est créé par la migration `V7.2.70` de la demande
  60.

## Tests

- **Cohérence** (unitaires, graine fixe) :
  - `ReceptionEcartCoherenceTest` : 5 000 BL ;
  - `RetourEtatsCoherenceTest` : 5 000 enchaînements d'états, et 5 000 retours pour l'auteur de l'état et la
    répartition du tableau de bord.
- **Écran et rapprochement** (e2e) :
  - `retours/test-demande59-bl-recu.js` ;
  - `retours/test-retours-refus-abandon.js` ;
  - `retours/test-retour-fournisseur-attente.js` (existant, nettoyage complété) ;
  - `retours/test-reserve-apres-entree-droit-suggestions.js`.
  - `retours/test-retours-rapprochement-etats.js` : état, motif et auteur comparés à six endroits (base, réponse
    mobile, historique, liste et infobulle, tableau de bord, export Excel de la liste et classeur du tableau).
  - `retours/test-retours-correction-lots.js` : correction d'un retour refusé par les clics (quantité, ligne
    supprimée, autre motif), remise en attente et validation ; sur le mobile, deux lots, correction du lot et du motif,
    validation (chaque lot perd ses boîtes), seconde validation sans effet ; lignes d'un retour validé ou abandonné
    non modifiables (409 `ETAT`).
