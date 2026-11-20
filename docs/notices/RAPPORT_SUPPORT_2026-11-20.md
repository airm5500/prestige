# Journaux du support du 19 et du 20/11/2026 : capitale, appaul, leana, Pontmain

Analyse demandée le 20/11 pour préparer le plan du 19/11. Même méthode que `RAPPORT_SUPPORT_2026-11-18.md` (appaul,
journaux du 18/11), dont les repères R1 à R15 sont repris ici.

## Pièces

| Officine | Pièce | Lignes | Période couverte |
|---|---|---|---|
| capitale | `journal_support_20261119_capitale.xls` (exporté le 19/11 à 21:23) | 153 | 30/10 → 19/11 20:41 |
| appaul | `journal_support_20261119_appaul.xls` (19/11 à 20:49) | 24 | 19/11 07:33 → 20:45 (journal purgé à la main à 07:33, 54 événements) |
| leana | `journal_support_20261120_leana.xls` (20/11 à 00:07) | 324 | 29/09 → 19/11 22:03 |
| Pontmain | `prestige_pontmain.rar` : journal xls (19/11 à 00:23, 80 lignes), 46 fichiers d'événements `support\logs\2026\11`, relevé du gardien | 80 + 46 | 12/11 → 19/11 00:10 |

L'archive de Pontmain a été extraite dans un dossier neuf, hors du dépôt, **sans le dossier `config`** :
`dicisms.properties` et `posos.properties` n'ont été ni extraits ni lus. Aucune base n'a été lue. Les colonnes
« Utilisateur » et « Fil d'Ariane » n'ont servi qu'à repérer le poste. Aucun nom n'est repris ici.

## 1. Le point principal : les correctifs du 19/11 ne sont encore en service nulle part

| Officine | Version vue dans le journal | Comment elle est établie |
|---|---|---|
| appaul | intégration du **16/11** (« 2026-11-16 03:45 UTC ») | colonne « Version », sur toutes les lignes, jusqu'au 19/11 à 20:45 |
| Pontmain | version du **12/11** (« 2026-11-12 05:42 UTC ») | colonne « Version », sur toutes les lignes, jusqu'au 19/11 à 00:10 |
| capitale | **antérieure au 23/10** (suspecté, fort) | pas de colonne « Version » (elle est apparue après le 12/11). Le 19/11 à 18:07, l'erreur `TransientPropertyValueException … lgUSERVENDEURID -> TUser` sur `vente/add/assurance` se produit encore. Elle est corrigée dans le code depuis le 23/10 (`d0c4092ca`). |
| leana | **antérieure au 06/10** (suspecté, fort) | pas de colonne « Version ». Jusqu'au 13/11, une saisie invalide sort encore en 500 (`JsonbException`). Depuis le 06/10, elle donne un refus clair (`SaisieInvalide`). |

Conséquence : aucune anomalie ne peut être dite « disparue grâce aux correctifs du 19/11 » (intégration `76aa5fc1b`).
Dans les tableaux ci-dessous, la colonne **« Dans 76aa5fc1b »** dit donc ce que deviendrait chaque anomalie si cette
intégration était déployée. Elle est établie en lisant le code :

- **corrigé** : le code de `76aa5fc1b` ne peut plus produire l'erreur ;
- **reste** : le défaut est encore dans le code de `76aa5fc1b` ;
- **branche support** : corrigé seulement sur `plan/support-1811`, qui n'est pas fusionnée.

Les correctifs d'appaul du 18/11 (R1 à R15, branche `plan/support-1811`) **ne sont pas dans `76aa5fc1b`**. Une
exception : R1 (réimpression « Imprimante inconnue »), corrigé à part dans l'intégration (`6850bdcee`).

## 2. appaul (version du 16/11, journée du 19/11)

