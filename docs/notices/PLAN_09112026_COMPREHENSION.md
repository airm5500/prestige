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

**À signaler :** la copie d'essai `laborex_audit` avait reçu, du cas 4 (sécurité, branche `essai/cas4-9080`, en attente), des migrations 7.2.38 et 7.2.39 d'un autre contenu. Les scripts de même numéro de cette branche (`prix_reference_saisie`, `str_PSCODE`) n'y avaient donc jamais été joués, et toute vente assurance échouait. Je les ai joués à la main sur cette copie. Avant de fusionner le cas 4, il faudra renuméroter ses deux migrations (`V7.2.38__securite_base`, `V7.2.39__securite_journal`), sinon une base qui les reçoit en premier sautera les nôtres.

## Point 1 : fait le 10/11

Branche `plan/09112026`, commit `f62f1d788`, essayé sur domain3 en 1366 × 768 et 1280 × 720.

**Mise en page de la fiche en modification :**
- une seule largeur de libellé (130 px) dans IDENTITÉ, PRIX & STOCK et GESTION ;
- les champs restent dans leur bloc : ils dépassaient d'environ 10 px à droite, ce qui coupait le bord des listes ;
- aucun champ étiré au-delà de 380 px ;
- 8 px sous chaque liste déroulante ;
- Semois Q1 et Q2 sortis de la ligne des cases, qui débordait de près de 100 px, et placés chacun sur sa ligne ;
- la zone réserve passe dans PRIX & STOCK, juste sous « Code tableau » ;
- les libellés deviennent « Quantité en réserve », « Contenance CH » et « PSCODE ».

