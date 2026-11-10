# Plan du 09/11/2026 : ce que j'ai compris, à valider avant code

Base de lecture : l'intégration du 29/10, celle qui est déployée sur 8080. Aucun code n'est écrit avant votre validation.
Chaque point sera livré avec ses tests :
- un test qui échoue d'abord sur l'ancien code ;
- un test de rapprochement ;
- un test de cohérence s'il y a un calcul ;
- un test d'écran par de vrais clics.

Les questions sont regroupées à la fin (§ Q). Les points sans question peuvent partir dès votre accord.

---

## 1. Fiche article, en modification

**Compris :**
- remettre en ordre les blocs IDENTITÉ, PRIX & STOCK, GESTION et IMAGE ;
- les champs de saisie sont alignés sur une même colonne de libellés ;
- les listes déroulantes ne sont plus collées les unes aux autres ;
- aucun champ n'est étiré ;
- aucun défilement horizontal.

**Constat** (`famille/action/add.js`) :
- les largeurs de libellé varient d'un bloc à l'autre (150, 118, 236, 18) ;
- la ligne Q1/Q2 a des largeurs fixes d'environ 404 px et déborde : c'est elle qui crée le défilement horizontal.

**Je ferai :**
- une seule largeur de libellé ;
- des champs à largeur fixe selon leur nature (code court, prix, quantité, liste), sans étirement ;
- 8 px d'espace entre deux listes ;
- un retour à la ligne au lieu du débordement.

**Libellés et zone réserve :**
- la zone « réserve » descend juste sous « Code tableau » ;
- « Quantite reserve » devient « Quantité en réserve » ;
- « Quantité dans UN CH » devient « Contenance CH » ;
- « PSCODE (Ubipharm) » devient « PSCODE ».

**Erreur JS du journal** (« componentLayoutCounter, a is undefined », `FamilleManager.js` l. 2081) :
- **Cause :** une variable globale (`Me_Workflow`) garde la fenêtre précédente, déjà fermée. La recherche suivante essaie de la redessiner.
- **Je ferai :** une référence locale à la bonne grille, et aucun redessin d'un composant détruit.

---

## 2. Réconciliation de BL

**Prix dans l'en-tête de « Associer » :** l'en-tête ne montre aujourd'hui que le produit du BL. J'y ajoute le prix de la ligne du BL, plus le prix d'achat et le prix de vente de la fiche, pour voir l'écart d'un coup d'œil (question Q2).

**Recherche parmi les désactivés :**
- La case « Rechercher dans les désactivés » et la réactivation à l'association existent déjà dans l'intégration (`ReconciliationPanel.js`).
- Je vérifierai par un test qu'elle est **décochée par défaut**, visible, et que l'association d'un produit désactivé le réactive en un seul clic, avec la confirmation dans le bouton.
- Si vous ne l'avez pas vue sur 8080, dites-le-moi (Q3) : c'est alors un problème d'affichage à corriger.

**En plus :** la recherche est en « commence par ». Je la passe en « contient », comme au point 4.

---

## 3. Pointage BL : rechercher par date de BL

**Constat :** le serveur (`PointageBLService`, l. 113 et 160) filtre **déjà** sur la date de livraison du BL, pas sur la date de saisie.

**À éclaircir :**
- Ce que vous voyez peut venir d'un autre champ : une date de BL vide ou remplie avec la date du jour à la saisie, ou un libellé trompeur à l'écran.
- J'ai besoin d'un exemple : un n° de BL, la date imprimée sur le BL, et la période cherchée (Q4).
- Je vérifierai aussi comment la date du BL est remplie à la saisie et à l'import PharmaML.

---

## 4. Retour fournisseur

- La recherche de produit passe de « commence par » à **« contient »**. Cela concerne trois endroits : `MvtProduitServiceImpl`, `RetourFournisseur` et `RetourFourData`.
- **Nouveau :** une recherche par **n° de BL**. On tape le n° (ou une partie), et la liste propose les produits de ce BL.

---

## 5. Prévision

