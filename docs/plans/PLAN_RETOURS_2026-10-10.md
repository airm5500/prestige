# Plan — retours de tests du 10/10/2026

Document d'échange : pour chaque point, **ce que j'ai compris**, **ce que j'ai constaté dans le code**, **ce que je propose** et, le cas échéant, **la question** à trancher avant de coder. Rien n'est commencé tant que les questions du point ne sont pas tranchées (les défauts sans question peuvent démarrer).

Règles appliquées partout : aucune régression ; pas de fenêtre pour une saisie (sauf demande explicite : points 7 et 14) ; API REST (pas de JSP) ; pas de secret dans le code, les journaux ou Git ; chaque développement a ses tests (unitaires + e2e par l'écran, données d'essai retirées) ; « mediciel » n'apparaît nulle part.

---

## Réponses aux questions posées

### « Équivalents DCI directs en stock » (134 alors que 52 produits ont la même DCI)
- La valeur n'est **pas un nombre de produits** : c'est une **quantité d'unités en stock**.
- Calcul (`PrevisionCommandeServiceImpl.equivalentsDirects`) :
  1. groupe = produits actifs ayant **exactement** le même ensemble de DCI (associations comprises) ;
  2. dans ce groupe, on garde les **autres** produits (le produit lui-même est exclu), non déconditionnés, en stock, et **équivalents directs** : même dosage et même famille de forme, lus dans le libellé (`SubstitutionArticle.comparer`) ;
  3. on additionne leur **stock rayon** de l'emplacement (sans la réserve).
- Exemple ALBEN 400 : 134 = somme des stocks rayon de ses équivalents directs ; le produit à « 2 » n'a que 2 unités d'équivalents directs en stock (les autres produits de même DCI ont un autre dosage, une autre forme ou sont à 0).

### Pourquoi déduire les équivalents de la quantité à commander ?
- Si un générique strictement équivalent est déjà en rayon, commander en plus crée du surstock ; c'est pourquoi ALBEN donne 0.
- Discutable si la clientèle n'accepte pas la substitution : **proposition** — déduction paramétrable : *Oui / Non / Seulement les génériques*.

### « Délai 1 j + couverture 15 j »
- **Délai** = délai de réapprovisionnement saisi sur la fiche du **grossiste habituel** du produit (`t_grossiste.int_DELAI_REAPPROVISIONNEMENT`) ; à défaut, paramètre `KEY_PREVISION_DELAI_JOURS` (3 j).
- **Couverture** = paramètre `KEY_PREVISION_COUVERTURE_JOURS` (15 j) : jours de ventes que l'on veut avoir après la livraison.

### Toutes les valeurs de la fenêtre produit
| Ligne | Calcul |
|---|---|
| Ventes prévues par jour | prévision du mois / 30 ; méthode retenue = celle qui s'est le moins trompée sur les 6 derniers mois connus (erreur WAPE) |
| × (délai + couverture) | besoin = ventes/jour × (délai + couverture) |
| + stock de sécurité (95 %) | 1,65 × écart-type mensuel des ventes (12 mois) / √30 × √délai — couvre les variations de vente |
| − stock rayon et réserve | stock rayon de l'emplacement + réserve |
| − commandes en cours | lignes des commandes « en cours / passées » de moins de 45 jours |
| − équivalents DCI directs | voir ci-dessus |
| = à commander | arrondi au-dessus, jamais négatif |
| Fiabilité retenue | 100 − erreur de la méthode retenue |

### Pourquoi pas le seuil et la quantité de réapprovisionnement ?
- Ce sont des valeurs **fixes** saisies à la main, qui vieillissent ; la prévision suit d'elle-même tendance et saison.
- **Proposition** : afficher seuil et quantité de réappro à côté de la recommandation (comparaison) et un paramètre *Base de la recommandation : prévision / seuil*.

### « Quantité aberrante »
- Ligne signalée quand la quantité proposée est **≥ 5** et **> 3 ×** le plus grand de (recommandé, prévision du mois). Le 3 = `KEY_PREVISION_ECART_ABERRANT`.
- « Insuffisante » : quantité proposée < moitié du recommandé.

