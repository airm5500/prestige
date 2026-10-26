# Inventaire des JSP et plan de passage en API REST (26/10/2026)

Objectif : préparer le passage complet de Prestige en API REST, la montée de version (JDK 17 ou 21, Payara 6 /
Jakarta EE 10), puis une architecture Spring Boot et Angular. Ce document est un inventaire et un plan : **aucun code
de l'application n'a été modifié**.

Fichiers joints :

| Fichier | Contenu |
|---|---|
| `docs/notices/INVENTAIRE_JSP_MIGRATION_REST_2026-10-26.md` | ce rapport |
| `docs/notices/INVENTAIRE_JSP_MIGRATION_REST_2026-10-26_ANNEXE.md` | **les preuves** : pour chaque JSP, ses appels (fichier:ligne) et la chaîne écran → menu |
| `docs/notices/INVENTAIRE_JSP_MIGRATION_REST_2026-10-26.tsv` | une ligne par JSP (classe, taille, encodage, actions, appelants, écrans) |
| `docs/notices/INVENTAIRE_JSP_MIGRATION_REST_2026-10-26_API.tsv` | les 1 597 points REST (verbe, chemin, méthode, classe:ligne) |
| `outils/inventaire-jsp/inventaire-jsp.js` | le script qui produit l'annexe, le TSV et les tableaux (Node, lecture seule) |
| `outils/inventaire-jsp/menus-base-locale.tsv` | libellés des menus : export en lecture seule de `t_menu` / `t_sous_menu` de la copie locale `laborex_v1_db` (aucune donnée nominative) |

Relancer l'inventaire : `node outils/inventaire-jsp/inventaire-jsp.js <dossier-de-sortie>` (15 s environ).

## 0. En bref

- **557 JSP** dans `src/main/webapp`. **321 sont vivantes** (310 atteintes depuis un menu actif, 11 hors menu),
  soit 45 786 lignes. **236 ne servent plus** dans la configuration actuelle : 189 mortes (aucun appel effectif),
  25 seulement atteintes par des écrans que rien n'ouvre, 22 seulement par des menus désactivés, supprimés ou masqués.
- **137 entrées de sous-menu** appellent encore au moins une JSP, plus **25 écrans secondaires** (ouverts en entier depuis un
  écran de menu). Priorités proposées : **54 en P1** (lecture et impression, ou REST déjà écrit), **37 en P2**
  (écritures hors flux sensibles), **26 en P3** (vente, caisse, règlements, factures, stock, commandes), 17 inactifs, 3 sans JSP propre (elles
  passent par un écran secondaire).
- La bascule est déjà bien engagée : **1 597 points REST** dans 175 classes (`api/v1`), et l'interface ExtJS cite
  `api/v1` 1 856 fois contre 1 259 citations de JSP. **40 JSP vivantes ont déjà un équivalent REST** cité dans le
  Java : il reste à faire pointer les écrans dessus.
- Le gros du reste est un **socle commun** : quelques fenêtres partagées (création de client, ayant droit, tiers
  payant, détail de vente) tirent les mêmes JSP dans 20 à 38 écrans. Les migrer d'abord retire des JSP de dizaines
  d'écrans à la fois.
- **Freins à la montée de version** : 550 JSP sur 557 passent par `dataManager` (EclipseLink, unité `DALPU`, sans
  JTA) et 502 importent directement des classes `bll.*` ; le Java emploie `javax.*` dans des centaines de fichiers
  (`javax.ejb` 585, `javax.persistence` 536, `javax.servlet` 226, `javax.xml.bind` 218, `javax.ws.rs` 192) ; deux
  fournisseurs JPA cohabitent (Hibernate 5.4 pour `JTA_UNIT`, EclipseLink pour `DALPU`) ; plusieurs bibliothèques
  sont trop anciennes pour Jakarta EE 10 ou JDK 21 (§ 8).
- **156 appels visent des JSP absentes du dépôt** (100 chemins distincts) : code mort ou fonctions cassées, à
  traiter à part (§ 6).

## 1. Méthode, sources et limites

**Sources.** Le code de la branche (commit `31622a33`), sans Payara : vues, contrôleurs et stores ExtJS
(`src/main/webapp/general/app`), pages HTML et JSP, Java (`src/main/java`), migrations Flyway, et
`correctifs-affichage.js`. Les libellés des anciens menus n'existent qu'en base : ils viennent d'un export en lecture
seule de la copie locale (`outils/inventaire-jsp/menus-base-locale.tsv`, 291 sous-menus), fourni par la session
principale. Aucune écriture en base, aucun redéploiement.

**Chaîne de preuve.** Pour chaque JSP, le script :

1. relève toute chaîne `xxx.jsp` hors commentaire dans les `.js`, `.jsp`, `.html` et `.java`, et la résout en chemin
   (chemin écrit, variable concaténée, variable globale `var url_… = '…jsp'` employée dans un autre fichier) ;
   une URL rangée dans une variable que rien ne lit ne compte pas ;
2. rattache le fichier appelant à ses classes ExtJS (`Ext.define`, `alias`, `xtype`) et remonte le graphe « A ouvre
   ou contient B » (`xtype:`, `Ext.create`/`new testextjs…`, `onLoadNewComponent`, `var xtype = …`, contrôleur → vues
   par ses sélecteurs, `App.ecranReel`) jusqu'à un écran de menu (`t_sous_menu.str_COMPOSANT`), un point d'entrée de
   la coquille (en-tête, arbre des menus, accueil) ou un écran que rien n'ouvre ;
3. écrit la chaîne avec le fichier et la ligne de chaque pas dans l'annexe. Exemple :
   `webservices/stockmanagement/ajustementmanagement/ws_generate_pdf.jsp` est appelée par
   `app/controller/AjusteListCtr.js:207` ; ce contrôleur pilote `app/view/produits/AjustementTabPanel.js`
   (`AjusteListCtr.js:8`), dont le xtype `ajustementmanager` est le composant du sous-menu **GESTION DU STOCK >
   Ajustement du Stock** (`menus-base-locale.tsv:139`).

**Classes.**

| Classe | Définition |
|---|---|
| menu actif | au moins un écran ouvert par un sous-menu actif (`enable`) et non masqué |
| hors menu | appelée par la coquille (en-tête, arbre des menus), une page vivante (`index.jsp`, `general/index.jsp`, page de connexion) ou du Java |
| menu inactif ou masqué | seulement par des sous-menus `disable`/`delete` dans la copie locale, ou masqués par `MENUS_MASQUES` |
| orpheline | seulement par des écrans ExtJS qu'aucun menu ni aucun autre écran n'ouvre |
| morte | aucun appel, ou seulement en commentaire, ou seulement dans une variable jamais lue, ou seulement par des JSP mortes |

**Limites (à garder en tête avant toute suppression).**

- Analyse statique : une fonction JavaScript jamais appelée qui contient une URL compte comme un appel. Cas relevé à
  la main : `webservices/usermanagement/ws_login.jsp` n'est appelée que par `Doconnexion` (`app/controler.js:5`), et
  `Doconnexion` n'est appelée nulle part ; la connexion passe par `api/v1/user/auth` (`app/controler.js:87`). Elle
  est donc **en pratique morte**, bien que classée « hors menu » par le script.
- Une fenêtre partagée (ex. création de client) transmet ses JSP à tous les écrans qui l'ouvrent : c'est voulu (la
  migration de la fenêtre libère ces écrans), mais les volumes par écran sont des majorants.
- L'état des menus vient de **la copie locale** : une autre officine peut avoir activé un menu désactivé ici
  (ex. FACTURATION > Règlement différé est `disable` en local). Ces JSP sont classées « menu inactif », pas mortes :
  **à vérifier à l'écran** ou dans la base de chaque officine avant tout retrait.
- Les JSP `webservices/MOBILES/*` n'ont aucun appelant dans le dépôt ; une ancienne application mobile pourrait encore
  les appeler : **à vérifier dans les journaux d'accès de Payara** avant tout retrait.
- Les libellés sont ceux de la base (`str_DESCRIPTION`). Le titre de l'onglet peut différer (`App.titreEcran`) :
  **à vérifier à l'écran** si un écart gêne.

**Écart avec l'inventaire du 13/10** (`docs/plans/INVENTAIRE_JSP_2026-10-13.md`, 398 « citées ») : il comptait toute
citation, y compris en commentaire (43 JSP), dans une variable jamais lue (25), dans un écran que rien n'ouvre (25)
ou derrière un menu inactif (22). Il ne reliait pas les JSP aux menus.

## 2. Bilan par classe

| Classe | JSP |
|---|---|
| menu actif | 310 |
| hors menu | 11 |
| menu inactif ou masqué | 22 |
| orpheline (écran sans entrée) | 25 |
| morte : aucun appel | 120 |
| morte : appel seulement en commentaire | 43 |
| morte : URL déclarée mais jamais employée | 25 |
| morte : appelée seulement par une JSP morte | 1 |
| **Total** | **557** |

Profil des 321 JSP vivantes : 114 écrivent en base, 69 produisent un PDF par JasperReports (`report.reportManager`),
72 font du JDBC direct (`jconnexion`, `java.sql`), 65 sont encodées en ISO-8859-1 (ne pas les réécrire : les
migrer, puis les laisser en place).

## 3. Menus et écrans

Lecture des tableaux :

- **JSP** : JSP propres à l'écran et à ses fenêtres ; « + ouvre `x` » renvoie aux écrans secondaires (fin de section).
- **Actions** : déduites du nom de la JSP et des modes qu'elle lit (`mode=create|update|delete…`).
- **API REST déjà appelées** : appels `api/v1/…` présents dans les fichiers de l'écran (écran, fenêtres, stores,
  contrôleur) ; une valeur non nulle signifie une migration déjà entamée : il « manque » les JSP de la colonne JSP.
- **Complexité** : points par JSP (1, +1 au-delà de 150 lignes, +1 au-delà de 400, +2 si elle écrit, +1 Jasper,
  +1 JDBC direct, +1 au-delà de 5 modes), sommés sur l'écran. Faible ≤ 4, moyenne ≤ 12, forte au-delà.
- **Risque** : élevé si l'écran écrit sur un flux sensible (vente, caisse, règlement, facture, différé, tiers payant,
  stock, inventaire, ajustement, commande, bon, retour, dépôt, rétrocession, périmés) ; moyen s'il écrit ailleurs ;
  faible en lecture et impression seules.
- **Priorité** : P1 = risque faible ou toutes les JSP déjà doublées par du REST ; P2 = risque moyen ; P3 = risque
  élevé ; aucune priorité pour un menu désactivé, supprimé ou masqué.

Le détail (chaque JSP, chaque preuve fichier:ligne) est dans l'annexe.

### Synthèse

| Menu | Écrans avec JSP | JSP distinctes (propres aux écrans) | P1 | P2 | P3 | Inactifs |
|---|---|---|---|---|---|---|
| ANALYSE DE GESTION | 25 | 49 | 17 | 0 | 0 | 8 |
| CONFIGURATION | 5 | 9 | 0 | 5 | 0 | 0 |
| FACTURATION | 7 | 45 | 2 | 0 | 4 | 1 |
| GESTION CLIENT | 1 | 24 | 0 | 1 | 0 | 0 |
| GESTION COURANTE | 7 | 22 | 2 | 2 | 3 | 0 |
| GESTION DES COMMANDES | 12 | 53 | 5 | 0 | 5 | 2 |
| GESTION DES TIERS-PAYANTS | 19 | 75 | 3 | 7 | 6 | 1 |
| GESTION DES UTILISATEURS | 5 | 17 | 0 | 4 | 0 | 1 |
| GESTION DU STOCK | 18 | 89 | 10 | 2 | 4 | 1 |
| GESTION STOCK | 3 | 4 | 1 | 0 | 1 | 1 |
| NOTIFICATIONS | 2 | 24 | 0 | 2 | 0 | 0 |
| PARAMETRAGES | 27 | 76 | 10 | 14 | 1 | 2 |
| RETROCESSION | 2 | 33 | 0 | 0 | 2 | 0 |
| SERVICE CLIENT | 4 | 6 | 4 | 0 | 0 | 0 |

### ANALYSE DE GESTION

