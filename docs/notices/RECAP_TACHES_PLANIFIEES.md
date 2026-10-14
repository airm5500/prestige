# Tâches planifiées de Prestige : récapitulatif et mise en service

*Document établi le 14/10/2026 d'après le code. Il recense toutes les tâches automatiques et dit, pour chacune,
comment l'activer, comment vérifier qu'elle a tourné et ce qui se passe si le serveur était éteint à l'heure prévue.*

---

## 1. Avant tout : trois notions à connaître

### 1.1 Le « mode serveur »

Dans une officine, un seul poste fait office de **serveur** : c'est lui qui exécute les tâches de nuit et les envois
automatiques. La plupart des tâches commencent par vérifier ce point ; sur un poste en mode **client**, elles ne font
rien.

- Le réglage se trouve dans un petit fichier texte, `dicisms.properties`, qui ne contient que deux lignes de réglage
  (aucun mot de passe) :
  - `application.mode=server` (ou `client`) ;
  - `reappro.mode=default` (ou `semois`), qui choisit la méthode de calcul du réapprovisionnement.
- Emplacement du fichier :
  1. s'il existe déjà : `Documents\dicisms.properties`, dans le profil du compte Windows qui fait tourner le serveur
     d'application ;
  2. sinon : `D:\prestige\config\dicisms.properties` (ou `F:\`, puis `E:\`, selon le premier disque utilisable).
- **Valeur par défaut : `server`.** Si le fichier ou la ligne manque, Prestige les crée avec `server`.
- Écrire exactement `server`, en minuscules et sans espace après : toute autre valeur (`Server`, `serveur`, `server `)
  fait passer le poste en mode client.
- Le fichier n'est lu qu'au démarrage : après une modification, **redémarrer le serveur d'application**.
- Pour savoir dans quel mode tourne le poste : au démarrage, le journal du serveur (`server.log`) écrit soit
  `[PIPELINE-STARTUP] Demarrage - 7 etape(s)` (mode serveur), soit `Mode 'client' — pipeline désactivé`.

### 1.2 Les paramètres (table des paramètres)

Chaque tâche lit des réglages dans la table des paramètres de Prestige (`t_parameters`). On les modifie depuis
l'écran de paramétrage quand il propose la clé, sinon par le support technique, **après une sauvegarde de la base**.
La plupart sont relus à chaque passage : pas besoin de redémarrer, sauf mention contraire.

Attention : selon les tâches, un paramètre **absent** de la table ne veut pas dire la même chose. Le détail est donné
pour chacune (« absent = actif » ou « absent = arrêté »).

### 1.3 La surveillance des tâches (Centre de Support)

- Plusieurs tâches notent leur dernier passage dans la table `t_support_job_run` (une ligne par tâche, avec la date
  et l'heure du dernier passage).
- Chaque heure, à hh:10, le **moniteur des tâches** relit la liste des tâches surveillées (`t_support_job`). Pour
  chacune, il connaît : un code, un libellé, la requête qui donne son dernier passage, le **délai toléré**
  (`max_age_minutes`), et le paramètre qui l'active (`parametre_actif`).
- Si le dernier passage est plus ancien que le délai toléré, il écrit dans le journal
  `Alerte job : Job planifie en retard : ...` et crée un incident dans le Centre de Support (un seul incident par
  tâche et par jour ; les répétitions sont comptées).
- Si le paramètre qui active la tâche vaut **exactement 0**, la tâche n'est pas surveillée (on ne reproche pas à
  Prestige d'obéir au réglage). Un paramètre absent ou vide laisse la surveillance active.
- **Nouveau depuis la version 7.0.0** : une tâche qui n'a **jamais** tourné n'est plus signalée tout de suite. Au
  premier constat, la date est notée (colonne `absent_depuis`) ; l'alerte n'apparaît qu'une fois le délai toléré
  écoulé depuis ce premier constat. Dès que la tâche passe, la date est effacée.

Requête utile (lecture seule) pour voir les derniers passages :

```sql
SELECT code, last_run_at FROM t_support_job_run ORDER BY code;
SELECT code, libelle, max_age_minutes, parametre_actif, actif, absent_depuis FROM t_support_job ORDER BY ordre;
```

### 1.4 Les rattrapages au démarrage

Beaucoup d'officines éteignent le serveur la nuit. Deux mécanismes rattrapent alors une partie du travail :

1. **Le démarrage lui-même** (mode serveur uniquement) enchaîne, dans l'ordre : calendrier et nettoyage, calcul du
   réapprovisionnement, lots en cours de péremption, relevé journalier du stock et valorisation, agrégats du
   pilotage, envoi des SMS en attente, envoi des e-mails en attente.
2. **Cinq minutes après le démarrage**, un second passage regarde dans `t_support_job_run` si ces tâches ont tourné
   dans leur délai toléré et, sinon, les lance : purge du Centre de Support, veilleur de cohérence, ventes en attente
   de la veille, archivage PDF de la valorisation, purge du relevé de valorisation. Le journal l'indique par une ligne
   `Rattrapage au demarrage : ...`.

Les autres tâches de nuit n'ont **pas** de rattrapage : si le serveur est éteint, elles attendent la nuit suivante
où il sera allumé à leur heure.

---

## 2. Tableau de synthèse

| Tâche | Horaire | Activée par | Rattrapage si serveur éteint |
|---|---|---|---|
| Calendrier et nettoyage | chaque nuit à 00:00 | mode serveur | oui, au démarrage |
| Relevé journalier du stock et valorisation | chaque nuit à 00:05 | mode serveur + `KEY_VALORISATION_JOURNALIERE` = 1 (relevé) | oui, au démarrage |
| Ventes en attente de la veille | chaque nuit à 00:10 | toujours | oui, 5 min après le démarrage |
| Agrégats du pilotage | chaque nuit à 00:25 | mode serveur | oui, au démarrage |
| Archivage PDF de la valorisation | à 01:20 les 27, 28, 29, 30, 31, 1, 2 et 3 du mois | mode serveur + `KEY_VALORISATION_PDF_ACTIF` = 1 | oui, 5 min après le démarrage (voir limites) |
| Reprise de l'historique de valorisation | chaque nuit à 01:30 | mode serveur | non (nuit suivante) |
| Reclassification ABC | chaque nuit à 02:30, effective une fois par mois | mode serveur + `ABC_AUTO_RECLASS` = 1 | partiel : à la prochaine nuit où le serveur est allumé à 02:30 |
| Purge du relevé de valorisation | le 2 du mois à 02:30 | mode serveur | oui, 5 min après le démarrage |
| Prévisions de commande | chaque nuit à 02:37 | mode serveur + `KEY_PREVISION_ACTIF` = 1 | non |
| Purge du journal des opérations | chaque nuit à 03:27 | `KEY_JOURNAL_CONSERVATION_MOIS` > 0 | non |
| Purge des clés de l'application mobile | chaque nuit à 03:33 | toujours | non (sans conséquence) |
| Purge du Centre de Support | chaque nuit à 03:45 | toujours | oui, 5 min après le démarrage |
| Veilleur de cohérence | chaque nuit à 04:15 | toujours | oui, 5 min après le démarrage |
| Rappels de traitement habituel | chaque jour à 07:13 | mode serveur ; SMS si `KEY_RAPPEL_HABITUDE_ACTIF` = 1 | non |
| Propositions de campagnes | chaque jour à 07:29 | mode serveur + `KEY_CAMPAGNE_AUTO_ACTIF` = 1 | non |
| Envoi des e-mails en attente | chaque jour à 09:00, 12:00, 17:00 | mode serveur | oui, au démarrage |
| Envoi des SMS en attente | chaque jour à 09:20, 13:20, 17:20, 21:20 | mode serveur + `KEY_SMS_CLOTURE_CAISSE` = 1 | oui, au démarrage |
| Rappels de renouvellement d'ordonnance | chaque jour à 10:07 | mode serveur + `KEY_SMS_RAPPEL_RENOUVELLEMENT` = 1 | non (mais le retard est repris le lendemain) |
| SMS récapitulatif d'activité | aux heures de `KEY_HEURE_ENVOI_SMS_RECAP_ACTIVITE` (défaut 00, 18, 19, 20 h) | mode serveur | non |
| Calcul du réapprovisionnement | au démarrage puis toutes les 24 h, effectif une fois par mois | mode serveur + `reappro.mode` | oui, au démarrage |
| PharmaML : réponses différées et messages | toutes les 5 minutes | mode serveur + `KEY_PHARMAML_VIDAGE_AUTO` = 1 | sans objet |
| Moniteur des tâches planifiées | chaque heure à hh:10 | `SUPPORT_MONITOR_ENABLED` = 1 | sans objet |
| Surveillance mémoire et disque | toutes les 5 minutes | `SUPPORT_MONITOR_ENABLED` = 1 | sans objet |
| Surveillance de la base de données | toutes les 5 minutes | `SUPPORT_DB_MONITOR_ENABLED` = 1 | sans objet |
| Surveillance du pool de connexions | toutes les 5 minutes | `SUPPORT_DB_MONITOR_ENABLED` = 1 | sans objet |
| Témoin de vie du serveur (watchdog) | toutes les 2 minutes | `SUPPORT_WATCHDOG_ENABLED` ≠ 0 | sans objet |
| Réparation automatique du pool | chaque minute | toujours ; réparation si `SUPPORT_POOL_REPARATION` ≠ 0 | sans objet |
| Détection des blocages | toutes les 20 secondes | toujours | sans objet |

« Toujours » veut dire : la tâche n'a pas d'interrupteur et tourne aussi sur un poste en mode client (voir la
section 10, incohérences).

---

## 3. Stock et valorisation

### 3.1 Calendrier et nettoyage

- **Classe** : `job.JobCalendar`
- **Horaire** : chaque nuit à 00:00.
- **Ce qu'elle fait** : fait avancer le calendrier de gestion (compteur de jours du mois). Supprime les factures
  provisoires (brouillons) des jours précédents et les suggestions de commande créées il y a plus d'un mois.
- **Conditions** : mode serveur. Aucun paramètre.
- **Serveur éteint à 00:00** : rattrapée au démarrage (première étape du démarrage).
- **Vérifier** : au démarrage, ligne `[PIPELINE]   Calendrier et nettoyage - OK`. Pas de suivi dans
  `t_support_job_run`, pas de surveillance.
- **Pour l'activer** : rien à faire, si le poste est en mode serveur.

### 3.2 Relevé journalier du stock et valorisation quotidienne

- **Classe** : `job.StockDailyScheduler` (traitement dans `DailyStockService`)
- **Horaire** : chaque nuit à 00:05.
- **Ce qu'elle fait** : deux choses.
  1. Le **relevé journalier** : photographie le stock de chaque produit (quantité, prix, TVA). Le relevé de 00:05 vaut
     stock à la fermeture de la veille. Il alimente l'historique de valorisation à une date passée.
  2. La **valorisation quotidienne** : calcule la valeur totale du stock (prix d'achat et prix de vente) pour
     aujourd'hui et les trois jours précédents s'ils manquent.
- **Conditions** :
  - mode serveur ;
  - le relevé ne se fait que si `KEY_VALORISATION_JOURNALIERE` vaut **1**. **Aucune migration ne pose ce paramètre** :
    s'il est absent, le relevé est **arrêté** ;
  - `KEY_VALORISATION_ECRITURE_JSON` (défaut 1) : continue d'alimenter l'ancienne archive en plus du nouveau relevé.
    À ne passer à 0 qu'après la période de sécurité (voir migration 6.9.2).
- **Serveur éteint à 00:05** : rattrapé au démarrage. Le relevé n'est écrit que si la journée n'a pas déjà été
  relevée (un redémarrage à 15 h ne remplace pas le stock de la nuit). La valorisation n'écrit que les jours manquants.
- **Vérifier** :
  - `t_support_job_run`, code `SNAPSHOT_STOCK` ;
  - surveillance `SNAPSHOT_STOCK` et `VALORISATION_QUOTIDIENNE` (délai toléré 30 h, suspendue si
    `KEY_VALORISATION_JOURNALIERE` = 0) ;
  - journal : `Daily stock started at ...`, `Daily stock finished ...`, `Stock daily value update finished` ; ou
    `Daily stock disabled.` si le paramètre est à 0 ou absent.
- **Pour l'activer** : mode serveur, puis créer ou passer `KEY_VALORISATION_JOURNALIERE` à 1.

### 3.3 Agrégats du menu de pilotage

- **Classe** : `job.PilotageAgregatScheduler`
- **Horaire** : chaque nuit à 00:25 (après la valorisation, dont l'onglet Stock se sert).
- **Ce qu'elle fait** : calcule à l'avance les chiffres des mois clos du menu de pilotage. Le premier affichage d'un
  mois n'attend plus cinq secondes. Ne recalcule rien de ce qui existe déjà.
- **Conditions** : mode serveur. Aucun paramètre.
- **Serveur éteint** : rattrapée au démarrage (étape « Agregats du menu de pilotage »).
- **Vérifier** : journal `Pilotage : N mois clos calcules d'avance ...` (seulement s'il y avait un trou). Pas de
  surveillance.
