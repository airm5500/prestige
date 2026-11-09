# Archives de sauvegarde chiffrées : lot 4.C (cas 4)

Analyse : `docs/analyses/2026-11-03/cas4-mot-de-passe-base.md` (§3 S6 ; §6) et `plan-realisation.md` §9 et §10,
décisions du 05/11/2026 (Q4.3 : la clé de déchiffrement vit hors du serveur, chez le pharmacien ; l'essai de
restauration périodique devient obligatoire ; le support à distance ne peut pas ouvrir une archive sans la clé). Ce lot
suit les lots 4.A (`NOTICE_SECURITE_BASE_LOT_A.md`) et 4.B (`NOTICE_SECURITE_BASE_LOT_B.md`).

Aucun secret n'est cité dans cette notice, ni dans le code, ni dans les journaux, ni dans Git.

## 1. Ce que fait le lot

Tant que `KEY_SECURITE_BASE` vaut `0`, rien ne change : les scripts et la sauvegarde intégrée produisent exactement les
mêmes fichiers qu'avant, octet pour octet. À `1`, **une seule clé**, celle du pharmacien, chiffre toutes les archives :

| Archive | Avant | Après, à `1` avec la clé posée |
|---|---|---|
| Sauvegarde intégrée de Prestige (toutes les heures, `SauvegardeService`) | `prestige_<base>_AAAAMMJJ_HHMM.sql.gz` en clair | `….sql.gz.aes` : le gzip est chiffré à la volée, aucun octet en clair sur le disque |
| `3-sauvegarde-complete.ps1` (tâche planifiée) | `<base>-AAAAMMJJ-HHMM.sql.zst` (ou `.rar`) en clair, puis copie | `….sql.zst.aes` chiffré **avant** toute copie ; avec zstd rien en clair ne touche le disque ; avec RAR l'archive en clair passe par le dossier privé puis est supprimée |
| `4-copier-journal.ps1` (journaux binaires, toutes les heures) | copies en clair des `mariadb-bin.NNNNNN` | copies `mariadb-bin.NNNNNN.aes`, de taille connue d'avance (le script compare à la taille chiffrée attendue) |
| Valorisation d'une sauvegarde (écran Sauvegardes) | lit le `.sql.gz` | lit le `.sql.gz.aes` : HMAC vérifié, puis déchiffré à la volée ; même résultat |
| `6-essai-restauration.ps1` | recharge le `.zst` sur un autre serveur | déchiffre (clé du fichier du serveur, ou **saisie** par le pharmacien), recharge, compare, **consigne** le résultat dans la base |

Clé absente alors que le paramètre vaut 1 : la sauvegarde est faite **en clair** et le dit (message de la ligne, journal
`sauvegarde.log` « AVERTISSEMENT, archive NON chiffree », onglet Sécurité en rouge). Une sauvegarde manquante serait
pire qu'une sauvegarde en clair ; l'onglet rend l'oubli visible.

### Format (le même pour PowerShell et Java)

`PRSTGA01` (8 octets) · sel (16) · IV (16) · itérations PBKDF2 (4, gros-boutiste) · AES-256-CBC PKCS7 du contenu ·
HMAC-SHA256 (32) de tout ce qui précède. Clés AES et HMAC dérivées de la clé du pharmacien par PBKDF2-HMAC-SHA256
(200 000 itérations, sel par fichier). **Le HMAC du fichier entier est vérifié avant de déchiffrer le premier octet** :
une archive altérée ou une mauvaise clé sont refusées sans qu'un octet soit rendu. Taille d'une archive :
44 + 16 × (⌊n / 16⌋ + 1) + 32 octets pour n octets en clair. Code : `outils/officine/archive-chiffree.ps1` et
`rest.service.impl.securite.ArchiveChiffree`.

### La clé (Q4.3)

- Créée par `outils\officine\7-cle-archive.ps1 -Creer` : 32 caractères en 8 groupes de 4 (sans 0/O, 1/I/l), tirés par
  le générateur cryptographique, **affichés une seule fois**. Le pharmacien la recopie sur papier (coffre) ou
  `-CopieVers 'E:\'` l'écrit sur une clé USB rangée ailleurs. `-Saisir` : il choisit lui-même la clé (12 caractères
  au moins, ASCII).
