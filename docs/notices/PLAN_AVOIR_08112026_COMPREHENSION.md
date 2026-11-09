# Plan « avoir » du 08/11/2026 : rapport de compréhension

Source : `PLAN_AVOIR_08112026.txt` et 9 captures. Chaque point a été vérifié dans le code de `claude/new-session-xm8ptu`
et dans la branche du plan du 08/11 (`plan/08112026-evolutions-rattrapages`, non fusionnée). Aucun code n'est encore écrit.

**Base de travail proposée :** partir de la branche du plan du 08/11.
- Elle contient les nouvelles cartes de l'Activité des équipes (point 1).
- Elle contient le correctif de hauteur des écrans (point 7).

## 1. Activité des équipes au tableau de bord
- **Constat :**
  - Le tableau de bord (`TableauBord.js`) n'a aucune carte d'activité des équipes.
  - L'écran Activité des équipes a 9 cartes, plus 5 nouvelles dans la branche du plan (préventes, vitesse des
    caissières, annulations…).
  - La période se choisit par Du / au, avec des raccourcis Hier et 7 jours, mais sans « 3 jours ».
- **Proposition :**
  - Une carte « Activité des équipes » au tableau de bord : 4 chiffres du jour et un repère d'alerte.
    - Ventes de plus de 10 min.
    - Actions sensibles.
    - Délai moyen de saisie des BL.
    - Opérateur le plus rapide.
  - Au clic, une fenêtre de consultation (sans modification, donc permise) :
    - boutons Hier, 3 jours, 1 semaine, puis Du / au ;
    - les mêmes cartes que le menu Activité des équipes, servies par la même API : même chiffre partout,
      vérifié par un test de rapprochement.
- **Rapport demandé « employé × tranche horaire × CA réalisé » :** il n'existe pas aujourd'hui.
  - Proposition : nouvelle carte et export dans Activité des équipes, avec une ligne par employé, une colonne par
    tranche, et le CA et le nombre de ventes. La somme des cases égale le CA de la période (test de cohérence).
- **Questions :**
  - **Q1a :** le CA d'une vente va-t-il au vendeur ou à la caissière ? Proposition : au vendeur, avec un choix
    « vendeur / caissière ».
  - **Q1b :** quelle taille de tranche ? Proposition : 1 h par défaut, 2 h au choix, comme la fréquentation.
  - **Q1c :** la carte du tableau de bord est-elle réservée au pharmacien (privilège `P_ACTIVITE_EQUIPES`) ?

## 2. Retours fournisseurs par les extranets grossistes : mon avis
- **Constat :** l'écran des extranets (branche des connecteurs, non fusionnée) **lit** les réclamations d'Ubipharm,
  TEDIS et DPCI, sans pouvoir en créer.
  - Le collecteur est en lecture seule, par choix.
  - L'envoi d'un retour ou d'une réclamation existe déjà par un autre canal : **PharmaML** (bouton « Envoyer par
    PharmaML » de l'écran de retour, avec les types RETOUR et RECLAMATION).
- **Mon avis :** ne pas envoyer de retour par l'extranet.
  - **Fragilité :** il faudrait remplir un formulaire du site du grossiste à la place de l'utilisateur. Le moindre
    changement de leur site casse l'envoi, sans prévenir, et il n'y a pas d'accusé fiable.
  - **Canal officiel existant :** PharmaML est fait pour cela et renvoie une réponse ligne par ligne.
- **Proposition :** rapprocher les deux.
  - Le retour envoyé par PharmaML affiche l'état de la réclamation lue sur l'extranet (En traitement / Clôturée,
    avoir), par numéro de commande ou de BL.
  - L'extranet devient la preuve du suivi, sans en être l'envoi.
- **Q2 :** d'accord pour ce rapprochement, à faire après la fusion de la branche des connecteurs ?

## 3. Pilotage de l'officine
| Demande | Cause trouvée | Correction proposée |
|---|---|---|
| Petit écran : tuiles de la Synthèse cachées sous la barre d'onglets | Hauteurs fixes des bandeaux (272 px, 420 px) et barre d'onglets qui passe sur deux lignes | Hauteurs calculées sur le contenu ; barre d'onglets sur une ligne, avec défilement par flèches |
| « Qualité–Exploitation » → « Exploitation » | Libellé dans `PilotageManager.js` | Renommer |
| « À suivre » : texte qui dépasse | Tuiles en `flex:1` sans retour à la ligne : elles rétrécissent sans limite | Largeur minimale et passage à la ligne |
| « CA par emplacement » et « CA par famille » : en-têtes sans données | Cartes de l'onglet « À suivre », sans hauteur propre : le contenu est coupé par le cadre | Hauteur sur le contenu ; le défilement général de l'onglet prend le relais |
| KPI Analyse : défilement horizontal, cases qui débordent | Panneau des cases à hauteur fixe de 196 px | Hauteur sur le contenu, cases qui passent à la ligne, aucun défilement horizontal |
| Détail mensuel coupé | Détail en `flex` avec un minimum de 200 px (340 px dans Achats / Ventes) | Hauteur des 12 mois affichés ; le défilement général gère le reste |