### Colonne « En cours » non mise à jour
- **Défaut** : l'écran lit une photo calculée la nuit (02:37) ou par « Recalculer » ; une commande créée ensuite n'apparaît qu'au recalcul.
- **Correction** : en-cours lu **en direct** (comme l'onglet Risque de rupture). Même correction dans l'onglet Analyse (qui retranche aujourd'hui la ligne de la photo, ce qui peut fausser l'en-cours des autres commandes).

### WhatsApp Web : « Service non configuré »
Le service WhatsApp Web est un petit programme à part, fourni dans `outils/whatsapp-web` (Node.js + whatsapp-web.js). Procédure :
1. Sur le **serveur Prestige** : installer Node 18+ et Chrome ; copier `outils/whatsapp-web` (ex. `C:\prestige\whatsapp-web`) ; `npm install --omit=dev`.
2. Créer `config.json` : `PORT` 3010, `JETON` (secret ≥ 16 caractères), `PRESTIGE_WEBHOOK` = `http://localhost:8080/prestige/api/v1/whatsapp/webhook-web`, `DOSSIER`.
3. Le démarrer comme service Windows (NSSM ou pm2) — journal : « service WhatsApp Web sur le port 3010 ».
4. Prestige › Paramétrage WhatsApp › **Comptes** › bloc WhatsApp Web : adresse `http://127.0.0.1:3010`, **le même jeton**, cocher « Compte actif » (laisser « Mode test » pour essayer sans envoi réel), Enregistrer.
5. Onglet **connexion et règles** : le QR code s'affiche ; téléphone de la pharmacie › WhatsApp › Réglages › Appareils connectés › Connecter un appareil › scanner. État « Connecté · +225… » ; pas de nouveau scan au redémarrage.
6. Dépannage : « Jeton refusé » = jetons différents ; « Service injoignable » = service arrêté ou mauvais port.

**À faire** : notice illustrée ; corriger le README (format d'envoi `{to, text}`) et le plan d'octobre (il dit à tort que le service n'est pas dans le dépôt).

### Fond affiché avant le menu ; message `unload` dans la console
- Fond : l'écran se vide et se dessine avant que le composant soit chargé → **à observer**, puis masque « chargement » pendant l'ouverture.
- `[Violation] … unload is not allowed` : ExtJS écoute `unload`, que Chrome déconseille ; sans effet fonctionnel. **Proposition** : neutraliser (écoute de `pagehide`).

### Pointage par l'application mobile `prestige_vente_app`
Dépôt consulté (application Flutter, dernière version « liste bl et pointage ») :
- Le « Pointage » de l'application est le **« Pointage BL Stock »** : contrôle des quantités reçues ligne par ligne d'un BL (`/commande/list-bons`, `/commande/bon/items/{bl}`, `POST /commande/bon/items/checked-quantities`, `/etat-control-bon/list`) et rapport PDF « RAPPORT DE POINTAGE ».
- Ce n'est **pas** un pointage de présence du personnel : l'application n'appelle pas l'API mobile RH de Prestige (`v1/mobile` : connexion par jeton puis `POST pointages`) ; elle se connecte par `/user/auth` (session).
- Côté Prestige, tout existe déjà pour la présence : API mobile, table des pointages, appairage des téléphones par QR code (onglet RH « Pointage mobile »), import de la pointeuse (empreinte / badge).

Deux lectures possibles de votre demande :
1. **Présence du personnel** depuis le téléphone : il faut **ajouter un écran « Pointage présence » dans l'application** (appairage par QR, puis arrivée / départ avec position GPS ou scan d'un QR affiché à la pharmacie) qui appelle l'API existante. Je peux écrire cet écran Flutter, mais je n'ai qu'un accès en **lecture** à ce dépôt : il faudrait l'attacher en écriture (ou je vous fournis le code à intégrer).
2. **Pointage des BL** fait dans l'application, à exploiter dans Prestige (point 4 bis « Pointer les BL / Avoirs » et État de contrôle des achats) : les quantités contrôlées sont déjà enregistrées dans Prestige ; il s'agit alors de les afficher (qui a contrôlé, quand, écarts) dans ces écrans.

- **Q11** : lecture 1 (présence du personnel), lecture 2 (contrôle des BL), ou les deux ? Si 1 : écriture dans le dépôt de l'application ou code fourni ?

---

## 1. Fiche article (zone du double clic)

| Demande | Constat | Proposition |
|---|---|---|
| Ventes moyennes jour / semaine / mois sur 3 mois, entre « nom + CIP » et « sorties − achats » | absent | calcul serveur dans l'aperçu produit |
| Date de dernière entrée | c'est la **date du BL** (`dt_DATE_LIVRAISON`), BL non entrés en stock compris | afficher la **date de mise en stock** (validation du BL) en « Dern. entrée », la date du BL en second |
| Recherche lente après choix d'une DCI | `DISTINCT` sur toutes les colonnes multiplié par la jointure grossistes, pas d'index sur `t_famille_dci`, deux requêtes par ligne | index, requête allégée, lectures groupées ; temps mesuré avant / après |

- **Q1** : 3 mois = **90 derniers jours** (jour = total ÷ 90, semaine = ÷ 12,86, mois = ÷ 3) ou les 3 derniers **mois complets** ?
- **Q2** : « intervertir » = « Dern. entrée » = date de mise en stock, et date du BL à côté en petit ?

Tests : calcul des moyennes (unitaire), date de mise en stock vs date BL (e2e), temps de la recherche DCI.

## 2. Prévisions vente / achat / analyse

### Onglet Tableau
- Tous les seuils en paramètres modifiables **dans l'écran** (panneau « Paramètres » pour qui a le droit) : jours de rotation lente (180), surstock (90), couverture, délai par défaut, écart aberrant, écart de prix, et les valeurs aujourd'hui figées (6 mois de test, 45 jours d'en-cours, plafond 365 j, seuil « peu fiable » 50 %).
- Explication / définition en face de chaque méthode (Moyenne 3 mois, Saisonnière, Tendance (Holt), Tendance + saison).

### Onglet Prévisions
- Bouton **Équivalents** par ligne : liste des équivalents (directs et à adapter) avec stock rayon / réserve, et **vérification de disponibilité PharmaML** du produit et de ses équivalents ; possibilité de **retirer le produit** de la suggestion à créer.
- Bouton **Générer une suggestion** (en haut) : quantité = recommandé, lignes à 0 exclues, une suggestion par grossiste habituel (service existant `makeSuggestionDepuisGarde`), produits sans grossiste listés en retour.
- Filtres : méthode, « au moins un équivalent », stock (rupture / en stock / surstock).
- Infobulles sur chaque colonne, avec le calcul pour les valeurs numériques.
- En-cours **en direct** (défaut ci-dessus).
- Nombre de lignes : 25 / 50 / 100 / 200.
- Exports **Excel**, **PDF**, **Créer un inventaire** (sélection cochée ou liste filtrée).

**Q3** : la génération de suggestion porte sur **toute la liste filtrée** (toutes pages) ou seulement la page affichée ?

### Fenêtre produit (clic sur une ligne)
- Quantité vendue au-dessus de chaque barre ; infobulles explicatives.
- « délai 1 j + couverture 15 j » : origine affichée (« délai du grossiste X » / « paramètre »).
- Couleurs : ventes/jour, (délai + couverture), stock de sécurité **en vert** (ce qui fait le besoin) ; stock rayon + réserve, commandes en cours, équivalents en **rouge doux** (ce qui est retranché) — à confirmer, vous avez écrit « stock rayon + réserve en vert ».
- « Stock rayon et réserve (RAY = 5, RES = 1) » avec le total au bout.
- « Dernière vente : 22/07/2026 — 2 unités ».
- Même fenêtre accessible depuis la **suggestion** et la **commande** ouvertes (points 3 et 4).

**Q12** : couleurs — vert pour ce qui s'ajoute, rouge doux pour ce qui se retranche ?

### Onglet Analyse suggestion / commande
- Zone de sélection élargie sur une ligne ; nombre de lignes en vert.
- Liste : suggestions **actives** (en cours) et commandes en cours, avec détail des lignes. Enquête sur l'écart avec le menu Commandes en cours (statuts et emplacement différents).
- Pastilles d'alertes **cliquables** (filtre) ; filtres sur quantité recommandée et stock ; recommandé en vert.
- Marqueur « équivalent DCI en stock » cliquable → liste des équivalents avec leur stock.
- Bouton **Appliquer les quantités recommandées** à la suggestion.
- Exports Excel / PDF / Créer un inventaire.

**Q4** : « Appliquer » sur les **suggestions seulement** ou aussi sur les commandes en cours ? Une ligne recommandée à 0 : **supprimée** ou mise à 0 ?

Tests : unitaires du calcul (existants + nouveaux paramètres), e2e : génération de suggestion, application des quantités, filtres, exports, en-cours en direct après création d'une commande.

## 3. Suggestion de réappro
- Bouton « Commander par PharmaML » : **retiré de la liste des suggestions**, placé **au bas de la vue d'une suggestion ouverte**, avec les autres boutons.
- Bouton par ligne rappelant la fenêtre de prévision du produit, **même icône que « Détail article »**, l'ancien bouton Détail étant masqué.
- Colonnes Disponibilité et Colisage : fond blanc qui coupe la ligne → même fond que la ligne.
- Info produit : « Date Dern. entrée » → « Dern.Entrée ».
- Infobulles sur les données (évite d'élargir les colonnes) ; marges horizontales et verticales réduites.

## 4. Commandes en cours
- Bouton PharmaML : **au bas de la vue d'une commande ouverte** (pas sur la liste ni au niveau des montants de BL).
- Même bouton « prévision » par ligne que la suggestion.
- Onglets centrés ; « Ruptures » → **« Ruptures de commande »** ; tuiles du tableau de bord en couleurs douces ; « Fussionner » → **« Fusionner les ruptures »**.
- **Risque de rupture** : les boutons colorés (Rupture 600, Critique 4…) ne filtrent pas la liste → **défaut à corriger** ; paramètres de calcul modifiables dans l'écran ; nombre de lignes 25 / 50 / 100.
- Accueille l'onglet **Suivi équivalence** (déplacé d'Analyse article, point 11), entre Alertes et Tableau de bord.

## 4 bis. Pointage BL
- Menu renommé **« Pointer les BL / Avoirs »** (libellé exact à confirmer).
- **Édition PDF** (liste pointée et rapprochement du relevé).
- **Filtre par groupe de grossistes** (table existante `groupefournisseur`).

## 5. Étiquettes QR Code et DataMatrix
- Nouveau type d'étiquette (QR ou DataMatrix) contenant : CIP, EAN fabricant, code EAN, n° de lot, date de péremption.
- **Proposition** : codification **GS1** (celle des boîtes pharmaceutiques) — (01) EAN/GTIN, (17) péremption AAMMJJ, (10) lot, + CIP en champ complémentaire (240). Tout lecteur 2D la lit ; à la vente on en extrait CIP, lot et péremption.
- Bibliothèques déjà présentes (barcode4j et iText savent produire DataMatrix et QR) : pas de nouvelle dépendance.

**Q5** : codification GS1 d'accord ?
**Q6** : la **lecture à la vente** (scan → produit + lot + péremption) dans ce lot, ou d'abord l'impression seule ?

## 6. État de contrôle des achats
- Onglet **Dashboard** : tuiles récap ; BL saisis **≤ 1 jour = bon**, > 1 jour = mauvais ; BL contrôlés / total (rapport et %) ; nombre de BL par groupe de grossistes et par grossiste du groupe.
- « Exporter en excel » → **« Excel »** ; « INVENTAIRE DE LA SELECTION » → **« Inventaire »**.
- Filtre **groupe de grossistes** : s'il est choisi, la liste des grossistes est grisée.
- Bouton **Rechercher** juste après le champ de recherche ; « Sectionner » → « Sélectionner ».

**Q7** : délai de saisie = **date de saisie du BL − date du BL** (≤ 1 jour = bon) ? Ou date d'entrée en stock − date du BL ?

## 7. Retour fournisseur
- Vue de saisie de la réponse en **fenêtre modale** au-dessus de la liste (à votre demande, exception à la règle « pas de fenêtre »).
- Infobulles sur tous les boutons.
- 2e bouton d'action qui ne réagit pas : icône de suppression affichée **sans le droit** → masquée dans ce cas.
- Onglet **Dashboard** : produits retournés par mois, produits les plus retournés, motifs les plus utilisés.

## 8. Thème de trois écrans
- Ajout à `correctifs-affichage.js` : `LotStockManager` (liste des lots), `RuptureStockManager` (statistique ruptures), `statActiviteOperateurManager` (activité par opérateur).
- Constat : l'écran des factures fournisseurs déclare **aussi** le nom `RuptureStockManager` (conflit) → corrigé, avec test.

## 9. Ressources humaines
- Bouton **Équipes** : constituer des équipes et leur affecter un programme commun.
- **Édition PDF (jrxml)** pour chaque onglet.
- Congés et absences : jours condensés alors qu'il reste de la place → occupation de toute la largeur.
- Employés : création **uniquement à partir d'un utilisateur existant**.
- Connexions : filtre par utilisateur.
- Pointage depuis l'application mobile : voir « Réponses » ci-dessus (**Q11**).

## 10. Ventes terminées — nature « Conseil »
- **Défaut trouvé** : la nature de vente n'est enregistrée qu'à l'ajout du premier produit ; changée ensuite (Conseil), la vente reste en nature 1.
- **Correction** : enregistrer la nature choisie **à la clôture** ; test e2e : vente en Conseil, filtre Conseil la retrouve.

## 11. Analyse article
- Critères « marge élevée… » ramenés sur la première ligne, avant « Analyser ».
- « Créer inventaire » … « Imprimer » à droite, sur la ligne des onglets.
- Onglet **Suivi équivalence** déplacé dans Commandes en cours (entre Alertes et Tableau de bord).

## 12. WhatsApp Web
- Voir la procédure ci-dessus ; notice et corrections de documentation.

## 13. Rappels traitement
- Impression (PDF) et export CSV.
- Envoi **lié à un modèle SMS ou WhatsApp choisi** (aujourd'hui modèle fixe `MODELE_HABITUDE`).
- Onglet **Analyse** : nombre de rappels, envoyés, par canal, écartés, préparés (+ listes), rachetés après rappel (efficacité), évolution par mois.
- Note : « envoyé » n'est pas un statut aujourd'hui (date d'envoi) ; l'analyse le traite comme un état.

## 14. Ordonnances des clients
- Bouton d'action **« Fiche client »** dans Gestion des tiers payants › Clients, ouvrant la fiche en **fenêtre modale** ; l'onglet Fiche client reste dans Ordonnances.

## 15. Points de fidélité
- Libellé **« Points fidélité »**.
- Édition **PDF** et export **Excel** (clients, historique, analyse).
- Exclusions : interrupteur **Familles ↔ Emplacements** (l'un ou l'autre, jamais les deux), avec message d'information.
- Onglet **Analyse** : points gagnés / utilisés / expirés par mois, clients actifs, répartition par palier, taux d'utilisation, coût des points (valeur FCFA), meilleurs clients.

**Q8** : « emplacements » = **emplacement de rangement** du produit (zone géographique / rayon) ou **dépôt** ?

## 16. Gestion de caisse — onglet Analyse
- Écarts : nombre, montant, récurrence par caissier, par semaine, par mois, plus gros écarts, tendance ; pistes (horaires, jours, caissiers récurrents).
- **Constat** : deux conventions de signe coexistent (Gestion de caisse : billetage − attendu ; récap recettes : espèces − billetage).

**Q9** : règle unique **« négatif = manquant en caisse »** et alignement des écrans ?

## 17. Général
- **Majuscules à l'enregistrement** : création de BL, client à la vente, tiers payant à la vente — noms et références uniquement (pas les e-mails).
- **Fond avant le menu** et **message `unload`** : voir réponses ci-dessus.
- **Journal (fichier journal)** : ajout de **l'application** (navigateur, lu dans la requête), du **poste** et de **l'IP** pour : vente, prévente, entrée en stock, ajustement, retour fournisseur, saisie de périmés, création et suppression de facture.
  - Nom du poste : non lisible depuis un navigateur ; **proposition** : saisi une fois par poste (mémorisé sur ce poste), repli sur le nom réseau.
- **Évolution proposée du journal** : filtres (utilisateur, poste, type, période, mot-clé) ; colonnes Poste / IP / Application ; détail avant / après des modifications ; alertes (annulations en série, opérations hors horaires) ; export ; durée de conservation paramétrable.

**Q10** : tout le lot journal, ou d'abord la traçabilité poste / IP / application ?

---

## Ordre de réalisation proposé

| Lot | Contenu | Dépend de |
|---|---|---|
| 1 — Défauts | ventes terminées « Conseil », en-cours en direct, filtres du Risque de rupture, bouton PharmaML mal placé, fond blanc des colonnes, recherche DCI lente, date de dernière entrée | Q2 |
| 2 — Retouches d'écran | libellés, centrage, couleurs, thème des 3 écrans, nombre de lignes, majuscules, `unload` | — |
| 3 — Prévisions complètes | points 2, 3, 4 | Q3, Q4, Q12 |
| 4 — Achats | contrôle des achats, pointage BL | Q7 |
| 5 — Modules existants | retour fournisseur, rappels, fidélité, ordonnances, analyse article, fiche article | Q1, Q8 |
| 6 — Nouveaux | analyse de caisse, étiquettes 2D, RH, journal | Q5, Q6, Q9, Q10, Q11 |

## Méthode de test (aucune régression)
1. Chaque défaut est d'abord **reproduit par un test qui échoue**, puis corrigé.
2. Chaque calcul a son **test unitaire** ; chaque écran son **test e2e** qui passe par l'écran et retire ses données.
3. Avant chaque commit : **toute** la suite — tests unitaires (1 254 aujourd'hui), tests e2e du banc, test de style (232 contrôles), test de saisie.
4. Résultats donnés à chaque étape.

## Réponses du 10/10 (décisions)
| N° | Décision |
|---|---|
| Q1 | 90 jours glissants |
| Q2 | oui : Dern. entrée = date de mise en stock, date du BL à côté |
| Q3 | toutes les pages du résultat affiché (liste filtrée) |
| Q4 | « Appliquer le recommandé » sur la suggestion **ou** la commande en cours choisie ; ligne recommandée à 0 = **supprimée** (aucune suggestion avec quantité 0) |
| Q5 | GS1 |
| Q6 | lecture du code à la vente **faite**, derrière un paramètre 0/1 (défaut 0) ; testée active et inactive, sans régression |
| Q7 | délai de saisie = date d'entrée (saisie) − date du BL du grossiste ; > seuil = mauvais, ≤ seuil = bon ; seuil paramétrable (défaut 1 jour) |
| Q8 | emplacement de rangement / zone géographique / rayon |
| Q9 | oui (négatif = manquant), sans régression |
| Q10 | tout le lot journal |
| Q11 | **en attente** |
| Q12 | **en attente** |

Ajouts : point 7 — dashboard retours avec analyse complète (produits les plus retournés, etc.) ; point 14 — bouton « Fiche client » **aussi à la vente** quand un client est choisi (standard, carnet ou assurance).

## Récapitulatif des questions
| N° | Question | Ma proposition |
|---|---|---|
| Q1 | Moyennes : 90 jours glissants ou 3 mois complets ? | 90 jours glissants |
| Q2 | Dern. entrée = date de mise en stock, date du BL à côté ? | oui |
| Q3 | Suggestion générée : toute la liste filtrée ou la page ? | toute la liste filtrée |
| Q4 | « Appliquer le recommandé » : suggestions seules ? ligne à 0 ? | suggestions seules ; ligne supprimée |
| Q5 | Codification GS1 pour QR / DataMatrix ? | oui |
| Q6 | Lecture du code à la vente dans ce lot ? | impression d'abord, lecture ensuite |
| Q7 | Délai de saisie BL = date de saisie − date du BL ? | oui |
| Q8 | « Emplacements » = rangement (rayon) ou dépôt ? | rangement |
| Q9 | Signe des écarts : négatif = manquant ? | oui |
| Q10 | Journal : tout ou poste / IP d'abord ? | poste / IP d'abord |
| Q11 | Application mobile : pointage de présence (écran à ajouter dans l'app), contrôle des BL (à exploiter dans Prestige), ou les deux ? | les deux ; présence avec QR de la pharmacie + GPS |
| Q12 | Couleurs : vert = ajouté, rouge doux = retranché ? | oui |
