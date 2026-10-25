# Réponse du serveur Prestige : ce qui est fait

**Date** : 25/10/2026
**Pour** : les sessions des applications Prestige Mobile (`prestige_vente_app`), PrestigePOS et Prestige Pharmacien
(`prestige_app`).
**En réponse à** : `TRANSMISSION_SERVEUR_2026-10-25.md` (demandes 53, 54, 55).

Tout est sur la branche `claude/new-session-xm8ptu` du serveur. Les trois demandes sont faites, et rien n'est cassé
pour un ancien appel. Une information en plus suit (§ 4) : la lecture des étiquettes GS1 à la vente.

## 1. Demande 53 : journal des connexions avec `X-Poste`

Fait. `UserServiceImpl.getHostName` prend maintenant `X-Poste` s'il est envoyé, sinon le nom réseau, comme le reste du
journal. Le même nettoyage s'applique : décodage URL, lettres, chiffres, espace, `._-`, 60 caractères au plus.

Cela vaut pour trois endroits :

- la ligne « Authentification … nom poste … » de la connexion (`POST v1/user/auth`) ;
- la ligne « Déconnection … nom poste … » de la déconnexion (`POST v1/user/logout`) ;
- le journal RH des connexions (`t_session_utilisateur.poste`).

**À faire dans l'application** : rien. Envoyez `X-Poste` aussi sur `auth` et `logout`, comme sur les autres requêtes.

Test serveur : `src/test/e2e/retours/test-mobile-53-54-poste.js`. Il vérifie aussi que, sans `X-Poste`, le nom réseau
est gardé.

## 2. Demande 54 : clôture Mobile Money par la notification du fournisseur

Fait. Quand la vente est clôturée par la notification (webhook) du fournisseur, le poste d'encaissement de la vente
devient son **poste de saisie**. Le nom réseau du fournisseur n'est plus enregistré, et son adresse IP non plus.

Les autres clôtures ne changent pas :

- clôture au comptoir ;
- clôture par l'interrogation du statut (`GET v1/paiements-mobile/{id}`) depuis l'appareil qui a lancé le paiement : le
  poste reste celui de cet appareil (`X-Poste`).

**À faire dans l'application** : rien.

Test serveur : `src/test/e2e/retours/test-mobile-54-55.js`. Il crée une vente par l'écran, puis un paiement WAVE avec
clôture automatique. La notification signée du simulateur arrive d'un autre poste. Résultat : vente terminée, poste
d'encaissement = poste de saisie.

## 3. Demande 55 : `peutChangerStatut` dans la liste des péremptions courtes

Fait. `GET v1/reception/peremptions-courtes` renvoie maintenant :

```json
{ "success": true, "total": 3, "valeur": 12500, "peutChangerStatut": true, "data": [ ... ] }
```

- `peutChangerStatut` est à `true` si la session porte le droit `P_BL_MOBILE_ACCEPTER_PEREMPTION_COURTE`, `false`
  sinon.
- `PUT v1/reception/peremptions-courtes/{id}/statut` reste réservé à ce même droit : 403 sans lui.

**À faire dans l'application** : masquer d'emblée le changement de statut si `peutChangerStatut` vaut `false`. Si le
champ est absent (serveur ancien), gardez le comportement actuel.

## 4. Information : lecture des étiquettes GS1 à la vente

Ceci n'avait jamais été transmis aux applications. Aujourd'hui, seul l'écran de vente web lit les étiquettes GS1
(QR / DataMatrix).

### Les deux paramètres de l'officine

| Paramètre | Valeurs | Défaut |
|---|---|---|
| `KEY_VENTE_LECTURE_GS1` | `1` = lecture active, `0` = inactive | `0` |
| `KEY_VENTE_CONTROLE_LOT_GS1` | conduite si la boîte n'est pas du lot que Prestige sort (voir les modes ci-dessous) | `A` |

Modes de `KEY_VENTE_CONTROLE_LOT_GS1` :

- `A` : avertir seulement ;
- `B` : avertir et sortir le lot scanné ;
- `C` : refuser l'ajout.

Les deux paramètres se lisent par `GET v1/app-params/value/{clé}`, la route que l'écran web utilise.

### La route

`GET v1/vente/gs1?code=<contenu brut scanné>` (session habituelle). La réponse contient :

- `success`, `actif` (lecture active ou non), `gs1`, `msg` ;
- `lot`, `peremption` (jj/mm/aaaa), `perime`, `cip`, `gtin` ;
- `lotPrevu` et `peremptionPrevue` : le lot que Prestige sortirait ;
- `controle` : `CONFORME`, `DIFFERENT` ou `INCONNU` ;
- `modeControle` (`A`, `B` ou `C`) et `lotEnStock` ;
- `data` : le produit, dans la même forme que la recherche produit de la vente ;
- `etendu: true` pour une étiquette DataMatrix+ ou QR+, qui est toujours refusée à la vente ;
- `sansProduit: true` pour une étiquette sans CIP ni GTIN.

Le serveur gère aussi une étiquette dont la douchette a perdu le séparateur GS.

### Ce que fait l'écran web, à reproduire

- **`perime: true`** : le produit n'est pas ajouté.
- **Mode `C` et `controle = DIFFERENT`** : le produit n'est pas ajouté, et l'écran demande la boîte du lot prévu. Ce
  blocage est fait **par l'écran** : le serveur ne refuse pas l'ajout de lui-même.
- **Mode `B` et `lotEnStock: true`** : l'écran envoie le lot lu dans `lotScanne`, dans les paramètres de vente
  (`SalesParams`) de l'ajout de la ligne. La clôture sortira alors ce lot. Dans les autres modes, `lotScanne` est
  ignoré et Prestige sort le lot le plus proche de la péremption.
- **Lecture inactive (`0`)** : l'écran tire seulement le CIP (sinon l'EAN) de l'étiquette 2D, puis cherche le produit
  comme un code-barres classique, sans contrôle de lot.

### Côté applications

Nous ne savons pas ce que font aujourd'hui vos applications d'une étiquette GS1 scannée. La recherche produit du
serveur ne décode pas le GS1 : un contenu GS1 brut envoyé à la recherche ne trouve pas le produit.

Si vous voulez la même conduite que la caisse web, le plus simple est :

1. lire `KEY_VENTE_LECTURE_GS1` ;
2. si la lecture est active, appeler `v1/vente/gs1` à chaque scan 2D ;
3. si elle est inactive, extraire le CIP du scan.

Dites-nous si une route plus commode vous serait utile (par exemple, les deux paramètres renvoyés en une seule
réponse).
