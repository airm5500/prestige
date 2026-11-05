# Sécurité du stockage du mot de passe de la base : lot 4.A (cas 4)

Analyse : `docs/analyses/2026-11-03/cas4-mot-de-passe-base.md` (§3 S4, S5 ; §6) et `plan-realisation.md` §9, décisions du
05/11/2026 (Q4.1 à Q4.6). Ce lot ne touche ni à l'écran « Sécurité » (lot 4.B) ni aux archives chiffrées (lot 4.C).

Aucun secret n'est cité dans cette notice, ni dans le code, ni dans les journaux, ni dans Git.

## 1. Ce que fait le lot

Le mot de passe de la base vit aujourd'hui à trois endroits : la configuration XML lue par les anciens écrans
(`dal/JdbConnexion`, URL JDBC avec le mot de passe), le pool `laborex_pool` de `domain.xml`, et le fichier d'options des
scripts de sauvegarde de l'officine. Le lot 4.A :

| | Avant | Après, quand `KEY_SECURITE_BASE` vaut 1 |
|---|---|---|
| Anciens écrans (JSP, `bll`, états Jasper : `new jconnexion()`) | `DriverManager.getConnection(url)` avec le mot de passe dans l'URL ; une erreur de pilote écrivait l'URL complète dans `server.log` ; une connexion ouverte par appel, jamais rendue | connexion prise dans le pool JNDI `jdbc/__laborex_pool` de Payara, rendue au pool à la fermeture ; plus d'URL JDBC construite pour se connecter |
| Sauvegarde intégrée et valorisation (`SauvegardeService`, `ValorisationSauvegarde`) | lecture de `domain.xml` entier, mot de passe du pool extrait par expression régulière ; refus si le pool a un alias `${ALIAS=…}` | lecture du compte dédié `prestige_sauvegarde` dans un fichier d'identifiants **chiffré par DPAPI** ; `domain.xml` n'est plus lu ; un alias Payara sur le pool ne gêne plus |
| Fichier d'options passé à `mariadb-dump` | fichier dans `%TEMP%`, « protégé » par `setReadable(false, false)` (sans effet sous Windows) | fichier dans le dossier privé du domaine `<domaine>/prestige-prive`, ACL Windows réelle (le seul compte du serveur, sans héritage), supprimé dans le `finally` ; les orphelins d'un arrêt brutal sont retirés au démarrage et avant chaque sauvegarde |
| Scripts `outils/officine` (3, 4, 6) | `sauvegarde.cnf` en clair, ACL SYSTEM + administrateurs | `sauvegarde.cnf` chiffré (DPAPI, portée machine) ; clair déchiffré le temps du script dans `C:\ProgramData\Prestige\prive`, supprimé à la fin |

Quelles que soient les valeurs du paramètre :

- tout message journalisé par `JdbConnexion` est filtré : le mot de passe et l'URL n'y apparaissent jamais ;
- le fichier d'options de la sauvegarde va dans le dossier privé aux ACL réelles (repli sur l'ancien fichier temporaire,
  journalisé, seulement si ces droits ne peuvent pas être posés **et** que le paramètre est à 0) ;
