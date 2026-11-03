# Cas 4 : cacher le mot de passe de la base (configuration et sauvegardes)

Demande d'origine : [analyse_new.md](analyse_new.md), cas 4. Maquette : [cas4-securite-base.html](cas4-securite-base.html).

Analyse faite **sans ouvrir** `D:\CONF`, `domain.xml` ni aucun `.cnf` réel : uniquement le code qui les lit. Aucun secret n'est cité.

## 1. L'existant : où vit le mot de passe aujourd'hui

Il est stocké à **trois endroits indépendants**. Le cacher demande trois actions distinctes.

### A. `D:\CONF\LABOREX\CONF\config_laborex_v1.xml` — l'ancien chemin (JDBC direct)

- Lu par `toolkits.utils.jdom` (dépendance `TOOLKITS`, `pom.xml` l. 79-80 ; source hors dépôt `D:\projet\p3\TOOLKITS`). `InitRessource()` essaie une liste de
  chemins (`C://CONF//…` puis `D://CONF//…`), `LoadRessource()` lit les clés `name`, `user`, `password`, `host`, `port` (+ `*_sql_server`,
  `mail_password`, `kannel_pwd`).
- Chaque valeur passe par `toolkits.security.Cryptages.decryptage()` : Jasypt `BasicTextEncryptor` (PBEWithMD5AndDES) avec une **clé fixe
  codée en dur** dans le jar, et **repli en clair** si le déchiffrement échoue. Quiconque a le `.war` (le jar est dans `WEB-INF/lib`) peut
  déchiffrer : c'est de l'obfuscation, pas une protection.
- Usage : `dal/JdbConnexion.java` l. 39-54 concatène le mot de passe **dans l'URL JDBC** (`…?user=…&password=…`) puis
  `DriverManager.getConnection(url)` (l. 82). Appelé par `dal/jconnexion.java` : **`new jconnexion()` apparaît 190 fois dans 107 fichiers**
  (`bll/*`, `bllBase`, `familleManagement`…) et dans `job/InvoiceServlet`.
- **Risque de journalisation** : une `SQLException` de `DriverManager` (ex. « No suitable driver found for <url> ») est journalisée en
  SEVERE avec l'URL complète, donc avec le mot de passe, dans `server.log`. Un mot de passe contenant `&` ou `?` casse aussi l'URL.

### B. `domain.xml` de Payara — pool `laborex_pool` (le chemin moderne)

- `META-INF/persistence.xml` : unités `DALPU` et `JTA_UNIT` sur `jdbc/__laborex_pool`, sans identifiant. Utilisé par JPA, Hibernate,
  Flyway (`job/FlywayStartupBean`), la sauvegarde Java, la valorisation.
- Le pool a été créé à la main (pas de `glassfish-resources.xml`, pas de script `create-jdbc-connection-pool` dans le dépôt). Le mot de
  passe y est en **clair** dans la propriété `password` du pool.
- `SupportServeurRessource.java` l. 676-678 copie `domain.xml` en `domain.xml.avant-prestige-<horodatage>` : **chaque copie contient le mot
  de passe**.
- Les alias Payara (`${ALIAS=…}`) ne sont pas utilisés, mais le code les détecte (`PoolMariaDb.motDePasseProtege()`) et… **refuse alors de
  sauvegarder** (voir C).

### C. Les sauvegardes automatiques (deux mécanismes)

**C1. Sauvegarde intégrée à Payara** — `job/SauvegardeScheduler.java` : `@Schedule(hour="*", minute="5")`, toutes les heures, sauf
`KEY_SAUVEGARDE_ACTIVE=0`. Manuel via `rest/SupportSauvegardeRessource` (`v1/support/sauvegardes`, droit `P_SM_SUPPORT_SERVEUR`).

- `SauvegardeService.java` l. 172-180 : lit **`domain.xml` en entier**, `PoolMariaDb.lire()` extrait par regex l'URL, l'utilisateur et le
  mot de passe du pool. **Si c'est un alias, la sauvegarde échoue volontairement** (l. 177-180 ; idem `ValorisationSauvegarde` l. 102).
- Transmission : jamais en ligne de commande ; un **`.cnf` temporaire** `[client] user/password/host/port` est écrit (l. 199-200), passé
  par `--defaults-extra-file` à `mariadb-dump`/`mysqldump` (l. 202-204), supprimé en `finally` (l. 255). `fichierPrive()` l. 424-438 : POSIX
  `rw-------` si possible ; **sous Windows le repli `setReadable(false,false)` est quasi sans effet** : le fichier hérite des ACL du dossier
  temporaire, et il reste sur le disque si la JVM plante.
