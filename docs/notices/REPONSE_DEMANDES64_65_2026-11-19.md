# Réponse du serveur Prestige — demandes 64 et 65 (19/11/2026)

**Pour** : la session des applications Prestige Mobile 4.15.1+47 et PrestigePOS 1.13.1+33.
**État** : fait sur deux branches, pas encore fusionnées dans `integration/recette-2026-10-29` (la fusion se fait
après validation du pharmacien). Nous vous transmettrons la date de déploiement en officine.

## Demande 64 — Prévente payée par mobile money dont le net baisse — fait (règle du pharmacien, 19/11)

Branche `correctif/demande64-1911`.

Règle : **payer à la borne par mobile money termine la vente.** Une prévente « payée, non clôturée » n'existe que si la
clôture automatique échoue. Il n'y a ni avoir, ni remboursement.

### 1. Empêcher le cas : la borne n'encaisse que si la vente pourra être clôturée

- `POST v1/paiements-mobile` avec `cloturer:true` sur une vente au comptant, pour tout le net (sans `part`) : avant de
  créer la transaction, le serveur fait les contrôles de la clôture, en lecture seule :
  - la caisse du compte connecté est ouverte ;
  - la vente est en cours et a des produits ;
  - le stock suffit ;
  - l'ordonnancier a son médecin et son client ;
  - le montant est juste ;
  - un avoir a son client.
- Si un contrôle échoue : `{success:false, message:"Paiement mobile money impossible : <motif> Le client paie à la
  caisse."}`. Exemple de motif : « la caisse de la borne est fermée. ». Rien n'est créé : aucune ligne
  `paiement_mobile`, aucun appel à l'opérateur. Le champ s'appelle `message`, comme pour les autres refus de cette
  route.
- Sans `cloturer`, ou pour un paiement en deux modes (`part`), rien ne change : c'est le comptoir qui clôture.

### 2. Verrouiller le panier

Le verrou s'applique tant que la vente porte un paiement mobile money **payé, ou en cours (non expiré)**, et pas encore
clôturé. Toute modification du panier est alors refusée, avec `{success:false, msg}`, et rien n'est écrit :

- ajout d'un produit (`v1` et `v2 vente/add/item`) ;
- retrait d'un produit (`v1` et `v2 vente/remove/vno/item/{id}`) ;
- changement de quantité (`vente/update/item/vno`) ;
- remise (`vente/remise`) ;
- tiers payant (`addtp`, `removetp`) ;
- ligne au comptant, type de vente (`updatetypevente`).

Messages :
- payé : « Cette prévente est déjà payée par Wave (4125 F) : le panier ne peut plus être modifié. Terminez-la au
  comptoir avec ce paiement, sans encaisser à nouveau. »
- en cours : « Un paiement Orange Money de 4125 F est en cours sur cette prévente : le panier ne peut pas être modifié
  pendant le paiement. »

Le verrou couvre aussi le paiement **en cours**. Sinon, le panier pourrait baisser pendant que le client paie, et on
retomberait dans le cas de la demande. Le verrou tombe dès que le paiement en cours est annulé ou expiré.

Le calcul du net (`net/vno`, `net/assurance`) reste permis : le comptoir en a besoin.

### 3. Filet : la reprise au comptoir ne change pas

- Si la clôture automatique échoue (par exemple, caisse fermée entre la demande et le paiement), le comptoir termine la
  vente avec le mode de l'opérateur, **au montant payé**, comme décrit dans la demande 62.
- Le panier étant verrouillé, le net ne peut plus être inférieur au montant payé.

## Demande 65 — Image du ticket sans imprimante sur le serveur — fait

Branche `plan/support-1811` (commit f8ef5afa6).

- Le refus « Ticket non imprimé » (correctif R1, `imprimanteAbsente:true`) ne vaut plus que pour une **impression
  réelle** sur l'imprimante du serveur.
- En mode aperçu, qui couvre aussi l'image du ticket (`ticket/{type}/{id}/image`), le ticket est construit même sans
  aucune imprimante.
- Les 11 contrôles du correctif R1 passent par une seule règle : sans imprimante **et** hors aperçu.
- Image de la demande 63 : sur l'intégration, elle passe toujours par l'aperçu. Elle est donc couverte une fois les deux
  branches fusionnées.
- Fusion : un seul conflit, dans `GenerateTicketServiceImpl.java`. Les deux classes `ChoixImprimante` sont dans des
  paquets différents et coexistent.

## Tests

- `test-demande64-1911.js` (écran et API, domain3) : 19/19 sur la branche. Sur l'ancien code : 6/19 — le panier
  d'une prévente payée s'y modifie, et la borne y encaisse caisse fermée.
  - Caisse fermée : paiement refusé, aucune transaction, vente intacte ; sans clôture automatique, toujours accepté.
  - Paiement en cours (Orange Money) : 7 modifications refusées, rien d'écrit ; une fois le paiement annulé, la quantité
    passe de 3 à 2.
  - Clôture automatique en échec (Wave), puis panier verrouillé : 7 refus, rien d'écrit (vente, lignes, stock, traces,
    paiement).
  - Reprise au comptoir au montant payé :
    - un règlement Wave, un seul mouvement de caisse, stock − 2, paiement clôturé ;
    - rapprochement paiement = règlement = mouvement = vente.
  - Vente ordinaire : quantité modifiable ; payée à la borne caisse ouverte, elle est clôturée automatiquement avec un
    mouvement de caisse.
- `ClotureComptoirCoherenceTest` (unitaire) : 10 000 refus tirés au hasard (graine fixe). Le message nomme toujours
  l'opérateur et le montant, et dit « déjà payée » ou « en cours » selon le cas.
- `ImprimanteAbsenteTest` (unitaire, demande 65) : 14/14.
  - L'aperçu comptant, l'aperçu assurance et le reçu du différé, sans imprimante : ces 3 tests échouaient avant la
    correction.
  - La réimpression réelle garde le refus R1.
  - Limite : ce poste a des imprimantes installées, donc le cas « serveur sans aucune imprimante » est simulé dans le
    test, pas reproduit en vrai.
- Non-régression : demande62 25/25, demande62-comptoir 18/18.
