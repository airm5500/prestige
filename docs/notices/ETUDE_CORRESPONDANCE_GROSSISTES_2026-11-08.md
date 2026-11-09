# Correspondance produits grossistes ↔ Prestige : étude (08/11/2026)

Objectif : pour un produit Prestige, connaître chez chaque grossiste (Laborex, Copharmed, DPCI, Ubipharm, Tedis…) son
code, son prix d'achat, son prix public et sa disponibilité au moment voulu.

Données mesurées en lecture seule :
- `laborex_v1_db` (Flyway 7.2.47) : fiches, codes grossistes, BL sur 24 mois ;
- `laborex_audit` : catalogues réels lus par les connecteurs le 08/11 (table `extranet_liste_ligne`).

Aucune colonne nominative n'a été lue. Rien n'a été écrit en base. Le code a été lu sur la branche
`claude/faisabilite-connecteurs-grossistes`. La branche de cette étude part maintenant de `claude/new-session-xm8ptu`
(dernière migration V7.2.32). Celle-ci a `DisponibiliteServiceImpl` et `correctifs-affichage.js`, mais pas les
connecteurs (voir la question 1).

---

## 1. En bref

- **La clé exacte suffit pour la majorité.** Chez Laborex, le code grossiste est le CIP dans 99,7 % des cas. Chez les
  autres, le code de `t_famille_grossiste` concorde avec le CIP ou l'EAN dans 99 % des cas où l'on peut comparer.
- **L'historique des BL ne connaît pas le code du grossiste.** `t_bon_livraison_detail` pointe directement sur le
  produit : aucune colonne ne garde le code ou la désignation reçus. Le BL prouve « ce grossiste a livré ce produit, à ce
  prix, à cette date », mais il ne peut pas apprendre de code tant que l'import ne le garde pas. C'est la première chose
  à corriger.
- **Les catalogues des extranets sont la source qui manquait.** Tedis (16 932 produits), Copharmed (9 423), les offres
  DPCI (745) et les produits UG d'Ubipharm (698) donnent le code, le CIP ou l'EAN, la désignation, et selon le grossiste
  le prix et la disponibilité.
- **Le rapprochement par désignation est utile, mais pas sans contrôle.** Sur 3 000 cas dont on connaît la réponse, il
  propose le bon produit 98,4 % du temps au seuil 0,7, et 98,9 % au seuil 0,8. Il reste donc 1 à 2 % d'erreurs, ce qui
  est trop pour l'écrire sans validation humaine.
- **Les prix des catalogues concordent avec les BL.** Le prix d'achat du catalogue est égal au dernier prix d'achat du
  BL pour 93 % des produits Tedis et 80 % des produits Copharmed.

## 2. Sources trouvées

| Source | Ce qu'elle relie | Prix | Dispo | Fiabilité, limites |
|---|---|---|---|---|
| `t_famille.int_CIP` (unique parmi les actifs), `int_EAN13`, `int_CIP2..4`, `str_PSCODE` (Ubipharm, vide dans `laborex_v1_db`) | code → produit | — | — | Sûre. **220 EAN sont en double** (440 fiches actives) ; `int_CIP2..4` sont vides. |
| `t_famille_grossiste` (28 887 lignes actives) : `str_CODE_ARTICLE`, `int_PAF`, `int_PRICE`, `dt_UPDATED` | produit ↔ code d'un grossiste | dernier prix, sans historique | `bl_RUPTURE` | Bonne : 99 % d'accord avec le CIP ou l'EAN. Défauts : codes ambigus (même code sur 2 produits : 4 à 7 par grossiste), codes égaux au CIP d'un autre produit (22 à 57 par grossiste), pas de contrainte d'unicité, codes avec `.` ou `+` en fin. |
| BL (`t_bon_livraison_detail`, 108 896 lignes sur 24 mois) | grossiste ↔ produit livré | PAF, prix de vente, horodatés | — | Sûre pour le lien grossiste ↔ produit et pour l'historique des prix. Ne garde **aucun code grossiste**. |
| Import des fichiers de commande et de BL (`FileFormaManager`, formats LABOREX, COPHARMED, TEDIS, DPCI…) | code du fichier → produit | PA et prix public du fichier | — | Lit bien le code, mais le cherche en `LIKE 'code%'`, **sans filtrer le grossiste**, et garde le premier résultat. Le code reçu n'est conservé nulle part. |
| Réconciliation (`ReconciliationPanel.js`, `updateCodeCip`) | décision humaine sur une ligne non reconnue | — | — | Une association **remplace `t_famille.int_CIP`** ; elle ne crée pas de ligne `t_famille_grossiste`. |
| PharmaML (`t_pharmaml_reponse_ligne`, `t_disponibilite_produit`, écran Rupturepharma, `DisponibiliteServiceImpl`) | code envoyé → réponse | PHAHT, PUBTC, NETHT | statut, quantité, date | Prévu pour la disponibilité à la demande. **Tables vides** dans `laborex_v1_db` ; Laborex a `bool_USE_PHARMA = 0` et `int_PHARMAML_DISPO = 0`. |
| Connecteurs extranets (`extranet_liste_ligne`, `extranet_produit`, rafraîchissement planifié) | code, CIP, EAN, désignation | Tedis : cession HT, public TTC ; Copharmed : prix HT, net, public ; Ubipharm : fiche (`pspven`, `psppub`) | Tedis « Oui » ; Copharmed « Disponible (48 h) » ou « Indisponible » ; Ubipharm par agence | Données réelles et horodatées par collecte. DPCI : offres seulement, sans prix ni disponibilité. Ubipharm : pas de catalogue complet, seulement une recherche et une fiche par référence. **Laborex : aucun connecteur.** |