- Tests : par vrais clics, en 1366 × 768, 1280 × 650 et 1024 × 600.
  - Aucun défilement horizontal.
  - Aucun texte coupé.
  - Les 12 lignes du détail sont visibles en faisant défiler l'onglet.
- **Q3 :** sur quel poste avez-vous vu le défaut du « petit écran » (taille d'écran, zoom du navigateur) ?

## 4. Campagnes
| Demande | Constat (code) | Correction proposée |
|---|---|---|
| 5 clients cochés, 1 seul ajouté | **Défaut confirmé.** Chaque recherche remplace la liste : les clients cochés avant sont perdus. Seuls ceux du dernier résultat partent. | Un panier « clients sélectionnés » qui garde les clients cochés d'une recherche à l'autre ; « Ajouter les N clients » |
| Clients sans téléphone dans ce menu | **Défaut confirmé.** Les campagnes lisent `str_ADRESSE`, alors que le numéro est désormais dans `str_TELEPHONE`. Même défaut dans les rappels. | Lire `str_TELEPHONE`, sinon `str_ADRESSE` s'il contient un numéro valide. Rapprochement fiche client = campagne = rappel |
| Création de liste : seulement un nom | Pas de filtre (et pas de produits non plus) | Filtres à la création : sexe, âge, achats depuis N mois, produit, famille ou DCI achetés, montant ; « Ajouter tous les résultats » |
| Zone « Ajouter des clients » | Placée après la liste des clients | La placer avant |
| Onglet Fêtes lent | Il charge **tous** les clients actifs (jusqu'à 5 000) dès le clic | Choix de la liste de diffusion ; rien n'est chargé avant ce choix |
| « Rappels des traitements » | Voir le point 5 | — |
| Statut « répondu » sans réponse | Il est **calculé** : un message reçu du même numéro dans les 7 jours suivant l'envoi. L'ouverture de la conversation ne le pose pas. | D'abord reproduire par un test, avec votre scénario exact. Piste : votre propre envoi relu comme un message entrant |

- **Q4 :** pour « répondu », vous avez envoyé un message à quel numéro ? Était-ce celui du compte WhatsApp de
  l'officine ou un numéro de test ? Par WhatsApp ou par WhatsApp Web ?

## 5. Rappels des traitements : explication
- **Le principe :** Prestige repère les **habitudes d'achat**.
  - La règle : un client qui a acheté le même produit au moins 3 fois en un an, à intervalles réguliers (35 jours
    d'écart au plus).
  - Prestige en déduit la date probable du prochain achat. Quand elle tombe dans les 3 jours, la ligne entre
    « à préparer ».
  - Le calcul tourne chaque matin à 7 h 13, ou par le bouton « Actualiser la liste ».
  - Un rachat fait passer la ligne à « acheté ».
- **À quoi sert la liste affichée d'office :** ce sont les clients à prévenir maintenant, pour qu'ils pensent à
  renouveler leur traitement. « Préparer » veut dire : préparer le message, puis l'envoyer.
- **Ce qui manque :** un ciblage libre.
  - Proposition : un filtre « clients ayant acheté » un produit, une famille ou une DCI sur une période, avec un
    nombre minimal d'achats.
  - Puis « Envoyer aux résultats » (SMS ou WhatsApp, avec un modèle de message).
  - Le même filtre sert à l'onglet « Rappel traitement » des campagnes : une seule API, et un test de
    rapprochement entre les deux écrans.
- **Q5 :** d'accord avec ce filtre ?

## 6. Nouveau menu « PRÉ-SAISIE BON DE LIVRAISON »
- **Constat :** le BL se crée aujourd'hui depuis « Commande en cours » (fenêtre « Saisie du bon de livraison » :
  numéro, date, HT, TVA). Il n'existe pas de BL pré-saisi à la main. Seuls existent les BL reçus par PharmaML.
- **Proposition, première phase (« pas encore actif ») :**
  - nouveau menu déclaré dans `correctifs-affichage.js` ;
  - saisie avec les mêmes champs que la fenêtre de création du BL, plus le grossiste et la commande (facultative) ;
  - liste à consulter, avec des filtres ;
  - état « À saisir », qui passe à « Traité » quand un BL de même grossiste et de même numéro est créé ;
  - doublon refusé : même grossiste et même numéro ;
  - API REST et nouvelle table, rien d'autre ne change.
- **Phase suivante, après votre validation :** dans « Commande en cours », choisir un BL pré-saisi au lieu de le créer.
- **Q6a :** la commande liée est-elle obligatoire à la pré-saisie ? Proposition : facultative.
- **Q6b :** qui peut pré-saisir ? Proposition : un nouveau privilège, donné aux rôles qui créent déjà des BL.

## 7. « Fichier journal » et « Me contacter » : la vue ne prend pas tout l'écran
- **Cause :** les deux écrans gardent une hauteur fixe de 570 px. Le recalage sur la hauteur de l'écran ne relance
  pas la mise en page.
  - C'est le même défaut que « Facture de groupe », déjà corrigé dans la branche du plan du 08/11. Ce correctif
    couvre aussi le Fichier journal.
  - « Me contacter » a en plus une grille de hauteur fixe (320 px) : elle prendra le reste de la hauteur.
- Tests : en 3 tailles d'écran.

## 8. Gestion des inventaires
- **Icônes :** « Effectuer une analyse simple », « Editer un inventaire » et « Valorisation » ont **la même icône**.
  Le thème les remplace toutes par l'œil.
  - Correction : une icône distincte pour chacune.
  - « Editer un inventaire » devient « Ouvrir l'inventaire ».
- **Boutons de la vue d'inventaire :** 9 boutons, plus l'interrupteur « Afficher stock PDF ». Je prépare une page de
  propositions (comme pour les icônes du 08/11) : regroupement Imprimer ▾, couleurs par rôle, icônes.
- **Q8 :** vous choisirez sur la page de propositions.

## 9. Comptes WhatsApp : service compagnon WhatsApp Web
- **Constat :**
  - « Adresse du service » et « Dossier du service » sont vides par défaut : les valeurs n'apparaissent qu'en
    indication grisée.
  - Démarrage : par le service Windows `prestige-whatsapp` s'il est installé (sans console). Sinon, par
    `demarrer.bat`, dans une fenêtre de console réduite qui reste ouverte.
- **Proposition :**
  - Une nouvelle installation reçoit `http://localhost:3010` et `C:\prestige\whatsapp-web` comme vraies valeurs.
  - Un bouton « Configuration détaillée » ouvre une fenêtre de consultation : mode de démarrage (1 : service
    Windows, 2 : lancement direct), état, port, dossier, journaux.
  - En lancement direct, le service démarre **sans fenêtre** (processus caché), avec ses journaux dans un fichier.
- Aucun jeton n'est montré à l'écran ni écrit dans les journaux.

## 10. Avis client par WhatsApp Web
- **Constat :**
  - La réponse à un avis sait déjà partir par WhatsApp (`envoyerTexte`) ou par e-mail, si le client a accepté d'être
    recontacté.
  - Elle n'apparaît pas dans le fil de discussion WhatsApp.
- **Proposition :**
  - La réponse passe par le même envoi que les discussions, donc aussi par WhatsApp Web quand c'est le compte
    actif.
  - Elle apparaît dans le fil du client.
  - Test de rapprochement : avis = fil = base.
- **Q10 :** d'accord ?

## Ordre proposé
1. **Défauts confirmés, P1 :**
   - 4 : panier de clients, téléphone, Fêtes ;
   - 7 : hauteur des écrans ;
   - 3 : Pilotage ;
   - 8 : icônes et libellé.
2. **Point 1 :** tableau de bord et rapport employé × tranche × CA.
3. **Points 5 et 4 :** filtre libre des rappels, filtres des listes de diffusion.
4. **Point 6 :** pré-saisie des BL, phase 1.
5. **Points 9 et 10 :** WhatsApp Web.
6. **Point 2 :** après la fusion des connecteurs.

## Réponses du 09/11 et lancement
- **Q1 :** des tranches de 1 h à 6 h, au choix. La vente est attribuée par défaut à la caissière, avec un choix « vendeur (prévente) » pour cette statistique.
- **Q3 :** un ordinateur portable de 15 pouces. Les tests se font en 1366 × 768, 1536 × 864 et 1280 × 720, en plus de 1024 × 600.
- **Q4 :** le numéro concerné est transmis à la seule session des campagnes, pour l'enquête. Il n'est écrit nulle part.
- **Autres questions :** les propositions du rapport sont retenues (« lance tout »).
- **Sessions lancées le 09/11 :**
  - points 3, 7, 8 : affichage ;
  - points 4, 5 : campagnes et rappels ;
  - point 1 : activité des équipes ;
  - point 6 : pré-saisie des BL, phase 1 ;
  - points 9, 10 : WhatsApp Web et avis.
- **Point 2 :** il attend la fusion de la branche des connecteurs.