- Produit : `.sql.gz` **non chiffré** dans `KEY_SAUVEGARDE_DOSSIER` (défaut `C:\prestige\sauvegardes`), copie `KEY_SAUVEGARDE_COPIE`,
  rotation 48 h puis 30 jours, historique `t_sauvegarde`. Le dump contient **toute la base** : `t_parameters` (jetons API), hash MD5 des
  `t_user`, clé AES des empreintes (`t_empreinte_cle`).
- Les messages d'erreur de l'outil sont filtrés (`***`) l. 231-233 : pas de fuite par les journaux de ce côté.

**C2. Scripts PowerShell de l'officine** (`outils/officine/`) — tâches Windows **sous SYSTEM** (`5-planifier.ps1`) : « sauvegarde
complète » 12:30 et 21:30 (`3-sauvegarde-complete.ps1`), « copie du journal » toutes les heures (`4-copier-journal.ps1`). L'ancienne tâche
`SAUVEGARDE_COMPRESSION.bat` n'est pas dans le dépôt (seulement sur le serveur : **à auditer sur place, c'est probablement là que le mot de
passe est en clair dans une ligne `-p…`**).

- `2-configurer-mariadb.ps1 -CreerCompte` crée déjà un **compte dédié `prestige_sauvegarde`** aux droits réduits, mot de passe aléatoire
  (générateur cryptographique), écrit en clair dans `C:\ProgramData\Prestige\sauvegarde.cnf` protégé par ACL SYSTEM + Administrateurs.
- Archives zstd ou RAR **non chiffrées** ; binlogs copiés en clair.

### D. Ce qui existe déjà côté chiffrement

- AES-256-GCM réel dans `EmpreinteServiceImpl.java` l. 245-259 (modèle réutilisable, mais clé en base).
- `util/ParametresSecrets.java` : masquage à l'écran des paramètres `SECRET/TOKEN/PASSWORD` (pas un chiffrement au repos).
- `ApplicationPayara` refuse d'appliquer un `set …password=` (liste blanche).
- Pas de DPAPI, pas de Credential Manager, pas de `mysql_config_editor` (**propre à Oracle MySQL, inexistant sous MariaDB 10.6/10.11** :
  option à écarter).

### E. Versions

MariaDB 10.6 en officine (10.11 banc) ; Payara 5 (alias de mot de passe possibles) ; JDK 11 ; Windows (DPAPI possible).

## 2. Le vrai problème : l'ancien employé

