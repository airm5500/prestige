# Configuration du serveur de l'officine

Ces scripts appliquent les réglages proposés par [RAPPORT_CHARGE_2026-10-29.md](../../docs/notices/RAPPORT_CHARGE_2026-10-29.md)
(§ 4.1, 5.3 et 6). Ils sont écrits pour Windows PowerShell 5.1 et se lancent en administrateur, sur le serveur.

Règles communes :
- chaque script **lit d'abord l'état** et l'affiche, et `-Lire` s'arrête là ;
- chaque script peut être **relancé sans risque** : une valeur déjà posée est remplacée, jamais dupliquée ;
- **aucun mot de passe** n'est écrit dans les scripts, affiché ou journalisé. Le compte de sauvegarde lit le sien dans
  un fichier d'options que seuls SYSTEM et les administrateurs peuvent lire.

## Ordre d'application

| Étape | Script | Quand | Effet sur les caisses |
|---|---|---|---|
| 1 | `1-configurer-payara.ps1 -Redemarrer` | hors des heures d'ouverture | Payara redémarre (1 à 2 min) |
| 2 | `2-configurer-mariadb.ps1 -CreerCompte -DossierJournal E:\mariadb-journal -Redemarrer` | hors des heures d'ouverture | MariaDB redémarre (quelques secondes) |
| 3 | `3-sauvegarde-complete.ps1 -Destination D:\SAUVEGARDE_JOURNALIERE -CopieVers E:\Sauvegardes` | une fois à la main, pour vérifier | aucun (§ 3.2 du rapport) |
| 4 | `4-copier-journal.ps1 -CopieVers E:\Sauvegardes\journal-binaire` | une fois à la main, pour vérifier | aucun |
| 5 | `5-planifier.ps1 -CopieVers E:\Sauvegardes` | une fois | aucun |
| 6 | désactiver l'ancienne tâche `SAUVEGARDE_COMPRESSION.bat`, que `5-planifier.ps1` signale | après une journée de sauvegardes vérifiées | aucun |
| 7 | `6-essai-restauration.ps1 -Base laborex_v1_db -OptionsCible <instance d'essai>` | chaque mois | aucun (autre serveur) |
| 8 | `7-service-payara.ps1 -Installer`, sur le serveur **et sur chaque caisse qui a son propre Payara** | hors des heures d'ouverture | Payara redémarre en service Windows, puis démarre avec le PC |
| 9 | `8-lanceur-caisse.ps1 -CreerRaccourci`, sur chaque caisse (`-Url http://serveur:8080/prestige` si Prestige est sur un autre poste) | une fois | le raccourci « Prestige » remplace l'ancien |
| 10 | `9-tache-heure.ps1`, sur le serveur qui a Payara (en administrateur) | une fois | aucun : le bouton « Mettre à jour » de la fenêtre de blocage de l'heure fonctionne ensuite sans droits d'administrateur |

