# Rapport — lenteurs chez appaul (journal de support du 12/11/2026)

**Pièces** : archive de journaux du 12/11 et journal de support `journal_support_20261112.xls`.
**Écrans signalés** : la fiche article et la balance vente caisse. D'autres écrans lents ressortent des journaux.
**Banc** : une copie locale de la base d'appaul (`appaul_perf`, 20 Go, données jusqu'au 27/10/2026), sur une instance
MariaDB à part (port 3307) et un Payara à part (domain4, port 11090). **Aucune écriture n'a été faite dans la base de
l'officine ni dans `laborex_v1_db`.**

## 1. Ce qu'il faut retenir

| Écran / route | Chez appaul (journal) | Copie locale, avant | Copie locale, après | Cause | État |
|---|---|---|---|---|---|
| `ca-all` (1 jour, applications mobile / ERP) | 7,97 s | 3,8 à 6,6 s | **0,02 s** | filtre `DATE(colonne)` : l'index de date n'est pas utilisé, 3 ans relus | **confirmé, corrigé** |
| `ws/ca-achats-ventes` (11 jours) | 8,1 s | 4,8 s | **0,45 s** | même cause, sur les ventes et sur les BL | **confirmé, corrigé** |
| « Détail sur l'article » | 10,5 s + 10,4 s | 0,1 à 0,2 s + 0,02 s | une seule demande | la fenêtre calculait la fiche deux fois (`produits/{id}`, puis `fiche?produitId=`) | double calcul **confirmé, corrigé** ; les 10 s **suspectées** (sauvegardes, § 3) |
| Liste des articles, touche Entrée | — | 2 recherches | **1 recherche** | Entrée lance la recherche, puis la pause de frappe la relance | **confirmé, corrigé** |
| Sauvegardes automatiques | 15 échecs de 23:05 à 01:05 ; requêtes de 10 à 52 s | — | une seule sauvegarde, sur le serveur, aux horaires choisis | chaque poste (Payara) lançait sa sauvegarde à hh:05 et marquait « interrompues » celles des autres | **confirmé, corrigé** |
| Balance vente caisse, 1 mois | (signalée lente) | 1,0 s seule ; **4,2 à 5,0 s** juste après le tableau de bord | inchangé | mémoire tampon de MariaDB trop petite : le tableau de bord en chasse les ventes du mois | **confirmé, non corrigé** (réglage du serveur, § 5) |
| Tableau de bord (`alertes`, `tuiles`) | 10,6 s et 7,1 s à 22:04 | alertes 1,9 à 6,6 s ; tuiles 0,3 à 3 s | inchangé | ruptures calculées deux fois ; « non vendus » relit tout l'historique ; démarrage plus contrôle de cohérence de 22:00 | **non corrigé** (pistes, § 5) |
| Connexion (`POST user/auth`) | > 5 s à 01:16 | rapide | — | en même temps que les sauvegardes en échec | **suspecté** |

Demande de l'utilisateur, traitée ici (§ 3) : « la sauvegarde doit se faire uniquement sur le serveur pas sur chaque
poste, je dois pouvoir definir les horaires plutot que chaque heure ».

## 2. Ce que montrent les pièces

- **Organisation** : chaque poste (SERVEUR, CAISSE11 à CAISSE44, DESKTOP-CEPK07B, SERVEURLENOVO) a **son propre
  Payara**, branché sur la base centrale du serveur.
- **Sauvegardes** : « Sauvegarde de la base en échec » 15 fois entre 23:05 et 01:05. Les requêtes de plus de 10 s (29
  entre 00:05 et 01:15, 14 entre 22:15 et 23:15) sont des sauvegardes : `SELECT /*!40001 SQL_NO_CACHE */ … FROM
  t_outboud_message`.
- **Fiche article** : à 00:50, `produit-search/produits/{id}` prend 10,5 s, puis `produit-search/fiche?produitId=`
  10,4 s pour le **même article**. Ces deux demandes se succèdent en pleine série de sauvegardes.
- **Tableau de bord** : 22:04, juste après le démarrage de 21:54 et pendant le contrôle de cohérence de 22:00.
- Les fichiers COMMANDE, FACTURATION, INVENTAIRE, REGLEMENT et STOCK de l'archive sont des contrôles de cohérence,
  sans rapport avec les lenteurs.
- Aucune colonne nominative (clients, ayants droit, ordonnances) n'a été lue.

## 3. Sauvegardes : une seule, sur le serveur, aux horaires choisis

**Défaut (confirmé par le code, puis par un test qui échoue)**

- Tous les Payara de l'officine avaient la sauvegarde automatique : **chaque poste** lançait un dump de la base centrale
  à hh:05, par le réseau.
