# Historique des anomalies des journaux support

## Mode d'emploi

À chaque nouveau journal `journal_support_AAAAMMJJ_<base>.xls`, on fait trois choses :

1. Analyser le journal dans `AAAA-MM-JJ_<base>.md`.
2. Mettre à jour le tableau ci-dessous :
   - colonne « Vu dans » : ajouter le journal ;
   - colonne « Statut » : la mettre à jour ;
   - colonne « Correctif » : la mettre à jour.
3. Une signature absente d'un journal n'est **pas** close pour autant. On ne la ferme qu'avec le commit du correctif
   et le test qui le prouve.

Les refus Orange POL0001 « Expired contract » sont ignorés, à la demande de l'utilisateur.

Pour un journal précédé d'une purge manuelle, les compteurs « nouveaux » de la veille de cohérence ne valent rien. On
compare alors les échantillons d'un journal à l'autre.

## Journaux reçus

| Journal | Base | Période | Version | Analyse |
|---|---|---|---|---|
| `journal_support_20261030_capitale.xls` | capitale | 13/08 → 30/10 | (sans colonne) | non faite ici (historique seulement) |
| `journal_support_20261115_capitale.xls` | capitale | → 15/11 | (sans colonne) | non faite ici (historique seulement) |
| `journal_support_20261119_capitale.xls` | capitale | → 19/11 | (sans colonne) | non faite ici (historique seulement) |
| `journal_support_20261118.xls` (appaul) | appaul | 16/11 → 18/11 | 2026-11-16 03:45 | `docs/notices/RAPPORT_SUPPORT_2026-11-18.md` |
| `journal_support_20261119_appaul.xls` | appaul | → 19/11 | — | non faite ici |
| `journal_support_20261126_capitale.xls` | capitale | 24/11 23:57 → 26/11 01:05 | 2026-11-24 02:30 | [2026-11-26_capitale.md](2026-11-26_capitale.md) |

## Signatures suivies

| Signature | Code | Vu dans (capitale) | Statut | Correctif |
|---|---|---|---|---|
| `UpdateVenteClientTpForm` onSave : `wind.getData()` null | J26-1 | 30/10 (23/08), 19/11 (18/11), 26/11 (25/11) | **Confirmé** (test d'écran, 4 échecs sur l'ancien code) | branche `PRES-/journaux-support-j26-1` ; test `src/test/e2e/journal/test-enregistrer-tp-avant-chargement.js` |
| `VenteCtr` : `me.getCurrent()` null (`lgPREENREGISTREMENTID`) | — | 19/11 (17/11) | Suspecté | — |
| Mémoire JVM élevée, CAISSE5 (512 Mo) | J26-2 | 26/11 (×22) ; sans nom de poste : 30/10 (09/09, 16/09) | Confirmé (réglage) | réglage du poste |
| Alerte de job au texte d'avant le 14/10 : WAR ancien | J26-3 | 26/11 | Suspecté (poste à trouver sur place) | détection ajoutée : point VERSION_POSTES de l'auto-diagnostic, branche `PRES-/journaux-support-j26-1` ; `VersionPostesPreflightTest`, `test-preflight-versions-postes.js` |
| Auto-diagnostic POOL (5 postes), CONFIG_POSTE (PARA) | J26-4 | 26/11 | Confirmé (réglage) | réglage des postes |
| SMS admin trop long (SVC0280, 940 caractères) | J26-5 | 26/11 | **Confirmé** (test de cohérence, 3 échecs sur le défaut remis à l'essai) | branche `PRES-/journaux-support-j26-1` ; `SmsMessageLongCoherenceTest` |
| Arrêt brutal à la pose d'une version (témoin d'un WAR d'avant le 22/11, sans version) | J26-6 | 26/11 (CAISSE31, DESKTOP-EONHOTA) ; 30/10 et 19/11 (serveur) | **Confirmé** (test d'écran, 6 échecs sur l'ancien WAR) | branche `PRES-/journaux-support-j26-1` ; `CauseArretPremiereMiseAJourTest`, `test-arret-mise-a-jour.js` (C, D, E) |
| Lenteur `POST inventaire/creation` | J26-7 | 30/10, 15/11, 19/11, 26/11 | Suspecté | — |
| Lenteur `GET modereglement/all` | J26-7 | 30/10, 15/11, 19/11, 26/11 ; appaul 19/11 | Suspecté | — |
| Cohérence : 4 ventes terminées sans mouvement de caisse (mêmes identifiants) | J26-8 | 30/10 (5), 15/11 (5), 19/11 (4), 26/11 (4) | Confirmé, stable | — |
| Cohérence : lots périmés non marqués | J26-8 | 15/11 (222), 19/11 (221), 26/11 (221) | Confirmé, stable | — |
| Cohérence : 500 commandes et 10 dossiers de règlement sans détail | J26-8 | 15/11, 19/11, 26/11 | Confirmé, stable | — |
| Blocage de connexion sur `POST user/logout` | — | 19/11 (×4, depuis le 15/11) ; absent le 26/11 (après purge) | Suspecté | — |
| 404 `vente/findone/<url scannée>` | — | 19/11 ; absent le 26/11 (après purge) | Suspecté | — |

## Sujets à surveiller en priorité

Les modifications du 26/11 (`23c292694` et suivants) :

- ticket combiné : lignes « Crédit » et « Comptant » en gras ;
- rappel par numéro d'une vente en attente, avec contrôle serveur, à l'écran de vente et à l'écran de dépôt.

Elles ne sont **pas encore en service** dans le journal du 26/11, qui tourne sur la version du 24/11 02:30. Il faudra
les rechercher dans le premier journal où la version sera postérieure au 26/11.