| Sous-menu (écran) | JSP | Actions | API REST déjà appelées par l'écran | Complexité | Priorité |
|---|---|---|---|---|---|
| Tableau pharmacien (`recaptableaupharma`) | `Report/RuptureStock/ws_data.jsp` | autre, lecture | aucune | faible (1 pts), risque faible | P1 |
| Statistiques sur TVA (`statistiqueTVA`) | `Report/statistictva/ws_data.jsp`<br>`Report/statistictva/ws_statistiqueTVA_pdf.jsp` | impression, lecture | aucune | faible (4 pts), risque faible | P1 |
| Fréquentation officine (`analyseFrequentationOffManager`) | `Report/visitorstatistics/ws_visitorstatistics_pdf.jsp` | impression, lecture | 1 (`frequentation-horaire`) | faible (4 pts), risque faible | P1 |
| Journal Recette (`journalrecettemanager`) | `sm_user/journalrecette/ws_data.jsp` | autre, lecture | aucune | faible (4 pts), risque faible | P1 |
| Achats Mensuels Produits (`achatproduitManager`) | `Report/achatproduits/ws_achatproduct_pdf.jsp`<br>`Report/achatproduits/ws_data.jsp` | impression, lecture | aucune | moyenne (5 pts), risque faible | P1 |
| Vente / stock famille (`analyseventemanager`) | `Report/analyseventestock/ws_analyseventestock_pdf.jsp`<br>`Report/analyseventestock/ws_data.jsp` | autre, impression, lecture | aucune | moyenne (5 pts), risque faible | P1 |
| Comparaison CA familles (`comparaisonChiffreAffaireManager`) | `Report/comparaisonChiffreAffaire/ws_cafamille_pdf.jsp`<br>`Report/comparaisonChiffreAffaire/ws_data.jsp` | autre, impression, lecture | aucune | moyenne (5 pts), risque faible | P1 |
| Activité opérateurs (`statActiviteOperateurManager`) | `Report/Operateur/ws_data.jsp`<br>`Report/Operateur/ws_operateur_pdf.jsp` | autre, impression, lecture | aucune | moyenne (5 pts), risque faible | P1 |
| Statistique des achats (`orderstatscmp`) | `Report/qtyorder/ws_years.jsp`<br>`Report/statsAchats/ws_data.jsp`<br>`Report/statsAchats/ws_generate_pdf.jsp` | impression, lecture | aucune | moyenne (5 pts), risque faible | P1 |
| Rapport  de Gestion (`RapportGestions`) | `Report/RapportGestions/ws_data.jsp`<br>`Report/RapportGestions/ws_rapportgestion_pdf.jsp` | autre, impression, lecture | aucune | moyenne (5 pts), risque faible | P1 |
| Rétrocessions (`RetrocessionsManager`) | `Report/Retrocessions/ws_data.jsp`<br>`Report/Retrocessions/ws_retrocessions_pdf.jsp` | autre, impression, lecture | aucune | moyenne (5 pts), risque faible | P1 |
| Ruptures de stock (`RuptureStockManager`) | `Report/RuptureStock/ws_data.jsp`<br>`Report/RuptureStock/ws_rupture_pdf.jsp` | autre, impression, lecture | aucune | moyenne (5 pts), risque faible | P1 |
| Ventes mensuelles client (`venteavoirclientkmanager`) | `Report/venteavoirclient/ws_data.jsp`<br>`Report/venteavoirclient/ws_venteavoirclient_pdf.jsp` | impression, lecture | aucune | moyenne (5 pts), risque faible | P1 |
| Ventes mensuelles société (`ventesocieteManager`) | `Report/ventessocietes/ws_data.jsp`<br>`Report/ventessocietes/ws_ventessocietes_pdf.jsp` | impression, lecture | aucune | moyenne (5 pts), risque faible | P1 |
| Achats fournisseurs (`achatfourManager`) | `Report/achatfournisseur/ws_achatfour_pdf.jsp`<br>`Report/achatfournisseur/ws_data.jsp` | autre, impression, lecture | aucune | moyenne (6 pts), risque faible | P1 |
| Statistiques des ventes (`statistiqueventemanager`) | `Report/statistiquevente/ws_cumul_data.jsp`<br>`Report/statistiquevente/ws_data.jsp`<br>`Report/statistiquevente/ws_graphe_data.jsp`<br>`Report/statistiquevente/ws_statistiquevente_pdf.jsp` | impression, lecture | aucune | moyenne (7 pts), risque faible | P1 |
| Récapitulatif activité (`activitiessummary`) | `Report/recapactivities/ws_achats.jsp`<br>`Report/recapactivities/ws_credits.jsp`<br>`Report/recapactivities/ws_generate_pdf.jsp`<br>… 6 JSP | impression, lecture | 1 (`recap/activites`) | moyenne (9 pts), risque faible | P1 |
| Liste des abandons et annulation — *delete* (`AbandonEtAnnulationManager`) | `sm_user/detailsvente/ws_data.jsp`<br>`sm_user/detailsvente/ws_transaction.jsp`<br>`sm_user/famille/ws_data.jsp`<br>`sm_user/typereglement/ws_data.jsp`<br>+ ouvre `doventeretrocessionmanager` | autre, creation, lecture, modification, suppression | aucune | moyenne (10 pts), risque moyen | — (menu inactif) |
| Balance vente caisse — *delete* (`BalanceVenteCaisseManager`) | `sm_user/detailsvente/ws_data.jsp`<br>`sm_user/detailsvente/ws_transaction.jsp`<br>`sm_user/famille/ws_data.jsp`<br>`sm_user/typereglement/ws_data.jsp`<br>+ ouvre `doventeretrocessionmanager` | autre, creation, lecture, modification, suppression | aucune | moyenne (10 pts), risque eleve | — (menu inactif) |
| Liste de caisse detaillée — *delete* (`ListeDeCaisseDetailleManager`) | `sm_user/detailsvente/ws_data.jsp`<br>`sm_user/detailsvente/ws_transaction.jsp`<br>`sm_user/famille/ws_data.jsp`<br>`sm_user/typereglement/ws_data.jsp`<br>+ ouvre `doventeretrocessionmanager` | autre, creation, lecture, modification, suppression | aucune | moyenne (10 pts), risque eleve | — (menu inactif) |
| Liste differes clients — *delete* (`listeDiffereClientManager`) | `sm_user/detailsvente/ws_data.jsp`<br>`sm_user/detailsvente/ws_transaction.jsp`<br>`sm_user/famille/ws_data.jsp`<br>`sm_user/typereglement/ws_data.jsp`<br>+ ouvre `doventeretrocessionmanager` | autre, creation, lecture, modification, suppression | aucune | moyenne (10 pts), risque eleve | — (menu inactif) |
| Balance agee detaillée — *delete* (`BalanceAgeDetailleManager`) | `Report/BalanceAgeDetaille/ws_data.jsp`<br>`Report/BalanceAgeDetaille/ws_transaction.jsp`<br>`sm_user/detailsvente/ws_data.jsp`<br>… 6 JSP<br>+ ouvre `doventeretrocessionmanager` | autre, creation, lecture, modification, suppression | aucune | moyenne (12 pts), risque moyen | — (menu inactif) |
| Balance agée par org. — *delete* (`BalanceAgeOrganismeManager`) | `Report/BalanceAgeOrganisme/ws_data.jsp`<br>`Report/BalanceAgeOrganisme/ws_transaction.jsp`<br>`sm_user/detailsvente/ws_data.jsp`<br>… 6 JSP<br>+ ouvre `doventeretrocessionmanager` | autre, creation, lecture, modification, suppression | aucune | moyenne (12 pts), risque moyen | — (menu inactif) |
| Dossier en attente d'edition — *delete* (`DossierEnAttenteEditionManager`) | `Report/DossierEnAttenteEdition/ws_data.jsp`<br>`Report/DossierEnAttenteEdition/ws_transaction.jsp`<br>`sm_user/detailsvente/ws_data.jsp`<br>… 6 JSP<br>+ ouvre `doventeretrocessionmanager` | autre, creation, lecture, modification, suppression | aucune | moyenne (12 pts), risque moyen | — (menu inactif) |
| Journal des ventes — *delete* (`journaldesventesmanager`) | `Report/journaldesventes/ws_data.jsp`<br>`Report/journaldesventes/ws_transaction.jsp`<br>`sm_user/detailsvente/ws_data.jsp`<br>… 6 JSP<br>+ ouvre `doventeretrocessionmanager` | autre, creation, lecture, modification, suppression | aucune | moyenne (12 pts), risque eleve | — (menu inactif) |

### CONFIGURATION

| Sous-menu (écran) | JSP | Actions | API REST déjà appelées par l'écran | Complexité | Priorité |
|---|---|---|---|---|---|
| Menu (`menumanager`) | `sm_user/menu/ws_transaction.jsp`<br>`sm_user/module/ws_data.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (7 pts), risque moyen | P2 |
| Module (`modulemanager`) | `sm_user/module/ws_data.jsp`<br>`sm_user/module/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (7 pts), risque moyen | P2 |
| Type Depense (`typedepensemanager`) | `sm_user/typedepense/ws_data.jsp`<br>`sm_user/typedepense/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (7 pts), risque moyen | P2 |
| Type Recette (`typerecettemanager`) | `sm_user/typerecette/ws_data.jsp`<br>`sm_user/typerecette/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (7 pts), risque moyen | P2 |
| Sous-menu (`sousmenumanager`) | `sm_user/sous_menu/ws_data.jsp`<br>`sm_user/sous_menu/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (8 pts), risque moyen | P2 |

### FACTURATION

| Sous-menu (écran) | JSP | Actions | API REST déjà appelées par l'écran | Complexité | Priorité |
|---|---|---|---|---|---|
| Dossiers à facturer (`factureenattenteedition`) | `sm_user/journalvente/ws_generate_facture_attente_edition.jsp` | impression | 2 (`client/tiers-payants`, `facture-tiers-payant/dossiers-en-attente/list`) | faible (3 pts), risque faible | P1 |
| Liste des Différés Client (`diffmanager`) | `sm_user/diffclient/ws_data.jsp`<br>`sm_user/diffclient/ws_generate_pdf.jsp`<br>`sm_user/famille/ws_data.jsp` | autre, impression, lecture | aucune | moyenne (6 pts), risque faible | P1 |
| Factures provisoires (`factureprovisoire`) | `configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>`configmanagement/client/ws_transaction.jsp`<br>… 8 JSP<br>+ ouvre `doreglementmanager` | autre, creation, impression, lecture, modification, suppression | 9 (`client/tiers-payants`, `facturation`, …) | forte (28 pts), risque eleve | P3 |
| Factures (`facturemanager`) | `configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>`configmanagement/client/ws_transaction.jsp`<br>… 19 JSP<br>+ ouvre `addeditfacture`, `detailbon`, `detailbon`, `detailfacture`, `detailfacture`, `detailfacture`, `detailfacturefournisseur`, `detailfacturefournisseur`, `doreglementmanager` | autre, creation, ecriture (mode non lisible), impression, lecture, modification, suppression | 22 (`app-params/detail`, `client/gestion/tiers-payants`, …) | forte (62 pts), risque eleve | P3 |
| Factures Compagnies Ass (`groupeInvoices`) | `configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>`configmanagement/client/ws_data.jsp`<br>… 23 JSP<br>+ ouvre `doreglementmanager` | autre, creation, impression, lecture, modification, suppression | 22 (`app-params/detail`, `client/gestion/tiers-payants`, …) | forte (73 pts), risque eleve | P3 |
| Liste des Reglements (`reglementmanager`) | `configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>`configmanagement/client/ws_data.jsp`<br>… 29 JSP | autre, creation, impression, lecture, modification, suppression | 19 (`app-params/detail`, `client/gestion/tiers-payants`, …) | forte (82 pts), risque eleve | P3 |
| Règlement différé — *disable* (`deferredpayment`) | `sm_user/defferredpayment/ws_client_data.jsp`<br>`sm_user/defferredpayment/ws_data.jsp`<br>`sm_user/defferredpayment/ws_deferredpayment_pdf.jsp`<br>`sm_user/defferredpayment/ws_details_deffered.jsp`<br>+ ouvre `editderredpayment` | autre, impression, lecture | 2 (`app-params/detail`, `client/gestion/tiers-payants`) | moyenne (7 pts), risque faible | — (menu inactif) |

### GESTION CLIENT

| Sous-menu (écran) | JSP | Actions | API REST déjà appelées par l'écran | Complexité | Priorité |
|---|---|---|---|---|---|
| Sms (`outboudmessagemanager`) | `configmanagement/ayantdroit/ws_data.jsp`<br>`configmanagement/ayantdroit/ws_transaction.jsp`<br>`configmanagement/categorieayantdroit/ws_data.jsp`<br>… 24 JSP | autre, creation, lecture, modification, suppression | 4 (`ayants-droits`, `sms/sortants`, …) | forte (66 pts), risque moyen | P2 |

### GESTION COURANTE

| Sous-menu (écran) | JSP | Actions | API REST déjà appelées par l'écran | Complexité | Priorité |
|---|---|---|---|---|---|
| Balance Vente/Caisse (`ventecaissemanager`) | `sm_user/balance/ws_mvts.jsp` | lecture | aucune | faible (1 pts), risque faible | P1 |
| Gestion Caisse (`gestcaissemanager`) | `sm_user/gestcaisse/ws_generate_pdf.jsp` | impression | 5 (`caisse/analyse-ecarts`, `caisse/resumecaisse`, …) | faible (3 pts), risque faible | P1 |
| Articles vendus récap (`articlevendurecapitulatif`) | `sm_user/suggerercde/ws_transaction.jsp`<br>`sm_user/utilisateur/ws_data.jsp` | autre, creation, lecture, modification | 9 (`common/grossiste`, `common/rayons`, …) | moyenne (5 pts), risque moyen | P2 |
| Liste des articles vendus (`articlevendumanager`) | `sm_user/suggerercde/ws_transaction.jsp`<br>`sm_user/utilisateur/ws_data.jsp` | autre, creation, lecture, modification | 3 (`common/rayons`, `ventestats/article-vendus`, …) | moyenne (5 pts), risque moyen | P2 |
| Liste des bons (`facturesubrogatoire`) | `configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>`configmanagement/client/ws_transaction.jsp`<br>… 7 JSP | autre, creation, lecture, modification, suppression | 4 (`client/tiers-payants`, `details-vente/list`, …) | forte (23 pts), risque eleve | P3 |
| Bons par organisme (`facturesubrogatoireother`) | `configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>`configmanagement/client/ws_transaction.jsp`<br>… 7 JSP | autre, creation, lecture, modification, suppression | 17 (`client/add-tierspayant`, `client/all`, …) | forte (23 pts), risque eleve | P3 |
| Mouvements de Caisse (`mvtcaissemanager`) | `configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>`configmanagement/client/ws_data.jsp`<br>… 19 JSP | autre, creation, impression, lecture, modification, suppression | 8 (`app-params/detail`, `caisse/addmvtCaisse`, …) | forte (51 pts), risque eleve | P3 |

### GESTION DES COMMANDES

| Sous-menu (écran) | JSP | Actions | API REST déjà appelées par l'écran | Complexité | Priorité |
|---|---|---|---|---|---|
| Transaction Commande (`warehouseorder`) | `sm_user/warehouseorder/ws_transaction.jsp` | creation, modification, suppression | aucune | faible (2 pts), risque faible | P1 |
| Gestion des entrées (`bonlivraisonmanager`) | `commandemanagement/bonlivraison/ws_generate_pdf.jsp`<br>+ ouvre `bonlivraisondetail` | impression | 2 (`commande/bon`, `commande/list-bons`) | faible (4 pts), risque faible | P1 |
| Etat de contrôle Achats (`etatscontrolemanager`) | `commandemanagement/bonlivraison/ws_generate_etiquette_pdf.jsp`<br>`commandemanagement/bonlivraison/ws_generate_pdf.jsp`<br>+ ouvre `quinzaineManager`, `retourfournisseurmanagerlist` | impression | 14 (`avoirs-bon`, `common/groupefournisseurs`, …) | moyenne (5 pts), risque faible | P1 |
| Compte Client (`clientaccountmanager`) | `configmanagement/compteclient/ws_data.jsp`<br>`configmanagement/compteclient/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (5 pts), risque faible | P1 |
| Unites Gratuites (`ugmanager`) | `Report/uniteGratuite/ws_data.jsp`<br>`Report/uniteGratuite/ws_generate_pdf.jsp`<br>`configmanagement/grossiste/ws_data.jsp` | autre, impression, lecture | 3 (`produit/suivi-ug`, `produit/suivi-ug/create-inventaire`, …) | moyenne (8 pts), risque faible | P1 |
| Liste des Lots (`LotStockManager`) | `commandemanagement/lots/ws_lot_pdf.jsp`<br>`commandemanagement/lots/ws_transaction.jsp`<br>`configmanagement/typeetiquette/ws_data.jsp` | autre, ecriture (mode non lisible), impression, lecture | 1 (`lot/listlot`) | moyenne (9 pts), risque eleve | P3 |
| Retour fournisseur (`retourfrsmanager`) | `commandemanagement/retourfournisseur/ws_generate_pdf.jsp`<br>`commandemanagement/retourfournisseur/ws_transaction.jsp`<br>`configmanagement/grossiste/ws_data.jsp`<br>`sm_user/famille/ws_data_jdbc.jsp`<br>+ ouvre `retourfournisseurmanagerlist` | autre, creation, impression, lecture, modification, suppression | 11 (`app-params/detail`, `client/gestion/tiers-payants`, …) | moyenne (11 pts), risque eleve | P3 |
| Suggestion de reappro. (`i_sugg_manager`) | `sm_user/detailsvente/ws_data.jsp`<br>`sm_user/detailsvente/ws_transaction.jsp`<br>`sm_user/famille/ws_data.jsp`<br>… 5 JSP | autre, creation, impression, lecture, modification, suppression | 22 (`articles/abc/suggestion`, `commande/clone-suggestion-order`, …) | forte (13 pts), risque eleve | P3 |
| Commande en cours (`i_order_manager`) | `commandemanagement/order/ws_transaction.jsp`<br>`configmanagement/etatarticle/ws_data.jsp`<br>`configmanagement/etatarticle/ws_transaction.jsp`<br>… 7 JSP<br>+ ouvre `detailLot` | autre, creation, lecture, modification, suppression | 24 (`commande/clone-commande`, `commande/creerbl`, …) | forte (19 pts), risque eleve | P3 |
| Offres de prix (`evaluationoffreprixmanager`) | `commandemanagement/evaluationoffreprix/ws_data_detail.jsp`<br>`commandemanagement/evaluationoffreprix/ws_generate_pdf.jsp`<br>`commandemanagement/evaluationoffreprix/ws_transaction.jsp`<br>… 20 JSP | autre, creation, impression, lecture, modification, suppression | 2 (`app-params/detail`, `client/gestion/tiers-payants`) | forte (57 pts), risque eleve | P3 |
| Liste des ruptures de stock — *disable* (`rupturefournisseurmanager`) | `commandemanagement/evaluationoffreprix/ws_generate_pdf.jsp`<br>`commandemanagement/rupturefournisseur/ws_data.jsp`<br>`sm_user/suggerercde/ws_transaction.jsp` | autre, creation, impression, lecture, modification | 1 (`grossiste/all`) | moyenne (8 pts), risque eleve | — (menu inactif) |
| Suggerer Commande — *delete* (`suggerercdemanager`) | `configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>`configmanagement/client/ws_data.jsp`<br>… 30 JSP | autre, creation, impression, lecture, modification, suppression | 54 (`analyse-commande/produit`, `app-params/detail`, …) | forte (84 pts), risque eleve | — (menu inactif) |