**Taux de rupture.** Aujourd'hui, il compte les produits « prévus ≥ 1 par mois » dont le stock est ≤ 0. Ce stock est figé au recalcul de la nuit (2 h 37). Il n'y a aucun réglage.

Je propose trois paramètres, dans Paramétrages › PREVISION :

| Paramètre | Sens | Valeur par défaut proposée |
|---|---|---|
| Nombre de mois | période observée | 3 |
| Vente fréquente | vendu dans au moins **N mois** de la période **et** au moins **Q unités** au total | N = 2, Q = 3 |
| Stock = 0 | stock **actuel** (au moment de l'affichage, pas celui de la nuit) | – |

Taux de rupture = produits fréquents à stock 0, divisés par les produits fréquents.
Le détail du taux affiche la liste des produits comptés, pour comparer au ressenti du comptoir.

**Onglet Prévisions :**
- un filtre « Fiabilité ≥ X % » (champ numérique, vide = pas de filtre) ;
- le texte « 6 derniers mois », aujourd'hui écrit en dur, suivra le paramètre réel.

---

## 6. Tableau de bord

- La carte « Activité des équipes » ne montre aujourd'hui que 4 repères. J'en ajoute, sur des tuiles sans cadre coloré :
  - ventes longues ;
  - préventes perdues ;
  - annulations ;
  - BL en attente ;
  - CA par conseil.
- Les trois critères que vous avez recopiés (mois, ventes minimales, stock 0) concernent la **tuile du taux de rupture**. J'ai compris : la tuile du tableau de bord utilise **les mêmes paramètres** que le menu Prévision, avec le même chiffre aux deux endroits. Un test de rapprochement vérifiera que les deux sont égaux (Q5).

---

## 7. Paramétrages : onglet « POSTE »

**Pourquoi le nom se perd :**
- Le nom du poste est gardé dans le navigateur.
- À la **déconnexion**, `Header.js` (l. 301) vide tout le stockage du navigateur, y compris ce nom.
- C'est un défaut à corriger en premier : la déconnexion ne videra plus que les données de session.

**Je ferai :**
- Une rubrique **POSTE** dans Paramétrages. Elle montre le nom de ce poste et propose « Enregistrer » et « Effacer », avec la confirmation dans le bouton.
- Le champ du « Fichier journal » reste, mais renvoie au même réglage.
- La page de connexion enverra aussi ce nom. Aujourd'hui, le journal de connexion prend le nom réseau.
- **Proposition (Q6) :** une liste côté serveur des postes connus (nom, dernière connexion, utilisateur), visible dans la même rubrique, pour retrouver les postes de l'officine.

---

## 8. « À propos » de la version 3

Aujourd'hui, la fenêtre affiche « PRESTIGE II, édition 03/2014 » avec une ancienne image.

| Proposition | Contenu |
|---|---|
| **A. Carte « Prestige 3 »** | Nouvelle icône, version et date de construction lues sur le serveur, nom du poste, utilisateur, officine. Bouton « Copier les informations pour l'assistance ». |
| **B. Nouveautés de la version 3** | Les nouveautés par domaine (vente, stock, commandes, campagnes…), tirées de la liste du 09/11, chacune avec le menu où la trouver. |
| **C. Panneau à trois onglets (recommandé)** | Volet à droite avec **Version** (A), **Nouveautés** (B) et **Assistance** : état du serveur, base, dernière sauvegarde, espace disque, et contact. |

Je ferai une page de présentation des trois avant le code (Q7).

---

## 9. Ventes terminées : détail d'une vente

**Cause** (`DetailVente.js`) :
- les blocs (Infos vente, Règlements, Client, Ayant droit, Tiers payant) répartissent leur hauteur entre les champs, dans une fenêtre sans hauteur fixe : ils se chevauchent ;
- les champs ne prennent pas toute la largeur : « au comptant », les noms du client, de l'ayant droit et du tiers payant passent sur 2 lignes.

**Je ferai :**
- des blocs à hauteur naturelle, les uns sous les autres, avec défilement vertical du volet si besoin ;
- des champs sur toute la largeur ;
- des libellés plus courts.

Je corrige aussi deux fautes : « Prénon » et « Motant ».

---

## 10. Activité des équipes : explications et corrections

### Ce que je change

- **Sélecteur de période :**
  - ajout de **1 mois** après 1 semaine ;
  - ajout d'un **sélecteur de garde** : la garde choisie fixe le début et la fin, en jour et en heure, pour suivre l'activité de la nuit ou du dimanche.
- **Couleurs :**
  - la légende « Ventes » prend la couleur des barres ;
  - pas de cadre de tuile avec une couleur à gauche ;
  - la ligne « 2 alertes : BL saisi en retard » est retirée ;
  - les en-têtes d'onglets prennent des couleurs, au tableau de bord comme ici (Q8).
- **Seuil de « vente longue » (10 min) :** devient un paramètre enregistré, réglable dans Paramétrages et depuis l'écran. Il sert **partout** : l'onglet principal, l'onglet Anomalies et la carte du tableau de bord. Un test vérifie que les trois donnent le même nombre.
- **Par caissière :** ajout de la répartition par type de vente (comptant, assurance, carnet, dépôt, avoir), en nombre et en %.
- **Annulations par auteur :**
  - ajout à droite d'un **taux par caissière** : annulations divisées par ventes encaissées ;
  - ajout dans le détail d'une colonne **« Encaissé par »**.
- **CA par employé :**
  - ajout d'une attribution **par conseil**, c'est-à-dire par la personne qui a fait le conseil à l'écran de vente, et d'un tri sur cette colonne ;
  - le nombre de ventes passe en **violet**, plus grand et en gras.

### Réponses à vos questions

**Ventes de plus de 10 min : qu'est-ce que cela nous apprend ?**
- Ce sont les ventes restées ouvertes plus longtemps que le seuil.
- Elles montrent les blocages : client qui hésite, produit cherché en réserve, problème de prise en charge, vente oubliée ouverte.
- C'est utile si l'on regarde **qui, à quelle heure et quel type de vente**. Par exemple : beaucoup de ventes assurance longues le matin, signe d'un goulot à la prise en charge.

**Charge au clavier par jour : quel planning ?**
- C'est le temps total passé à saisir des ventes et des BL, jour par jour.
- « Base du planning » veut dire : le **planning du personnel**, combien de personnes mettre au comptoir selon le jour et l'heure.
- **Mais la mesure est fausse aujourd'hui.** Une vente laissée ouverte compte toute sa durée, sans limite.
- Je propose :
  - de plafonner chaque vente au seuil de vente longue ;
  - de l'afficher heure par heure à côté de l'affluence.
- Sans cette correction, ce chiffre n'a pas de valeur.

**Vitesse par opérateur : que signifient « 5082,2 s par ligne » et « 1,4 ligne par vente » ?**
- Les secondes par ligne, c'est le temps de saisie d'une vente divisé par son nombre de produits.
- **5082 s (1 h 25) par ligne est un défaut de mesure.** Ce sont des ventes ouvertes puis reprises bien plus tard (préventes, ventes en attente), comptées en entier.
- 1,4 ligne par vente, c'est le nombre moyen de produits par vente.
- Je corrige avec :
  - le plafond ;
  - l'exclusion des préventes reprises ;
  - la **médiane** au lieu de la moyenne : une seule vente oubliée ne fausse plus tout.
- Pertinence : repérer qui a besoin d'aide à la saisie, en comparant à nombre de ventes comparable.

**Vitesse par type de vente : 11 s par ligne, c'est-à-dire ?**
- Pour ce type de vente, il faut en moyenne 11 secondes par produit saisi.
- Si une vente assurance demande 35 s par ligne contre 11 s au comptant, une vente assurance de 3 produits prend environ 1 min 10 de plus.
- Concrètement, cela sert :
  - à estimer le temps de comptoir selon le mélange de ventes (beaucoup d'assurance, donc plus de monde) ;
  - à nous montrer quelles saisies alléger dans le logiciel.
- On ne s'en sert pas pour juger une personne.

**Préventes par vendeur : à quoi correspond ce taux ?**
- Taux = (préventes annulées + préventes abandonnées, c'est-à-dire jamais encaissées après le jour de saisie) ÷ préventes saisies par ce vendeur.
- C'est la part des préventes **perdues** : le client est reparti sans payer, ou la prévente a été refaite.
- Un taux élevé chez un vendeur est à expliquer : erreur de saisie, client mal orienté vers la caisse.

**Vitesse des caissières : pourquoi « Mesurées 0 » ?**
- « Mesurées » = nombre de préventes dont on connaît l'heure à laquelle la caissière les a ouvertes.
- Le temps moyen et le temps médian vont de cette ouverture à l'encaissement.
- **0 est normal pour l'instant :**
  - cet enregistrement existe depuis le 09/11 ;
  - il ne se fait que lorsqu'une caissière ouvre la prévente **d'un autre vendeur** à l'écran de vente ;
  - sur ce poste, la table est encore vide (vérifié en base : 0 ligne).
- Le chiffre se remplira à l'usage. Mon test vérifiera qu'une prévente ouverte par scan de QR (point 11) est bien comptée.

**Saisie des BL par grossiste : 2 min 21 s par ligne, c'est-à-dire ?**
- C'est le temps de saisie d'un BL divisé par son nombre de lignes.
- **Défaut :** ce temps part de la création de la **commande**, pas de l'ouverture de la saisie du BL. Il inclut donc l'attente de la livraison.
- Je corrige : de l'ouverture de la saisie à la clôture du BL, avec un plafond.
- Pertinence : voir les grossistes dont les BL sont longs à saisir (pas d'envoi électronique, codes non reconnus), donc ceux à passer en PharmaML ou en import.

### D'autres éléments utiles pour suivre les employés (Q9, à choisir)

1. **Remises accordées** par employé : montant et % du CA.
2. **Ventes modifiées après encaissement** et **écarts de caisse** par caissière.
3. **Panier moyen** et **produits par vente** par vendeur : efficacité du conseil.
4. **Taux de conseil** : part des ventes avec conseil saisi.
5. **Temps d'attente client** : de la prévente à l'encaissement.
6. **Avoirs et retours** par employé.
7. **Activité par heure de présence** : chiffres rapportés aux heures pointées en RH.

---

## 11. Prévente : scan d'un QR

**Cause :** sur l'écran de prévente, le scan charge la vente sans réappliquer la vue « prévente » (`VenteCtr.searchAndLoadPrevente`). Le volet d'encaissement apparaît donc et le bouton de clôture change. Le même défaut existe dans la vente en dépôt.

**Je ferai :** après le scan, si l'on est sur l'écran de prévente, on masque l'encaissement et on garde « Fermer la prévente », comme à l'ouverture normale.

---

## 12. Inventaires

- **Filtre « Vendus après la création de l'inventaire » :** les produits de l'inventaire qui ont eu une vente encaissée, non annulée, après la date de création. Utile pour ajuster le comptage.
- **Impression :** un PDF du filtre en cours, avec code, désignation, emplacement, stock théorique, quantité comptée, écart, et quantité vendue depuis la création pour ce filtre (Q10).

---

## 13. Ticket Z et traces WhatsApp

**Constat :**
- L'envoi du ticket Z laisse une ligne dans le journal WhatsApp, mais elle est rangée comme un **message d'essai**, sans nom d'utilisateur et sans dire qu'il s'agit du ticket Z.
- Rien dans le journal des événements.
- Le ticket Z par SMS n'est pas tracé non plus.

**Je ferai :**
- Chaque envoi WhatsApp porte son **origine** et l'**utilisateur** qui l'a déclenché. Origines : ticket Z, campagne, rappel, discussion, avis, essai.
- Une colonne « Origine » dans le journal des Comptes WhatsApp.
- Une ligne dans le journal des événements : « Ticket Z envoyé au pharmacien (WhatsApp) », avec date, utilisateur, statut. **Jamais le texte du message.**
- La même chose pour le ticket Z par SMS.

**Cas à part :** les anciens liens « wa.me » de Campagne client partent du WhatsApp du téléphone ou du navigateur. Prestige ne voit pas l'envoi réel ; il peut seulement tracer le clic (Q11).

---

## 14. Campagnes, onglet Journal : le violet ne passe pas au vert

**Trois causes :**
1. La grille du journal ne se recharge qu'à l'ouverture de l'onglet. Un statut reçu ensuite ne s'affiche pas.
2. La ligne sélectionnée est surlignée en **violet**, ce qui cache la couleur de l'état.
3. Un accusé « envoyé » arrivé en retard peut écraser « distribué » ou « lu » en base.

**Je ferai :**
- un rafraîchissement automatique toutes les 20 s tant que l'onglet est visible ;
- l'état reste coloré même sur la ligne sélectionnée ;
- un statut ne peut plus reculer (envoyé, puis distribué, puis lu).

## 14 bis. Écran de connexion : pas de fond blanc

- Les fonds clairs, presque blancs, sont remplacés :
  - fond de page, carte, panneau de connexion ;
  - champs de saisie ;
  - badges et fenêtres de la page.
- Je propose les teintes de la nouvelle icône : violet profond en fond, vert d'eau et or en accents, texte clair.
- Je vous montrerai la proposition avant de l'appliquer (Q12).

---

## 15. Ticket : nom du tiers payant sur une ligne

**Cause :** quand « nom de l'organisme [taux] + montant » dépasse la largeur, le nom est coupé sur 2 lignes et le montant descend sur la 2e (`RenduTicket.paire`).

**Je ferai :** le nom reste sur **une seule ligne**, raccourci par « … » s'il est trop long. Le taux et le montant restent visibles sur la même ligne. Exemple : `MUTUELLE GÉNÉRALE DES… [80%]    12 500` (Q13).

## 16. Icône Prestige 3

Votre `prestige3.ico` (P blanc et vert d'eau sur violet, pastille dorée « 3 ») remplace :
- l'icône de l'onglet du navigateur ;
- les icônes de 16 à 256 px ;
- le logo de la page de connexion et du bandeau ;
- l'image de la fenêtre « À propos ».

Le numéro de version du fichier change, pour que les navigateurs ne gardent pas l'ancienne.

## 17. Ticket : worktree

Fait le 10/11 puis annulé à votre demande : l'ancien et le nouveau modèle ont le même début d'impression (limite de la Star TSP100). Rien à faire.

## 18. Confirmation au clic : une seule couleur

Neuf écrans affichent déjà le bouton armé en **rouge, texte blanc**. Cinq ne changent que le texte : Extranets grossistes, Litiges, Mon compte (PIN), RH (badge, désactivation, borne), et Retour fournisseur (texte rouge seulement).

**Je ferai :** tous passent par le même style, rouge et texte blanc. Un test d'écran clique chaque bouton et vérifie la couleur.

## 19. Icône de « Campagnes SMS / WhatsApp »

Le menu prend la cloche parce que son nom contient « SMS ». Je lui donne un **porte-voix**, comme sur l'écran Metro. La cloche reste aux Notifications.

## 20. Campagnes › Listes de diffusion : pourquoi les colonnes ont bougé

- Cela vient de votre demande du **plan avoir du 08/11** : « Ajouter des clients » était placé après la liste des clients, et vous avez demandé de le placer avant.
- Le changement a aussi ajouté les filtres, la colonne Achats et le panier, et réduit la colonne Téléphone.
- Avant, on avait trois blocs côte à côte. Maintenant, « Ajouter des clients » est au-dessus de « Clients de la liste ».
- Question Q14 : garder cet ordre, ou revenir aux trois blocs côte à côte en gardant les filtres et le panier ?

---

## Pointage BL : imports DPCI, TEDIS et Copharmed (Ubipharm OK)

### Fonctionnement actuel
- L'import ne prend qu'un **PDF**. Le relevé est lu soit au format standard (celui d'Ubipharm), soit par un modèle de colonnes que l'on désigne une fois et qui est mémorisé par grossiste.
- Le rapprochement suit trois règles :
  - **référence :** on garde la plus longue suite de chiffres du n° du relevé et on la compare au n° saisi sur le BL ;
  - **montant HT :** tolérance de 1 F ;
  - **date :** ± 7 jours.

### Par grossiste

| Grossiste | Ce que dit le relevé | Ce qui marche | Ce qui échoue |
|---|---|---|---|
| **TEDIS** | n° de BL `2628970884-VRI`, HT brut, ristourne, HT net, TTC | les BL (le suffixe est ignoré) | les **avoirs `AV-…`**, jamais trouvés : on les cherche par le n° du BL d'origine, pas par le n° d'avoir ; la ligne **PR-ABO** (abonnement), lue comme un BL ; un écart possible si l'on compare au HT brut au lieu du HT net |
| **DPCI** | n° de **facture** `FAC R40235168`, avoirs `AVO R11409455` (montant `1.732-`) | les BL dont la référence saisie est ce n° de facture | les BL reçus par **PharmaML**, enregistrés sous le n° de livraison : il manque le lien facture → BL (l'information existe dans les données PharmaML) ; les avoirs AVO ; le signe « - » en fin de montant |
| **Copharmed** | relevé `00-24936`, n° facture `30-224710-00`, montant | – | le n° devient « 224710 » (les préfixes 10, 20, 30 peuvent se confondre) ; le montant du relevé est très probablement **TTC** alors que Prestige compare au **HT**, d'où des écarts partout |

### Ce que je propose
1. **Avoirs** : rapprochés par leur **propre n°** (AV-…, AVO…), montant négatif, y compris le signe en fin de nombre (`1.732-`).
2. **Lignes ignorées** par grossiste : PR-ABO, frais et abonnements, affichés à part et non comptés comme « BL manquant ».
3. **Montant comparé, au choix par grossiste** : HT net (TEDIS), HT (DPCI) ou TTC (Copharmed). Prestige calcule le TTC du BL.
4. **DPCI** : lien facture → BL repris des données PharmaML. Une facture qui couvre plusieurs BL est rapprochée de leur somme.
5. **Copharmed** : la référence garde le préfixe (`30-224710`) et la comparaison se fait au format exact.
6. **Repli** : si aucune référence ne correspond, on propose les BL au même montant à ± 3 jours, à confirmer d'un clic, jamais automatiquement.
7. Ensuite seulement, si vous le souhaitez : l'import **Excel / CSV** et la lecture directe depuis l'extranet du grossiste.

**Tests :**
- vos trois relevés, rendus anonymes, deviennent des jeux d'essai, avec des BL, des avoirs, une ligne PR-ABO, une facture couvrant 2 BL et un écart de montant ;
- un test de rapprochement vérifie qu'à chaque ligne du relevé correspond le bon BL, à l'écran comme en base ;
- un test de non-régression vérifie que le relevé Ubipharm donne exactement le même résultat qu'aujourd'hui.

---

## Q. Questions

1. **Ordre de travail.** Je propose :
   1. défauts sûrs (1, 9, 11, 14, 18, 19) ;
   2. pointage BL ;
   3. points 2, 3, 4, 12 ;
   4. point 10 et tableau de bord ;
   5. prévision ;
   6. point 7 ;
   7. points 13, 15, 16 ;
   8. propositions visuelles (8, 14 bis, 20).

   D'accord ?
2. **Point 2.** Quels prix dans l'en-tête « Associer » : prix de la ligne du BL, prix d'achat et prix de vente de la fiche ? Ou un seul ?
3. **Point 2.** Voyez-vous la case « Rechercher dans les désactivés » sur 8080 ?
4. **Point 3.** Un exemple de BL mal trouvé : n° du BL, date imprimée, période cherchée.
5. **Point 6.** Le taux de rupture du tableau de bord suit-il les mêmes paramètres que Prévision (un seul réglage) ?
6. **Point 7.** Faut-il aussi une liste serveur des postes connus ?
7. **Point 8.** A, B ou C (C recommandé) ? Je présente d'abord une maquette.
8. **Point 10.** Couleurs des onglets : une couleur par onglet, ou une couleur commune plus foncée pour l'onglet actif ?
9. **Point 10.** Lesquels des 7 indicateurs supplémentaires ajouter ?
10. **Point 12.** Les colonnes proposées pour l'impression vous conviennent-elles ?
11. **Point 13.** Faut-il tracer le clic sur les liens wa.me (on ne peut pas savoir si le message est parti) ?
12. **Point 14 bis.** Fond violet de l'icône : d'accord pour une maquette ?
13. **Point 15.** Raccourcir le nom par « … » sur une ligne, d'accord ?
14. **Point 20.** Garder « Ajouter des clients » au-dessus, ou revenir aux trois blocs côte à côte ?
15. **Pointage.**
    - Comment saisissez-vous la référence d'un BL DPCI et d'un BL Copharmed : n° de facture ou n° de BL ?
    - Le montant du relevé Copharmed est-il TTC ?

---

## Réponses du 10/11

1. **Ordre de travail :** pas d'objection, il est suivi. Le pointage BL passe en premier, puisque c'était la demande principale.
2. **Point 2 :** prix d'achat et prix de vente ajoutés **après le nom du produit** dans l'en-tête « Associer ».
3. **Point 2 :** la case « Rechercher dans les désactivés » est visible. Je vérifierai seulement qu'elle est décochée par défaut.
4. **Point 3 :** « la recherche est faite par date de BL ou date d'entrée ». J'ajoute un choix « Date du BL / Date d'entrée », avec la date du BL par défaut.
5. **Point 6 :** un seul réglage pour la prévision et le tableau de bord.
6. **Point 7 :** oui, une liste serveur des postes connus.
7. **Point 8 :** proposition C, maquette d'abord.
8. **Point 10 :** une couleur par onglet.
9. **Point 10, indicateurs supplémentaires :** pas de réponse. Le point passe en fin de file et je reposerai la question.
10. **Point 12 :** les colonnes d'impression sont validées.
11. **Point 13 :** un **indicateur visuel de l'évolution de l'envoi** est demandé (préparé, envoyé, distribué, lu, échec), y compris pour les liens wa.me (au moins « lien ouvert »).
12. **Point 14 bis :** maquette du fond violet validée.
13. **Point 15 :** nom raccourci par « … » validé.
14. **Point 20 :** on garde « Ajouter des clients » au-dessus.
15. **Pointage :**
    - le montant du relevé Copharmed est en TTC ;
    - références saisies, lues en base (laborex_v1_db, juillet à novembre) :

    | Grossiste | Saisie | Exemple |
    |---|---|---|
    | TEDIS | n° de BL avec agence | `2630249626-BKE` |
    | DPCI | n° de facture | `R50164549` (relevé : `FAC R40235168`) |
    | Copharmed | n° de facture | `30-217202-00` |

    - Quelques BL TEDIS sont saisis avec une faute de frappe : `26255910091-VRI` pour `2625910091`, `2926011868-VRI` pour `2626011868`.

## Pointage BL : fait le 10/11 (worktree `prestige-plan-09112026`, branche `plan/09112026`)

**Défaut confirmé sur le vrai relevé TEDIS :** le lecteur PDF perdait un chiffre doublé. Par exemple, `2626011868` était lu `262601868` ; 2 BL sur 54 étaient faux sur le relevé du 16 au 30/09.

**Cause :** les chiffres de TEDIS sont serrés. Le second « 1 » chevauchait le premier de 0,53 pt et était pris pour un caractère repeint (faux gras).

**Corrections :**
- **Lecteur :** un caractère n'est écarté que s'il est identique et posé presque au même endroit.
- **Avoirs :** rapprochés aussi par leur propre numéro (`AV-2627127450-BKE` saisi en référence d'avoir).
- **Nouveau statut « À confirmer » :** quand aucun numéro ne correspond, une seule pièce de même nature, de même montant et datée à 3 jours près est proposée. C'est le cas d'un avoir sans référence ou d'un n° mal saisi. Elle n'est jamais pointée automatiquement.
- **Lignes ignorées :** abonnement `PR-ABO` (réglable par grossiste, « ABO » par défaut). Elles sont conservées et montrées « Ignorées », hors totaux.
- **Montant comparé en TTC :** une case dans le réglage du grossiste (Copharmed), comparée au TTC des BL.
- **« Pointer les pièces rapprochées » et « Revenir au format standard » :** confirmation dans le bouton, résultat en avis non bloquant. Il n'y a plus de fenêtre surgissante.

**Tests :**

| Test | Type | Résultat |
|---|---|---|
| `ReleveTedisTest` | lecture, faux gras, relevé TEDIS | 3 / 3 |
| `RapprochementAvoirsRepliTest` | cohérence sur 3 000 relevés au hasard (graine fixe) | 7 / 7 |
| `ReleveModeleOptionsTest` | lignes ignorées, TTC, ancien réglage relu | 4 / 4 |
| `test-releve-tedis-0911.js` | rapprochement et bilan (domain3) | 36 / 36 |

Le test d'écran couvre :
- les 8 lignes comparées écran = PDF = base, en HT puis en TTC ;
- seuls les rapprochés sont pointés ;
- le bilan : 2 relevés, 3 pièces pointées, stock inchangé.

**Non-régression :**
- `test-pointage-bl.js` (format standard Ubipharm) : 18 / 18 ;
- `test-releve-modele.js` (DPCI par colonnes) : 23 / 23.

**À fournir :** les relevés **DPCI** et **Copharmed** en PDF. Je n'ai reçu que des captures d'écran. Le relevé TEDIS a été vérifié sur le vrai fichier.

## Points 9, 11 et 19 : faits le 10/11

Branche `plan/09112026`, commit `6b930cd3f`, essayé sur domain3.

| Point | Correction | Test (rouge sur l'ancien code, puis vert) |
|---|---|---|
| 9 | Détail d'une vente terminée : sections empilées sans chevauchement, chaque libellé et chaque valeur sur une ligne, valeur trop longue raccourcie par « … » avec le texte complet en info-bulle, défilement vertical seulement ; « Prénom du client » et « Montant » | `test-detail-vente-0911.js`, en 1366 × 768 et 1280 × 720 : 18 / 18 |
| 11 | Scan du QR ou saisie du n° d'une prévente sur l'écran de prévente : la vue de prévente reste, pas de prise en caisse | `test-prevente-scan-vue-0911.js` : 10 / 10 |
| 19 | Porte-voix violet pour « CAMPAGNES SMS / WHATSAPP » ; la cloche reste aux notifications | `test-icone-campagnes-0911.js` : 5 / 5 |

**Rapprochement (point 9) :** fenêtre = base pour la référence, le montant total, le net, la part client, le montant et le taux du tiers payant.

**Bilan (point 11) :** ventes (statut, montant, annulation, lignes) et stock inchangés ; aucune ligne dans `vente_prise_caisse`.

**Non-régression :**
- même scan à l'écran de vente : encaissement et prise en caisse comme avant ;
- `test-prise-en-caisse-0811.js` : 14 / 14 ;
- les 21 menus de la base gardent leur icône, sauf les campagnes.

**À signaler :** la copie d'essai `laborex_audit` avait reçu, d'une autre branche (« sécurité »), des migrations 7.2.38 et 7.2.39 d'un autre contenu. Les scripts de même numéro de cette branche (`prix_reference_saisie`, `str_PSCODE`) n'y avaient donc jamais été joués, et toute vente assurance échouait. Je les ai joués à la main sur cette copie. Avant de fusionner la branche « sécurité », il faudra renuméroter ses deux migrations, sinon une base qui les reçoit en premier sautera les nôtres.