- Sur le serveur, elle n'existe que chiffrée par **DPAPI, portée machine** (comme `sauvegarde.cnf` du lot 4.A) dans
  `C:\ProgramData\Prestige\archive.cnf` : SYSTEM, administrateurs et le compte de Payara (`-ComptePayara`) la lisent ;
  une copie du fichier emportée est illisible. Autre chemin : paramètre `KEY_SECURITE_FICHIER_CLE_ARCHIVE`.
- Elle n'est **jamais** en base, ni dans `t_securite_journal`, ni dans `server.log`, ni dans `sauvegarde.log`, ni dans
  une réponse d'API. Le script 7 écrit seulement la date de création (`KEY_SECURITE_CLE_ARCHIVE_DATE`) et une ligne
  `CLE_ARCHIVE` au journal.
- `7-cle-archive.ps1 -Verifier` : le pharmacien tape la clé gardée hors du serveur, le script dit si c'est bien celle
  du serveur (comparaison à temps constant). À faire après la copie papier et à chaque essai de restauration.
- `7-cle-archive.ps1 -Dechiffrer <archive.aes>` : rend une archive en clair (par exemple la sauvegarde horaire de
  Prestige avant une restauration à la main), avec la clé du fichier ou saisie (`-CleSaisie`).

## 2. Paramètres, journal, API

| Clé (`t_parameters`) | Défaut | Écrite par | Lue par |
|---|---|---|---|
| `KEY_SECURITE_CLE_ARCHIVE_DATE` | vide | script 7 `-Creer` | onglet Sécurité (« clé posée le … ») |
| `KEY_SECURITE_DERNIER_ESSAI_RESTAURATION` | vide | script 6 (date `AAAA-MM-JJ HH:MM`) | onglet Sécurité, rappel à plus d'un mois |
| `KEY_SECURITE_DERNIER_ESSAI_RESULTAT` | vide | script 6 : `CONFORME`, `ECART`, `ECHEC` | onglet Sécurité |
| `KEY_SECURITE_FICHIER_CLE_ARCHIVE` | absent | à la main | serveur et onglet : chemin du fichier de la clé |

Migration `V7.2.40__securite_archives.sql` (rejouable, aucune table). Journal `t_securite_journal` : actions
`CLE_ARCHIVE` (script 7, création ou vérification) et `ESSAI_RESTAURATION` (script 6 : archive, chiffrée ou non,
durées, résultat ; jamais une valeur ni une donnée). Pour que les scripts écrivent ces lignes, le compte de sauvegarde
reçoit `INSERT, UPDATE` sur `t_parameters` et `INSERT` sur `t_securite_journal` de la base (`-Base`) :
`2-configurer-mariadb.ps1 -CreerCompte` relancé **une fois après le déploiement du WAR** (les tables doivent exister).

API `GET v1/support/serveur/securite/etat` (super administrateur, à 1) : objet `archives` = `{chiffrees, clePresente,
fichierCle, cleDate, derniereArchive, derniereArchiveChiffree, dernierEssai, dernierEssaiResultat, rappelEssai,
prochainEssai, rappelEssaiMois}`. `GET v1/support/sauvegardes/etat` : `chiffrement = {securite, fichierCle,
clePresente, actif}` et `chiffree` sur chaque ligne de l'historique.

Onglet Sécurité (lot 4.B) : ligne « Archives de sauvegarde » (**CHIFFRÉES (AES)** / **NON CHIFFRÉES**, clé posée le,
dernière sauvegarde intégrée et son état), ligne « Dernier essai de restauration » (date, résultat, prochain au plus
tard), alerte rouge si la clé manque, alerte orange si l'essai a plus d'un mois ou n'a jamais été fait. Onglet
Sauvegardes : « Archives : chiffrées / NON chiffrées / en clair (sécurité inactive) », et les instructions de
restauration citent `7-cle-archive.ps1 -Dechiffrer` quand la dernière sauvegarde est chiffrée. Aucune action nouvelle
dans l'écran : la clé se crée et se vérifie **sur le serveur**, jamais depuis un poste.

## 3. Procédure d'installation en officine (dans l'ordre)

