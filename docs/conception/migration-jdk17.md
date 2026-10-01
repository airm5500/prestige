# Migration JDK 11 → JDK 17 et évolution de Payara — plan détaillé

**Date** : 1er octobre 2026 — mis à jour le même jour avec le `domain.xml` de l'officine (§ 2.7)
**Statut** : plan à valider — aucune modification de production, aucune modification de code.
Lot 0 entamé : version de Payara et options JVM relevées et rejouées au banc.
**Fondement** : mesures faites sur banc les 30 septembre et 1er octobre 2026 (§ 2), et non
une lecture du code seule
**Exigence de départ** : aucune régression

---

## 1. Principes directeurs

Ces règles valent pour chaque lot. Un lot qui ne peut pas les respecter ne part pas en production.

1. **Une seule chose change à la fois.** On ne change jamais la JVM, le bytecode, la version du
   serveur et le code métier dans le même déploiement. Sinon, en cas de régression, on ne peut
   pas savoir laquelle des quatre en est la cause.
2. **Chaque lot a un retour arrière, et il est répété avant la mise en production.** Un retour
   arrière qui n'a jamais été joué n'existe pas.
3. **Rien ne passe sans comparaison chiffrée avec la référence JDK 11** (§ 4, lot 0). Le
   critère de passage est « zéro différence », ou un écart expliqué et accepté par écrit.
4. **Aucune migration Flyway dans un déploiement qui change la JVM ou le serveur.** Le retour
   arrière doit rester possible sans toucher à la base.
5. **Les données réelles restent strictement locales**, rien n'est exporté. **Aucun SMS réel**
   n'est envoyé depuis un banc.
6. **On garde le JDK 11 installé** jusqu'à la fin de la période d'observation du dernier lot.

---

## 2. Ce que les mesures ont établi

Banc : deux Payara 5.2022.5 identiques, l'un sur OpenJDK 11.0.32, l'autre sur OpenJDK 17.0.20,
même WAR, même base réinitialisée avant chaque passage, locale `fr_FR`.

### 2.1 Ce qui fonctionne

| Vérification | Résultat |
|---|---|
| Payara 5.2022.5 seul sur JDK 17 | démarre, 0 erreur, 0 avertissement |
| WAR actuel (bytecode 11) déployé sur JDK 17 | déployé ; **13 signatures d'exceptions, identiques au JDK 11, 0 écart** |
| Précompilation des JSP | **545 compilent** sur JDK 11 comme sur JDK 17 |
| Hibernate 5.4.3 + ByteBuddy 1.9.10 | démarre et construit ses proxys : 243 tables générées sur les deux JDK |
| WAR compilé en **bytecode 17** sur JDK 17 | déployé ; **0 écart** avec la référence JDK 11 |
| Suite de tests sur JDK 17 | **530 tests, 0 échec** (dont le test qui utilise `sun.misc.Unsafe`) |
| États JasperReports du WAR | 13/13 compilent, se remplissent et s'exportent sur les deux JDK |
| API internes du JDK (`jdeps`) | seuls Groovy 2.4.16 et Guava, via `sun.misc.Unsafe`, toujours disponible en 17 |
| `TOOLKITS` et `MULTILANGUE` | aucune API interne, bytecode Java 8 ; présents dans le dépôt (`mvn-repo/`) |
| Code qui lit la version de Java | aucun |
| Moteur JavaScript Nashorn (retiré en JDK 15) | non utilisé |
| Formats de date par style (`DateFormat.SHORT`…) | **non utilisés** : le code écrit tous ses motifs en clair |
| `conversion.AmountFormat` (312 appels JSP), `NumberUtils`, `DateConverter` | **identiques** sur les deux JDK : ils imposent un espace ordinaire |
| Montant en lettres (`GetNumberTowords`) | identique |

### 2.2 Ce qui casse ou peut casser

