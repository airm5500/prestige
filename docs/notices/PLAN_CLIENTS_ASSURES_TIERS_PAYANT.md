# Clients assurés et tiers-payants : plan à valider (02/11/2026)

Ce plan fait suite à J5 (rapport du centre de support, § 22). Une vente assurance a planté parce que le client choisi n'avait
aucun tiers-payant. J5 empêche le plantage, mais ne règle pas la cause. **Plan validé le 02/11 ; travail en cours sur `PRES-/support-0211`.**

## 1. Ce que j'ai compris

1. **Règle métier.** Un client assurance n'existe que par son assurance. Un client assuré sans tiers-payant actif n'est
   pas un client assurance. Il ne doit apparaître dans aucune vue : ni dans la recherche des ventes assurance, ni dans les
   listes de clients assurés.
2. **Retrait du tiers-payant principal (validé le 02/11).**
   - S'il ne reste **aucun** tiers-payant actif, le client est désactivé dans la même opération.
   - S'il reste un complémentaire actif, celui-ci devient principal : il passe en priorité 1, sans devenir régime
     obligatoire. Le bouton « Retirer » l'annonce avant la confirmation (« Le complémentaire X deviendra le tiers-payant
     principal »), et la confirmation se fait dans le bouton.
   - Si une partie de l'opération échoue, rien n'est enregistré. On ne laisse jamais un état intermédiaire.
3. **Création.** Un client assuré est créé avec son tiers-payant principal, ou il n'est pas créé.
4. **Lecture.** Une donnée incohérente ne doit plus se traduire par « aucun tiers-payant ». Il faut empêcher ces données
   d'exister, et ne plus masquer l'erreur à la lecture.
5. **Architecture.** Ces opérations passent par l'API REST, plus par les anciennes JSP. On ne supprime pas les JSP, mais
   les écrans ne les appellent plus.
6. **Données déjà en base.** Les clients assurés qui n'ont déjà plus de tiers-payant actif doivent être traités. Rien ne
   sera écrit en production sans ton accord : d'abord une liste en lecture seule.

## 2. Ce que le code montre aujourd'hui

### Comment un client assuré se retrouve sans tiers-payant

| Chemin | Ce qui se passe | Écrans |
|---|---|---|
| Retrait d'un tiers-payant | `tierspayantManagement.delete_compteclt_tierspayant` efface le lien, **sans vérifier qu'il en reste un**, ni que c'était le principal. Le client reste actif et de type « assuré » | Fiche client, « Tiers-payants » (`showclttierspayant.js` → REST `client/gestion/tiers-payants/delete`, qui appelle la même méthode) ; vente, « Tiers-payant » du client (`addTiersPayant.js` → `compteclienttierspayant/ws_transaction_clt.jsp`) ; deux autres JSP (`ws_compteclient_tierspayant_transaction.jsp`, `clienttierspayant/ws_transaction.jsp`) |
| Création dans l'ancienne gestion des clients | `client/ws_transaction.jsp` (mode `create`) passe par `clientManagement.createClient`. Le client est enregistré d'abord (`persiste`). Son compte, son ayant droit et son lien tiers-payant sont créés ensuite, dans un bloc dont les erreurs sont ignorées (`catch (Exception e) {}` vide, sans journal) : un organisme introuvable ou un champ vide laisse un client assuré sans lien, et l'écran affiche quand même un succès. Le mode `createother` crée un client sans aucun tiers-payant, du type choisi | « Clients », « Ajouter » (`configmanagement/client/action/add.js`) |
| Création depuis la vente (REST) | `createClientCarnet` crée le client et son compte, puis le lien. Si le lien échoue avant l'enregistrement (organisme absent, champ vide), l'exception est avalée (`catch` → `return null`) et la transaction **valide quand même** le client sans lien | Vente, « Nouveau client » carnet |
| Changement de carnet (REST) | Le nouveau lien est créé avant que l'ancien soit désactivé, dans la même transaction. **Ce n'est pas un chemin vers un client sans tiers-payant**, contrairement à ce que j'ai écrit plus tôt. Il garde le défaut commun du `catch` qui avale l'erreur | Vente, fiche client |
| Organisme désactivé | La lecture ne vérifie que le lien (`TCompteClientTiersPayant.strSTATUT`), pas l'organisme : un client rattaché à un organisme désactivé paraît assuré | Gestion des tiers-payants |

### Où les vues lisent les clients assurés

