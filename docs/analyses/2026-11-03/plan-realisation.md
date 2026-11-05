# Plan de réalisation — cas 1 à 3 (validé le 03/11/2026)

Base : les analyses [cas 1](cas1-ligne-comptant-vente-credit.md), [cas 2](cas2-prix-taux-reference-caisse.md),
[cas 3](cas3-ordonnancier-produits.md) (§0 « Décisions ») et les maquettes validées. Le cas 4 est repris après.
Rien de ce plan n'est codé ; il décrit l'ordre, les lots, les fichiers, les tests et les garde-fous.

## 1. Principes communs

- **Un paramètre par cas, désactivé par défaut** (`t_parameters`, valeur `0`) : `KEY_LIGNE_COMPTANT_VO`, `KEY_PRIX_REF_CAISSE`.
  Le cas 3 n'a pas de paramètre : il s'appuie sur `KEY_GERE_ORDONCIER` existant et sur une colonne à `0` partout.
- **Garde-fou de non-régression** : paramètre à `0` ⇒ aucune colonne créée dans la grille, aucun nouveau chemin serveur emprunté.
  Chaque lot livre d'abord un test qui prouve l'égalité « avant / après » avec le paramètre à `0`.
- **Une branche par cas**, partant de `integration/recette-2026-10-29` : `PRES-/ligne-comptant-vo`, `PRES-/prix-ref-caisse`,
  `PRES-/ordonnancier-produits`. Jamais de push sur `dev`, jamais de fusion ; l'intégration se fait par la session d'intégration.
- **Migrations Flyway** numérotées à la suite de `V7.2.32` : `V7.2.33__ordonnancier_produits_sensibles.sql`,
  `V7.2.34__prix_reference_journal.sql`, `V7.2.35__ligne_comptant_vo.sql`. Idempotentes (`IF NOT EXISTS`, procédure comme `V4.7.7`).
- **Règles du projet** : pas de JSP, pas de fenêtre surgissante (confirmation dans le bouton), aucun nouveau menu (rien à déclarer dans
  `correctifs-affichage.js`), tests par le vrai chemin de l'écran qui retirent leurs données, un test d'écran à la fois, build
  `mvn -o -q -DskipTests package` puis `asadmin redeploy` sur le domaine autorisé par la session d'intégration.
- **Banc** : les tests de non-régression de calcul (cas 1 et 2) rejouent les ventes assurance du banc peuplé (`outils/banc/peupler_banc.py`)
  et comparent le net au franc près ; la copie locale `laborex_v1_db` sert aux tests d'écran.

## 2. Ordre proposé

| Ordre | Cas | Pourquoi d'abord | Taille estimée |
|------:|-----|------------------|----------------|
| 1 | **Cas 3** Ordonnancier | Le plus petit, indépendant de la vente, corrige au passage la NPE de `checkOrdonnancier` ; sert de rodage aux tests d'écran | 2 à 3 jours |
| 2 | **Cas 2** Prix / taux de référence | Ne touche pas au moteur de calcul ; la journalisation (Q2.6) profite aussi à la fiche article | 3 à 4 jours |
| 3 | **Cas 1** Ligne comptant | Le plus risqué (clôture VO, tickets) ; bénéficie des tests de calcul posés par le cas 2 | 5 à 7 jours |

Les trois cas touchent `VenteVNO.js` / `VenteCtr.js` (cas 1 et 2) et `SalesServiceImpl` (cas 1 et 3) : **un seul cas à la fois** sur ces
fichiers, le suivant ne démarre que quand le précédent est livré sur sa branche, pour éviter les conflits.

## 3. Cas 3 — Ordonnancier : produits et produits sensibles

### Lot 3.1 Règle centralisée et colonne (serveur)

1. Test rouge : clôture d'une vente dont un produit a `is_scheduled = 1` et `int_T` NULL ⇒ NullPointerException dans
   `SalesServiceImpl.checkOrdonnancier` (l. 2542).
