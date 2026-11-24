# Transmission à la session mobile : plan du 24/11 (heure du serveur, ventes en attente)

Branche serveur : `plan/24112026`. Rien n'est cassé côté mobile : aucune route n'a été retirée ou renommée, et aucun
champ n'a été retiré d'une réponse. En revanche, il y a de **nouveaux refus**. L'application doit les afficher
proprement : un refus mal traité passerait pour une panne.

## 1. Heure du serveur fausse : toute écriture refusée (HTTP 423) — à traiter

Quand l'heure du serveur est fausse, le serveur refuse toute requête `POST`, `PUT`, `DELETE` ou `PATCH`. Seules exceptions :
`v1/user/auth`, `v1/user/auth-badge`, `v1/user/logout` et `v1/horloge/*`. Exemple : le serveur a été remis à une date
passée, ou il a plus de 30 min d'écart avec l'heure réelle.

Les routes mobiles sont donc concernées : `v1/mobile/connexion`, `v1/mobile/pointages`, les photos, les ventes, les
encaissements et les réceptions. Les lectures (`GET`) restent permises.

Réponse : statut **423**, corps JSON :

```json
{"success": false, "horlogeBloquee": true, "msg": "Opération refusée : l'heure du serveur est fausse. ..."}
```

Attendu de l'application :
- afficher `msg` tel quel, et ne pas le présenter comme une « erreur réseau » ou une « erreur inconnue » ;
- ne pas relancer en boucle ;
- une opération mise en file (avec `X-Client-Ref`) reste dans la file : elle sera rejouée quand le blocage sera levé,
  sans doublon grâce à `X-Client-Ref` ;
- ne proposer aucun contournement : seuls l'administrateur ou la tâche Windows du serveur remettent l'heure.

Facultatif : `GET v1/horloge/public` répond **sans session**. Exemple :
`{"etat": "OK" | "BLOQUE" | "REGULARISATION", "serveur": "24/11/2026 20:52"}`. Il peut servir à afficher un bandeau
sur l'écran de connexion. Il ne rend ni cause, ni écart, ni nom.

Pendant une régularisation (`REGULARISATION`), les écritures passent. Chacune est alors marquée « saisie en
régularisation » dans les traces de l'horloge, sans le corps de la requête. L'application n'a rien à faire.

## 2. Dates dans le futur refusées — seulement si l'application les utilise

- `POST v1/vente/update-created-date` : une date ou une heure dans le futur donne **400**,
  `{"success": false, "msg": "..."}`.
- `POST v1/reglement/reglementdiffere` et `reglementdiffere-all` : une date de règlement dans le futur donne **200**,
  `{"success": false, "msg": "..."}`.

## 3. Ventes en attente — seulement si l'application utilise ces routes

Le web suit maintenant chaque vente ouverte sur un poste : signal toutes les 30 s, et états EN_COURS, EN_ATTENTE,
INTERROMPUE, ABANDONNEE ou CLOTUREE. Un journal de preuve chaîné l'accompagne.

Les ventes faites par le mobile ne sont **pas** suivies, puisque le mobile n'envoie pas de signal. Elles se comportent
comme avant : création, ajout de lignes, clôture et annulation sont inchangés.

Nouveaux refus (statut 200, `success: false`, `msg` à afficher) :
- `POST v1/vente/rappel/{id}`, refusé dans trois cas :
  - la vente est en cours de saisie sur un poste : `verrouillee: true` ;
  - la vente est interrompue ;
  - la vente est déjà clôturée : `cloturee: true`.

  Le droit `P_VENTE_REPRENDRE_ATTENTE` est vérifié. Il est donné à tous les profils qui vendent : écran de vente,
  vente en dépôt, onglet de vente du dépôt.
- `POST v1/ventestats/remove/{id}` et `PUT v1/ventestats/update/{id}/is_Trash` : refusés si la vente est en cours de
  saisie sur un poste.

Aucune nouvelle route n'est demandée au mobile. Plus tard, le mobile pourra faire apparaître ses ventes dans
« Ventes en cours de saisie » ; ce serait une demande à part. Il lui suffirait d'appeler :
- `POST v1/vente-saisie/{id}/signal` toutes les 30 s ;
- `POST v1/vente-saisie/{id}/attente` pour mettre une vente en attente.

## 4. À tester côté mobile

1. Heure du serveur bloquée (sur un serveur d'essai) : connexion, pointage, vente, encaissement. Le message du serveur
   s'affiche, aucune boucle, la file est gardée. Après le déblocage, la file repart sans doublon.
2. Si l'application rappelle des ventes en attente : vente ouverte sur un poste web. Le refus s'affiche et rien ne
   s'ouvre.
