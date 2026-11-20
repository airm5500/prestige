# Réponse à la demande 66 : taux des organismes jamais au-delà de 100 % sur tous les tickets (20/11/2026)

**De** : l'équipe du serveur Prestige.
**Pour** : Prestige Mobile V3 5.1.0 et PrestigePOS 1.14.0.
**Code** : branche `correctif/demande66-2011`, partie de l'intégration `63e9c10cd`. Elle n'est pas encore fusionnée,
ni livrée en officine.

Merci pour l'analyse précise : les deux tickets signalés impriment bien le taux brut du contrat. Le serveur applique
maintenant `CreditLigne.tauxAffiches` partout où un taux d'organisme est imprimé. Rien ne change dans les montants, les
parts, les taux enregistrés ni les réponses JSON : seul le texte imprimé change.

## Ce qui change

1. **Ticket de prévente assurance / carnet** (`TicketPrevente.lignes()`, donc impression du poste et
   `…/prevente/{id}/image`) :
   - les taux sont calculés sur la liste des organismes, dans l'ordre de la vente ;
   - un organisme sans taux reste sans taux ;
   - exemples : 80 % + 30 % donne « Assurance 80% » et « Assurance 20% » ; carnet 100 % + 30 % donne 100 % et 0 %.

   **Défaut voisin corrigé** : au nouveau modèle (l'image du serveur, et le poste réglé sur le nouveau modèle), une
   prévente à plusieurs organismes ne montrait que le **dernier** organisme, en face de la part de tous. Le principal
   n'apparaissait pas. Avec deux organismes ou plus, le ticket montre maintenant chaque organisme avec son taux, puis
   la part assurance (ou carnet), comme l'ancien ticket. Avec un seul organisme, le rendu ne change pas.
2. **Ticket client combiné** (vente assurance liée à une vente comptant) :
   - les taux de la section assurance sont bornés après le retrait des organismes à part nulle ;
   - ils restent dans l'ordre du bloc client du ticket de vente, donc les deux tickets d'une même vente impriment
     les mêmes taux ;
   - vaut pour la première impression, la réimpression et `…/vo/{id}/image`.
3. **Ancien ticket (repli de `brancherVente`)** : `generateDataTiersPayant` imprime les taux bornés, sur les organismes
   imprimés et dans le même ordre. Le nouveau modèle relit ces lignes avec la même règle, qui ne change rien à des
   taux déjà bornés.
4. **En plus, même défaut** : le ticket de **vente modifiée** (plan du 19/11, point 8 ; `…/modifiee/{id}/image`)
   imprimait aussi les taux bruts, pour la vente d'origine comme pour la vente modifiée. Il est borné de la même
   façon.

Les écrans (choix du client, du contrat) et les réponses JSON gardent le taux du contrat.

## Nouvelle route, en lecture seule

`GET v1/vente/ticket/{type}/{id}/image/texte?largeur=58|80` renvoie le texte des tickets que `…/image` dessine : mêmes
documents, même largeur, bloc par bloc, comme les autres aperçus. Elle sert au rapprochement entre l'image et le
ticket. Sans session, elle répond 401. L'application n'a pas à l'utiliser.

## Tests

Chaque nouveau test a d'abord échoué sur l'ancien code.

- **`TicketPreventeTest`** :
  - 80 % + 30 % donne 80 % et 20 % ;
  - 70 % + 29 % donne 70 % et 30 % ;
  - un seul organisme à 80 % reste à 80 % ;
  - carnet 100 % + 30 % donne 100 % et 0 % ;
  - un organisme sans taux reste sans taux ;
  - les montants et la part organismes ne changent pas ;
  - cohérence sur 5 000 ventes tirées au hasard (1 à 4 organismes, taux de 0 à 100 ou absents) : taux imprimés =
    `tauxAffiches`, total au plus 100 %, part = somme des parts, aucune ligne en plus ni en moins.
- **`TauxOrganismesTicketsTest`** :
  - ticket combiné : 80 % + 30 % donne 80 % et 20 % ; 70 % + 29 % donne 70 % et 30 % ; un seul organisme garde son
    taux ; parts inchangées ; entrée non modifiée ;
  - ticket de vente modifiée : origine et modifiée sont bornées ;
  - prévente au nouveau modèle, en 58 et 80 mm : avec deux organismes, chacun apparaît avec son taux, puis la part
    assurance ; avec un seul organisme ou un carnet, le rendu ne change pas ;
  - cohérence sur 5 000 tickets combinés tirés au hasard ;
  - règle stable sur des taux déjà bornés, sur 10 000 listes.
- **`TicketVenteModifieeCoherenceTest`** : aligné sur la règle (le libellé porte le taux imprimé). Les 166 tests des
  tickets passent.
- **Test d'écran `test-demande66-2011.js`** : 29/29, par le vrai chemin de l'écran de vente. Sur l'ancien code, le
  ticket combiné imprimait 30 % et la route texte n'existait pas.
  - Jeu d'essai :
    - vente assurance 80 % + 30 % dont le complémentaire est ajouté par « Ajouter une Assurance complémentaire »,
      avec un article coché « C », donc liée à une vente comptant ;
    - une vente assurance seule ;
    - une prévente assurance.
  - Contrôles :
    - en base, les taux enregistrés restent 80 et 30 ;
    - réimpression web : ticket de vente et ticket combiné à 80 % et 20 % ;
    - images en 58 et 80 mm (PNG, et texte des mêmes documents) : 80 % et 20 % sur le ticket de vente, le ticket
      combiné et la prévente ;
    - les parts imprimées sont les parts en base ; la part assurance de la prévente est la somme des parts en base ;
    - web et image impriment les mêmes taux ;
    - lire les tickets n'écrit rien en base.
- **Non-régression** : `test-monnaie-vente-liee-0811.js` 30/30, `test-demande63-1911.js` (images) 36/36.

## Limites

- Le texte du PNG n'est pas lu par reconnaissance de caractères. Le test lit le texte des mêmes documents par
  `image/texte`, et vérifie que l'image contient les mêmes tickets.
- L'ancien ticket (repli quand le nouveau modèle échoue) n'a pas été déclenché en test d'écran. Sa correction passe par
  les lignes de `generateDataTiersPayant`, que le nouveau modèle relit. Le test de stabilité montre que les deux
  impriment les mêmes taux.
- Les anciennes pages JSP (`bll/preenregistrement/Preenregistrement.java`) ne sont pas modifiées : elles ne servent
  plus au nouveau travail.