- Le verrou « sauvegarde en cours » ne valait **que dans un Payara**.
- En démarrant, chaque poste passait à `INTERROMPUE` toutes les sauvegardes `EN_COURS`, y compris celles des autres
  postes.

Il en résulte jusqu'à 7 dumps simultanés de 20 Go, des échecs en chaîne, et des requêtes de 10 à 52 s pour tous les
écrans.

**Correction**

| | Avant | Après |
|---|---|---|
| Qui sauvegarde | chaque poste | **le serveur seul** : le poste dont la base est locale (localhost, 127.x, ::1, son nom ou une de ses adresses). Le paramètre `KEY_SAUVEGARDE_POSTE` permet de désigner un autre poste. |
| Quand | toutes les heures à hh:05 | **horaires au choix**, `KEY_SAUVEGARDE_HORAIRES` (ex. « 12:00, 20:00 » ; « 12h » et « 8h30 » sont acceptés ; minutes par pas de 5). Vide : toutes les heures à hh:05, comme avant. |
| Verrou | dans un Payara | **dans la base** (`GET_LOCK`, un par base) : « Sauvegarder maintenant » est refusé si une sauvegarde est en cours ailleurs |
| Sauvegarde d'un autre poste | marquée « interrompue » | laissée telle quelle |
| Contrôle de fraîcheur (alerte « pas de sauvegarde récente ») | par rapport à 2 h | par rapport au **dernier horaire prévu**, et sur le serveur seulement |

**Écran** : Support › Serveur, bloc Sauvegarde.
- Nouveaux champs : « Horaires » et « Poste serveur ». Un horaire impossible (12:07) est refusé dans la barre d'état,
  sans fenêtre.
- L'état affiche les horaires, la prochaine sauvegarde, « Ce poste : X », « serveur des sauvegardes » ou « poste
  client », et « Sauvegarde en cours sur un autre poste… ».
- Sur un poste client, « Sauvegarder maintenant » est grisé.

**À faire chez appaul** : saisir les horaires voulus sur le serveur. Si son Payara atteint la base par une adresse qui
n'est pas la sienne, renseigner « Poste serveur » = `SERVEUR`. Demander aussi les lignes de `t_sauvegarde` (statut,
message, durée, poste) : elles ne contiennent aucune donnée de patient.

**Lien avec la fiche lente : suspecté, non reproduit.** Cinq dumps simultanés sur la copie locale (SSD, sortie
vers nulle part) ralentissent peu les écrans. Chez appaul, les dumps des caisses passent par le réseau et écrivent sur
les disques des postes. Cela reste l'explication la plus probable des 10 s (fiche) et des 5 s (connexion), mais elle
n'est pas prouvée.

## 4. Autres corrections

**`ca-all`, `ca-comptant`, `ws/ca-achats-ventes`** (`ErpServiceImpl`) : `DATE(m.mvtdate) BETWEEN ?1 AND ?2` devient
`m.mvtdate BETWEEN ?1 AND ?2` (la colonne `mvtdate` est déjà une date). Pour `dt_UPDATED` et `dt_CREATED`, le filtre
devient `>= début AND < lendemain de la fin`. SQL : `ca-all` passe de 8,35 s + 0,9 s à 0,005 s + 0,009 s ;
`ca-achats-ventes` de 5,87 s à 0,43 s. Les résultats sont identiques (voir les tests).

**Fiche article** (`detailArticle.js`, `FamilleManager.js`) : « Détail sur l'article » reprend la fiche déjà reçue
par `produits/{id}` au lieu de la redemander par `fiche?produitId=` (même calcul, `buildProduitData`). Les autres
ouvertures de la fenêtre ne changent pas.

**Liste des articles** (`FamilleManager.js`) : la pause de frappe ne relance plus la recherche si les critères sont
exactement ceux de la dernière liste demandée. Chaque recherche recalcule 20 fiches.

## 5. Ce qui reste (non corrigé, à décider)

1. **Balance vente caisse sur un mois : mémoire de MariaDB.** Seule, elle prend 1,0 s (100 requêtes). Juste après le
   tableau de bord, elle prend 4,2 à 5,0 s, et 8 à 13 s quand la machine est chargée. Le tableau de bord parcourt de
   grosses tables et chasse les ventes du mois de la mémoire tampon (2 Go sur le banc pour 20 Go de base). À froid,
   la requête principale prend 6,4 s, la TVA 3,0 s et les règlements 2,0 s : les ventes du mois sont lues trois fois.
   **Piste** : demander la valeur de `innodb_buffer_pool_size` et la mémoire du serveur d'appaul. Côté code, on
   pourrait faire un seul passage sur les ventes du mois.