- **Pour l'activer** : rien à faire en mode serveur.

### 3.4 Archivage PDF de la valorisation

- **Classe** : `job.ValorisationPdfScheduler` (traitement dans `ValorisationPdfArchiveService`)
- **Horaire** : à 01:20 les 27, 28, 29, 30, 31, 1, 2 et 3 du mois (six fois seulement en février).
- **Ce qu'elle fait** : produit tout seul le PDF de la valorisation du stock en fin et début de mois, et le range dans
  `D:\prestige\valorisations\valorisation_<officine>_du_<AAAA-MM-JJ>.pdf`. Garde 12 mois d'archives et retire les
  plus anciennes. Vous pouvez ainsi comparer la valeur du stock d'un mois sur l'autre sans y penser.
- **Conditions** :
  - mode serveur ;
  - `KEY_VALORISATION_PDF_ACTIF` : défaut **1** (absent = actif ; 0 = arrêté) ;
  - `KEY_VALORISATION_PDF_CRITERE` : `EMPLACEMENT` (défaut) ou `FAMILLE` ;
  - `KEY_VALORISATION_PDF_MOIS_CONSERVES` : 12 par défaut ;
  - le modèle d'état `rp_valoristion.jrxml` (ou `rp_valoristion_by_famille.jrxml`) doit se trouver dans le dossier
    des états de l'officine, sinon le journal écrit `modele ... introuvable, archivage abandonne`.