**`7-service-payara.ps1`** (rapport d'exploitation du 13/11, point 4) : sans option, il affiche seulement l'état
(service, démarrage automatique, relance si arrêt). `-Installer` crée le service (`asadmin create-service`), le règle en
démarrage automatique avec relance une minute après un arrêt, arrête le domaine lancé à la main et démarre le service.
`-Retirer` revient au lancement à la main. Payara est ainsi prêt avant l'arrivée de la caissière ; si elle se connecte
pendant le préchauffage, la page de connexion affiche « Démarrage en cours » et sa connexion part dès qu'il est fini.

**`8-lanceur-caisse.ps1`** (retour du 16/11) : Windows affiche le service « en cours d'exécution » bien avant que
Prestige soit prêt. Le lanceur ouvre la caisse tout de suite si Prestige est prêt ; sinon il affiche « Prestige
démarre » avec l'étape en cours et ouvre la caisse dès que `api/v1/app/info` dit « prêt ». Si rien ne répond et que
Prestige tourne sur ce poste, il démarre le service, ou lance Payara lui-même (`asadmin start-domain`) quand il n'y a
pas de service ou que Windows refuse ; il ne démarre jamais le serveur d'un autre poste. Au bout de 10 min, il propose
« Réessayer ». Essai : `essais/essai-lanceur-caisse.py` (faux serveur, 10 cas, aucun vrai Payara lancé).

**`9-tache-heure.ps1`** (cahier des charges du 24/11) : Prestige se bloque quand l'heure du serveur est fausse. Le bouton « Mettre à jour » ne peut pas remettre l'heure lui-même (Payara n'a pas les droits d'administrateur) : il déclenche la tâche Windows « Prestige - Heure », créée une fois par ce script et exécutée par SYSTEM (`w32tm /resync /force`). Les utilisateurs du poste peuvent seulement la lancer, ni la modifier ni la supprimer. Le script règle aussi le service de temps en démarrage automatique et lève ses limites de correction (sinon Windows refuse de corriger une horloge partie en 2189). `-Lire` affiche l'état sans rien changer, `-Retirer` supprime la tâche, `-Annuler -MaxPos 54000 -MaxNeg 54000` remet les limites relevées par `-Lire`. Si la tâche est absente, la fenêtre de blocage le dit et renvoie à l'administrateur.

`E:\` désigne ici un **autre disque** que celui de la base (second disque, clé USB, NAS) : une panne du disque de la
base ne doit pas emporter ses sauvegardes.

## Ce que règle chaque script

**`1-configurer-payara.ps1`**
- Fils HTTP : 32 au plus, 8 au minimum.
- Mémoire Java : `-Xmx`, 4 Go par défaut, ou `-Xmx 6g` sur un serveur de 16 Go.
- Diagnostic : image de la mémoire si elle sature, et journal du ramasse-miettes.
- Pool `laborex_pool` : les connexions sont vérifiées avant emploi.
- Sur demande seulement :
  - `-DelaisJdbc` : délai de requête de 300 s, et reprise des connexions oubliées après 120 s. À ne poser que si
    aucun état ne dure plus longtemps. La suggestion depuis l'analyse tiers payant tient désormais en 21 s, mais
    `creerSuggestionArticlesVendus` n'est pas encore mesurée ;
  - `-ArretSurSaturation` : arrêt de Payara si la mémoire sature. Le script refuse cette option tant que Payara ne
    tourne pas en service Windows à redémarrage automatique.
- `-Annuler` : retour aux valeurs d'origine.

**`2-configurer-mariadb.ps1`**
- Journal binaire dans `my.ini` (`log_bin`, `binlog_format=ROW`, `expire_logs_days=8`, `sync_binlog=1`) et mémoire
  InnoDB (6 Go par défaut, `-SansMemoire` pour ne pas y toucher).
- Une copie datée de `my.ini` est faite avant toute modification.
- `-CreerCompte` crée le compte `prestige_sauvegarde`, qui n'a que les droits de lecture, de sauvegarde et de journal.
  Son mot de passe est tiré au hasard et n'est jamais affiché ; le mot de passe root est saisi de façon masquée et
  n'est gardé nulle part.

**`3-sauvegarde-complete.ps1`**
- Elle remplace `SAUVEGARDE_COMPRESSION.bat` :
  - `--single-transaction`, donc aucun verrou ;
  - compression à la volée, avec zstd s'il est installé, sinon RAR : aucun `.sql` intermédiaire ;
  - position du journal notée en tête du fichier ;
  - copie hors de la machine ;
  - rotation : tout sur 7 jours, puis 1 sauvegarde par semaine sur 4 semaines et 1 par mois sur 12 mois.
- En cas d'échec : code de sortie 1, l'archive incomplète est supprimée et le message est écrit dans `sauvegarde.log`.

**`4-copier-journal.ps1`**
- Toutes les heures, il ferme le fichier de journal en cours puis copie les fichiers fermés.
- Avec la dernière sauvegarde complète, ces copies permettent de tout rejouer jusqu'à la dernière heure : c'est ce
  qui tient l'objectif d'une heure de perte au plus.

**`5-planifier.ps1`**
- Il crée deux tâches qui tournent sous SYSTEM :
  - la sauvegarde complète à 6 h 30 et 21 h 30, hors des heures d'ouverture (`-Heures` pour changer ces heures ;
    une sauvegarde pendant les ventes ralentit toutes les caisses, retour du 18/11) ;
  - la copie du journal toutes les heures.
- `-Retirer` supprime les deux tâches.

**`6-essai-restauration.ps1`**
- Il recharge la dernière sauvegarde sur un autre serveur MariaDB, rejoue le journal jusqu'à `-Jusqua`, puis compare
  avec la base d'origine les ventes terminées du jour (nombre et total).
- Il refuse si le serveur cible est le serveur d'origine, ou si la base cible existe déjà (sauf `-Remplacer`).

## Essais faits le 29/10 (poste de développement)

| Script | Essai | Résultat |
|---|---|---|
| 1 | `-Lire` sur domain1, puis application deux fois de suite, redémarrage et `-Annuler` sur domain2 (domaine d'essai) | réglages posés sans doublon ; domain2 redémarre et Prestige répond ; le journal du ramasse-miettes est écrit ; la vérification du pool passe (`ping-connection-pool`) ; domain2 remis à 5 fils et `-Xmx3g` |
| 2 | sur une copie de `my.ini`, deux fois de suite | 6 clés posées dans `[mysqld]`, copie de l'ancien fichier ; la relance ne change rien |
| 3, 4, 6 | deux instances MariaDB jetables (ports 3317 et 3318) : sauvegarde de A, vente ajoutée, copie du journal, restauration sur B | B retrouve les 3 ventes et le total de A, la vente ajoutée après la sauvegarde complète comprise (rejouée depuis le journal) ; refus si cible = origine, refus si la base existe déjà |
| 3 | mauvais compte, base absente, rotation sur 400 jours de faux fichiers | échec signalé (code 1, archive supprimée) ; 28 fichiers gardés sur 800, ceux d'une autre base intouchés |

Non essayé ici :
- `-CreerCompte` avec la saisie masquée du mot de passe root : le poste de test n'a pas de console. Les mêmes ordres
  SQL ont été passés à la main sur les instances jetables ;
- l'enregistrement des tâches de `5-planifier.ps1`, qui demande les droits d'administrateur. Seule la construction des
  déclencheurs a été vérifiée ;
- la compression zstd, absente du poste : c'est la voie RAR qui a été essayée.
