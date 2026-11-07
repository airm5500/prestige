# Faisabilité : connecteurs en lecture seule vers les extranets Ubipharm et TEDIS

Date : 7 novembre 2026. Branche de départ : `integration/recette-2026-10-29` (« integration 29/10/2026 »).
Source : `D:\planReserveAPI.md` (plan du 07/11).

Périmètre de ce document : **analyse seulement**. Rien n'a été implémenté. Aucun extranet n'a été appelé, aucune
connexion n'a été tentée, aucune commande ni réclamation n'a été soumise. Toutes les affirmations sur les extranets
viennent du plan ; celles sur Prestige viennent de la lecture du code de la branche.

Légende : **[confirmé]** vu dans le code ou dans les extraits du plan ; **[probable]** interprétation ; **[inconnu]**
reste à capturer.

---

## 0. En bref

- **Le projet peut accueillir ces connecteurs sans nouvelle bibliothèque.** Le client HTTP de Java 11
  (`java.net.http.HttpClient`) est déjà utilisé par sept intégrations sortantes ; `org.json` et Jackson sont dans le
  `pom.xml` ; **jsoup 1.16.1 est déjà dans le WAR et dans le dépôt Maven local**, mais seulement par accident (voir
  1.2) : il faudra le déclarer explicitement, ce qui marche hors ligne.