### GESTION DES TIERS-PAYANTS

| Sous-menu (écran) | JSP | Actions | API REST déjà appelées par l'écran | Complexité | Priorité |
|---|---|---|---|---|---|
| Dossiers Tiers-payants (`dossiertierspayantmanager`) | `configmanagement/dossiertierspayant/ws_data.jsp`<br>`configmanagement/dossiertierspayant/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (5 pts), risque faible | P1 |
| Grille de Remise (`grilleremisemanager`) | `configmanagement/grilleremise/ws_data.jsp`<br>`configmanagement/grilleremise/ws_transaction.jsp`<br>`configmanagement/remise/ws_data.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (5 pts), risque faible | P1 |
| Regimes Caisse (`regimecaissemanager`) | `configmanagement/regimecaisse/ws_data.jsp`<br>`configmanagement/regimecaisse/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (5 pts), risque faible | P1 |
| Catégorie Client (`categorymanager`) | `configmanagement/categoryclient/ws_data.jsp`<br>`configmanagement/categoryclient/ws_transaction.jsp` | ecriture (mode non lisible), lecture | aucune | faible (4 pts), risque moyen | P2 |
| Societes (`company`) | `configmanagement/comapnies/ws_data.jsp`<br>`configmanagement/comapnies/ws_transaction.jsp` | ecriture (mode non lisible), lecture | aucune | faible (4 pts), risque moyen | P2 |
| Taux Rembourssement (`tauxrembourssementmanager`) | `configmanagement/tauxrembourssement/ws_data.jsp`<br>`configmanagement/tauxrembourssement/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (7 pts), risque moyen | P2 |
| Remises (`remisemanager`) | `configmanagement/remise/ws_data.jsp`<br>`configmanagement/remise/ws_transaction.jsp`<br>`configmanagement/typeremise/ws_data.jsp`<br>… 5 JSP | autre, creation, lecture, modification, suppression | aucune | forte (14 pts), risque moyen | P2 |
| Gestion des litiges (`litige`) | `configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>`configmanagement/client/ws_transaction.jsp`<br>… 15 JSP | autre, creation, ecriture (mode non lisible), lecture, modification, suppression | aucune | forte (40 pts), risque moyen | P2 |
| Clients désactivés (`clientdesactive`) | `commandemanagement/order/ws_transaction.jsp`<br>`configmanagement/ayantdroit/ws_data.jsp`<br>`configmanagement/ayantdroit/ws_transaction.jsp`<br>… 28 JSP | autre, creation, impression, lecture, modification, suppression | 13 (`ayants-droits`, `client`, …) | forte (82 pts), risque moyen | P2 |
| Clients (`clientmanager`) | `commandemanagement/order/ws_transaction.jsp`<br>`configmanagement/ayantdroit/ws_data.jsp`<br>`configmanagement/ayantdroit/ws_transaction.jsp`<br>… 30 JSP | autre, creation, impression, lecture, modification, suppression | 120 (`app-params/key/KEY_IMPRIMER_TICKET_CAISSE`, `app-params/value/KEY_VENTE_LECTURE_GS1`, …) | forte (88 pts), risque moyen | P2 |
| Type tiers-payants (`typetierspayantmanager`) | `tierspayantmanagement/typetierspayant/ws_data.jsp`<br>`tierspayantmanagement/typetierspayant/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (7 pts), risque eleve | P3 |
| Emplacements/Depot (`emplacement`) | `configmanagement/emplacement/ws_data.jsp`<br>`configmanagement/emplacement/ws_transaction.jsp`<br>`configmanagement/typedepot/ws_data.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (8 pts), risque eleve | P3 |
| Tiers payants désactivés (`tierspayantdesactive`) | `commandemanagement/order/ws_transaction.jsp`<br>`configmanagement/grossiste/ws_data.jsp`<br>`configmanagement/regimecaisse/ws_data.jsp`<br>… 10 JSP | autre, creation, impression, lecture, modification, suppression | 9 (`facturation/modelfacture/liste`, `grossiste/all`, …) | forte (38 pts), risque eleve | P3 |
| Tiers-payants (`tierspayantmanager`) | `commandemanagement/order/ws_transaction.jsp`<br>`configmanagement/grossiste/ws_data.jsp`<br>`configmanagement/regimecaisse/ws_data.jsp`<br>… 10 JSP | autre, creation, impression, lecture, modification, suppression | 16 (`ayants-droits`, `client/gestion/tiers-payants`, …) | forte (38 pts), risque eleve | P3 |
| Balance agée détaillée (`balanceagee_detail`) | `configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>`configmanagement/client/ws_data_compteclttierspayants.jsp`<br>… 18 JSP | autre, creation, ecriture (mode non lisible), impression, lecture, modification, suppression | 8 (`balance-agee/mensuel/csv`, `balance-agee/mensuel/excel`, …) | forte (49 pts), risque eleve | P3 |
| Groupe et Compagnie d'Ass (`groupetierspayant`) | `configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>`configmanagement/client/ws_data.jsp`<br>… 23 JSP<br>+ ouvre `doreglementmanager` | autre, creation, impression, lecture, modification, suppression | 15 (`app-params/detail`, `client/gestion/tiers-payants`, …) | forte (67 pts), risque eleve | P3 |
| Balance âgée récap (`balanceagee`) | —<br>+ ouvre `balanceageerecapitulatifdetail` |  | 4 (`balance-agee/recap/csv`, `balance-agee/recap/excel`, …) | - | — |
| Retour carnet dépôt (`retourcarnetdepot`) | —<br>+ ouvre `doRetourCarnet` |  | aucune | - | — |
| Facturation Tiers payant — *disable* (`facturationtierspayant`) | `configmanagement/ayantdroit/ws_data.jsp`<br>`configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>… 23 JSP | autre, creation, ecriture (mode non lisible), impression, lecture, modification, suppression | 8 (`facturation/modelfacture/liste`, `groupe-tierspayant/list`, …) | forte (67 pts), risque eleve | — (menu inactif) |

### GESTION DES UTILISATEURS

| Sous-menu (écran) | JSP | Actions | API REST déjà appelées par l'écran | Complexité | Priorité |
|---|---|---|---|---|---|
| Langues (`languagemanager`) | `sm_user/language/ws_data.jsp`<br>`sm_user/language/ws_transaction.jsp` | creation, lecture, modification, suppression | aucune | moyenne (6 pts), risque moyen | P2 |
| Gestion de profils (`rolemanager`) | `sm_user/menu/ws_transaction.jsp`<br>`sm_user/module/ws_data.jsp`<br>`sm_user/privilege/ws_get_privilege_by_bt.jsp`<br>… 7 JSP | autre, creation, lecture, modification, suppression | 4 (`roles`, `roles/privileges`, …) | forte (17 pts), risque moyen | P2 |
| Privileges (`privilegemanager`) | `sm_user/menu/ws_transaction.jsp`<br>`sm_user/module/ws_data.jsp`<br>`sm_user/privilege/ws_data.jsp`<br>… 6 JSP | autre, creation, lecture, modification, suppression | aucune | forte (18 pts), risque moyen | P2 |
| Utilisateurs (`usermanager`) | `configmanagement/emplacement/ws_data.jsp`<br>`sm_user/language/ws_data.jsp`<br>`sm_user/privilege/ws_get_privilege_by_bt.jsp`<br>… 9 JSP | autre, creation, impression, lecture, modification, suppression | 2 (`roles/est-admin`, `utilisateurs`) | forte (20 pts), risque moyen | P2 |
| Skin — *disable* (`skinmanager`) | `sm_user/skin/ws_data.jsp`<br>`sm_user/skin/ws_transaction.jsp` | creation, lecture, modification, suppression | aucune | moyenne (6 pts), risque moyen | — (menu inactif) |

### GESTION DU STOCK

| Sous-menu (écran) | JSP | Actions | API REST déjà appelées par l'écran | Complexité | Priorité |
|---|---|---|---|---|---|
| Gestion des doublons (`doublons`) | `ws_emplacement.jsp` | lecture | 3 (`maintenance/add-cip-constraint`, `maintenance/doublons-cip`, …) | faible (1 pts), risque faible | P1 |
| Entrées / sorties détail (`detailentreesortie`) | `configmanagement/famillearticle/ws_data.jsp`<br>`configmanagement/zonegeographique/ws_data.jsp` | autre, lecture | 2 (`grossiste/all`, `stock-movements`) | faible (4 pts), risque faible | P1 (REST déjà écrit) |
| Optimisation quantite (`optimisationquantitemanager`) | `configmanagement/optimisationquantite/ws_data.jsp`<br>`configmanagement/optimisationquantite/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (5 pts), risque faible | P1 |
| Liste Article Vendus (`articlevendu`) | `Report/listeArticleVendus/ws_data.jsp`<br>`Report/statistiquevente/ws_statistiquevente_pdf.jsp` | autre, impression, lecture | aucune | moyenne (5 pts), risque faible | P1 |
| Ajustement du Stock (`ajustementmanager`) | `stockmanagement/ajustementmanagement/ws_data.jsp`<br>`stockmanagement/ajustementmanagement/ws_generate_pdf.jsp`<br>`stockmanagement/ajustementmanagement/ws_transaction.jsp`<br>+ ouvre `doajustementmanager`, `showdetailajustementmanager`, `doajustementmanager` | impression, lecture, suppression | aucune | moyenne (6 pts), risque faible | P1 |
| Gestion des réserves (`reservemanager`) | `stockmanagement/reserve/ws_generate_pdf_reserve.jsp`<br>`stockmanagement/reserve/ws_generate_pdf_suggestion.jsp` | autre, impression | 19 (`reserve`, `reserve/articles`, …) | moyenne (6 pts), risque faible | P1 |
| Périmés rétirés du stock (`perimeremovetostock`) | `configmanagement/grossiste/ws_data.jsp`<br>`sm_user/famille/ws_data.jsp`<br>`stockmanagement/perime/ws_data_removetostock.jsp`<br>`stockmanagement/perime/ws_generate_removeperime_pdf.jsp` | autre, impression, lecture | aucune | moyenne (8 pts), risque faible | P1 |
| Valorisation du stock (`valorisationstock`) | `configmanagement/famillearticle/ws_data_other.jsp`<br>`configmanagement/grossiste/ws_data_other.jsp`<br>`configmanagement/zonegeographique/ws_data_other.jsp`<br>… 5 JSP | autre, impression, lecture | aucune | moyenne (10 pts), risque faible | P1 |
| Travaux d'Inventaire (`inventaire`) | `configmanagement/famillearticle/ws_data.jsp`<br>`configmanagement/famillearticle/ws_data_other.jsp`<br>`configmanagement/grossiste/ws_data_other.jsp`<br>… 6 JSP<br>+ ouvre `detailinventaireManager`, `editinventaireManager` | autre, impression, lecture | 19 (`analyse-avancee`, `analyse-inventaire`, …) | forte (13 pts), risque faible | P1 |
| Suivi mouvement article (`suivientreevente`) | `configmanagement/fabriquant/ws_data.jsp`<br>`configmanagement/famillearticle/ws_data.jsp`<br>`configmanagement/zonegeographique/ws_data.jsp`<br>… 13 JSP | autre, impression, lecture | aucune | forte (22 pts), risque faible | P1 |
| Gerer Code Gestion (`codegestionmanager`) | `configmanagement/codegestion/ws_data.jsp`<br>`configmanagement/codegestion/ws_generate_pdf.jsp`<br>`configmanagement/codegestion/ws_generate_xls.jsp`<br>… 5 JSP | autre, creation, export, impression, lecture, modification, suppression | aucune | forte (16 pts), risque moyen | P2 |
| Fiche Article (`famillemanager`) | `commandemanagement/lots/ws_transaction.jsp`<br>`commandemanagement/order/ws_transaction.jsp`<br>`configmanagement/categorieayantdroit/ws_data.jsp`<br>… 39 JSP | autre, creation, ecriture (mode non lisible), impression, lecture, modification, suppression | 75 (`articles/abc/classes`, `client/tiers-payants/assurance`, …) | forte (112 pts), risque moyen | P2 |
| Retour dépot (`retourdepot`) | `configmanagement/emplacement/ws_data.jsp`<br>`sm_user/migration/ws_transaction.jsp`<br>`stockmanagement/retourdepot/ws_data.jsp`<br>… 5 JSP<br>+ ouvre `addretourdepot` | autre, creation, impression, lecture, modification, suppression | 1 (`depot/validerretourdepot`) | forte (13 pts), risque eleve | P3 |
| Gestion des périmés (`perime`) | `sm_user/famille/ws_data.jsp`<br>`sm_user/famille/ws_data_other.jsp`<br>`sm_user/parameter/ws_data.jsp`<br>… 7 JSP | autre, creation, impression, lecture, modification, suppression | aucune | forte (13 pts), risque eleve | P3 |
| Etat de stock (`etatstock`) | `configmanagement/dci/ws_data.jsp`<br>`configmanagement/famillearticle/ws_data.jsp`<br>`configmanagement/grossiste/ws_data.jsp`<br>… 9 JSP | autre, creation, impression, lecture, modification, suppression | 13 (`commande/add-free-qty`, `commande/add-lot`, …) | forte (24 pts), risque eleve | P3 |
| Saisie des périmés (`saisieperime`) | `Report/saisieperimes/ws_article_list.jsp`<br>`configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>… 17 JSP | autre, creation, impression, lecture, modification, suppression | 17 (`app-params/detail`, `client/gestion/tiers-payants`, …) | forte (48 pts), risque eleve | P3 |
| Gestion étiquette (`etiquette`) | —<br>+ ouvre `doEtiquette` |  | 1 (`etiquette`) | - | — |
| Ecart inventaire — *disable* (`ecartinventaire`) | `stockmanagement/inventaire/ws_data_ecart_inventaire.jsp`<br>`stockmanagement/inventaire/ws_generate_pdf.jsp` | autre, impression, lecture | aucune | moyenne (6 pts), risque faible | — (menu inactif) |

### GESTION STOCK

| Sous-menu (écran) | JSP | Actions | API REST déjà appelées par l'écran | Complexité | Priorité |
|---|---|---|---|---|---|
| Etat Stock (`etatstockmanager`) | `sm_user/etatstock/ws_data.jsp` | autre, lecture | aucune | faible (4 pts), risque faible | P1 |
| Entree Stock (`entreestockmanager`) | `sm_user/entreestock/ws_data.jsp`<br>`sm_user/entreestock/ws_transaction.jsp`<br>`sm_user/famille/ws_data.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (8 pts), risque eleve | P3 |
| Entree Stock — *delete* (`entreestockmanager`) | `sm_user/entreestock/ws_data.jsp`<br>`sm_user/entreestock/ws_transaction.jsp`<br>`sm_user/famille/ws_data.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (8 pts), risque eleve | — (menu inactif) |

### NOTIFICATIONS

| Sous-menu (écran) | JSP | Actions | API REST déjà appelées par l'écran | Complexité | Priorité |
|---|---|---|---|---|---|
| Model Notification (`alerteventmanager`) | `configmanagement/ayantdroit/ws_data.jsp`<br>`configmanagement/ayantdroit/ws_transaction.jsp`<br>`configmanagement/categorieayantdroit/ws_data.jsp`<br>… 23 JSP | autre, creation, lecture, modification, suppression | 2 (`ayants-droits`, `utilisateurs`) | forte (65 pts), risque moyen | P2 |
| Gestion des Sms (`outboudmessagemanager`) | `configmanagement/ayantdroit/ws_data.jsp`<br>`configmanagement/ayantdroit/ws_transaction.jsp`<br>`configmanagement/categorieayantdroit/ws_data.jsp`<br>… 24 JSP | autre, creation, lecture, modification, suppression | 4 (`ayants-droits`, `sms/sortants`, …) | forte (66 pts), risque moyen | P2 |

### PARAMETRAGES

| Sous-menu (écran) | JSP | Actions | API REST déjà appelées par l'écran | Complexité | Priorité |
|---|---|---|---|---|---|
| Gerer les DCI (`dcimanager`) | `configmanagement/dci/ws_data.jsp`<br>`configmanagement/dci/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | faible (2 pts), risque faible | P1 |
| Gerer Type Remise (`typeremisemanager`) | `configmanagement/typeremise/ws_data.jsp`<br>`configmanagement/typeremise/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | faible (2 pts), risque faible | P1 |
| Gerer Type Societe (`typesocietemanager`) | `configmanagement/escomptesociete/ws_data.jsp` | autre, lecture | aucune | faible (4 pts), risque faible | P1 |
| Gerer Centre Payeur (`centrepayeurmanager`) | `configmanagement/centrepayeur/ws_data.jsp`<br>`configmanagement/centrepayeur/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (5 pts), risque faible | P1 |
| Gerer Escompte Societe (`escomptesocietemanager`) | `configmanagement/escomptesociete/ws_data.jsp`<br>`configmanagement/escomptesociete/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (5 pts), risque faible | P1 |
| Gerer Specialite Medecin (`specialitemanager`) | `configmanagement/specialite/ws_data.jsp`<br>`configmanagement/specialite/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (5 pts), risque faible | P1 |
| Gerer Type Risque (`typerisquemanager`) | `configmanagement/typerisque/ws_data.jsp`<br>`configmanagement/typerisque/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (5 pts), risque faible | P1 |
| Gerer Ville (`villemanager`) | `configmanagement/ville/ws_data.jsp`<br>`configmanagement/ville/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (5 pts), risque faible | P1 |
| Gerer Contre Indication (`contreindicationmanager`) | `configmanagement/contreindication/ws_data.jsp`<br>`configmanagement/contreindication/ws_generate_pdf.jsp`<br>`configmanagement/contreindication/ws_transaction.jsp` | autre, creation, impression, lecture, modification, suppression | aucune | moyenne (8 pts), risque faible | P1 |
| Gerer Risques (`risquemanager`) | `configmanagement/risque/ws_data.jsp`<br>`configmanagement/risque/ws_transaction.jsp`<br>`configmanagement/typerisque/ws_data.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (9 pts), risque faible | P1 |
| Gerer Etat Article (`etatarticlemanager`) | `configmanagement/etatarticle/ws_data.jsp`<br>`configmanagement/etatarticle/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | faible (4 pts), risque moyen | P2 |
| Paramétrage général (`parametermanager`) | `sm_user/parameter/ws_data.jsp`<br>`sm_user/parameter/ws_transaction.jsp` | creation, lecture, modification, suppression | 5 (`app-params/liste`, `app-params/rubriques`, …) | faible (4 pts), risque moyen | P2 |
| Catégories ayants droit (`categorieayantdroitmanager`) | `configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/categorieayantdroit/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (7 pts), risque moyen | P2 |
| Gerer Fabricant (`fabriquantmanager`) | `configmanagement/fabriquant/ws_data.jsp`<br>`configmanagement/fabriquant/ws_generate_pdf.jsp`<br>`configmanagement/fabriquant/ws_transaction.jsp` | autre, creation, impression, lecture, modification, suppression | aucune | moyenne (7 pts), risque moyen | P2 |
| Gerer Forme Article (`formearticlemanager`) | `configmanagement/formearticle/ws_data.jsp`<br>`configmanagement/formearticle/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (7 pts), risque moyen | P2 |
| Gerer Tranche (`tranchemanager`) | `configmanagement/tranche/ws_data.jsp`<br>`configmanagement/tranche/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (7 pts), risque moyen | P2 |
| Gerer Famille (`famillearticlemanager`) | `configmanagement/famillearticle/ws_data.jsp`<br>`configmanagement/famillearticle/ws_transaction.jsp`<br>`configmanagement/groupefamille/ws_data.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (9 pts), risque moyen | P2 |
| Gerer workflow remise (`workflowremisearticlemanager`) | `configmanagement/grilleremise/ws_data.jsp`<br>`configmanagement/workflowremisearticle/ws_data.jsp`<br>`configmanagement/workflowremisearticle/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (9 pts), risque moyen | P2 |
| Groupe famille (`groupefamillemanager`) | `configmanagement/groupefamille/ws_data.jsp`<br>`configmanagement/groupefamille/ws_generate_pdf.jsp`<br>`configmanagement/groupefamille/ws_transaction.jsp` | autre, creation, impression, lecture, modification, suppression | aucune | moyenne (10 pts), risque moyen | P2 |
| Gerer Fiche Societe (`fichesocietemanager`) | `configmanagement/escomptesociete/ws_data.jsp`<br>`configmanagement/fichesociete/ws_data.jsp`<br>`configmanagement/fichesociete/ws_transaction.jsp`<br>`configmanagement/ville/ws_data.jsp` | autre, creation, lecture, modification, suppression | aucune | forte (16 pts), risque moyen | P2 |
| Gerer medecin (`medecinmanager`) | `configmanagement/medecin/ws_data.jsp`<br>`configmanagement/medecin/ws_generate_pdf.jsp`<br>`configmanagement/medecin/ws_transaction.jsp`<br>… 5 JSP | autre, creation, impression, lecture, modification, suppression | aucune | forte (18 pts), risque moyen | P2 |
| Gerer Ayant Droit (`ayantdroitmanager`) | `configmanagement/ayantdroit/ws_generate_pdf.jsp`<br>`configmanagement/ayantdroit/ws_transaction.jsp`<br>`configmanagement/categorieayantdroit/ws_data.jsp`<br>… 6 JSP | autre, creation, impression, lecture, modification, suppression | 2 (`ayants-droits`, `roles/est-admin`) | forte (19 pts), risque moyen | P2 |
| Gerer Grossistes (`grossistemanager`) | `commandemanagement/etats/ws_data.jsp`<br>`configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>… 12 JSP | autre, creation, impression, lecture, modification, suppression | 10 (`commande/grossiste`, `common/groupefournisseurs`, …) | forte (35 pts), risque moyen | P2 |
| Emplacement (`zonegeographiquemanager`) | `commandemanagement/order/ws_transaction.jsp`<br>`configmanagement/codeacte/ws_data.jsp`<br>`configmanagement/codegestion/ws_data.jsp`<br>… 16 JSP | autre, creation, impression, lecture, modification, suppression | 30 (`commande/produit/commande/famille`, `common/famille-articles`, …) | forte (42 pts), risque moyen | P2 |
| Gerer Motif Retour (`motifretourmanager`) | `configmanagement/motifretour/ws_data.jsp`<br>`configmanagement/motifretour/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (7 pts), risque eleve | P3 |
| Gestion des imprimantes — *disable* (`imprimantemanager`) | `configmanagement/imprimantemanager/ws_data.jsp`<br>`configmanagement/imprimantemanager/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | faible (4 pts), risque moyen | — (menu inactif) |
| Parametres generaux — *disable* (`ParametreGenerauxManager`) | `configmanagement/famillearticle/ws_data_maxVente.jsp`<br>`configmanagement/famillearticle/ws_transaction_maxVente.jsp`<br>`sm_user/famille/ws_data.jsp`<br>`sm_user/famille/ws_transaction.jsp` | autre, creation, lecture, modification, suppression | aucune | moyenne (12 pts), risque moyen | — (menu inactif) |

