# Demande à l'application mobile de vente : associer un client à une vente comptant

**Date** : 13/11/2026 (plan du 12/11, point 8)

## Le besoin

Sur le poste, une vente comptant peut être rattachée à un client : on le cherche par son nom ou son téléphone, ou on
le crée en quelques champs. La vente garde ce client, et on la retrouve ensuite dans son historique.

Sur l'application mobile, une vente comptant part aujourd'hui sans client. Il faut pouvoir faire la même chose que sur
le poste, avant l'encaissement.

## Routes du serveur (déjà en place, aucune modification côté Prestige)

| Étape | Route | Corps ou paramètres | Réponse |
|---|---|---|---|
| Chercher un client | `GET v1/client/lambda?query=<texte>` | nom, prénom, « nom prénom » ou numéro ; les espaces en trop sont ignorés | `{success, data:[{lgCLIENTID, strFIRSTNAME, strLASTNAME, strADRESSE, ...}], total}` |
| Créer un client rapide | `POST v1/client/add/lambda` | `{strFIRSTNAME, strLASTNAME, strADRESSE, strSEXE?, email?, dtNAISSANCE?}` | `{success, data:{lgCLIENTID, ...}}` ou `{success:false, msg}` |
| Rattacher le client à la vente | `POST v1/vente/update/client` | `{venteId, clientId}` | `{success, msg}` |
| Retirer le client | `POST v1/vente/update/client` | `{venteId, clientId:null}` | `{success, msg}` |

Remarques :

- Dans le client rapide, le téléphone est rangé dans `strADRESSE`. C'est le champ que le poste affiche comme
  « Téléphone ».
- La création met le nom en majuscules et refuse un nom vide, un texte trop long ou un type inconnu, avec un message
  dans `msg`. L'application affiche ce message tel quel.
- Le rattachement est refusé quand la vente est déjà terminée (`success:false`, `msg` explique pourquoi). La vente
  reste alors telle quelle.
- **Identifiant inconnu** : le serveur répond `success:true`, avec le message « Client inconnu : le client de la vente
  est inchangé ». Ce cas a été gardé exprès : l'application envoie aujourd'hui **le nom du mode de règlement** dans
  `clientId`, avant chaque encaissement. **Ce nouvel écran doit corriger cela** : n'envoyer dans `clientId` qu'un
  `lgCLIENTID` reçu du serveur. Sinon, un client choisi puis un encaissement ne laisseraient aucune trace d'erreur.
  Si le mode de règlement doit être transmis, il passe par la route d'encaissement, pas par celle du client.

## À faire dans l'application

1. Sur l'écran d'une vente **comptant** en cours, ajouter une zone « Client », facultative, avec :
   - une recherche, lancée à partir de 3 caractères ou d'un numéro de 4 chiffres ;
   - une liste de résultats : nom, prénom et téléphone ;
   - un bouton « Nouveau client » (nom, prénom, téléphone) ;
   - pour un client déjà choisi, son nom et une croix pour le retirer.
2. Choisir ou créer un client appelle tout de suite `v1/vente/update/client`. Le nom n'est affiché qu'après la réponse
   `success:true`. En cas d'échec, afficher `msg` et garder l'état précédent.
3. Reprise d'une vente en attente : afficher le client déjà rattaché. Il est lu avec la vente, comme sur le poste.
4. Pas de fenêtre de confirmation pour retirer le client : la croix passe au rouge, et un second appui confirme.
5. Respecter les droits déjà en place (voir `DEMANDE_SESSION_MOBILE_VENTES.md`) : un 403 `interdit` affiche `msg` et
   ne déconnecte pas ; un 409 `sessionChangee` renvoie à l'accueil.
6. **Confidentialité** : ne jamais écrire dans les journaux de l'application ni le nom, ni le téléphone, ni le texte
   cherché.

## Pour vérifier (avec le serveur d'essai, jamais une base de production)

Chaque essai retire ses données, client créé compris.

- Vente comptant avec un client **trouvé**, puis encaissée :
  - sur le poste, « Ventes terminées », la vente porte ce client ;
  - en base, `t_preenregistrement.lg_CLIENT_ID` est celui du client.
- Vente comptant avec un client **créé** depuis le téléphone : le client apparaît dans la recherche du poste, et la
  vente lui est rattachée.
- Client choisi puis **retiré** avant l'encaissement : la vente se termine sans client.
- Client choisi puis **changé** pour un autre : seul le second reste.
- Vente **sans** client : le comportement est inchangé.
- Vente **déjà terminée** : le rattachement est refusé, avec le message du serveur.
- Mode de règlement espèces, puis mobile money : le client choisi n'est plus remplacé à l'encaissement (c'est la
  correction du point ci-dessus).
- Bilan : un seul client créé, aucune ligne de tiers payant ajoutée (une vente comptant n'en a pas), stock et caisse
  identiques à une vente sans client.
