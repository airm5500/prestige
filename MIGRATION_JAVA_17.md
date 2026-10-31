# Migration de Prestige vers Java 17

## Mode operatoire immediat (de 11 a 17)

> Si « de 11 a 7 » voulait bien dire « de 11 a 17 », voici la procedure concrete.
> Ne pas commencer en production : faire d'abord ces operations sur une copie du
> serveur et de la base.

Le `pom.xml` est deja configure pour produire du Java 17. Il reste a installer le
JDK, construire le WAR, qualifier le serveur puis deployer.

### 1. Installer et selectionner un vrai JDK 17

Installer un **JDK** 17 (pas seulement un JRE), puis ouvrir un nouveau terminal :

```bash
export JAVA_HOME=/chemin/vers/jdk-17
export PATH="$JAVA_HOME/bin:$PATH"

java -version
javac -version
mvn -version
```

Les trois commandes doivent indiquer Java 17. `mvn -version` est importante : un
terminal peut utiliser Java 17 alors que Maven utilise encore une autre JVM.

Dans le CI, fixer les memes `JAVA_HOME` et `PATH` dans la configuration du job. Ne
pas compter uniquement sur le JDK par defaut de la machine.

### 2. Rendre les dependances internes disponibles

Avant le build, verifier que le depot Maven configure contient :

```text
TOOLKITS:TOOLKITS:0.0.1-SNAPSHOT
MULTILANGUE:MULTILANGUE:0.0.1-SNAPSHOT
```

Si ces JAR sont seulement disponibles localement, les publier dans le depot Maven
interne. Ne pas ajouter les JAR directement dans Git et ne pas utiliser
`systemPath` dans le POM.

### 3. Construire et controler le WAR

Depuis la racine de Prestige :

```bash
mvn clean verify
test -f target/prestige.war
javap -verbose target/classes/dal/dataManager.class \
  | sed -n 's/.*major version: /major version: /p'
```

Le build doit finir par `BUILD SUCCESS` et `javap` doit afficher
`major version: 61`, qui correspond a Java 17. Ne pas deployer un WAR si les tests ont ete ignores
avec `-DskipTests`.

### 4. Identifier le serveur avant de changer son Java

Sur le serveur actuel, relever et conserver ces informations :

```bash
echo "$JAVA_HOME"
java -version
"$GLASSFISH_HOME/bin/asadmin" version
"$GLASSFISH_HOME/bin/asadmin" list-domains
```

Verifier dans la matrice officielle de **cette version exacte** du serveur qu'elle
supporte simultanement Java 17 et Java EE 8 / `javax`. Si ce n'est pas explicitement
le cas, mettre d'abord a niveau GlassFish/Payara vers une version qui remplit ces
deux conditions. Ne pas choisir pour ce lot un serveur uniquement Jakarta EE
9/10/11 : le WAR actuel emploie encore `javax.*`.

### 5. Creer un environnement de recette Java 17

1. Copier/sauvegarder le domaine et sa configuration.
2. Configurer **la JVM du serveur de recette** sur le chemin du JDK 17. Pour une
   installation GlassFish classique, cela revient a renseigner `AS_JAVA` dans
   `config/asenv.conf`; verifier la documentation de la distribution utilisee.
3. Reproduire le pool JDBC `jdbc/__laborex_pool`, les ressources JNDI, les
   certificats, les comptes et les repertoires applicatifs.
4. Demarrer le domaine et verifier le JDK reel dans son journal de demarrage.

Exemple de deploiement, a adapter au nom du domaine et aux ports de recette :

```bash
"$GLASSFISH_HOME/bin/asadmin" start-domain <domaine-recette>
"$GLASSFISH_HOME/bin/asadmin" deploy --force=true target/prestige.war
```

Si le serveur ne demarre pas sous Java 17, revenir a son JDK precedent et mettre a
niveau le serveur. Ne pas ajouter aveuglement des options `--add-opens`.

### 6. Faire la recette minimale avant la production

Valider au minimum : connexion/deconnexion et sessions, une lecture et une
ecriture en base, commit/rollback, une page JSP de chaque module, un endpoint
JAX-RS, un import et un export, un PDF Jasper, un XLSX, un traitement planifie,
l'envoi SMS/HTTP, l'impression et la communication serie si elles sont utilisees.
Le detail de la recette se trouve plus bas dans ce document.

