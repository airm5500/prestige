# Promotions : récapitulatif à valider (points 3.2, 3.3, 3.5, avec 13)

Rien n'est codé. Les quatre points sont traités ensemble, car ils touchent les mêmes données : la ligne de vente doit
garder la promotion telle qu'elle était le jour de la vente.

Ma réponse par défaut est entre crochets.

## A. Ce que la ligne de vente garde (socle commun à 3.2, 3.5 et 13)

Au moment de la vente, la ligne recopie :
- le type de promotion (prix, remise, unités gratuites) ;
- le prix public d'avant la promotion ;
- le seuil « à partir de » et le nombre gratuit ;
- le nombre d'unités offertes (déjà gardé aujourd'hui).

Une réimpression, un relevé ou un export montrent donc la promotion du jour de la vente, même si elle a été modifiée ou
supprimée depuis.

Les anciennes ventes n'ont pas ces valeurs. Leur ticket reste « PROMOTION DONT N OFFERTE(S) », comme aujourd'hui.

## B. Ticket (3.2)

- Pour les unités gratuites, le ticket affiche « PROMOTION 5+1 OFFERT(S) ». L'aperçu et l'écran de vente affichent la
  même chose.
- Quand plus d'une unité est offerte, le nombre est ajouté : « PROMOTION 5+1 OFFERT(S) : 2 ». [oui]
- Pour une promotion prix ou remise, la mention reste « PROMOTION » seul.

## C. Écran d'ajout d'un produit à une promotion (3.3)

- Le champ de recherche est nettement élargi.
- La liste de recherche affiche le CIP, le nom, le prix et le stock.
- Promotion prix : un rappel « Prix actuel : X » apparaît avant le prix à saisir.
- Promotion unités gratuites : un rappel « Stock : N » apparaît avant les champs « à partir de » et « gratuites ».
- Le stock affiché est le stock vendable de l'officine, sans les dépôts. [oui]

## D. Traçabilité (3.5)

- **Journal des promotions.** Chaque action est enregistrée avec la date, l'utilisateur, les anciennes valeurs et les
  nouvelles. Les actions sont :
  - l'ajout, la modification et le retrait d'un produit ;
  - le changement de dates et la clôture d'une promotion ;
  - le retrait automatique quand une vente passe en assurance. [oui]
- **Retrait.** Un produit retiré n'est plus effacé : il est marqué retiré et reste visible dans l'historique.
- **Onglet « Ventes en promotion »** dans l'écran Promotions.
  - Filtres : période, produit, type et vendeur.
  - Colonnes : quantité, unités offertes, prix d'avant, prix vendu et montant de la remise.
  - Export Excel. [oui]

## E. Ventes unités gratuites (13)

- L'écran est déclaré dans `correctifs-affichage.js`.
- Une colonne Utilisateur est ajoutée, à l'écran et sur le PDF. Elle affiche le vendeur. [le vendeur]
- La recherche et la pagination sont corrigées : aujourd'hui, la recherche ne filtre rien.
- Les unités offertes par les promotions sont comptées dans une colonne à part. Elles ne sont pas mélangées avec les
  unités gratuites du fournisseur. [colonne séparée]
- Un onglet « Analyse » est ajouté :
  - les produits les plus écoulés, en quantité et en valeur ;
  - la répartition par utilisateur ;
  - l'évolution par jour ;
  - un graphique en barres des 10 premiers produits. [oui]

## F. Tests prévus

Chaque test échoue d'abord sur l'ancien code.

- **Rapprochement.** La promotion d'une ligne est comparée entre l'écran de vente, le ticket, la réimpression, l'onglet
  « Ventes en promotion », l'écran des unités gratuites et la base.
- **Cohérence.** Ces règles sont vérifiées sur des milliers de cas tirés au hasard :
  - offertes = ⌊quantité ÷ seuil⌋ × gratuites ;
  - remise = (prix d'avant − prix vendu) × quantité ;
  - total de l'analyse = somme des lignes.
- **Bilan.** Chaque opération laisse exactement les traces attendues, ni plus ni moins :
  - un ajout ou un retrait de produit laisse une ligne au journal, et rien n'est effacé ;
  - une vente garde sur sa ligne les valeurs copiées ;
  - une annulation rend le stock.
- **Cas.**
  - Promotions : 5+1 vendue en quantités 4, 5, 6 et 12, promotion prix, promotion remise.
  - Changements de la promotion : modifiée après la vente, puis supprimée, puis réimprimée.
  - Assurance : vente passée en assurance.
  - Paramètre à 0 et à 1.

## G. Migration

Une seule migration, rejouable : colonnes de la ligne de vente, journal des promotions et marque « retiré ».

## À valider

1. Le socle A et les réponses par défaut entre crochets.
2. Vous parliez d'ajouter quelque chose à ces points (« ajoute ceci ») : rien n'est joint à votre message. Que faut-il
   ajouter ?