### RETROCESSION

| Sous-menu (écran) | JSP | Actions | API REST déjà appelées par l'écran | Complexité | Priorité |
|---|---|---|---|---|---|
| Retrocession (`retrocessionmanager`) | `sm_user/detaildretrocession/ws_generate_pdf.jsp`<br>`sm_user/detailsvente/ws_data.jsp`<br>`sm_user/detailsvente/ws_transaction.jsp`<br>… 7 JSP<br>+ ouvre `doventeretrocessionmanager`, `showdetailretrocessionmanager` | autre, creation, impression, lecture, modification, suppression | aucune | forte (16 pts), risque eleve | P3 |
| Gestion des confrères (`confreremanager`) | `configmanagement/ayantdroit/ws_data.jsp`<br>`configmanagement/ayantdroit/ws_transaction.jsp`<br>`configmanagement/categorieayantdroit/ws_data.jsp`<br>… 26 JSP | autre, creation, lecture, modification, suppression | 12 (`ayants-droits`, `client`, …) | forte (76 pts), risque eleve | P3 |

### SERVICE CLIENT

| Sous-menu (écran) | JSP | Actions | API REST déjà appelées par l'écran | Complexité | Priorité |
|---|---|---|---|---|---|
| Liste des avoirs (`venteavoirmanager`) | `sm_user/utilisateur/ws_data.jsp` | lecture | 11 (`gardes`, `gardes/activite`, …) | faible (1 pts), risque faible | P1 (REST déjà écrit) |
| Liste des ventes dépots (`ventehistoriquedepotmanager`) | `sm_user/detailsvente/ws_generate_facture_pdf.jsp` | impression | 14 (`gardes`, `gardes/activite`, …) | faible (4 pts), risque faible | P1 |
| Proforma (`devismanager`) | `sm_user/detailsvente/ws_generate_devis__pdf.jsp`<br>`sm_user/preenregistrement/ws_generate_pdf.jsp` | impression | 6 (`vente/clone-devis`, `ventestats/devis`, …) | moyenne (8 pts), risque faible | P1 |
| Vente terminées (`ventemanager`) | `sm_user/detailsvente/suggestion.jsp`<br>`sm_user/detailsvente/ws_generate_facture_pdf.jsp`<br>`sm_user/detailsvente/ws_generate_pdf.jsp` | impression, lecture | 36 (`client/add-tierspayant`, `client/add/venteclientinfos`, …) | moyenne (11 pts), risque faible | P1 |

### Écrans secondaires (ouverts en entier depuis un écran de menu)