Rechercher dans les journaux :

```text
UnsupportedClassVersionError
InaccessibleObjectException
NoClassDefFoundError
ClassNotFoundException
NoSuchMethodError
```

Une seule de ces erreurs doit bloquer la mise en production jusqu'a identification
de la bibliotheque ou de l'API responsable.

### 7. Basculer avec un retour arriere prepare

Avant la bascule, conserver : l'ancien WAR compile pour Java 11, le JDK precedent,
la configuration/domaine du serveur et une sauvegarde de base. Deployer exactement
le WAR valide en recette, faire le smoke test, puis surveiller les journaux et le
pool JDBC. En cas d'echec, restaurer ensemble l'ancien serveur/JDK et l'ancien WAR :
un WAR Java 17 ne peut pas etre relance sur Java 11.

**Decision immediate :** si la version actuelle du serveur n'est pas connue et
confirmee compatible Java 17 + Java EE 8, ne pas basculer aujourd'hui. La prochaine
action est d'executer les quatre commandes de l'etape 4 et de qualifier ou mettre a
niveau ce serveur. Si elle est compatible, enchainer les etapes 1 a 7.

## Conclusion courte

Passer directement le niveau de bytecode de 11 a 17 n'est pas transparent. Une
bibliotheque compilee pour Java 8 ou 11 peut en general etre chargee par Java 17 :
la compatibilite des fichiers `.class` fonctionne dans ce sens. Les risques reels
sont plutot :

1. le serveur Java EE qui demarre le WAR doit lui-meme fonctionner avec Java 17 ;
2. une ancienne bibliotheque peut appeler une API supprimee ou utiliser une
   reflexion que Java 17 bloque plus strictement ;
3. un WAR compile en `release 17` ne peut plus etre execute sur une JVM 11 ;
4. les API Java EE `javax.*` ne sont pas fournies par le JDK 17 et doivent rester
   fournies par le serveur d'applications.

Le passage est donc possible sans convertir toutes les JSP en API et sans migrer
immediatement de `javax.*` vers `jakarta.*`. Il faut en revanche qualifier le
serveur et les dependances ci-dessous avant la mise en production.

## Ce que le build garantit

- Maven doit etre lance avec un JDK 17 ou superieur. La regle Enforcer echoue
  immediatement avec un JDK 11 au lieu de produire un resultat ambigu.
- `maven.compiler.release=17` produit des classes Java 17 et interdit a la
  compilation l'emploi accidentel d'API apparues apres Java 17, meme si le poste
  de build utilise un JDK plus recent.
- Le livrable reste un WAR Java EE 8. La dependance `javax:javaee-api:8.0` reste
  en portee `provided` : ces classes ne sont pas embarquees dans le WAR et doivent
  etre fournies par le serveur.

`release` est preferable au couple `source`/`target` : `source` verifie la syntaxe
et `target` le format des classes, mais ils n'empechent pas de compiler par erreur
contre une API d'un JDK plus recent.

## Audit du depot

L'audit statique du depot donne les points d'attention suivants :