| Constat | Mesure | Gravité |
|---|---|---|
| **Les séparateurs de milliers disparaissent de 12 états sur 13** : `1 234 568` devient `1234568` | texte des PDF comparé ; image à l'appui | **élevée** — relevés et bons envoyés aux organismes |
| Le JDK 17 **refuse de démarrer** avec `-XX:MaxPermSize`, `-XX:PermSize`, les options du ramasse-miettes CMS, `-XX:+AggressiveOpts`, `-XX:+UseParallelOldGC` | testé option par option | **levée** : aucune dans votre `domain.xml` (§ 2.7) |
| Changer la version de Payara change **en silence** des bibliothèques dont dépend l'application | interrogé dans l'application en marche (§ 2.4) | **sans objet** : vous êtes déjà en 5.2022.5 |
| Retirer le `formatter-maven-plugin` sans déclarer Guava **casse la facture normalisée électronique** (`FneServiceImpl`) | dépendance Maven + imports | **élevée** si l'ordre n'est pas respecté |

### 2.3 La cause des séparateurs, et ce qui est exposé

À partir du JDK 13, les données de locale françaises séparent les milliers par une **espace fine
insécable** (U+202F) au lieu de l'espace insécable (U+00A0). Les états impriment en Helvetica sous
l'encodage Cp1252, qui ne connaît pas U+202F : le caractère est **supprimé sans erreur**.

Points exposés, recensés exhaustivement :

| Point | Volume | Sort sur JDK 17 |
|---|---|---|
| Motifs `#,##0` des états, remplis par 38 appels dans 9 fichiers | 77 motifs dans les états du WAR, plus ceux des états du site | séparateurs perdus dans le PDF |
| `CaZoneGeoRessource.java:238` — `String.format("%,d")` puis `.replace(',', ' ')` | 1 | le `replace` suppose un séparateur virgule ; le montant part dans un état, séparateurs perdus |
| `AnalyseInvServiceImpl.java:151`, `AnalyseInvExportServiceImpl.java:210` — `new DecimalFormat("#,##0 'FCFA'")` sans symboles | 2 | espace fine dans le HTML et l'export ; perdue si elle atteint un PDF |
| `conversion.DoubleFormatToAmount` (TOOLKITS) | 0 appel | touchée, mais inutilisée |