Un ex-employé qui **connaît** le mot de passe n'est pas gêné par un chiffrement : il faut **changer** le mot de passe (rotation) et que le
nouveau ne soit lisible nulle part en clair. Un ex-employé qui **sait où regarder** est gêné par le chiffrement/le coffre, à condition que
la clé de déchiffrement ne soit pas à côté (ce qui est le cas aujourd'hui avec Jasypt). Et un ex-employé qui a **une copie de sauvegarde**
a toute la base : le chiffrement des archives est le troisième volet.

Donc trois mesures complémentaires, pas une seule :

1. **Rotation** du mot de passe applicatif (immédiate, puis à chaque départ) ;
2. **Stockage protégé** du nouveau mot de passe (plus de clair sur disque) ;
3. **Compte de sauvegarde dédié** à droits réduits + **archives chiffrées**.

## 3. Solutions proposées, avec leurs limites

| # | Solution | Couvre | Limites | Effort |
|---|----------|--------|---------|--------|
| S1 | **Rotation assistée** : un écran génère un nouveau mot de passe fort, exécute `ALTER USER … IDENTIFIED BY` (ou `SET PASSWORD`), met à jour le pool Payara (`asadmin set`) **et** le `config_laborex_v1.xml`, redémarre le pool, vérifie la connexion ; journalise *qui/quand*, jamais la valeur. | A, B | Ne protège pas le stockage : à combiner avec S2/S3. `ApplicationPayara` refuse aujourd'hui `set …password=` : il faut une exception contrôlée ou passer par l'alias (S2). Nécessite un compte MariaDB avec `CREATE USER`/`ALTER USER` au moment de la rotation (saisi à l'écran, jamais stocké). Prévoir le retour arrière si la vérification échoue. | Moyen |
| S2 | **Alias Payara** (`asadmin create-password-alias`, propriété `password=${ALIAS=prestige-db}`) pour le pool. | B (+ copies `domain.xml.avant-prestige-*`) | L'alias est chiffré avec la **master password du domaine** ; si elle est celle par défaut (`changeit`) ou présente dans `master-password`, la protection est faible : changer la master password (`asadmin change-master-password --savemasterpassword=false` → demande à chaque démarrage, incompatible avec un service Windows sans intervention ; ou `=true` : protection par ACL seulement). **Casse la sauvegarde Java** tant que `PoolMariaDb`/`SauvegardeService`/`ValorisationSauvegarde` lisent `domain.xml` : il faut leur donner une autre source (S5). | Moyen |
| S3 | **Fichier XML : vrai chiffrement** (AES-256-GCM, clé **hors** du `.war`) : clé dans un fichier protégé par ACL Administrateurs/compte de service, ou mieux protégée par **DPAPI** au compte de service Payara (`ProtectedData` via JNA/PowerShell au premier démarrage). Compatibilité : `jdom` continue de lire, mais via un nouveau déchiffreur. | A | `jdom` et `Cryptages` sont dans **TOOLKITS** (hors dépôt) : modification de la dépendance ou surcharge locale (`JdbConnexion` relit la clé lui-même). Avec DPAPI, le fichier n'est lisible **que par ce compte sur cette machine** : la restauration sur un autre poste exige une re-saisie (c'est voulu). | Moyen |
| S4 | **Supprimer le chemin A** : faire passer `JdbConnexion` par le **DataSource JNDI** (`jdbc/__laborex_pool`) au lieu de `DriverManager`. Le mot de passe n'existe alors plus qu'en B. | A (définitivement) | 107 fichiers appellent `new jconnexion()` mais **un seul** construit la connexion (`JdbConnexion` l. 82) : le changement est local. Risques : comportements de transaction/autocommit des anciens `bll`, pool saturé (dimensionner `max-pool-size`), code utilisé **hors** Payara (`InvoiceServlet`, outils en ligne de commande ?) à inventorier. Supprime aussi le risque de journalisation de l'URL. **Recommandé** : c'est la seule solution qui supprime une des trois copies. | Moyen à fort (tests de non-régression sur les écrans JSP) |
| S5 | **Compte de sauvegarde dédié** (`prestige_sauvegarde`, droits `SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER, RELOAD, REPLICATION CLIENT`) **pour la sauvegarde Java aussi** : le `.cnf` n'est plus temporaire mais permanent, protégé par ACL **et** chiffré DPAPI (déchiffré en mémoire juste avant `mariadb-dump`, écrit dans un `.cnf` temporaire sous un dossier à ACL restreinte, supprimé). La sauvegarde cesse de lire `domain.xml`. | C1, C2, et débloque S2 | Un `.cnf` temporaire reste nécessaire (`mariadb-dump` ne lit pas stdin pour le mot de passe) : réduire la fenêtre et le placer dans un dossier à ACL restreinte, pas dans `%TEMP%`. Le compte dédié ne peut pas restaurer : garder la restauration manuelle (admin). | Moyen |
| S6 | **Chiffrer les archives** : `.sql.gz` → chiffrement AES (clé publique de l'officine ou mot de passe d'archive stocké… via DPAPI), RAR `-hp` ou `7z -p -mhe`, binlogs chiffrés avant copie. | Copies de sauvegarde emportées | Il faut **garder la clé de déchiffrement hors du serveur** (coffre du pharmacien, papier, clé USB) sinon elle part avec la copie. L'essai de restauration (`6-essai-restauration.ps1`) doit être adapté. Le support à distance ne peut plus ouvrir une archive sans la clé. | Faible à moyen |
| S7 | **Durcissement périmètre** : MariaDB n'écoute que `127.0.0.1` (ou liste blanche d'IP des postes), compte applicatif `'prestige'@'localhost'` uniquement, `root` sans accès réseau, `skip-networking` si tout est local. | Réutilisation à distance d'un mot de passe connu | Les postes clients se connectent à Payara (HTTP), pas à MariaDB — à vérifier qu'aucun poste n'ouvre une connexion JDBC directe (anciens outils). | Faible |

**Écartés** : `mysql_config_editor`/`.mylogin.cnf` (MySQL Oracle seulement) ; Windows Credential Manager depuis Java (possible via JNA
mais lourd ; DPAPI couvre le même besoin plus simplement) ; Jasypt tel quel.

### Trajectoire recommandée

1. **Tout de suite (sans code)** : S7 + rotation manuelle une fois + S5 pour les scripts PowerShell (déjà à moitié fait :
   `2-configurer-mariadb.ps1 -CreerCompte`) + audit du `SAUVEGARDE_COMPRESSION.bat` présent sur le serveur.