| Anomalie | État depuis le 18/11 | Détail | Dans 76aa5fc1b |
|---|---|---|---|
| R3 — CAISSE44 : base coupée | **revient** | `Communications link failure` sur `ventes-ratees/compteur-jour` (×4) et `anomalies` (×2) ; 500 sur `client/all` (12:23) ; connexions dormantes (×9, 20:05 → 20:45). Les lenteurs de `notifications-centre/compteurs` et `anomalies` tombent aux mêmes minutes (10:32, 19:00) : c'est le même incident. | point d'auto-diagnostic : **branche support**. Le script du pool n'a toujours pas été passé sur CAISSE44 (décision de l'utilisateur). |
| R7 — sauvegarde à l'ouverture | **revient** | requête de 78 s à 08:40 (×6 relevés) | **branche support** (le gardien reconnaît la sauvegarde) ; horaires à déplacer (réglage) |
| R8 — écrans lents | **revient** | `info` ×6, `balancesalecash`, `tvas` ×2, `vente-motifs/recap` ×2 | `tvas` et `vente-motifs/recap` : **branche support** ; `info` et `balancesalecash` : **reste** |
| R9 — SMS Orange | **revient, et s'aggrave** | POL0001 (×10), puis **HTTP_401** (×3, 14:31) et « Forfait SMS Orange expiré » (14:35) | réglage (forfait) |
| R11 — supervision, 1 anomalie | revient | 5 postes (SUPPORT_EMAIL vide) | réglage |
| R13 — purge manuelle | revient | 07:33, 54 événements supprimés : la journée du 18/11 au soir et la veille de 04:15 ne sont plus visibles | — |
| Nouveau — lenteurs isolées | nouveau | `ventestats/suggerer` (14:20), `modereglement/all` (12:40) : une fois chacune | à mesurer |
| R1 impression, R2 `horloge/etat`, R4 double BL, R5 `loadPage`, R6 400 fiche, R10 arrêt | **absents le 19/11** | pas d'occurrence dans la journée. Ce n'est pas l'effet d'un correctif (aucun n'est déployé) : R2 et R6 restent à surveiller. | R1 **corrigé** ; R2, R4, R5, R6 **branche support** |

Rien sur les ventes, le stock ou la caisse en dehors de CAISSE44.

## 3. Pontmain (version du 12/11, première analyse)

Organisation lue dans les journaux : un SERVEUR, deux caisses (Caisse2, Caisse3), un poste BROU-APPIA.

| # | Anomalie | Gravité | Détail | Cause | Dans 76aa5fc1b |
|---|---|---|---|---|---|
| PM1 | **Arrêts brutaux** très nombreux | **Élevée** | 13/11 → 18/11 : 18 sur Caisse3, 16 sur le SERVEUR, 10 sur Caisse2. Les 14/11 à 07:28, 09:48 et 10:16, les trois postes tombent **à la même minute**. Le 18/11, Caisse3 s’arrête 7 fois entre 09:26 et 19:08 (1 à 3 min). « MariaDB ne répond pas » sur le SERVEUR le 18/11 à 07:44. | Coupures de courant : **confirmé** pour les arrêts simultanés (le gardien les classe ainsi). Caisse3 le 18/11 : alimentation ou machine du poste, **suspecté**. Le soir, sur le SERVEUR, « arrêt forcé sans erreur visible » : extinction sans arrêt propre du service, **suspecté**. | matériel (onduleur) |
| PM2 | **Mémoire de Java à 512 Mo** sur les caisses | **Élevée** | `OutOfMemoryError` sur `ecrans/scripts.js`, BROU-APPIA, 13/11 15:18 → 16:01 (×4, FATAL) ; mémoire à 85–95 % sur Caisse2, Caisse3 et BROU-APPIA (16/11 → 18/11) ; auto-diagnostic `MEMOIRE_MAX` en anomalie sur Caisse2 et Caisse3 | **Confirmé** par l'auto-diagnostic. Le SERVEUR est passé à 3 072 Mo (relevé du gardien, 18/11 23:56), mais pas les caisses. | réglage (`-Xmx` des caisses) |
| PM3 | **« Job planifié en retard »** toutes les heures | Moyenne (bruit : 24 alertes ERROR par jour) | Purge de 03:45 et veille de 04:15 : alertes « dernier passage il y a 30 h » de 10:10 à 23:10 le 18/11, et aussi le 16/11 et le 17/11. Même chose à leana le 18/11 (×15 et ×12). | **Confirmé** par lecture du code (`SupportNightlyCatchUp`, `SupportJobMonitor`). Le serveur est éteint la nuit. Au démarrage (07:30), le rattrapage ne part que si le dernier passage date de plus de 30 h ; or il n'a que 27 h. Le moniteur horaire signale le retard dès que les 30 h sont dépassées, à 10:10. Il n'y a pas d'autre rattrapage avant le démarrage suivant, si bien que le travail ne se fait qu'un jour sur deux. | **reste** |
| PM4 | **Création et validation de BL bloquées** 23 à 32 s | Moyenne | `commande/creerbl` (blocage 32 s) et `validerbl` (23 s), 13/11 vers 23:40, par le compte d'administration | Pour chaque ligne, `creerBonLivraison` lit le stock (`getTProductItemStock`), et chaque lecture vide d'abord toute la session Hibernate (photographie des fils). Le temps croît donc avec le carré du nombre de lignes. **Confirmé** par la trace. | **reste** (`OrderServiceImpl`, ligne 153) |
| PM5 | Connexions dormantes sur Caisse3 | Moyenne | 17/11 (×5) et 18/11 (×8), le soir | même cas que R3 d'appaul | **branche support** (point de contrôle du pool) |
| PM6 | Commandes sans ligne | Faible | 2 commandes `13122026_0000x` en cours, depuis le 15/11. La référence porte la date du **13/12/2026**. | Poste réglé à une mauvaise date au moment de la création : **suspecté**. | à vérifier sur place |
| PM7 | Prix décimal refusé dans la vente | Faible | `vente/update/item/vno` : 400 « un nombre entier est attendu » (17/11) | Le refus est clair (version du 12/11), mais le champ accepte la saisie d'un décimal. | **reste** (contrôle à la saisie) |
| PM8 | SMS Orange | Moyenne | POL0001 (×13), suspensions (×5), HTTP_401 (18/11) | comme à appaul | réglage (forfait) |
| PM9 | État de contrôle des bons lent | Faible | `etat-control-bon/list`, 14 et 15/11 (×5) | liste chargée avec tout le détail | **corrigé** (`1ebf3025c`) |
| PM10 | Supervision : 1 anomalie | Faible | SUPPORT_EMAIL vide | — | réglage |

## 4. leana (version antérieure au 06/10, première analyse)

Seuls les événements actifs depuis le 12/11 sont détaillés. Les plus anciens sont des erreurs de l'ancienne version qui
ne se reproduisent plus.

| # | Anomalie | État | Détail | Dans 76aa5fc1b |
|---|---|---|---|---|
| LE1 | **Disque D: plein** | **réglé depuis**, à surveiller | « 3 Mo libres sur D:\ » le 17/11 de 09:40 à 12:00 (×29, journaux et dossier du support), puis plus rien | réglage ; vérifier sur place ce qui a rempli le disque (les sauvegardes ?) |
| LE2 | Arrêts brutaux | revient | le 13/11, 11 alertes de redémarrage entre 10:14 et 18:19 (arrêts de 1 à 9 min) ; le 17/11, 4 ; le 18/11, 4, dont un à 14:42 vu de DESKTOP-ODORH7G (`ConnectException`) | matériel ou extinction |
| LE3 | « Job planifié en retard » | nouveau (18/11) | ×15 et ×12 | **reste** (PM3) |
| LE4 | `ventestats` : **blocage de 335 s** | revient | 134 blocages jusqu'au 13/11, puis 74 lenteurs jusqu'au 19/11 à 03:52 | à mesurer (non traité au 18/11) |
| LE5 | Comparaison des articles en Excel | revient | 66 blocages (32 s et plus) et 14 lenteurs, jusqu'au 16/11 | à mesurer |
| LE6 | Clôture de vente lente et clôture demandée deux fois | revient | CAISSE3 : 12 clôtures lentes (dernière le 19/11 à 08:00) et 4 doubles clôtures (dernière le 18/11 à 18:17) | double clic : **corrigé** (roue d'attente sur les boutons, `21eccb13f`) ; lenteur : à mesurer |
| LE7 | `loadPage` sur une liste détruite | **revient** (19/11 18:00, CAISSE3) | même erreur que R5 d'appaul | **branche support** (R5) |
| LE8 | **Basculement des zones géographiques : `this.majCompteCoches is not a function`** | **nouveau** (19/11 20:47) | `basculement.js` | **reste**, **confirmé** par lecture : l'écouteur `checkChange: this.onCheckChange` n'a pas de `scope`. `this` y est donc la colonne, si bien que chaque case cochée lève l'erreur et que le compteur des cases cochées n'est pas mis à jour. |
| LE9 | Inventaires : `Me.rechargerAvecFiltres is not a function` | revient (16/11) | `InventaireManager.js` | **reste**, **suspecté** : `Me` est une variable globale qu'un autre écran ouvert ensuite peut écraser |
| LE10 | `valheight is not defined` (menu principal, réserve) | revient (18/11, DESKTOP-ODORH7G) | `MainMenuManager.js`, `ReserveManager.js` | **reste**, **suspecté** : la variable globale est définie dans `Navigation.js`, qui n'est pas chargé à l'ouverture directe de ces écrans |
| LE11 | Vente en dépôt : `form is undefined` (×33) et `isValid` sur une valeur indéfinie (×2) ; vente : `data is null` (×2) | revient (18/11) | `VenteEnDepotCtr.js:3418`, `VenteCtr.js:2223` | à reproduire sur `76aa5fc1b` (les numéros de ligne ont changé) |
| LE12 | Prix décimal dans la vente | revient (13/11) | `JsonbException`, 500 (×11) | 500 : **corrigé** (refus clair) ; saisie : **reste** (PM7) |
| LE13 | Lenteurs au démarrage d'un poste | revient (18/11) | `suggestion-reserve/en-attente/count` (×38), `fichearticle/perimes/count` (×35), `ventes-ratees/compteur-jour` (×31) : toutes à la même seconde, à l'ouverture de DESKTOP-ODORH7G | à mesurer |
| LE14 | SMS | revient | SVC0004 (×10, numéro refusé), POL0001 (×34), suspensions (×76) | réglage |
| LE15 | Recherche d'un article par un libellé collé ou un QR code | revient | `vente/findone/<texte>` en 404 (WARN) | bruit, sans effet pour la vente |

## 5. capitale (version antérieure au 23/10, première analyse)

| # | Anomalie | État | Détail | Dans 76aa5fc1b |
|---|---|---|---|---|
| CA1 | **Vente assurance refusée** (`TransientPropertyValueException`, vendeur tapé sans être choisi) | revient (19/11 18:07, CAISSE31) | ×9 depuis le 02/11, 500 sur `vente/add/assurance` | **corrigé** (`d0c4092ca`, 23/10) |
| CA2 | **Ticket Z lent et bloqué** | revient (19/11 00:20) | `caisse/tickez` (×16) et `fetch-tickez` (×25) lents ; blocages de 21 à 25 s (×5, dernier le 18/11) | à mesurer |
| CA3 | Interblocage à la déconnexion | **nouveau** (depuis le 15/11) | `Deadlock found` sur `user/logout` (×4, dernier le 19/11 à 18:42) | **suspecté** ; à reproduire sur `76aa5fc1b` |
| CA4 | Saisies invalides en 500 | revient | `vente/add/item` (×3, 18/11), `vente/net/assurance` (17/11), `billetage/cloture` (×7, 16/11), `caisse/ouvrir-caisse` (16/11), `checked-quantities` (×2) | 500 : **corrigé** (refus clair depuis le 06/10) ; contrôle à la saisie : **reste** |
| CA5 | Suivi d'un article : `NullPointerException` | revient (18/11) | `produit/monitoringproduct` sans période (×15) | **corrigé** (« période manquante ») |
| CA6 | Clôture de caisse : « résumé de caisse introuvable » | revient (16/11) | `billetage/cloture-data` pour une caissière sans caisse ouverte | à vérifier |
| CA7 | Erreurs d'écran de la vente à crédit (`UpdateVenteClientTpForm`) | revient (18/11) | `getData() is null`, `tpRecord.data is undefined`, `strFIRSTNAME` ; `VenteCtr` : `getCurrent() is null` (17/11) | à reproduire sur `76aa5fc1b` |
| CA8 | « Redémarrage inattendu » chaque matin | revient | une à trois alertes par jour, de 213 à 667 min d'arrêt (extinction le soir) | le message est plus précis depuis le 12/11 (cause donnée, voir Pontmain) ; l'arrêt du soir reste signalé |
| CA9 | Veille de cohérence | revient | **221 lots périmés non marqués**, 500 commandes sans ligne, 10 dossiers de règlement sans détail, 4 ventes terminées sans mouvement de caisse, photographie de stock manquante | à analyser : le traitement des périmés ne tourne peut-être pas (serveur éteint à l'heure prévue) |
| CA10 | Recherche d'un article par un QR code | revient | ×20, sans effet pour la vente | bruit |
| CA11 | SMS | revient | suspensions (×64), POL0001 (×33) | réglage |
| CA12 | Base coupée vue d'une caisse | **disparu depuis le 13/11** | `Communications link failure` sur CAISSE4 (×5, jusqu'au 13/11) | — |

## 6. Ce que l'on retrouve d'une officine à l'autre

| Sujet | appaul | Pontmain | leana | capitale |
|---|---|---|---|---|
| Arrêts brutaux ou extinction sans arrêt propre | R10 (16/11) | PM1 (courant) | LE2 | CA8 |
| Connexions mortes ou dormantes | R3 (CAISSE44) | PM5 (Caisse3) | — | CA12 (jusqu'au 13/11) |
| « Job en retard » quand le serveur est éteint la nuit | — | PM3 | LE3 | — |
| `loadPage` sur une liste détruite | R5 | — | LE7 | — |
| Montant décimal accepté par l'écran puis refusé | — | PM7 | LE12 | CA4 |
| SMS Orange (forfait expiré) | R9 | PM8 | LE14 | CA11 |
| SUPPORT_EMAIL vide | R11 | PM10 | oui | oui |

## 7. Éléments proposés pour le plan

Dans l'ordre recommandé. La règle de CLAUDE.md s'applique à chacun : un test qui échoue d'abord, un rapprochement, une
cohérence et un bilan.

| Ordre | Élément | Officines | Taille |
|---|---|---|---|
| 0 | **Déployer** `76aa5fc1b` (ou la prochaine intégration) à capitale, leana et Pontmain, et fusionner `plan/support-1811` avant : à décider. Cela règle CA1, CA4, CA5, PM9, LE6 (double clic), LE12 (500), R1, puis R2 à R8. | toutes | — |
| 1 | **PM3** : rattraper la purge et la veille dès que l'heure prévue du jour est passée sans exécution (et non plus après 30 h), et ne pas signaler de retard pendant que le rattrapage est attendu | Pontmain, leana | S |
| 2 | **PM2** : `-Xmx` des caisses de Pontmain ; un point d'auto-diagnostic existe déjà | Pontmain | réglage |
| 3 | **LE8** : `scope` de l'écouteur du basculement des zones | leana (tous) | XS |
| 4 | **PM4** : création du BL sans vidage de la session à chaque ligne (lecture du stock en une requête, ou vidage seulement à la validation) | Pontmain (tous) | S |
| 5 | **PM7, LE12, CA4** : refus des décimaux et des valeurs hors limites dès la saisie (prix, quantités, billetage, ouverture de caisse) | toutes | S |
| 6 | **LE9, LE10** : retirer les variables globales `Me` et `valheight` des écrans de l'inventaire, du menu et de la réserve | leana (tous) | S |
| 7 | **CA3** : interblocage à la déconnexion, à reproduire | capitale | M |
| 8 | **CA2, LE4, LE5, LE13** : ticket Z, `ventestats`, comparaison Excel, compteurs à l'ouverture d'un poste : mesures sur le banc peuplé | capitale, leana | M |
| 9 | **CA7, LE11** : erreurs d'écran de la vente à crédit et de la vente en dépôt, à reproduire sur `76aa5fc1b` | capitale, leana | M |
| 10 | **CA9** : 221 lots périmés non marqués : vérifier le traitement des périmés et son rattrapage | capitale | S |

**Décisions qui reviennent à l'utilisateur, sans code** :

- onduleur, ou alimentation de Caisse3, à Pontmain (PM1) ;
- arrêt propre du service avant l'extinction du soir (toutes les officines) ;
- script du pool sur CAISSE44 (appaul) et Caisse3 (Pontmain) ;
- forfait Orange (toutes les officines) ; `SUPPORT_EMAIL` ;
- horaires des sauvegardes hors ouverture (appaul) ; cause du disque plein à leana ;
- date de la machine qui a créé les commandes `13122026_*` (Pontmain).

## 8. Méthode

- Les quatre journaux xls ont été lus ligne par ligne : date, niveau, module, message, écran, poste. Les traces ont été
  lues pour les erreurs du serveur.
- Les 46 fichiers d'événements de Pontmain ont été relevés un par un. Les deux photographies de fils (BL) ont été lues.
- La version en service a été déduite de la colonne « Version » quand elle existe. Sinon, elle a été déduite d'erreurs
  corrigées à une date connue.
- Chaque anomalie a été cherchée dans le code de `76aa5fc1b`. Une anomalie est « confirmée » quand une trace ou la
  lecture du code la prouve ; sinon, elle est « suspectée ». Aucune n'a encore été reproduite par un test.
- Aucune base n'a été lue ni écrite. Aucun fichier de configuration de Pontmain n'a été extrait.