| Element observe | Constat | Risque / action |
| --- | --- | --- |
| JSP | 557 fichiers JSP, tous avec des scriptlets ou directives JSP | Aucun blocage propre a Java 17. Leur compilation est faite par le moteur JSP du serveur : tester toutes les pages principales sur le serveur cible. |
| API Servlet | 172 classes Java importent `javax.servlet` | Conserver un serveur **Java EE 8 / Servlet 4 en namespace `javax`**. Un deploiement direct sur un serveur Jakarta EE 9+ (`jakarta.servlet`) n'est pas compatible sans transformation ou migration. |
| JAXB | 218 classes Java importent `javax.xml.bind` | JAXB n'est plus inclus dans le JDK moderne. Dans l'etat actuel, il vient de Java EE 8 et du serveur. Verifier sa presence au deploiement ; ne pas ajouter au hasard une implementation Jakarta qui emploie un autre namespace. |
| JAX-RS | 138 classes Java importent `javax.ws.rs` | Meme contrainte `javax` que pour les servlets. Tester le fournisseur JAX-RS du serveur et les clients HTTP sortants. |
| Annotations / transactions | 33 classes utilisent `javax.annotation` et 11 `javax.transaction` | Ces API dependent du serveur Java EE, pas de Java 17. Tester CDI, ressources JNDI, transactions JTA et traitements planifies. |
| Descripteur serveur | `glassfish-web.xml` emploie le DTD GlassFish 3.1 ; `web.xml` declare Servlet 4.0 | Le fichier ne prouve pas la version reellement deployee. Identifier le produit et sa version exacte, puis verifier officiellement sa matrice JDK 17 **et** Java EE 8 avant toute bascule. C'est le premier go/no-go. |
| Persistance | JPA utilise `SunOneJtaPlatform` et une datasource JNDI GlassFish | Faire un test d'integration reel : connexion au pool, transaction JTA, commit, rollback et fermeture des connexions. |
| JDK interne | Le code de production ne charge pas d'API interne ; un test utilise `sun.misc.Unsafe` | Supprimer a terme ce contournement du test. Il peut demander une ouverture de module selon le JDK et ne doit jamais servir de modele au code de production. |
| JAR internes | `TOOLKITS:0.0.1-SNAPSHOT` et `MULTILANGUE:0.0.1-SNAPSHOT` | Risque inconnu et prioritaire : les sources et JAR ne sont pas dans le depot. Recuperer leur build, lancer `jdeps` et leurs tests sous Java 17. |

Les nombres ci-dessus sont un instantane reproductible avec :

```bash
find src/main/webapp -name '*.jsp' -print | wc -l
rg -l 'javax\.servlet' src/main/java -g '*.java' | wc -l
rg -l 'javax\.xml\.bind' src/main/java -g '*.java' | wc -l
rg -l 'javax\.ws\.rs' src/main/java -g '*.java' | wc -l
rg -l 'javax\.annotation' src/main/java -g '*.java' | wc -l
rg -l 'javax\.transaction' src/main/java -g '*.java' | wc -l
```

## Analyse des dependances

Cette classification ne signifie pas qu'une dependance ancienne echouera
forcement. Elle indique ou concentrer les tests et les mises a niveau.

### Risque critique a lever avant le changement de production

- **Serveur GlassFish/derive non versionne dans le depot** : le WAR depend de
  Servlet, JSP, JAX-RS, CDI, JPA/JTA, JAXB et JNDI. Il faut une version qui accepte
  a la fois Java 17 et les API Java EE 8 en `javax`. Changer seulement le JDK du
  serveur peut empecher son demarrage avant meme le chargement de l'application.
- **`TOOLKITS` et `MULTILANGUE`** : aucune preuve de compatibilite ne peut etre
  obtenue depuis ce depot. Recompiler leurs sources avec JDK 17 si possible et
  verifier qu'elles n'utilisent pas `sun.*`, des moteurs JavaScript retires ou une
  reflexion profonde sur les classes du JDK.
- **Pilote MySQL `5.1.23` en portee `provided`** : le pilote reel est gere par le
  serveur et peut donc differer du POM. Inventorier le JAR installe dans GlassFish,
  tester TLS, fuseaux horaires, encodage, reconnexion et pool avant sa mise a jour.

### Risque eleve, mise a niveau recommandee dans des lots separes

- **Hibernate ORM `5.4.3.Final`**, metamodel `5.3.10.Final` et
  `hibernate-types-52:2.10.0` sont anciens et desalignes. Commencer par aligner
  ORM et son processeur de metamodel sur une meme version de la derniere branche
  restant en `javax`, puis adapter `hibernate-types`. Ne pas passer a Hibernate 6
  dans le lot Java 17 : il introduirait simultanement la migration Jakarta.
- **Hibernate Validator `5.4.3.Final`** est egalement ancien. Tester la validation
  des beans et des endpoints apres sa mise a niveau, sans melanger les artefacts
  `javax.validation` et `jakarta.validation`.
- **Groovy `2.4.16` et JasperReports `6.18.1`** : Jasper peut compiler ou executer
  des expressions de rapport Groovy. Tester la compilation et l'export de chaque
  famille de rapports (PDF, XLS/XLSX) sous Java 17 avant de changer Groovy seul.
- **Flyway `6.1.0`** : lancer `info`, `validate` puis les migrations sur une copie
  de la base. Une mise a niveau Flyway doit etre un lot distinct et reversible.