Grossistes dans Prestige : Laborex YOP (19 305 lignes `t_famille_grossiste`), Copharmed (3 026), Tedis (1 810), DPCI
(1 455), plus une cinquantaine de petits fournisseurs. **Ubipharm n'existe pas dans `t_grossiste`** : on le relie par
`t_famille.str_PSCODE`, décision du 08/11 de la session des connecteurs.

## 3. Mesures

### 3.1 Codes déjà connus (`t_famille_grossiste`, lignes actives avec code)

| Grossiste | Codes | = CIP | = EAN | Produits livrés en 24 mois | … ayant un code pour ce grossiste |
|---|---|---|---|---|---|
| Laborex YOP | 19 227 | 19 175 (99,7 %) | 34 | 6 989 | 6 954 (99,5 %) |
| Copharmed | 2 098 | 1 087 | 21 | 2 563 | 2 001 (78 %) |
| Tedis | 974 | 503 | 316 | 1 326 | 881 (66 %) |
| DPCI | 983 | 384 | 105 | 1 216 | 935 (77 %) |

Chez Copharmed, 999 codes à 7 chiffres ne sont pas le CIP de la fiche. Copharmed nomme ce champ « Code CIP/ACL/EAN7 » :
c'est probablement un ancien CIP ou un code propre.

### 3.2 Catalogues des extranets rapprochés par clé exacte

Ordre appliqué : code connu pour ce grossiste, puis CIP, EAN ou PSCODE d'une fiche active.

| Catalogue (08/11) | Produits | Rapprochés exactement | Code connu et CIP en désaccord | Clé ambiguë | Déjà livrés par ce grossiste (BL 24 mois) |
|---|---|---|---|---|---|
| Tedis catalogue | 16 932 | 6 170 (36 %) | 8 sur 711 | 148 | 1 235 |
| Copharmed catalogue | 9 423 | 3 050 (32 %) | 4 sur 908 | — | 1 992 |
| DPCI offres | 745 | 289 (39 %) | 2 sur 25 | 10 | 74 |
| Ubipharm produits UG | 698 | 561 (80 %) | — | 23 | — |

Les taux paraissent bas parce que les catalogues contiennent bien plus de produits que l'officine n'en tient. Vu depuis
Prestige, sur les **10 134 produits actifs achetés en 24 mois** :

| | Tedis | Copharmed | Ubipharm (liste UG seule) | DPCI (offres seules) |
|---|---|---|---|---|
| Trouvés au catalogue par clé exacte | 5 727 | 2 940 | 577 | 296 |
| Livrés par ce grossiste et trouvés | 1 242 sur 1 326 (94 %) | 1 987 sur 2 563 (78 %) | — | 74 sur 1 216 |

- 6 688 produits sont trouvés dans au moins un des catalogues Tedis, Copharmed ou Ubipharm.
- 3 446 ne sont trouvés dans aucun : ils restent pour le rapprochement approché ou pour Laborex.
- Copharmed : 576 produits livrés ne sont pas retrouvés par clé. Ce sont exactement ceux qu'un import de BL aurait
  appris, s'il gardait le code.

