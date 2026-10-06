# Plan détaillé des évolutions (octobre 2026)

> **Version 2 — 06/10 : intègre vos réponses** (décisions marquées « Décision du 06/10 »).
>
> Document d'échange **avant code**. Il reformule chaque besoin, décrit ce qui existe déjà dans Prestige, propose une
> conception, liste les risques de régression et pose les questions à trancher. Rien n'est développé tant que les
> questions marquées **[Q]** n'ont pas de réponse.
>
> Les fichiers fournis (exemples XML, spécification PharmaML V5, note sur l'analyse des équivalents) servent
> uniquement d'**orientation**. Aucun nom de logiciel tiers n'apparaîtra dans le code, les messages ou les écrans
> produits (identifiant de logiciel émetteur : `Prestige`).

---

## 0. Principes communs (valables pour tous les lots)

### 0.1 Zéro régression

| Règle | Application |
|---|---|
| Ajouter, ne pas remplacer | Nouvelles colonnes nullable, nouvelles tables, nouveaux endpoints. Les anciens écrans et JSP restent en place tant que le remplaçant n'est pas validé. |
| Comparer avant / après | Pour tout passage JSP → REST ou toute réécriture : test qui interroge l'ancien et le nouveau chemin et compare les réponses (déjà pratiqué pour le mouchard, les factures subrogatoires, les articles vendus). |
| Lecture seule par défaut | Les analyses (DCI, disponibilité, prédictif) ne modifient rien. Toute action d'écriture passe par une confirmation explicite et réutilise les services existants (suppression de ligne, statut, etc.). |
| Interrupteurs | Les fonctions sensibles sont désactivables par paramètre (`t_parameters`) : analyse DCI à l'ouverture, interrogation PharmaML, WhatsApp, pointage mobile. |
| Migrations rejouables | Flyway `V6.9.73__…` et suivantes : `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, privilèges créés par nom (`LEFT(UUID(),40)` + `NOT EXISTS`), attribution systématique au rôle de `admin` (modèle `V6.9.51`). |
| Droits | Chaque nouvel écran = un sous-menu + un privilège. Chaque endpoint revérifie le privilège côté serveur (`CommonUtils.hasAuthorityByName`). |
| Tests | Tests unitaires JUnit 5 sur le calcul pur, test e2e Playwright sur le vrai parcours écran avec jeu d'essai retiré à la fin, jamais sur la base de production. |
| Design | Nouveaux écrans au thème commun (style Vente, couleurs douces, icônes au trait). Impressions en PDF dans un onglet (inline), jamais de fenêtre surgissante d'édition. |

### 0.2 Organisation du code (convention demandée)

```
commonTasks/dto/          → DTO échangés (ex. EquivalentDciDTO, DisponibiliteProduitDTO)
rest/XxxRessource.java    → endpoints @Path("v1/...")  (contrôle de session et de privilège)
rest/service/XxxService.java          → interface @Local
rest/service/impl/XxxServiceImpl.java → implémentation @Stateless (JTA_UNIT)
rest/service/impl/<Calcul>.java       → logique pure testable sans base (comme SubstitutionArticle, AnalyseArticle)
src/main/webapp/general/app/view/<module>/...   → écrans ExtJS
src/main/resources/db/migration/V6.9.7x__...sql → schéma, menus, privilèges, paramètres
```

### 0.3 Socle transversal à créer une seule fois

- **Préférences utilisateur** : il n'existe aucune table de préférences en base (seul `localStorage`, effacé à chaque
  déconnexion par `Header.js`). Nouvelle table `t_preference_utilisateur (lg_USER_ID, str_CLE, txt_VALEUR JSON,
  dt_UPDATED)` + `v1/preferences/{cle}` (GET/PUT). Servira à la cloche (§7), au tableau de bord (§8), aux colonnes
  choisies.
- **Stockage de fichiers** : réutiliser `util/StockageDisque` et le modèle des pièces d'ordonnance
  (`OrdonnancePieces` : liste blanche, taille maxi, chemin relatif en base, fichier sur disque). Corriger au passage
  le contrôle de taille **avant** écriture.
- **Authentification des terminaux mobiles** (reporté en dernier, décision du 06/10) : aujourd'hui les en-têtes
  `X-User-Info` / `X-Token-Exp` ne sont ni signés ni vérifiés, et plusieurs chemins d'inventaire mobile sont ouverts
  sans authentification. **Aucune régression et aucune mise à jour des applications mobiles existantes** : ces
  chemins et ce mode d'authentification ne sont **pas modifiés**. Seuls les **nouveaux** endpoints mobiles (pointage,
  photos produit) exigeront un jeton signé (HMAC, durée de vie courte, révocable). Si l'on décide plus tard de
  fermer les failles existantes, ce sera un chantier à part, avec une période de compatibilité où l'ancien et le
  nouveau mode fonctionnent ensemble, le temps de mettre l'application mobile à jour.

---

## 1. SUGGESTION

### 1.1 Analyse des équivalents DCI

**Ce que j'ai compris.** Pour une suggestion ouverte, repérer chaque produit suggéré pour lequel un ou plusieurs autres
produits de **même DCI** sont **déjà en stock** et peuvent être vendus ou conseillés à la place, afin de ne pas
commander inutilement (surstock) et d'écouler l'existant.

**Existant réutilisable.**
- `SubstitutionService.substituts(familleId, emplacementId)` : même **ensemble exact** de DCI (liens actifs ou
  anciens liens sans statut), stock de l'emplacement, prix. Utilisé aujourd'hui par les ordonnances et Posos.
- `SubstitutionArticle` : dosage et forme lus dans le libellé, verdict **direct** / **à adapter**, exclusion d'une
  autre voie d'administration, alerte marge thérapeutique étroite. Testé (`SubstitutionArticleTest`).
- Aucun bouton ni endpoint d'analyse DCI dans les suggestions aujourd'hui.

**Décision du 06/10 : rien à l'ouverture.** L'analyse ne se lance **que par un bouton** « Équivalents DCI » de
l'écran de la suggestion, et s'affiche dans une **fenêtre modale**. L'ouverture de la suggestion n'est pas alourdie.

**Plusieurs substituts pour un même produit : tous affichés, aucun choisi à la place du pharmacien.**
La fenêtre est organisée **par produit suggéré** : une ligne « produit suggéré » à gauche, et à droite **la liste de
tous ses substituts en stock**, un par sous-ligne, dans cet ordre :
1. équivalents **directs** (même DCI, même dosage, même forme) avant les « à adapter » ;
2. puis le plus de stock ;
3. puis la vente la plus récente (le produit qui « tourne » encore) ;
4. puis le prix de vente le plus bas.

| Produit suggéré (gauche) | Substituts en stock (droite, N sous-lignes) |
|---|---|
| CIP, libellé, DCI | CIP, libellé, niveau (direct / à adapter + raison) |
| stock | stock |
| prix de vente | prix de vente |
| dernière entrée : date (quantité) | dernière entrée : date (quantité) |
| dernière vente : date (quantité) | dernière vente : date (quantité) |
| quantité suggérée | — |
| **quantité couverte** = min(qté suggérée, **somme** des stocks des substituts **directs**) | |

- Les substituts « à adapter » sont **affichés** (information) mais **ne comptent jamais** dans la quantité couverte.
- Tuiles en tête : produits concernés, unités couvertes, **valeur couverte au prix d'achat et au prix de vente**,
  valeur de la suggestion avant / après.
- Filtres : direct seulement / à adapter, produit. **Imprimer** : PDF dans un onglet.

**Colonne marqueur dans la grille de la suggestion** : pastille « ≡ DCI » sur les lignes qui ont au moins un
substitut valide ; au clic, la même présentation limitée à **cette** ligne. **Décision Q-A : le marqueur n'apparaît
qu'après un clic sur « Équivalents DCI »** (rien n'est calculé à l'ouverture).

**Endpoint** `GET v1/suggestion/{id}/equivalents-dci` (lecture seule, emplacement lu dans la session, une seule
requête SQL pour toutes les lignes, puis classement Java).

**Action « Retirer les produits couverts » (dans la fenêtre)** — décision du 06/10 :
- **Quantité suggérée = quantité couverte** (ex. 6 commandés, 6 en substituts directs) : la ligne est **retirée**
  de la suggestion avec le motif `SUPPRESSION_EQUIVALENCE_DCI` (voir §1.4, elle reste récupérable).
- **Quantité suggérée > quantité couverte** (ex. 10 commandés, substituts = 6) : l'utilisateur est **averti**
  (« vous voulez commander 10, les substituts couvrent 6 ») et choisit pour la ligne :
  - **Garder** la ligne telle quelle ;
  - **Retirer et créer un reliquat** : la ligne est retirée (motif DCI) et une **nouvelle suggestion** est créée
    (même grossiste, statut manuel, commentaire `Reliquat substitution — <réf. d'origine>`) avec la quantité
    restante (4). Toutes les lignes en reliquat d'une même action vont dans **une seule** suggestion de reliquat.
- Récapitulatif avant validation, confirmation, journal de l'opération.

**Garde-fous.** Dosage / forme lus dans le libellé (aucun champ en base) : les cas douteux restent « à adapter ». Un
produit sans DCI n'est jamais rapproché. Rappel visible : « aide à la décision, vérifier prescription, dosage,
forme, contre-indications ».

### 1.2 Disponibilité produit (PharmaML) — suggestion et commande

**Ce que j'ai compris.** Une colonne **boule verte** (disponible) / **rouge** (indisponible) obtenue par PharmaML
**sans passer ni valider de commande**, filtrable et imprimable.

**Existant.**
- Envoi de commande PharmaML (`PharmaMlServiceImpl`, protocole `1.0.0.0`, enveloppe `CSRP`, POST HTTP synchrone vers
  `t_grossiste.str_URL_PHARMAML`, archives XML). La méthode « infos produit » est un **stub qui renvoie null**.
- La spécification (§3.1.3 / §3.2.3) prévoit **REQ_INFO_PRODUIT** (« ne constitue en aucun cas une pré-commande, ni
  une pré-réservation »), **50 lignes maximum** par requête ; réponse par ligne : `Disponibilité = Oui / Non / Autre`,
  code + libellé, date et quantité de mise à disposition, produit de remplacement / équivalent, prix.
- Codes article par grossiste : `t_famille_grossiste.str_CODE_ARTICLE`.

**Décision du 06/10 : versions 1.0.0.0 et 3.0.0.0 gérées, 3.0.0.0 par défaut sur chaque grossiste.**
- Nouvelle colonne `t_grossiste.str_PHARMAML_VERSION` (`3.0.0.0` par défaut), modifiable dans la fiche grossiste.
- Construction des messages en **V3** (enveloppe `SRP_ENVELOPPE`, namespaces `urn:x-srp:…`, attributs
  `Id_Officine` / `Id_Repartiteur`, `Usage`, `Id_Moteur = Prestige`) **et** en V1 (existant).
- ⚠️ **Point de vigilance** : aujourd'hui l'**envoi des commandes** fonctionne en 1.0.0.0. Passer tous les
  grossistes en 3.0.0.0 changerait aussi l'envoi des commandes, ce qui pourrait casser un envoi qui marche. Je
  propose **deux réglages** par grossiste (information produit / envoi de commande). **Décision Q-B : les deux en
  3.0.0.0 par défaut** ; le réglage permet de revenir en 1.0.0.0 grossiste par grossiste si un test échoue.
- Vous testez après livraison : chaque échange est archivé (fichiers XML envoyés / reçus) pour l'analyse.

**Boutons (suggestion ouverte et commande ouverte).**
1. **« Vérifier la disponibilité »** : tous les produits, chez le grossiste de la suggestion / commande.
2. **« Revérifier les indisponibles »** : seulement les produits marqués non disponibles ; **demande chez quel
   grossiste** vérifier ; l'interrogation utilise le **code article de ce produit chez le grossiste choisi** s'il
   existe (`t_famille_grossiste`), sinon EAN13 / CIP.

**Fonctionnement.**
- `DisponibiliteService` : paquets de 50, envoi `REQ_INFO_PRODUIT`, lecture de la réponse, enregistrement.
- Table `t_disponibilite_produit` (grossiste, produit, date, statut `OUI/NON/AUTRE/INCONNU`, code / libellé réponse,
  date et quantité de mise à disposition, produit de remplacement, prix, référence de requête) : **cache** (durée
  paramétrable) + historique.
- **Tâche de fond** avec progression (une suggestion de 1 500 lignes = 30 requêtes) ; l'écran reste utilisable.
- Colonne « Dispo » : vert = oui, rouge = non (infobulle : motif, date de retour, remplaçant), orange = autre,
  gris = non vérifié / pas de réponse. Filtre par couleur, impression PDF (onglet).
- **Jamais** de message `COMMANDE` dans ce parcours ; test automatique qui le garantit.

### 1.3 Statuts de suggestion

**Existant.** `auto` (alimentée automatiquement), `is_Process` (manuelle), `pending` posé **dès l'ouverture** et
affiché « CLOTURE », `enable` (« COMMANDEE ») jamais visible ; transformer en commande **supprime** la suggestion.

**Décisions du 06/10.**

| Statut (valeur en base) | Libellé | Quand |
|---|---|---|
| `auto` | Auto | inchangé |
| `is_Process` | Manuelle | inchangé |
| `pending` | **En cours** (au lieu de « CLOTURE ») | à l'ouverture, comme aujourd'hui (même valeur, même effet : la suggestion n'est plus alimentée automatiquement) |
| `cloturee` (nouveau) | **Clôturée** | quand l'utilisateur valide la quantité du **dernier produit** et répond au message « Dernier produit de la suggestion traité » (déjà présent dans `SuggerercdeManager.js`) |
| `commandee` (nouveau) | **Commandée** | (a) après clôture, à la question **« Voulez-vous générer le fichier CSV ? »** → Oui = CSV généré + statut Commandée ; (b) par l'action manuelle « Marquer comme commandée » ; (c) après un envoi PharmaML réussi (§1.5) |

- Colonnes ajoutées : `dt_CLOTURE`, `dt_COMMANDEE`, `lg_USER_COMMANDE_ID`, `str_MODE_COMMANDE` (`CSV`, `PHARMAML`,
  `MANUEL`), `lg_ORDER_ID` (commande créée, le cas échéant).
- Filtre de statut dans la liste ; « Commandée » visible avec sa date et son mode : c'est **la preuve** que la
  commande a été passée.

### 1.4 Produits retirés d'une suggestion (récupérables)

**Problème.** Sur une suggestion auto, un produit retiré ne revient qu'à la prochaine vente.

**Proposition.**
- Table `t_suggestion_ligne_retiree` : suggestion, produit, quantité, prix d'achat / vente, **motif**
  (`SUPPRESSION_USER` ou `SUPPRESSION_EQUIVALENCE_DCI`), utilisateur, date, suggestion de reliquat éventuelle.
- Toute suppression de ligne (bouton supprimer, nettoyage, retrait DCI) y est enregistrée **avant** suppression,
  dans la même transaction (aucune perte possible).
- Bouton **« Produits retirés »** dans la suggestion : liste avec motif, date, utilisateur ; cases à cocher +
  **« Ramener dans la suggestion »** (avec la quantité d'origine, modifiable). Un produit déjà présent n'est pas
  dupliqué (sa quantité est proposée en ajout).

### 1.5 Commander une suggestion par PharmaML depuis la liste

**Demande.** Sur chaque ligne de suggestion, le bouton d'envoi PharmaML, comme sur les commandes en cours.

**Proposition.** Action de ligne **« Commander par PharmaML »** :
1. confirmation (grossiste, nombre de lignes, valeur) ;
2. transformation en commande par le **service existant** (`transform-order`) ;
3. envoi PharmaML par le **service existant** ;
4. la suggestion est **conservée** au statut **Commandée** (mode `PHARMAML`, référence de la commande) au lieu d'être
   supprimée.

⚠️ Aujourd'hui, transformer une suggestion en commande la **supprime**. Garder une trace (statut « Commandée »)
implique de ne plus la supprimer. Je propose de la garder **uniquement** pour cette nouvelle action et pour le
statut Commandée, et de laisser le bouton « Commander » actuel inchangé. **Décision Q-C : oui, conservée « Commandée ».**

### 1.6 Écran de traitement de la suggestion

- **Colonne Colisage** dans la grille de traitement (voir §6).
- **Sortie des JSP** (décision du 06/10 : « on ne supprime pas les JSP, mais on n'y passe plus ») : les appels
  encore faits depuis la suggestion passent en REST, avec test de comparaison :
  - création (`ws_transaction.jsp?mode=create`) → endpoint REST existant ou nouveau ;
  - PDF (`ws_generate_pdf.jsp`) → PDF REST dans un onglet ;
  - fiche article ouverte depuis la suggestion (`add2.js`, `detailArticleOther.js` → `ws_transaction.jsp`) →
    `v1/fichearticle` ;
  - écrans DCI (`dcimanager`, association DCI de la fiche) → REST.
  Les JSP restent sur le serveur, plus aucun écran ne les appelle.

---

## 2. ANALYSE DE COMMANDE

- Même fonctionnalité de **disponibilité** (§1.2) sur une commande (`i_order_manager` et son détail) : colonne
  boule verte / rouge, filtre, impression, boutons « Vérifier la disponibilité » et « Revérifier les indisponibles »
  (choix du grossiste, code article du grossiste choisi).
- Même **analyse des équivalents DCI** (§1.1) par bouton et fenêtre modale.
- **Colonne Colisage** dans le détail.
- Même service, même cache : une commande et une suggestion du même grossiste partagent les résultats récents.
- Le statut `pharma` (prévu dans la liste des commandes) n'est jamais posé aujourd'hui ; à corriger après l'envoi
  PharmaML réussi. **Décision Q-D : on le garde tel quel** (aucun changement de statut ; seul l'affichage du succès
  avec l'icône d'erreur est corrigé).
- Sortie des JSP : l'import de la réponse grossiste (`importOrder.js` → `ws_transaction.jsp?mode=importfile`) passe
  en REST.

---

## 3. RESSOURCES HUMAINES : pointage, congés, repos, connexions

**Existant.** Aucune notion RH (employé, matricule, badge, pointage, congé, repos). L'utilisateur (`t_user`) a la
date de dernière connexion, un compteur, `b_is_connected`. Le journal `t_event_log` enregistre connexions et
déconnexions explicites, mais : sessions sans expiration (`session-timeout = -1`), aucune trace quand on ferme le
navigateur, `dt_LAST_ACTIVITY` jamais mis à jour. L'import de fichiers clients (`FichierTabulaire`, mapping de
colonnes) est réutilisable ; aucun modèle d'import n'est mémorisé.

**Tables (nouvelles, liées à `t_user`).**

| Table | Contenu |
|---|---|
| `t_employe` | id, **matricule unique**, **badge unique**, nom, prénoms, poste, date d'entrée / sortie, statut, `lg_USER_ID` **facultatif et unique** (un employé peut ne pas utiliser le logiciel) |
| `t_planning` | **planning par semaine** (décision du 06/10) : employé, date, début, fin, pause, type (`TRAVAIL`, `GARDE`, `REPOS`) ; copie d'une semaine type ou de la semaine précédente en un clic ; base de calcul des retards et heures supplémentaires |
| `t_absence` | employé, type (`CONGE`, `REPOS`, `MALADIE`, `AUTRE`), début, fin, demi-journée, motif, statut (`DEMANDE`, `VALIDE`, `REFUSE`), validé par |
| `t_pointage` | employé, horodatage, sens (`ENTREE`/`SORTIE`/`INCONNU`), source (`MOBILE`/`POINTEUSE`/`MANUEL`), terminal, lot d'import, saisi par, motif (si manuel), géolocalisation facultative |
| `t_pointage_lot` | historique des imports : fichier, marque, nombre de lignes lues / retenues / rejetées, rapport |
| `t_pointage_modele` | modèle d'import réutilisable **par marque de pointeuse** : séparateur, format de date, colonnes (badge, date, heure, sens) — configuré une seule fois |
| `t_session_utilisateur` | connexion / déconnexion appariées : utilisateur, début, fin, fin par (`DECONNEXION`, `INACTIVITE`, `FERMETURE`), poste, adresse IP |

**Connexions / déconnexions.** Écriture d'une ligne à la connexion, clôture à la déconnexion ; pour les fermetures de
navigateur : battement léger (`dt_LAST_ACTIVITY`) et clôture automatique après N minutes d'inactivité par une tâche
planifiée. **Sans changer** la durée de session actuelle (pas de déconnexion forcée des caisses). **Décision Q-E :
pas de clôture par inactivité** ; une session se termine à la déconnexion ou à l'expiration actuelle de la session.

**Pointage.**
- **Mobile** (décision du 06/10 : **en dernier**, une application mobile existe déjà, on y reviendra) : endpoint
  `POST v1/rh/pointages` avec jeton signé (§0.3).
- **Pointeuse** : import CSV / Excel avec modèle par marque ; aperçu, contrôle, puis enregistrement (trois étapes,
  comme l'import de clients).
- **Manuel** : saisie par un responsable, motif obligatoire, tracée.

**Détection des incohérences** (calcul pur, testé) : deux entrées successives, sortie sans entrée, doublons à
quelques minutes d'écart, journée anormalement longue (seuil paramétrable), pointage pendant un congé.

**Écran RH** (nouveau menu « Ressources humaines ») :
1. **Planning de la semaine** (saisie, copie de semaine) et **calendrier** congés / repos (mois, par employé,
   couleurs par type).
2. **Feuille de présence journalière** (entrée, sortie, durée, anomalies).
3. **Tableau** retards, absences, heures supplémentaires (période, employé), export Excel / PDF.
4. Fiches employés, modèles d'import, historique des lots.

---

## 4. SMS ET WHATSAPP

**Existant.** SMS complet : fournisseurs (Orange, LeTexto), fournisseur « en vigueur », accusés de réception, renvoi,
modèles de message, consentement `bool_CONSENT_SMS`. **Le rappel de renouvellement d'ordonnance existe déjà par SMS**
(job quotidien, modèle, consentement). WhatsApp : seulement la génération de liens `wa.me` (envoi manuel).

### 4.1 Rappels aux patients chroniques

- Étendre le rappel existant :
  - **Qui** (décision du 06/10) : patients ayant une ordonnance renouvelable, **et** patients dont les **achats
    répétés** montrent une **habitude** : le suivi de consommation calcule, par produit, la **fréquence d'achat**
    (mensuelle, bimensuelle, trimestrielle…) et la régularité ; seuls les produits réellement réguliers sont
    retenus (au moins 3 achats, écart entre achats stable).
  - **Quand** : N jours avant la date estimée du prochain achat (dernier achat + fréquence observée), ou avant la
    fin de l'ordonnance.
  - **Quoi** : **paramètre sur la fiche client** « Afficher les médicaments dans les messages » — **coché par
    défaut** (décision du 06/10). Coché : le message cite les médicaments à renouveler ; décoché : message neutre
    (« Votre traitement habituel est à renouveler »). Aucune autre donnée de santé.
  - **Préparation des piluliers en amont** : liste du jour « à préparer » (cloche + écran) pour l'équipe.
- Consentement séparé SMS / WhatsApp, journal des envois, désinscription.

### 4.2 WhatsApp (deux modes paramétrables, sur le modèle d'ubisenderpro)

| Mode | Principe | Usage |
|---|---|---|
| **API officielle** (WhatsApp Cloud API de Meta) | identifiant du numéro, identifiant WABA, jeton d'accès, jeton de vérification du webhook ; **modèles approuvés** obligatoires hors fenêtre de 24 h ; webhook pour les statuts | production, conforme |
| **WhatsApp Web** | service compagnon (Node) joint par URL + jeton partagé, connexion par QR code, sessions persistées ; **débit lent** (risque de bannissement du numéro) | tests, faibles volumes |

- Intégration comme un **nouveau canal** à côté du SMS : `Canal.WHATSAPP` (et `SMS_WHATSAPP` pour un repli
  automatique SMS si WhatsApp échoue), table `whatsapp_compte` (mode, paramètres), mêmes notifications / statuts /
  renvois que le SMS. Le fonctionnement SMS actuel n'est pas modifié.
- Secrets (jetons) : stockés côté serveur, jamais renvoyés au navigateur ni écrits dans les journaux.
- **Décision du 06/10** : compte Meta Business disponible ; **API officielle par défaut**, avec un **paramètre**
  `KEY_WHATSAPP_MODE_DEFAUT` (`API` / `WEB`) pour changer la valeur par défaut.
- Ce lot livre : configuration des deux modes, envoi, statuts (webhook), modèles, mode test sans appel réel.

---

## 5. Nouveau menu « Analyse Suggestion / Commande » (GESTION DES COMMANDES)

**Objectif.** Aider à commander juste : moins d'invendus (surtout parapharmacie), moins de ruptures.

**Contenu proposé (par étapes, calculs précalculés la nuit comme le pilotage).**
1. **Prévision par produit** : historique des ventes par semaine / mois ; méthodes simples et explicables :
   moyenne mobile, **saisonnalité** (même période des années précédentes), **tendance** (lissage exponentiel de
   Holt-Winters). Choix automatique de la méthode la plus juste sur l'historique (erreur mesurée, ex. MAPE) et
   affichage de cette fiabilité.
2. **Quantité recommandée** = prévision sur le délai de livraison + couverture + **stock de sécurité** (selon la
   variabilité des ventes) − stock (rayon + réserve) − commandes en cours − équivalents DCI directs en stock.
3. **Analyse d'une suggestion / commande** : pour chaque ligne, quantité proposée vs recommandée, écart, et
   **alertes** : quantité aberrante vs historique, produit déjà en surstock, équivalent DCI en stock (§1.1), produit
   indisponible chez le grossiste (§1.2), prix d'achat anormal vs derniers achats, produit à rotation lente.
4. **Tableau de bord** : taux de rupture, valeur des invendus, couverture moyenne, fiabilité des prévisions.

« Aide à la décision clinique » : je propose de limiter ce lot à la **décision de stock**. Les alertes cliniques
(interactions, contre-indications) relèvent de l'analyse d'ordonnance déjà branchée sur Posos. **[Q14]**

---

## 6. FICHE ARTICLE

| Besoin | Existant | Proposition |
|---|---|---|
| 2e code géo `str_CODE_GEO_ARTICLE_RESERVE` | `str_CODE_GEO_ARTICLE` (V6.1.7) ; la réserve n'a **aucune localisation** | nouvelle colonne VARCHAR(50) sur `t_famille`, saisie en modification (bloc Gestion / réserve), affichée en détail |
| Liste des produits par code géo, Excel + impression | rien de dédié | écran « Produits par code géo » : filtres code géo rayon / réserve / zone, export Excel, PDF dans un onglet |
| Colisage | **aucun champ** (`int_T` = code tableau, pas un colisage) | nouvelle colonne `int_COLISAGE` (nullable), saisie et affichée, **rappelée en colonne dans la grille de traitement de la suggestion et dans le détail de la commande** (décision du 06/10) ; **décision Q-F : informatif**, arrondi au colis plus tard avec les données grossiste |
| Images | **aucune** | voir ci-dessous |

**Images produit.**
- **Base** : table `t_famille_image` (id, produit, chemin relatif, type, taille, largeur / hauteur, principale, ordre,
  date, utilisateur). **Les fichiers sur disque, pas en base** (évite d'alourdir la base et les sauvegardes ;
  chemin `images-produits/AA/MM/<uuid>.<ext>` sous la racine `StockageDisque`), avec **vignette** générée à
  l'enregistrement (affichage rapide des listes).
- **API** : `GET/POST v1/produits/{id}/images`, `PUT …/images/{imageId}` (principale, ordre), `DELETE
  …/images/{imageId}`, `GET …/images/{imageId}/fichier?taille=vignette|normale`. Utilisable par un **téléphone
  Android** (photo directe) avec le jeton du §0.3.
- **Écrans** : en **détail**, l'image s'affiche sous le bloc stock ; en **modification**, 4e colonne après
  « Gestion » : image si elle existe (bouton **Modifier**), sinon cadre vide avec bouton **Ajouter**.
- Contrôles : jpg / png / webp, taille maxi vérifiée **avant** écriture, droit dédié.

**Point d'attention.** L'enregistrement de la fiche passe par `v1/fichearticle/enregistrer` (signatures longues),
le code géo par un second appel `update-lite-info`, et l'ancienne JSP `ws_transaction.jsp` sert encore à d'autres
écrans (édition depuis la suggestion ou la commande). Les nouveaux champs passeront par le second appel pour ne pas
toucher la signature existante. **Décision du 06/10 : plus de JSP** — les écrans de fiche article encore branchés sur
`ws_transaction.jsp` (`add2.js`, `updatezonegeo.js`, `infogenerale.js`, `comptabilite.js`, `autreinfos.js`,
`detailArticleOther.js`) passent sur les API REST, avec test de comparaison des données enregistrées ; les JSP
restent sur le serveur, sans appelant.

---

## 7. Centre de notifications (cloche)

**Existant.** Trois catégories codées en dur dans `Header.js` : suggestions de réserve à traiter, péremptions proches
(6 mois), ventes en avoir ; plus le panier « ventes ratées » à côté. Rafraîchissement par paramètre global
(`KEY_NOTIFICATION_REFRESH_SECONDS`).

| Catégorie existante | API liste | API compteur |
|---|---|---|
| Suggestions de réserve | `GET v1/suggestion-reserve/en-attente` | `…/en-attente/count` |
| Péremptions proches | `GET v1/fichearticle/perimes?nbreMois=6` | `…/perimes/count` |
| Ventes en avoir | `GET v1/ventestats?onlyAvoir=true…` | aucun (liste lourde à chaque rafraîchissement → à corriger) |
| Ventes ratées (panier) | — | `GET v1/ventes-ratees/compteur-jour` |

**Proposition.**
- **Catalogue** côté serveur `GET v1/notifications-centre/catalogue` : liste des catégories disponibles **selon les
  droits** de l'utilisateur, plus de nouvelles catégories possibles : renouvellements à préparer, suggestions
  commandées non reçues, produits indisponibles (PharmaML), congés à valider, anomalies de pointage, commandes non
  reçues.
- **Choix et ordre par le pharmacien** (glisser-déposer, cases à cocher), mémorisés dans les préférences
  utilisateur (§0.3).
- **Compteur agrégé** `GET v1/notifications-centre/compteurs` (une seule requête au lieu d'une par catégorie).

---

## 8. Tableau de bord

**Existant.** Page `dashboard.html` (jQuery + SVG maison) dans un **iframe**. L'iframe a été choisi pour retarder ses
~9 requêtes après le chargement du menu (sinon saturation du navigateur et du pool de connexions). Tout est figé sur
« aujourd'hui » / année en cours ; cache serveur commun ; grossistes en dur. Le menu **Pilotage** possède déjà des
briques ExtJS réutilisables (barre de période, tuiles, graphiques, tables) et des agrégats précalculés.

**Proposition.**
1. **Sélecteur d'année** pour « Évolution du Net TTC » : année en cours, N-1, N-2 (ex. 2026, 2025, 2024 —
   maximum deux ans en arrière), avec comparaison facultative à l'année précédente.
2. **Nouveau tableau de bord ExtJS** (sans iframe) construit avec les briques du Pilotage et ses agrégats :
   - sections et KPI **au choix**, **ordre par glisser-déposer**, mémorisés par utilisateur ;
   - chargement progressif (une section après l'autre) pour garder l'avantage de l'iframe sans ses défauts ;
   - nouveaux KPI possibles : marge, panier moyen, taux de rupture, valeur des invendus, couverture de stock,
     créances tiers payants, avoirs en cours, ventes ratées, renouvellements à venir.
   - **Décision du 06/10** : paramètre `KEY_TABLEAU_BORD_VERSION` (`NOUVEAU` / `ANCIEN`) pour basculer à tout
     moment ; l'ancien reste intact.
3. **Présentations** : trois maquettes HTML livrées le 06/10 (`maquettes/tableau-de-bord-*.html`).
   **Choix du 06/10 : proposition 1 (grille)**, avec les améliorations ci-dessous →
   `maquettes/tableau-de-bord-1-v2.html`.

### 8.1 Contenu retenu (proposition 1, version 2)

**Tuiles du haut**
- CA net du jour (+ nombre de clients, évolution vs J-7), marge nette, panier moyen, ruptures.
- **Achats du jour** (remplace « valeur du stock ») : **HT + TVA = TTC** et **nombre de BL**, comme l'existant.
  Interrupteur **« saisie / date BL »** affiché sur la tuile :
  - *saisie* (défaut, = existant) : `t_bon_livraison.dt_UPDATED`, date d'entrée en stock ;
  - *date BL* : `dt_DATE_LIVRAISON`, date portée sur le BL du grossiste.

**Cartes**
| Carte | Contenu | Clic |
|---|---|---|
| Évolution du CA (2/3 de largeur) | sélecteur 2026 / 2025 / 2024, comparaison N-1 (même période), **pastilles d'évolution mensuelle conservées**, valeurs écrites sur chaque point, **axes et libellés en gras** | — |
| Valorisation du stock (1/3, à droite de la courbe) | achat / vente **rayon**, **réserve**, total, **part de chacun dans le stock** (décision Q-H) ; barre de répartition ; **produits entrés il y a plus d'un mois et jamais vendus depuis** (nombre + valeur) | liste |
| Encaissements du jour | **camembert** + tableau ; **Mobile money dépliable** : chaque opérateur avec sa part dans le mobile money (opérateurs lus dans les modes de règlement actifs, paramètre de la liste des types « mobile money » ; aujourd'hui Orange, Wave, MTN, Moov, Djamo) | — |
| Mouvements de caisse du jour | reprise de la carte existante (entrées vert, sorties rouge) + solde | écran mouvements de caisse |
| Alertes | rupture, péremption, **suggestion de réserve**, **suggestion de rayon**, **suggestion de commande** (renommée), renouvellements, avoirs. **Périodes réglables** (⚙), valeurs actuelles par défaut (péremption 6 mois…), mémorisées par utilisateur | **ouvre le menu lié** |
| Top 5 des ventes du mois | interrupteur **CA / quantité**, **marge et taux de marge par produit** | — |
| Achats par grossiste | grossistes lus en base (plus de noms en dur) + **« Voir plus »** | fenêtre liste |
| Top 5 du CA / Top 5 des quantités | reprises de l'existant + « Voir plus » | fenêtre liste |
| TVA | 0 %, 9 %, 18 % : HT, TVA, TTC, mêmes chiffres que « Statistique par TVA » | menu Statistique par TVA |
| Top 5 du CA par emplacement (rayon) | 5 emplacements les plus importants + « Voir plus » | fenêtre liste |
| Encours tiers payants | reprise de l'existant + « Voir plus » | fenêtre liste |

« Voir plus » ouvre une **fenêtre d'affichage** (pas d'impression en pop-up).

### 8.2 Remettre un élément retiré
Bouton **Personnaliser** → bandeau listant les **éléments retirés** : un clic remet l'élément à sa place. Bouton
**« Rétablir la disposition par défaut »**. Disposition, éléments retirés, périodes des alertes et interrupteurs
mémorisés par utilisateur (préférences, §0.3).

### 8.3 Performance (éviter les lenteurs)
- **Un élément retiré n'est jamais chargé** ; chaque carte charge **ses** données quand elle devient visible à
  l'écran (chargement progressif), tuiles d'abord.
- **Une requête par carte** (plus de requêtes par sous-élément) ; données du jour en cache serveur court (1 à 2 min),
  année et historique mensuel en cache long (les mois clos ne changent plus) ou lus dans les agrégats du Pilotage.
- Requêtes sur plages de dates et index existants (même règle que le correctif des articles vendus) ; mesures
  avant / après sur la base de test, aucune carte au-delà de 1 s visée.
- Aucun rafraîchissement automatique ; bouton « Actualiser » comme aujourd'hui.

**Menu (`ws_tree_menu.jsp`).** Il n'existe aucun équivalent REST. Proposition : `GET v1/menu/arbre` produisant
**exactement** le même JSON (mêmes droits, mêmes priorités, mêmes libellés), test de comparaison JSP / API, bascule de
`Navigation.js`, JSP conservée.

---

## 9. Matrice × rotation : onglet « Suivi équivalence »

**Existant.** Écran `analysearticle` : onglets « Matrice marge × rotation » et « Achetés ensemble ».

**Proposition.** Nouvel onglet « Suivi équivalence » :
- produits **regroupés par ensemble exact de DCI** (même règle que §1.1) ;
- dans chaque groupe, classement des **plus vendus aux moins vendus** sur la période (quantités, CA, marge, stock,
  couverture en jours, dernière vente) ;
- repérage : produits « doublons » peu vendus alors qu'un équivalent se vend bien → candidats à ne plus commander ;
- filtres (DCI, groupe avec au moins N produits, stock > 0), export Excel / PDF.

---

## 10. Découpage proposé et ordre de livraison (mis à jour le 06/10)

| Lot | Contenu | Dépendances |
|---|---|---|
| L1 | Socle : préférences utilisateur, stockage de fichiers durci | — |
| L2 | §1.1 Équivalents DCI (bouton + fenêtre modale, tous les substituts, marqueur, impression) + §1.4 produits retirés récupérables + retrait / reliquat | — |
| L3 | §1.3 Statuts En cours / Clôturée / Commandée (dernier produit, question CSV, manuel) + §1.6 colonne colisage et sortie des JSP de la suggestion | — |
| L4 | §1.2 + §2 Disponibilité PharmaML V1 / V3 (suggestion et commande, revérification par grossiste) | vos tests après livraison |
| L5 | §1.5 Commander une suggestion par PharmaML | L3, L4 |
| L6 | §6 Fiche article (code géo réserve, colisage, liste par code géo, images + API), sortie des JSP de la fiche | L1 |
| L7 | §9 Onglet « Suivi équivalence » | L2 |
| L8 | §8 Tableau de bord (maquette choisie) + sélecteur d'année + paramètre nouveau / ancien + menu REST | L1 |
| L9 | §7 Cloche configurable | L1 |
| L10 | §4 Rappels chroniques (habitudes d'achat) + WhatsApp (API par défaut, paramètre) | — |
| L11 | §3 RH (planning semaine, congés, connexions, import pointeuse, écran) | L1 |
| L12 | §5 Analyse prédictive Suggestion / Commande | L2, L4 |
| L13 | Mobile : jeton signé, pointage mobile, photos depuis le téléphone | décision ultérieure |

Chaque lot est livré avec ses migrations, ses tests (unitaires + e2e avec jeu d'essai retiré) et des captures.

---

## 11. Réponses du 06/10 (intégrées ci-dessus)

| Question | Décision |
|---|---|
| PharmaML | versions 1.0.0.0 et 3.0.0.0 ; 3.0.0.0 par défaut sur chaque grossiste ; tests faits par l'officine après livraison |
| Vider la suggestion | quantité couverte = quantité suggérée → ligne retirée ; sinon avertissement et choix : garder, ou retirer + suggestion de reliquat (commentaire « Reliquat substitution ») ; produits retirés sauvegardés et récupérables (motifs `SUPPRESSION_USER`, `SUPPRESSION_EQUIVALENCE_DCI`) |
| Analyse DCI | uniquement par bouton, fenêtre modale, rien à l'ouverture |
| Pointage mobile | en dernier (une application mobile existe) |
| Horaires | planning par semaine |
| Patient chronique | habitudes et fréquence d'achat suivies (mensuel, bimensuel…) ; affichage des médicaments dans le message paramétrable sur la fiche client, affiché par défaut |
| WhatsApp | compte Meta Business disponible ; API officielle par défaut ; paramètre pour changer le défaut |
| Tableau de bord | trois propositions ; paramètre nouveau / ancien |
| Statuts | « En cours » à l'ouverture, « Clôturée » au dernier produit traité, question CSV, « Commandée » |
| JSP | plus aucun écran ne les appelle ; elles restent sur le serveur |

## 12. Réponses du 06/10 (2e série)

| Question | Décision |
|---|---|
| Q-A Marqueur DCI | **au clic** sur « Équivalents DCI » uniquement |
| Q-B Version PharmaML | **3.0.0.0 partout**, y compris l'envoi des commandes (paramètre par grossiste pour revenir en 1.0.0.0) |
| Q-C Commander par PharmaML | la suggestion est **conservée au statut « Commandée »** |
| Q-D Statut `pharma` | **gardé tel quel** (pas modifié) |
| Q-E Inactivité des sessions | **pas de délai** : comportement actuel conservé |
| Q-F Colisage | **informatif** pour le moment (couplage aux données grossiste plus tard) |
| Q-G Reliquat | **chez le grossiste d'origine** |
| Tableau de bord | **proposition 1**, améliorée (§8.1) |

## 13. Réponse du 06/10 (3e série)
- **Q-H** Valorisation : **simple part rayon / réserve** dans le stock (ex. rayon 60 %, réserve 40 %), en valeur
  d'achat et en valeur de vente.

---

<details><summary>Questions de la version 1 (archivées)</summary>


1. **[Q1]** Pointage et photos par téléphone : application Android dédiée (à développer à part) ou page web mobile
   ouverte dans le navigateur du téléphone ? Faut-il enregistrer les appareils autorisés ?
2. **[Q2]** Analyse DCI à l'ouverture : bandeau discret (proposé) ou fenêtre ouverte automatiquement ?
3. **[Q3]** « Vider la suggestion des produits équivalents » : supprimer la ligne entière, ou réduire la quantité de
   la part couverte par le stock des équivalents ? Uniquement les équivalents **directs** (même dosage et forme) ?
4. **[Q4]** Quelle version de PharmaML chaque grossiste accepte-t-il (1.0 actuelle, 2.0 de la spécification, 3.0 de
   vos exemples) ? Avez-vous une URL de test et des identifiants ?
5. **[Q5]** Couleur quand le grossiste ne répond pas : gris « non vérifié » (proposé) ?
6. **[Q6]** Statut `pending` affiché « CLOTURE » dès l'ouverture : le renommer (« En cours ») et créer un vrai
   « Clôturé » ? Une suggestion « Commandée » peut-elle encore être transformée en commande dans Prestige ?
7. **[Q7]** Après un envoi PharmaML réussi, passer la commande au statut `pharma` (prévu mais jamais posé) ?
8. **[Q8]** Horaires de travail : un horaire type par employé (ex. lundi–samedi 8 h–17 h) ou un planning par
   semaine (rotations, gardes) ?
9. **[Q9]** Délai d'inactivité pour considérer une session terminée (ex. 30 min) ? Sans déconnecter l'utilisateur.
10. **[Q10]** Anti-fraude du pointage mobile : QR code affiché à l'officine, position GPS, les deux ?
11. **[Q11]** Définition du patient chronique : ordonnance renouvelable, achats répétés du même traitement, ou case
    « patient chronique » sur la fiche client ?
12. **[Q12]** Contenu des messages de rappel : sans aucun nom de médicament (proposé) ?
13. **[Q13]** WhatsApp : avez-vous déjà un compte Meta Business / un numéro dédié ? Mode par défaut ?
14. **[Q14]** « Aide à la décision clinique » : limiter au stock (proposé) ou attendez-vous aussi des alertes
    cliniques dans ce menu ?
15. **[Q15]** Colisage : simple information ou arrondi automatique des quantités suggérées au colis ?
16. **[Q16]** Tableau de bord : remplacer l'ancien après validation, ou garder les deux au choix de l'utilisateur ?

</details>