- **Serveur éteint à 01:20** : rattrapage 5 minutes après le démarrage, uniquement un jour d'archivage et sans jamais
  réécrire un fichier déjà présent. Limite : ce rattrapage ne se déclenche que si la tâche n'a jamais tourné ou pas
  depuis plus de 35 jours (son délai toléré). Une officine qui éteint son serveur chaque nuit obtient donc environ
  une archive par mois, pas huit.
- **Vérifier** :
  - présence des PDF dans `D:\prestige\valorisations` ;
  - `t_support_job_run`, code `VALORISATION_PDF` (noté seulement quand un fichier a été produit) ;
  - surveillance `VALORISATION_PDF`, délai toléré 35 jours (50 400 minutes) ;
  - journal : `Valorisation PDF archivee : ...` ou `... existe deja, rien n'est reecrit`.
- **Pour l'activer** : mode serveur, `KEY_VALORISATION_PDF_ACTIF` = 1 (c'est le défaut), modèle d'état présent,
  dossier `D:\prestige` inscriptible par le compte du serveur.

### 3.5 Reprise de l'historique de valorisation

- **Classe** : `job.StockSnapshotBackfillScheduler`
- **Horaire** : chaque nuit à 01:30.
- **Ce qu'elle fait** : recopie l'ancien historique du stock (archive par produit) dans le nouveau relevé journalier,
  morceau par morceau, en reprenant là où elle s'était arrêtée. Une fois terminée, elle ne fait plus rien. Avant, elle
  remet à zéro les réserves des journées anciennes, si `KEY_VALORISATION_RESERVE_DEPUIS` est renseigné.
- **Conditions** : mode serveur. Aucun interrupteur.
- **Serveur éteint** : pas de rattrapage ; elle reprend la nuit suivante.
- **Vérifier** : table `stock_snapshot_backfill` (colonne `termine` = 1 quand c'est fini) ; journal
  `Reprise historique terminee ...` ; `t_support_job_run`, code `REPRISE_SNAPSHOT_DAY`. La surveillance existe mais
  est désactivée (`actif` = 0) : à activer seulement pour suivre une reprise en cours.
- **Pour l'activer** : rien à faire en mode serveur.

### 3.6 Reclassification ABC

- **Classe** : `job.AbcReclassScheduler`
- **Horaire** : chaque nuit à 02:30 ; le calcul réel n'a lieu qu'une fois par mois.
- **Ce qu'elle fait** : reclasse les produits en A, B ou C selon leurs ventes des 12 derniers mois
  (`ABC_RECLASS_NB_MOIS`).
- **Conditions** : mode serveur ; `ABC_AUTO_RECLASS` = 1 (défaut 1 ; absent = actif).
- **Serveur éteint** : pas de rattrapage au démarrage. Le calcul se fait à la première nuit du mois où le serveur est
  allumé à 02:30. Un serveur jamais allumé à cette heure ne reclasse jamais.
- **Vérifier** : paramètres `ABC_LAST_RECLASS_DATE` et `ABC_LAST_RECLASS_INFO` ; journal
  `[ABC] Reclassification automatique: ...`. Pas de surveillance.
- **Pour l'activer** : mode serveur et serveur allumé la nuit au moins une fois par mois. Sinon, lancer la
  reclassification à la main depuis l'écran ABC.

### 3.7 Purge mensuelle du relevé de valorisation

- **Classe** : `job.StockSnapshotPurgeScheduler` (traitement dans `StockSnapshotPurgeService`)
- **Horaire** : le 2 de chaque mois à 02:30.
- **Ce qu'elle fait** : allège le relevé journalier. Garde les 90 derniers jours (`KEY_VALORISATION_RETENTION_JOURS`,
  30 au minimum), plus le premier et le dernier jour relevés de chaque mois (les clôtures), sans limite de durée.