### 3.3 Rapprochement approché par désignation (essai)

Méthode de l'essai :
- désignation normalisée : majuscules, accents retirés, abréviations unifiées (CPR, GEL, SP, SUSP, FL, B…) ;
- dosages et quantités extraits (`500MG`, `F/200ML`, `B/30`) ;
- similarité pondérée par la rareté des mots ;
- forte pénalité si le dosage ou le conditionnement diffère, ou si la marque (premier mot) diffère.

La marque est indispensable. Sans elle, APRONAT 60 mg était proposé pour PALUMAX 60 mg : même molécule, autre
spécialité.

Évaluation sur 3 000 produits tirés au hasard (graine 20261108) parmi ceux dont la clé exacte donne la réponse :

| Seuil (avec un écart d'au moins 0,05 sur le 2e candidat) | Proposés | Justes | Faux | Précision | Laissés à valider |
|---|---|---|---|---|---|
| 0,5 | 2 590 | 2 522 | 68 | 97,4 % | 398 |
| 0,7 | 2 288 | 2 252 | 36 | 98,4 % | 700 |
| 0,8 | 2 118 | 2 095 | 23 | 98,9 % | 870 |

Le bon produit est dans les 3 premiers candidats dans 94 % (Copharmed) à 97 % (Tedis) des cas.

Sur les produits sans clé exacte, les candidats forts (≥ 0,7) sont : Copharmed 1 913, Tedis 904, DPCI 184, Ubipharm 32.

Limite : les cas de l'essai ont des désignations probablement plus propres que celles des produits sans clé. **Le taux
d'erreur réel doit être mesuré sur un échantillon vérifié à la main** (voir la question 5). La lecture de 15 propositions
fortes par grossiste n'a montré aucune erreur. Exemples : « AYANFER SIROP FL 200ML » ↔ « AYANFER SP F/200ML »,
« KEM SUS F/200ML » ↔ « KEM SUSP BUV F/200ML ».

### 3.4 Prix

- **Prix d'achat du catalogue et dernier prix d'achat du BL** (même grossiste, même produit) : égaux à 0,5 % près pour
  1 145 produits Tedis sur 1 235 (93 %) et 1 596 produits Copharmed sur 1 992 (80 %). Chez Copharmed, 10 % des produits
  ont un écart supérieur à 2,2 %.
- **`t_famille_grossiste.int_PAF`** est égal au dernier prix d'achat du BL dans plus de 99 % des cas : il est tenu à jour
  à la réception, mais l'ancienne valeur est perdue. L'historique horodaté existe déjà, de fait, dans les lignes de BL.
- **Prix public du catalogue et `t_famille.int_PRICE`** : égaux seulement pour 30 % (Tedis) et 27 % (Copharmed) des
  produits. L'écart vient soit de la règle HT/TTC (parapharmacie), soit d'un prix de fiche ancien. À éclaircir avant
  toute comparaison affichée (question 4).

## 4. Conception proposée

### 4.1 Données (une migration Flyway, `CREATE TABLE IF NOT EXISTS`)

**`correspondance_grossiste`** : une ligne par (grossiste, code grossiste).
- **Identifiants** : `grossiste_id` (`t_grossiste`) ou, pour Ubipharm qui n'y est pas, `source_extranet`.
  - Ubipharm, à reprendre quand les connecteurs arriveront sur la branche de travail : la référence Ubipharm d'une
    fiche est `t_famille.str_PSCODE`. Depuis le 08/11, l'onglet « Nouveaux produits » des connecteurs l'enregistre
    sur confirmation, seulement quand un seul article actif a le même CIP ou EAN 13, et trace chaque enregistrement
    au journal (`t_event_log`, table `t_famille`, avant → après). Une ligne `EXT:UBIPHARM` de
    `correspondance_grossiste` prendra ce PSCODE comme code, avec la source `PSCODE`.
- **Données du grossiste** : `code_grossiste`, `cip`, `ean`, `designation_grossiste`, `laboratoire_grossiste` (bruts).
- **Produit** : `lg_FAMILLE_ID` (null tant qu'elle n'est pas rapprochée).
- **`etat`** : `AUTO_EXACTE`, `PROPOSEE`, `VALIDEE`, `REJETEE`, `CONTREDITE`.
- **Origine** : `source` (`CODE_GROSSISTE`, `CIP`, `EAN`, `PSCODE`, `BL`, `APPROCHE`, `HUMAIN`), `score` (0 à 1),
  `candidats` (JSON des 3 meilleurs, pour la file).
- **Dates** : `dt_creation`, `dt_maj`, `dt_derniere_confirmation`.
- **Compteurs** : `nb_confirmations`, `nb_contradictions`.
- **Validation** : `utilisateur_validation`, `dt_validation`.
- Index unique sur (`grossiste_id`/`source_extranet`, `code_grossiste`).

**`prix_grossiste`** : historique horodaté, une ligne seulement quand la valeur change.
- grossiste, `lg_FAMILLE_ID`, code ;
- `prix_achat`, `prix_public`, bruts et décimaux, avec la nature lue (HT, TTC, inconnue), jamais déduite ;
- `source` (`BL`, `CATALOGUE`, `FICHE_UBIPHARM`, `PHARMAML`), `piece` (id du BL ou de la collecte), `dt_lecture`.

**`ligne_import_grossiste`** : le code et la désignation bruts de chaque ligne de fichier importé, reliés à
`t_order_detail`. Sans cette table, le BL ne peut ni apprendre ni contredire un code.

Ce qui reste en place :
- `t_famille_grossiste` est conservée et relue (l'écran actuel en dépend) ;
- on n'y écrit qu'après une validation, et seulement si l'utilisateur l'accepte (question 3) ;
- la disponibilité reprend `t_disponibilite_produit` (PharmaML) et les listes des connecteurs.

### 4.2 Moteur par étapes (logique pure, séparée des requêtes, comme `RapprochementProduits.decider`)

1. **Correspondance `VALIDEE` ou `REJETEE` existante** : on la garde. Un calcul automatique ne la remplace jamais.
2. **Code déjà connu pour ce grossiste** (`t_famille_grossiste`, un seul produit) : `AUTO_EXACTE`, score 1.
3. **CIP, EAN, CIP2-4 ou PSCODE d'une seule fiche active** : `AUTO_EXACTE`, score 0,99. Si plusieurs fiches
   correspondent : `PROPOSEE` avec tous les candidats.
4. **Désignation** : marque, dosage, forme, conditionnement, laboratoire. Le résultat est toujours `PROPOSEE`, avec son
   score et ses 3 candidats. Rien n'est appliqué automatiquement (1 à 2 % d'erreurs mesurées).
5. **Réception d'un BL** (par la ligne d'import) :
   - même produit : `nb_confirmations + 1` et date ;
   - autre produit : `nb_contradictions + 1`. Une correspondance automatique passe `CONTREDITE` et revient dans la
     file. Une correspondance validée reste validée, mais elle est signalée dans la file.
