# Rapport de la nuit du 07/11/2026 : plan du 06/11

État au matin :
- neuf évolutions du plan du 06/11 sont faites, testées et poussées sur `integration/recette-2026-10-29` (`1ed45eacc`),
  et déployées sur le poste local ;
- 13 cas sur 13 OK au cahier ;
- non-régression : 39 tests rejoués, tous verts ;
- aucune régression connue.

## 1. Ce qui est fait cette nuit

| Point | Ce qui change | Test d'écran | Sur l'ancien code | Sur le nouveau |
|---|---|---|---|---|
| 5.1 | Le prix ou taux de référence saisi en caisse est gardé sur la vente. Il ne va sur la fiche article qu'à la clôture. Une vente abandonnée ne touche plus la fiche. | `prix-reference/test-saisie-validee-cloture-0611.js` | 9/18 | 18/18 |
| 5.1 (annulation) | Annuler une vente close garde le prix sur la fiche et note « Annulation de la vente » au journal. | `prix-reference/test-annulation-vente-journal-0611.js` | 9/13 | 16/16 |
| 5.2 | Ticket : rien sous une ligne au taux de l'assurance. Prix et taux ne sont imprimés que s'ils ont été saisis. | `prix-reference/test-rapprochement-ticket.js` | 18/19 | 19/19 |
| 15 | PSCODE (référence Ubipharm) sur la fiche article (`t_famille`), en majuscules, 20 caractères au plus. Recherche en fiche et en vente (liste et code exact). | `retours/test-fiche-pscode-0611.js` | 2/5 | 15/15 |
| 3.1 | « PROMOTION » en vert (#2E7D32) sur la ligne de vente, vert foncé quand la ligne est sélectionnée. | `retours/test-vente-promotion-vert-0611.js` | 5/8 | 8/8 |
| 9 (icônes) | Ventes terminées : dessin « facture » et dessin « client », plus de doublon. « Générer une suggestion » caché. | `retours/test-ventes-terminees-icones-0611.js` | 3/7 | 7/7 |
| 12 | Suggestion : colonne RES (stock réserve) en vert, mois en 3 lettres, libellé élargi, QTE/MOY/SEUIL réduits. | `retours/test-suggestion-stock-reserve-0611.js` | 6/11 | 11/11 |
| 4 | Vente : colonne C.CIP de la grille à 13 caractères (140 px). Le champ de saisie n'est pas limité. | `retours/test-vente-colonne-cip-0611.js` | 5/9 | 9/9 |
| 14 | « Modèles de messages » passe sous « Campagnes SMS / WhatsApp », juste après « Campagnes ». Les droits suivent. | `retours/test-menu-modeles-messages-0611.js` | 4/7 | 7/7 |

Tests unitaires : `CreditLigneAffichageTest` (10 000 cas tirés au hasard), `CreditLigneCoherenceTest`,
`TicketCreditRetoursTest` et les autres `CreditLigne*` : 28 tests, tous OK.

## 2. Rapprochement, cohérence, bilan (par point)

- **5.1 et 5.2 : prix de référence et ticket.**
  - Rapprochement : grille de vente, part au rail, net serveur, ticket, fiche article, journal et base, comparés
    ligne par ligne :
    - `test-rapprochement-caisse-fiche-base.js` 26/26 ;
    - `test-base-par-tp-rapprochement-ticket.js` 23/23 ;
    - `test-rapprochement-ticket.js` 19/19.
  - Cohérence :
    - part = base × taux, somme des parts par ligne = part de l'organisme (±2 F) ;
    - `CreditLigneAffichageTest` et `CreditLigneCoherenceTest`.
  - Bilan :
    - `test-bilan-avant-apres.js` 25/25 : avant la clôture, saisies gardées et fiche intacte ; après, −2 saisies,
      +2 prix sur la fiche, +2 AJOUT au journal, rien d'autre ;
    - `test-base-par-tp-bilan-cloture.js` 28/28 ;
    - annulation : journal +2 exactement, fiche inchangée.
  - Cas variés :
    - un et deux organismes, quantité 2, P.REF et TAUX ;
    - produit sans saisie, saisie refusée (20/20) ;
    - vente abandonnée, vente annulée avec et sans saisie ;
    - paramètre à 0 et à 1 (grille identique).
- **15 : PSCODE.**
  - Rapprochement : valeur tapée = base (majuscules) = réaffichage = recherche en fiche = ajout en vente.
  - Bilan : seule la colonne PSCODE du produit bouge ; le reste de la fiche et les codes grossistes ne changent pas ;
    produit remis à l'identique.
  - Cas : minuscules, remplacement, 21 caractères, caractère interdit, effacement (NULL).
- **3.1 : promotion en vert.**
  - Rapprochement : couleur du « Oui » de la liste des promotions = couleur de la mention en vente.
  - Contraste mesuré : ≥ 4,5 ligne non sélectionnée, ≥ 3 sélectionnée (texte gras).
  - Cas : prix spécial, unités gratuites (quantité 3), sans promotion.
- **12 : suggestion.**
  - Rapprochement : RES de la grille = « Stock Res » de la barre d'information = base, ligne par ligne.
  - Cas : réserves 7, 13 et 0 ; saisie de QTE au clavier vérifiée en base (9) ; stock réserve inchangé.
- **4 : colonne C.CIP.** CIP affiché = CIP en base, entier, pour un CIP de 13 chiffres et un de 7. Largeur mesurée
  dans la police réelle de la grille.
- **14 : menu.**
  - Menu lu à l'écran et ouvert par le volet.
  - Écran ouvert : autant de modèles que la base.
  - Base : tout rôle qui a « Modèles de messages » a aussi le menu Campagnes ; rangs du menu distincts.

## 3. Non-régression rejouée sur le nouveau code

Tous verts sur le dernier WAR, ou sur un WAR précédent quand la partie modifiée ensuite ne les concerne pas.
Le cahier donne la version de chaque passage.
- **Prix de référence (cas 2), 13 tests :**
  - un organisme 27/27, deux organismes 12/12 ;
  - saisies refusées 20/20, bilan 25/25 ;
  - caisse–fiche–base 26/26 ;
  - base par organisme 21/21, 23/23, 28/28, non-régression 13/13 ;
  - net 8/8, grille identique au paramètre 0 12/12 ;
  - ticket 19/19.
- **Ligne comptant :** rapprochement 19/19, bilan 23/23, différé 14/14, une ligne cochée 24/24.
- **Modèles de ticket :** 15/15, 19/19, date 10/10.
- **Promotions :** rapprochement 39/39, écran 15/15, vente 11/11.
- **Fiche article :** EAN fabricant 20/20, menus et mise à jour 23/23.
- **Ventes terminées et icônes :**
  - modifier l'organisme 11/11, nouvel organisme principal 10/10 ;
  - infos client 7/7 ;
  - icônes des colonnes 11/11, confirmations 14/14.
- **Suggestion :** dernière entrée 13/13, équivalents DCI 15/15, commande PharmaML 20/20, disponibilité 21/21.
- **Vente :** triangles 19/19, produit sensible 27/27.
- **Menus :** retours du 07/10 21/21.
- **Tests unitaires :** les cinq classes `CreditLigne*` et `TicketCreditRetoursTest`.

Deux échecs rencontrés pendant la nuit, sans lien avec les changements :
- `retours/test-modeles-ticket.js` 14/15 une fois, sur la remise en état de la table. Rejoué seul : 15/15. La table
  des modèles est identique avant et après (comparée ligne par ligne).
- `audits/test-ecran-modifier-tp-vente-encours.js` une fois : le volet du menu était resté ouvert sur le champ date
  (capture à l'appui). Rejoué : 11/11.

## 4. Écarts trouvés et corrigés pendant la nuit

- **PSCODE.** Le code tapé puis Entrée dans le champ produit de la vente n'était pas trouvé. La recherche exacte
  (celle de la douchette) ne regardait que le CIP, le code grossiste et l'EAN 13. Elle lit maintenant aussi le PSCODE.
- **RES.** Sur la ligne sélectionnée, la règle générale de sélection passait le texte en noir. RES y est maintenant en
  vert foncé, comme « PROMOTION ».
- **C.CIP.** En vente assurance avec prix de référence, la colonne passait à 100 px. Un CIP de 13 chiffres y était
  coupé, alors que la notice disait le contraire. C'était un défaut existant : il est corrigé (140 px partout).
- **3.1.** Sur l'ancien code, la mention rouge sur une ligne sélectionnée (fond violet) n'avait qu'un contraste de
  2,28.

## 5. Ce qui reste

- **Pas fait cette nuit :**
  - 3.2 : « PROMOTION 5+1 OFFERT(S) » sur le ticket, avec copie du seuil sur la ligne ;
  - 3.3 : écran d'ajout à une promotion ;
  - 3.5 : traçabilité des promotions ;
  - 9 : détail d'une vente (poste et adresse tronqués, pastille promotion, détail assurance) ;
  - 10 : ordonnancier en onglet, colonne Poste ;
  - 11 : ordre des colonnes du récap, avec Excel, CSV et deux modèles PDF à recopier dans REPORTS ;
  - 13 : unités gratuites ;
  - 7 : export Excel du groupe ;
  - 8 : regroupement de factures.
- **Point 15, export et import du PSCODE.** Ils passent par l'ancien `MigrationServlet`, à colonnes fixes. Il faut
  des tests sur de vrais fichiers avant d'y toucher. Ce n'est pas fait.
- **Toujours en attente de votre décision :**
  - P.REF par assurance ;
  - fusion du cas 4 et des présentations des saisies ;
  - la branche des connecteurs Ubipharm (`claude/faisabilite-connecteurs-grossistes`, non fusionnée).
- **Branche.** Le code est sur `integration/recette-2026-10-29` (`1ed45eacc`), poussé. Rien n'est fusionné
  dans `dev`.
- **Migrations à passer en officine :**
  - V7.2.38 : saisies de la vente ;
  - V7.2.39 : PSCODE ;
  - V7.2.40 : menu des modèles.
