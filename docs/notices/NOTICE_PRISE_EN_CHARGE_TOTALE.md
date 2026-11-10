# Ticket assurance sans parts nulles et prise en charge totale d'une ligne (retours du 10/11/2026)

Branche `PRES-/prise-en-charge-totale`, à partir de `integration/recette-2026-10-29` (`66cadaf0d`). Rien n'est fusionné.
Trois sujets, décidés avec l'utilisateur le 10/11 à partir des tickets 1750418138 et 5842772163.

## 1. Ticket : une assurance à part nulle n'est plus imprimée

- **Sous une ligne** : l'assurance dont la part vaut 0 sur cette ligne n'a plus sa ligne « Taux … : 0 ».
- **Dans le récapitulatif du client** : l'assurance qui ne prend rien sur toute la vente n'est plus listée.
- « Part du client » reste imprimée, même à 0. Le nom de l'assurance reste devant le taux, même s'il n'en reste qu'une.
- La règle ne joue que sur une vente à **plusieurs** assurances : un organisme seul reste imprimé, même à 0. Un montant
  négatif (vente annulée) n'est jamais masqué. La base garde toutes les assurances de la vente : seule l'impression
  change. Le ticket combiné (vente assurance + comptant liée) suit la même règle.

Code : `CreditLigne.masquerPartNulle`, `GenerateTicketServiceImpl.creditsParLigne` et `generateDataTiersPayant`.

## 2. Ticket : la part d'une ligne est bornée à ce qui reste

Défaut du ticket 5842772163 : « MUGEFCI · Taux 0 % : 190 » sous une ligne que la CNAM couvrait déjà à 100 %. Le
ticket recalculait la part de chaque ligne (20 % partout), trouvait 3 842 au lieu des 3 642 enregistrés, croyait à un
plafond et répartissait au prorata.

Le ticket applique maintenant la règle du moteur : sur chaque ligne, **dans l'ordre de passage**, une assurance prend
base × taux, **borné à ce qui reste de la ligne** après celles qui passent avant. Le prorata ne sert plus qu'au vrai
cas de plafond. Avec la règle 1, la ligne à 0 disparaît.

| Ticket 5842772163 | CNAM | MUGEFCI |
|---|---|---|
| A PAR AEROSOL 18 210, sans référence | 80 % = 14 568 | 20 % = 3 642 |
| TEST GROSSESSE GOLDEN 1 000, CNAM à 100 % | 1 000 | 0 (avant : 190) |