6. **Codes de `t_famille_grossiste` douteux** (ambigus, égaux au CIP d'un autre produit, en désaccord avec le CIP) :
   envoyés dans la file, sans être corrigés d'office.

### 4.3 Prix et disponibilité

- **Prix** : alimentés à chaque clôture de BL (la source la plus sûre), à chaque collecte de catalogue et à chaque
  lecture d'une fiche Ubipharm. Affichés avec leur source et leur date. HT et TTC ne sont jamais mélangés.
- **Disponibilité à la demande** :
  - un bouton « Vérifier » interroge PharmaML (`DisponibiliteServiceImpl`) ou le connecteur du grossiste (fiche
    Ubipharm, recherche Copharmed) ;
  - cache court, 15 min proposées ;
  - affichage « lu à 10 h 42 », ou « d'après le catalogue du 08/11 à 06 h 09 » quand on se contente de la dernière
    collecte.

### 4.4 Écran « Correspondances grossistes » (REST + ExtJS, menu dans `correctifs-affichage.js`)

- **Par produit** : pour un produit Prestige, une ligne par grossiste avec le code, l'état et la source de la
  correspondance, le dernier prix d'achat et sa date, le prix public, la disponibilité et sa date, et un bouton
  « Vérifier ».
- **File de validation** :
  - les propositions, classées par score puis par intérêt (produit vendu, grossiste habituel) ;
  - désignation du grossiste face à celle des 3 candidats, avec le dosage et le conditionnement mis en évidence ;
  - boutons « Valider », « Autre candidat », « Rejeter », confirmés dans le bouton lui-même, sans fenêtre de
    modification ;
  - filtre par grossiste et par état.
- **Mesures** : les taux de la section 3, recalculés à chaque collecte.

### 4.5 Lots et tests

| Lot | Contenu | Tests principaux |
|---|---|---|
| 1 | Tables, moteur sur clés exactes (étapes 1 à 3, 6), calcul initial à partir des catalogues gardés et de `t_famille_grossiste`, API de lecture | Cohérence : milliers de cas générés avec une graine fixe (priorité, un seul état, validé jamais écrasé, zéros de tête en chaîne, clé vide jamais rapprochée, ambiguïté → proposée). Rapprochement : base = API. |
| 2 | `ligne_import_grossiste` à l'import des fichiers, confirmation et contradiction à la clôture du BL | Bilan avant/après d'un import et d'une clôture (une ligne par ligne de fichier, un compteur bougé, rien d'autre). Doit échouer sur l'ancien code. |
| 3 | Rapprochement approché et écran de la file de validation | Cohérence (oracle sur des désignations générées : dosage ou marque différents → jamais au-dessus du seuil). Écran, sous le verrou : valider, rejeter, autre candidat ; base relue ; validation non écrasée par un recalcul. |
| 4 | `prix_grossiste` (BL, catalogues, fiche Ubipharm), vue par produit | Rapprochement écran = base = BL ligne par ligne. Cohérence : une ligne seulement si la valeur change, HT et TTC jamais mélangés. |
| 5 | Disponibilité à la demande et cache court | Faux PharmaML et `FauxExtranet` : cache respecté, date affichée = date de lecture, échec affiché sans valeur inventée. |