2. **Lot 1 (code)** : S4 (JDBC → JNDI) + S5 (sauvegarde Java sur compte dédié, `.cnf` DPAPI) + correctif ACL de `fichierPrive()` sous
   Windows + filtrage de l'URL dans les journaux de `JdbConnexion` tant que S4 n'est pas livré.
3. **Lot 2** : S2 (alias Payara) devient possible, S1 (écran de rotation) et S6 (archives chiffrées).

## 4. Règles à trancher

| # | Question |
|---|----------|
| Q4.1 | Qui a le droit de lancer une rotation : super-admin seulement (`superAdmin()` de `SupportServeurRessource`) ? Avec un second facteur (mot de passe de session re-saisi) ? |
| Q4.2 | Compte de rotation (`ALTER USER`) : saisi à chaque rotation (recommandé) ou stocké chiffré ? |
| Q4.3 | Archives chiffrées (S6) : où vit la clé de déchiffrement ? Qui peut restaurer (le support à distance doit-il pouvoir) ? |
| Q4.4 | Master password Payara : acceptez-vous de la changer (impact sur le démarrage en service Windows) ? |
| Q4.5 | Le chemin JDBC direct (A) peut-il être supprimé (S4), ou faut-il le garder pour des outils hors Payara ? Lesquels ? |
| Q4.6 | Politique de rotation : à chaque départ d'employé + tous les N mois ? Rappel dans l'écran ? |

## 5. Risques de régression

- S4 : anciens `bll` qui comptent sur `autocommit` ou gardent une connexion longtemps ; pool épuisé → mesurer sur le banc
  (`outils/banc/peupler_banc.py`) et sur `domain2`. Tests JSP un par un.
- S2 : sauvegarde Java et valorisation **cassées** tant que S5 n'est pas fait ; l'ordre de livraison compte.
- S1 : rotation à moitié faite (MariaDB changé, Payara non) = application arrêtée. L'écran doit être **transactionnel** : vérifier la
  nouvelle connexion avant de valider, sinon revenir à l'ancien mot de passe (`ALTER USER` inverse) — et tout en un seul bouton, sans fenêtre.
- S6 : une archive illisible sans clé = perte de données si la clé est perdue : l'essai de restauration périodique devient obligatoire.
- Les copies `domain.xml.avant-prestige-*` existantes contiennent l'ancien mot de passe : les purger après rotation (l'écran le propose).

## 6. Ce qu'il faudrait toucher

| Couche | Fichier | Modification |
|--------|---------|--------------|
| Java | `dal/JdbConnexion.java` | S4 : `InitialContext().lookup("jdbc/__laborex_pool")` ; filtrer l'URL dans le `catch` en attendant. |
| Java | `rest/service/impl/sauvegarde/PoolMariaDb.java`, `SauvegardeService.java`, `ValorisationSauvegarde.java` | S5 : source d'identifiants = `.cnf` dédié déchiffré (DPAPI), plus de lecture de `domain.xml` ; `fichierPrive()` avec ACL Windows (`AclFileAttributeView`). |
| Java | nouveau `rest/service/impl/securite/IdentifiantsBaseService.java` | DPAPI (JNA `Crypt32`) ou AES avec clé fichier ; rotation (S1) : `ALTER USER`, `asadmin set`, test de connexion, retour arrière. |
| REST | `rest/SupportServeurRessource.java` | onglet Sécurité : état (où est le mot de passe, en clair ou protégé, date de dernière rotation, copies `domain.xml` à purger), actions rotation / protéger / purger, sous `superAdmin()`. |
| ExtJS | `view/support/SupportServeur.js` l. 34 | onglet `ongletSecurite()` ; branche `tabchange`. |
| Affichage | `correctifs-affichage.js` | rien si onglet dans `supportserveur` (déjà déclaré l. 917-919) ; une ligne d'xtype si nouvel écran. |
| Scripts | `outils/officine/2-configurer-mariadb.ps1`, `3-sauvegarde-complete.ps1`, `4-copier-journal.ps1`, `6-essai-restauration.ps1` | `.cnf` chiffré DPAPI (`ConvertFrom-SecureString`), archives `-hp`/`7z -p`, binlogs chiffrés. |
| SQL | `t_parameters` | `KEY_SECURITE_DERNIERE_ROTATION`, `KEY_SAUVEGARDE_CHIFFREE` ; table `t_securite_journal` (qui, quand, quoi — jamais la valeur). |
| TOOLKITS | `jdom`, `Cryptages` | seulement si S3 (chemin A conservé). |

Aucune JSP nouvelle, aucun secret dans Git, dans le JS, dans les statuts ou les journaux.
