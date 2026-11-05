# Onglet « Sécurité » du Centre de support : lot 4.B (cas 4)

Analyse : `docs/analyses/2026-11-03/cas4-mot-de-passe-base.md` (§3 S1, S2 ; §6) et `plan-realisation.md` §9, décisions
du 05/11/2026 (Q4.1, Q4.2, Q4.4, Q4.6). Ce lot suit le lot 4.A (`NOTICE_SECURITE_BASE_LOT_A.md`) et ne touche pas aux
archives chiffrées (lot 4.C).

Aucun secret n'est cité dans cette notice, ni dans le code, ni dans les journaux, ni dans Git.

## 1. Ce que fait le lot

Tant que `KEY_SECURITE_BASE` vaut `0`, rien n'existe : pas d'onglet, et les trois API d'action répondent « Sécurité de
la base inactive ». À `1`, le **super administrateur** voit un onglet « Sécurité » dans Centre de support > Stabilité du
serveur, qui n'affiche **jamais** un mot de passe : seulement où il est stocké, sous quelle forme, et depuis quand.

| Action | Ce qui se passe | Retour arrière |
|---|---|---|
| **Changer le mot de passe de la base** (rotation, S1) | En un appel : vérification d'asadmin et du compte MariaDB de rotation (rien n'est changé avant), `ALTER USER '<compte du pool>'@'<hôte>' IDENTIFIED BY …`, mise à jour du pool Payara (propriété `password` en clair, ou alias `prestige-db` si l'alias est posé), `ping-connection-pool` (Payara se connecte à MariaDB avec la nouvelle valeur), puis redémarrage du domaine Payara lancé détaché (§3 bis), date de rotation posée, journal. Mode **Générer** (24 caractères tirés par le serveur, jamais affichés ni renvoyés) ou **Saisir** (deux champs masqués, contrôle de force à l'écran et sur le serveur). | Si Payara refuse la mise à jour ou si le pool ne se reconnecte pas : Payara rétabli, puis `ALTER USER` inverse avec l'ancien mot de passe (connu quand le pool est en clair). En mode alias l'ancienne valeur n'est pas connue : le résultat le dit et demande de relancer la rotation (le compte de rotation peut toujours fixer un nouveau mot de passe). |
| **Protéger le mot de passe du pool (alias Payara, S2)** | `create-password-alias prestige-db` (valeur lue dans domain.xml, passée à asadmin par un fichier privé supprimé aussitôt, jamais en ligne de commande), puis `set …property.password=${ALIAS=prestige-db}`, `ping-connection-pool`, redémarrage de Payara (§3 bis). | Pool remis à sa valeur en clair, `ping-connection-pool` ; pas de redémarrage. |
| **Purger les copies de domain.xml** | Supprime les `domain.xml.avant-prestige-*` du dossier `config` du domaine (copies faites avant chaque application de réglages Payara : chacune contient l'ancien mot de passe). | Aucun (fichiers supprimés). |

Chaque action :

- est réservée au super administrateur (`superAdmin()` de `SupportServeurRessource`) **et** demande la re-saisie de son
  mot de passe Prestige dans le même formulaire (Q4.1 ; même hachage que la connexion, comparaison à temps constant,
  cinq refus bloquent cinq minutes) ; un refus est journalisé ;
- se confirme **dans son bouton** (premier clic : le bouton devient « Confirmer… » ; second clic dans les 6 s :
  exécution) ; aucune fenêtre ;
- est journalisée dans `t_securite_journal` (qui, quand, action, résultat, étapes) et par une ligne `INFO` dans
  `server.log` (action, login, résultat) : **jamais une valeur** ;
- vide les champs de mot de passe après validation, quel que soit le résultat.

Le compte MariaDB de rotation (`root` par défaut, ou un compte qui a le privilège `CREATE USER`) est saisi à chaque
rotation et n'est ni stocké ni journalisé (Q4.2). Le rappel de rotation (Q4.6) s'affiche quand la dernière rotation a
plus de 6 mois ou n'a jamais été faite.

## 2. Paramètres, table, API

| Clé (`t_parameters`) | Défaut | Rôle |
|---|---|---|
| `KEY_SECURITE_BASE` | `0` | lot 4.A ; à `1`, l'onglet existe pour le super administrateur. |
| `KEY_SECURITE_DERNIERE_ROTATION` | vide | date de la dernière rotation réussie (`AAAA-MM-JJ HH:MM`), posée par la rotation. Migration `V7.2.39`. |
| `KEY_SECURITE_DOSSIER_COPIES` | absent | dossier où chercher et purger les copies `domain.xml.avant-prestige-*` ; absent : `config` du domaine en cours. Sert au diagnostic et aux essais. |

Table `t_securite_journal` (`V7.2.39`, rejouable) : `dt_DATE`, `str_LOGIN`, `str_ACTION` (`ROTATION`, `ALIAS`,
`PURGE_COPIES`), `str_RESULTAT` (`OK`, `ECHEC`, `RETOUR_ARRIERE`, `REFUSE`), `str_DETAIL` (étapes, sans valeur).

API `v1/support/serveur/securite/…` (droit `P_SM_SUPPORT_SERVEUR` et super administrateur) :

| Appel | Corps | Réponse |
|---|---|---|
| `GET etat` | — | `{actif}` ; à 1 : pool (nom, compte, forme `CLAIR` / `ALIAS` / `INCONNU`, alias), sauvegarde (fichier du compte dédié présent et chiffré ?), copies (dossier, nombre, en clair, noms), dernière rotation (date, par qui, rappel, prochaine), `asadmin` lançable ?, journal (50 dernières lignes), commande de changement de la master password. |
| `POST rotation` | `{motDePasseSession, compteRotation, motDePasseRotation, mode: GENERER\|SAISIR, nouveauMotDePasse?, confirmation?}` | `{success, message, etapes[], retourArriere, incoherent}` |
| `POST alias` | `{motDePasseSession}` | idem |
| `POST purger-copies` | `{motDePasseSession}` | `{success, supprimees, restantes, message}` |

## 3. Règles du mot de passe (`MotDePasseBase`)

12 caractères minimum (24 générés), lettres + chiffres + au moins un symbole parmi `# * + - . / : ; = @ [ ] _ ~`. Sont
refusés, en plus de ce que demandait l'analyse (`& ? ' "` et l'espace, à cause de l'URL JDBC et des fichiers `.cnf`),
les caractères que `cmd.exe` interprète (`% ! ^ | < > ( )`), `$ { }` (syntaxe `${ALIAS=…}` de Payara) et l'antislash.
Les ordres à Payara passent par le client Java d'asadmin (`java -jar glassfish/modules/admin-cli.jar`, JVM du serveur)
et non par `asadmin.bat`, pour qu'une valeur d'origine de domain.xml soit remise telle quelle lors d'un retour arrière.

`ApplicationPayara.motDePassePool` est la seule exception à la liste fermée des commandes `asadmin set` : la propriété
`password` du pool de Prestige, en clair ou `${ALIAS=…}` ; la liste fermée elle-même n'admet que la forme alias.

## 3 bis. Pourquoi Payara redémarre après une rotation ou la pose de l'alias (constaté sur Payara 5.2022.5, domain3)

Un `asadmin set` sur `user` ou `password` du pool détruit le pool et le recrée. Les objets `DataSource` que
l'application tient depuis son démarrage (unités JPA `DALPU` et `JTA_UNIT`, EJB) gardent l'ancienne fabrique de
connexions : toute connexion échoue ensuite avec `RAR7099 : the MCF … are not equal` puis `No password credential found`
dans `server.log`, et ce **tant que le domaine n'a pas redémarré**. Essais faits sans succès : `flush-connection-pool`,
désactiver puis réactiver la ressource JDBC, la propriété `dynamic-reconfiguration-wait-timeout-in-seconds`. Seul un
retour aux valeurs du démarrage remet l'application en service sans redémarrage : c'est ce qui rend le **retour
arrière immédiat** (aucun redémarrage après un échec). Un alias relu (`update-password-alias`) n'est pris en compte
qu'au prochain démarrage du pool, pour la même raison.

Le service vérifie donc la nouvelle configuration avant de redémarrer : pool en clair, par `asadmin
ping-connection-pool` (Payara ouvre une connexion neuve avec la propriété du moment : le ping échoue si MariaDB refuse
le compte) ; pool sous alias, par une connexion JDBC directe au serveur MariaDB avec le compte du pool et la valeur
posée dans l'alias (le ping se connecterait encore avec l'ancienne valeur de l'alias, relue au redémarrage seulement ;
asadmin a confirmé la mise à jour de l'alias). Puis, en cas de succès
seulement, lance le redémarrage du domaine en cours (script `redemarrer-<horodatage>.bat` dans le dossier privé du
domaine, processus créé par WMI hors de l'arbre de Payara, délai de 3 s pour que la réponse parte ; même mécanisme que
« Appliquer et redémarrer Payara »). L'écran l'annonce (« Payara redémarre, environ une minute : reconnectez-vous
ensuite et rouvrez cet onglet ») et désactive ses boutons. Sur un poste où le lancement échoue, la réponse le dit : la
configuration est cohérente, il reste à redémarrer Payara à la main.

## 4. Master password de Payara (Q4.4)

L'alias est chiffré par la master password du domaine. Si elle est celle par défaut, l'alias ne protège pas grand-chose.
La changer **sur le serveur, à la main** (l'onglet affiche la commande ; Prestige ne l'exécute pas) :

```
asadmin stop-domain domain1
asadmin change-master-password --savemasterpassword=true domain1
asadmin start-domain domain1
```

`--savemasterpassword=true` garde le démarrage en service Windows sans intervention (fichier `master-password` du
domaine, protégé par les ACL du compte de service) ; `false` demanderait la saisie à chaque démarrage (écarté). Non
exécuté sur le poste local.

## 5. Procédure en officine (dans l'ordre)

1. Lot 4.A installé et `KEY_SECURITE_BASE = 1` (sinon l'onglet n'existe pas, et une sauvegarde lirait encore
   domain.xml : l'alias la casserait).
2. Super administrateur : Centre de support > Stabilité du serveur > **Sécurité**. Vérifier que « Lancement d'asadmin
   depuis Prestige » est « POSSIBLE » (Payara sur le poste, asadmin sans mot de passe d'administration).
3. **Protéger le mot de passe du pool (alias Payara)** : le mot de passe quitte domain.xml ; Payara redémarre.
   Se reconnecter, rouvrir l'onglet : « ALIAS PAYARA ».
4. **Changer le mot de passe de la base** (Générer recommandé) : saisir le compte MariaDB de rotation et son mot de
   passe, son propre mot de passe Prestige, confirmer dans le bouton. Payara redémarre (environ une minute, tous les
   postes déconnectés) : à faire hors des heures de vente, comme la pose de l'alias.
5. **Purger les copies de domain.xml** (elles portent l'ancien mot de passe).
6. Sur le serveur : changer la master password (§4). Conserver l'ancienne configuration XML (`chemin A` du lot 4.A)
   n'a plus d'effet avec le pool JNDI ; si elle doit rester lisible par un ancien outil hors Payara, y reporter le
   mot de passe à la main (il n'est connu que si le mode Saisir a été choisi).
7. Rotation à chaque départ d'employé et tous les 6 mois (rappel dans l'onglet).

## 6. Tests

Unitaires (`mvn -o test`) : `MotDePasseBaseTest` (validation, génération, ordres, exception contrôlée, sortie d'asadmin
et causes sans valeur), `RotationMotDePasseTest` (succès, refus de Payara, échec du test de connexion avec retour
arrière complet, refus de MariaDB sans rien changer, retour arrière incomplet signalé, ancien inconnu en mode alias),
`ApplicationPayaraTest` et `PoolMariaDbTest` inchangés.

Écran : `src/test/e2e/securite/test-securite-ecran.js` (Windows, un seul test à la fois ; `BASE`, `DB_TEST` +
`E2E_BASE_LIBRE=1`, `PAYARA_DOMAINE`). Il crée deux comptes MariaDB d'essai (application et rotation), bascule le pool
de Payara sur le compte d'application d'essai, puis joue par l'écran : onglet absent à 0 ; état à 1 ; refus sans le bon
mot de passe de session ; rotation Générer ; Saisir faible refusée puis forte ; échec simulé (compte verrouillé avant
la rotation) avec retour arrière ; alias ; rotation en mode alias ; purge dans un dossier d'essai ; `server.log` et
réponses sans aucun des mots de passe ; puis remet le pool, retire l'alias, les paramètres, le journal, les comptes et
les fichiers. **Le compte applicatif réel de la copie locale n'est jamais touché.**

## 7. Résultats sur le poste (05/11/2026)

Serveur d'essai : Payara `domain3` (HTTP 10090, administration 10048), base `laborex_audit` (copie de `laborex_v1_db`),
Payara et MariaDB 10.6 sur le poste. `domain1` et `laborex_v1_db` jamais touchés ; le compte applicatif réel du pool de
domain3 n'a jamais été modifié (le test bascule le pool sur un compte d'essai, puis le remet, avec un redémarrage à
chaque fois).

| Test | Résultat |
|---|---|
| `mvn -o test` : `MotDePasseBaseTest` (7), `RotationMotDePasseTest` (6), `ApplicationPayaraTest` (9), `PoolMariaDbTest` (4) | tout vert |
| `test-securite-ecran.js` (écran) | **23 / 23** au 4ᵉ passage complet (≈ 25 min, cinq redémarrages de Payara) |
| … à 0 | pas d'onglet, l'API répond `actif = false` |
| … à 1 | onglet présent ; état : pool EN CLAIR sur le compte d'essai, 3 copies de domain.xml en clair, rotation jamais faite ; bouton de purge « 3 copie(s) », bouton d'alias actif |
| … mauvais mot de passe de session | refus, ligne `ROTATION REFUSE` au journal, rien ne change, champs vidés |
| … rotation Générer | mot de passe de 24 caractères de l'alphabet admis dans domain.xml, ancien refusé par MariaDB, nouveau accepté, journal `ROTATION OK mot de passe généré`, date de rotation posée ; Payara a redémarré de lui-même (nouveau processus, journal `Successfully restarted the domain`), reconnexion, onglet rouvert |
| … rotation Saisir | saisie trop courte : « TROP COURT » à l'écran et refus du serveur, rien ne change ; saisie forte : « FORT », changé et vérifié, redémarrage |
| … échec simulé (compte verrouillé par le test avant la rotation) | `ping-connection-pool` échoue (« this account is locked »), Payara rétabli, ancien mot de passe remis, `RETOUR_ARRIERE` dans `server.log`, **aucun redémarrage**, écran et API répondent aussitôt |
| … alias Payara | confirmation dans le bouton, domain.xml porte `${ALIAS=prestige-db}`, alias listé, journal `ALIAS OK`, redémarrage, état « ALIAS PAYARA », bouton d'alias désactivé |
| … rotation en mode alias | changé et vérifié (connexion directe), domain.xml garde l'alias, ancien refusé, nouveau accepté, redémarrage |
| … purge | 3 copies supprimées, l'autre fichier du dossier conservé, état « AUCUNE », journal `PURGE_COPIES OK` |
| … secrets | aucun des mots de passe (comptes d'essai, générés, saisis, compte de rotation) dans 1,3 Mo de `server.log` (tous les fichiers tournés), ni `IDENTIFIED BY` avec sa valeur, ni `AS_ADMIN_ALIASPASSWORD`, ni dans les 26 réponses de l'API, ni dans `t_securite_journal` |
| … ergonomie | aucune fenêtre, aucune erreur JavaScript |
| … remise | pool remis sur son compte d'origine (domain.xml identique), Payara redémarré et Prestige répond, alias retiré, paramètres, journal, comptes et fichiers du test retirés |

Les passages précédents ont servi à établir le comportement de Payara décrit au §3 bis (le test échouait à la
connexion après chaque changement du pool) et à corriger : `--passwordfile` avant la sous-commande, lecture de
domain.xml pendant que Payara le réécrit, indicateur de force mis à jour sur `change`, vérification directe en mode
alias (le ping se connectait avec l'ancienne valeur de l'alias).

Non fait ici : changement de la master password (§4, commande documentée seulement) ; le banc Linux.

## 8. Retour arrière

- `KEY_SECURITE_BASE = 0` : l'onglet disparaît, les API refusent ; ce qui a été fait reste en place (un alias posé
  reste valable, la sauvegarde du lot 4.A ne lit plus domain.xml à 0… **attention** : à 0 la sauvegarde relit
  domain.xml et refuse un alias ; retirer l'alias avant de revenir à 0 : `asadmin set
  resources.jdbc-connection-pool.laborex_pool.property.password=<valeur>` puis `asadmin delete-password-alias
  prestige-db`, ou laisser le paramètre à 1).
- Redéployer le WAR précédent : la table et le paramètre restent sans effet.

## 9. Limites

- Mode alias : l'ancienne valeur n'est pas lisible par Prestige ; un échec après `ALTER USER` laisse MariaDB sur le
  nouveau mot de passe et l'alias sur l'ancien ; l'écran le dit et demande de relancer la rotation.
- Chaque rotation ou pose d'alias réussie redémarre Payara (§3 bis) : à faire hors des heures de vente. Le
  changement de master password (§4) demande lui aussi un arrêt.
- Archives `.sql.gz` non chiffrées : lot 4.C.
