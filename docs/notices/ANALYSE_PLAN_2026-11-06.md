# Analyse du plan du 06/11/2026 (évolutions et corrections)

Analyse faite le 07/11 sur la version de l'intégration `8abc3d114`, celle qui tourne sur le domaine 1. Rien n'a été
modifié. Pour chaque point :

- **Compris** : ce que je comprends de votre demande ;
- **Aujourd'hui** : ce que fait le code ;
- **Proposition** : ce que je propose ;
- **À trancher** : les questions sur lesquelles il me faut votre avis.

Ma réponse par défaut est indiquée entre crochets. Si vous ne dites rien, je pars sur elle.

---

## 1. Modèle de ticket : date et code-barres

**Compris.** Vous vouliez seulement que la date et l'heure ne soient plus liées au code-barres pour la taille. La
date doit rester à sa place, à côté du code-barres. Elle ne devait pas monter dans la zone du haut.

**Aujourd'hui.**
- Avant le 06/11, la date était écrite à droite du code-barres, avec le même réglage de taille que lui. Réduire le
  code-barres réduisait aussi la date. Agrandir le code-barres rétrécissait la place à droite, et la date se coupait
  en morceaux.
- Le 06/11, nous avons fait de la date un bloc à part, « Date du ticket ». Ce bloc est placé au-dessus du trait qui
  sépare le pied du ticket. Vous la voyez donc remontée dans le corps du ticket : c'est bien ce que vous décrivez.
- De plus, ce bloc peut être glissé n'importe où, et sa position est recopiée sur tous les tickets.

**Proposition.**
- La date revient à côté du code-barres, à droite, comme avant, sous la référence de la vente.
- Elle garde sa propre taille dans « Modèles de ticket ». Quand on clique sur le pied du ticket, deux réglages
  apparaissent : « Taille du code-barres » et « Taille de la date ».
- La date ne peut plus être déplacée.
- Si le code-barres agrandi ne laisse plus assez de place, la date passe juste sous le code-barres au lieu d'être
  coupée.
- Les tickets déjà enregistrés sont repris sans erreur.

**À trancher.**
- Même règle pour le ticket Z (« Édité le … ») et la prévente ? [oui]
- Faut-il aussi régler l'alignement de la date, ou seulement sa taille ? [taille seulement]

---

## 2. Pilotage, onglet « À suivre » : défilement coupé

**Compris.** En faisant défiler l'onglet vers le bas, la page s'arrête trop tôt. On voit le titre des dernières
cartes, mais pas leur contenu.

**Aujourd'hui.** La hauteur de la page est calculée à l'ouverture, quand les cartes n'affichent encore que
« Chargement… ». Les courbes et les tableaux arrivent ensuite, mais la hauteur n'est jamais recalculée. Le bas de la
page est donc coupé.

**Proposition.**
- Recalculer la hauteur une fois toutes les cartes remplies, ou laisser le navigateur la calculer lui-même.
- Limiter la hauteur des grands tableaux (« CA par emplacement / famille »), avec un défilement à l'intérieur de la
  carte, comme pour les alertes.
- Test d'écran : faire défiler jusqu'en bas et vérifier que la dernière carte est entièrement visible.

**À trancher.** Rien, sauf si la coupure ne se produit que sur un écran d'une taille particulière.

---

## 3. Promotions

### 3.1 « PROMOTION » en vert à l'écran de vente

**Aujourd'hui.** Le mot est écrit en rouge foncé sur la ligne de vente.

**Proposition.** Le passer en vert, comme le « Oui » de la liste des promotions. Il doit rester lisible quand la
ligne est sélectionnée.

### 3.2 Texte du ticket : « PROMOTION 5+1 OFFERT(S) »

**Compris.** Pour une promotion « à partir de 5, 1 unité gratuite », le ticket doit afficher
« PROMOTION 5+1 OFFERT(S) » au lieu de « PROMOTION DONT 1 OFFERTE(S) ».

**Aujourd'hui.**
- Le ticket ne connaît que le nombre d'unités offertes sur la ligne.
- Le seuil « à partir de » n'est pas gardé sur la ligne de vente. Il faut aller le relire dans la promotion. Or
  celle-ci peut avoir été modifiée ou supprimée depuis la vente.