- `JdbConnexion.getConnection()` rend la connexion déjà ouverte au lieu d'en ouvrir une nouvelle à chaque appel
  (`InvoiceServlet` en ouvrait une par état et ne fermait rien : il ferme désormais à la fin de l'édition).

## 2. Paramètres

| Clé (`t_parameters`) | Défaut | Rôle |
|---|---|---|
| `KEY_SECURITE_BASE` | `0` | `0` : tout comme avant (sauvegarde par `domain.xml`, anciens écrans par la configuration XML). `1` : compte dédié et pool JNDI. Posé par la migration `V7.2.38__securite_base.sql`, rejouable. |
| `KEY_SECURITE_FICHIER_IDENTIFIANTS` | absent | Chemin du fichier d'identifiants chiffré. Absent : `C:\ProgramData\Prestige\sauvegarde.cnf` (Windows) ou `/etc/prestige/sauvegarde.cnf`. |

Les anciens écrans relisent `KEY_SECURITE_BASE` au plus toutes les 15 s (par le pool) ; la sauvegarde le lit à chaque
lancement. Un changement de valeur prend donc effet sans redémarrage. Une ligne `INFO` « Anciens écrans : connexions par
le pool JNDI … » ou « … connexion JDBC directe … » est écrite dans `server.log` à chaque changement de mode (jamais de
secret).

Sur le poste local de développement, le paramètre **reste à 0** : les anciens écrans y lisent volontairement une autre
base (`capitale`) que le pool (`laborex_v1_db`). En officine il n'y a qu'une base.

## 3. Le fichier d'identifiants

- Écrit par `outils\officine\2-configurer-mariadb.ps1 -CreerCompte` : une ligne d'en-tête
  `# Prestige : identifiants de sauvegarde chiffres (DPAPI)`, puis le bloc DPAPI en base64. Le texte chiffré est le
  fichier d'options `[client]` (`user`, `password`, `host`, `port`) ; la base sauvegardée est celle du pool
  (`SELECT DATABASE()`), jamais lue dans le fichier.
- **Portée machine** (`ProtectedData … LocalMachine`, lue côté Java par JNA `Crypt32Util.cryptUnprotectData`) : seul un
  programme qui tourne sur ce poste **et** qui a le droit de lire le fichier peut le déchiffrer. Une copie emportée
  (clé USB, image disque, sauvegarde du dossier) est illisible ailleurs. La portée utilisateur
  (`ConvertFrom-SecureString` sans clé) a été écartée : le fichier est écrit par l'administrateur qui installe, puis lu
  par SYSTEM (tâches planifiées) et par le compte de Payara, trois comptes différents.
- Droits : SYSTEM et administrateurs, plus le compte de Payara donné par `-ComptePayara DOMAINE\compte` quand Payara ne
  tourne ni sous SYSTEM ni sous un administrateur. Le contrôle d'accès est donc l'ACL ; le chiffrement protège contre la
  copie du fichier.
- Un fichier **en clair** (`[client]` en tête, installation d'avant ce lot) reste lu par les scripts 3, 4 et 6, mais
  **refusé par Prestige** sous Windows (message : « lancez 2-configurer-mariadb.ps1 -Chiffrer »). Hors Windows (banc),
  un fichier en clair est accepté s'il n'est lisible que par le compte du serveur.
- Côté Java, le clair ne vit qu'en mémoire, puis dans le fichier d'options privé pendant l'appel à `mariadb-dump`
  (ou au client `mariadb` pour la valorisation). Les messages d'erreur de l'outil sont filtrés (`***`), les messages
  d'erreur de lecture du fichier disent quoi faire, sans jamais citer une valeur.

Le compte `prestige_sauvegarde` a : `SELECT, SHOW VIEW, TRIGGER, EVENT, LOCK TABLES, RELOAD, REPLICATION CLIENT,
BINLOG MONITOR` sur tout, et **tous les droits sur `prestige_valo_tmp`** seulement (la base temporaire de la
valorisation d'une sauvegarde, créée et supprimée par le pool). Il ne peut pas restaurer : la restauration reste manuelle,
par un administrateur, comme avant.

## 4. Procédure d'installation en officine (dans l'ordre)

1. Déployer le WAR (la migration pose `KEY_SECURITE_BASE = 0` : rien ne change encore).
2. Sur le serveur, en administrateur :
   ```
   .\2-configurer-mariadb.ps1 -CreerCompte
   ```
   (`-ComptePayara 'DOMAINE\compte'` si Payara tourne sous un compte dédié ; `-OptionsRoot <fichier>` si le poste n'a
   pas de console pour la saisie masquée du mot de passe root). Relançable : le mot de passe du compte est retiré et le
   fichier réécrit. Si le compte et le fichier existent déjà depuis le lot 4.0 (fichier en clair) :
   `.\2-configurer-mariadb.ps1 -Chiffrer`, puis **relancer `-CreerCompte` une fois** pour le droit sur
   `prestige_valo_tmp`, absent de l'ancienne version du script.
3. Vérifier que les tâches planifiées lisent le nouveau fichier : `.\3-sauvegarde-complete.ps1` puis
   `.\4-copier-journal.ps1` à la main (elles le déchiffrent elles-mêmes ; rien à changer dans `5-planifier.ps1`).
4. Pool Payara : `.\1-configurer-payara.ps1 -DelaisJdbc` pose la reprise des connexions oubliées
   (`connection-leak-reclaim=true`, 120 s) : avec le pool, une connexion jamais fermée par un ancien écran n'est plus
   fermée par MariaDB à l'expiration (`wait_timeout`) mais rendue par Payara. Voir l'inventaire §5.
5. Dans Prestige, Paramètres : `KEY_SECURITE_BASE = 1`.
6. Centre de support > Stabilité du serveur > Sauvegardes : « Sauvegarder maintenant », vérifier la ligne « Réussie »,
   puis « Valoriser » sur cette ligne. Un échec s'affiche dans la colonne message avec la marche à suivre (fichier
   introuvable, non chiffré, illisible par le compte du serveur, droits).
7. Ouvrir un ancien écran qui imprime (Fiche Article > Imprimer) et vérifier dans `server.log` la ligne
   « Anciens écrans : connexions par le pool JNDI jdbc/__laborex_pool (KEY_SECURITE_BASE = 1) ».

Le lot 4.B (alias Payara sur le pool, rotation, purge des copies `domain.xml.avant-prestige-*`) ne doit être posé
qu'après cette étape : avec le paramètre à 1, la sauvegarde ne lit plus `domain.xml` et un alias ne la casse plus.

## 5. Inventaire des usages de `JdbConnexion` (Q4.5 : rien hors Payara)

| Usage | Nombre | Dans Payara ? | Remarque |
|---|---|---|---|
| `new jconnexion()` dans le Java (`bll/*`, `report/reportManager`, `controller/FactureProvisoire`, `dal/jconnexion`) | 28 classes | oui (WAR) | 16 de ces classes sont aussi appelées depuis des ressources REST (JAX-RS, hors transaction EJB) : la connexion du pool y est en autocommit, comme avant |
| JSP `webservices/**` (éditions PDF/XLS, `ws_transaction.jsp`, `ws_customer_last_transction_compte_client_data.jsp`) | 97 JSP | oui (WAR) | |
| `job/InvoiceServlet` (`new JdbConnexion()`) | 1 servlet | oui (WAR) | ouvrait une connexion par état sans fermer : fermeture ajoutée |
| `main()` hors serveur | `bll/report/JsonDataSourceApp.main` (essai Jasper sur JSON, sans base) ; `dal/dataManager` (commenté) | non concerné | aucun outil en ligne de commande n'ouvre la base par `JdbConnexion` |
| Autres postes | aucun | | `Etiquete.java` rappelle des JSP par HTTP, pas par JDBC |

Le repli sur l'ancien chemin (configuration XML) ne sert donc qu'hors Payara (lookup JNDI impossible), par prudence.

**Connexions jamais fermées** (`new jconnexion()` sans `CloseConnexion()`), inchangées dans ce lot :
`webservices/configmanagement/client/ws_transaction.jsp`, `bll/bllDirectBase` (connexion gardée par l'objet),
`bll/stockManagement/DepotManager`. Avec le pool, ces connexions sont rendues par la reprise des connexions oubliées
(étape 4 de la procédure) ; sans elle, le pool (`max-pool-size` 32) pourrait s'épuiser au fil des appels de ces trois
points. `is-connection-validation-required=true` (déjà posé par le script 1) couvre la coupure de MariaDB.

Transactions : les anciens écrans n'ouvrent pas de transaction JTA. Les connexions du pool leur sont rendues en
autocommit (`JdbConnexion` le force si le pool l'avait laissé à `false`). Les `bll` qui gèrent leurs transactions le font
sur l'`EntityManager` (JPA), pas sur `jconnexion` : aucun changement.

## 6. Tests

Unitaires (`mvn -o test`, JDK 11) :

- `FichierPriveTest` : fichier et dossier privés réservés au seul compte courant (une seule entrée d'ACL, sans héritage
  sur le fichier, héritée du dossier), nettoyage des orphelins par préfixe ;
- `IdentifiantsBaseServiceTest` : chiffrement DPAPI puis relecture (guillemets et échappements du mot de passe
  conservés), fichier en clair refusé sous Windows, bloc illisible et fichier absent : messages sans secret ; hors
  Payara le paramètre est inactif ;
- `JdbConnexionTest` : le texte journalisé ne contient ni l'URL ni le mot de passe ;
- `PoolMariaDbTest` (existant) : lecture de `domain.xml`, options échappées.

Écran (`src/test/e2e/securite/test-securite-base.js`, Windows, un seul test à la fois ; réglages `BASE`, `DB_TEST`,
`E2E_BASE_LIBRE=1`, `PAYARA_DOMAINE` pour un autre domaine) : le compte dédié et le fichier chiffré sont créés par le
vrai script 2 (sur une copie de `my.ini`), puis par l'écran Sauvegardes : sauvegarde à 0 (comme avant), à 1 (compte dédié
vu dans la liste des connexions pendant le dump, même contenu table par table, mêmes routines et déclencheurs),
valorisation à 0 et à 1 (mêmes totaux), échec propre sans fichier, aucun mot de passe dans `server.log` ni dans les
réponses, Fiche Article > Imprimer par le pool à 1 et par la connexion directe à 0 ; tout est retiré à la fin
(paramètres, historique, compte, fichiers). Résultats : voir §7.

Scripts : `2-configurer-mariadb.ps1 -CreerCompte -OptionsRoot … -ComptePayara …` puis `-Chiffrer` (idempotent),
`4-copier-journal.ps1` (déchiffre puis s'arrête sur « journal binaire inactif » : attendu sur ce poste),
`3-sauvegarde-complete.ps1` (voir §7), sur une copie de `my.ini` et un compte d'essai supprimé ensuite.

## 7. Résultats sur le poste (05/11/2026)

Serveur d'essai : Payara `domain3` (HTTP 10090), base `laborex_audit` (copie de `laborex_v1_db`, 363 tables), Payara sous
le compte `RM\AIRMAN` non élevé (d'où `-ComptePayara` à l'installation du fichier). `domain1` était pris par une autre
session.

| Test | Résultat |
|---|---|
| `mvn -o test` : `FichierPriveTest`, `IdentifiantsBaseServiceTest`, `JdbConnexionTest`, `PoolMariaDbTest` | 4 classes, tout vert (ACL d'une seule entrée vérifiée, chiffrement et relecture DPAPI, messages sans secret) |
| `test-securite-base.js` (écran) | **17 / 17** au 4ᵉ passage (les trois premiers ont corrigé le test lui-même : tables vivantes du serveur `t_serveur_*`, `t_application_event` ; sélecteur du bouton Imprimer ; la JSP répond par une redirection 302 vers son PDF) |
| … sauvegarde à 0 | « Réussie », 484,2 Mo, 100 s ; 363/363 tables, 201 avec des lignes, routines, déclencheurs, « Dump completed » |
| … sauvegarde à 1 (compte dédié vu dans `PROCESSLIST` pendant le dump) | « Réussie », 484,2 Mo, 91 s ; **aucun écart** table par table (nombre de lignes et condensat) hors tables que le serveur écrit lui-même (`t_sauvegarde`, `t_parameters`, `t_rum`, `t_application_event`, `t_serveur_mesure`, `t_serveur_vie`) |
| … valorisation à 0 puis à 1 | mêmes 14 lignes par famille et mêmes totaux rayon et réserve (achat et vente) |
| … à 1 sans fichier | ligne « Échec » : « Fichier des identifiants de sauvegarde introuvable : … (à créer par outils\officine-configurer-mariadb.ps1 -CreerCompte) », aucun fichier créé |
| … journal du serveur | aucun mot de passe du pool, aucun `password=` renseigné, aucune URL JDBC ; dossier privé vide après chaque sauvegarde, ACL `RM\AIRMAN:(OI)(CI)(F)` seule |
| … Fiche Article > Imprimer (JSP `ws_generate_pdf.jsp`) | à 1 : PDF produit, ligne « connexions par le pool JNDI jdbc/__laborex_pool (KEY_SECURITE_BASE = 1) » ; à 0 : PDF produit, ligne « connexion JDBC directe par la configuration XML (KEY_SECURITE_BASE = 0) » ; bascule sans redémarrage |
| Scripts officine (compte d'essai, copie de `my.ini`, fichier dans un dossier d'essai, tout retiré ensuite) | `2 -CreerCompte -OptionsRoot -ComptePayara` : fichier chiffré de 2 lignes, droits SYSTEM + administrateurs + compte ; `2 -Chiffrer` relancé : idempotent ; `4-copier-journal` : déchiffre puis s'arrête sur « journal binaire inactif » (attendu, pas de `log_bin` sur le poste), rien ne reste dans `prive` ; `3-sauvegarde-complete -Zstd` : `laborex_audit`, 387,1 Mo en 36 s, code 0, rien ne reste dans `prive` |
| Écrans existants à 1 (domain3) : `support/anomalies-centre/test-lot1-ecrans.js` (Suivi mouvement article, vente, détail d'un bon avec `ws_transaction.jsp`) | **9 / 9**, comportement identique |
| … `audits/test-fiche-article-qte-restante-lot.js` (Fiche Article, recherche, fenêtre des lots) | **4 / 4** |

Pool : `max-pool-size` reste à 32. Le suivi du pool de domain3 (`monitoring jdbc-connection-pool`) n'a pas livré de
compteurs exploitables pendant ces tests (activé trop tard, remis à OFF) : la mesure d'épuisement reste à faire sur le
banc (`outils/banc/peupler_banc.py`) ou sur `domain2`, avec `-DelaisJdbc` du script 1 posé.

Non essayé ici : `6-essai-restauration.ps1` (il faut un second serveur MariaDB ; il n'utilise que les fonctions déjà
exercées par 3 et 4), la tâche planifiée sous SYSTEM (`5-planifier.ps1` inchangé), le banc Linux.

## 8. Retour arrière

- `KEY_SECURITE_BASE = 0` (effet immédiat sur la sauvegarde, sous 15 s pour les anciens écrans) : tout revient à
  l'ancien fonctionnement, sans redémarrage. Le fichier chiffré et le compte dédié peuvent rester en place.
- Scripts : un fichier d'options en clair est toujours lu ; pour revenir en clair, réécrire `sauvegarde.cnf` à la main
  n'est pas prévu (il faudrait connaître le mot de passe) : relancer l'ancienne version du script 2 `-CreerCompte`.
- Redéployer le WAR précédent : la migration ne crée aucune table ; le paramètre reste sans effet.

## 9. Limites et suite

- Le mot de passe applicatif reste dans la configuration XML (lue par `jdom` même à 1, d'autres parties du code en
  lisent les chemins) et dans `domain.xml` : leur rotation et l'alias Payara sont le lot 4.B ; leur purge n'a de sens
  qu'après rotation.
- `KEY_SECURITE_FICHIER_IDENTIFIANTS` et `KEY_SECURITE_BASE` se règlent par l'écran Paramètres jusqu'à l'onglet
  Sécurité (lot 4.B).
- Archives `.sql.gz` non chiffrées : lot 4.C.
- Banc Linux : pas de DPAPI ; fichier `[client]` en clair, `chmod 600`, accepté.