2. Migration `V7.2.33` : `ALTER TABLE t_famille ADD COLUMN IF NOT EXISTS is_sensible TINYINT(1) NOT NULL DEFAULT 0`.
3. `dal/TFamille.java` : champ `sensible` ; `FamilleDTO` recopie.
4. Méthode unique `TFamille.estProduitOrdonnancier()` = `sensible || (scheduled && isNotBlank(intT))`, appelée par
   `SalesServiceImpl.checkOrdonnancier` et `SalesStatsServiceImpl.produitsOrdonnancier` (l. 1381). Le test rouge passe au vert.
5. Test de non-régression : sur le banc, la liste des ventes du registre et le détail sont identiques avant / après (aucun produit sensible).

### Lot 3.2 Services REST

- `rest/FicheArticleRessource.java`, sous `v1/fichearticle/ordonnancier` (modèle `account*`) :
  - `GET` paginé : `query`, `filtre` (`coches` / `noncoches` / `tous`), `champ` (`ordonnancier` / `sensible`), `rayon` ; renvoie CIP,
    désignation, prix, stock, `scheduled`, `intT`, `sensible` ;
  - `PUT {id}` `{champ, valeur}` : écrit `is_scheduled` ou `is_sensible` ;
  - `PUT lot` `{query, filtre, champ, valeur, simuler}` : renvoie le nombre si `simuler`, applique sinon.
- Droit : `P_SM_ORDONNANCIER` (celui du menu) pour lecture et écriture (Q3.4).
- Journal d'audit existant : une ligne « produit X coché/décoché sensible/ordonnancier par U » (Q3.5), sans donnée patient.

### Lot 3.3 Écran Ordonnancier

- `view/vente/Ordonnancier.js` (tabpanel l. 167-299) : deux onglets « Produits ordonnancier » et « Produits sensibles », chacun bâti sur
  le gabarit `configmanagement/famille/Products.js` (recherche, filtre, compteur, cochage unitaire enregistré au clic, boutons de lot en
  deux temps « Cocher N produits ? » → « Confirmer » dans le bouton). Onglet ordonnancier : badge « SANS CODE TABLEAU » quand `intT` vide.
- Barre de filtres commune (dates / médecin) masquée sur ces deux onglets au `tabchange`, rétablie sur Registre / Analyse.
- `controller/OrdonnancierCtrl.js` : chargement à la demande dans `surChangementOnglet`, handlers recherche / checkchange / lot.
- `app/model/Famille.js` : champ `sensible`.

### Lot 3.4 Vente et éditions

- Pastille sur la ligne de vente (`VenteVNO.js` renderer DESIGNATION ou colonne LG) : « ORDONNANCIER » fixe, « SENSIBLE » clignotante
  (3 pulsations puis fixe, `prefers-reduced-motion` ⇒ contour fixe). Le JSON de recherche produit renvoie déjà `scheduled`
  (`SearchProduitServcieImpl` l. 741/871) : ajouter `sensible` et `intT`. CSS dans `vente-theme.css`.
- Colonne « Motif » (Ordonnancier / Sensible) : `OrdonnancierLigneDTO`, `DetailProduitsVente.js`, `ordonnancier.jrxml`,
  `analyse_ordonnancier.jrxml`.

### Tests d'écran (un par un, données retirées)

1. Cocher un produit « sensible » dans l'onglet, l'ajouter à une vente comptant avec `KEY_GERE_ORDONCIER = 1` ⇒ pastille clignotante,
   clôture exige un médecin, la vente apparaît au registre avec motif « Sensible » ; décocher ⇒ tout redevient comme avant.
2. Produit ordonnancier sans code tableau ⇒ badge dans l'onglet, pas de médecin exigé (règle conservée), pas de plantage.
3. Cochage en lot sur un filtre : le bouton affiche le compte, confirme, applique ; « Décocher » remet l'état initial.

## 4. Cas 2 — Prix et taux de référence à la caisse

### Lot 2.1 Journal et services (serveur)