### Risque moyen a surveiller

- POI `4.1.1`, Batik `1.12`, Jackson `2.12.5`, Commons CSV `1.6`, Barcode4J
  `2.1`, Jasypt `1.9.2` et le connecteur MySQL declare sont anciens. Prioriser les
  versions corrigeant des vulnerabilites, mais une dependance par lot afin de ne
  pas confondre une regression fonctionnelle avec la migration Java.
- Lombok `1.18.26`, le compilateur Maven `3.11.0`, Surefire `3.2.5`,
  jSerialComm `2.11.0`, Commons IO `2.14.0`, Commons Net `3.9.0`,
  Commons FileUpload `1.5` et JUnit `5.10.2` sont moins suspects dans cet audit.
  Ils doivent tout de meme etre couverts par le build et les tests d'integration.

## Strategie de migration recommandee

### Etape 0 - rendre le build reproductible

1. Archiver dans un depot Maven interne `TOOLKITS` et `MULTILANGUE` avec leurs
   POM, sources, licences et versions immuables (eviter `SNAPSHOT` en production).
2. Corriger l'acces au miroir Maven puis executer `mvn clean verify` sur la branche
   actuelle et conserver le WAR de reference.
3. Ajouter au CI une distribution JDK 17 explicite et journaliser `java -version`
   et `mvn -version`.

### Etape 1 - qualifier le runtime sans changer Jakarta

1. Choisir une version du serveur certifiee par son editeur pour Java 17 **et** le
   namespace Java EE 8 `javax`.
2. Reproduire les ressources de production : datasource/pool MySQL, JNDI, JTA,
   securite, encodage, certificats, repertoire de fichiers et imprimantes.
3. Demarrer le serveur sans option globale `--add-opens`. Si une dependance en
   exige une, la mettre a niveau plutot que de masquer durablement le probleme.
4. Deployer le WAR et verifier les logs de compilation de toutes les JSP visitees.

### Etape 2 - traiter les dependances par lots

Ordre conseille : serveur et pilote MySQL, JAR internes, pile Hibernate 5.x,
Jasper/Groovy/POI, Flyway, puis bibliotheques utilitaires. Chaque lot doit avoir
son propre commit, un test fonctionnel cible et une possibilite de retour arriere.
Ce decoupage permet de rester en `javax` pendant que les JSP sont converties en
API progressivement.

### Etape 3 - valider le passage en production

Minimum recommande :

- compilation, tests unitaires et analyse des dependances avec un JDK 17 reel ;
- demarrage a froid et redeploiement du WAR ;
- authentification, session et droits ;
- lecture/ecriture JPA, commit et rollback JTA, pool et reconnexion base ;
- endpoints JAX-RS et clients HTTP/SMS sortants ;
- televersement et telechargement de fichiers ;
- traitements Quartz/Flyway et traitements de demarrage ;
- generation de tous les formats de rapports et exports Excel/PDF ;
- impression et communication serie ;
- parcours des JSP critiques, accents/UTF-8, erreurs et expiration de session ;
- test de charge court et observation memoire/GC pendant un cycle metier complet.

Executer ensuite, sur le WAR produit :

```bash
jdeps --multi-release 17 --recursive --ignore-missing-deps target/prestige.war
```

Toute ligne `JDK internal API`, toute classe manquante et toute exception
`InaccessibleObjectException`, `UnsupportedClassVersionError`,
`NoClassDefFoundError` ou `ClassNotFoundException` est un blocage a analyser ; ne
pas la corriger automatiquement avec une option `--add-opens`.

## Retour arriere et coexistence avec les JSP

Le WAR compile pour Java 17 ne demarrera pas sur Java 11. Conserver pendant la
recette l'ancien WAR, l'ancienne image/installation serveur et un export compatible
de la base. Ne pas executer une migration Flyway irreversible pendant le premier
deploiement Java 17.

Les JSP peuvent rester en place : Java 17 ne force ni leur suppression, ni le
passage a Jakarta. Leur migration vers des API est un chantier fonctionnel
independant. La future migration de Java EE 8 (`javax`) vers Jakarta EE
(`jakarta`) devra etre traitee comme un projet separe, car elle touche les imports,
le serveur, les descripteurs et potentiellement les JSP/taglibs.