- **Le modèle à suivre existe : la disponibilité PharmaML** (`DisponibiliteServiceImpl`, `DisponibiliteRessource`,
  table `t_disponibilite_produit`, archivage des échanges, tâche planifiée `PharmaMlVidageScheduler`). Pour les secrets,
  le modèle est `PososConfiguration` (variable d'environnement, puis propriété JVM, puis fichier hors dépôt ; le secret
  n'a pas d'accesseur public et n'est jamais journalisé).
- **Faisable maintenant** (sur la foi des extraits, une fois une session disponible) : fiche produit JSON Ubipharm,
  réapprovisionnements paginés, liste et détail des réclamations, nouveaux produits. **Faisable avec captures** :
  images, PDF de réclamation, produits réclamés, dernières commandes, relevés, promotions et quinzaine TEDIS.
  **Bloqué** : tout TEDIS tant que sa connexion n'est pas décrite ; historique des réclamations TEDIS, liste des
  quinzaines et `miseEnPlace`.
- **Le point dur est l'authentification**, pas le parsing. Recommandation : commencer par une session fournie à la main
  côté serveur (jamais dans le navigateur ni dans Git), puis, selon ce que montreront les formulaires de connexion,
  passer à une connexion par HTTP ou à une fenêtre Playwright où la personne se connecte elle-même.
- **Lien avec Prestige** : le « PSCODE » du point 15 du plan du 06/11 est très probablement **la référence produit
  Ubipharm** (`data-pscode`, champ `pscode` ; même préfixe `ps` que `pslib`, `pspven`, `psppub`…) **[probable]**.
  Prestige a déjà une table pour ce genre de code : `t_famille_grossiste.str_CODE_ARTICLE` (code article chez un
  grossiste), que PharmaML utilise déjà. C'est une question à trancher avant d'implémenter le point 15.
- **Estimation** : socle + Ubipharm (fiche, réappro, réclamations, nouveaux produits) + écran : **9 à 11 jours de charge**, soit **environ 5 jours calendaires** avec des sessions en parallèle.
  Ensemble complet : **15 à 19 jours de charge**, **7 à 8 jours calendaires**, sous réserve des captures.

---

## 1. Accueil dans Prestige

### 1.1 Ce qui existe déjà

| Besoin | Existant dans la branche | Fichiers |
|---|---|---|
| Client HTTP sortant | `java.net.http.HttpClient` (JDK 11), délais, redirections maîtrisées | `DisponibiliteServiceImpl`, `PharmaMlServiceImpl`, `MonographieServiceImpl`, `PososClient`, `FneServiceImpl`, `HttpPaiements`, `WhatsAppEnvoi`, `OrangeSmsClient` |
| Connecteur grossiste | PharmaML : disponibilité (`REQ_INFO_PRODUIT`), commandes, retours ; réglages par grossiste dans `t_grossiste` (`str_URL_PHARMAML`, `int_PHARMAML_DISPO`…) | `rest/service/impl/DisponibiliteServiceImpl.java`, `rest/DisponibiliteRessource.java`, `rest/service/impl/PharmaMl*.java` |
| Code produit chez un grossiste | `t_famille_grossiste.str_CODE_ARTICLE`, `int_PAF`, `int_PRICE`, rupture | `dal/TFamilleGrossiste.java` |
| Cache horodaté de réponses grossiste | `t_disponibilite_produit` (dernier résultat par produit, `dt_CREATED`), archives `I_`/`RI_` des échanges | `DisponibiliteServiceImpl` |
| Secrets côté serveur | Posos : environnement → propriété JVM → `posos.properties` hors dépôt, secret sans accesseur public, jamais journalisé. WhatsApp : table `whatsapp_compte`, secrets remplacés par « défini / non défini » dans `publique()` | `rest/service/posos/PososConfiguration.java`, `util/whatsapp/WhatsAppCompte.java` |
| Service compagnon Node | Service WhatsApp Web lancé à côté de Payara | `outils/whatsapp-web/`, `util/whatsapp/LancementServiceWhatsApp.java` |
| Tâches planifiées | EJB `@Schedule` | `job/PharmaMlVidageScheduler.java` et voisins |
| Migrations de base | Flyway (dernière : `V7.2.9__anomalies_employes.sql`) | `src/main/resources/db/migration/` |
| API REST | JAX-RS, `@ApplicationPath("api")`, ressources `v1/...` | `rest/JaxRsConfig.java`, `rest/*Ressource.java` |
| Playwright | `playwright-core` (Node) pour les tests d'écran | `src/test/e2e/smoke-ecrans.js` |

Aucun connecteur Ubipharm ou TEDIS n'existe aujourd'hui (recherche sur `ubipharm`, `tedis`, `pscode` : aucun
résultat dans `src/`).

### 1.2 Dépendances (build hors ligne `mvn -o`)

- **jsoup** : `jsoup-1.16.1.jar` est dans `~/.m2` et dans `target/prestige/WEB-INF/lib`. Il n'est **pas** déclaré dans
  le `pom.xml` : il arrive par `net.revelc.code.formatter:formatter-maven-plugin:2.23.0`, déclaré par erreur comme
  dépendance d'exécution (ligne 208 du `pom.xml`). Hibernate Validator le cite aussi, mais en `optional`. Il faut donc
  **déclarer `org.jsoup:jsoup:1.16.1` explicitement** : la version est en cache, le build hors ligne passe, et le jour
  où quelqu'un retire le plugin de formatage des dépendances, le connecteur ne casse pas. jsoup n'exécute jamais les
  scripts des pages (règle 17 du plan respectée d'office).
- **JSON** : `org.json` (20230227) et `jackson-databind` (2.12.5) sont présents. Garder `org.json` comme
  `DisponibiliteServiceImpl`, ou Jackson pour lier des classes : les deux conviennent.
- **Montants** : `BigDecimal` du JDK (règle 17 : décimaux pour les calculs financiers).
- **Playwright** : seulement côté Node (`playwright-core`), pas en Java. Le port Java de Playwright n'est pas dans le
  cache Maven : il faudrait un accès réseau pour l'ajouter, et il embarque des navigateurs. **Ne pas l'ajouter au
  WAR** ; si Playwright sert à établir une session, ce sera un petit outil Node à part (voir 3).

### 1.3 Découpage proposé

Paquet `rest.service.extranet` (à côté de `rest.service.posos`), en couches séparées comme le demande le plan (§18.3) :

```
rest/service/extranet/
  commun/
    ExtranetConfiguration      secrets et réglages, sur le modèle de PososConfiguration
    SessionExtranet            un CookieManager par domaine, état (valide, expirée, inconnue), jamais exposé
    TransportExtranet          HttpClient, Redirect.NEVER, délais, cadence limitée, reprise, contrôle Content-Type
    DetecteurPageConnexion     redirection 302 vers la connexion, ou page de connexion servie en 200
    Collecte                   une exécution : source, point d'appel, paramètres, début/fin, statut, nombre attendu/reçu
    Normalisation              dates françaises explicites, montants bruts + BigDecimal, null / "" / [] / 0 / inconnu
  ubipharm/
    UbipharmClient             un appel = une méthode GET, aucune méthode d'écriture
    UbipharmParseur            jsoup (HTML), org.json (enveloppes DataTables, SavoirPlusJSON)
    modèles : ProduitUbipharm, StockAgence, LigneReappro, Reclamation, LigneReclamation (cellules brutes par position)
  tedis/
    TedisClient, TedisParseur, modèles : Quinzaine, BonLivraisonTedis, Annonce, PromotionBrute
rest/ExtranetRessource.java    @Path("v1/extranet") : lecture du cache, déclenchement d'une collecte
```

Points de conception :

- **Lecture seule par construction** : les clients n'offrent que des GET (et, pour TEDIS, le POST de connexion s'il le
  faut). Aucune méthode ne construit une commande ou une réclamation ; un test le vérifie par réflexion.
- **Pas de redirection automatique** : `Redirect.NEVER`, pour voir le 302 vers la page de connexion au lieu de le
  suivre et d'analyser la page de connexion comme des données.
- **Avant de lire du JSON** : Content-Type `application/json` **et** premier caractère `{` ou `[` ; sinon, contrôle
  « page de connexion » et arrêt de la collecte avec le statut « session expirée ».
- **Avant de garder un PDF** : Content-Type `application/pdf` **et** signature `%PDF-` ; on garde les octets
  d'origine, leur empreinte SHA-256 et les paramètres du lien source.
- **Cadence** : une requête à la fois par domaine, pause réglable (par exemple 1 s), arrêt après N erreurs de suite.
- **Pagination DataTables** : nombre de pages calculé à partir de `recordsTotal` de la première réponse ; arrêt si une
  page revient vide, si elle répète la précédente (empreinte), ou si `recordsTotal` change en cours de route (la
  collecte est alors marquée « jeu de données modifié pendant la lecture »).
- **Journaux** : URL sans paramètres sensibles, statut HTTP, durée, nombre de lignes. Jamais de cookie, de `_token`,
  de corps de réponse ni de commentaire de réclamation.

### 1.4 Cache et horodatage (MariaDB, Flyway)

Tables nouvelles, préfixées `extranet_`, alimentées uniquement par les collectes. Aucune table métier de Prestige n'est
modifiée par un connecteur.

| Table | Contenu |
|---|---|
| `extranet_collecte` | une ligne par exécution : source (UBIPHARM/TEDIS), module, paramètres, utilisateur, début, fin, statut, attendu (`recordsTotal`), reçu, message |
| `extranet_produit` | pscode, désignations, picode et liste `cips` (chaînes), catégorie, famille, statut, prix bruts et décimaux, TVA, stock société, JSON brut, collecte |
| `extranet_stock_agence` | pscode, etcode, etlib, psstk, colisages (liste affichée + attribut brut), disponibilité texte, collecte |
| `extranet_reappro` | cellules normalisées + cellules brutes, pscode, cip, etcoda, date affichée (sans heure inventée), collecte |
| `extranet_reclamation` | id, eta, appl tirés du lien, référence, numéros associés (brut), statut, dates, collecte |
| `extranet_reclamation_ligne` | réclamation, position de ligne, 14 cellules brutes par position, champs reconnus (pscode, CIP, quantité, prix brut, motif) |
| `extranet_document` | type (RLV, réclamation…), paramètres du lien, Content-Type, taille, SHA-256, chemin du fichier sur disque serveur |
| `extranet_tedis_quinzaine` | idDate, `TotalQuizaine` déclaré, somme calculée des `TotalTTC`, écart, `TotalProtocol`, collecte |
| `extranet_tedis_document` | champs observés de `DatabonLivraison`, JSON brut, quinzaine, collecte |

Règle « donnée écrite = donnée relue » : chaque table a son lecteur dans `ExtranetRessource` et un test qui la relit.
Les PDF vont sur disque (dossier serveur, comme les archives PharmaML), pas en base.

### 1.5 Exposition et écran

- `GET /api/v1/extranet/ubipharm/produits/{pscode}` : dernière fiche en cache et date de collecte ;
- `GET /api/v1/extranet/ubipharm/reappro`, `.../reclamations?filtre=ALL|C|V`, `.../reclamations/{id}` ;
- `GET /api/v1/extranet/tedis/quinzaines/{idDate}` : total déclaré, somme calculée, écart, séparément ;
- `POST /api/v1/extranet/{source}/collectes/{module}` : lance une collecte (écrit seulement dans les tables
  `extranet_`), renvoie l'identifiant de collecte ; `GET .../collectes/{id}` pour la suivre ;
- `GET /api/v1/extranet/{source}/session` : état de la session (valide, expirée, non configurée), jamais sa valeur.

Écran ExtJS « Extranets grossistes », menu déclaré dans `correctifs-affichage.js`. Aucune page JSP. Le HTML source
n'est jamais affiché tel quel (règle 17) : l'écran ne montre que les champs normalisés.

---

## 2. Faisabilité par module

« Faisable maintenant » suppose qu'une session valide existe (voir 3) et qu'on dispose **des réponses complètes
enregistrées** pour écrire les tests : aujourd'hui le plan ne contient que des extraits, et les tests ne doivent pas
appeler les extranets. Il faut donc, pour chaque module, au moins une réponse brute enregistrée (anonymisée si
besoin) qui servira de jeu d'essai à un faux serveur local.

| § | Module | Verdict | Pourquoi / ce qui manque |
|---|---|---|---|
| 3 | Ubipharm nouveaux produits | **Faisable maintenant**, partiel | Sélecteurs et attributs connus. Manquent : une page complète, la pagination éventuelle. Disponibilité ≠ quantité, à garder en texte. |
| 4 | Fiche produit `SavoirPlusJSON` | **Faisable maintenant** | Le mieux documenté. Listes vides (`reappro`, `promos`, `arrivage`, `substitu`, `qttcde`) gardées en JSON brut tant que leur schéma est inconnu. Prix en CFA, HT pour la parapharmacie et TTC pour les médicaments (réponse du 07/11) ; stockés bruts, base affichée sur la fiche. |
| 5 | Images produit | **Avec captures** | Une réponse image réelle (Content-Type, cas « pas d'image »). Utilité faible : à la fin. |
| 6 | Réapprovisionnements `ReturnProduitsReapproJSON` | **Faisable maintenant** | Paramètres DataTables et enveloppe connus ; pagination calculée. Clé métier d'une ligne inconnue : on garde chaque ligne avec sa position et son agence, sans dédoublonner. Sens de la date (colonne 1) à confirmer. |
| 7 | Liste des réclamations | **Faisable maintenant** | Enveloppe, six cellules, filtres ALL/C/V connus ; `id`, `eta`, `appl` tirés du lien. Contrôle de complétude `recordsTotal` = lignes reçues. Filtre des « supprimées » inconnu (on les voit dans ALL). |
| 8 | Détail d'une réclamation | **Faisable maintenant** | 14 colonnes gardées par position ; seules les colonnes reconnues sont nommées. « Produit inconnu » à pscode vide : aucun produit créé. |
| 8 | PDF de réclamation | **Avec captures** | Lien connu, réponse jamais inspectée. Le téléchargement générique (signature `%PDF-`) peut être écrit, mais pas testé sans un vrai fichier. |
| 9 | Produits réclamés | **Avec captures** | Seul un extrait HTML est connu ; réponse complète et pagination manquent. Redondant avec 7-8. |
| 10 | Dernières commandes | **Avec captures** | Sens des nombres non confirmé ; n'est pas un historique. Faible valeur tant que ce n'est pas clarifié. |
| 11 | Relevés `ListeReleves` / `DisplayPDF` | **Avec captures** (bloqué sans) | Aucune réponse de `ListeReleves` : on ne sait pas d'où tirer `annee`, `mois`, `numrlv`, `clcode`, `soc`, `etab`. Sans cette liste, rien d'automatique. |
| 12 | TEDIS annonces | **Bloqué par la connexion TEDIS**, sinon trivial | Réponse simple (`succes`, `data[].MessageExtranetUtilisateur`). |
| 13 | TEDIS promotions | **Bloqué par la connexion**, puis partiel | Schéma d'une promotion inconnu (liste vide observée) : on ne peut que garder le brut et compter. |
| 14 | TEDIS historique des réclamations | **Bloqué** | La page ne contient qu'un formulaire ; les appels réseau qui chargent les données ne sont pas identifiés. |
| 15 | TEDIS quinzaine `donneequinzaine` | **Bloqué par la connexion**, puis faisable pour un `idDate` donné | La liste des périodes est inconnue : sans elle, l'utilisateur devrait saisir l'identifiant. Écart déclaré/calculé (506 638 / 542 710) exposé tel quel. |
| 16 | TEDIS `miseEnPlace` | **Bloqué** | URL seule. |

---

## 3. Le point dur : l'authentification

### 3.1 Ce qu'on sait

- **Ubipharm** [confirmé] : un cookie `SESSIONID` suffit pour la session observée ; les appels JSON portent
  `X-Requested-With: XMLHttpRequest`, `Accept` et `Referer` (caractère obligatoire non testé). Formulaire de connexion,
  durée de vie de la session, renouvellement, double authentification, captcha : **[inconnu]**.
- **TEDIS** [confirmé] : un champ `_token` dans un formulaire. [probable] Le nom `_token` et les réponses
  `{"succes": …}` font penser à une application Laravel, qui associe en général un cookie de session, un cookie
  `XSRF-TOKEN` et un `_token` par formulaire. À vérifier par capture : rien n'est sûr.
- **Un cookie de session Ubipharm a été partagé pendant l'analyse** : il doit être invalidé (déconnexion du compte sur
  l'extranet, ou changement de mot de passe) avant tout essai. Il ne doit être utilisé par aucun essai.

### 3.2 Options

| Option | Principe | Avantages | Risques |
|---|---|---|---|
| **A. Session saisie à la main** | La personne se connecte dans son navigateur, copie la valeur du cookie dans un écran d'administration de Prestige ; le serveur la garde (mémoire, ou table à secret masqué comme `whatsapp_compte`) | Rien à deviner sur la connexion ; double authentification et captcha restent faits par un humain ; rapide à livrer | Manipulation d'un secret par copier-coller (c'est ce qui a fuité cette fois) ; session partagée avec le navigateur : une déconnexion d'un côté coupe l'autre ; durée de vie inconnue, donc relances fréquentes ; aucun renouvellement automatique |
| **B. Connexion HTTP par le serveur** | Identifiant et mot de passe dans la configuration serveur (modèle Posos : environnement ou fichier hors dépôt) ; le serveur poste le formulaire et garde ses cookies | Entièrement automatique ; session propre au serveur | Possible seulement **sans captcha ni double authentification** ; mot de passe stocké sur le serveur de l'officine ; le formulaire peut changer ; peut être contraire aux conditions d'utilisation de l'extranet |
| **C. Playwright sans fenêtre** | Un petit outil Node (comme le service WhatsApp Web) ouvre un navigateur caché, se connecte avec les identifiants, remet les cookies au serveur Java, qui fait ensuite des appels HTTP | Supporte une connexion en JavaScript que B ne sait pas faire | Navigateur à installer sur le serveur de l'officine ; fragile aux changements d'écran ; échoue de toute façon devant une double authentification ; contourner un captcha est **interdit** (règles) ; mêmes risques de stockage du mot de passe que B |
| **D. Playwright avec fenêtre, connexion humaine** | L'outil Node ouvre une fenêtre sur le poste ; la personne se connecte elle-même (double authentification comprise) ; l'outil récupère les cookies et les donne au serveur, sans copier-coller | Aucun mot de passe stocké ; marche avec la double authentification ; plus de copier-coller du secret | Demande une personne à chaque expiration ; navigateur Playwright à installer sur le poste qui sert à cela ; un peu plus de travail que A |

**Recommandation.**
1. Étape 1 : **option A**, limitée à l'administrateur, valeur jamais renvoyée par l'API (seulement « définie / non
   définie / expirée »), jamais journalisée, effacée à la détection d'une expiration. Elle permet de tout construire
   et de mesurer la durée de vie réelle des sessions.
2. Ensuite, selon les captures du formulaire de connexion : **B** si la connexion est un simple formulaire sans
   captcha ni second facteur et si l'officine accepte de confier le mot de passe au serveur ; sinon **D**. **C** n'a
   d'intérêt que si la connexion exige du JavaScript et qu'il n'y a pas de second facteur.
**Décision du 07/11 (corrigée)** : l'utilisateur renseigne lui-même l'identifiant et le mot de passe de chaque
extranet dans Prestige (option B) ; le serveur se connecte seul et se reconnecte quand la session expire. Le cookie
collé (option A) reste possible en secours. Voir section 9.

3. Dans tous les cas : un compte dédié au connecteur, si le grossiste le permet, pour ne pas partager la session de
   la personne ; et l'accord du grossiste sur un accès automatisé (conditions d'utilisation, cadence).

### 3.3 Détection d'expiration (toutes options)

Une réponse est une page de connexion si : statut 302/303 vers une URL de connexion ; ou statut 200 avec un
Content-Type HTML là où on attendait du JSON ; ou présence du formulaire de connexion (sélecteur à définir d'après la
capture). La collecte s'arrête alors avec le statut « session expirée », sans rien écrire de partiel comme s'il était
complet, et l'écran le signale.

---

## 4. Lien avec les données de Prestige

### 4.1 Rapprochement des produits

- **Par code article grossiste** : `t_famille_grossiste.str_CODE_ARTICLE` pour le grossiste Ubipharm, s'il est rempli
  avec le pscode (à vérifier sur la copie locale avec l'accord de l'utilisateur : ce n'est pas une colonne nominative).
  C'est déjà le premier code envoyé par la disponibilité PharmaML.
- **Par CIP / EAN** : le `picode` observé (`3000001262862`, `3000000218945`) a 13 chiffres [confirmé] ; il ressemble à
  un EAN-13 [probable]. Comparer comme chaînes avec `t_famille.int_CIP`, `int_CIP2` à `int_CIP4` et `int_EAN13`
  (tous des `String` dans `TFamille`), et avec la liste `cips` de `SavoirPlusJSON`. Aucune longueur fixe supposée.
- **Résultat du rapprochement** : trouvé par code grossiste, trouvé par CIP, plusieurs candidats, introuvable. Jamais de
  création ou de modification d'article automatique : au plus une proposition à valider.

### 4.2 Le PSCODE (point 15 du plan du 06/11)

`docs/notices/ANALYSE_PLAN_2026-11-06.md` (branche `claude/new-session-xm8ptu`) décrit le PSCODE comme un « code
grossiste secondaire », facultatif, recherchable (exemple FORT256), et propose une nouvelle colonne sur la fiche
article. Les extraits Ubipharm montrent `data-pscode="FAIR248"`, `pscode`, et des champs de même préfixe (`pslib`,
`psppub`, `psstk`…) : **le PSCODE est très probablement la référence produit Ubipharm** [probable].

Conséquence à trancher avant d'implémenter le point 15 :
- soit une colonne sur `t_famille` (proposition actuelle) : simple, mais un seul code, sans grossiste ;
- soit `t_famille_grossiste.str_CODE_ARTICLE` pour le grossiste Ubipharm : déjà en place, déjà utilisé par PharmaML,
  un code par grossiste ; la recherche en vente se ferait sur cette table ;
- soit les deux : la colonne affichée sur la fiche reste la saisie, et elle alimente la ligne Ubipharm.

Le connecteur peut aussi **remplir** ce code : quand un article est rapproché par CIP, proposer le pscode trouvé.

### 4.3 Usages possibles, par ordre d'intérêt

1. **Disponibilité par agence** (`infosParEtablissement`) à côté de la disponibilité PharmaML dans la suggestion et la
   commande : même écran, autre source, avec sa date de collecte.
2. **Réclamations Ubipharm ↔ retours fournisseurs** de Prestige (`RetourFournisseurServiceImpl`) : suivi du statut
   (en traitement, clôturée) d'un retour sans aller sur l'extranet. Rapprochement par produit, quantité, date ; le
   « numéro associé » (704579) est peut-être un numéro de facture ou de BL [inconnu].
3. **Quinzaines TEDIS ↔ bons de livraison** (`t_bon_livraison.str_REF_LIVRAISON`) : contrôle des montants facturés
   par quinzaine, avec l'écart déclaré/calculé affiché tel quel.
4. **Prix** : `pspven` / `psppub` face à `int_PAF` / `int_PRICE` — prix en CFA, HT pour la parapharmacie, TTC pour les médicaments (réponse du 07/11). La fiche ne portant pas la catégorie, la parapharmacie est reconnue à sa TVA (> 0) ; comparaison encore à écrire, avec son test de cohérence.
5. **Nouveaux produits** : liste des pscode absents de Prestige, pour création assistée.

---

## 5. Étapes, estimation, tests

Estimation en jours de travail, tests compris (rapprochement, cohérence, bilan, selon `CLAUDE.md`). Les tests
n'appellent jamais les extranets : un faux serveur local sert les réponses enregistrées.

| # | Étape | Dépend de | Jours |
|---|---|---|---|
| 0 | Préalables utilisateur : invalider le cookie partagé ; accord des grossistes ; captures (liste en 6) | — | — |
| 1 | Socle : jsoup déclaré, configuration et session (option A), transport, détection de page de connexion, `extranet_collecte` (Flyway), faux serveur de test | 0 | 3 |
| 2 | Fiche produit `SavoirPlusJSON` + rapprochement CIP / code grossiste | 1 | 1,5 |
| 3 | Réapprovisionnements paginés | 1 | 1,5 |
| 4 | Réclamations : liste, détail, PDF | 1 | 2 |
| 5 | Nouveaux produits | 1 | 1 |
| 6 | API REST + écran ExtJS + menu, état de session, lancement et suivi des collectes | 2 à 5 | 2 |
| | **Sous-total Ubipharm utilisable** | | **9 à 11** |
| 7 | TEDIS : connexion, annonces, promotions (brut), quinzaine par `idDate` | captures TEDIS | 2,5 |
| 8 | Relevés, produits réclamés, dernières commandes, images | captures | 2 |
| 9 | Connexion B ou D | captures connexion | 1,5 à 3 |
| 10 | Tâche planifiée de collecte (après mesure de la durée des sessions) | 6, 9 | 0,5 |
| | **Total** | | **15 à 19** |

Restent hors estimation tant qu'ils sont bloqués : historique des réclamations TEDIS, liste des quinzaines,
`miseEnPlace`.

**Ces jours sont de la charge, pas du délai.** Avec plusieurs sessions en parallèle, le calendrier devient :

| Jour | Travail | Sessions |
|---|---|---|
| J1 | Socle (étape 1) : il fixe les interfaces, la table `extranet_collecte` et le faux serveur ; tout le reste en dépend | 1 |
| J2-J3 | Étapes 2, 3, 4 et 5 en parallèle : fichiers distincts, numéros de migration Flyway attribués d'avance pour éviter les collisions | 4 |
| J4 | API + écran + menu (étape 6), puis tests d'écran | 1 |
| J5 | Tests de rapprochement et de bilan, contre-vérification Codex, corrections | 1 |
| dès réception des captures | TEDIS (7), modules en attente (8), connexion B ou D (9) en parallèle | 2-3 |

Soit **environ 5 jours calendaires pour Ubipharm utilisable**, et **7 à 8 jours pour l'ensemble**.

Ce qui ne se parallélise pas :
- les captures et les réponses de l'utilisateur (section 6) : sans session valide ni réponses enregistrées, aucun
  module ne peut être testé ;
- les tests d'écran, lancés un par un (règle du projet), sur un nombre limité de domaines Payara ;
- la contre-vérification et la recette par l'utilisateur.

Tests prévus (aperçu) :
- **Cohérence** : pagination (pages = ⌈total / longueur⌉, arrêt sur page vide ou répétée, total qui change) sur des
  milliers de cas tirés au hasard avec graine fixe ; quinzaine : somme calculée = Σ `TotalTTC` en `BigDecimal`, écart
  = somme − déclaré, total déclaré jamais remplacé ; colisages « 120, 140 » gardés en liste, « N/A » jamais zéro ;
  dates françaises sans heure inventée.
- **Rapprochement** : une réclamation lue dans le faux serveur, en base, par l'API et à l'écran, champ par champ.
- **Bilan avant / après** : une collecte n'écrit que dans les tables `extranet_` et exactement le nombre de lignes
  annoncé ; aucune table métier ne bouge.
- **Cas imposés par le plan** (§18) : JSON remplacé par une page de connexion en 200 ; 414 lignes par 25 ; réclamations
  `appl` = YOP/VRI ; colonnes sans titre ; « Produit inconnu » à pscode vide ; listes vides ; écart TEDIS.
- **Lecture seule** : aucun client n'expose de méthode d'écriture ; aucun journal ne contient cookie ni `_token`.

---

## 6. Informations à demander à l'utilisateur

Préalables :
1. Le cookie `SESSIONID` partagé a-t-il été invalidé (déconnexion ou changement de mot de passe) ? **Réponse du
   07/11 : « ok ».**
2. Ubipharm et TEDIS autorisent-ils un accès automatisé à leur extranet (conditions d'utilisation, cadence) ? Un compte
   dédié au connecteur est-il possible ? **Réponse du 07/11 : oui, accord des grossistes pour un accès automatisé.**
3. ~~Accord pour lire `t_famille_grossiste` (codes articles, non nominatif) sur la copie locale, afin de voir si les
   pscode y sont déjà ?~~ **Sans objet (réponse du 07/11)** : le PSCODE n'est pas rangé dans `t_famille_grossiste`.

Mode de connexion : **décidé le 07/11 (corrigé)**, identifiant et mot de passe saisis dans Prestige (option B,
section 9). Les captures 4 et 6 restent utiles si le formulaire réel diffère de ce que le serveur sait lire.

Connexion (captures depuis les outils de développement du navigateur, **valeurs de cookies, jetons et mots de passe
masquées**) :
4. Ubipharm : page de connexion (HTML), requête de connexion (URL, méthode, noms des champs), réponse (redirection,
   cookies posés : noms seulement), présence de captcha ou de second facteur.
5. Ubipharm : durée d'une session inactive ; ce que renvoie un appel JSON une fois la session expirée.
6. TEDIS : mêmes éléments, et les noms des cookies posés.

Réponses complètes enregistrées (fichier « Enregistrer sous » ou HAR filtré, sans en-têtes `Cookie`) :
7. Ubipharm : `/NouveauxProduits` complète, `/SavoirPlusJSON` d'un produit avec promotions, arrivage ou substitutions
   non vides, une page de `ReturnProduitsReapproJSON`, `ReturnReclamationsTransmisesJSON?filtre=V`, un
   `AfficherReclamation`, `/ListeReleves`, `/ProduitsReclames`, `/DernieresCommandes`.
8. Ubipharm : un PDF de réclamation et un relevé PDF tels que téléchargés.
9. TEDIS : les appels réseau déclenchés par `/historiqueReclamation` et `/miseEnPlace` ; la page ou l'appel qui liste
   les quinzaines (`idDate`) ; une promotion non vide.

Décisions métier :
10. ~~Les prix `pspven` et `psppub` sont-ils HT ou TTC, en FCFA ?~~ **Répondu le 07/11** : en CFA ; HT pour les
    parapharmacies, TTC pour les médicaments.
11. ~~Le PSCODE du point 15 est-il bien la référence Ubipharm ? Où le ranger ?~~ **Répondu le 07/11** : c'est la
    référence Ubipharm, rangée sur la fiche article (`t_famille`), comme le code EAN 13, et pas dans
    `t_famille_grossiste`. Réalisé : voir section 8.
12. Que représentent le « numéro associé » des réclamations et la date des réapprovisionnements ?
13. Quels usages viennent en premier : disponibilité par agence, suivi des réclamations, contrôle des quinzaines
    TEDIS, nouveaux produits ?
14. Qui a le droit de fournir la session et de lancer une collecte (administrateur seulement ?) ; collecte à la demande
    seulement, ou aussi planifiée ?

## 7. Réalisation Ubipharm (07/11) : état et tests

Écran : GESTION DES COMMANDES > Extranets grossistes (onglets Sessions, Fiche produit, Réapprovisionnements,
Réclamations, Nouveaux produits, Collectes). API : `v1/extranet/...`. Tables `extranet_*` (V7.5.0 à V7.5.5), seules
écrites ; aucune table métier touchée. TEDIS : non commencé (captures manquantes).

Où la donnée apparaît, et qui la compare :

| Donnée | Endroits | Test |
|---|---|---|
| Fiche produit (désignation, code, prix, TVA, stock société, stocks par agence) | extranet, base, écran | `src/test/e2e/extranet/test-rapprochement-extranets.js` |
| Réapprovisionnements (61 lignes, 3 pages, même produit sur deux agences, N/A, colisages multiples, sans CIP) | extranet, base, écran | idem |
| Réclamations (liste, détail, PDF : SHA-256 et taille) | extranet, base, écran, fichier | idem |
| Nouveaux produits et rapprochement proposé | extranet, base, écran | idem |

Règles de calcul et de lecture (tests de cohérence, graine 20261107, milliers de cas) : normalisation (chaînes, montants,
dates strictes, N/A jamais 0), pagination DataTables (pages vides, répétées, total qui change, limite), rapprochement
des produits. 103 tests unitaires, 0 échec.

Bilan avant / après (test d'écran) : une ligne `extranet_collecte` par opération avec le statut attendu ; empreintes
des tables métier identiques ; uniquement des GET vers l'extranet ; session expirée → ECHEC, cache précédent gardé,
état « expirée » à l'écran ; effacement de la session confirmé dans le bouton ; données et PDF du test retirés.

Le test d'écran tourne sur domain3 / `laborex_audit`, face à un faux extranet local (`faux-extranet.js`, jamais le
vrai) : 38/38. Avec `FAUX_DEFAUT=ligne-perdue` (une ligne annoncée jamais servie), il échoue (32/38) : la collecte est
refusée (ECHEC) et l'ancien cache est gardé.

Note de déploiement : sur domain3, un `redeploy` n'avait pas régénéré la politique JACC des EJB
(`generated/policy/prestige/prestige_internal`) : le nouveau service était refusé (erreur 500). Un `undeploy` suivi
d'un `deploy` l'a régénérée. À prévoir au premier déploiement en officine.

Reste à faire avant tout appel réel : invalider le cookie partagé, autoriser l'accès, remplacer les jeux d'essai
reconstitués par des captures réelles, confirmer le lien PSCODE / `t_famille_grossiste.str_CODE_ARTICLE` (lecture de
la table à autoriser), réponses aux questions de la section 6.

## 8. Référence Ubipharm (PSCODE) sur la fiche article (07/11)

- Colonne `t_famille.code_ubipharm` (VARCHAR 40, indexée ; V7.5.6), vide par défaut. `t_famille_grossiste` n'est ni
  lue ni écrite.
- Fiche article (GESTION DU STOCK > Fiche Article > Modifier) : champ « Référence Ubipharm », sous « Code EAN
  fabricant ». Enregistré sans aucun blanc ; vide = effacé ; absent de la requête = inchangé (anciens appels, création
  d'un article détail). En modification, la valeur est lue à part (`GET v1/fichearticle/{id}/code-ubipharm`) et n'est
  envoyée qu'une fois lue : enregistrer avant son arrivée ne l'efface pas.
- Rapprochement des nouveaux produits : d'abord la référence de la fiche (statut « trouvé (référence Ubipharm de la
  fiche) »), puis CIP / EAN 13 ; plusieurs articles avec la même référence → « plusieurs articles », tous listés. Le
  paramètre `grossisteId` est retiré.
- Tests :
  - cohérence : `CodeUbipharmCoherenceTest` (5 000 saisies tirées, graine 20261107 : aucun blanc gardé, casse et zéros
    de tête gardés, idempotence, valeur enregistrée retrouvée par le rapprochement) et `RapprochementCoherenceTest`
    (20 000 cas) ; 105 tests unitaires extranet, 0 échec ;
  - rapprochement et bilan (écran) : `src/test/e2e/extranet/test-reference-ubipharm-fiche.js`, 18/18 : saisie à
    l'écran = base = écran des extranets = API ; seule `code_ubipharm` change sur l'article, aucun autre article,
    `t_famille_grossiste` identique ; réouverture, enregistrement avant lecture, effacement ; article remis à
    l'identique. `test-rapprochement-extranets.js` rejoué : 40/40.
- Observations (suspectées, antérieures, non corrigées) : dans la fenêtre « Modifier » de la fiche article, le focus
  est déplacé pendant les premières secondes de chargement : une frappe immédiate perd des caractères (constaté aussi
  sur « Code EAN fabricant »). Le test attend que la fenêtre soit posée.
- Déploiement : sur domain3, ni `redeploy` ni `undeploy` + `deploy` ne régénéraient la politique JACC des EJB après un
  changement de signature (erreur « Client not authorized », 500). Il a fallu supprimer
  `generated/policy/prestige` entre `undeploy` et `deploy`. À vérifier au déploiement en officine.