**Proposition.**
- Afficher « PROMOTION 5+1 OFFERT(S) » sur le ticket, l'aperçu et l'écran de vente.
- Recopier le seuil et le nombre gratuit sur la ligne au moment de la vente. Une réimpression montrera ainsi toujours
  la promotion telle qu'elle était le jour de la vente (voir aussi 3.5).
- Pour une promotion prix ou remise, garder « PROMOTION » seul.

**À trancher.**
- Avec 12 boîtes en 5+1, 2 sont offertes. Faut-il afficher « PROMOTION 5+1 OFFERT(S) : 2 » ou seulement
  « PROMOTION 5+1 OFFERT(S) » ? [avec « : 2 » quand plus d'une est offerte]
- « OFFERT(S) » ou « OFFERTE(S) » ? [OFFERT(S), comme vous l'écrivez]

### 3.3 Écran d'ajout d'un produit à une promotion

**Aujourd'hui.**
- Le champ de recherche est écrasé par les autres champs de la barre, d'où sa petite taille.
- La recherche renvoie déjà le prix, mais elle ne l'affiche pas.
- Elle ne renvoie pas le stock.

**Proposition.**
- Élargir nettement le champ.
- La liste de recherche affiche le CIP, le nom, le prix et le stock.
- Promotion prix : rappel « Prix actuel : X » juste avant le prix à saisir.
- Promotion unités gratuites : rappel « Stock : N » juste avant les champs « à partir de » et « gratuites ».

**À trancher.** Quel stock afficher ? [le stock vendable de l'officine, sans les dépôts]

### 3.4 Historique des promotions vide, et en onglet

**Confirmé et corrigé le 07/11.** Le journal fourni (`D:\log_historiques_promotions.txt`) montre
`ClassCastException` Boolean → Number à `listHistorique`. La correction est le commit `0fb711f1e`. Le test d'écran
`audits/test-ecran-historique-promotions.js` échouait à 10/16 sur l'ancien code et passe à 16/16 après correction.

**Analyse d'origine.** Le journal n'était pas joint à votre message. Je n'ai pas trouvé l'erreur dans les journaux du poste. La cause
est pourtant visible dans le code :
- l'historique lit une colonne « oui/non » comme si c'était un nombre ;
- cela provoque une erreur, qui est avalée en silence ;
- la liste reste donc vide, sans aucun message.

La même erreur a déjà été corrigée en juillet sur la liste des produits en promotion, mais pas sur l'historique. Si
vous avez le journal, envoyez-le-moi pour confirmer.

**Proposition.**
- Corriger la lecture de cette colonne. Je commencerai par un test qui échoue, comme le veut la règle.
- Faire de l'historique un onglet « Historique » de l'écran Promotions.
- L'ancien menu séparé est désactivé.
- L'onglet se met à jour à chaque fois qu'on l'ouvre.

**À trancher.** L'onglet Historique doit-il rester réservé à ceux qui avaient le menu Historique ? [oui, même droit
qu'avant]

### 3.5 Traçabilité des promotions

**Aujourd'hui.**
- L'ajout et la modification d'un produit en promotion laissent une ligne d'historique, mais sans l'utilisateur. Une
  modification écrase la ligne précédente.
- Le retrait d'un produit le supprime définitivement, sans aucune trace.
- La création, la modification des dates et la clôture d'une promotion ne sont pas tracées.
- Sur une vente, seul le lien vers la promotion est gardé, avec le nombre offert. Ni le prix d'avant la promotion, ni
  le type, ni le seuil ne sont gardés.
- Aucun écran ne liste les ventes faites en promotion.

**Proposition.**
- **Promotions** : chaque action (ajout, modification, retrait, changement de dates, clôture) est enregistrée avec la
  date, l'utilisateur, les anciennes valeurs et les nouvelles.
- **Retrait** : un produit retiré n'est plus effacé, il est marqué retiré.
- **Vente** : la ligne garde le type de promotion, le prix public d'avant la promotion, le seuil et les unités
  gratuites, au moment de la vente.
- **Nouvel écran « Ventes en promotion »**, en onglet de Promotions : période, produit, type, vendeur, quantité,
  unités offertes et montant de la remise.

**À trancher.**
- Faut-il aussi tracer la promotion retirée automatiquement quand une vente passe en assurance ? [oui]
- Les ventes passées dont la promotion a déjà été supprimée ne pourront pas être reconstituées. C'est une limite
  connue.

---

## 4. Écran de vente : champs CIP et QD, étiquettes

**Précision de l'utilisateur (07/11).** Le « champ CIP » est la colonne C.CIP de la grille des produits choisis.
C'est seulement son affichage qu'il faut réduire, à 13 caractères. Le champ de saisie du produit ne change pas. Le
reste de ce point est donc remplacé par cette précision.

**Compris (première lecture, remplacée).**
- Le champ de saisie du produit est trop large : le réduire à 13 caractères.
- Le champ QD est trop large : le réduire à 4 caractères.
- Avec la place gagnée, afficher après le nom du produit les étiquettes « sensible », « promotion » et
  « ordonnancier ».

**Aujourd'hui.**
- Le même champ sert à trois choses :
  - la recherche par nom (par exemple « DOLIPRANE 1000 », plus de 13 caractères) ;
  - la douchette ;
  - les étiquettes 2D (code-barres avec lot et péremption, bien plus de 13 caractères).
- Les étiquettes « sensible », « ordonnancier » et « promotion » n'apparaissent que sur les lignes déjà ajoutées.

**Proposition.**
- Réduire la **largeur affichée** du champ produit à environ 13 caractères, **sans limiter la saisie**. Une limite à
  13 couperait les étiquettes 2D, la recherche par nom et la douchette.
- QD : largeur d'environ 4 caractères, chiffres seulement. Le contrôle actuel « au plus 999 » reste en place.
- Dès qu'un produit est choisi, et avant de l'ajouter, ses étiquettes « Sensible », « Ordonnancier » et
  « Promotion » s'affichent après son nom.

**À trancher.**
- Êtes-vous d'accord pour limiter la largeur sans limiter la saisie ? [oui]

---

## 5. Ventes assurances

### 5.1 Prix de référence enregistrés avant la validation

**Compris.** Un prix de référence saisi à la caisse ne doit être enregistré sur la fiche article qu'une fois la vente
validée.

**Aujourd'hui.**
- Dès qu'on valide la cellule, le prix de référence est écrit sur la fiche du produit, pour ce tiers payant. Il est
  aussi noté dans le journal des prix de référence.
- Si la vente est abandonnée, la fiche reste modifiée.
- Toutes les ventes suivantes du même produit avec le même organisme reprennent ce prix.

**Proposition.**
- À la saisie, le prix est gardé **sur la vente seulement**. Le calcul de la vente l'utilise aussitôt, comme
  aujourd'hui.
- À la clôture de la vente, il est recopié sur la fiche article et noté dans le journal.
- Une vente abandonnée ne touche plus la fiche.

**Lenteur et coût à la clôture.** Il faut quelques écritures de plus, une par prix saisi, soit en général 1 à 5.
C'est négligeable devant le reste de la clôture (stock, caisse, organismes). La saisie elle-même ne sera pas plus
lente qu'aujourd'hui.

**À trancher.**
- Une vente mise en attente puis reprise garde-t-elle ses prix saisis ? [oui]
- Une vente annulée après clôture remet-elle l'ancien prix sur la fiche ? [non : le prix reste, et l'annulation est
  notée au journal]
- Si deux postes saisissent un prix différent pour le même produit et le même organisme, la dernière vente validée
  l'emporte. Est-ce acceptable ? [oui]

### 5.2 Pas de ligne prix/taux par produit quand c'est le taux de l'assurance

**Compris.** Si aucun prix de référence ni aucun taux n'a été saisi sur la ligne, le ticket ne doit pas afficher de
ligne « P[…] * T[…] » pour ce produit. C'est le taux de l'assurance qui s'applique.

**Aujourd'hui.**
- Avec le paramètre « ligne comptant » à 1, le ticket imprime « Taux 70 % : part » sous **chaque** produit, même
  quand le taux vient seulement de l'assurance.
- Il imprime en plus « P[…] » dès qu'un prix de référence existe sur la fiche. Il suffit qu'il y ait été laissé par
  une vente précédente (voir 5.1).

**Proposition.** La ligne par produit ne sort que si la ligne a un prix de référence ou un taux propre, différent de
celui de l'assurance. Sinon, rien sous le produit. Le bloc de l'organisme, plus bas sur le ticket, garde son taux et
sa part. Le point 5.1 supprime en plus la cause des « P[…] » inattendus.

**À trancher.**
- Cela revient sur une demande du 03/11 (cas 1), qui voulait « Taux X % : part » sous chaque ligne. Je considère que
  votre nouvelle demande la remplace. [oui]

---

## 6. Vente différée : « Espèces : 0 » sur le ticket

**Compris.** Quand le client ne paie rien en espèces, le ticket ne doit pas afficher « Espèces : 0 » comme mode de
règlement.

**Aujourd'hui.**
- Le différé est rangé avec les espèces dans le calcul des règlements.
- Le ticket imprimé à la clôture affiche donc le mode Espèces, puis « Montant versé : 0 » et « Monnaie : 0 ».
- La réimpression, elle, affiche le mode différé. Les deux tickets ne sont donc même pas identiques.

**Proposition.**
- Sur le ticket, le règlement s'affiche « Différé ».
- Les lignes « Montant versé » et « Monnaie » ne s'affichent plus quand elles valent 0.
- S'il y a un acompte en espèces, le ticket affiche « Espèces versées : X » et « Reste dû : Y ».
- Le ticket de clôture et la réimpression deviennent identiques.
- Le calcul de la caisse et des recettes n'est pas touché : seul l'affichage du ticket change.

**À trancher.** Rien, sauf si vous voulez un autre libellé que « Différé ».

---

## 7. Facturation de groupe : export Excel

**Compris.** Ajouter un bouton « Excel » juste après le bouton « Relevé ».

**Proposition.**
- Le bouton exporte avec les mêmes filtres que le relevé : période, groupe, recherche, et la facture choisie s'il y
  en a une.
- Les chiffres sont repris du relevé, pour qu'ils soient identiques à ceux du PDF.
- Un test de rapprochement compare le classeur, le relevé et l'écran.

**À trancher.**
- Une ligne par facture de groupe (comme l'écran), ou une ligne par facture d'organisme (comme le relevé) ? [deux
  feuilles : « Synthèse » comme l'écran, « Détail » comme le relevé]
- Le numéro de facture de groupe n'est pas affiché à l'écran aujourd'hui. Faut-il l'ajouter aussi à l'écran ? [oui]

---

## 8. Facturation : regrouper des factures faites une par une

**Compris.** Pouvoir rassembler dans une facture de groupe des factures déjà générées séparément.

**Réponse : oui, c'est faisable.**
- Une facture de groupe n'est qu'un lien entre un numéro de groupe et des factures existantes. Les factures
  elles-mêmes ne sont pas refaites, et leurs numéros ne changent pas.
- Il faut créer un écran : choisir le groupe, cocher les factures de ses organismes, puis valider. Un nouveau
  numéro de groupe est alors pris.

**Contraintes.**
- Une facture déjà dans un groupe ne peut pas être reprise. Aujourd'hui, rien en base n'interdit le double
  rattachement : il faudra l'interdire.
- Les factures en avoir ou supprimées sont exclues.
- La facture de groupe apparaîtra à la date du regroupement.

**À trancher.**
- Accepter les factures déjà partiellement réglées ? [oui, avec le montant déjà payé repris]
- Accepter les factures déjà envoyées à l'organisme ? [oui, avec un avertissement dans le bouton]
- Pouvoir défaire un regroupement ? [oui, tant qu'aucun règlement de groupe n'a été saisi]

---

## 9. Ventes terminées

**Icônes identiques.**
- **Aujourd'hui.** Les icônes au trait sont choisies d'après le nom de l'image. « Modifier » (rouvrir la vente) et
  « Modifier info client » reçoivent donc le même crayon. « Réimprimer le ticket » et « Réimprimer la facture »
  reçoivent la même imprimante.
- **Proposition.** Une icône « facture » pour la facture, une icône « client » pour « Modifier info client ». Le
  crayon et l'imprimante restent pour la vente et le ticket.

**Bouton « Générer une suggestion ».** Je le cache pour tout le monde. [pour tout le monde]

**Détail d'une vente.**
- **Poste et adresse.** Ils sont tronqués : ils passent sur une seule ligne, avec la valeur complète au survol.
- **Promotion.**
  - **Aujourd'hui.** Rien n'est affiché, alors que l'information existe.
  - **Proposition.** Ajouter sur la ligne une pastille « Promotion » et l'explication, par exemple « 5+1, 2 offertes »
    ou « Prix promo 1 500 au lieu de 1 800 ».
- **Vente assurance.**
  - **Aujourd'hui.** Rien n'est affiché par ligne.
  - **Proposition.** Afficher pour chaque produit ce qu'on lit sur le ticket : prix de référence s'il y en a un, taux
    et part de chaque organisme, part du client.
  - Le calcul du ticket est réutilisé, pour que l'écran et le ticket donnent les mêmes chiffres. Un test de
    rapprochement compare les deux.

**À trancher.** Le détail assurance doit-il s'afficher même quand le paramètre « ligne comptant » est à 0 ? [oui :
c'est un écran de consultation]

---

## 10. Historique ordonnancier : en onglet, et colonne « Poste »

**Compris.**
- L'historique devient un onglet de l'écran Ordonnancier.
- Les onglets Registre et Historique gagnent une colonne « Poste », comme dans Ventes terminées.

**Aujourd'hui.**
- L'historique est un menu séparé.
- Le poste est enregistré sur chaque vente depuis le 10/10, mais il n'est relu ni par le registre ni par
  l'historique. Les ventes d'avant le 10/10 n'auront pas de poste.

**Proposition.**
- L'onglet « Historique » est ajouté dans Ordonnancier, avec ses propres filtres.
- Il n'est visible que pour ceux qui ont le droit Historique ordonnancier.
- L'ancien menu est désactivé.
- La colonne « Poste » affiche le poste de saisie, avec le poste d'encaissement au survol, comme dans Ventes
  terminées.
- Au passage : les données de l'historique ne vérifient aujourd'hui que la connexion, pas ce droit. Je l'ajoute.

**À trancher.**
- Certains profils ont le droit Historique sans le droit Ordonnancier. Ils perdraient l'accès : faut-il leur donner
  aussi le droit Ordonnancier ? [oui]
- La colonne Poste doit-elle aussi figurer dans les impressions et les exports Excel ? [oui]

---

## 11. Articles vendus récap : ordre des colonnes

**Compris.** Le nouvel ordre est : CIP, Désignation, **Prix unitaire**, Prix d'achat, **Quantité vendue**,
**Montant**, puis le reste.

**Aujourd'hui.**
- Il n'y a pas de prix unitaire.
- Le prix d'achat est celui de la fiche.
- Les exports Excel et CSV ont leurs propres colonnes. Le PDF vient de modèles du dossier REPORTS du poste.

**Proposition.**
- Changer l'ordre à l'écran, dans l'Excel et dans le CSV.
- Mettre à jour les deux modèles PDF. Ils devront être recopiés dans le dossier REPORTS de chaque poste.

**À trancher.**
- Le prix unitaire est-il le prix de vente actuel de la fiche, ou le prix moyen réellement vendu sur la période
  (remises, promotions comprises) ? [le prix moyen vendu = montant ÷ quantité]

---

## 12. Suggestion, traitement : colonnes

**Compris.**
- Abréger les mois de l'historique en 3 lettres.
- Ajouter une colonne « RES » en vert pour le stock en réserve.
- Agrandir la colonne Libellé et réduire les colonnes QTE, MOY et SEUIL.

**Aujourd'hui.**
- Le stock réserve est déjà calculé pour la barre d'information du produit (« Stock Res »), mais il n'est pas dans la
  grille.

**Proposition.**
- Mois : Jan, Fév, Mar, Avr, Mai, Jun, Jul, Aoû, Sep, Oct, Nov, Déc, avec le nom complet au survol. Je mets « Jun » et
  « Jul » pour distinguer juin et juillet, qui donneraient tous les deux « Jui ».
- Colonne RES en vert, à côté de STOCK.
- QTE, MOY et SEUIL en largeur réduite, et la place gagnée va au libellé.
- Je vérifie que la saisie au clavier de QTE et du seuil marche comme avant.

**À trancher.**
- « RES » est-il bien le stock du magasin de réserve, comme « Stock Res » dans la barre d'information ? Si c'est
  plutôt des quantités réservées pour des clients, ce n'est pas la même donnée. [stock de réserve]

---

## 13. Ventes unités gratuites

**Aujourd'hui.**
- L'écran n'est pas déclaré dans `correctifs-affichage.js`.
- La donnée « utilisateur » existe sur la vente, mais elle n'est ni lue ni affichée.
- Point important : cet écran compte les **unités gratuites du fournisseur** écoulées à la vente. Il ne compte pas
  les **unités offertes par une promotion** (point 3).
- Petits défauts :
  - la recherche ne filtre rien ;
  - la pagination est trompeuse, car tout est chargé d'un coup ;
  - le chargement devient lent sur une longue période.

**Proposition.**
- Déclarer l'écran dans `correctifs-affichage.js`.
- Ajouter une colonne Utilisateur, à l'écran et sur le PDF.
- Corriger la recherche et la pagination.
- Ajouter un onglet « Analyse », sur la période choisie :
  - les produits les plus écoulés en unités gratuites, en quantité et en valeur ;
  - la répartition par utilisateur ;
  - l'évolution par jour.

**À trancher.**
- Quel utilisateur afficher : le vendeur, le caissier ou celui qui a saisi la vente ? [le vendeur]
- Faut-il aussi inclure les unités offertes par les promotions, dans une colonne ou un onglet à part ? [oui, colonne
  séparée]
- L'analyse doit-elle avoir un graphique ? [oui, un graphique en barres pour les 10 premiers produits]

---

## 14. Modèles de message dans Campagne SMS/WhatsApp

**Proposition.**
- Le menu « Modèles de messages » passe dans le menu « Campagne SMS/WhatsApp ».
- Tous ceux qui voyaient « Modèles de messages » reçoivent aussi le droit du menu Campagnes. Sans cela, ils perdraient
  l'accès.
- L'écran lui-même ne change pas.

**À trancher.** Un sous-menu dans Campagnes, ou un onglet de l'écran Campagnes ? [sous-menu, juste après
« Campagnes »]

---

## 15. Fiche article : champ PSCODE

**Précision de l'utilisateur (07/11).** Le PSCODE est un code grossiste secondaire. Il est facultatif à la création,
et on doit pouvoir rechercher un produit avec.

**Compris.** Il faut un nouveau champ alphanumérique, PSCODE (par exemple FORT256), sur la fiche article et en base.

**Aujourd'hui.** Aucun champ de ce type n'existe. Le plus proche est le « code EAN fabricant ». C'est lui qui
servira de modèle, de la base jusqu'à la fiche.

**Proposition.**
- Ajouter une colonne en base et un champ dans la fiche article (saisie et consultation).
- Un test vérifie qu'un PSCODE saisi est bien relu à la réouverture de la fiche.

**À trancher.**
- Longueur maximale ? [20 caractères]
- Majuscules imposées ? [oui]
- Unique par article ? [non]
- Obligatoire ? [non]
- Faut-il pouvoir rechercher un produit par son PSCODE en vente, en commande et en inventaire, ou seulement le voir
  sur la fiche ? [fiche et recherche en vente]
- Faut-il le mettre dans l'export et l'import des articles ? [oui, en dernière colonne, pour ne pas casser les
  fichiers existants]
- Que veut dire « PS » ? Vient-il d'un référentiel externe à synchroniser ?

---

## Ordre de travail proposé

1. **Corrections** :
   - historique des promotions vide (3.4) ;
   - ticket du différé (6) ;
   - date du ticket remise à côté du code-barres (1) ;
   - défilement du pilotage (2).
2. **Ventes assurances** : prix de référence enregistré à la clôture (5.1), ligne prix/taux par produit (5.2).
3. **Promotions** : texte vert et « 5+1 » (3.1, 3.2), écran d'ajout (3.3), traçabilité et ventes en promotion (3.5).
4. **Écrans** :
   - vente (4) ;
   - ventes terminées (9) ;
   - récap (11) ;
   - suggestion (12) ;
   - unités gratuites (13).
5. **Menus et facturation** :
   - ordonnancier (10) ;
   - modèles de message (14) ;
   - export Excel du groupe (7) ;
   - PSCODE (15) ;
   - regroupement de factures (8).

Chaque point aura ses tests de rapprochement, de cohérence et de bilan avant / après, conformément aux règles.