**Erreur « componentLayoutCounter » du journal :**
- **Cause :** un masque de chargement dont le composant n'existe plus restait abonné à la liste des articles. Chaque chargement échouait, et la liste ne se rechargeait plus.
- **Correction :** la recherche pendant la frappe vise la grille du champ tapé (rien si l'écran est fermé), et un masque orphelin est détaché avant le chargement.
- **Réserve :** je n'ai pas trouvé le geste exact qui crée ce masque orphelin. Le test remet donc ce défaut à l'essai : il retrouve le message du journal sur l'ancien code et ne lève plus d'erreur sur le nouveau.

**Tests :**
- `test-fiche-article-0911.js` : 21 / 21 (rouge sur l'ancien code). Il vérifie le rapprochement fiche = base (CIP, désignation, prix d'achat et de vente, code tableau, PSCODE) et fait le bilan : « Enregistrer » sans changement laisse la fiche identique en base.
- Non-régression :
  - réserve et étiquette : 14 / 14 ;
  - code géo : 14 / 14 ;
  - PSCODE : 15 / 15.

## Réponses du 10/11 (suite)

- **Relevés DPCI et Copharmed :** les PDF sont reçus (`dpci1.pdf`, `copharemd0023642.pdf`). Je les ai transmis à la session du pointage BL.
- **Doublon à trancher :** deux branches corrigent le même pointage, chacune à sa façon, dans les mêmes cinq fichiers :
  - `plan/09112026` (`7d05972ea`) : lecteur PDF, avoirs, « À confirmer », lignes ABO, TTC ;
  - `claude/pointage-releves` (`0a1e23f66`) : avoirs DPCI et TEDIS, PR-ABO, Copharmed avec agence et en TTC.

  Il faut choisir la branche de référence avant toute fusion.
- **Q9, les 7 indicateurs d'« Activité des équipes » :** oui, on les ajoute, avec trois exigences :
  - l'aide du menu dit pour chacun sa pertinence et le gain attendu ;
  - chaque indicateur peut être caché ;
  - chaque indicateur caché peut être ramené un par un.

  Ce travail se fait avec le point 10.

**Décision du 10/11 sur le doublon :** la branche `claude/pointage-releves` sert de référence pour le pointage BL. Mon correctif a été annulé sur `plan/09112026` (`364488ce0`). Cette branche ne touche donc plus aucun fichier du pointage. Le correctif du faux gras du lecteur PDF et les tests TEDIS restent consultables dans `7d05972ea`. Je les ai signalés à la session du pointage, pour qu'elle reprenne ce qui lui manque.

## Points 18 et 14 : faits le 10/11

Branche `plan/09112026`, commit `b66c1172f`, essayé sur domain3.

**Point 18, une seule couleur pour les confirmations :**
- Extranets grossistes, Litiges, Mon compte (PIN), RH (nouveau QR, désactivation d'un badge, retrait d'une borne) et Retour fournisseur passent par le même rendu : rouge, texte blanc.
- Le retour fournisseur prenait le style « échec » (texte rouge seulement).
- **Cause cachée :** sur les écrans habillés, une règle du thème recouvrait le rouge, y compris celui du mécanisme commun. Un bouton armé en est désormais exclu.
- **Test :** `test-confirmation-couleur-0911.js`, 13 / 13 (rouge sur l'ancien code). Il arme chaque bouton par un vrai clic, sans jamais confirmer, vérifie le rouge, puis le retour à l'état normal. Bilan : rien n'est écrit.
- **Non couvert à l'écran :** le litige, car la copie d'essai n'en contient aucun. Le correctif est le même, et le test existant des litiges passe (19 / 19).

**Point 14, journal des campagnes :**
- **Statuts :** un statut ne recule plus (envoyé < échec < distribué < lu), pour les messages comme pour les fils de discussion.
- **Rafraîchissement :** le journal se recharge toutes les 20 s tant que son onglet est affiché. La campagne choisie reste choisie, et son suivi continue.
- **Couleurs :** la ligne choisie a un fond clair, et les couleurs de l'indicateur d'envoi restent visibles.
- **Tests :**
  - `StatutWhatsAppOrdreTest` (cohérence : 5 000 suites d'accusés au hasard, graine 20261110) : 3 / 3 ;
  - `test-campagnes-journal-0911.js` : 13 / 13, rouge sur l'ancien code. Il passe par le vrai webhook signé, puis rapproche journal = suivi = base.

**Non-régression :**

| Test | Résultat |
|---|---|
| Indicateur d'envoi | 12 / 12 |
| Suivi | 8 / 8 |
| Suppression en masse | 18 / 18 |
| Badges RH | 14 / 14 |
| PIN | 28 / 28 |
| Litiges | 19 / 19 |
| Refus et abandon d'un retour | 32 / 32 |
| Suite unitaire | 2 235 tests verts |

**À signaler :**
- `test-retours-refus-abandon.js` a échoué une fois sur un contrôle de droits côté serveur, puis il est passé à la relance. C'est un test instable, sans lien avec ce changement.
- Le test des identifiants d'extranet n'a pas été lancé : la règle exige un domaine dont toutes les sources visent 127.0.0.1.

---

## Avancement du 10/11 : point 2 fait (commit `73c547170`, branche `plan/09112026`)

**Point 2, réconciliation de BL, fenêtre « Associer » :**
- **En-tête :** après le nom du produit, le prix d'achat et le prix de vente de la ligne du BL (ex. « … | E2E RECONC DEUX | Prix d'achat : 12 990 | Prix de vente : 17 800 »).
- **Recherche « contient » :** un morceau pris au milieu du nom (ou d'un code CIP, EAN, grossiste) trouve le produit. Les noms qui commencent par le texte restent en tête de liste.
- **Désactivés :** la case reste décochée par défaut. Associer un produit désactivé n'ouvre plus de fenêtre : le bouton « Associer » s'arme en rouge (« Confirmer : activer et associer ? ») ; le second clic active le produit (fiche, stock, grossiste) puis poursuit l'association.
- **Cause cachée :** dans les fenêtres habillées, le thème recouvrait le rouge d'un bouton armé. Il en est exclu.

**Où la donnée apparaît et test de rapprochement :** prix du fichier importé = grille de réconciliation = en-tête de « Associer », ligne par ligne, sur 3 lignes aux prix différents (`test-reconciliation-0911.js`, 21 / 21, passe par un vrai import Copharmed ; 6 échecs sur l'ancien code).

**Règle de calcul et test de cohérence :** `RechercheContientTest`, 5 000 couples (nom, texte) tirés au hasard, graine 20261110, avec des jokers SQL (`%`, `_`, `\`) : « trouvé » si et seulement si le nom contient le texte ; le tri « commence par » est exact. Échoue sur l'ancien « commence par ».

**Traces (bilan) :** bouton armé, rien n'est écrit ; après le second clic, seule la réactivation du produit est écrite ; association non confirmée, code du produit inchangé ; commande, traces d'import, fichier de vérification, numéro de commande et état du produit remis à la fin.

**Cas couverts :** 3 lignes aux prix différents, quantité 1, 2 et 5, avec et sans UG ; texte au milieu du nom ; produit actif et désactivé ; case cochée et décochée ; bouton armé sans second clic (retour à l'état normal) ; double-clic.

**Non-régression :** `test-reconciliation-desactives.js` adapté au bouton, 12 / 12 ; `test-confirmation-couleur-0911.js` 13 / 13 ; suite unitaire 2 237 tests verts.

**À signaler :** après l'activation, la confirmation de la mise à jour du code CIP passe encore par une fenêtre quand le serveur répond en plus d'une seconde (mécanisme commun `PrestigeConfirmation.ligne`, antérieur à ce point). À reprendre avec le mécanisme commun si vous le souhaitez.

**Déployé :** domain3 (tests) et 8080.

---

## Retour du 10/11 : Entrée sans effet dans la fiche article (« componentLayoutCounter »)

**Constat (journal de 14:52, fil d'Ariane) :** recherches dans la fiche article, puis « Détail sur l'article » (14:48:09), puis 6 chiffres + Entrée (affiché « SCAN ») : aucune requête ne part, erreur « Cannot read properties of undefined (reading 'componentLayoutCounter') ». Même erreur au journal le 31/10 et le 09/11, toujours après un détail d'article.

**Cause :** l'icône « Détail sur l'article » pose le verrou d'ouverture (`PrestigeChargement.verrou`) sur la *vue* de la grille, qui appelle `vue.setLoading()`. Dans Ext 4.2.1, `setLoading` détruit le masque de la vue — celui qui suit les chargements de la liste — sans le désabonner de la liste. Au chargement suivant (Entrée, page suivante…), ce masque détruit répond sans composant et le chargement s'arrête avant la requête. Le correctif du point 1 ne retirait ce masque qu'avant une recherche : la page suivante plantait encore, et la grille perdait son masque de chargement. Même verrou sur une vue : ventes terminées, préventes, commandes (réconciliation), suggestions.

**Correctif (commit `66cadaf0d`, branche `plan/09112026` ; `app.js`, pour toute l'application) :**
- sur une vue dont le masque suit la liste, `setLoading` pose un masque ponctuel à part et laisse celui de la liste en place ;
- un masque détruit ou sans composant se désabonne de sa liste au lieu de planter (filet pour tout autre chemin), et se désabonne aussi à sa destruction.

**Second défaut trouvé au passage (`detailArticle.js`) :** à l'ouverture, le détail détruisait le filtre rayon de la fiche article (même identifiant global `lg_ZONE_GEO_ID`). Le champ du détail s'appelle maintenant `detail_lg_ZONE_GEO_ID`.

**Test (`test-masque-chargement-1011.js`, 17 / 17 ; 13 échecs sur l'ancien code, dont l'erreur exacte du journal) :** vrai clic sur l'icône du détail, fermeture par « Fermer », puis page suivante, recherche de 6 chiffres + Entrée, quatre Entrée de suite. Rapprochement : CIP de la grille = CIP renvoyés par le serveur (page 2 et recherche). Cas général hors fiche article : grille dans une fenêtre, `setLoading` posé puis retiré sur sa vue, liste rechargée, grille fermée (plus aucun masque abonné). Aucun calcul ni aucune écriture en base : pas de test de cohérence ni de bilan.

**Non-régression :** verrou du double clic 15 / 15 ; fiche article (point 1) 21 / 21 ; détail de vente 18 / 18 ; dernière vente de la fiche 5 / 5 ; ergonomie du détail article 9 / 9 et monographie à la demande 6 / 6 sur 8080 (sur domain3, le service des monographies est inactif : précondition non remplie, sans lien avec ce changement).

**Déployé :** domain3 (tests) et 8080. Si l'erreur revenait, recharger la page (F5) : un onglet ouvert avant le déploiement garde l'ancien code.

---

## Point 3 : fait le 10/11 (commit `ad1278f0f`, branche `claude/pointage-releves`, non fusionné)

**Pointer les BL / Avoirs :** une liste « Période selon » propose « Date du BL » (par défaut, comme avant) ou « Date d'entrée » (jour où le BL ou le retour a été saisi dans Prestige). La grille montre les deux dates (« Date BL » et « Saisi le »). L'édition PDF reprend le choix (sous-titre « (date du BL) » ou « (date d'entrée) », colonne « Saisi le »).

**Où la donnée apparaît et test de rapprochement :** grille, réponse du serveur, base et PDF. `test-pointage-selon-date-0911.js` (14 / 14, rouge sur l'ancien code) : grossiste DPCI, un jour J choisi pour que les deux modes diffèrent ; dans chaque mode, grille = base ligne par ligne (type, n° BL, date du BL, date d'entrée, montant) ; le PDF part avec le même choix.

**Règles de calcul et cohérence :** dans les deux modes, total BL = somme des BL de la grille, net = BL + avoirs ; en « Date d'entrée », des BL datés d'avant J apparaissent bien.

**Traces :** lecture seule, rien n'est écrit.

**Cas couverts :** BL, retours (date de l'avoir ou d'entrée), manquants à la réception ; plusieurs montants ; les deux modes sur le même jour.

**Non-régression :** pointage BL 18 / 18, par grossiste 7 / 7, groupe de contrôle 12 / 12, formats des grossistes 18 / 18, relevé modèle 23 / 23, routes « nombre » 12 / 12 ; tests unitaires du pointage et des relevés verts.

**À décider :** ce point est sur la branche du pointage, pas encore sur `plan/09112026` ni sur l'intégration 29/10.

---

## Point 4 : fait le 10/11 (commit `beded02d3`, branche `plan/09112026`)

**Retour fournisseur, recherche « contient » :**
- **Liste des retours :** un morceau pris au milieu du nom du produit, du CIP, de l'EAN, du n° de BL ou de la référence du retour trouve le retour. Avant, seul le début était cherché.
- **Nouveau retour :** les listes « Bon de livraison » et « Article » cherchent aussi en « contient » (textes d'aide : « une partie suffit »).
- **Au passage :** Entrée relance bien la recherche, et la recherche ne retarde plus d'une frappe (elle partait avec la valeur précédente du champ).

**Où la donnée apparaît et test de rapprochement :** liste des retours, listes du nouveau retour et base. `test-retour-recherche-0911.js` (13 / 13 ; 5 échecs et un plantage sur l'ancien code) : sur un retour réel, un morceau du milieu du nom et un morceau du milieu du n° de BL trouvent le retour ; chaque retour affiché vérifie la règle en base ; un texte absent ne ramène rien ; les listes du nouveau retour proposent le BL et le produit, et chaque proposition contient le texte tapé.

**Règle et test de cohérence :** même règle que le point 2 (`CommandeServiceImpl.motifContient`, jokers SQL neutralisés), vérifiée par `RechercheContientTest` (5 000 cas, graine fixe).

**Traces :** lecture seule ; bilan : aucun retour créé par le test.

**Non-régression :** retour en attente 17 / 17, écran retour fournisseur 9 / 9, retours par lots 7 / 7, pilotage des retours 48 / 48, tests unitaires des retours 43 / 43.

---

## Point 12 : fait le 10/11 (commit `00054b60a`, branche `plan/09112026`)

**Inventaire en cours, filtre « Vendus après la création de l'inventaire » :** les produits de l'inventaire vendus depuis sa création. Une vente compte si elle est encaissée, non annulée, de montant positif, faite sur l'emplacement de l'inventaire. La colonne « Vendus depuis » donne la quantité vendue ; elle n'apparaît qu'avec ce filtre.

**Impression (« Imprimer filtre courant ») :** les colonnes validées. CIP, désignation, emplacement, stock théorique, compté, écart, vendus depuis. Le stock théorique et l'écart ne s'impriment qu'avec le droit de voir le stock et « Afficher stock : OUI », comme les autres impressions de l'inventaire. Le titre donne l'inventaire, sa date de création et le nombre d'articles.

**Où la donnée apparaît et test de rapprochement :** écran, réponse du serveur, PDF et base. `test-filtre-vendus-apres-creation-1011.js` (19 / 19 ; rouge sur l'ancien code) :
- inventaire d'essai de 10 lignes créé à une date passée ;
- écran = base, CIP par CIP et quantité par quantité ;
- PDF = base, ligne par ligne, avec puis sans les colonnes de stock ;
- rapprochement à grande échelle : 4 inventaires réels, 11 464 lignes, dont 6 635 vendues. Pour chaque ligne, présente dans le filtre si et seulement si la quantité vendue calculée en SQL, indépendamment de l'application, est positive ; et quantité identique.

**Règles et cohérence :** filtre (5) + hors filtre (5) = « Tous » (10) ; chaque quantité vendue > 0 ; écart du PDF = compté − théorique.

**Traces (bilan) :** aucun stock ni aucune ligne d'inventaire modifiés par le filtre ni par l'impression ; inventaire d'essai retiré.

**Cas couverts :** 5 produits vendus après la création (quantités 1, 3 et 5), 3 vendus seulement avant, 2 dont les seules ventes après sont annulées ; lignes comptées et non comptées ; « Afficher stock » OUI et NON.

**Temps :** une page du filtre sur un inventaire de 11 000 lignes répond en 0,7 à 0,8 s.

**Non-régression :** filtre prix d'achat 12 / 12 (il compte maintenant 10 filtres), icônes de l'inventaire 11 / 11, colonnes 7 / 7, clôture 12 / 12, suite unitaire 2 224 tests verts.

---

## Point 10 : fait le 10/11 (commits `4762a07f3`, `63497694d`, `786872db4`, `83eebac1a`, branche `plan/09112026`)

**Ce qui change dans Activité des équipes :**
- **Période :** bouton « 1 mois » et sélecteur de garde (les analyses se limitent aux heures de la garde choisie).
- **Ventes longues :** le critère (« plus de », « au moins »… et le nombre de minutes) s'essaie sur l'écran, puis « Enregistrer pour tous » le rend commun. La confirmation se fait dans le bouton. Le critère vaut pour les Analyses, l'onglet Anomalies et la carte du tableau de bord ; il est gardé en paramètre (migration V7.6.6).
- **Mesures corrigées :**
  - vitesse par opérateur et par type : temps médian entre deux produits saisis, sur les ventes de 2 lignes ou plus que l'employé a saisies lui-même (préventes reprises en caisse écartées) ;
  - charge au clavier : 15 min au plus par vente ;
  - BL : temps compté depuis l'ouverture du BL (avant, depuis la commande : 509 s en moyenne au lieu de 38 s).
  Chaque carte explique la mesure, ce qu'elle apprend et le gain.
- **Annulations par auteur :** par caissière, ventes encaissées au comptant et à crédit, taux de chaque opération sur les ventes de son type, taux global à droite. Le détail d'une ligne a la colonne « Encaissé par ».
- **CA par employé :** attribution « Conseil » (celui qui a conseillé ; ligne « Sans conseil »), tri par un clic sur l'en-tête, nombre de ventes en violet.
- **Couleurs :**
  - une couleur par onglet ;
  - plus de filet de couleur à gauche des tuiles et constats ;
  - ligne « n alertes : … » retirée ;
  - légende « Ventes » de la couleur des barres.
- **Sept indicateurs :** chacun a sa carte, avec une aide « Mesure / Pertinence / Gain ».
  - remises ;
  - ventes modifiées et écarts de caisse ;
  - panier et produits par vente ;
  - taux de conseil (panier avec et sans conseil) ;
  - attente client en caisse ;
  - avoirs et retours ;
  - activité par heure de présence.
- **Masquer une carte :** toute carte des Analyses se masque par sa croix, sans fenêtre. « Indicateurs masqués (n) » la ramène, une par une ou toutes. Le choix est gardé pour chaque utilisateur.

**Où la donnée apparaît, et tests de rapprochement (écran = API = base, ligne par ligne) :**

| Test | Ce qui est rapproché | Résultat |
|---|---|---|
| `test-activite-mesures-1011` | vitesses, charge par jour, BL par grossiste, octobre 2026 | 9 / 9 |
| `test-activite-seuil-persistant-1011` | critère essayé puis enregistré : Analyses, Anomalies, tableau de bord, paramètre en base | 15 / 15 |
| `test-activite-annulations-auteurs-0811` | taux par caissière, « Encaissé par » | 15 / 15 |
| `test-activite-ca-conseil-1011` | CA par conseiller, tri, violet | 10 / 10 |
| `test-activite-couleurs-1011` | couleurs calculées des onglets, aucun filet gauche, légende | 9 / 9 |
| `test-activite-indicateurs-1011` | les 7 indicateurs, employé par employé et total ; masquage, reconnexion | 29 / 29 |

Tous ces tests étaient rouges sur l'ancien code.

**Règles de calcul et tests de cohérence (milliers de cas, graine fixe) :**
- `SeuilDureeCoherenceTest` : le critère enregistré, essayé ou partiel ;
- `MesuresActiviteCoherenceTest` : la médiane est comprise entre la vente la plus rapide et la plus lente ; la charge ne dépasse jamais 15 min par vente ;
- `AnnulationsTauxCaissiereCoherenceTest` : taux = opérations ÷ ventes du type ; pas de taux sans vente ;
- `CaTranchesConseilCoherenceTest` : somme des lignes = total = CA, quelle que soit l'attribution ;
- `IndicateursEquipeCoherenceTest` (2 000 périodes) :
  - taux de remise = remises ÷ CA, panier = CA ÷ ventes ;
  - chaque vente conseillée compte une fois ;
  - manquant + surplus = somme des écarts de caisse ;
  - présence : sessions qui se chevauchent comptées une fois, bornées à la période ;
  - jamais négatif, sauf le manquant ;
  - le filtre sur un employé donne la même ligne que pour l'équipe.

**Traces (bilan) :**
- Le seul enregistrement est le critère des ventes longues (2 lignes de `t_parameters`), relu par le service et par le test. Il est remis à son état d'origine en fin de test.
- Le choix des cartes masquées est une préférence de l'utilisateur (`activite-indicateurs`), relue en base puis remise à son état d'origine.
- Les ventes d'essai (`E2E-AECC`, `E2E-AEIN`) sont retirées en fin de test.

**Cas couverts :**
- deux caissières et deux conseillers, des ventes sans conseil ;
- remises à 0 et non nulles ;
- quantités supérieures à 1, plusieurs lignes ;
- préventes avec une attente de 1 min 30 et une de 7 min ;
- une ligne en avoir, une vente en avoir, une vente annulée (qui ne compte pas) ;
- octobre 2026 réel : 17 484 ventes, dont 7 837 préventes reprises, 445 ventes modifiées et 158 caisses fermées ;
- sessions ouvertes et sessions qui débordent de la période.

**Défaut trouvé par le test des indicateurs :** une session encore ouverte (sans fin) faisait échouer l'appel (erreur 500). C'est corrigé.

**Limites à connaître :**
- La présence ne compte que les connexions enregistrées depuis le 25/10/2026. Le planning (`t_planning`) est vide.
- Sur la copie d'essai, aucune remise ni aucun conseil n'est saisi en octobre : ces deux cartes ne s'alimenteront qu'avec l'usage.

**Non-régression :** les 18 tests d'écran de l'activité sont verts sur domain3 (anomalies, données, gardes, préventes, pastilles, tableau de bord…). Les tests unitaires de l'activité sont verts : 49.

---

## Points 5 et 6 : faits le 10/11 (commit `20c49b767`, branche `plan/09112026`)

**Taux de rupture, une seule règle pour la Prévision et le tableau de bord :**
- Un produit est « vendu fréquemment » s'il s'est vendu dans au moins N mois des M derniers mois complets, pour au moins Q unités en tout. Si N dépasse M, N est ramené à M.
- Taux = produits fréquents dont le stock actuel (rayon + réserve) est nul ou négatif, divisés par les produits fréquents, au dixième.
- Produits retenus : famille active, emplacement principal.
- Trois paramètres dans l'écran Prévision (migration V7.6.7) : M = 3, N = 2, Q = 3 par défaut. La tuile se met à jour dès l'enregistrement.
- Le tableau de bord affiche le même taux dans la tuile Ruptures ; un clic ouvre « Produits fréquents à stock nul (n) ». Il suit un nouveau réglage après « Actualiser » ou au bout d'une minute (cache de la tuile).

**Onglet Prévisions :**
- le filtre « En rupture (vendus fréquemment) » donne exactement les produits comptés dans le taux ;
- nouveau filtre « Fiabilité ≥ X % » (vide = pas de filtre), appliqué aussi aux exports Excel et PDF ;
- le texte « 6 derniers mois » suit le paramètre des mois d'essai.

**Carte Activité du tableau de bord :** quatre tuiles en plus, à bordure fine grise (sans cadre coloré) ; un clic ouvre le détail.
- Préventes perdues : annulées et abandonnées, sur le total des préventes, avec le pourcentage.
- Ventes annulées.
- BL entrés, avec la part saisie à J+2 ou plus.
- CA conseillé, avec le nombre de conseils et de ventes conseillées.
- « BL en attente » est remplacé par « BL entrés » : ce chiffre n'existe pas encore dans les données de l'activité. Les « ventes longues » restaient déjà dans les repères d'origine.

**Où la donnée apparaît, et tests de rapprochement :**

| Test | Ce qui est rapproché | Résultat |
|---|---|---|
| `test-taux-rupture-1011` | calcul indépendant sur la base = API du tableau = API rupture = tuile de la Prévision = tuile du tableau de bord, sur 4 réglages : (3,2,3), (6,1,1), (2,2,10), (1,4,1) ; filtre « En rupture » ; liste du tableau de bord ligne par ligne (nom, CIP, vendus, mois vendus, stock) ; fiabilité à 0, 60 et 100, et même total par la route des exports (le contenu des fichiers Excel et PDF n'est pas relu) ; refus de M = 0 | 35 / 35 |
| `test-activite-tuiles-plus-1011` | tuile = API = base pour les 4 tuiles, sur le 17/10, le 05/10 et aujourd'hui ; bordure grise ; 4 repères d'origine intacts ; clic vers le détail | 23 / 23 |

Les deux tests étaient rouges sur l'ancien code.

**Règles de calcul et test de cohérence :** `TauxRuptureCoherenceTest`, 3 000 catalogues tirés au hasard (graine 20261110) :
- fréquents et ruptures égaux à un calcul de référence indépendant ;
- taux = ruptures ÷ fréquents au dixième, entre 0 et 100, 0 sans produit fréquent ;
- chaque produit de la liste : stock nul ou négatif sans réserve, au moins Q unités et au moins N mois vendus, du plus vendu au moins vendu ; tous les produits comptés sont identifiés ;
- un réglage plus exigeant ne donne jamais plus de produits fréquents ;
- bornes : historiques de 0 à 36 mois, M = 1, N = 1, Q = 1, N > M ; mois hors période ignorés ; la réserve évite la rupture.

**Traces (bilan) :**
- Les seuls enregistrements sont les 3 paramètres (`t_parameters`), relus par le service, par l'écran et par le test, puis remis à leur valeur d'origine.
- Le test des tuiles donne un conseil à 3 ventes du 17/10 le temps du test, puis les remet à l'identique (vérifié en base).

**Cas couverts :** N = 1 et Q = 1, N > M, Q = 10, M = 6 ; stocks nuls, négatifs et positifs ; un jour avec des BL et un jour sans ; ventes avec et sans conseil ; fiabilité vide, 0, 60 et 100.

**Tests adaptés :** `test-parametres-prevision` et `ParametresPrevisionTest` (13 paramètres au lieu de 10), `test-analyse-commande` (nouvelle règle du taux), `test-activite-tableau-bord-avoir-0811` (les nouvelles tuiles sont vérifiées à part).

**Non-régression (domain3) :** verts : analyse-commande, parametres-prevision, previsions-onglet, previsions-analyse, en-cours-relecture, demande-saisonniere, lot1-defauts, tableau-bord (61), pilotage-besoins-1110, pilotage-disposition, retours-0710b, activite-tableau-bord-avoir (27), activite-indicateurs (29), couleurs (9), equipes-analyses (11), tableau-bord-affluence (8) ; tests unitaires de la prévision sans échec.
- `test-risque-rupture` : un échec au premier passage, 17 / 17 à la relance (lié aux données).
- `test-pilotage-besoins-1110-b` : 29 / 30. Le contrôle « fonds doux des tuiles » attend des tuiles sur fond coloré, alors que le style C du 04/11 leur a donné un cadre gris. Ma branche ne touche ni au pilotage ni à la CSS : défaut antérieur, non corrigé ici.

---

## Point 7 : fait le 10/11 (commit `5573869c0`, branche `plan/09112026`)

**Ce qui change :**
- **Déconnexion :** elle vide les données de la session, mais garde le nom du poste (et le choix déjà fait sur le bandeau « Nommez cet appareil »). Avant, `Header.js` vidait tout le stockage du navigateur.
- **Connexion :** la page de connexion envoie le nom du poste. La ligne « Authentification … nom poste » du fichier journal et le journal RH des connexions portent ce nom, et non plus le nom réseau.
- **Paramétrages › rubrique « Poste (ce poste et postes connus) » :**
  - le nom de ce poste, avec « Enregistrer » et « Effacer », confirmés dans le bouton ; c'est le même réglage que « Fichier journal › Ce poste » ;
  - la liste des postes connus : poste, dernière connexion, utilisateur et adresse de cette connexion, nombre de connexions, sur 365 jours, la plus récente en tête ; « (ce poste) » marque le poste en cours.
- La liste est lue dans le journal des connexions (`t_session_utilisateur`), qui gardait déjà le poste : pas de nouvelle table. Route `GET v1/postes/connus`, réservée au droit du Paramétrage général ou au profil administrateur ; 401 sans session.
- La rubrique est ajoutée par l'écran : elle ne regroupe aucun paramètre de la base, et `RubriqueParametre` n'est pas modifié.

**Défauts d'ergonomie trouvés par les captures, et corrigés :**
- le panneau masquait la liste des rubriques : on ne pouvait plus revenir aux autres paramètres ;
- un bouton armé le restait si l'on quittait la rubrique, et le clic suivant aurait effacé le nom.

**Où la donnée apparaît, et test de rapprochement :** `test-poste-garde-1011` (23 / 23 sur domain3 et sur 8080 ; rouge sur l'ancien code), par de vrais clics :
- nom saisi dans la rubrique = stockage du poste = réglage du fichier journal ;
- après déconnexion et reconnexion : nom dans le journal et dans le journal RH des connexions ;
- liste de l'écran = API = calcul indépendant sur la base, ligne par ligne ;
- « Effacer » : la connexion suivante reprend le nom réseau ;
- bouton armé puis rubrique quittée : rien n'est effacé (contrôle rouge sans son correctif) ;
- API refusée sans session.

**Règles et test de cohérence :** `PostesConnusCoherenceTest`, 4 000 journaux tirés au hasard (graine 20261111) :
- une ligne par poste ; les noms qui ne diffèrent que par la casse sont un seul poste ; poste vide ignoré ;
- dernière connexion = la plus récente ; utilisateur et adresse = ceux de cette connexion ;
- somme des connexions = connexions avec un poste ; ordre du plus récent au plus ancien ; limite de 200 lignes.

**Traces (bilan) :** aucune donnée nouvelle en base. Les sessions et lignes de journal portant le nom d'essai sont retirées ; aucun paramètre touché.

**Cas couverts :** nom accentué (« E2E Poste é 1011 »), nom absent puis effacé, plusieurs postes connus, connexions à la même seconde, casse différente, limite atteinte.

**À savoir :** un poste sans connexion depuis un an n'apparaît plus dans la liste.

**Tests adaptés :** `test-parametres-rubriques` (la rubrique « Poste » s'ajoute à celles du serveur).

**Non-régression (domain3) :** verts : nom d'appareil 53-54 (6), 56 (10), poste mobile (9), rubriques (8), journal complet (18), connexion (18), sessions (12), badge (16), badge et code (28), droits serveur (26), colonnes de « Ventes terminées » (14), allers-retours de connexion (9).

## Point 15 : fait le 10/11 (commit `ee1925cea`, branche `plan/09112026`)

**Ce qui change :** le nom long du tiers payant se présente au choix du modèle de ticket (« Paramétrages › Modèles de ticket », choix « Nom long du tiers payant ») :
- **Une ligne** (par défaut, rien ne change sans le vouloir) : le nom est raccourci par « … » ; le taux et le montant restent entiers, sur la même ligne ;
- **Deux lignes** : le nom tient sur deux lignes au plus (la seconde raccourcie par « … » s'il le faut) ; le taux et le montant sont à droite, centrés sur les deux lignes.
- Un nom qui tient, ou un libellé sans taux, ne change pas.
- Le choix est proposé pour les tickets de vente (comptant, assurance, carnet, dépôt, mixte), pas pour le ticket Z. Il suit le droit de modifier les modèles et ne vaut que pour le nouveau modèle.
- L'exemple de la vente carnet porte désormais un nom long, pour juger le rendu dans l'aperçu.

**Où la donnée apparaît, et test de rapprochement :** `test-ticket-tiers-payant-long-1011` (13 / 13, deux passages de suite ; rouge sur l'ancien code), par de vrais clics :
- aperçu des modèles (zone Client et hauteur du ticket) ;
- base : `ticket_modele.reglages.tiersPayant`, pour ce ticket et cette largeur ;
- relu à la réouverture de l'écran (même choix, même aperçu) ;
- l'impression passe par le même dessin (`GenerateTicketServiceImpl` lit les réglages du modèle, puis `RenduTicket.dessiner`), vérifié par `TicketTiersPayantNomLongTest`.

**Règles et test de cohérence :** `TicketTiersPayantNomLongTest`, 5 000 libellés tirés au hasard (graine 20261115), sur des largeurs de 50 à 250 points :
- une ligne : le libellé tient dans la largeur, le taux est gardé entier, le nom raccourci est le début du vrai nom ;
- deux lignes : chaque ligne tient dans sa colonne, le taux est entier, les deux lignes sont le nom dans l'ordre, et le nom entier quand il tient ;
- dessin réel sur 58 et 80 mm : en une ligne, même hauteur qu'un nom court ; en deux lignes, exactement une ligne de plus ; un nom court reste sur une ligne ; rien ne déborde ;
- le réglage est relu ; une valeur inconnue ou un modèle enregistré avant ce point reviennent à « Une ligne ».

**Traces (bilan) :** une seule donnée nouvelle, le réglage dans `ticket_modele.reglages`, lue par l'aperçu et par l'impression. Le test remet la table comme avant, même s'il est interrompu.

**Incident pendant les essais, corrigé :** un premier passage coupé par le délai avait laissé le réglage « Deux lignes » dans la copie d'essai. Ligne retirée ; le test remet désormais la table à l'arrêt forcé et sur une erreur non traitée.

**Cas couverts :** formes « NOM [80%] », « NOM [80%] : » et « NOM 80 % », taux décimaux, nom court, nom sans taux, nom accentué, largeurs 58 et 80 mm, plusieurs tiers payants sur un ticket, valeur inconnue.

**Non-régression :** 92 tests du ticket verts ; modèles de ticket 15, 19 (05/11), 10 (date), 11 (cadre net), 13 (promotion), 14 (police).

## Vérifications du 10/11 au soir : `plan/09112026` redéployé sur 8080

- Point 15 : 13 / 13 ; point 7 : 23 / 23.
- **Défaut signalé par une autre session (`test-une-ligne-cochee`, 21 / 22) : pas un défaut du code.** Le test attendait encore la fenêtre « Annuler ». Depuis le point 18 du plan du 08/11, l'annulation passe par le menu des motifs. Six tests étaient dans ce cas ; ils passent par deux aides communes (`confirmerAnnulation`, `choisirMotif`) :
  - une ligne cochée 24 / 24 ;
  - ventes UG 16 / 16 ;
  - suivi des promotions 35 / 35 ;
  - palier 33 / 33 ;
  - rapprochement promotion 39 / 39 ;
  - recette et date de vente 17 / 17.
- **Défaut des tests des modèles de ticket, corrigé :** la remise en état perdait l'utilisateur des lignes. Sous Windows, chaque ligne lue se termine par `\r`, sauf la dernière. `test-ticket-police` était à 13 / 14 ; il passe à 14 / 14, et les modèles à 15 / 15.

## Point 16 : fait le 10/11 (commit `269a26ef7`, branche `plan/09112026`)

**Ce qui change :** votre `prestige3.ico` remplace l'ancienne icône partout :
- onglet du navigateur : `favicon.ico`, avec les sept tailles du fichier ;
- PNG de 16 à 256 px, tirés du même fichier ;
- logo de la page de connexion ;
- bandeau de l'application : l'icône remplace la croix, et un clic ramène toujours au menu principal ;
- « À propos » : l'icône et « PRESTIGE 3 » ; « PRESTIGE II » est corrigé.

Les liens passent en version 3, pour que les navigateurs ne gardent pas l'ancienne icône. Les anciens SVG (mortier) ne servaient plus nulle part : ils sont retirés.

**Où l'icône apparaît, et test de rapprochement :** `test-icone-prestige3-1011` (16 / 16 sur 8080 ; rouge sur l'ancien code, 6 / 16). Il couvre la connexion, l'application, l'espace produit, le bandeau et « À propos ». Pour chaque endroit, il vérifie :
- l'image chargée et visible ;
- le repère violet de la nouvelle icône ;
- la version 3 des liens ;
- les sept tailles du `.ico` ;
- `favicon.png` = `icone-prestige-256.png`, pixel pour pixel ;
- « À propos » sans débordement ;
- aucune erreur JavaScript.

**Traces :** aucune donnée en base.

## Point 20 : clos sans changement

Votre réponse : on garde « Ajouter des clients » au-dessus de « Clients de la liste ». L'écran reste comme il est.

## Point 13 : fait le 10/11 (commit `31188c7e0`, branche `plan/09112026`)

**Ce qui change :**
- **Chaque envoi WhatsApp porte son origine et son utilisateur.** Origines : ticket Z, campagne, rappel, discussion, avis client, essai, lien wa.me.
  - Deux colonnes sont ajoutées au journal (migration V7.6.40).
  - Envois antérieurs : l'origine est reprise quand elle est sûre (une notification de campagne est une campagne, une autre notification est un rappel). Sinon, « Non précisée ».
- **Comptes WhatsApp › « Derniers envois » :** colonnes Origine, Utilisateur et Suivi.
  - Le suivi est un indicateur de quatre pastilles (préparé, envoyé, distribué, lu), mis à jour par les statuts que WhatsApp renvoie.
  - Un échec est en rouge.
  - Un envoi simulé (mode test) reste à « préparé ».
- **Ticket Z au pharmacien, par WhatsApp et par SMS :** une ligne au journal des événements, par exemple « Ticket Z envoyé au pharmacien (WhatsApp) : Envoyé ». Elle porte la date et l'utilisateur, type « Envoi de message ».
  - Jamais le texte du ticket.
  - Le cas « aucun numéro réglé » est tracé aussi.
- **Liens wa.me de Campagne client :** le clic est gardé (origine « Lien wa.me », état « Lien ouvert »). Prestige ne voit pas l'envoi réel, qui part du WhatsApp du téléphone.

**Où la donnée apparaît, et test de rapprochement :** `test-traces-whatsapp-1011` (16 / 16 sur 8080 ; rouge sur l'ancien code), par de vrais clics :
- Ticket Z › « Envoyer WhatsApp » : ligne au journal des événements, avec l'utilisateur et le type « Envoi de message » ;
- Comptes WhatsApp › « Envoyer un essai » : ligne d'origine Essai, avec l'utilisateur ;
- Clients › Suivi de consommation › SMS / WhatsApp › Préparer les liens › clic sur le lien : ligne d'origine Lien wa.me, avec le client et l'utilisateur ;
- grille « Derniers envois » = API = base, ligne par ligne ;
- l'indicateur avance (distribué : 3 pastilles, lu : 4, échec : rouge) après actualisation.

**Règles et test de cohérence :**
- `OrigineEnvoiCoherenceTest`, 6 000 lignes de journal tirées au hasard (graine 20261113) :
  - l'origine enregistrée prime ; sinon, la déduction est sûre ou « non précisée » ;
  - les étapes vont de 0 à 4, avec 0 seulement en cas d'échec ;
  - un lien a deux étapes ;
  - l'ordre des étapes suit celui des statuts.
- `TicketZTraceTest`, 3 000 cas : la trace dit le canal et l'état, jamais le texte, et tient en 255 caractères.

**Traces (bilan) :** exactement une ligne par envoi au journal WhatsApp, avec son origine et son utilisateur, et une ligne d'événement par ticket Z. Rien d'autre. Le test retire tout ce qu'il a créé.

**Limites des essais, à savoir :**
- Sur ce poste, aucun numéro d'administration n'est réglé (il est dans le fichier de configuration, que je n'ouvre pas). L'envoi réussi du ticket Z n'a donc été joué que par son chemin commun (`envoyerTexte`, origine Ticket Z), pas de bout en bout ; le test a vérifié la trace « Non envoyé ».
- Le ticket Z par SMS n'est pas joué en test d'écran : le fournisseur SMS peut être réel. Sa trace est vérifiée par `TicketZTraceTest`.

**Cas couverts :** ticket Z sans numéro, essai simulé, lien ouvert, passage à distribué, à lu et en échec, envois antérieurs sans origine, plusieurs origines dans la même grille.

**Non-régression (8080) :** WhatsApp 28 / 28 ; ticket Z WhatsApp 9 / 9 ; journal des campagnes 13 / 13. Tests Java : campagnes, indicateur d'envoi, webhook, WhatsApp Web et discussions, tous verts.

## Point 14 bis : fait le 11/11 (branche `plan/09112026`), seule l'icône change

**Retour du 11/11 :** « je n'ai pas demandé à passer au violet, juste changer l'icône ». La maquette violette est abandonnée ; les couleurs de l'écran de connexion ne changent pas.

**Ce qui change :**
- l'icône de la pastille « PRESTIGE » n'a plus de carré blanc derrière elle ;
- la grande illustration (l'ancien mortier) devient l'icône Prestige 3.

**Test :** `test-icone-prestige3-1011` passe de 16 à 19 contrôles : pas de carré blanc, grande illustration = nouvelle icône, dégradé d'origine du panneau inchangé. 19 / 19 sur 8080 ; rouge sur le code précédent (17 / 19).

## Point 8 : maquette « À propos » (proposition C), en attente d'avis

Fichier [MAQUETTE_POINT_8_A_PROPOS_2026-11-11.html](MAQUETTE_POINT_8_A_PROPOS_2026-11-11.html). Elle garde les couleurs de l'application (bandeau bleu nuit, accents vert d'eau) ; seule l'icône est nouvelle.

Le volet s'ouvre à droite et a trois onglets :
- **Version** : version, date de construction, base, officine, poste, utilisateur ; « Copier pour l'assistance », confirmé dans le bouton ;
- **Nouveautés** : par domaine, chacune avec l'écran où la trouver ;
- **Assistance** : serveur, base, dernière sauvegarde, espace disque, envois, contact.

**Questions :**
1. Volet à droite, ou fenêtre centrée ?
2. Quels domaines dans « Nouveautés » ?
3. Pour un utilisateur qui n'est pas administrateur, l'onglet Assistance montre-t-il tout, ou seulement le contact ?

---

# Plan du 10/11 : points 1 à 4, faits le 11/11 (branche `plan/09112026`, sur domain3)

## Point 1 : reçu de règlement d'un différé (commit `2b8c89992`)

**Ce qui change :**
- le reçu montre le numéro de la vente, « Vente N° … du … », et non plus son identifiant interne ;
- comme convenu, il montre aussi « Montant dû (n ventes) », « Reste sur ces ventes » et « Solde restant du client ».

Une réimpression montre les montants du jour du règlement : les règlements faits après sont retirés.

**Où la donnée apparaît :**
- l'écran « Faire un réglement » ;
- le reçu ;
- la base (dossier, détails, dettes).

**Tests :**
- rapprochement et bilan : `test-recu-differe-numero-1111`, 44 / 44, rouge sur l'ancien code ;
- cohérence : `RecuDiffereSoldeCoherenceTest`, 5 000 cas, graine fixe ;
- rendu : `RenduTicketTest`.

**Correction :** le « 160 F au lieu de 7 160 F » vu le 10/11 venait du test et non de Prestige. Le test tapait trop tôt après le clic, et la sélection différée du champ effaçait le premier chiffre. Le test attend désormais et relit le champ. Le rapport de fusion du lot Q2.5 est corrigé.

## Points 2 et 3 : réserve (commit `52ceffa36`)

### Point 2 : fenêtre « Seuil de réserve atteint »

**Ce qui change :**
- la fenêtre est agrandie selon l'écran (entre 820 × 440 et 1180 × 680) ;
- « Seuil mini rayon » apparaît en rouge gras, « Seuil maxi rayon » en bleu gras et « Quantité proposée » en vert gras ;
- l'impression passe par un modèle dédié, `rp_reserve_apres_entree` (A4 paysage). C'est un nouveau nom : les modèles copiés sur les postes ne sont pas touchés.

**Tests :**
- `test-entree-stock-0825` 16 / 16 ;
- `test-reserve-apres-entree` 21 / 21 ;
- `-sans-repetition` 9 / 9 ;
- `-droit-suggestions` 9 / 9 ;
- `EditionSectionsTest` : rouge sur l'ancien code, car le modèle n'existait pas.

### Point 3 : onglet Suggestions

**Ce qui change :**
- une suggestion manuelle se supprime sans motif. Premier clic : l'icône passe au rouge pendant 5 s. Second clic : la suggestion est supprimée. En base, le motif est « Suggestion manuelle supprimée sans motif » ;
- une suggestion automatique demande toujours un motif ;
- la référence devient courte : `SR-RAY-` ou `SR-RES-` suivi de 5 caractères, sans caractère ambigu (0, O, 1, I, L). Elle est unique.

**Hypothèse retenue :** les questions sur ce point sont restées sans réponse ; j'ai appliqué la règle ci-dessus (manuelle sans motif, automatique avec motif).

**Pourquoi une suggestion « encore à traiter » s'affiche quelle que soit la période :** c'est le plan du 08/11, point 9b (retour du 03/11). Une suggestion pas encore traitée reste visible pour ne pas être oubliée. Si elle est antérieure à la période choisie, elle porte la mention « ancienne ».

**Tests :**
- `test-reserve-suggestion-manuelle-1011` 15 / 15, rouge sur l'ancien code (3 / 5) ;
- `test-reserve-suppression-masse-0811` 18 / 18 ;
- `ReferenceSuggestionCourteTest` : 100 000 tirages.

## Point 4 : différés, onglet Solde (commit `bf68e8c1a`)

**Ce qui change :**
- **à l'ouverture**, rien n'est chargé ; la période proposée va du 01/01/2015 à ce jour ;
- **regroupement par client** : une ligne par client (solde au début, débit, crédit, solde à la fin), puis ses opérations avec le solde après chacune, et ses soldes de fin de mois. Les clients sont triés par nom ;
- **volet de droite** :
  - clic sur une vente ou son annulation : ses produits (CIP, libellé, quantité, prix unitaire, montant) ;
  - clic sur un règlement : montant, mode, opérateur et ventes réglées ;
  - clic sur un client : son résumé ;
- **couleurs** : débits en rouge, crédits en vert ;
- **disposition** : le relevé prend 3/5 de la largeur, le volet 2/5 ;
- **impression** : le PDF passe par un nouveau modèle, `releve_differes_clients`, groupé par client ; l'Excel aussi, avec une colonne « Solde au début ».

**Correction en cours de route :** le solde au début de chaque client est maintenant calculé comme le solde global. Les deux se contrôlent : la somme des clients doit égaler le solde global, sinon un avertissement est écrit au journal du serveur.

**Défauts trouvés par le nouveau test et corrigés avant le commit :**
- le détail d'une vente était en erreur : deux colonnes portaient le même nom dans la requête ;
- la ligne d'une vente annulée disparaissait de l'écran : elle avait le même identifiant que son annulation, et la grille n'en gardait qu'une. La clé s'appelle désormais « pièce ».

**Où la donnée apparaît :**
- la ligne du client et ses opérations à l'écran ;
- le volet de détail ;
- le PDF ;
- l'Excel ;
- la base (dettes, détails de vente, dossiers de règlement).

**Rapprochement (`test-differes-solde-client-1111`, 30 / 30, rouge sur l'ancien code) :**
- ligne CLIENT = base ;
- produits de la vente = base, ligne par ligne ;
- règlement (montant, mode, parts par vente, reste dû) = base ;
- PDF et Excel groupés dans le même ordre, avec les mêmes montants.

**Cohérence :**
- `ReleveDifferesGroupeTest` : 3 000 relevés, graine fixe. Il couvre les homonymes et les annulations qui portent la pièce de leur vente. Il vérifie :
  - solde courant = début + débits − crédits, ligne à ligne ;
  - ligne client = ses totaux ;
  - somme des clients = totaux du relevé ;
- le test e2e refait ce contrôle sur les données du poste.

**Bilan :** consulter, ouvrir le détail, imprimer et exporter n'écrivent rien en base. Le test le vérifie sur les ventes, les dettes, les règlements, les mouvements, la caisse et les restes.

**Cas variés couverts :**
- deux clients ;
- une vente à deux produits (quantités 3 et 2) ;
- des montants différents ;
- un règlement partiel qui solde une vente et en entame une autre ;
- une vente annulée ;
- un client choisi dans la liste ;
- des dates inversées.

**Non-régression :**
- `test-differes-solde` adapté : 16 / 16 ;
- `test-differes-reglement` 14 / 14 ;
- `test-differes-modification` 13 / 13 ;
- `test-differe-nom-client` 14 / 14 ;
- `repro-differes` 13 / 13.

Ces tests prennent désormais l'adresse du serveur dans `BASE`.

**Limite :** la copie `laborex_audit` contient peu de différés (3 clients sur la période testée). Le contrôle sur les données du poste est donc léger ; il serait à rejouer sur la copie `laborex_v1_db`.

## Reste à faire

- Point 8 du plan du 09/11 : la maquette « À propos » attend votre avis.
- 350 tests d'écran ont encore l'adresse 8080 en dur, dont `test-reserve-sans-doublon`. Sur un autre domaine (domain3), ils testent le serveur de 8080 au lieu de celui qu'on vient de déployer. Il faut les faire passer par `BASE`, comme ceux corrigés ici.
- Aucune fusion sans votre accord.