Les anciens tickets réimprimés sont corrigés aussi (aucune donnée nouvelle n'est nécessaire).
Code : `CreditLigne.partsBornees`.

## 3. Prise en charge totale d'une ligne

### Paramètre

`KEY_PRISE_EN_CHARGE_TOTALE` (`t_parameters`, rubrique « Ventes et caisse »), migration rejouable
`V7.6.20__prise_en_charge_totale.sql`, **à 0 par défaut**. Il faut aussi `KEY_PRIX_REF_CAISSE` à 1 (colonnes P.REF |
TAUX de la grille de vente).

- **À 0** : aucune question n'est posée, la marque de ligne n'est jamais lue par le calcul. Un taux à 100 % garde son
  sens d'avant : l'assurance complète ce que les précédentes ont laissé.
- **À 1** : voir ci-dessous.

### À la caisse

Quand le taux d'une assurance est mis à **100** dans la cellule TAUX d'une ligne, une question s'affiche **sous la
grille, sans fenêtre** : « <assurance> passe en premier et paiera 100 % de cette ligne. Entrée pour confirmer, Échap
pour annuler. » Elle est posée aussi quand c'est le RO.

- **Entrée** : l'assurance passe en premier sur la ligne. La cellule affiche 100 avec un style propre.
- **Échap** : la saisie est annulée, le taux reste ce qu'il était. Toute autre touche ou un clic annule aussi : la
  question ne reste jamais en attente pendant qu'on saisit autre chose.
- Une seule assurance peut passer en premier sur une ligne : la seconde est refusée avec un message.
- Saisir un autre taux pour cette assurance sur la ligne **retire** la marque. Saisir un prix de référence la garde.
- À 1, on ne peut donc plus poser à la caisse un « 100 % qui complète le reste » : il se pose sur la fiche article.

### Calcul d'une ligne marquée

| Qui | Part |
|---|---|
| L'assurance confirmée, en premier | 100 % de **sa propre base** × quantité (son prix de référence si elle en a un, sinon le prix de vente), sans dépasser le prix de la ligne |
| Les autres, dans leur ordre habituel | leur propre base × leur propre taux, borné à ce qui reste de la ligne |
| Le client | ce que personne n'a couvert |

Une ligne marquée utilise toujours la base propre de chaque assurance, quel que soit `KEY_PRIX_REF_BASE_PAR_TP`. Les
lignes non marquées de la même vente ne changent pas. Les plafonds s'appliquent ensuite, inchangés : la part écrêtée
va au client, pas à l'autre assurance.

Exemples sur une ligne à 1 000, RO à 80 %, RC1 à 20 % (les mêmes que dans l'écran des paramètres) :

| Cas | RO | RC1 | Client |
|---|---|---|---|
| Aucun taux modifié | 800 | 200 | 0 |
| RC1 à 100 %, non confirmé (ou paramètre à 0) | 800 | 200 | 0 |
| RC1 confirmé, sans prix de référence | 0 | 1 000 | 0 |
| RC1 confirmé, prix de référence 800 | 200 | 800 | 0 |
| RO à 100 % confirmé | 1 000 | 0 | 0 |
| RC1 confirmé mais plafonné à 600 | 0 | 600 | 400 |

### Ce qui est écrit, et qui le relit

| Donnée | Écrite par | Relue par |
|---|---|---|
| `t_preenregistrement_detail.tp_premier_id` (compte de l'assurance qui passe en premier) | `PUT v1/prix-reference/vente/{venteId}/ligne/{detailId}/premier` | le calcul du net (si le paramètre vaut 1), la grille de vente (`referencesTp[].premier`), le ticket (ordre de passage) |
| `taux_produit` de la ligne marquée : une ligne par assurance, taux appliqué (100 pour la première) et base propre | le calcul du net | le ticket |

**Rien de permanent** : la marque vaut pour cette vente. Elle n'écrit rien dans les prix de référence de la fiche
article ni dans leur journal. Si un prix de référence est saisi pour l'assurance marquée, il va sur la fiche à la
clôture avec le taux d'avant la marque, jamais avec 100.

## 4. Écran des paramètres : explication dépliable (bouton « i »)

- La ligne d'un paramètre reste simple. Si le paramètre a une explication, un bouton « i » apparaît ; un clic la
  déplie **sous la ligne** (aucune fenêtre), un second la replie. Sans explication, pas de bouton : rien ne change
  pour les autres paramètres.
- Table `parametre_explication (str_KEY, explication)`, créée par `V7.6.20`. L'explication est un JSON
  `{regle, titre, entetes, cas, rappels}` (`util.ExplicationParametre`) ; une explication illisible n'est pas montrée.
  Tout le texte est encodé à l'affichage.
- Livrée dans ce lot : l'explication de `KEY_PRISE_EN_CHARGE_TOTALE` (règle, six cas chiffrés, trois rappels).
- **Règle pour la suite** : tout nouveau paramètre est livré avec son explication, écrite d'après le code qui le lit,
  par une ligne dans `parametre_explication` dans sa migration. Le rattrapage des 36 paramètres récents est un
  chantier à part.

## 5. Tests

| Famille | Test | Ce qu'il vérifie |
|---|---|---|
| Cohérence | `CreditLignePartsBorneesTest` (8) | tickets 5842772163 et 1750418138, ordre de passage, plafond, 5 000 ventes au hasard : jamais au-delà de la ligne, somme = total |
| Cohérence | `PriseEnChargeTotaleTest` (10) | les six cas, aux deux valeurs de la base par tiers-payant, lignes non marquées intactes, 5 000 ventes au hasard |
| Cohérence | `ExplicationParametreTest` (3) | format de l'explication ; celle de la migration porte les six cas du moteur |
| Rapprochement et bilan | `prix-reference/test-prise-en-charge-totale.js` | paramètre à 0 puis à 1 : question, Échap, Entrée, refus ; écran = base = ticket ; stock, mouvement de caisse, rien sur la fiche ni au journal ; récapitulatif sans l'assurance à part nulle |
| Rapprochement | `retours/test-parametres-explication-1011.js` | bouton « i », dépliage sans fenêtre, écran = service = base |

Les tests du moteur ont échoué sur l'ancien code (7 sur 10) avant de passer.