### 4.6 État d'avancement

- **Lot 1, livré** : moteur sur clés exactes, tables, calcul et API de lecture. Sur `laborex_v1_db` : 15 087 codes,
  15 047 retenus d'office par le code du grossiste, 40 à valider. Tests : `CorrespondanceReglesCoherenceTest`
  (20 000 cas), `test-correspondance-lot1.js` (26/26).
- **Lot 2, livré** :
  - `ligne_import_grossiste` (V7.6.1) garde le code et la désignation bruts de chaque ligne de fichier importée,
    reconnue ou non, dans la transaction de l'import ;
  - à la clôture du BL, après validation et sans pouvoir la bloquer : création (source BL), confirmation,
    contradiction (AUTO → CONTREDITE, fiche d'origine gardée, fiche reçue notée) ou signalement (VALIDEE, REJETEE :
    rien ne change) ;
  - API `POST reception-bl/{blId}` (rejeu, droit `P_CORRESPONDANCE_GROSSISTES`) et `GET import/{commandeId}`.
  - Tests : `ReceptionBlCoherenceTest` (20 000 cas, oracle) et `test-correspondance-lot2.js` (28/28) : import par la
    fenêtre « IMPORTER UNE COMMANDE », fichier = traces = API = commande ligne par ligne, bilan de la réception,
    second passage sans effet, calcul du lot 1 sans écraser l'appris ni le décidé.
  - Limite : la clôture réelle entre en stock ; le test pose un BL clôturé et rejoue la même méthode par l'API.
    L'appel ajouté dans `cloturerBonLivraison` n'est donc pas couvert de bout en bout.