1. Migration `V7.2.34` : table `prix_reference_journal` (id, prix_reference_id, produit_id, tiers_payant_id, action
   AJOUT/MODIFICATION/SUPPRESSION, ancienne_valeur, nouvelle_valeur, ancien_taux, nouveau_taux, ancien_type, nouveau_type, utilisateur_id,
   date, vente_id origine NULL, poste) ; paramètre `KEY_PRIX_REF_CAISSE = 0`.
2. `PrixReferenceServiceImpl` : journalisation dans `add` / `update` / `delete` (fiche article **et** caisse, Q2.6) ; test unitaire : une
   ligne de journal par action, anciennes valeurs correctes.
3. `rest/PrixReferenceRessource.java` :
   - `GET v1/prix-reference/vente/{venteId}` : par ligne × tiers-payant de la vente `{detailId, tpId, libelle, valeur, taux, type,
     defaut:true/false, partTp}` ; `defaut` = aucune ligne `prix_reference`, valeur = prix de vente, taux = taux du compte client ;
   - `PUT v1/prix-reference/vente/{venteId}/ligne/{detailId}` `{tiersPayantId, valeur, taux}` : bornes serveur (entier, valeur 5..prix de
     vente, taux 5..100, 400 sinon), écrit `MIX_TAUX_PRIX` (Q2.3), journalise avec `vente_id`, relance le calcul du net et renvoie le net.
   - Refus 403 si `KEY_PRIX_REF_CAISSE = 0` (le chemin n'existe pas sans le paramètre).
4. `VenteDetailsDTO` : liste `referencesTp` (uniquement si paramètre actif, pour ne pas alourdir `deatails` sinon).
5. **Moteur inchangé** : `SalesNetComputingServiceImpl` et `TiersPayantCalculationService` ne sont pas touchés. Test de non-régression :
   net identique au franc près sur les ventes assurance du banc, paramètre à `0` puis à `1` sans saisie.

### Lot 2.2 Grille de vente

- `model/caisse/VenteItem.js` : champ `referencesTp`.
- `view/vente/VenteVNO.js` : si paramètre actif **et** type 2, colonnes groupées par tiers-payant (en-tête = libellé → P.REF | TAUX,
  70 px chacune), C.CIP fixé à 80 px, DESIGNATION `minWidth`, défilement horizontal au-delà de deux tiers-payants. Valeurs par défaut en
  gris italique. Les colonnes sont reconstruites à chaque changement de tiers-payants de la vente (ajout / retrait).
- `controller/VenteCtr.js` : `beforeedit` (type 2 et paramètre seulement), validation locale des bornes (cellule rouge + message sous la
  grille + ancienne valeur rétablie, **aucun appel serveur**), `edit` validé par Entrée ⇒ `PUT .../ligne/{detailId}` puis rafraîchit le
  net ; interception **avant** `onGridEdit` (l. 4082) pour qu'aucun `update/item/vno` ne parte. Retour du focus au champ produit.
- Libellé discret sous la grille rappelant la règle du minimum tant que le lot Q2.5 n'est pas livré.

### Lot 2.3 Fiche article

- `view/produits/PrixReference.js` : onglet ou grille « Journal » en lecture (`GET v1/prix-reference/{produitId}/journal`). Rien d'autre.

### Tests d'écran

1. Vente assurance à un tiers-payant, paramètre actif : saisir P.REF puis TAUX par Entrée ⇒ net recalculé, ligne `prix_reference`
   `MIX_TAUX_PRIX` créée, journal `AJOUT` avec la vente ; corriger ⇒ `MODIFICATION` ; supprimer en fiche ⇒ `SUPPRESSION`.
2. Saisies refusées (4, 101, prix > prix de vente, texte) ⇒ cellule rouge, valeur rétablie, aucune requête réseau.
3. Vente comptant et vente avec paramètre à `0` ⇒ grille identique au pixel (capture comparée).
4. Vente à deux tiers-payants ⇒ deux groupes, défilement, saisie sur le second écrit bien pour ce tiers-payant.

### Lot séparé Q2.5 (hors périmètre, à ouvrir après)

« Base de calcul par tiers-payant » dans `TiersPayantCalculationService.calculateSaleItem` (l. 191-193) avec jeu de ventes
multi-tiers-payants avant / après et annonce aux officines.

## 5. Cas 1 — Ligne au comptant dans une vente assurance

### Lot 1.1 Modèle et calcul (serveur)

1. Migration `V7.2.35` : `t_preenregistrement_detail.comptant TINYINT(1) NOT NULL DEFAULT 0` ; `t_preenregistrement.lg_VENTE_LIEE_ID
   VARCHAR(…) NULL` + index ; paramètre `KEY_LIGNE_COMPTANT_VO = 0`.
2. Entités `TPreenregistrementDetail`, `TPreenregistrement`, DTO `VenteDetailsDTO` (`comptant`), `VenteDTO` (`venteLiee`).
3. REST `PUT v1/vente/item/{id}/comptant {comptant}` (`SalesRessource`) : refus si type ≠ 2, si vente close, si paramètre à `0`, si la
   ligne porte une promotion (Q1.2) ; `update/item/vno` **préserve** le flag ; la mise en attente / reprise le conserve.
4. `SalesNetComputingServiceImpl.buildSaleItemInputs` : les lignes `comptant` sortent des entrées du moteur ; `MontantAPaye` reçoit
   `montantComptant` (somme P.U × qté des lignes cochées, remise produit comprise, Q1.1) ; net = part client + comptant. Le moteur
   (`TiersPayantCalculationService`) n'est pas modifié.
5. Test de non-régression : paramètre à `0` ou aucune ligne cochée ⇒ `calcule` renvoie exactement le même résultat qu'avant (banc).

### Lot 1.2 Scission à la clôture

1. Dans `updateVenteClotureAssurance` (l. 2962-3197), un seul point d'entrée : si paramètre actif **et** au moins une ligne cochée ⇒
   `scinderLignesComptant(vente)` ; sinon le code actuel, inchangé, s'exécute.
2. `scinderLignesComptant`, dans la transaction de clôture, sous le verrou `prendreVerrouCloture` déjà pris :
   - crée une vente VNO (même client, vendeur, caisse ; `lg_VENTE_LIEE_ID` ↔ réciproque), y déplace les lignes cochées (une ligne
     n'appartient qu'à une vente ⇒ déstockage unique) ;
   - clôture la VO sur les lignes restantes par le code actuel ;
   - clôture la VNO par `updateVenteClotureComptant` (sans reprendre le contrôle caisse / verrou) ;
   - impute le règlement : comptant d'abord, puis part client de la VO (Q1.3) ; la part client restante suit la règle actuelle (différé).
   - La reprise `apresEchecCloture` couvre les deux ventes (annulation complète si l'une échoue : une seule transaction JPA).
3. `cloturer/assurance` renvoie les deux ids et références.
4. Annulation / modification : rien (Q1.5) ; le détail de vente affiche « vente liée n° … » en lecture.
5. Tests : clôture VO sans ligne cochée ⇒ mêmes `MvtTransaction`, encours, recette, ticket (comparaison de lignes en base) ; clôture avec
   ligne cochée ⇒ deux ventes, stock décrémenté une fois par ligne, journal de caisse et facturation tiers-payant voient deux ventes
   ordinaires ; échec simulé pendant la clôture VNO ⇒ aucune des deux ventes n'est close.

### Lot 1.3 Tickets

- `ModeleTicket.VENTE_ASSURANCE` : lignes « Crédit : T[taux %] — Mont. : part » par ligne et par tiers-payant (Q1.9), uniquement si
  `KEY_LIGNE_COMPTANT_VO = 1` ; sans mention de la vente comptant.
- Nouveau modèle `ModeleTicket.VENTE_MIXTE` = ticket client combiné (deux ventes, lignes « LIGNE COMPTANT », un seul code-barres sur la VO,
  référence de la vente liée). `GenerateTicketServiceImpl`, `ConversionTicket`, `ImpressionServiceImpl`.
- `ticket/vo` imprime : exemplaires tiers-payant (assurance) + reçu caisse existant + ticket combiné à la place du ticket client simple
  quand il y a une vente liée. Test : rendu texte des trois tickets comparé à une référence.

### Lot 1.4 Écran

- `VenteItem.js` : champ `comptant`.
- `VenteVNO.js` : checkcolumn « C » 40 px créée **seulement si** paramètre actif, visible en type 2 seulement (cachée en 1 et 3, Q1.7) ;
  ligne cochée fond jaune pâle + pastille COMPTANT ; rail « DONT COMPTANT » et « DONT PART CLIENT ».
- `VenteCtr.js` : `checkchange` ⇒ PUT puis `net/assurance` ; promotion refusée sur une ligne cochée et case désactivée sur une ligne en
  promotion ; après clôture, bandeau « 2 ventes créées : VO-… et VNO-… » (toast, pas de fenêtre) ; impression des tickets.

### Tests d'écran

1. Paramètre à `0` : écran de vente assurance identique au pixel, clôture inchangée.
2. Paramètre à `1`, vente à un tiers-payant, une ligne cochée avec remise 5 % : rail DONT COMPTANT / DONT PART CLIENT, clôture ⇒ deux
   ventes, deux tickets, imputation comptant d'abord ; annuler la VNO ne touche pas la VO.
3. Cocher une ligne en promotion ⇒ refus visible ; passer en type Carnet ⇒ colonne cachée.
4. Mise en attente puis reprise ⇒ la coche survit.

## 6. Livraison et recette

- Chaque cas : branche, tests verts (unitaires + écran), capture avant / après avec le paramètre à `0`, note dans
  `docs/notices/` (règles, paramètre, journal), puis remise à la session d'intégration.
- Recette officine : activer le paramètre sur un poste pilote seulement, une semaine, avant généralisation.
- Après les trois cas : reprendre le cas 4 (lot « sans code » d'abord) et trancher Q2.5.

## 7. Points encore à confirmer avant de coder

| # | Point | Hypothèse retenue si pas de réponse |
|---|-------|-------------------------------------|
| C1 | Q2.3 « infos sur le grossiste » | lu comme « référence déjà saisie pour ce tiers-payant » |
| C2 | Borne P.REF ≤ prix de vente | appliquée (sinon seulement ≥ 5 comme la fiche) |
| C3 | Cas 1 : remise produit sur une ligne cochée saisie avant / après la coche | conservée telle quelle, recalculée sur la vente VNO |
| C4 | Cas 3 : journal d'audit des cochages (Q3.5) | oui, journal existant |

## 8. État au 04/11/2026

| Cas | Branche de session | Commits | Intégré dans `origin/integration/recette-2026-10-29` |
|-----|--------------------|---------|-------------------------------------------------------|
| 3 | `refs/heads/PRES-/happy-almeida-e382ca` | lots 3.1 à 3.4, migration `V7.2.33`, 27/27 tests d'écran | oui |
| 2 | `refs/heads/PRES-/quirky-shtern-c8f3ea` | lots 2.1 à 2.3, migration `V7.2.34`, 4 tests d'écran, net 8/8 | oui, sauf le commit `1346c506` (largeurs de la grille, retours du 04/11), présent sur `PRES-/integration-cas-1-2-3` |
| 1 | `refs/heads/PRES-/vigorous-northcutt-ec550e` | lots 1.1 à 1.4, migration `V7.2.35`, 5 tests d'écran | oui |

Vérifié sur les commits : le moteur `TiersPayantCalculationService` n'est touché par aucun des trois cas ; le cas 1 modifie seulement
`SalesNetComputingServiceImpl` (exclusion des lignes cochées, lot 1.1), comme prévu.

Compléments décidés en cours de réalisation :

- **Q2.5 tranché** : la base de calcul par tiers-payant part dans un **lot séparé**, derrière un paramètre `KEY_PRIX_REF_BASE_PAR_TP`
  (défaut `0`), à lancer après le cas 1. Jusque-là le rappel de la règle du minimum reste sous la grille.
- **Déploiement, cas 3** : le dossier `D:\CONF\LABOREX\REPORTS` du poste prime sur les modèles du WAR. Le `ordonnancier.jrxml` livré doit y
  être copié (et le `.jasper` compilé retiré) sur chaque poste, sinon la colonne Motif n'apparaît pas dans le PDF. Sur le poste local, les
  anciens fichiers sont conservés en `*.avant-cas3`.
- **Tests d'écran du cas 1** : l'imprimante PDF du poste prend une à deux minutes par ticket ; les tests attendent jusqu'à quatre minutes
  et comptent les exemplaires dans le journal serveur.
- Les tests d'écran n'ont pas été rejoués sur la branche d'intégration après fusion ; à faire avant recette.

### Lot Q2.5 livré (04/11/2026)

Branche `refs/heads/PRES-/quizzical-solomon-415068`, trois commits (`cab9b056b`, `8d5106f3a`, `ad63efa12`), base `origin/integration/recette-2026-10-29`,
non fusionnée. Migration `V7.2.36` (paramètre `KEY_PRIX_REF_BASE_PAR_TP`, défaut `0`) ; moteur `TiersPayantCalculationService` et
`SalesNetComputingServiceImpl` modifiés **derrière le paramètre**, règle du minimum figée par un jeu de tests et identique au franc près à `0` ;
rappel du minimum masqué sous la grille à `1` ; test d'écran à deux tiers-payants 20/20 ; notice `docs/notices/NOTICE_PRIX_REFERENCE_BASE_PAR_TP.md`.
Paramètre remis à `0` sur la base locale.

## 9. Cas 4 — plan validé le 05/11/2026 (les six recommandations Q4.1 à Q4.6 sont acceptées telles quelles)

Paramètre `KEY_SECURITE_BASE` (défaut `0`) : tant qu'il est à `0`, l'onglet Sécurité n'existe pas et la sauvegarde lit `domain.xml` comme
aujourd'hui. Chaque lot est livrable seul et réversible.

| Lot | Contenu | Code | Durée |
|-----|---------|------|-------|
| 4.0 Sans code | Audit du `SAUVEGARDE_COMPRESSION.bat` du serveur ; MariaDB en écoute locale ou liste blanche (S7) ; compte `prestige_sauvegarde` pour les scripts PowerShell (déjà prévu par `2-configurer-mariadb.ps1 -CreerCompte`) ; rotation manuelle une fois. | non | ½ jour sur place |
| 4.A Stockage | `JdbConnexion` → DataSource JNDI (S4), filtrage de l'URL dans les journaux ; sauvegarde Java et valorisation sur compte dédié avec `.cnf` chiffré DPAPI (S5) ; `fichierPrive()` avec ACL Windows. Test : sauvegarde horaire et valorisation identiques avant / après, écrans JSP un par un sur le banc. | oui | 3 à 4 jours |
| 4.B Écran | Onglet « Sécurité » du Centre de support (`superAdmin()`) : état, rotation en un bouton (Générer / Saisir), alias Payara (S2), purge des copies `domain.xml.avant-prestige-*`, journal `t_securite_journal` sans valeur. Rotation transactionnelle : test de connexion puis retour arrière par `ALTER USER` inverse si échec. | oui | 3 jours |
| 4.C Archives | Archives `.sql.gz` chiffrées (S6), RAR/7z avec mot de passe, binlogs chiffrés ; essai de restauration adapté. | oui + scripts | 2 jours |

### Questions ouvertes et recommandation

| # | Question | Recommandation |
|---|----------|----------------|
| Q4.1 | Qui lance une rotation ? | Super-admin seulement, avec re-saisie de son mot de passe de session dans le même formulaire. |
| Q4.2 | Compte MariaDB de rotation (`ALTER USER`) | Saisi à chaque rotation, jamais stocké. |
| Q4.3 | Clé des archives chiffrées | Mot de passe d'archive choisi par le pharmacien, conservé hors serveur (papier au coffre) ; le support à distance le demande au pharmacien pour restaurer. |
| Q4.4 | Master password Payara | La changer avec `--savemasterpassword=true` (démarrage en service Windows conservé, protection par ACL) ; `false` écarté. |
| Q4.5 | Supprimer le chemin JDBC direct ? | Oui (S4), après inventaire des usages hors Payara (`InvoiceServlet`, outils en ligne de commande) ; aucun connu à ce jour. |
| Q4.6 | Politique de rotation | À chaque départ d'employé et tous les 6 mois ; rappel dans l'onglet Sécurité quand la dernière rotation a plus de 6 mois. |

Ordre : 4.0 dès maintenant sur place (sans moi), puis 4.A, 4.B, 4.C. Le lot 4.B dépend de 4.A (la sauvegarde ne doit plus lire
`domain.xml` avant de poser l'alias Payara).

### Lot 4.A scindé (décision du 05/11/2026)

| Sous-lot | Contenu | Risque | Vérification |
|----------|---------|--------|--------------|
| 4.A1 Sauvegarde | Sauvegarde Java et valorisation sur compte dédié `prestige_sauvegarde`, `.cnf` chiffré DPAPI dans un dossier à ACL restreinte, `fichierPrive()` avec ACL Windows, nettoyage des `.cnf` orphelins au démarrage. Derrière `KEY_SECURITE_BASE` ; à 0, lecture de `domain.xml` inchangée. | faible | Dump du compte dédié comparé au dump actuel sur le banc (tables, lignes, routines, vues, événements, triggers) ; sauvegarde horaire et valorisation identiques avant / après ; alerte dans `t_sauvegarde` si le `.cnf` est illisible. |
| 4.A2 JNDI | `JdbConnexion` → DataSource JNDI non-XA, autocommit vérifié, repli sur l'ancien chemin XML si le `lookup` échoue ; filtrage de l'URL dans les journaux. Précédé de l'inventaire Q4.5 (usages hors Payara) et des `jconnexion` sans `close()`. | moyen | Écrans JSP un par un sur le banc ; `max-pool-size` et `leak-timeout` réglés ; essai de charge sur `domain2` pour l'épuisement du pool. Sur le poste local le paramètre reste à 0 (deux bases voulues). |

Ordre : 4.A1 puis 4.A2, chacun livrable seul.

**Q4.1 à Q4.6 validées le 05/11/2026** telles que recommandées ci-dessus. Le lot 4.0 (sans code) est à faire sur place ; 4.A1 peut démarrer.

### Lot 4.A livré (05/11/2026)

Branche `refs/heads/PRES-/determined-khayyam-d98c43`, trois commits (`83bbc241a`, `553106b49`, `2da428bcf`), base `origin/integration/recette-2026-10-29`,
**non fusionnée** (fusion après tests verts, sur décision de l'utilisateur). Migration `V7.2.38` (`KEY_SECURITE_BASE`, défaut `0`) ;
`JdbConnexion` par le pool JNDI à `1` et connexion directe à `0` (vérifié dans le journal de domain3) ; sauvegarde et valorisation sur
compte dédié chiffré DPAPI (`IdentifiantsBaseService`, `outils/officine/identifiants-sauvegarde.ps1`) ; ACL Windows réelles ; scripts
officine chiffrés ; notice `docs/notices/NOTICE_SECURITE_BASE_LOT_A.md`. Tests : unitaires verts, test d'écran 17/17, deux écrans
existants 9/9 et 4/4 à `1` sur domain3 ; paramètre remis à `0`. Vérification ici : aucun secret dans les lignes ajoutées, `D:\CONF\LABOREX\CONF`
jamais ouvert. Prochain : lot 4.B (écran Sécurité, alias Payara, rotation), qui dépend de 4.A.
