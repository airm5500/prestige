# Promotions : récapitulatif à valider

Ce récapitulatif reprend votre demande du 07/11 (cas de test « unité gratuite », option « par palier de »,
historique, traçabilité, analyse) et le point 13 du plan du 06/11. Rien n'est codé.

Ma réponse par défaut est entre crochets.

## Ce que fait le code aujourd'hui (unités gratuites)

Une promotion « à partir de s, n gratuites » se **répète déjà** : après s boîtes payées, les n suivantes sont
offertes, et ainsi de suite (`PromotionLigne.unitesOffertes`). Les unités offertes sont comprises dans la quantité de
la ligne.

| Promotion | Quantité | Offertes aujourd'hui | Payées |
|---|---|---|---|
| 5 + 1 | 5 | 0 | 5 |
| 5 + 1 | 6 | 1 | 5 |
| 5 + 1 | 12 | 2 | 10 |
| 4 + 1 | 9 | 1 | 8 |
| 4 + 1 | 10 | 2 | 8 |

Le ticket affiche « PROMOTION DONT 1 OFFERTE(S) ».

## 1. Option « par palier de » à côté de « à partir de » (votre point 2)

Vous voulez que « 4 achetés, 1 offert », pour 9 boîtes achetées, donne 2 offertes, avec « PROMOTION 8+2 OFFERT(S) »
sur le ticket. Pour bien séparer les deux options, je propose :

- **À partir de s** : n unités offertes **une seule fois**, dès que s boîtes sont payées, quelle que soit la quantité.
- **Par palier de s** : n unités offertes **à chaque palier** de s boîtes payées. Les unités offertes sont
  **ajoutées** aux boîtes achetées.
  - Exemple de votre demande : 9 boîtes achetées en « par palier de 4, 1 offerte » donnent 2 paliers complets, donc
    2 offertes. Le client emporte 11 boîtes et en paie 9. Le ticket affiche « PROMOTION 8+2 OFFERT(S) ».

**À trancher.**
1. « À partir de » doit-il passer à « une seule fois » ? Aujourd'hui il se répète. [oui : sinon, il n'y a pas de
   différence avec « par palier »]