2. **Tableau de bord.**
   - La requête des ruptures (2,4 s) est exécutée deux fois, une par les tuiles et une par les alertes : on pourrait la
     partager.
   - « Non vendus » prend 6,4 s à froid. La réécriture en LEFT JOIN a été essayée : plus lente (3,1 s), abandonnée.
   - Le contrôle de cohérence de 22:00 pourrait être décalé hors des heures d'ouverture.

## 6. Tests

Tous les tests d'écran ont été lancés un par un, sous le verrou `verrou-e2e`, sur domain4 (copie `appaul_perf`).
Chaque nouveau test a **d'abord échoué sur la version d'avant**.

| Test | Type | Avant | Après |
|---|---|---|---|
| `src/test/e2e/retours/test-detail-article-un-seul-calcul.js` | rapprochement + écran | 15/23 (2 demandes de fiche, 2 recherches) | **23/23** |
| `src/test/e2e/support/test-sauvegarde-serveur-horaires.js` | écran + bilan | 4/18 (sauvegarde de l'autre poste marquée « interrompue ») | **16/16** |
| `src/test/e2e/perf/test-erp-dates-indexees.js` | rapprochement + durée | 40/42 (durées 4,0 s et 4,4 s) | **42/42** |
| `HorairesSauvegardeTest` | cohérence (3 000 cas, graine 20261112) | classe absente | **5/5** |
| `PosteSauvegardeTest` | règle du poste serveur | classe absente | **3/3** |
| `ConservationTest`, `PoolMariaDbTest` | non-régression | 3/3, 3/3 | 3/3, 3/3 |

**Endroits où la donnée apparaît, et test de rapprochement qui les compare**

- **Fiche article** : `produits/{id}`, `fiche?produitId=` et les champs de la fenêtre (CIP, désignation, stock,
  dernière vente, dernière entrée, livraison, inventaire). Test : `test-detail-article-un-seul-calcul.js`, champ par
  champ (66 à 71 champs). Jeu de 9 articles variés : le plus vendu, 6 au hasard, un jamais vendu, un déconditionné.
  Quatre d'entre eux sont aussi vérifiés à l'écran.
- **CA** : `ca-all`, `ca-comptant`, `ca-achats-ventes`, comparés à la base calculée par la **formule d'origine**
  (`DATE(colonne) BETWEEN`). Champs : crédit, remise, TVA, espèces, ventes, achats. Test :
  `test-erp-dates-indexees.js`, sur 13 périodes : 8 tirées au hasard, un jour, onze jours, un 31/12, février, et une
  période sans vente. 331 jours comparés.
- **Réglages de sauvegarde** : écran, base et état renvoyé. Test : `test-sauvegarde-serveur-horaires.js` (horaires
  rangés et relus dans le champ, poste relu).

**Règles de calcul, et test de cohérence qui les vérifie** (`HorairesSauvegardeTest`, 3 000 cas)

- exactement une sauvegarde par horaire et par jour, aucune en dehors ;
- précédente ≤ instant < suivante, sans horaire entre les deux ;
- la sauvegarde attendue n'est jamais dans l'heure qui vient de s'écouler ;
- le texte rangé se relit à l'identique ;
- valeur vide ou illisible : toutes les heures à hh:05, comme avant.

**Traces attendues, et test de bilan** (`test-sauvegarde-serveur-horaires.js`)

- aucune sauvegarde n'est lancée depuis un poste client, ni par-dessus celle d'un autre poste ;
- la ligne `EN_COURS` de l'autre poste reste `EN_COURS` ;
- à la fin, les réglages sont remis comme avant et aucune ligne de sauvegarde ne reste.

Les deux autres tests ne font que lire.

## 7. Mesures brutes (copie locale, application, 3 passages)

| Route | Avant (ms) | Après (ms) |
|---|---|---|
| `ca-all` 27/10 | 6 357 / 6 499 / 6 369 | 23 / 23 / 21 |
| `ws/ca-achats-ventes` 17 au 27/10 | 6 530 / 4 836 / 4 842 | 446 / 453 / 441 |
| `produit-search/produits/{id}` | 185 / 144 / 133 | 135 / 98 / 82 |
| `produit-search/fiche?produitId=` | 30 / 30 / 24 | n'est plus appelée par la fenêtre |
| balance 27/10 | 670 / 315 / 190 | 335 / 168 / 165 |
| balance 01 au 27/10, après le tableau de bord | 5 521 / 12 014 / 11 797 | 12 805 / 7 985 / 7 897 (inchangé, § 5) |
| balance 01 au 27/10, seule | — | 1 001 / 975 / 987 |