| Écran | JSP | Actions | Ouvert depuis | API REST déjà appelées | Complexité | Priorité |
|---|---|---|---|---|---|---|
| `showdetailajustementmanager` (`app/view/stockmanagement/ajustementmanagement/action/detailAjustement.js`) | `stockmanagement/ajustementmanagement/ws_data_detail.jsp`<br>`stockmanagement/ajustementmanagement/ws_generate_pdf.jsp` | impression, lecture | GESTION DU STOCK > Ajustement du Stock | aucune | moyenne (5 pts), risque faible | P1 |
| `doajustementmanager` (`app/view/produits/Ajuster.js`) | `stockmanagement/ajustementmanagement/ws_generate_pdf.jsp` | impression | GESTION DU STOCK > Ajustement du Stock | 12 | faible (4 pts), risque faible | P1 |
| `doRetourCarnet` (`app/view/Dashboard/DoRetourCarnet.js`) | `stockmanagement/ajustementmanagement/ws_generate_pdf.jsp` | impression | GESTION DES TIERS-PAYANTS > Retour carnet dépôt | 1 | faible (4 pts), risque faible | P1 |
| `editderredpayment` (`app/view/sm_user/Defferedpaiement/action/add.js`) | `configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>`configmanagement/client/ws_data.jsp`<br>… 21 JSP | autre, creation, impression, lecture, modification, suppression | FACTURATION > Règlement différé | 3 | forte (52 pts), risque moyen | P2 |
| `doventeretrocessionmanager` (`app/view/sm_user/doventeretrocession/DoventeRetrocessionManager.js`) | `commandemanagement/order/ws_transaction.jsp`<br>`configmanagement/ayantdroit/ws_data.jsp`<br>`configmanagement/ayantdroit/ws_transaction.jsp`<br>… 48 JSP | autre, creation, impression, lecture, modification, suppression | ANALYSE DE GESTION > Liste des abandons et annulation<br>ANALYSE DE GESTION > Balance agee detaillée<br>… 9 menus | 111 | forte (136 pts), risque eleve | P3 |
| `detailinventaireManager` (`app/view/stockmanagement/inventaire/action/detailInventaireManager.js`) | `commandemanagement/order/ws_transaction.jsp`<br>`configmanagement/ayantdroit/ws_data.jsp`<br>`configmanagement/ayantdroit/ws_transaction.jsp`<br>… 30 JSP | autre, creation, impression, lecture, modification, suppression | GESTION DU STOCK > Travaux d'Inventaire | 111 | forte (91 pts), risque eleve | P3 |
| `detailLot` (`app/view/commandemanagement/order/action/add.js`) | `configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>`configmanagement/client/ws_data.jsp`<br>… 27 JSP | autre, creation, impression, lecture, modification, suppression | GESTION DES COMMANDES > Commande en cours | 62 | forte (76 pts), risque eleve | P3 |
| `showdetailretrocessionmanager` (`app/view/sm_user/doventeretrocession/ShowDetailRetrocessionManager.js`) | `configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/categoryclient/ws_data.jsp`<br>`configmanagement/client/ws_data.jsp`<br>… 22 JSP | autre, creation, impression, lecture, modification, suppression | RETROCESSION > Retrocession | 110 | forte (68 pts), risque eleve | P3 |
| `editinventaireManager` (`app/view/stockmanagement/inventaire/action/editInventaireManager.js`) | `configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>`configmanagement/client/ws_data.jsp`<br>… 24 JSP | autre, creation, impression, lecture, modification, suppression | GESTION DU STOCK > Travaux d'Inventaire | 117 | forte (62 pts), risque eleve | P3 |
| `retourfournisseurmanagerlist` (`app/view/commandemanagement/retourfournisseur/action/add.js`) | `commandemanagement/retourfournisseur/ws_transaction.jsp`<br>`configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>… 19 JSP | autre, creation, impression, lecture, modification, suppression | GESTION DES COMMANDES > Etat de contrôle Achats<br>GESTION DES COMMANDES > Retour fournisseur | 12 | forte (57 pts), risque eleve | P3 |
| `doajustementmanager` (`app/view/stockmanagement/ajustementmanagement/action/add.js`) | `configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>`configmanagement/client/ws_data.jsp`<br>… 21 JSP | autre, creation, impression, lecture, modification, suppression | GESTION DU STOCK > Ajustement du Stock | 12 | forte (57 pts), risque eleve | P3 |
| `addretourdepot` (`app/view/stockmanagement/retourdepot/action/add.js`) | `configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>`configmanagement/client/ws_data.jsp`<br>… 20 JSP | autre, creation, impression, lecture, modification, suppression | GESTION DU STOCK > Retour dépot | 2 | forte (56 pts), risque eleve | P3 |
| `balanceageerecapitulatifdetail` (`app/view/tierspayantmanagement/balanceagee_detail/BalanceageeRecapitulatifDetailManager.js`) | `configmanagement/ayantdroit/ws_data.jsp`<br>`configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>… 19 JSP | autre, creation, ecriture (mode non lisible), impression, lecture, modification, suppression | GESTION DES TIERS-PAYANTS > Balance âgée récap | 7 | forte (51 pts), risque eleve | P3 |
| `doEtiquette` (`app/view/stockmanagement/etiquette/action/addBis.js`) | `configmanagement/categorieayantdroit/ws_data.jsp`<br>`configmanagement/client/ws_customer.jsp`<br>`configmanagement/client/ws_data.jsp`<br>… 16 JSP | autre, creation, impression, lecture, modification, suppression | GESTION DU STOCK > Gestion étiquette | 3 | forte (47 pts), risque eleve | P3 |
| `addeditfacture` (`app/view/sm_user/editfacture/action/add.js`) | `configmanagement/client/ws_data.jsp`<br>`configmanagement/client/ws_transaction.jsp`<br>`configmanagement/compteclient/ws_data.jsp`<br>… 13 JSP | autre, creation, impression, lecture, modification, suppression | FACTURATION > Factures | 15 | forte (44 pts), risque eleve | P3 |
| `doreglementmanager` (`app/view/sm_user/reglement/action/DoReglement.js`) | `configmanagement/client/ws_data.jsp`<br>`configmanagement/client/ws_transaction.jsp`<br>`configmanagement/compteclient/ws_data.jsp`<br>… 12 JSP | autre, creation, impression, lecture, modification, suppression | FACTURATION > Factures provisoires<br>FACTURATION > Factures<br>… 4 menus | 12 | forte (38 pts), risque eleve | P3 |
| `bonlivraisondetail` (`app/view/commandemanagement/bonlivraison/action/add.js`) | `commandemanagement/bonlivraison/ws_generate_pdf.jsp`<br>`commandemanagement/bonlivraison/ws_transaction.jsp`<br>`commandemanagement/order/ws_transaction.jsp`<br>… 7 JSP | autre, creation, impression, lecture, modification, suppression | GESTION DES COMMANDES > Gestion des entrées | 10 | forte (23 pts), risque eleve | P3 |
| `detailbon` (`app/view/sm_user/editfacture/action/DetaillBon.js`) | `sm_user/facturation/ws_data_detail_Bon.jsp`<br>`sm_user/facturation/ws_transaction.jsp` | autre, lecture, suppression | FACTURATION > Factures | aucune | moyenne (8 pts), risque eleve | P3 |
| `detailbon` (`app/view/sm_user/factureregle/action/DetaillBon.js`) | `sm_user/facturation/ws_data_detail_Bon.jsp`<br>`sm_user/facturation/ws_transaction.jsp` | autre, lecture, suppression | FACTURATION > Factures | aucune | moyenne (8 pts), risque eleve | P3 |
| `detailfacture` (`app/view/sm_user/editbordereau/action/DetailFacture.js`) | `sm_user/facturation/ws_data_detail_facture.jsp`<br>`sm_user/facturation/ws_transaction.jsp` | autre, lecture, suppression | FACTURATION > Factures | aucune | moyenne (8 pts), risque eleve | P3 |
| `detailfacture` (`app/view/sm_user/editfacture/action/DetailFacture.js`) | `sm_user/facturation/ws_data_detail_facture.jsp`<br>`sm_user/facturation/ws_transaction.jsp` | autre, lecture, suppression | FACTURATION > Factures | aucune | moyenne (8 pts), risque eleve | P3 |
| `detailfacture` (`app/view/sm_user/factureregle/action/DetailFacture.js`) | `sm_user/facturation/ws_data_detail_facture.jsp`<br>`sm_user/facturation/ws_transaction.jsp` | autre, lecture, suppression | FACTURATION > Factures | aucune | moyenne (8 pts), risque eleve | P3 |
| `detailfacturefournisseur` (`app/view/sm_user/editfacture/action/DetailFactureFournisseur.js`) | `sm_user/facturation/ws_data_detail_fournisseur_facture.jsp`<br>`sm_user/facturation/ws_transaction.jsp` | autre, lecture, suppression | FACTURATION > Factures | aucune | moyenne (8 pts), risque eleve | P3 |
| `detailfacturefournisseur` (`app/view/sm_user/factureregle/action/DetailFactureFournisseur.js`) | `sm_user/facturation/ws_data_detail_fournisseur_facture.jsp`<br>`sm_user/facturation/ws_transaction.jsp` | autre, lecture, suppression | FACTURATION > Factures | aucune | moyenne (8 pts), risque eleve | P3 |
| `quinzaineManager` (`app/view/commandemanagement/etats/action/quinzaineManager.js`) | `commandemanagement/bonlivraison/ws_quinzaine_data.jsp`<br>`commandemanagement/bonlivraison/ws_quinzaine_transaction.jsp`<br>`configmanagement/grossiste/ws_data.jsp` | autre, creation, lecture, modification, suppression | GESTION DES COMMANDES > Etat de contrôle Achats | 1 | moyenne (7 pts), risque eleve | P3 |

## 4. JSP vivantes hors menu

| JSP | Appelant (preuve) | Remarque |
|---|---|---|
| `index.jsp` | `web.xml:218` (page d'accueil), `general/app/view/Header.js:302` (déconnexion) | page de redirection, à garder jusqu'au frontal Angular |
| `general/index.jsp` | `index.jsp:26`, `security/index.html:568` | page hôte de l'application ExtJS : ce n'est pas un service, elle disparaîtra avec ExtJS |
| `security/index.jsp` | `security/espace-produit.html:95` | ancienne page de connexion, renvoie vers `security/index.html` |
| `webservices/menumanagement/ws_tree_menu.jsp` | `general/app/view/Navigation.js:84` | **arbre des menus, chargé à chaque ouverture** ; `rest/MetroResource.java:23` le cite déjà : à basculer en priorité (P1) |
| `webservices/sm_user/outboudmessage/ws_check_notification_web.jsp` | `general/index.jsp:234` | interrogation périodique des notifications |
| `webservices/sm_user/outboudmessage/ws_check_notification_mijournee_web.jsp` | `general/index.jsp:247` | idem |
| `webservices/sm_user/outboudmessage/ws_check_notificationavoir_web.jsp` | `general/index.jsp:259` | idem |
| `webservices/stockmanagement/etiquette/ws_generate_pdf.jsp` | `rest/report/pdf/Etiquete.java:127` | **le Java rappelle la JSP par HTTP** : à remplacer par un appel direct au service d'impression |
| `webservices/stockmanagement/etiquette/ws_generate_etiquette_pdf.jsp` | `rest/report/pdf/Etiquete.java:142` | idem |
| `webservices/commandemanagement/bonlivraison/ws_generate_etiquette_pdf_legacy.jsp` | `rest/report/pdf/Etiquete.java:166` | idem |
| `webservices/usermanagement/ws_login.jsp` | `app/controler.js:5`, dans `Doconnexion`, fonction appelée nulle part | **en pratique morte** : la connexion passe par `api/v1/user/auth` (`app/controler.js:87`) |

## 5. JSP qui ne servent plus

Avant tout retrait (règle du projet : on ne supprime pas les anciennes JSP sans décision), vérifier dans les journaux
d'accès de Payara qu'aucune n'a été appelée sur une période représentative, dans chaque officine.

### 5.1 Mortes (189)

#### Aucun appel (120)

| Dossier | JSP |
|---|---|
| `app/security` | `index.jsp` |
| `general/app/view/sm_user/typefacture` | `ws_data.jsp` |
| `webservices/MOBILES/configurationmanager/inventaire` | `ws_data_detail.jsp`, `ws_emplacement_inventaire.jsp`, `ws_transaction.jsp` |
| `webservices/MOBILES/utilisateur` | `ws_login.jsp` |
| `webservices/Report/BalanceAgeGenerale` | `ws_data.jsp`, `ws_transaction.jsp` |
| `webservices/Report/Operateur` | `ws_graphe_data.jsp` |
| `webservices/Report/comparaisonChiffreAffaire` | `ws_transaction.jsp` |
| `webservices/Report/journaldesventes` | `ws_journaldesventes_pdf.jsp` |
| `webservices/Report/listeArticleVendus` | `ws_statistiquevente_pdf.jsp` |
| `webservices/Report/qtyorder` | `ws_generate_pdf.jsp` |
| `webservices/Report/recapactivities` | `ws_data.jsp` |
| `webservices/Report/saisieperimes` | `ws_data_pending.jsp` |
| `webservices/commandemanagement` | `ws_data_order_passed_grossiste.jsp` |
| `webservices/commandemanagement/bonlivraison` | `ws_data.jsp` |
| `webservices/commandemanagement/bonlivraisondetail` | `ws_data.jsp` |
| `webservices/commandemanagement/lots` | `ws_data.jsp` |
| `webservices/commandemanagement/order` | `ws_data_init.jsp`, `ws_data_order_passed_grossiste.jsp`, `ws_data_suivi_grossiste.jsp` |
| `webservices/commandemanagement/orderdetail` | `ws_data_passed.jsp`, `ws_data_suivi.jsp` |
| `webservices/commandemanagement/typesuggestion` | `ws_data.jsp` |
| `webservices/configmanagement/client` | `ws_compteclient_tierspayant_transaction.jsp`, `ws_compteclt_tierspayant_data.jsp` |
| `webservices/configmanagement/compteclienttierspayant` | `ws_init_data.jsp`, `ws_transaction.jsp` |
| `webservices/configmanagement/etiquette` | `ws_transaction.jsp` |
| `webservices/configmanagement/fabriquant` | `ws_data_other.jsp` |
| `webservices/configmanagement/facture` | `ws_transaction.jsp` |
| `webservices/configmanagement/famillegrossiste` | `ws_transaction.jsp` |
| `webservices/configmanagement/groupe` | `ws_groupeInvoices.jsp`, `ws_groupebons.jsp` |
| `webservices/configmanagement/imprimantemanager` | `ws_generate_pdf.jsp` |
| `webservices/configmanagement/modereglement` | `ws_data.jsp` |
| `webservices/configmanagement/naturevente` | `ws_transaction.jsp` |
| `webservices/configmanagement/remise` | `ws_data_dovente.jsp` |
| `webservices/configmanagement/retourfournisseur` | `ws_data.jsp`, `ws_transaction.jsp` |
| `webservices/configmanagement/retourfournisseurdetail` | `ws_data.jsp`, `ws_transaction.jsp` |
| `webservices/configmanagement/tierspayant` | `ws_data.jsp` |
| `webservices/configmanagement/typeclient` | `ws_transaction.jsp` |
| `webservices/configmanagement/typecontrat` | `ws_transaction.jsp` |
| `webservices/configmanagement/typepassation` | `ws_transaction.jsp` |
| `webservices/configmanagement/typevente` | `ws_transaction.jsp`, `ws_typeventes.jsp` |
| `webservices/dashboard` | `DailyCA.jsp`, `ws_AchatByGrossistes.jsp`, `ws_achat_by_grossiste.jsp`, `ws_best_clients.jsp`, `ws_data_mvt.jsp`, `ws_data_top5.jsp`, `ws_data_top5CA.jsp`, `ws_graphe_data.jsp` |
| `webservices/sm_user/RecapOrganisme` | `ws_recapOrganisme_pdf.jsp` |
| `webservices/sm_user/alertevent` | `ws_privilege.jsp` |
| `webservices/sm_user/detaildretrocession` | `ws_data_initial.jsp`, `ws_init_data.jsp` |
| `webservices/sm_user/detailsvente` | `ws_data_avoir.jsp`, `ws_data_litige_customer.jsp`, `ws_generate_vac_pdf.jsp` |
| `webservices/sm_user/diffclient` | `ws_customer_dataOld.jsp` |
| `webservices/sm_user/famille` | `ws_data_disable.jsp`, `ws_data_initial_last_goodversion.jsp`, `ws_data_jdbc_dci.jsp`, `ws_data_order.jsp`, `ws_data_peremption.jsp`, `ws_data_retourfrs_base.jsp`, `ws_get_famille.jsp` |
| `webservices/sm_user/gestcaisse` | `ws_data.jsp`, `ws_gestioncaisse_pdf.jsp` |
| `webservices/sm_user/modereglement` | `ws_transaction.jsp` |
| `webservices/sm_user/notification` | `ws_data.jsp` |
| `webservices/sm_user/outboudmessage` | `ws_data.jsp`, `ws_privilege.jsp` |
| `webservices/sm_user/ouverturecaisse` | `ws_data.jsp`, `ws_generate_pdf.jsp`, `ws_transaction.jsp` |
| `webservices/sm_user/preenregistrementcompteclient` | `ws_generate_xls.jsp` |
| `webservices/sm_user/prixmodifies` | `ws_generate_pdf.jsp`, `ws_transaction.jsp` |
| `webservices/sm_user/reglement` | `ws_data.jsp`, `ws_data_facture_paid.jsp`, `ws_data_reglement.jsp` |
| `webservices/sm_user/role` | `ws_data_privilege.jsp` |
| `webservices/sm_user/suggerercde` | `ws_generate_xls.jsp` |
| `webservices/sm_user/tsnapshopdalyrecette` | `ws_data.jsp`, `ws_transaction.jsp` |
| `webservices/sm_user/typemvtcaisse` | `ws_transaction.jsp` |
| `webservices/sm_user/typereglement` | `ws_transaction.jsp` |
| `webservices/sm_user/utilisateur` | `ws_privilege.jsp` |
| `webservices/sm_user/vente` | `datas.jsp`, `ws_data_depot.jsp`, `ws_data_old_goodversion.jsp`, `ws_data_tierspayant.jsp`, `ws_data_user_sell.jsp`, `ws_generate_pdf.jsp`, `ws_generate_vente_withoutbon_pdf.jsp`, `ws_vente_without_bon.jsp` |
| `webservices/stockmanagement/depot` | `ws_data.jsp` |
| `webservices/stockmanagement/detailsdepot` | `ws_generate_facture_pdf.jsp`, `ws_generate_pdf.jsp`, `ws_init_data.jsp` |
| `webservices/stockmanagement/etiquette` | `ws_transaction.jsp` |
| `webservices/stockmanagement/inventaire` | `ws_data.jsp`, `ws_transaction.jsp` |
| `webservices/stockmanagement/reserve` | `ws_generate_pdf.jsp` |
| `webservices/stockmanagement/stock` | `ws_data_jour.jsp`, `ws_generate_valorisation_with_criteria_pdf.jsp`, `ws_valorisation.jsp` |
| `webservices/stockmanagement/suivistockvente` | `ws_data_detailentree.jsp`, `ws_data_mouvement_inventaire.jsp`, `ws_data_mouvement_stock.jsp`, `ws_datas.jsp` |
| `webservices/tierspayantmanagement/tierspayant` | `ws_client_data.jsp`, `ws_client_transaction.jsp`, `ws_data_tierspayant.jsp` |

#### Appelées seulement dans du code commenté (43)

| Dossier | JSP |
|---|---|
| `general/home` | `index.jsp` |
| `webservices/commandemanagement/orderdetail` | `ws_data.jsp` |
| `webservices/configmanagement/client` | `clientayantdroits.jsp`, `clienttierspayants.jsp`, `ws_clientTierspayant.jsp`, `ws_vente.jsp` |
| `webservices/configmanagement/famillegrossiste` | `ws_data.jsp` |
| `webservices/configmanagement/groupe` | `facture_data.jsp`, `ws_allbons.jsp`, `ws_data.jsp`, `ws_facturation.jsp`, `ws_groupe_data.jsp`, `ws_invoiceDetails.jsp`, `ws_invoices.jsp`, `ws_reglement.jsp`, `ws_selectedBons.jsp` |
| `webservices/sm_user/RecapOrganisme` | `ws_data.jsp` |
| `webservices/sm_user/facturation` | `ws_data.jsp`, `ws_data_detail_tiers_payant.jsp`, `ws_data_details_vente.jsp` |
| `webservices/sm_user/journalvente` | `ws_facture_ententeedition.jsp`, `ws_facture_subrogatoire.jsp`, `ws_generate_facture_subrogatoire_pdf.jsp` |
| `webservices/sm_user/myaccount` | `ws_transaction.jsp` |
| `webservices/sm_user/prixmodifies` | `ws_data.jsp` |
| `webservices/sm_user/reglement` | `ws_details_reglement.jsp` |
| `webservices/stockmanagement/etiquette` | `ws_data.jsp`, `ws_data_detail.jsp`, `ws_data_type_etiquette.jsp` |
| `webservices/stockmanagement/inventaire` | `ws_data_article_unitaire.jsp`, `ws_data_inventaire_famille.jsp` |
| `webservices/stockmanagement/stock` | `ws_productbyzone.jsp`, `ws_update.jsp`, `ws_zone.jsp` |
| `webservices/stockmanagement/suivistockvente` | `ws_data_detailsortie_famille.jsp`, `ws_data_statVente_famille.jsp` |
| `webservices/tierspayantmanagement/tierspayant` | `ws_data_balance_agee.jsp`, `ws_data_balance_agee_detail.jsp`, `ws_data_balance_agee_recapitulatifdetail.jsp`, `ws_data_model.jsp`, `ws_data_search.jsp`, `ws_tierspayantaccount.jsp` |
| `webservices/usermanagement` | `ws_transaction.jsp` |

#### URL déclarée dans une variable jamais lue (25)

| Dossier | JSP |
|---|---|
| `webservices/commandemanagement/retourfournisseur` | `ws_data_bl_retour.jsp` |
| `webservices/configmanagement/dci` | `ws_data_dci_famille.jsp`, `ws_transaction_dci_famille.jsp` |
| `webservices/configmanagement/famillearticle` | `ws_data_inventaire.jsp` |
| `webservices/configmanagement/grossiste` | `ws_data_inventaire.jsp` |
| `webservices/configmanagement/naturevente` | `ws_data.jsp` |
| `webservices/configmanagement/typepassation` | `ws_data.jsp` |
| `webservices/configmanagement/zonegeographique` | `ws_data_inventaire.jsp` |
| `webservices/sm_user/diffclient` | `ws_transaction.jsp` |
| `webservices/sm_user/famille` | `ws_data_retourfrs.jsp` |
| `webservices/sm_user/info_officine` | `ws_data.jsp`, `ws_transaction.jsp` |
| `webservices/sm_user/mvtcaisse` | `ws_generate_pdf.jsp` |
| `webservices/sm_user/parameter` | `ws_data_all.jsp` |
| `webservices/sm_user/retrocession` | `ws_generate_pdf.jsp` |
| `webservices/sm_user/role` | `ws_transaction.jsp` |
| `webservices/stockmanagement/inventaire` | `ws_transactions.jsp` |
| `webservices/stockmanagement/perime` | `ws_data_famille.jsp` |
| `webservices/stockmanagement/reserve` | `ws_data.jsp` |
| `webservices/stockmanagement/stock` | `ws_data.jsp`, `ws_generate_valorisation_pdf.jsp`, `ws_transaction.jsp` |
| `webservices/stockmanagement/stockdepot` | `ws_transaction.jsp` |
| `webservices/stockmanagement/suivistockvente` | `ws_data_evaluation_ventemoyenne.jsp` |
| `webservices/tierspayantmanagement/tierspayant` | `ws_clients_data_tierspayants.jsp` |

#### Appelées seulement par une JSP morte (1)

| Dossier | JSP |
|---|---|
| `general/home/view` | `sousmenus.jsp` |

### 5.2 Orphelines (25) : appelées seulement par des écrans que rien n'ouvre

Aucun sous-menu (actif ou non) ni aucun autre écran n'ouvre ou n'emploie ces vues et ces stores (aucune référence à leur classe ou à leur xtype hors `app.js` et `bootstrap.js`, qui listent toutes les classes, et hors les listes d'affichage de `correctifs-affichage.js`).

| JSP | Écran qui l'appelle (rien ne l'ouvre) |
|---|---|
| `webservices/commandemanagement/bonlivraisondetail/ws_data_detail.jsp` | `app/view/sm_user/editfacture/action/detailTransactionFournisseur.js` (xtype `detailTransactionFournisseur`) |
| `webservices/configmanagement/codeacte/ws_transaction.jsp` | `app/view/configmanagement/codeacte/CodeActeManager.js` (xtype `codeactemanager`) |
| `webservices/configmanagement/emplacement/ws_data_other.jsp` | `app/view/stockmanagement/dodepot/action/add.js` (xtype `addventedepot`) |
| `webservices/configmanagement/groupe/ws_tiers_payantseach.jsp` | `app/store/Statistics/goupeTpSore.js` |
| `webservices/configmanagement/tableau/ws_transaction.jsp` | `app/view/configmanagement/tableau/TableauManager.js` (xtype `tableaumanager`) |
| `webservices/configmanagement/tauxmarque/ws_transaction.jsp` | `app/view/configmanagement/tauxmarque/TauxmarqueManager.js` (xtype `tauxmarquemanager`) |
| `webservices/Report/achatfournisseurs/ws_achatsfournisseurs_pdf.jsp` | `app/view/Report/listeachatselonfournisseur/AchatManager.js` (xtype `achatfournisseurs`) |
| `webservices/Report/achatfournisseurs/ws_data.jsp` | `app/view/Report/listeachatselonfournisseur/AchatManager.js` (xtype `achatfournisseurs`) |
| `webservices/Report/facturefournisseurs/ws_data.jsp` | `app/store/Statistics/FacturesFournisseurs.js` |
| `webservices/Report/qtyorder/ws_data.jsp` | `app/store/Statistics/OrderQty.js` |
| `webservices/Report/visitorstatistics/ws_data.jsp` | `app/view/Report/analyseFrequentationOff/VistorGrid.js` (xtype `visitor-grid`) |
| `webservices/Report/visitorstatistics/ws_graphe_data.jsp` | `app/view/Report/analyseFrequentationOff/action/AreaVisitorCharts.js` (xtype `visitorarea-chart`)<br>`app/view/Report/analyseFrequentationOff/action/VisitorCharts.js` (xtype `visitor-chart`) |
| `webservices/sm_user/diffclient/ws_customer_data.jsp` | `app/view/sm_user/dovente/action/displayCustomer.js` (xtype `displayCustomer`) |
| `webservices/sm_user/famille/ws_datas.jsp` | `app/store/Statistics/Products.js` |
| `webservices/sm_user/preenregistrement/ws_data.jsp` | `app/view/sm_user/caisse/CloturerventeManager.js` (xtype `cloturerventemanagerxx`)<br>`app/view/sm_user/cloturecaisse/CloturercaisseManager.js` (xtype `cloturercaissemanager`)<br>`app/view/sm_user/detailsvente/DetailsVenteManager.js` (xtype `detailsventemanager`) |
| `webservices/sm_user/preenregistrementcompteclient/ws_data.jsp` | `app/view/sm_user/preenregistrementcompteclient/PreenregistrementcompteclientManager.js` (xtype `preenregistrementcompteclient`) |
| `webservices/sm_user/preenregistrementcompteclient/ws_generate_pdf.jsp` | `app/view/sm_user/preenregistrementcompteclient/PreenregistrementcompteclientManager.js` (xtype `preenregistrementcompteclient`) |
| `webservices/sm_user/preenregistrementcompteclient/ws_transaction.jsp` | `app/view/sm_user/preenregistrementcompteclient/PreenregistrementcompteclientManager.js` (xtype `preenregistrementcompteclient`) |
| `webservices/stockmanagement/detailsdepot/ws_data.jsp` | `app/view/stockmanagement/dodepot/action/add.js` (xtype `addventedepot`) |
| `webservices/stockmanagement/detailsdepot/ws_transaction.jsp` | `app/view/stockmanagement/dodepot/action/add.js` (xtype `addventedepot`) |
| `webservices/stockmanagement/reserve/ws_transaction.jsp` | `app/view/stockmanagement/reserve/action/addToReserve.js` (xtype `addarticlereserve`)<br>`app/view/stockmanagement/stockdepot/StockDepotManager.js` (xtype `stockdepot`) |
| `webservices/stockmanagement/stockdepot/ws_data.jsp` | `app/view/stockmanagement/stockdepot/StockDepotManager.js` (xtype `stockdepot`) |
| `webservices/stockmanagement/suivistockvente/ws_data_mouvement_commande.jsp` | `app/view/stockmanagement/suivistockvente/action/detailCommande.js` (xtype `addfamilledetailcommande`) |
| `webservices/stockmanagement/suivistockvente/ws_data_mouvement_sortie.jsp` | `app/view/stockmanagement/suivistockvente/action/detailArticle.js` (xtype `addfamilledetail`) |
| `webservices/tierspayantmanagement/clienttierspayant/ws_transaction_vente.jsp` | `app/view/sm_user/dovente/action/associateTiersPayantItem.js` (xtype `associateTiersPayantItem`) |

### 5.3 Atteintes seulement par des menus inactifs ou masqués (22)

État de la copie locale ; **à vérifier** dans les autres officines avant tout retrait.

| JSP | Seuls menus qui l'atteignent |
|---|---|
| `webservices/commandemanagement/rupturefournisseur/ws_data.jsp` | GESTION DES COMMANDES > Liste des ruptures de stock (disable, `menus-base-locale.tsv:110`) |
| `webservices/configmanagement/imprimantemanager/ws_data.jsp` | PARAMETRAGES > Gestion des imprimantes (disable, `menus-base-locale.tsv:156`) |
| `webservices/configmanagement/imprimantemanager/ws_transaction.jsp` | PARAMETRAGES > Gestion des imprimantes (disable, `menus-base-locale.tsv:156`) |
| `webservices/Report/BalanceAgeDetaille/ws_data.jsp` | ANALYSE DE GESTION > Balance agee detaillée (delete, `menus-base-locale.tsv:206`) |
| `webservices/Report/BalanceAgeDetaille/ws_transaction.jsp` | ANALYSE DE GESTION > Balance agee detaillée (delete, `menus-base-locale.tsv:206`) |
| `webservices/Report/BalanceAgeOrganisme/ws_data.jsp` | ANALYSE DE GESTION > Balance agée par org. (delete, `menus-base-locale.tsv:199`) |
| `webservices/Report/BalanceAgeOrganisme/ws_transaction.jsp` | ANALYSE DE GESTION > Balance agée par org. (delete, `menus-base-locale.tsv:199`) |
| `webservices/Report/DossierEnAttenteEdition/ws_data.jsp` | ANALYSE DE GESTION > Dossier en attente d'edition (delete, `menus-base-locale.tsv:213`) |
| `webservices/Report/DossierEnAttenteEdition/ws_transaction.jsp` | ANALYSE DE GESTION > Dossier en attente d'edition (delete, `menus-base-locale.tsv:213`) |
| `webservices/Report/journaldesventes/ws_data.jsp` | ANALYSE DE GESTION > Journal des ventes (delete, `menus-base-locale.tsv:216`) |
| `webservices/Report/journaldesventes/ws_transaction.jsp` | ANALYSE DE GESTION > Journal des ventes (delete, `menus-base-locale.tsv:216`) |
| `webservices/sm_user/defferredpayment/ws_client_data.jsp` | FACTURATION > Règlement différé (disable, `menus-base-locale.tsv:51`) |
| `webservices/sm_user/defferredpayment/ws_data.jsp` | FACTURATION > Règlement différé (disable, `menus-base-locale.tsv:51`) |
| `webservices/sm_user/defferredpayment/ws_deferredpayment_pdf.jsp` | FACTURATION > Règlement différé (disable, `menus-base-locale.tsv:51`) |
| `webservices/sm_user/defferredpayment/ws_defferedclients.jsp` | FACTURATION > Règlement différé (disable, `menus-base-locale.tsv:51`) |
| `webservices/sm_user/defferredpayment/ws_details_deffered.jsp` | FACTURATION > Règlement différé (disable, `menus-base-locale.tsv:51`) |
| `webservices/sm_user/defferredpayment/ws_payment_data.jsp` | FACTURATION > Règlement différé (disable, `menus-base-locale.tsv:51`) |
| `webservices/sm_user/defferredpayment/ws_transaction.jsp` | FACTURATION > Règlement différé (disable, `menus-base-locale.tsv:51`) |
| `webservices/sm_user/reglement/ws_mode_reglemnt.jsp` | FACTURATION > Règlement différé (disable, `menus-base-locale.tsv:51`) |
| `webservices/sm_user/skin/ws_transaction.jsp` | GESTION DES UTILISATEURS > Skin (disable, `menus-base-locale.tsv:261`) |
| `webservices/stockmanagement/inventaire/ws_data_ecart_inventaire.jsp` | GESTION DU STOCK > Ecart inventaire (disable, `menus-base-locale.tsv:119`) |
| `webservices/tierspayantmanagement/tierspayant/ws_data_facturation.jsp` | GESTION DES TIERS-PAYANTS > Facturation Tiers payant (disable, `menus-base-locale.tsv:71`) |

## 6. Appels vers des JSP absentes du dépôt

156 appels effectifs (hors commentaire, hors variable jamais lue) citent 85 chemins de JSP qui n'existent pas. La
liste complète, avec fichier et ligne, est à la fin de l'annexe. Les plus fréquents :

| Chemin absent | Appels | Exemple |
|---|---|---|
| `webservices/Report/ws_reportGeneratePdf.jsp` | 16 | `app/view/Report/AbandonEtAnnulation/AbandonEtAnnulationManager.js:8` |
| `webservices/tierspayantmanagement/tierspayant/ws_data.jsp` | 10 | `app/view/configmanagement/client/action/add.js:12` |
| `webservices/sm_user/menu/ws_data.jsp` | 5 | `app/view/configmanagement/client/action/addMedecinClient.js:2` |
| `webservices/sm_user/userphone/ws_data.jsp` | 5 | `app/view/sm_user/alertevent/action/adduserphonetoalert.js:26` |
| `webservices/sm_user/institution/ws_client_data.jsp` | 4 | `app/view/configmanagement/clientaccount/action/addInstitution.js:5` |
| `webservices/sm_user/client/ws_transaction.jsp` | 4 | `app/view/configmanagement/clientaccount/action/addpwd.js:5` |
| `webservices/sm_user/facturation/ws_data_relever_facture.jsp` | 4 | `app/view/Report/ListeArticleVendus/GridArticles.js:189` |
| `webservices/sm_user/typefacture/ws_data.jsp` | 3 | `app/view/sm_user/editfacture/EditFactureManager.js:5` |

Deux faux positifs à ignorer : `panelInfos.jsp` est un paramètre d'URL (`?content=panelInfos.jsp`), pas un appel ;
`app/static_data.js` vise une autre application (`ecap_2i_map`, `gatewayrelevebi`) sur une adresse du réseau local.

Ce n'est pas l'objet de cet inventaire, mais chaque appel cassé est soit du code mort (à ignorer lors de la
migration), soit un bouton qui échoue à l'écran (404). **À vérifier à l'écran** pour ceux qui sont dans un écran de
menu actif, en commençant par les impressions `Report/ws_reportGeneratePdf.jsp`.

## 7. API REST existantes : ce qui est là, ce qui manque

**État.** 1 597 points d'entrée REST dans 175 classes (`src/main/java/rest`, `@ApplicationPath("api")`, liste dans
`INVENTAIRE_JSP_MIGRATION_REST_2026-10-26_API.tsv`), 659 classes de service dans `rest/service`. Côté écran, ExtJS cite
`api/v1` 1 856 fois et des JSP 1 259 fois. La colonne « API REST déjà appelées » des tableaux du § 3 montre, écran
par écran, ce qui est déjà migré.

**Gains immédiats : 40 JSP vivantes déjà doublées.** Le Java cite ces JSP en commentaire, le plus souvent sous la
forme « remplace … » ou « mêmes clés JSON que … » : l'équivalent REST existe, il reste à faire pointer les écrans
dessus puis à vérifier à l'écran. Avant chaque bascule, relire la ligne citée pour confirmer qu'il s'agit bien d'un
remplaçant et non d'une simple mention.

| JSP vivante | Écrans | Java qui la cite (équivalent probable) |
|---|---|---|
| `configmanagement/ville/ws_data.jsp` | 38 | `rest/CommonRessource.java:544`, `rest/service/CommonService.java:138` |
| `configmanagement/categorieayantdroit/ws_data.jsp` | 34 | `rest/CommonRessource.java:566`, `rest/service/CommonService.java:144` |
| `configmanagement/typeclient/ws_data.jsp` | 32 | `rest/CommonRessource.java:556`, `rest/service/CommonService.java:141` |
| `sm_user/detailsvente/ws_data.jsp` | 31 | `rest/DetailsVenteRessource.java:27` |
| `configmanagement/client/ws_data.jsp` | 25 | `rest/ClientRessource.java:525`, `rest/service/ClientService.java:101` |
| `configmanagement/compteclienttierspayant/ws_data.jsp` | 20 | `rest/ClientRessource.java:963` |
| `configmanagement/grossiste/ws_data.jsp` | 16 | `rest/ReglementFactureRessource.java:1307` |
| `tierspayantmanagement/typetierspayant/ws_data.jsp` | 15 | `rest/CommonRessource.java:576`, `rest/ReglementFactureRessource.java:1192`, `rest/service/CommonService.java:150`, `rest/TiersPayantRessource.java:937` |
| `configmanagement/famillearticle/ws_data.jsp` | 10 | `rest/service/CommonService.java:134` |
| `configmanagement/zonegeographique/ws_data.jsp` | 10 | `rest/ReferentielArticleRessource.java:42`, `rest/ReferentielArticleRessource.java:376` |
| `sm_user/utilisateur/ws_data.jsp` | 8 | `rest/InventaireRessource.java:185` |
| `configmanagement/compteclienttierspayant/ws_transaction_clt.jsp` | 7 | `rest/ClientRessource.java:1163` |
| `configmanagement/fabriquant/ws_data.jsp` | 6 | `rest/ReferentielArticleRessource.java:168` |
| `sm_user/famille/ws_transaction.jsp` | 6 | `rest/FicheArticleRessource.java:558` |
| `configmanagement/codegestion/ws_data.jsp` | 5 | `rest/ReferentielArticleRessource.java:244` |
| `configmanagement/codeacte/ws_data.jsp` | 4 | `rest/ReferentielArticleRessource.java:42`, `rest/ReferentielArticleRessource.java:342` |
| `configmanagement/famillearticle/ws_data_initial.jsp` | 4 | `rest/ReferentielArticleRessource.java:43`, `rest/ReferentielArticleRessource.java:417` |
| `configmanagement/litige/ws_transaction2.jsp` | 4 | `rest/EtatControlBonResource.java:248`, `rest/service/EtatControlBonService.java:75` |
| `sm_user/facturation/ws_rp_facture_tiers_payant.jsp` | 4 | `rest/report/LieuEdition.java:21` |
| `sm_user/famille/ws_data_jdbc.jsp` | 4 | `rest/EtiquettePanierRessource.java:27`, `rest/service/EtiquettePanierService.java:11` |
| `sm_user/parameter/ws_data.jsp` | 4 | `rest/ParametreRessource.java:113` |
| `tierspayantmanagement/tierspayant/ws_client.jsp` | 4 | `rest/TiersPayantRessource.java:96`, `rest/TiersPayantRessource.java:524` |
| `tierspayantmanagement/tierspayant/ws_transaction.jsp` | 4 | `bll/tierspayantManagement/tierspayantManagement.java:105`, `bll/tierspayantManagement/tierspayantManagement.java:294`, `rest/TiersPayantRessource.java:96` |
| `configmanagement/client/ws_data_compteclttierspayants.jsp` | 3 | `rest/TiersPayantRessource.java:978` |
| `configmanagement/famillearticle/ws_data_maxVente.jsp` | 2 | `rest/ReferentielArticleRessource.java:299` |
| `configmanagement/famillearticle/ws_transaction_maxVente.jsp` | 2 | `rest/ReferentielArticleRessource.java:299` |
| `sm_user/famille/ws_search_data.jsp` | 2 | `rest/ReferentielArticleRessource.java:213` |
| `sm_user/modereglement/ws_data.jsp` | 2 | `rest/ReglementFactureRessource.java:52` |
| `configmanagement/typeetiquette/ws_data.jsp` | 1 | `rest/ReferentielArticleRessource.java:42`, `rest/ReferentielArticleRessource.java:136` |
| `sm_user/facturation/ws_data_detail_facture.jsp` | 1 | `rest/FactureTiersPayantRessource.java:52`, `rest/FactureTiersPayantRessource.java:307` |
| `sm_user/facturation/ws_rp_print_all_invoices.jsp` | 1 | `rest/FactureTiersPayantRessource.java:574` |
| `sm_user/famille/ws_data_codetva.jsp` | 1 | `rest/CommonRessource.java:369`, `rest/service/CommonService.java:122` |
| `sm_user/reglement/ws_data_reglement_by_bordereau.jsp` | 1 | `rest/ReglementFactureRessource.java:51`, `rest/ReglementFactureRessource.java:190` |
| `stockmanagement/stock/ws_etatstock_pdf.jsp` | 1 | `rest/EtatStockRessource.java:278` |
| `stockmanagement/suivistockvente/ws_data_mouvement_entree.jsp` | 1 | `rest/service/utils/StockMovementDataHelper.java:283` |
| `stockmanagement/suivistockvente/ws_data_mouvement_perime.jsp` | 1 | `rest/service/utils/StockMovementDataHelper.java:395` |
| `stockmanagement/suivistockvente/ws_data_mouvement_retour.jsp` | 1 | `rest/service/utils/StockMovementDataHelper.java:471` |
| `stockmanagement/suivistockvente/ws_data_mouvement_vente.jsp` | 1 | `rest/service/utils/StockMovementDataHelper.java:553`, `rest/SuiviStockVenteRessource.java:145` |
| `tierspayantmanagement/tierspayant/ws_search_data.jsp` | 1 | `rest/ReglementFactureRessource.java:1138` |
| `menumanagement/ws_tree_menu.jsp` | hors menu | `filter/SlowRequestFilter.java:30`, `rest/MetroResource.java:23` |

**Ce qui manque, par nature.**

| Nature | JSP vivantes | Ce qu'il faut côté REST |
|---|---|---|
| Lectures seules (listes, référentiels, recherches) | 174 | un `GET` paginé par référentiel ; beaucoup existent déjà dans `CommonRessource`, `ReferentielArticleRessource`, `ClientRessource` |
| Écritures (`ws_transaction*.jsp?mode=create/update/delete…`) | 114 | un `POST`/`PUT`/`DELETE` par mode, **mêmes règles métier** : appeler la même méthode `bll` ou `rest.service`, garder les mêmes refus et messages |
| Impressions (dont 69 par JasperReports) | 70 | un point `…/pdf` qui renvoie le flux (modèle : `rest/report`), mêmes `.jrxml` et mêmes paramètres |
| JDBC direct (`jconnexion`) | 72 | passer par l'`EntityManager` de `JTA_UNIT` (requête native si besoin), pour sortir de la connexion à part |

### Socle commun : les JSP partagées par le plus d'écrans

Ces JSP sont tirées par des fenêtres partagées (création ou choix de client, d'ayant droit, de tiers payant, détail de
vente). Les fichiers qui en propagent le plus : `app/view/sm_user/dovente/action/add.js` (30 écrans),
`app/view/configmanagement/compteclient/action/add.js` (20), `app/view/configmanagement/client/action/showclttierspayant.js`
(20), `app/controller/LaborexWorkFlow.js` (17), `app/view/configmanagement/client/action/addStandardUser.js` (16).
Les migrer d'abord, fenêtre par fenêtre, fait baisser d'un coup le compte de dizaines d'écrans.

| JSP | Écrans qui l'emploient | Lignes | Actions | Équivalent REST cité |
|---|---|---|---|---|
| `configmanagement/ville/ws_data.jsp` | 38 | 159 | lecture | oui |
| `configmanagement/risque/ws_data.jsp` | 36 | 162 | lecture | non |
| `configmanagement/categorieayantdroit/ws_data.jsp` | 34 | 159 | lecture | oui |
| `configmanagement/client/ws_transaction.jsp` | 34 | 343 | creation, modification, suppression | non |
| `configmanagement/typeclient/ws_data.jsp` | 32 | 164 | lecture | oui |
| `sm_user/detailsvente/ws_data.jsp` | 31 | 120 | lecture | oui |
| `configmanagement/client/ws_customer.jsp` | 30 | 84 | lecture | non |
| `configmanagement/compteclienttierspayant/ws_data_tierspayant_create.jsp` | 30 | 160 | lecture | non |
| `sm_user/detailsvente/ws_transaction.jsp` | 28 | 485 | creation, modification, suppression | non |
| `configmanagement/client/ws_data.jsp` | 25 | 65 | lecture | oui |
| `sm_user/famille/ws_data.jsp` | 23 | 55 | lecture | non |
| `configmanagement/compteclient/ws_data.jsp` | 22 | 199 | lecture | non |
| `configmanagement/compteclient/ws_transaction.jsp` | 21 | 128 | creation, modification, suppression | non |
| `configmanagement/compteclienttierspayant/ws_data.jsp` | 20 | 191 | lecture | oui |
| `sm_user/detailsvente/ws_check_bon.jsp` | 17 | 85 | lecture | non |

## 8. Freins à la montée de version (JDK 17 ou 21, Payara 6 / Jakarta EE 10)

Mesures faites sur `src/main/java` (1 659 fichiers), `src/main/webapp`, `pom.xml` et les descripteurs.

### 8.1 Les JSP elles-mêmes

| Constat | Preuve | Effet sur la montée de version |
|---|---|---|
| Scriptlets partout, couplées à l'ancienne couche | 550 JSP sur 557 instancient `dal.dataManager` ; 502 importent `bll.*` ; 185 ont des `<jsp:useBean>` ; 385 lisent la session ; 457 journalisent par `toolkits.utils.logger` | Payara compile les JSP à la volée contre les classes de l'application : une JSP ne casse pas seule, mais **elle fige `dataManager`, `bll` et l'unité `DALPU`**. Tant qu'il reste des JSP vivantes, ces couches doivent passer en Jakarta avec le reste. |
| `javax.*` écrit dans les JSP | 1 seule JSP importe `javax.servlet` | faible : les objets implicites (`request`, `session`) changent de paquet sans toucher au texte |
| Encodage | 109 JSP en ISO-8859-1, dont 65 vivantes | pas de frein Jakarta ; ne pas les réécrire, les remplacer |
| Le Java rappelle des JSP par HTTP | `rest/report/pdf/Etiquete.java:127`, `:142`, `:166` | à supprimer avant de retirer ces trois JSP |

Conclusion : il n'est **pas obligatoire** d'avoir migré toutes les JSP avant Payara 6, mais chaque JSP restante
oblige à passer `dal`, `bll` et `DALPU` en Jakarta. Migrer d'abord les JSP vivantes (§ 10) réduit le chantier.

### 8.2 `javax.*` → `jakarta.*` dans le Java

| Paquet | Fichiers | Remarque |
|---|---|---|
| `javax.ejb` | 585 | `@Stateless`/`@Singleton`… dans 265 fichiers, `@Schedule` dans 28 |
| `javax.persistence` | 536 | 245 entités `dal` |
| `javax.servlet` | 226 | dont 150 ressources REST qui lisent `HttpServletRequest`/`HttpSession` |
| `javax.xml.bind` | 218 | `@XmlRootElement` sur 197 classes (entités générées) et PharmaML (`rest/service/pharmaMl/*`) |
| `javax.ws.rs` | 192 | ressources REST |
| `javax.inject` | 159 | |
| `javax.validation` | 47 | |
| `javax.annotation` | 40 | |
| `javax.transaction` | 10 | |
| `javax.enterprise` | 4 | |
| `javax.mail` | 3 | et la bibliothèque `TOOLKITS` (`javax/mail/internet`, binaire seulement) |
| `javax.json`, `javax.naming`, `javax.sql` | 1, 1, 4 | `javax.naming` et `javax.sql` restent dans le JDK |

Descripteurs à passer aux espaces de noms Jakarta : `web.xml` (version 4.0, `xmlns.jcp.org`), `beans.xml` (2.0),
`persistence.xml` (2.1, deux exemplaires : `src/main/resources/META-INF` et `src/test/resources`).
Le renommage est mécanique (OpenRewrite `JavaxMigrationToJakarta` ou Eclipse Transformer), à faire **en une seule
fois sur une branche dédiée**, avec la suite e2e complète ensuite.

### 8.3 Deux fournisseurs JPA

| Unité | Fournisseur | Transactions | Employée par |
|---|---|---|---|
| `DALPU` | EclipseLink (celui de Payara, pas de `<provider>`) | `RESOURCE_LOCAL`, `non-jta-data-source` | `dal.dataManager` : 550 JSP, 123 classes Java (`bll`…) |
| `JTA_UNIT` | Hibernate 5.4.3 (`hibernate-core` embarqué) | JTA | `@PersistenceContext` : 230 classes (REST, services) |

Les **mêmes 245 entités** servent aux deux. 9 classes emploient l'API propre à Hibernate (`org.hibernate`), dont 4
entités (`HistoriqueImportation`, `StockSnapshot`, `TBonLivraisonDetail`, `TOrderDetail`) et l'inspecteur de requêtes
`rest/service/impl/OrdreLectureVentes.java` déclaré dans `persistence.xml`. Effets :

- deux caches de premier niveau et deux transactions sur la même base : une écriture faite par une JSP n'est pas vue
  dans la même transaction qu'une écriture REST ; c'est une source connue de régressions lors d'une migration
  partielle d'un écran (garder la même unité pour toutes les écritures d'un même flux) ;
- Payara 6 fournit EclipseLink 4 (Jakarta) ; Hibernate 5.4 est en `javax` : il faut Hibernate 6.x
  (`MySQL5InnoDBDialect` n'existe plus, `SunOneJtaPlatform` change de nom, `hibernate-types-52` devient
  `hypersistence-utils`) ;
- **cible recommandée** : une seule unité, Hibernate en JTA (c'est aussi le défaut de Spring Boot). `DALPU` disparaît
  avec les dernières JSP et les dernières classes `bll` qui passent par `dataManager`.

### 8.4 Bibliothèques du `pom.xml`

| Dépendance | Version | Frein | Proposition |
|---|---|---|---|
| `javax:javaee-api` | 8.0 | Java EE 8 | `jakarta.platform:jakarta.jakartaee-api` 10.0.0 (`provided`) |
| `hibernate-core`, `hibernate-entitymanager` | 5.4.3.Final | `javax.persistence` ; `entitymanager` fusionné dans `core` depuis 5.2 | Hibernate 6.2+ (Jakarta) ; retirer `entitymanager` |
| `hibernate-jpamodelgen` | 5.3.10.Final | version différente de `core` | même version que `core` |
| `hibernate-validator` | 5.4.3.Final | Bean Validation 1.1 (`javax`) | ne plus l'embarquer : Payara 6 fournit Hibernate Validator 8 |
| `com.vladmihalcea:hibernate-types-52` | 2.10.0 | lié à Hibernate 5 | `io.hypersistence:hypersistence-utils-hibernate-6x` |
| `mysql:mysql-connector-java` | 5.1.23 (`provided`, dans Payara) | pilote de 2013 face à MariaDB 10.6, TLS ancien sous JDK 17 | MariaDB Connector/J 3.x dans le domaine Payara |
| `flyway-core` | 6.1.0 | ancien ; Flyway 10 demande Java 17 et un module `flyway-mysql` séparé | Flyway 9 (JDK 11) puis 10 (JDK 17) |
| `groovy-all` | 2.4.16 | Groovy 2.4 ne fonctionne pas avec l'encapsulation forte du JDK 17 ; JasperReports s'en sert pour compiler les expressions Groovy. Les 50 `.jrxml` du dépôt n'ont pas d'attribut `language` (Groovy par défaut : **à vérifier** en compilant un rapport sous JDK 17) | Groovy 3/4, ou `language="java"` dans les `.jrxml` |
| `jasperreports` (+ `-fonts`) | 6.18.1 | fonctionne sous JDK 17 ; dépend de Groovy | 6.20.x pour JDK 17/21 |
| `commons-fileupload` | 1.5 | lié à `javax.servlet` | API `Part` de Servlet, ou `commons-fileupload2-jakarta` |
| `lombok` | 1.18.26 | JDK 21 demande 1.18.30 ou plus | 1.18.30+ (dépendance et `maven-war-plugin`) |
| `jackson-databind` | 2.12.5 | failles connues | 2.17.x |
| `poi`, `poi-ooxml` | 4.1.1 | ancien | 5.2.x |
| `batik-bridge` | 1.12 | failles connues | 1.17 |
| `itextpdf` | 5.5.13.3 | fin de vie, licence AGPL | à garder pour la montée de version, à revoir ensuite |
| `jasypt` | 1.9.2 | ancien | 1.9.3 |
| `barcode4j` | 2.1 | abandonné (2006), fonctionne | à garder |
| `quartz` | 2.3.2 | **aucune classe de `src/main/java` n'importe `org.quartz`** | à retirer après vérification du `war` |
| `TOOLKITS`, `MULTILANGUE` | 0.0.1-SNAPSHOT | jars présents seulement dans `~/.m2` (construits sous JDK 11) ; `TOOLKITS` emploie `javax.mail.internet`. Source : **à vérifier** (absente du dépôt) | reconstruire en Jakarta, ou rapatrier les quelques classes employées |
| `maven-compiler-plugin` | `source`/`target` 11 | | `<release>17</release>` puis 21 |
| `maven-war-plugin` | 3.2.1 | ancien pour JDK 17 | 3.4.0 |
| dépôt `pentaho-repo` | | dépôt tiers dans le `pom.xml` | vérifier s'il sert encore |

### 8.5 JDK et serveur

| Constat | Preuve | Effet |
|---|---|---|
| Pas d'API interne du JDK | aucun `sun.misc`, `jdk.internal`, `ScriptEngine`/Nashorn, `SecurityManager` | rien à faire |
| `com.sun.management.OperatingSystemMXBean` | `rest/service/impl/serveur/MesureServeur.java:68` | API exportée (`jdk.management`) : fonctionne sous 17/21 |
| Constructeurs de boîtes dépréciés | `new Integer(` dans 226 fichiers, `new Double(` dans 10 | avertissements « for removal », compile encore sous 21 ; à remplacer par `valueOf` au fil de l'eau |
| `java.awt` côté serveur | 14 classes, 48 JSP (formats de page, codes-barres) | lancer Payara en `-Djava.awt.headless=true` et vérifier les polices des PDF |
| Propriété propre à Payara | `com.sun.aas.instanceRoot` dans `job/PoolReparation.java:131`, `job/SupportWatchdog.java:223`, `rest/SupportServeurRessource.java:195` | existe encore dans Payara 6 ; à abstraire pour Spring Boot |
| Configuration Payara par code | `rest/service/impl/serveur/ConfigPayara.java:196` (`org.glassfish.api.jdbc.validation…`) | à revoir pour Payara 6 et à remplacer pour Spring Boot |
| EJB | `@Stateless`/`@Singleton`… (265 fichiers), `@Schedule` (28) | fonctionnent sous Payara 6 ; pour Spring Boot : `@Service`, `@Transactional`, `@Scheduled` |

## 9. Préparer Spring Boot et Angular

Ce qui facilitera la suite, à appliquer dès maintenant à chaque JSP migrée :

1. **Séparer la logique de l'accès HTTP.** La ressource REST ne fait que lire les paramètres, appeler un service et
   renvoyer le résultat. Le service (`rest/service/*`) ne voit ni `HttpServletRequest` ni `HttpSession` : l'utilisateur
   courant lui est passé en paramètre. Aujourd'hui 150 ressources lisent la requête ou la session et 27 tiennent
   elles-mêmes un `EntityManager` ; 30 ressources dépassent 500 lignes. Un service pur se transporte tel quel dans
   Spring (`@Service`).
2. **Contrats JSON stables et typés.** 153 ressources construisent leur réponse avec `org.json` (`JSONObject`) et
   141 renvoient `json.toString()`. Pour Angular, préférer des DTO (299 classes déjà dans des paquets `dto`), un
   format de page unique (`{total, data}` déjà répandu), des noms de champs fixés, des dates ISO-8601 et des codes HTTP
   justes (400/403/404/409 plutôt que `success: false` en 200). Garder les **mêmes clés** que la JSP remplacée tant
   qu'ExtJS consomme la réponse, et documenter le contrat (aucune description OpenAPI aujourd'hui).
3. **Une seule unité de persistance** (Hibernate en JTA), donc la fin de `dataManager` et de `DALPU` (§ 8.3).
4. **Des droits vérifiés côté serveur** pour chaque point REST (le privilège `P_…` du sous-menu), et non par
   l'affichage du bouton : Angular ne fera que masquer.
5. **Des impressions en service** : un service qui rend le PDF (Jasper) à partir de paramètres, sans `request`, appelé
   par la ressource REST ; plus d'appel HTTP interne vers une JSP (`Etiquete.java`).
6. **Des tâches planifiées sans EJB Timer dans la logique** : la méthode planifiée appelle un service ; on change
   seulement l'annotation au passage à Spring.
7. **Préfixe et version** : tout passe par `api/v1` ; un futur frontal Angular pourra vivre à côté d'ExtJS, écran par
   écran, sur les mêmes API.

## 10. Feuille de route

Chaque étape : branche dédiée, test e2e qui passe par l'écran **avant** la bascule (règle du projet : reproduire,
puis basculer, puis repasser le test), sauvegarde de la copie de travail avant les tests, aucune suppression de JSP
sans décision.

| Étape | Contenu | Volume | Risque |
|---|---|---|---|
| **0. Décisions** | Valider la liste des mortes (§ 5) ; relever 30 jours de journaux d'accès Payara sur les URL `webservices/**` de chaque officine pour confirmer mortes, orphelines, menus inactifs et `MOBILES` ; décider du sort des 156 appels vers des JSP absentes (§ 6) | — | nul |
| **1. Gains immédiats** | Faire pointer les écrans sur le REST qui existe déjà pour les 40 JSP du § 7 ; arbre des menus (`ws_tree_menu.jsp` → `MetroResource`) ; notifications de `general/index.jsp` ; supprimer l'appel HTTP interne de `Etiquete.java` | 47 JSP | faible |
| **2. Socle commun** | Fenêtres partagées : création et choix de client, ayant droit, tiers payant, compte client, détail de vente (`dovente/action/add.js`, `compteclient/action/add.js`, `showclttierspayant.js`, `addStandardUser.js`, `LaborexWorkFlow.js`) | 10 JSP de plus, présentes dans 16 à 38 écrans | moyen à élevé (création de client pendant une vente) |
| **3. P1 : lecture et impression** | 54 sous-menus, surtout ANALYSE DE GESTION (17), GESTION DU STOCK (10), PARAMETRAGES (10) : états, statistiques, PDF Jasper | 100 JSP de plus | faible |
| **4. P2 : référentiels et administration** | 37 sous-menus : PARAMETRAGES (14), GESTION DES TIERS-PAYANTS (7), CONFIGURATION (5), GESTION DES UTILISATEURS (4)… | 90 JSP de plus | moyen |
| **5. P3 : flux sensibles** | 26 sous-menus et les écrans secondaires : FACTURATION (factures, règlements, groupes d'assurances), GESTION DES TIERS-PAYANTS (clients, tiers payants, balance âgée, litiges), GESTION DU STOCK (fiche article, inventaire, périmés, ajustements), GESTION DES COMMANDES, RETROCESSION, mouvements de caisse. Un flux à la fois, écritures sur une seule unité de persistance | 71 JSP de plus | élevé |
| **6. Fin de `DALPU`** | Il ne reste que les 3 pages hôtes (`index.jsp`, `general/index.jsp`, `security/index.jsp`), sans `dataManager` à garder : retirer `dataManager` des classes `bll` restantes, une seule unité (Hibernate JTA) | 123 classes | moyen |
| **7. JDK 17** | Mise à niveau des bibliothèques du § 8.4 compatibles `javax` (Groovy, Jasper, Lombok, Flyway 9, pilote MariaDB, POI, Jackson), `release 17`, Payara 5 sur JDK 17 (pris en charge par 5.2022.x : **à vérifier** sur la version installée) | — | moyen |
| **8. Payara 6 / Jakarta EE 10** | Renommage `javax` → `jakarta` en une fois, descripteurs, Hibernate 6, `hypersistence-utils`, `TOOLKITS` reconstruit ; JDK 21 ensuite | 974 fichiers Java et 4 descripteurs, mécanique | élevé (tout l'applicatif) : suite e2e complète |
| **9. Spring Boot puis Angular** | Services déjà purs (§ 9) repris en `@Service` ; écrans Angular un par un sur les mêmes API, en commençant par les écrans P1 déjà migrés | — | — |

Ordre conseillé dans chaque menu : celui des tableaux du § 3 (priorité, puis complexité croissante). Les menus
inactifs ne sont pas migrés tant que l'étape 0 n'a pas dit s'ils servent ailleurs.
