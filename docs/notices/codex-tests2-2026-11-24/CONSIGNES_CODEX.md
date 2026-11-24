# Tests 2 par Codex : intégration du 24/11/2026 et essai du cas 4

Codex rejoue et contre-vérifie les résultats de Claude consignés dans le cahier `docs/recette/CAHIER_RECETTE_2026-11-24.xlsx`,
feuille « Intégration du 24-11 » (cas I24-01 à I24-98). Claude ne lance aucun test d'écran sur domain4 pendant ce temps.

## Versions testées

| Version | Branche, commit | WAR | Où |
|---|---|---|---|
| Intégration | `integration/recette-2026-10-29`, `7ba943326` (fusion de `plan/21112026` jusqu'à `afd91109b`, puis correctif des tests unitaires `4b2c41887`) | `D:\projet\p3\wars-session-principale\integration-2411.war` | domain4 et domain1 |
| Cas 4 (mots de passe MariaDB), **non fusionné** | `essai/cas4-2311`, `0a1705984` (plan/21112026 + cas 4) | `cas4-2411.war` | domain2 (9080, base `appaul`) |

Nouveautés de l'intégration à tester en priorité (plan du 21/11, lots 1 à 11, retours du 22 et du 23/11) : journal des
messages SMS et WhatsApp avec renvoi, avoirs (fenêtre, envoi, canal), périmés (saisie, analyse, tri, sans rayon), tableau
de bord sur onze mois, prévision de réapprovisionnement, règlements fournisseurs groupés, sélecteur de période sur 7
écrans, volet du menu refermé, traces de la fiche article et des mises à jour en lot, seuil de réapprovisionnement
unique, numéros de téléphone étrangers (SMS et WhatsApp).

## Où jouer

| Serveur | Base | Liste |
|---|---|---|
| domain4, `http://localhost:11090/prestige` (administration 11048), `integration-2411.war` déjà déployé | `laborex_audit` (port 3306), copie de travail | `liste-tests2.txt` (87 tests d'écran), dans l'ordre |
| domain2, `http://localhost:9080/prestige` (administration 9048), `cas4-2411.war` déjà déployé | `appaul` (port 3306), copie de travail | tests `securite\*` du cas 4 (cas I24-91 à I24-98) |

- **Ne pas toucher à domain1 (8080) ni à `laborex_v1_db`.**
- Un seul test à la fois. Le lanceur `lancer-tests2.ps1` les enchaîne un par un :
  `powershell -File lancer-tests2.ps1 -Liste liste-tests2.txt -Sortie resultats-codex-tests2.txt`.
- Il ne lit ni n'écrit aucun mot de passe : la connexion à la base passe par `PAYARA_DOMAINE` (domain4).
- Rien à redéployer, sauf si une branche a reçu du code depuis les commits ci-dessus.

## Le cahier

- Colonnes A à F : résultat de Claude (test, domaine, origine, résultat, détail).
- Colonnes G à K, à remplir : « Résultat testeur » (OK, KO, Bloqué, Non testé), commentaire, testeur, date, « Résultat
  Claude confirmé ? » (Oui / Non). La synthèse compte la feuille (ligne « Intégration du 24-11 »).
- Les échecs de Claude et leur classement (vrai défaut, test périmé, donnée de la base, environnement) sont dans la
  colonne F et dans la section suivante.

## Échecs du passage de Claude et classement

Passage de Claude : 87 tests d'écran le 24/11 sur domain4 (`integration-2411.war`), 79 verts. Les 8 en échec ont été
rejoués sur l'intégration, puis sur `plan/21112026` seul (`seuil-2311.war`, `afd91109b`) : **résultats identiques, donc
aucune régression due à la fusion**.

| Cas | Test | Claude | Classement | À faire par Codex |
|---|---|---|---|---|
| I24-20 | `campagnes\test-journal-messages-2211.js` | 19/26 | Test périmé : il ignorait la colonne « Renvoyer » du lot 11. Corrigé sur `plan/21112026` (26/26), pas encore dans l'intégration. | Confirmer que l'écart ne vient que de cette colonne ; rejouer après fusion. |
| I24-33 | `ergonomie\test-lot9-affichage-2211.js` | 12/13 (3 fois) | **Suspecté.** Clic sur FACTURATION « élément pas stable » pendant 30 s, juste après la fermeture des onglets. Le test peut cliquer pendant que le volet se referme (lot 10), ou l'écran peut avoir un vrai défaut. | Reproduire à la main : menu FACTURATION juste après avoir fermé un onglet. Trancher : défaut du test ou de l'écran. |
| I24-35 | `ergonomie\test-volet-menu-referme-2211.js` | 2/4 puis 4/4 | Passager | Rejouer seul. |
| I24-46 | `perf\test-fiche-modifier-legere-entree.js` | 63/64 | Donnée : `laborex_audit` n'a pas 2 des 6 familles d'articles du jeu d'essai | Confirmer par requête. |
| I24-56 | `retours\test-avis-clients.js` | 9/10 | Environnement : page publique attendue sur le port 8090 (domain1), absente de domain4 | Rejouer sur un domaine qui a l'écouteur public. |
| I24-69 | `retours\test-perimes-sans-rayon-2111.js` | 22/23 puis 23/23 | Passager | Rejouer seul. |
| I24-73 | `retours\test-tableau-bord-onze-mois.js` | 11/13 | Donnée : aucune journée DPCI sans livraison LABOREX-CI ; puis une réponse attendue 120 s | Confirmer la donnée ; dire si l'attente de 120 s cache un vrai défaut. |
| I24-76 | `retours\test-tva-et-motifs-rapides.js` | 18/21 | Donnée : aucune vente le 12/11/2026 dans `laborex_audit` ; déjà 18/21 le 22/11 | Idem ; analyse par motif : dire pourquoi la requête attendue n'arrive pas. |
| I24-89 | `filtres\test-impressions-filtres.js` | 15/17 | Défaut antérieur (même résultat sur l'ancien code) : 2 impressions sans le nom des rayons filtrés | Confirmer. |
| I24-90 | `perf\test-comparaison-stock-export.js` | 3/5 | Défaut antérieur : PDF de comparaison de stock sans ligne lisible ; délais limites | Confirmer. |

## Ton rôle : contre-vérifier

- Chaque résultat de Claude confirmé ou contesté, avec la preuve (ligne `FAIL`, capture, journal de Payara).
- Chaque échec classé « test périmé », « donnée » ou « environnement » : le confirmer ou montrer que c'est un vrai défaut.
- Les tests Playwright audités : un test qui ne vérifie pas le résultat en base, à l'écran et sur les documents est à
  signaler.
- Cas 4 : vérifier qu'aucun mot de passe n'apparaît dans `server.log` (ni ses fichiers tournés), dans les réponses des
  API ni dans les journaux ; que le pool reste utilisable après une rotation et après un échec simulé.
- Pour chaque opération : stock avant et après, mouvements (un seul par opération), suivi des mouvements, solde du
  client, parts des organismes (`docs/notices/STRATEGIE_TESTS.md`).

## Règles du projet, toujours valables

- **Ne jamais écrire dans une base de production.** Seules `laborex_audit` et `appaul` (copies de travail) servent ici.
- Ne pas ouvrir `D:\CONF\LABOREX\CONF`.
- Aucun envoi réel de message ; ne pas arrêter ni modifier le service Windows « Prestige - WhatsApp ».
- Pas de purge globale et pas de changement de la date système.
- Ne pas journaliser le texte des messages, ni les valeurs nominatives des clients, ayants droit ou ordonnances.
- Un vrai défaut : d'abord un test qui échoue, puis la correction, sur une branche à part. Ne jamais pousser sur `dev`,
  ne jamais fusionner.

## À rendre

1. `resultats-codex-tests2.txt` complet.
2. Le cahier, colonnes G à K remplies pour les 98 cas.
3. Un rapport d'audit dans `qa/reports` : défauts classés critique, majeur ou mineur ; pour chacun, confirmé ou
   suspecté, les étapes pour reproduire, la capture et les journaux.