- **Garde-fou** : si aucun relevé n'a été écrit depuis 8 jours, elle ne supprime rien (voir section 9.2).
- **Conditions** : mode serveur. Pas d'interrupteur propre ; en pratique elle ne sert que si le relevé journalier
  tourne (3.2).
- **Serveur éteint** : rattrapage 5 minutes après le démarrage, si la purge n'a jamais tourné ou pas depuis 45 jours.
- **Vérifier** : `t_support_job_run`, code `PURGE_VALORISATION` (noté seulement si la purge a réellement eu lieu) ;
  surveillance `PURGE_VALORISATION`, délai toléré 45 jours, suspendue si `KEY_VALORISATION_JOURNALIERE` = 0 ; journal
  `Purge du releve journalier : N lignes supprimees ...`.
- **Pour l'activer** : activer d'abord le relevé journalier (`KEY_VALORISATION_JOURNALIERE` = 1).

### 3.8 Calcul du réapprovisionnement (hors planificateur classique)

- **Classe** : `job.StockReapproJob` (ou `SemoisService` en mode `semois`)
- **Horaire** : au démarrage, puis toutes les 24 heures à partir de l'heure de démarrage. Le calcul n'a lieu qu'une
  fois par mois (paramètre `KEY_DAY_SEUIL_REAPPRO`).
- **Ce qu'elle fait** : recalcule les seuils de réapprovisionnement des produits.
- **Conditions** : mode serveur ; `reappro.mode=default` dans `dicisms.properties`. En mode `semois`, le calcul ne se
  fait qu'au démarrage.
- **Vérifier** : journal `REAPPRO COMPUTE BEGIN AT ...`. Pas de surveillance.

### 3.9 Lots en cours de péremption (au démarrage seulement)

- **Classe** : `job.JobLot`. Pas d'horaire : s'exécute à chaque démarrage, en mode serveur. Le contrôle de cohérence
  « Lot périmé en stock non marqué » (veilleur de 04:15) signale indirectement qu'il n'a pas tourné.

---

## 4. Ventes

### 4.1 Ventes en attente de la veille

- **Classe** : `job.VenteAttenteExpiration`
- **Horaire** : chaque nuit à 00:10.
- **Ce qu'elle fait** : les ventes mises en attente et jamais validées la veille sont tracées dans l'écran
  « Suppressions de vente » (avec leurs produits et quantités, opérateur « Systeme »), puis réellement supprimées.
  Seule la veille est traitée ; les ventes plus anciennes ne sont pas touchées.
- **Conditions** : aucune. Pas de paramètre, et pas de contrôle du mode serveur.
- **Serveur éteint** : rattrapage 5 minutes après le démarrage si la tâche n'a pas tourné depuis 24 h.
- **Vérifier** : écran « Suppressions de vente » ; `t_support_job_run`, code `VENTES_ATTENTE_EXPIREES` ; journal
  `Ventes en attente de la veille traitees : N`. Elle n'est **pas** dans la liste des tâches surveillées.
- **Pour l'activer** : rien à faire.

---

## 5. Notifications, rappels et campagnes

### 5.1 Envoi des e-mails en attente

- **Classe** : `job.NotificationScheduler` (méthode `emailJob`)
- **Horaire** : chaque jour à 09:00, 12:00 et 17:00.
- **Ce qu'elle fait** : regroupe toutes les notifications e-mail non envoyées (clôtures de caisse, périmés, ajustements,
  modifications de prix, etc.) dans un seul e-mail récapitulatif.
- **Conditions** : mode serveur ; une adresse e-mail d'officine et un serveur d'envoi configurés. Sans adresse, le
  journal écrit `Aucune adresse mail configuree : envoi ignore`.
- **Serveur éteint** : rattrapé au démarrage (dernière étape).
- **Vérifier** : les notifications passent au statut « envoyé » ; réception de l'e-mail. Pas de surveillance.
- **Remarque** : le paramètre `KEY_HEURE_EMAIL` (défaut « 2,3,19,20 ») n'est lu nulle part. Les heures sont fixées
  dans le code.

### 5.2 Envoi des SMS en attente

- **Classe** : `job.NotificationScheduler` (méthode `smsJob`)
- **Horaire** : chaque jour à 09:20, 13:20, 17:20 et 21:20.
- **Ce qu'elle fait** : renvoie les SMS de notification restés « non envoyés » depuis la veille.
- **Conditions** : mode serveur ; `KEY_SMS_CLOTURE_CAISSE` = **1** (défaut **0** : arrêté) ; module SMS configuré
  côté serveur.
- **Serveur éteint** : rattrapé au démarrage.
- **Vérifier** : statut des notifications SMS. Pas de surveillance.
- **Pour l'activer** : passer `KEY_SMS_CLOTURE_CAISSE` à 1.

### 5.3 SMS récapitulatif d'activité (hors planificateur classique)

- **Classe** : `job.NotificationJob` (minuterie créée au démarrage)
- **Horaire** : à la minute 0 des heures listées dans `KEY_HEURE_ENVOI_SMS_RECAP_ACTIVITE` (défaut « 0,18,19,20 »).
  Une valeur mal écrite est remplacée par « 18,19 ».