L'option JVM `-Djava.locale.providers=COMPAT,CLDR` **rétablit 13/13 états identiques au JDK 11**.
Mais sur 84 formats mesurés, elle introduit 25 autres écarts (l'année courte perd son siècle,
l'heure complète change) ; ils ne touchent pas le code, qui n'utilise aucun format par style, mais
cette option est dépréciée au JDK 21 et supprimée au JDK 23. **C'est une passerelle de secours,
pas la solution** (§ 5, lot 1).

### 2.4 Qui fournit réellement chaque bibliothèque

Payara charge **ses propres versions d'abord**. Interrogée en fonctionnement, l'application
répond :

| Fourni par le **serveur** (change avec Payara) | Fourni par le **WAR** |
|---|---|
| EclipseLink — tout le chemin des JSP (`DALPU`) | Hibernate 5.4.3 — tous les services REST (`JTA_UNIT`) |
| Jackson **2.13.4** (le POM déclare 2.12.5, jamais chargé) | ByteBuddy 1.9.10, antlr |
| Hibernate Validator **6.2.5** (le POM déclare 5.4.3, jamais chargé) | `ecj` 3.21 — le compilateur des états |
| JAXB 2.3.3 / 2.3.7, API JPA 2.2.3 | Groovy 2.4.16, JasperReports 6.18.1 |
| `javax.mail` 1.6.7 | Flyway 6.1.0, Quartz 2.3.2 |
| `javassist`, `classmate` 1.5.0, `jboss-logging` 3.4.3 — **sous Hibernate** | slf4j, commons-codec |
| pilote MySQL (dossier `lib` du domaine) | |

### 2.5 Trouvé en chemin, indépendant du JDK

- **12 JSP ne compilent pas aujourd'hui** : elles appellent des classes supprimées
  (`bll.gateway.outService.*`, `BLService`, `PrestigeBLService`). **8 sont appelées par des écrans** :
  rapport d'activité, quinzaine, modification de prix d'un BL, alertes, messages sortants. Ces
  écrans sont en erreur en production **dès aujourd'hui** ; il ne faudra pas imputer leur échec au JDK 17.
- `FlywayStartupBean` active **`cleanOnValidationError(true)`** : si la validation était réactivée
  et qu'un checksum différait, Flyway **effacerait toute la base**. Seul `validateOnMigrate(false)`
  l'en empêche aujourd'hui.
- Le pilote MySQL **5.1.23** plante (`NullPointerException`) contre MariaDB 10.11, **sur JDK 11
  comme sur JDK 17**. Il fonctionne contre votre 10.6 ; c'est un piège pour une future mise à jour
  de MariaDB, pas pour le JDK. Le 5.1.49 fonctionne sur les deux JDK et les deux MariaDB.
- `TOOLKITS` cherche `config_laborex_v1.xml` dans des chemins **codés en dur**
  (`/home/prestige2/…`, puis `C:`, `D:`, `E:`), à prévoir pour tout nouveau serveur.

### 2.6 Ce qui n'a PAS été mesuré

Sans données réelles ni poste Windows, le banc n'a couvert ni les parcours métier complets, ni
l'impression des tickets sur une imprimante réelle (Java2D, polices Windows), ni l'afficheur
client et le port série (`jSerialComm`, bibliothèque native), ni les SMS, ni les traitements
nocturnes avec données, ni **vos états de site** (`D:\CONF\LABOREX\REPORTS`). Chaque point est
repris par un lot ci-dessous.

### 2.7 Votre serveur : le `domain.xml` rejoué au banc

L'officine tourne en **Payara 5.2022.5**, la version même du banc. Le bloc `<java-config>` de son
`domain.xml` — 74 options JVM — a été appliqué tel quel aux deux Payara du banc. Seules trois options
propres au banc ont été ajoutées : la génération des tables par Hibernate (base vide) et la locale
`fr_FR` (sur Windows, elle vient des réglages régionaux ; sous Linux il faut la fixer).

| Vérification avec vos options | JDK 11 | JDK 17 | JDK 17, bytecode 17 |
|---|---|---|---|
| Démarrage, options refusées ou ignorées | 0 | 0 | 0 |
| Déploiement avec précompilation | réussi | réussi | réussi |
| JSP compilées | 545 | 545 | 545 |
| Signatures d'exceptions distinctes | 13 | 13 | 13 |
| **Écarts avec le JDK 11** | — | **0** | **0** |
| États : identiques au JDK 11 | — | **1 / 13** (séparateurs) | — |

Lecture des options, une à une :

| Constat | Conséquence |
|---|---|
| Aucune option refusée par le JDK 17 (`MaxPermSize`, CMS, `AggressiveOpts`… absentes) | **rien à retirer** avant la bascule |
| `-XX:+UseG1GC` déjà en place | pas de changement de ramasse-miettes |
| Options `[17\|]` déjà présentes (fournies par Payara) | elles s'activent d'elles-mêmes sur JDK 17 |
| `-Dfile.encoding=UTF-8` | le passage à UTF-8 par défaut du JDK 18 ne vous concernera pas ; **sans effet sur la régression des séparateurs** (mesuré) |
| `-Duser.timezone=Africa/Abidjan` | identique sur les deux JDK |
| TLS sortant limité à TLSv1.2, magasin de certificats propre au domaine (`cacerts.jks`) | les appels sortants ne dépendent pas des certificats du JDK ; FNE et SMS restent à la recette |
| **Locale non fixée** (aucun `-Duser.language`) | elle vient de la région Windows : à lire avec `scripts/migration-jdk17/ws_diag_jvm.jsp` |
| Application déployée en répertoire depuis `D:/projet/rm/prestige/target/prestige/` | si c'est la production, un `mvn clean` sur cette machine supprime l'application en marche — à confirmer |
| Pool `UbiSenderProDS` | non utilisé par Prestige |
| Propriétés `WA_WEB_URL`, `WA_WEB_TOKEN` | non lues par le code Java de la branche, ni de `dev` |

Hors migration, à traiter à part : les deux pools se connectent en **`root`**, mot de passe en clair
dans `domain.xml`. Un alias de mot de passe (`asadmin create-password-alias`) et un utilisateur
MariaDB dédié réduiraient l'exposition.

Observation à suivre au lot 3 : le déploiement avec précompilation des 545 JSP a été plus long sur
JDK 17 lors des deux comparaisons (296 s contre 274 s, puis 246 s contre 216 s). Deux mesures ne font
pas une conclusion, et ce temps ne concerne pas la production, où les JSP se compilent à leur premier
appel ; il sera suivi.

Enfin, la branche `dev` compte 13 commits absents de la branche mesurée, avec **des dépendances
strictement identiques** : la surface sensible au JDK est la même. La référence du lot 0 sera tout de
même refaite sur le code réellement déployé.

---

## 3. Vue d'ensemble des lots

| Lot | Objectif | Ce qui change | Plate-forme | Retour arrière | Bloquant ? |
|---|---|---|---|---|---|
| **0** | Inventaire et référence JDK 11 | rien en production | — | sans objet | oui |
| **1** | Correctifs préparatoires | code (séparateurs, sûreté Flyway) | JDK 11 | redéployer le WAR précédent | oui |
| **2** | Assainissement du WAR | POM (formatter-plugin, Guava) | JDK 11 | redéployer le WAR précédent | recommandé |
| **3** | **Bascule de la JVM** | JDK 11 → 17, WAR inchangé | JDK 17 | **remettre le JDK 11, quelques minutes** | oui |
| **4** | Compilation en 17 | bytecode 11 → 17 | JDK 17 | redéployer le dernier WAR en bytecode 11 | oui |
| **5** | Version de Payara | — | — | — | **sans objet** : déjà en 5.2022.5 |

**Pourquoi séparer les lots 3 et 4.** Un WAR en bytecode 11 tourne indifféremment sur JDK 11 et
JDK 17. Changer d'abord la JVM seule rend la première bascule **réversible en quelques minutes,
sans recompilation**. Le passage au bytecode 17, lui, ferme cette porte : il vient ensuite, une
fois la JVM éprouvée en production.

**Pourquoi les lots 1 et 2 passent sur JDK 11.** Ils doivent produire **zéro différence** sur le
JDK 11 actuel. C'est leur preuve d'innocuité, établie avant même que le JDK change.

---

## 4. Lot 0 — Inventaire et référence

**Objectif** : savoir exactement ce qui tourne, et produire la référence de comparaison.
**Aucun changement en production.**

### 4.1 Relevés de production

| Relevé | Commande ou emplacement | Pourquoi |
|---|---|---|
| Version du serveur | `asadmin version` | décide du lot 5 et de son ordre |
| JDK utilisé par le serveur | `glassfish\config\asenv.bat` (ligne `AS_JAVA`), puis `java -version` de ce chemin | point de départ exact |
| Options JVM | `asadmin list-jvm-options` et le bloc `<java-config>` de `domain.xml` | options refusées par le JDK 17 (§ 2.2) |
| Copie complète du domaine | `domains\domain1\config\domain.xml` + `asenv.bat` | sauvegarde de retour arrière |
| Service Windows | configuration du service s'il existe (chemin Java, arguments) | un service peut figer le chemin du JDK |
| Pilote JDBC réel | contenu de `domains\domain1\lib` | le POM ne dit pas ce qui tourne |
| Propriétés du pool | `asadmin get "resources.jdbc-connection-pool.*"` | reproduire le pool au banc |
| Locale et encodage du serveur | région Windows, `chcp`, propriétés `user.language`, `user.country`, `file.encoding` vues par Payara | les séparateurs en dépendent |
| Polices installées | `C:\Windows\Fonts` | rendu Java2D des tickets |
| Imprimantes et ports | modèle et pilote de l'imprimante de tickets, afficheur client, port COM | recette du lot 3 |
| Configuration TOOLKITS | `config_laborex_v1.xml` et son chemin | reproduire au banc |
| États de site | copie de `D:\CONF\LABOREX\REPORTS` (`.jrxml` et `.jasper`) | jamais testés (§ 2.6) |
| MariaDB | version et `my.ini` | déjà connus : 10.6 |

### 4.2 Préparations

1. **Inventaire des états de site** : langage déclaré (`language="groovy"` ou `java`), présence
   d'un `formatFactoryClass`, polices utilisées. S'il y a des états Groovy, ils sont ajoutés au
   banc dès ce lot.
2. **Test de votre version exacte de Payara sur JDK 17**, au banc. Si elle ne démarre pas, le
   lot 5 passe **avant** le lot 3.
3. **Copie de la base** pour le banc, strictement locale.
4. **Poste de recette Windows** reproduisant la production : même Windows, même Payara, même
   imprimante de tickets, même afficheur. Le banc Linux compare des sorties ; il ne peut valider ni
   l'impression réelle, ni les polices Windows, ni le port série.
5. **Versionner l'outillage du banc** dans `scripts/migration-jdk17/` : déploiement mesuré et
   comparaison des signatures d'exceptions, banc des états Jasper, matrice des formats de locale,
   page de diagnostic des origines de bibliothèques. Il servira à chaque lot.

### 4.3 La référence « JDK 11 »

Produite au banc, avec **le WAR actuel de production**, sur JDK 11 et sur les données réelles.
C'est l'étalon de tous les lots suivants.

| Élément de référence | Contenu |
|---|---|
| États | PDF de **tous** les états (WAR et site) sur un jeu de données figé ; texte extrait et rendu en image |
| Services REST | réponses JSON d'une liste d'appels en lecture |
| Chemin JSP | SQL émis par EclipseLink pour une liste d'écrans (journal général MariaDB), et les réponses |
| Exports | fichiers Excel et CSV |
| Tickets | rendu vers une imprimante virtuelle PDF ou image |
| Journal serveur | signatures d'exceptions au déploiement et après un parcours scripté |
| Tests | 530 tests, tous verts |

**Règle de comparaison** : les horodatages d'édition (« Édité le … à … ») sont masqués avant
comparaison. Sans cela, une simple minute d'écart passe pour une régression — c'est arrivé pendant
les mesures.

### 4.4 Critère de passage

Inventaire complet, version de Payara connue et testée sur JDK 17, options JVM recensées, référence
produite et archivée, 12 JSP mortes documentées.

---

## 5. Lot 1 — Correctifs préparatoires, sur JDK 11

**Objectif** : rendre le code indépendant de ce qui change avec le JDK 17, **en prouvant que rien
ne change sur le JDK 11**.

### 5.1 Séparateurs de milliers (correctif durable)

1. Une fabrique de formats commune qui fixe le séparateur de milliers à **U+00A0** — exactement ce
   que le JDK 11 produit aujourd'hui — transmise par le paramètre `REPORT_FORMAT_FACTORY`.
   JasperReports n'offre pas de réglage global (vérifié dans son code) : elle est passée aux
   **38 appels de remplissage** des 9 fichiers :
   `ReportUtil`, `ReserveReportBuilder`, `BalanceServiceImpl`, `AnalyseInvExportServiceImpl`,
   `AbcAnalysisServiceImpl`, `PointDepotServiceImpl`, `InvoiceServlet`, `reportManager`,
   `JsonDataSourceApp`.
2. Les états de site passent par ces mêmes appels : **leurs fichiers n'ont pas à être modifiés**,
   sauf s'ils déclarent leur propre `formatFactoryClass` (inventaire du lot 0).
3. Les trois formatages hors états reçoivent des symboles explicites :
   `CaZoneGeoRessource.java:238`, `AnalyseInvServiceImpl.java:151`,
   `AnalyseInvExportServiceImpl.java:210`.
4. Tests unitaires : le séparateur produit est U+00A0 **quel que soit le JDK qui exécute le test**.

**Vérifications** :
- sur JDK 11 : comparaison avec la référence = **0 différence** (preuve que rien ne change aujourd'hui) ;
- sur JDK 17, au banc : **13/13 états du WAR et tous les états du site identiques** à la référence.

**Passerelle de secours**, à n'utiliser que si le correctif devait attendre : l'option
`-Djava.locale.providers=COMPAT,CLDR` sur le serveur JDK 17 (13/13 mesurés). À retirer dès le
correctif en place.

### 5.2 Sûreté Flyway

Retirer `cleanOnValidationError(true)` de `FlywayStartupBean`. Aucun changement de comportement
aujourd'hui (la validation est désactivée), mais une ligne de moins entre la base de production et
son effacement. Vérification : journal Flyway au démarrage identique.

### 5.3 Les 12 JSP mortes

Pas un prérequis du JDK 17, mais une décision à prendre et à écrire : réparer, retirer les écrans
qui les appellent, ou les laisser en l'état. Dans tous les cas, la précompilation du banc les
exclut nommément, pour que leur échec ne masque pas le reste.

### 5.4 Locale de la JVM

Si la page de diagnostic du lot 0 montre une locale `fr_FR` héritée de Windows : ajouter
`-Duser.language=fr` et `-Duser.country=FR` aux options JVM. Sur JDK 11, l'ajout ne change rien —
vérification : 0 différence avec la référence — et il rend le comportement des états indépendant
d'un changement de région Windows. Changement de configuration, pas de code : il se fait dans une
fenêtre distincte du déploiement du WAR, pour respecter le principe n° 1.

### 5.5 Mise en production, retour arrière, passage

- Déploiement normal sur le **JDK 11** actuel.
- Retour arrière : redéployer le WAR précédent ; pour la locale, retirer les deux options.
- Observation : une semaine.
- **Critère de passage** : 0 différence avec la référence ; aucun nouveau message `SEVERE` en production.

---

## 6. Lot 2 — Assainissement du WAR, sur JDK 11 (recommandé)

**Objectif** : retirer du WAR ce qui n'a rien à y faire, avant de changer de JVM.

Le `formatter-maven-plugin` — un outil de mise en forme du code source — est déclaré comme
dépendance d'exécution. Il embarque une trentaine de bibliothèques en production : le compilateur
`jdt.core`, la plate-forme Eclipse et OSGi, `cglib` 2.2.2 et `asm` 3.3.1 (2010), `commons-digester3`,
`cssparser`… et **Guava**, dont se sert la facture normalisée électronique.

1. **D'abord** : déclarer Guava explicitement, à la version actuelle (32.0.0-jre). Aucun changement.
2. **Ensuite** : sortir `formatter-maven-plugin` des `<dependencies>` (le déplacer dans
   `<build><plugins>` si la mise en forme du code est utilisée, sinon le retirer).
3. Vérifications :
   - liste de `WEB-INF/lib` avant et après : seules les bibliothèques attendues disparaissent,
     Guava reste ;
   - `jdeps --missing-deps` sur le WAR : aucune classe référencée devenue absente ;
   - banc complet : 0 différence avec la référence ;
   - parcours FNE au poste de recette.
4. Retour arrière : redéployer le WAR précédent. Critère : identique au lot 1.

Bénéfice : un WAR plus léger, des bibliothèques de 2010 retirées, et une ambiguïté en moins
(deux compilateurs JDT dans le même WAR).

---

## 7. Lot 3 — Bascule de la JVM en 17, WAR inchangé

**Objectif** : faire tourner **le WAR déjà en production, sans le recompiler**, sur un JDK 17.

### 7.1 Prérequis

- Lots 0 et 1 en production (le lot 2 recommandé).
- Votre version de Payara démarre sur JDK 17 : **acquis** — 5.2022.5 avec vos options, mesuré (§ 2.7).
- **JDK 17 retenu** : une distribution LTS maintenue, à sa dernière mise à jour, Windows x64
  (par exemple Eclipse Temurin 17). Installé **à côté** du JDK 11, qu'on ne désinstalle pas.

### 7.2 Options JVM

**Aucune option à retirer** : votre `domain.xml` n'en contient aucune que le JDK 17 refuse, et le
serveur est déjà en G1 (§ 2.7, mesuré). Le `domain.xml` ne change pas pour la bascule.

Reste la locale, aujourd'hui héritée de la région Windows. **Recommandation** : la fixer
explicitement (`-Duser.language=fr`, `-Duser.country=FR`) **au lot 1, sur JDK 11** — si la région
Windows est déjà en français, l'ajout ne change rien (vérifiable : 0 différence avec la référence), et
il met le serveur à l'abri d'un changement de région Windows. Si la page de diagnostic montre une
autre locale, la décision est à reprendre, car le comportement des états en dépend.

### 7.3 La bascule

1. Arrêt du domaine. Sauvegarde de `domain.xml` et de `asenv.bat`.
2. Dans `glassfish\config\asenv.bat` : `AS_JAVA` pointe sur le JDK 17. Si Payara tourne en service
   Windows, vérifier que la configuration du service suit.
3. Démarrage. Contrôle dans `server.log` : la ligne de lancement montre bien le JDK 17.
4. **Aucun redéploiement** : le WAR en place reste celui du lot précédent.

### 7.4 Recette sur le poste Windows, données réelles

| Domaine | À vérifier |
|---|---|
| Connexion | authentification, droits, expiration de session |
| Ventes | comptant, assurance, carnet, différé, mobile money, vente en attente, prévente |
| **Tickets** | impression sur l'imprimante réelle : montants, accents, code-barres, QR code |
| Afficheur client | port série (`jSerialComm`, bibliothèque native) |
| Caisse | ouverture, mouvements, dépenses, clôture, billetage |
| Inventaire | ouverture d'un **gros** inventaire, saisie, clôture |
| Achats | commandes, bons de livraison, import grossiste, retours fournisseur |
| Tiers payants | facturation, **relevés et bons en PDF (séparateurs)**, règlements |
| FNE | facture normalisée électronique |
| Exports | Excel et CSV |
| États de site | tous ceux recensés au lot 0 |
| SMS | en mode test uniquement, **aucun envoi réel** |
| Traitements | traitements nocturnes Quartz et rattrapage au démarrage ; Flyway au démarrage |
| Support | centre de support, journal, contrôle mémoire au démarrage |

Plus le banc automatisé complet : comparaison avec la référence = **0 différence**.

### 7.5 Retour arrière — à répéter avant la production

1. Arrêt du domaine.
2. `AS_JAVA` remis sur le JDK 11 ; `domain.xml` restauré si les options ont été modifiées.
3. Démarrage. **Aucun redéploiement, aucune action sur la base.**

Durée : quelques minutes. C'est tout l'intérêt de ce lot.

### 7.6 Observation et passage

- Observation : **deux à quatre semaines**.
- À suivre : nombre de messages `SEVERE` par jour comparé à avant, mémoire, temps de réponse,
  remontées des utilisateurs.
- **Critère de passage** : recette sans écart, observation sans régression.

---

## 8. Lot 4 — Compilation en bytecode 17

**Objectif** : compiler le projet pour Java 17 (mesuré : compilation propre, 530 tests verts,
déploiement sans écart).

1. POM : remplacer `<source>11</source><target>11</target>` par `<release>17</release>` —
   `release` interdit en plus l'usage accidentel d'une API postérieure au JDK 17.
2. Ajouter une règle `maven-enforcer` exigeant un JDK 17 ou plus pour construire, afin qu'un poste
   resté en JDK 11 échoue franchement plutôt que de produire un résultat ambigu.
3. Postes de développement et de construction en JDK 17.
4. Vérifications : tests, banc complet, recette allégée (ventes, tickets, états, inventaire).

**Point de non-retour vers le JDK 11.** Un WAR en bytecode 17 ne démarre plus sur un JDK 11.
- **Archiver et étiqueter le dernier WAR en bytecode 11.** C'est lui, le retour arrière.
- Garder le JDK 11 installé jusqu'à la fin de l'observation.
- **Ne pas utiliser les nouveautés du langage** (records, blocs de texte…) pendant l'observation :
  elles rendraient tout retour au bytecode 11 impossible sans réécriture.

Retour arrière : redéployer le WAR archivé. Observation : deux semaines.

---

## 9. Lot 5 — Version de Payara : sans objet

**La production est en Payara 5.2022.5** (relevé du 1er octobre) : rien à faire dans ce projet.
C'est la dernière version communautaire de Payara 5 ; la suite (support étendu chez l'éditeur, ou
passage à Jakarta) est une décision à part, à instruire avec l'éditeur.

La démarche ci-dessous reste valable pour tout serveur d'une autre officine qui serait sur une
version antérieure ou sur GlassFish : montée en 5.2022.5 en lot séparé — **avant le lot 3 si la
version ne démarre pas sur JDK 17**, après le lot 4 sinon, jamais en même temps qu'eux.

1. Nouvelle installation **à côté** de l'ancienne, dans un autre dossier.
2. Domaine recréé par script à partir de l'inventaire (pool, ressources, options JVM, pilote),
   plutôt que par copie aveugle de `domain.xml`.
3. Comparaisons propres à ce lot, parce que ce sont les bibliothèques du serveur qui changent
   (§ 2.4) :
   - **JSON** de tous les services REST de la référence (Jackson) ;
   - **SQL émis par EclipseLink** sur les écrans JSP de la référence, et leurs résultats ;
   - validation des données (Hibernate Validator), JAXB, envoi de courriels ;
   - démarrage d'Hibernate, qui tourne sur `javassist`, `classmate` et `jboss-logging` du serveur.
4. Retour arrière : arrêter la nouvelle installation, relancer l'ancienne. Aucune action sur la base.

---

## 10. Hors périmètre — projets séparés

| Sujet | Pourquoi à part |
|---|---|
| Jakarta EE / Payara 6 et 7 | espace de noms `jakarta.*` : imports, descripteurs, JSP, serveur ; Payara 7 exige en plus le JDK 21 |
| Hibernate 6 | va avec Jakarta |
| MariaDB ≥ 10.10 | exige d'abord un autre pilote (5.1.23 plante, mesuré) |
| JDK 21 | la passerelle `COMPAT` y devient dépréciée ; le passage de l'encodage par défaut à UTF-8 (JDK 18) ne vous touche pas, votre JVM est déjà en `-Dfile.encoding=UTF-8` |
| Sécurité des pools | connexion en `root`, mot de passe en clair dans `domain.xml` : alias de mot de passe et utilisateur dédié |
| Groovy 2.4 | seulement si des états de site l'utilisent |

---

## 11. Registre des risques

| # | Risque | Probabilité | Impact | État | Traitement | Lot |
|---|---|---|---|---|---|---|
| 1 | Séparateurs de milliers perdus dans 12 états | **certaine** | élevé | mesuré | fabrique de formats commune | 1 |
| 2 | Options JVM refusées : Payara ne démarre pas | **levé** | — | vos 74 options rejouées : 0 refusée | rien à retirer | — |
| 3 | Votre Payara ne démarre pas sur JDK 17 | **levé** | — | 5.2022.5 avec vos options : démarre (mesuré) | — | — |
| 4 | États de site en Groovy | inconnue | moyen | non mesuré | inventaire puis banc | 0 |
| 5 | Impression des tickets sous Windows | inconnue | **élevé** | non mesuré | recette sur imprimante réelle | 3 |
| 6 | Afficheur, port série | inconnue | moyen | non mesuré | recette | 3 |
| 7 | Bibliothèques du serveur modifiées | **sans objet** (déjà en 5.2022.5) | — | liste mesurée | — | — |
| 8 | FNE cassée par le retrait du formatter-plugin | certaine si l'ordre n'est pas respecté | élevé | dépendance identifiée | Guava déclaré d'abord | 2 |
| 9 | Ramasse-miettes CMS en production | **levé** | — | `-XX:+UseG1GC` déjà en place | — | — |
| 10 | Migration Flyway mêlée à une bascule | procédure | élevé | — | principe n° 4 | tous |
| 11 | `cleanOnValidationError` | latente | **critique** (base effacée) | code lu | retrait | 1 |
| 12 | Échecs des 12 JSP mortes imputés au JDK | certaine | confusion | mesuré | documentées, exclues du banc | 0, 1 |
| 13 | Locale héritée de la région Windows | inconnue | moyen (comportement des états) | non fixée dans `domain.xml` | lecture par la page de diagnostic, puis fixation sur JDK 11 | 0, 1 |
| 14 | Application déployée depuis un dossier de compilation | à confirmer | élevé (un `mvn clean` la supprime) | lu dans `domain.xml` | déployer un WAR archivé, hors arborescence de développement | 0 |

---

## 12. Décisions attendues

1. ~~Version exacte de Payara~~ — **obtenue** : 5.2022.5.
2. **Ce que recouvre « évoluer en Payara »** : rester sur Payara 5, ou préparer Jakarta ?
3. ~~Le bloc `<java-config>`~~ — **obtenu** et rejoué au banc (§ 2.7).
4. **Ce `domain.xml` est-il celui de la production** ou d'un poste de développement ? (déploiement
   depuis `D:/projet/rm/prestige/target/prestige/`)
5. **La locale de la JVM de production**, lue avec `scripts/migration-jdk17/ws_diag_jvm.jsp`.
6. Le dossier **REPORTS** du site et un **dump de base**, pour le banc.
7. Un **poste de recette Windows** équipé comme la production.
8. Le sort des **12 JSP mortes** et des 5 écrans qui en appellent 8.
9. Lot 2 retenu ou non.