- **Lot 3, livré** :
  - moteur `CorrespondanceApprochee` (logique pure, reprise de l'essai) : propositions par la désignation pour les
    codes non reconnus à l'import, toujours à valider, 3 candidats au plus ; une correspondance enregistrée autrement
    est conservée ;
  - écran GESTION DES COMMANDES > « Correspondance grossistes » (migration V7.6.2, droit
    `P_CORRESPONDANCE_GROSSISTES`) : file « à traiter » (à valider, contredites, contradictions signalées), filtres
    par grossiste et par état, dosages en évidence, « Valider ce produit », « Autre produit… » (CIP, EAN ou
    désignation), « Rejeter », « Proposer par désignation », tous confirmés dans le bouton ;
  - une décision enregistre l'utilisateur et la date, lève la contradiction signalée ; refusée (409) si la ligne a
    changé depuis la lecture.
  - Tests : `ApprocheeCoherenceTest` (6 000 variantes générées, score = calcul refait à part, autre dosage ou autre
    marque jamais au seuil fort ; échoue si l'on retire les pénalités) et `test-correspondance-lot3.js` (27/27).
- **Relecture à l'import, livrée** (accord du 09/11) :
  - l'import des fichiers (`FileFormaManager`, tous formats) relit `correspondance_grossiste` : une correspondance
    VALIDEE pour ce grossiste et ce code (normalisé : blancs et casse ignorés) l'emporte sur la recherche par code,
    si sa fiche est active et non déconditionnée ; REJETEE, PROPOSEE ou fiche inactive : rien ne change ;
  - `t_famille_grossiste` n'est toujours pas écrite (question 3 : seulement la partie « l'import lit la table »).
  - Test : `test-correspondance-import-validee.js` (9/9 ; 5/9 sur l'ancien import) : code inconnu validé, même code
    en minuscules avec des blancs, code connu validé pour un autre produit, code rejeté, code proposé, témoin.
- **Lot 4, partie BL, livrée** :
  - `prix_grossiste` (V7.6.3) : à chaque réception de BL clôturé (même appel que le lot 2, après le commit), prix
    d'achat (`int_PAF`) et prix public (`int_PRIX_VENTE`) de chaque ligne, avec le code chez le grossiste, le BL, sa
    ligne et sa date ; une ligne seulement si un prix change pour ce produit chez ce grossiste ; un prix 0 (unités
    gratuites) n'est jamais écrit ; un BL n'est lu qu'une fois ;
  - prix public TTC (décision du 09/11 : c'est le prix de vente au public) ; prix d'achat de nature `INCONNUE`, le
    BL ne le précise pas ; HT, TTC et inconnue ne sont jamais comparés entre eux (règle `PrixGrossisteRegles`) ;
  - écart de prix public (décision du 09/11) : dernier prix public TTC lu chez un grossiste − prix de vente Prestige
    (`t_famille.int_PRICE`, TTC) ; affiché dans la vue par produit, signalé en rouge au-delà d'un seuil réglable
    (`KEY_CORRESPONDANCE_SEUIL_ECART_PRIX`, V7.6.4, 0 FCFA par défaut : tout écart) ; liste « Écarts de prix
    publics » (plus grands écarts d'abord, nombre sur le bouton de la file), seuil réglé dans cette liste et confirmé
    dans le bouton ; expliqué dans l'aide « ? » ;
  - API `GET produit/{familleId}/prix` (derniers prix, écart et historique), `GET ecarts-prix`,
    `POST seuil-ecart-prix` (droit) ; écran « Correspondance
    grossistes » > « Par produit » : recherche par CIP, EAN ou désignation, une ligne par grossiste (code,
    correspondance, dernier prix d'achat, prix public, date et BL), puis l'historique.
  - Tests : `PrixGrossisteCoherenceTest` (4 000 suites de lectures et 20 000 écarts tirés, oracles ; échoue si l'on
    mélange les natures ou si un seuil négatif n'est pas ramené à 0) et `test-correspondance-lot4.js` : quatre BL,
    deux grossistes, BL = base = API = écran ligne par ligne, écarts aux seuils 0 et 100 = calcul SQL refait sur toute
    la table = écran, bilan.
  - Reste, après la fusion des connecteurs (question 1) : prix des catalogues et de la fiche Ubipharm.
- **Lot 5, livré sans les catalogues** (décisions du 09/11) :
  - « Vérifier » dans la vue par produit : disponibilité du produit chez le grossiste de la ligne, demande
    d'information PharmaML (`DisponibiliteService.verifier`, jamais une commande), résultat enregistré dans
    `t_disponibilite_produit` et affiché avec sa source et son heure de lecture ; une lecture de moins de 15 minutes,
    quelle que soit son origine, est reprise sans appel (« Relire » force l'appel) ; un échec est affiché tel quel,
    sans valeur ;
  - source par grossiste (`t_grossiste.int_SOURCE_DISPO`, V7.6.5) : 0 PharmaML seul (comportement d'avant, défaut),
    1 extranet seul, 2 les deux, chaque réponse avec sa source ; réglée dans « Sources de disponibilité », confirmée
    dans le bouton. La source extranet répond « absente » tant que les connecteurs ne sont pas sur la branche (aucun
    lecteur Laborex n'existe d'ailleurs dans la branche des connecteurs) ;
  - API `GET produit/{familleId}/disponibilite`, `POST produit/{familleId}/disponibilite/{grossisteId}[?forcer=true]`,
    `GET` et `POST sources-disponibilite[/{grossisteId}]` (droit pour régler).
  - Tests : `DisponibiliteCoherenceTest` (sources des réglages 0, 1, 2 et hors bornes ; cache sur 20 000 cas tirés,
    bord de 15 minutes, lecture dans le futur) et `test-correspondance-lot5.js` (faux PharmaML) : réglages 0, 1 et 2,
    cache puis « Relire », panne, écran = base = faux grossiste, bilan des lignes écrites.
  - Reste, après la fusion des connecteurs : lecteur extranet (listes, fiche Ubipharm, recherche Copharmed) derrière
    la source EXTRANET, et « d'après le catalogue du … » quand on se contente de la dernière collecte.

## 5. Questions

1. **Dépendance aux connecteurs.** Cette branche part de `claude/new-session-xm8ptu`, qui n'a pas les connecteurs
   (`extranet_liste_ligne`, `str_PSCODE`, migrations V7.5.x). Ils vivent sur `claude/faisabilite-connecteurs-grossistes`.
   Ce qui ne dépend pas d'eux peut se faire tout de suite : lot 1 sur `t_famille_grossiste` et les clés exactes, lot 2
   (import et BL), lot 4 pour les prix des BL. La lecture des catalogues (lots 1, 4 et 5) attend que les connecteurs
   arrivent sur la branche de travail. Faut-il les y faire venir, ou la lecture des catalogues doit-elle passer par une
   interface définie avec leur session ?
   - **Réponse du 09/11** : la partie catalogues attend la fusion des connecteurs, qui restent hors de cette branche ;
     tout le reste est fait (prix des BL, vue par produit, PharmaML).
2. **Ubipharm** n'est pas dans `t_grossiste`. Faut-il l'y créer, ou garder une clé « source extranet » à côté du
   grossiste ?
3. **Écrire dans `t_famille_grossiste` après validation ?** Cela profiterait aux écrans existants et à la disponibilité
   PharmaML. Sinon, la nouvelle table reste à part et `t_famille_grossiste` n'est que lue.
4. **Prix publics et HT/TTC.**
   - Seuls 27 à 30 % des prix publics des catalogues égalent `int_PRICE`.
   - Copharmed, réglé le 08/11 : les colonnes s'appellent désormais « Taux TVA » et « Prix TTC » (commit 95130bbb9 des
     connecteurs ; positions et valeurs inchangées). Catalogue : [4] prix HT, [5] taux TVA (0, 9 ou 18 %), [6] prix
     TTC, [7] prix public. Promotions : [8] à [11], dans le même ordre. Le prix d'achat à comparer au PAF du BL est le
     prix HT ([4]).
   - Faut-il seulement afficher l'écart, ou aussi le signaler ?
   - **Réponse du 09/11** : comparer en TTC ; afficher l'écart et le signaler au-delà d'un seuil réglable, 0 FCFA par
     défaut ; l'expliquer dans l'aide « ? ». Fait au lot 4.
5. **Échantillon vérifié à la main.** Qui peut contrôler une centaine de propositions par grossiste ? Je fournis la
   liste. C'est le seul moyen d'avoir le vrai taux d'erreur.
6. **Laborex.** Il n'y a ni connecteur ni PharmaML actif. Le prix et le code viennent donc des BL ; la disponibilité
   n'a pas de source. PharmaML est-il prévu pour Laborex ?
   - **Réponse du 09/11** : les deux en option, choisis par un paramètre ; par défaut le comportement actuel ; les deux
     actifs : les deux résultats avec leur source. Fait au lot 5, réglage par grossiste ; la source extranet attend les
     connecteurs (aucun lecteur Laborex n'existe encore).
7. **Défauts suspectés, hors de cette étude** (lus dans le code, pas encore prouvés par un test) :
   - commande PharmaML : `PharmaMlServiceImpl.buildLigne` teste `isEmpty(code article)` au lieu de `!isEmpty`. Le code du
     grossiste n'est donc jamais envoyé : c'est toujours le CIP qui part ;
   - import de fichier : `FileFormaManager.getTFamilleGrossiste` cherche `LIKE 'code%'` sur tous les grossistes et prend
     le premier résultat. Il peut associer un mauvais produit ;
   - réconciliation : associer une ligne remplace `t_famille.int_CIP` de la fiche.

   Faut-il les traiter dans une session à part ?