- `ClientServiceImpl.findClientAssurance` (recherche de la vente assurance, `client/all`) : tout client actif du type
  demandé, sans condition sur les tiers-payants.
- `findTiersPayantByClientId` : sur n'importe quelle exception (lien vers un organisme absent, par exemple), renvoie une
  **liste vide** au lieu de signaler l'erreur. C'est le troisième chemin vers « client sans tiers-payant ».
- Les autres listes de clients (gestion des clients, choix du client dans d'autres écrans) seront recensées à l'étape 1.

### Ce qui existe déjà

- La désactivation d'un client existe, avec la vue « Clients désactivés » (`ClientDesactiveManager.js`), d'où l'on peut
  réactiver un client.
- La fiche client passe déjà par l'API REST (`client/gestion/...`). Il reste à changer la règle métier qu'elle appelle, et
  l'écran de vente, qui appelle encore une JSP.

## 3. Ce que je propose

| Étape | Contenu | Test qui échoue d'abord |
|---|---|---|
| 1. Recensement | Lister toutes les routes et tous les écrans qui créent, modifient, suppriment ou listent un client assuré ou ses tiers-payants. Résultat : un tableau ajouté à cette notice | — |
| 2. Règle unique côté serveur | Un seul service REST porte la règle : <br>- retirer le dernier tiers-payant actif désactive aussi le client, dans la même transaction ; <br>- retirer le principal quand il reste un complémentaire : ce complémentaire passe en priorité 1 (pas régime obligatoire) ; <br>- retirer un complémentaire ne touche pas au client ; <br>- un échec annule tout (plus de `catch` qui avale l'erreur et valide quand même) | Test unitaire du service, puis tests d'écran : retirer le dernier tiers-payant, le client passe dans « Clients désactivés » ; retirer le principal avec un complémentaire, celui-ci passe en priorité 1 |
| 3. Écrans passés en REST | Fiche client et fenêtre « Tiers-payant » de la vente appellent ce service. Les JSP restent mais ne sont plus appelées. La confirmation se fait dans le bouton lui-même, qui annonce l'effet : « Retirer » → « Confirmer : le client sera désactivé » pour le dernier tiers-payant actif, « Confirmer : X deviendra le tiers-payant principal » quand il reste un complémentaire, « Confirmer le retrait » sinon | Test d'écran par chemin, rejouant les clics |
| 4. Création sûre | Création d'un client assuré (gestion des clients et vente) par le service REST, en une seule transaction : client, compte et tiers-payant principal ensemble, ou rien. Pas de client assuré sans tiers-payant principal | Test d'écran : création avec un organisme refusé, rien n'est créé |
| 5. Lecture sans masquage | `findTiersPayantByClientId` ne transforme plus une erreur en liste vide : l'erreur est journalisée et signalée. Les clients assurés sans lien actif vers un organisme actif sont exclus de la recherche de vente et des listes de clients assurés | Test d'écran : un client sans tiers-payant actif n'apparaît plus dans la recherche |
| 6. Données existantes | Requête **en lecture seule** : clients assurés actifs sans lien actif, et liens vers un organisme absent ou désactivé (comptages seulement, sans colonnes nominatives). Après ton accord, une migration qui désactive ces clients, réversible depuis « Clients désactivés » | Comptage avant et après sur la copie de travail |
| 7. Garde J5 | Gardée en défense, au cas où une donnée incohérente arriverait encore d'ailleurs | Déjà en place (`test-j5-client-sans-tiers-payant.js`) |

Chaque étape : test qui échoue d'abord, correction, tests voisins un par un sur le 9080, commit et push sur `PRES-/support-0211`.

## 4. Questions tranchées (02/11)

1. **Tiers-payant « principal ».** Je le définis comme le régime obligatoire (`bISRO`) ou, s'il n'y en a pas, le lien de
   priorité 1. **Validé.** Pour un client « carnet », le carnet est son seul tiers-payant : son retrait désactive le
   client.
2. **Principal retiré, complémentaire restant : tranché le 02/11.** Le complémentaire restant devient principal
   (priorité 1, pas régime obligatoire), annoncé dans le bouton « Retirer ». Le client n'est désactivé que s'il ne lui
   reste aucun tiers-payant actif.
3. **Réactivation.** Réactiver un client depuis « Clients désactivés » doit-il exiger d'abord un tiers-payant principal
   actif ? **Oui, validé.**
4. **Données existantes (étape 6).** Je te soumets d'abord les comptages, et la migration n'est écrite qu'après ton accord.
   **Validé.**