- **Ce qu'elle fait** : envoie par SMS le point d'activité du jour (chiffre d'affaires, règlements...).
- **Conditions** : mode serveur ; module SMS configuré. Les heures ne sont relues qu'au démarrage : redémarrer après
  une modification.
- **Serveur éteint** : pas de rattrapage. Pas de surveillance.

### 5.4 Rappels de traitement habituel

- **Classe** : `job.RappelHabitudeScheduler`
- **Horaire** : chaque jour à 07:13.
- **Ce qu'elle fait** : recalcule la liste « à préparer » des clients dont le traitement habituel arrive à
  renouvellement. Les SMS ne partent automatiquement que si l'officine l'a choisi.
- **Conditions** : mode serveur. La liste est toujours recalculée. Les SMS partent seulement si
  `KEY_RAPPEL_HABITUDE_ACTIF` = 1 (défaut **0**).
- **Serveur éteint** : pas de rattrapage ; la liste est recalculée le lendemain.
- **Vérifier** : journal `Rappels de traitement habituel : N SMS` ; écran des rappels. Pas de surveillance.
- **Pour l'activer** : `KEY_RAPPEL_HABITUDE_ACTIF` = 1, module SMS configuré.

### 5.5 Propositions de campagnes (anniversaires, fêtes)

- **Classe** : `job.CampagneScheduler`
- **Horaire** : chaque jour à 07:29.
- **Ce qu'elle fait** : **prépare** les messages du jour (anniversaires, fêtes) sans rien envoyer. La proposition
  attend votre validation dans l'écran Campagnes ; son nombre de messages s'affiche dans la cloche. Les propositions
  trop anciennes passent en « expirée ».
- **Conditions** : mode serveur ; `KEY_CAMPAGNE_AUTO_ACTIF` = 1 (défaut **0**). Réglages associés :
  `KEY_CAMPAGNE_AUTO_ANNIV` (1), `KEY_CAMPAGNE_AUTO_FETE` (1), `KEY_CAMPAGNE_AUTO_CANAL` (SMS).
- **Serveur éteint à 07:29** : pas de rattrapage ; les anniversaires de ce jour-là ne sont pas proposés.
- **Vérifier** : journal `Campagnes : N message(s) proposé(s), M proposition(s) expirée(s)` ; écran Campagnes.
- **Pour l'activer** : `KEY_CAMPAGNE_AUTO_ACTIF` = 1.

### 5.6 Rappels de renouvellement d'ordonnance

- **Classe** : `job.RappelRenouvellementScheduler`
- **Horaire** : chaque jour à 10:07.
- **Ce qu'elle fait** : prépare et envoie un SMS aux clients dont le renouvellement d'ordonnance tombe dans les
  2 jours (`KEY_RAPPEL_RENOUVELLEMENT_JOURS`) ou est déjà passé sans avoir été rappelé.
- **Conditions** : mode serveur ; `KEY_SMS_RAPPEL_RENOUVELLEMENT` = 1 (défaut **1** ; absent = actif) ; module SMS
  configuré.
- **Serveur éteint à 10:07** : pas de rattrapage au démarrage, mais les échéances passées non rappelées sont reprises
  au passage suivant.
- **Vérifier** : journal `Rappels de renouvellement d'ordonnance : N SMS`. Pas de surveillance.

---

## 6. PharmaML

### 6.1 Réponses différées et messages des grossistes

- **Classe** : `job.PharmaMlVidageScheduler`
- **Horaire** : toutes les 5 minutes (à la 20e seconde).
- **Ce qu'elle fait** : quand une commande envoyée à un grossiste attend encore sa réponse (moins de 15 jours),
  interroge le grossiste pour la récupérer. Récupère aussi, toutes les 30 minutes, les bons de livraison et les
  alertes déposés par les grossistes.
- **Conditions** : mode serveur ; `KEY_PHARMAML_VIDAGE_AUTO` = 1 (défaut 1 ; seule la valeur 0 l'arrête) ;
  `KEY_PHARMAML_VIDAGE_MESSAGES_MIN` = 30 par défaut (0 arrête la récupération des messages) ; grossistes PharmaML
  configurés.
- **Serveur éteint** : sans objet ; elle reprend dès le démarrage.
- **Vérifier** : écran des envois PharmaML (statut des envois en attente). Pas de surveillance ; les erreurs vont au
  journal (`PharmaML : recuperation automatique des reponses`).

---

## 7. Support et surveillance

Ces tâches tournent en continu. Elles ne testent pas le mode serveur.

### 7.1 Moniteur des tâches planifiées

- **Classe** : `job.SupportJobMonitor` ; chaque heure à hh:10.
- **Rôle** : décrit en 1.3. Alerte quand une tâche surveillée n'a pas tourné dans son délai toléré.
- **Conditions** : `SUPPORT_MONITOR_ENABLED` = 1 (défaut 1 ; absent ou autre valeur = arrêté).
- **Vérifier** : incidents « Job planifie en retard » dans le Centre de Support.

### 7.2 Surveillance mémoire et disque

- **Classe** : `job.SupportResourceMonitor` ; toutes les 5 minutes.
- **Rôle** : alerte avant la panne si la mémoire dépasse 85 % (`SUPPORT_MEM_THRESHOLD_PCT`, trois mesures de suite)
  ou si le disque descend sous 1 024 Mo libres (`SUPPORT_DISK_MIN_MB`). Surveille le disque du dossier support et
  celui des journaux du serveur (`SUPPORT_SERVER_LOG_PATH`).
- **Conditions** : `SUPPORT_MONITOR_ENABLED` = 1. Une alerte au plus par jour et par ressource.

### 7.3 Surveillance de la base de données

- **Classe** : `job.SupportDatabaseMonitor` ; toutes les 5 minutes.
- **Rôle** : alerte si les connexions dépassent 80 % du maximum (`SUPPORT_DB_CONN_PCT`), si une requête tourne depuis
  plus de 10 s (`SUPPORT_DB_SLOW_QUERY_S`), ou s'il y a plus de 5 attentes de verrou (`SUPPORT_DB_LOCK_WAITS`).
- **Conditions** : `SUPPORT_DB_MONITOR_ENABLED` = 1. Pour voir les requêtes lentes des autres connexions,
  l'utilisateur de la base doit avoir le **privilège PROCESS** (voir 9.3).
- **Vérifier** : Centre de Support, bouton « Base de données ».

### 7.4 Surveillance du pool de connexions

- **Classe** : `job.SupportPoolMonitor` ; toutes les 5 minutes.
- **Rôle** : mesure le temps pour obtenir une connexion (seuil 2 000 ms, `SUPPORT_POOL_WAIT_MS`) et compte les
  connexions endormies depuis plus de 60 minutes (`SUPPORT_POOL_SLEEP_MIN`, seuil 20 : `SUPPORT_POOL_SLEEP_MAX`).
  C'est le symptôme du « Veuillez patienter » sur toutes les caisses en fin de journée.
- **Conditions** : `SUPPORT_DB_MONITOR_ENABLED` = 1. Les paramètres `SUPPORT_POOL_*` ne sont posés par aucune
  migration : les valeurs du code s'appliquent.

### 7.5 Témoin de vie du serveur (watchdog)

- **Classe** : `job.SupportWatchdog` ; toutes les 2 minutes.
- **Rôle** : écrit un fichier témoin (`D:\prestige\support\watchdog\heartbeat.flag`) avec l'état du serveur. S'il est
  encore là au démarrage, le serveur s'est arrêté brutalement : un incident est créé avec la durée d'arrêt et la cause
  probable, tirée du `server.log`.
- **Conditions** : `SUPPORT_WATCHDOG_ENABLED` ≠ 0 (défaut 1). `SUPPORT_SERVER_LOG_PATH` doit désigner le dossier qui
  contient `server.log`. Ces deux réglages ne sont lus qu'au démarrage : redémarrer après modification.
- **Vérifier** : Centre de Support, bouton « Boîte noire ».

### 7.6 Réparation automatique du pool de connexions

- **Classe** : `job.PoolReparation` ; chaque minute (à la 30e seconde).
- **Rôle** : teste une connexion. Si le pool échoue deux minutes de suite alors que MariaDB répond (par exemple après
  un redémarrage de MariaDB ou une coupure), il vide le pool pour remplacer les connexions mortes. Trois réparations
  au plus par heure ; au-delà, il demande de redémarrer le serveur d'application.
- **Conditions** : toujours active ; `SUPPORT_POOL_REPARATION` = 0 pour surveiller sans réparer (défaut 1). Le vidage
  passe par l'outil d'administration du serveur d'application ; s'il est protégé, la réparation échoue et le Centre
  de Support le dit.

### 7.7 Détection des blocages

- **Classe** : `filter.BlocageWatchdog` ; toutes les 20 secondes.
- **Rôle** : si une requête dure plus de 20 secondes, photographie l'état de tous les traitements du serveur et
  l'écrit dans le journal (`BLOCAGE DETECTE : ...`) et dans le Centre de Support. Un rapport au plus toutes les
  5 minutes.
- **Conditions** : aucune ; toujours active. Lecture seule.

### 7.8 Veilleur de cohérence

- **Classe** : `job.SupportCoherenceScheduler` ; chaque nuit à 04:15.
- **Rôle** : exécute les contrôles SQL actifs du Centre de Support (par exemple « lot périmé en stock non marqué ») et
  note les anomalies. Lecture seule : ne modifie aucune donnée de vente ou de stock.
- **Conditions** : aucune ; contrôles actifs dans `t_support_controle`.
- **Serveur éteint** : rattrapage 5 minutes après le démarrage.
- **Vérifier** : `t_support_job_run`, code `COHERENCE_SUPPORT` ; surveillance `COHERENCE_SUPPORT` (30 h).

---

## 8. Purges

### 8.1 Purge du Centre de Support

- **Classe** : `job.SupportPurgeScheduler` ; chaque nuit à 03:45.
- **Ce qu'elle fait** : supprime les anciens événements du Centre de Support : 30 jours pour les informations,
  60 pour les avertissements, 90 pour les erreurs, 180 pour les erreurs graves (`SUPPORT_RETENTION_INFO`, `_WARN`,
  `_ERROR`, `_FATAL`). Les événements rattachés à un ticket sont gardés.
- **Conditions** : aucune.
- **Serveur éteint** : rattrapage 5 minutes après le démarrage.
- **Vérifier** : `t_support_job_run`, code `PURGE_SUPPORT` ; surveillance `PURGE_SUPPORT` (30 h) ; journal
  `Purge Centre de Support : N événement(s) supprimé(s)`.

### 8.2 Purge du journal des opérations

- **Classe** : `job.JournalPurgeScheduler` ; chaque nuit à 03:27.
- **Ce qu'elle fait** : supprime les lignes du journal des opérations plus anciennes que la durée choisie.
- **Conditions** : `KEY_JOURNAL_CONSERVATION_MOIS` > 0 (défaut **0** = tout garder). Une valeur inférieure à 3 est
  portée à 3 mois.
- **Serveur éteint** : pas de rattrapage ; la purge suivante rattrape tout.
- **Vérifier** : journal `Journal : N ligne(s) de plus de M mois supprimee(s)`. Pas de surveillance.

### 8.3 Purge des clés de l'application mobile

- **Classe** : `job.MobileClientRefPurgeScheduler` ; chaque nuit à 03:33.
- **Ce qu'elle fait** : supprime les clés techniques de plus de 90 jours qui servent à l'application mobile pour
  reprendre un envoi interrompu.
- **Conditions** : aucune.
- **Vérifier** : journal `Cles client mobiles purgees : N` (seulement s'il y en a).

La purge du relevé de valorisation est décrite en 3.7.

---

## 9. Les trois avertissements du journal du 13/10

### 9.1 « Job planifie en retard : Archivage PDF de la valorisation ... (aucun passage trouve) »

Message complet :
`Alerte job : Job planifie en retard : Archivage PDF de la valorisation (fin et debut de mois, 01:20) (aucun passage trouve (le job n'a peut-etre jamais tourne))`

**Pourquoi.** L'archivage PDF (3.4) ne tourne que du 27 au 3. La tâche venait d'être installée : elle n'avait encore
jamais eu de jour d'archivage, donc aucun passage dans `t_support_job_run`. Avant la version 7.0.0, le moniteur
traitait « jamais passé » comme un retard immédiat. Il l'écrivait donc **chaque heure** dans le journal (et comptait
l'incident dans le Centre de Support), alors que rien n'était anormal.

**Ce qui change avec la version 7.0.0.** Au premier constat d'absence, le moniteur note la date dans
`t_support_job.absent_depuis`, sans alerter. Il n'alerte que si la tâche n'a toujours pas tourné **35 jours** après ce
premier constat. Le message devient alors `aucun passage depuis le JJ/MM/AAAA (premier constat)`. Dès le premier
passage réussi, la date est effacée. Sur le banc, la date a été notée le 14/10 : l'archivage doit passer entre le
27/10 et le 03/11, bien avant l'échéance.

**Pour que l'archivage fonctionne :**

1. Poste en mode serveur (1.1).
2. `KEY_VALORISATION_PDF_ACTIF` = 1 (valeur posée par la migration 6.9.39). Pour ne pas l'utiliser, mettre **0** : la
   surveillance se tait alors aussi.
3. Choisir `KEY_VALORISATION_PDF_CRITERE` (`EMPLACEMENT` ou `FAMILLE`) et `KEY_VALORISATION_PDF_MOIS_CONSERVES`.
4. Vérifier que le modèle `rp_valoristion.jrxml` est dans le dossier des états, et que `D:\prestige` est accessible en
   écriture au compte qui fait tourner le serveur.
5. Le 27, contrôler le dossier `D:\prestige\valorisations` et la ligne `VALORISATION_PDF` de `t_support_job_run`.

### 9.2 « Purge du releve journalier annulee : aucun releve recent ... Rien n'est supprime. »

**D'où vient le message.** De `StockSnapshotPurgeService.purgerAsync`, lancé par la purge mensuelle du relevé de
valorisation (3.7).

**Le garde-fou.** Avant de supprimer quoi que ce soit, la purge vérifie que le relevé journalier a écrit au moins une
journée dans les **8 derniers jours**. Sinon, la base est peut-être incomplète (relevé arrêté ou en panne) : purger
retirerait de vieilles journées sans que de nouvelles arrivent. Elle s'arrête donc sans rien supprimer et sans noter
de passage. Ce message est une **protection**, pas une panne de la purge.

**Pourquoi il apparaît le 13/10, alors que la purge est prévue le 2.** Comme la purge n'a jamais abouti, le rattrapage
de démarrage (1.4) la relance **5 minutes après chaque démarrage**, et le garde-fou l'arrête à chaque fois. Le message
revient donc à chaque redémarrage du serveur.

**La vraie cause : le relevé journalier de 00:05 ne tourne pas.** Le plus souvent, `KEY_VALORISATION_JOURNALIERE`
vaut 0 ou n'existe pas. Aucune migration ne le pose, et son absence vaut « arrêté ». C'est le cas du banc :
paramètre à 0 et relevé vide.

**Que faire :**

- **Si vous voulez l'historique de valorisation** : passer `KEY_VALORISATION_JOURNALIERE` à 1, en mode serveur. Le
  relevé est rattrapé au démarrage suivant pour la journée du jour, puis chaque nuit à 00:05. Dès qu'un relevé de
  moins de 8 jours existe, la purge passe normalement et note `PURGE_VALORISATION`. Le message disparaît.
- **Si vous ne voulez pas de relevé journalier** : laisser `KEY_VALORISATION_JOURNALIERE` à 0. La surveillance se tait,
  mais le message de purge reviendra à chaque démarrage et le 2 du mois : il est sans danger, rien n'est supprimé.
  Le faire taire demande une correction du code (voir section 10).
- Vérifier ensuite : `SELECT MAX(stock_of_day) FROM stock_snapshot_day;` doit donner une date récente (format
  AAAAMMJJ).

### 9.3 « Auto-diagnostic du support : 2 anomalie(s) sur 11 point(s) de controle »

**D'où vient le message.** De `SupportPreflight`, qui contrôle la configuration de la supervision à chaque démarrage.
Il n'écrit dans le Centre de Support que s'il trouve une anomalie (incident « Configuration de la supervision »). On
peut le relancer à tout moment : Centre de Support, bouton **« Auto-diagnostic »**.

**Nouveauté.** Le journal **nomme** désormais les anomalies à la suite du compte :
`Auto-diagnostic du support : 2 anomalie(s) sur 11 point(s) de controle : <point> : <détail> ; <point> : <détail>`.
Le message du 13/10 venait d'une version qui ne donnait que le compte.

**Les 11 points de contrôle :**

| # | Point | Anomalie si... | Comment corriger |
|---|---|---|---|
| 1 | Dossier de stockage du support inscriptible | impossible d'écrire un fichier dans `D:\prestige\support` (ou `SUPPORT_STORAGE_DIR`) | donner le droit d'écriture au compte Windows du service du serveur d'application, ou renseigner `SUPPORT_STORAGE_DIR` vers un dossier accessible |
| 2 | Espace disque disponible | dossier absent ou moins de `SUPPORT_DISK_MIN_MB` Mo libres (1 024) | libérer de la place (anciennes sauvegardes, journaux) |
| 3 | Seuil des écrans lents (`SUPPORT_SLOW_MS`) | valeur non numérique ou hors de 100 à 600 000 | corriger la valeur (défaut 5000) |
| 4 | Seuil d'alerte mémoire (`SUPPORT_MEM_THRESHOLD_PCT`) | hors de 1 à 100 | corriger (défaut 85) |
| 5 | Seuil d'alerte disque (`SUPPORT_DISK_MIN_MB`) | hors de 1 à 10 000 000 | corriger (défaut 1024) |
| 6 | Seuil de ticket automatique (`SUPPORT_AUTO_TICKET_SEUIL`) | hors de 1 à 100 000 | corriger (défaut 5) |
| 7 | Destinataire des notifications d'incident | `SUPPORT_NOTIFY_ENABLED` ≠ 0 et `SUPPORT_EMAIL` vide ou sans « @ » | renseigner `SUPPORT_EMAIL`, ou mettre `SUPPORT_NOTIFY_ENABLED` à 0 si on ne veut pas d'e-mail |
| 8 | Chemin du server.log | `SUPPORT_SERVER_LOG_PATH` vide, ou pas de `server.log` dans ce dossier | indiquer le **dossier** (pas le fichier) qui contient `server.log`, puis redémarrer |
| 9 | Privilège PROCESS | le serveur MariaDB déclare plus de connexions que Prestige n'en voit | accorder le privilège PROCESS à l'utilisateur MariaDB de l'application |
| 10 | Mémoire maximale du serveur d'application (-Xmx) | moins de 1 536 Mo (`SUPPORT_HEAP_MIN_MO`) | passer la mémoire maximale à 2 048 Mo, puis redémarrer |
| 11 | Accès de dépannage | `ACCES_DEPANNAGE_ACTIF` = 1 (connexion sans mot de passe ouverte) | remettre `ACCES_DEPANNAGE_ACTIF` à 0 dès la fin de l'intervention |

**Les deux anomalies les plus probables dans une officine**, parce que les valeurs installées par défaut les
provoquent :

1. **Point 7, destinataire des notifications.** La migration pose `SUPPORT_NOTIFY_ENABLED` = 1 et `SUPPORT_EMAIL`
   vide. Sans autre réglage, l'anomalie est donc présente dès l'installation. *Correction* : saisir l'adresse qui doit
   recevoir les incidents graves dans `SUPPORT_EMAIL`, ou passer `SUPPORT_NOTIFY_ENABLED` à 0.
2. **Point 8, chemin du server.log.** La valeur par défaut est
   `D:\payara5\payara5\glassfish\domains\domain1\logs`. Si le serveur d'application est installé ailleurs (autre
   disque, un seul dossier `payara5`, autre nom de domaine), le fichier n'est pas trouvé. *Correction* : repérer le
   dossier `logs` du domaine qui contient `server.log` et le saisir dans `SUPPORT_SERVER_LOG_PATH`, puis redémarrer.
   Sans ce chemin, en cas d'arrêt brutal, le watchdog ne peut pas en donner la cause.

**Autres causes possibles :**

- **Point 9, privilège PROCESS.** Sans ce privilège, MariaDB ne montre à Prestige que ses propres connexions. La
  détection des requêtes lentes tourne alors à vide, sans erreur. *Correction*, par l'administrateur de la base :
  `GRANT PROCESS ON *.* TO '<utilisateur de l'application>'@'<hôte>';`. Le nom de l'utilisateur figure dans la
  configuration du pool de connexions du serveur d'application ; aucun mot de passe n'est nécessaire pour cette
  commande.
- **Point 10, mémoire.** L'installation standard du serveur d'application donne 512 Mo. Cela suffit le matin, mais les
  éditions et statistiques de fin de journée peuvent saturer la mémoire. *Correction* : avec l'outil d'administration
  du serveur d'application, retirer l'ancienne option `-Xmx`, poser `-Xmx2048m`, puis redémarrer.
- **Point 1, dossier de stockage.** Cas typique : le serveur d'application tourne en service Windows sous un compte
  sans droit sur le dossier.
- **Point 11, accès de dépannage** laissé ouvert après une intervention.

Pour savoir lesquelles sont en cause chez vous : lire la ligne complète du journal au démarrage (version actuelle), ou
cliquer sur « Auto-diagnostic » dans le Centre de Support.

---

## 10. Incohérences relevées dans le code

À traiter dans un lot séparé : aucune n'a été corrigée ici.

1. **`KEY_VALORISATION_JOURNALIERE` n'est posé par aucune migration.** Pour le relevé journalier, un paramètre absent
   vaut « arrêté ». Pour le moniteur, il vaut « surveillé ». Sur une base où la clé manque, la surveillance de
   `SNAPSHOT_STOCK` alertera donc pour une tâche qui ne peut pas tourner.
2. **La purge du relevé ne tient pas compte de `KEY_VALORISATION_JOURNALIERE`**, ni à 02:30 le 2, ni au rattrapage de
   démarrage. Quand le relevé est volontairement arrêté, le garde-fou fait écrire
   `Purge du releve journalier annulee` à chaque démarrage (9.2).
3. **La valorisation quotidienne de 00:05 ignore aussi `KEY_VALORISATION_JOURNALIERE`.** Le rattrapage au démarrage le
   respecte, le passage de 00:05 non. La surveillance `VALORISATION_QUOTIDIENNE` est pourtant suspendue par ce
   paramètre.
4. **Le rattrapage de l'archivage PDF dépend du délai toléré de 35 jours.** Une officine qui éteint son serveur chaque
   nuit n'obtient qu'environ une archive par mois, à une date variable, au lieu d'une par jour d'archivage. Le
   commentaire de la migration 6.9.39 parle à la fois de « 8 jours » et de « 35 jours ».
5. **La ligne de surveillance `VALORISATION_PDF` a été insérée sans identifiant.** Son `id` est vide (constaté sur le
   banc). Cela fonctionne, mais une prochaine migration qui ferait de même serait ignorée en silence par
   `INSERT IGNORE`.
6. **Tâches sans surveillance** : ventes en attente (elle note pourtant `VENTES_ATTENTE_EXPIREES` dans
   `t_support_job_run`, sans ligne dans `t_support_job`), calendrier, agrégats du pilotage, reclassification ABC,
   prévisions de commande, campagnes, rappels, envois de notifications, PharmaML, purges du journal et des clés
   mobiles.
7. **Tâches qui ne vérifient pas le mode serveur** : ventes en attente, purge et cohérence du Centre de Support,
   purge du journal, purge des clés mobiles, ainsi que tous les moniteurs. Si un poste en mode client faisait tourner
   sa propre copie de Prestige sur la même base, ces tâches tourneraient deux fois.
8. **`KEY_HEURE_EMAIL`** (défaut « 2,3,19,20 ») est défini mais jamais lu : les heures d'envoi des e-mails sont
   fixées dans le code (9 h, 12 h, 17 h).
9. **Les paramètres `SUPPORT_POOL_WAIT_MS`, `SUPPORT_POOL_SLEEP_MIN`, `SUPPORT_POOL_SLEEP_MAX` et
   `SUPPORT_HEAP_MIN_MO`** ne sont posés par aucune migration : les valeurs du code s'appliquent et l'officine ne les
   voit pas dans ses paramètres.
10. **La reclassification ABC n'a pas de rattrapage au démarrage.** Un serveur jamais allumé à 02:30 ne reclasse
    jamais, contrairement à ce que laisse penser le commentaire de la classe.