2. Dans le palier, les offertes sont-elles **ajoutées** aux 9 boîtes achetées, ou **prises dedans** ?
   - Ajoutées : il emporte 11 boîtes et en paie 9.
   - Prises dedans : il emporte 9 boîtes et en paie 7.

   [ajoutées : c'est ce que donne « 8+2 » quand on achète 9]
3. Comment la caisse ajoute-t-elle les offertes ?
   - Toute seule : la quantité de la ligne passe de 9 à 11, avec un contrôle du stock.
   - Par la caissière, sur un rappel affiché.

   [toute seule, avec un rappel visible sur la ligne]

## 2. Ticket (votre point 1)

- Unités gratuites : « PROMOTION x+n OFFERT(S) », où x est le nombre de boîtes qui ouvrent droit aux offertes et n le
  nombre total d'offertes.
  - « À partir de 5, 1 offerte » : « PROMOTION 5+1 OFFERT(S) ».
  - « Par palier de 4, 1 offerte », 9 achetées : « PROMOTION 8+2 OFFERT(S) ».
- L'aperçu, la réimpression et l'écran de vente affichent le même texte.
- Promotion prix ou remise : la mention reste « PROMOTION ».
- La ligne de vente recopie au moment de la vente :
  - le type de promotion et l'option (à partir de / par palier) ;
  - le seuil et le nombre gratuit ;
  - le prix d'avant la promotion.

  Une réimpression montre ainsi la promotion du jour de la vente, même si elle a été modifiée ou supprimée depuis.
- Les anciennes ventes n'ont pas ces valeurs : elles gardent « PROMOTION DONT N OFFERTE(S) ».

## 3. Écran d'ajout d'un produit à une promotion (votre point 1)

- Le champ de recherche prend toute la place libre de la barre.
- La liste de recherche affiche le CIP, le nom, le prix et le stock.
- Un rappel, choisi selon le type de promotion, apparaît dans la ligne choisie, juste avant le champ à saisir :

| Type | Rappel |
|---|---|
| Prix | « Prix actuel : X » |
| Unités gratuites | « Stock : N » |
| Remise | « Prix actuel : X », puis « Prix après remise : Y », recalculé à la frappe du % |

**À trancher.**
- Le rappel « si remise » de votre texte était inachevé : est-ce bien ce rappel-là ? [oui]
- Quel stock afficher ? [le stock vendable de l'officine, sans les dépôts]

## 4. Historique en onglet et traçabilité (votre point 3)

L'historique vide est déjà corrigé (commit `0fb711f1e`, test 16/16). Il reste :

- **Onglets de l'écran Promotions :** « Promotions » | « Historique » | « Ventes en promotion » | « Analyse ».
  - L'ancien menu Historique est désactivé.
  - Chaque onglet se recharge à l'ouverture.
  - Mêmes droits qu'avant pour l'historique. [oui]
- **Tout est retracé**, avec la date, l'utilisateur, les anciennes valeurs et les nouvelles :
  - la création, la modification du contenu (type, seuil, offertes, prix, remise, dates) et la clôture d'une
    promotion ;
  - l'ajout et le retrait d'un produit ;
  - le retrait automatique quand une vente passe en assurance. [oui]

  Un produit retiré n'est plus effacé : il est marqué retiré.
- **Ventes en promotion** : chaque vente avec tout son détail.
  - Date, n° de vente, vendeur, produit, type et option, seuil et offertes.
  - Quantité payée et quantité offerte.
  - Prix d'avant, prix vendu, montant de la remise.
- **Tri et filtres** sur les deux onglets : par type de promotion, par date, par produit et par utilisateur.
- **Impression PDF et export Excel** sur l'historique, les ventes en promotion et l'analyse.

## 5. Onglet « Analyse » (votre point 2)

Sur une période choisie :
- par promotion et par type :
  - nombre de ventes ;
  - boîtes payées et boîtes offertes ;
  - montant vendu et coût des offertes (au prix d'avant) ;
- les 10 produits les plus vendus en promotion, avec un graphique en barres ;
- la répartition par vendeur ;
- l'évolution par jour.

Impression et export.

## 6. Ventes en unités gratuites du fournisseur (point 13 du 06/11)

Cet écran est distinct des promotions : il compte les unités gratuites des fournisseurs.
- L'écran est déclaré dans `correctifs-affichage.js`.
- Une colonne Vendeur est ajoutée, à l'écran et sur le PDF. [le vendeur]
- La recherche et la pagination sont corrigées.
- Les unités offertes par les promotions ne s'y mélangent pas : elles sont dans l'onglet « Analyse » des promotions.
  [oui]

## 7. Tests prévus

Chaque test échoue d'abord sur l'ancien code.

- **Rapprochement.** Une ligne en promotion est comparée entre l'écran de vente, le ticket, l'aperçu, la
  réimpression, l'onglet « Ventes en promotion », l'analyse, le PDF, l'Excel et la base.
- **Cohérence.** Ces règles sont vérifiées sur des milliers de cas tirés au hasard, avec une graine fixe :
  - à partir de s : offertes = n si payées ≥ s, sinon 0 ;
  - par palier de s : offertes = ⌊payées ÷ s⌋ × n ;
  - montant = prix × payées ;
  - remise = (prix d'avant − prix vendu) × quantité ;
  - total de l'analyse = somme des lignes ;
  - jamais négatif.
- **Bilan.** Chaque opération laisse exactement les traces attendues, ni plus ni moins :
  - un ajout, un retrait ou une modification laisse une ligne au journal, et rien n'est effacé ;
  - une vente sort du stock les boîtes payées et les offertes, une seule fois ;
  - une annulation rend tout le stock.
- **Cas.**
  - « À partir de » : 5+1 avec les quantités 4, 5, 6 et 12.
  - « Par palier » : 4+1 avec les quantités 3, 4, 8 et 9 (8+2), et 2 offertes par palier.
  - Promotion prix et promotion remise.
  - Promotion modifiée, puis supprimée, puis vente réimprimée.
  - Vente passée en assurance, stock insuffisant pour les offertes, paramètre à 0 et à 1.

## 8. Migration

Une seule migration, rejouable, qui ajoute :
- l'option « par palier » ;
- les valeurs recopiées sur la ligne de vente ;
- le journal des promotions ;
- la marque « retiré ».

## Ordre de travail proposé

1. Option palier, ticket et ligne de vente (1 et 2).
2. Écran d'ajout (3).
3. Journal, onglets, ventes en promotion, impression et export (4).
4. Analyse (5).
5. Unités gratuites du fournisseur (6).