1. Lots 4.A et 4.B installés, `KEY_SECURITE_BASE = 1`. Déployer le WAR du lot 4.C (migration : trois paramètres
   vides, rien ne change encore).
2. Sur le serveur, en administrateur : `.\2-configurer-mariadb.ps1 -CreerCompte` **une fois** (droits d'écriture de la
   trace ; `-ComptePayara`, `-OptionsRoot` comme au lot 4.A ; `-Base` si la base n'est pas `laborex_v1_db`).
3. `.\7-cle-archive.ps1 -Creer -ComptePayara 'DOMAINE\compte'` (et `-CopieVers 'E:\'` pour une clé USB). **Recopier la
   clé affichée**, fermer la fenêtre. Ranger papier ou clé USB hors du serveur (coffre). La clé ne sera plus affichée.
4. `.\7-cle-archive.ps1 -Verifier` avec la copie papier : « Cle CONFORME ».
5. Vérifier les tâches planifiées à la main : `.\3-sauvegarde-complete.ps1` (ligne « …, chiffree (AES) » dans
   `sauvegarde.log`, fichier `.sql.zst.aes`) puis `.\4-copier-journal.ps1` (« chiffres (AES) », fichiers `.aes`).
   Rien à changer dans `5-planifier.ps1`.
6. Dans Prestige, Centre de support > Stabilité du serveur > Sécurité : « Archives de sauvegarde : CHIFFRÉES (AES) »,
   « clé posée le … ». Onglet Sauvegardes : « Sauvegarder maintenant » → ligne « Réussie », fichier `.sql.gz.aes` ;
   « Valoriser » sur cette ligne fonctionne (lecture par la clé du serveur).
7. **Essai de restauration, obligatoire dès l'installation puis chaque mois** (§4). L'onglet rappelle l'échéance.

## 4. Essai de restauration (obligatoire, mensuel)

Sur un **autre** serveur MariaDB (instance d'essai sur le même poste, port 3307, ou un autre poste), avec la clé
**saisie** par le pharmacien (c'est ce qui prouve que la copie gardée hors du serveur fonctionne) :

```
.\6-essai-restauration.ps1 -Base laborex_v1_db -OptionsCible 'C:\ProgramData\Prestige\essai.cnf' -CleSaisie
```

Le script vérifie le HMAC de l'archive (« mauvaise cle ou archive alteree » sinon), déchiffre vers `zstd -dc | mariadb`
sans écrire le clair sur le disque, rejoue les journaux binaires (déchiffrés dans le dossier privé puis supprimés),
compare les ventes du jour (nombre et total) et **consigne** dans la base d'origine : date, résultat (`CONFORME`,
`ECART`, `ECHEC`) et une ligne `ESSAI_RESTAURATION` du journal. L'onglet Sécurité affiche cette date ; passé un mois,
il la signale en orange (`rappelEssai`). `-SansTrace` sur un poste étranger. Sans `-CleSaisie`, la clé du fichier du
serveur est utilisée (essai automatisable) ; si le fichier est absent, la saisie est demandée.

## 5. Si la clé est perdue

Les archives déjà chiffrées sont **illisibles pour tout le monde** (personne n'a de clé de secours : c'est le but de
Q4.3). La base en service n'est pas touchée. Faire aussitôt :

1. `.\7-cle-archive.ps1 -Creer -Remplacer` (nouvelle clé, nouvelle copie papier) ;
2. `.\3-sauvegarde-complete.ps1` et `.\4-copier-journal.ps1` à la main, puis « Sauvegarder maintenant » dans Prestige :
   des archives lisibles existent de nouveau ;
3. les anciennes archives peuvent être supprimées (la rotation s'en charge).

Une clé remplacée alors que l'ancienne est connue : garder l'ancienne copie papier tant que des archives de cette
époque sont conservées (12 mois de rotation).

## 6. Retour arrière

- `KEY_SECURITE_BASE = 0` : la sauvegarde intégrée et les scripts reviennent aux fichiers en clair, sans
  redémarrage. Les archives `.aes` déjà produites restent lisibles avec la clé (`7-cle-archive.ps1 -Dechiffrer`,
  script 6) ; la rotation les retire au fil des jours.
- Redéployer le WAR précédent : les trois paramètres restent sans effet ; une archive `.aes` déjà produite ne serait
  plus **valorisable** par l'écran (ancien code) mais reste déchiffrable par le script 7.
- Le fichier `archive.cnf` peut rester en place : à 0 il n'est pas lu.

## 7. Tests (règle du 05/11)

Cohérence (unitaire, graine fixe) :

- `ArchiveChiffreeCoherenceTest` (Java) : 3 000 contenus de 0 à 1 Mo (autour des multiples de 16, petits, moyens,
  grands), écrits par morceaux de tailles variées ; règle de référence écrite à part : taille exacte, en-tête, sel et IV
  jamais répétés, clair invisible dans l'archive, aller-retour identique, 300 mauvaises clés et 300 altérations d'un
  bit refusées avant tout octet rendu, deux chiffrements du même clair différents, troncature à 6 endroits, fichier
  étranger, 200 000 itérations par défaut, dérivation déterministe, vecteur produit par le module PowerShell lu tel
  quel, clé DPAPI écrite puis relue (messages sans valeur), règles de saisie.
- `outils/officine/tests/test-archive-coherence.ps1` (PowerShell) : 2 000 contenus, mêmes règles, préfixe
  (tête d'archive), passage par une commande dans les deux sens, clé DPAPI, 1 000 clés générées (alphabet, toutes
  différentes), vecteur produit par Prestige (Java) lu tel quel. `-Defaut` simule un déchiffrement qui rend un octet de
  moins : le test échoue (3 lignes rouges).
- `EssaiRestaurationRappelTest` : 5 000 dates (rappel = plus d'un mois), cas limites. `ConservationTest` : noms `.aes`
  et mélange clair / chiffré.

Rapprochement (écran, `src/test/e2e/securite/test-archives-rapprochement.js`) : clé posée par le **vrai script 7**
(fichier DPAPI sans valeur en clair, date `t_parameters` = ligne `CLE_ARCHIVE` du journal = écran = API) ; dernier
essai (`t_parameters` = écran = API, rappel) ; « Sauvegarder maintenant » à 1 : fichier `.sql.gz.aes` du dossier =
`t_sauvegarde.fichier` = historique = onglet Sécurité ; magie `PRSTGA01` ; déchiffré avec la clé captée à l'affichage,
dump complet de **même empreinte** (tables créées, lignes INSERT par table) que la sauvegarde en clair faite à 0 juste
après ; « Valoriser » sur l'archive chiffrée = mêmes totaux que sur l'archive en clair ; instructions de restauration.
`E2E_DEFAUT=1` change la date de la clé en base après l'affichage : le test échoue.

Bilan avant / après (écran, `test-archives-bilan.js`) : une sauvegarde à 1 avec la clé → **un** fichier `.aes` de plus,
aucun `.sql.gz` ni `.partiel`, dossier privé vide, une ligne `t_sauvegarde` (fichier, taille, message vide),
`t_parameters` et `t_securite_journal` identiques ; à 1 sans la clé → un `.sql.gz` en clair avec le message « Archive
NON chiffrée … 7-cle-archive.ps1 -Creer » ; à 0 → un `.sql.gz`, message vide ; `server.log` sans la clé, sans le bloc
DPAPI, sans `password=`. `E2E_DEFAUT=1` dépose un `.partiel` en clair : le test échoue.

## 8. Résultats sur le poste (06/11/2026)

Poste local, Payara `domain3` (port 10090), base d'essai `laborex_audit`, sous le verrou commun `verrou-e2e`
(tests d'écran lancés un par un). Chaque test a d'abord été mis au rouge sur un défaut simulé, puis au vert.

| Test (règle du 05/11) | Rouge d'abord (défaut simulé) | Vert ensuite |
|---|---|---|
| Cohérence Java `ArchiveChiffreeCoherenceTest` (graine 20261106, 3 000 cas : tailles 0 à 70 000, clés, itérations) + `EssaiRestaurationRappelTest` (5 000 dates) + `ConservationTest` | comparaison du HMAC désactivée : 2 échecs | 6 tests Java verts, 3 000 cas ; vecteur PowerShell relu par Java et vecteur Java relu par PowerShell |
| Cohérence PowerShell `tests/test-archive-coherence.ps1` (2 000 cas, même graine) | `-Defaut` : 3 FAIL sur 9 | 9/9 |
| Rapprochement d'écran `test-archives-rapprochement.js` (script 7 → onglet Sécurité → API → `t_parameters`/`t_securite_journal` → fichier ; sauvegarde à 1 déchiffrée avec la clé affichée ; valorisation sur archive chiffrée = sur archive en clair) | `E2E_DEFAUT=1` : 12/13 | 13/13 |
| Bilan avant/après `test-archives-bilan.js` (une sauvegarde à 1 avec clé, à 1 sans clé, à 0 : fichiers, lignes, paramètres, journal, `server.log`) | `E2E_DEFAUT=1` : 7/10 | 10/10 |

Essai réel des scripts (`laborex_audit`, dump de 387 Mo, instance MariaDB jetable sur le port 3307) :

| Étape | Résultat |
|---|---|
| `7-cle-archive.ps1 -Creer` | clé affichée une fois ; fichier DPAPI (en-tête, rien en clair) ; `KEY_SECURITE_CLE_ARCHIVE_DATE` posée ; journal `CLE_ARCHIVE` sans la valeur |
| `-Creer` sur une clé existante sans `-Remplacer` | refusé (code 1) |
| `3-sauvegarde-complete.ps1` à 1 | `laborex_audit-20261106-0352.sql.zst.aes`, 387,1 Mo, 20 s, magie `PRSTGA01`, taille conforme à la formule, aucun fichier en clair, journal « chiffrée (AES) » ; dossier privé vide après |
| `7-cle-archive.ps1 -Dechiffrer` | HMAC vérifié puis 387,1 Mo en clair en 2 s ; `zstd -t` valide ; tête « MariaDB dump » |
| `-Dechiffrer` sans fichier de clé ni console | refusé, rien écrit |
| `4-copier-journal.ps1` à 1 | s'arrête sur « journal binaire inactif » (`log_bin` à 0 sur ce poste : chemin chiffré du journal non exercé ici) |
| `6-essai-restauration.ps1` sur 3307 | « restauration conforme » : 409/409 tables, `t_parameters` 226/226, ventes closes 473 415/473 415 ; 4 113 s ; trace `KEY_SECURITE_DERNIER_ESSAI_RESTAURATION` / `RESULTAT=CONFORME` ; journal `ESSAI_RESTAURATION OK` (chiffrée, HMAC 1 s, clé acceptée) ; ni clé ni mot de passe dans la sortie |
| `3-sauvegarde-complete.ps1` à 0 | `.sql.zst` en clair (magie zstd), journal sans « chiffrée » |
| `-Rotation` | les `.zst` et `.zst.aes` du jour tous gardés |
| Remise en état | paramètres identiques, journal purgé, base 3307 supprimée, fichiers retirés |

Non-régression : lot A `test-securite-base.js` 17/17 ; lot B `test-securite-rapprochement.js` 8/8, `test-securite-bilan.js`
9/9, `test-securite-ecran.js` 23/23 (WAR du lot C). `KEY_SECURITE_BASE` remis à 0, données d'essai retirées.

## 9. Limites

- Le support à distance ne peut plus ouvrir une archive sans la clé du pharmacien (voulu, Q4.3) : une demande
  d'assistance sur une archive passe par le pharmacien, qui déchiffre lui-même (`7-cle-archive.ps1 -Dechiffrer`) ou
  tape sa clé dans le script 6.
- Chiffrement symétrique : la clé est aussi sur le serveur (DPAPI) pour que les sauvegardes se fassent sans
  intervention. Un attaquant qui exécute du code **sur le serveur** avec un compte autorisé peut la lire ; une copie
  des fichiers, du disque ou des archives ne suffit pas.
- RAR : archive en clair dans le dossier privé le temps de la chiffrer (zstd recommandé). L'essai de restauration
  d'une archive `.rar.aes` passe lui aussi par le dossier privé.
- Banc Linux : pas de DPAPI ; fichier de clé en clair (`chmod 600`) accepté par Prestige, scripts Windows seulement.
- Master password de Payara (Q4.4), lot 4.0 et essai de charge sur domain2 : hors de ce lot (voir le rapport).
