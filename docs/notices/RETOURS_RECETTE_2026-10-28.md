# Retours de recette du 28/10 : détail des tests et des résultats

Réponse à `retoursTests.md` (VC-08, VC-11 et N1, CR-07, CR-10, CA-03, CA-09 et M3, DIF-02, DIF-03, DIF-07).

Les résultats « obtenus » sont ceux des tests automatiques joués le 26/10 entre 19:35 et 19:45 sur `laborex_v1_db`,
version audits `fe5868a1` (fichiers `preuves-audits-2026-10-25/recette-2026-10-26/`). Les observations sur tes propres
essais du 28/10 viennent de la base `laborex_v1_db` (identifiants et montants seulement, aucune colonne nominative lue).
La version audits est en place sur domain1 depuis le 28/10 à 12:17 : tous tes essais de la journée ont donc porté sur
elle.

## Ce qu'il faut savoir avant de lire

Plusieurs cas (VC-08, CR-07, CR-10, DIF-07) ne protègent pas un geste de l'écran, mais **un appel envoyé directement au
serveur** : application mobile, poste resté ouvert avec une ancienne page, double clic, requête modifiée. L'écran
n'envoie jamais ces requêtes ; il est donc normal que tu ne trouves pas de bouton pour les faire. Le test automatique
envoie la requête lui-même, avec la session d'un utilisateur connecté, exactement comme l'écran le ferait.

Pour ces cas, la vérification possible à l'écran est la **non-régression** : le geste normal marche toujours.

Les cas DIF-02 et DIF-03 sont différents : ils correspondent bien à un geste de l'écran (bouton « Modifier » de
« Ventes terminées »). Le test automatique n'a pas cliqué sur le bouton : il a appelé directement l'adresse que le
bouton appelle (`PUT api/v1/vente/modifier-vente-terme/{vente}`, `VenteCtr.js` ligne 4487). C'est pourquoi il a pu
« modifier » sans que tu voies le bouton. Ce n'est pas conforme à la règle « les tests passent par le vrai chemin de
l'écran » ; voir § DIF.

---

## VC-08 : client d'une vente encaissée remplacé

**Défaut corrigé.** L'adresse `POST api/v1/vente/update/client` (utilisée par l'écran de vente et par l'application
mobile pour rattacher un client à la vente **en cours**) acceptait aussi une vente **déjà encaissée**, et avec un
identifiant de client inconnu elle vidait le client de la vente (client NULL).

**Test fait (automatique, `repro-vente-comptant.js`, cas VC-08)**

1. Création d'un client d'essai `ZZAUDIT-CL-VC08` et de son compte.
2. Vente comptant d'une boîte à 3 475 F pour ce client, encaissée en espèces (parcours de l'écran de vente : ajout du
   produit, choix du client, clôture).
3. Contrôle : la vente est close et porte le client d'essai.
4. Envoi direct de `POST api/v1/vente/update/client` avec `venteId` = la vente encaissée et `clientId` =
   `inconnu-ZZAUDIT`.
5. Relecture du client de la vente en base.

**Résultat obtenu**

| Étape | Attendu | Obtenu |
|---|---|---|
| Vente | close, client d'essai | vente N° 261026_00421, `is_Closed`, 3 475 F, client `ZZAUDIT-CL-VC08` |
| Réponse du serveur | refus | `success: false`, « Cette vente (N° 261026_00421) a été clôturée le 26/10/2026 19:59 : elle ne peut plus être modifiée ici… » |
| Client après | inchangé | `ZZAUDIT-CL-VC08` |

**Ta question : comment remplace-t-on le client d'une vente encaissée ?**

- **Vente assurance (VO)** : « Ventes terminées » → icône « Modifier info client » sur la ligne → choisir le client →
  valider. Cette icône n'existe pas pour les ventes comptant (VNO).
- **Vente comptant (VNO)** : « Ventes terminées » → « Modifier » → la vente est rouverte en copie → choisir le client →
  clôturer. L'ancienne vente est annulée et remplacée.

**À vérifier à l'écran (non-régression)** : sur une vente **en cours**, choisir puis changer le client fonctionne
toujours.

---

## VC-11 : annulation, stock rendu au mauvais lot

**Défaut corrigé.** À l'annulation, les boîtes revenaient au lot à la péremption la plus proche, même si elles étaient
sorties d'un autre lot.

**Test fait (automatique, cas VC-11)**

1. Choix d'un produit sans lot, stock 100.
2. Création de deux lots de 5 boîtes :
   - lot A, péremption dans 200 jours, **stock restant 0** (épuisé) ;
   - lot B, péremption dans 400 jours, stock restant 5.
3. Vente comptant de 2 boîtes, encaissée : elles sortent du lot B, seul lot disponible.
4. Annulation de la vente (`GET api/v1/vente/annulation/{vente}`, l'adresse du bouton « Annuler » de « Ventes
   terminées »).
5. Relecture du stock restant de chaque lot (`t_lot.current_stock`).

**Résultat obtenu**

| Moment | Attendu | Obtenu |
|---|---|---|
| Après la vente | A = 0, B = 3 | A = 0, B = 3 |
| Après l'annulation | A = 0, B = 5 | annulation réussie ; A = 0, B = 5 |

**Ta question : où voir le stock restant d'un lot ?** Aucun écran ne l'affiche aujourd'hui. Le stock restant est
`t_lot.current_stock`. Le menu « Recherche périmés » montre seulement la quantité reçue du lot (colonne « Qunatité », `t_lot.int_NUMBER`), et calcule ses valeurs d'achat et de vente sur cette quantité.

**Ta demande (pas encore faite)** : dans « Recherche périmés », renommer « Quantité » en « Qté lot » et ajouter une
colonne « Qté restante ». Je te propose de la faire dans la foulée (voir la question en fin de tour).

## N1 : comment un produit peut-il ne pas avoir de stock dans l'emplacement de la vente ?

Chaque produit a une ligne de stock par emplacement (`t_famille_stock` : officine, dépôts). Cette ligne manque dans
deux situations réelles :

- un produit créé avant qu'un emplacement ait été ajouté, ou créé sans ligne pour cet emplacement (reprise de données,
  import) ;
- une vente faite dans un dépôt pour un produit jamais rentré dans ce dépôt.

Dans ce cas, l'annulation échouait au milieu, après avoir déjà écrit la copie d'annulation et la contre-passation de
caisse : message d'erreur, mais vente à moitié annulée.

**Test fait** : vente d'une boîte, puis retrait temporaire de la ligne de stock du produit dans l'emplacement 1, puis
annulation, puis remise de la ligne à l'identique.

**Résultat obtenu** : refus « Annulation impossible : le produit … n'a pas de ligne de stock dans l'emplacement de la
vente… » ; vente annulée ? **non** ; copies d'annulation **0** ; contre-passations **0**.

Ce cas ne se provoque pas à l'écran sans retirer une ligne en base : il n'est pas à refaire en recette.

---

## CR-07 : part et taux envoyés par le poste enregistrés tels quels

**Défaut corrigé.** À la clôture d'une vente assurance, le poste envoie au serveur la part de chaque organisme et son
taux. Le serveur les enregistrait sans les recalculer : un poste avec une page ancienne, ou une requête modifiée,
pouvait faire enregistrer une part de 1 F à 1 %.

**Pourquoi tu n'as pas compris le test** : ce cas ne se fait pas à l'écran. L'écran envoie toujours les valeurs qu'il a
calculées. Le test **modifie la requête** avant de l'envoyer, pour vérifier que le serveur ne lui fait plus confiance.

**Test fait (automatique, `repro-vente-assurance.js`, cas CR-07)**

1. Création d'un organisme d'essai (copie d'un organisme existant, compteurs à zéro) et d'un client assuré à **80 %**,
   par l'écran client.
2. Vente assurance d'une boîte (produit à TVA 0), sans clôture.
3. Clôture par `POST` de l'écran de vente, avec la requête **modifiée** : pour chaque organisme, part = **1 F**, taux =
   **1 %**.
4. Relecture de la ligne organisme enregistrée (taux, part, statut, statut de facturation) et de l'encours de
   l'organisme.

**Résultat obtenu**

| Élément | Attendu | Obtenu |
|---|---|---|
| Clôture | refusée, ou acceptée avec le calcul du serveur | acceptée |
| Ligne organisme | taux 80 %, part calculée par le serveur | taux **80**, part **564**, `is_Closed`, `unpaid` |
| Encours organisme | part du serveur | **564** |

**À vérifier à l'écran (non-régression)** : une vente assurance à 80 % se clôture normalement, avec la part affichée
sur le ticket égale à celle de la facturation.

---

## CR-10 : retrait d'un tiers payant sur une vente encaissée

**Défaut corrigé.** L'adresse qui retire un tiers payant d'une vente (`GET api/v1/vente/removetp/{lien}/{vente}`)
acceptait une vente **déjà encaissée** : la ligne organisme disparaissait et la vente sortait de la facturation.

**Ta question : comment utiliser l'API sur la vue ?** Tu ne peux pas, et c'est voulu. À l'écran, cette adresse n'est
appelée que dans l'écran de **vente en cours** : vente assurance, retrait d'un des tiers payants avant clôture
(`VenteCtr.js`, `removetierspayant`). Sur une vente encaissée, l'écran ne la propose jamais. Le test l'appelle
directement pour vérifier que le serveur refuse, quelle que soit l'origine de la requête.

**Test fait (automatique, cas CR-10)**

1. Organisme d'essai et client assuré à 80 %.
2. Vente assurance d'une boîte, **encaissée**.
3. Relecture de la ligne organisme.
4. Envoi direct de `GET api/v1/vente/removetp/{lien du client}/{vente}`.
5. Nouvelle relecture de la ligne organisme.

**Résultat obtenu**

| Élément | Attendu | Obtenu |
|---|---|---|
| Ligne avant | présente | organisme CR10, 80 %, part 564, `is_Closed`, `unpaid` |
| Réponse | refus | `success: false`, « Cette vente (N° 261026_00291) a été clôturée le 26/10/2026 19:37 : elle ne peut plus être modifiée… » |
| Ligne après | inchangée | identique : 80 %, 564, `is_Closed`, `unpaid` |

**À vérifier à l'écran (non-régression)** : vente assurance **en cours** avec deux tiers payants, retirer le second
avant de clôturer. Le retrait doit toujours marcher.

---

## CA-03 : ventes « exclues » fantômes

**Ta question : c'est quoi un organisme exclu ?** C'est un tiers payant dont le chiffre d'affaires ne compte pas dans
celui de l'officine (case « exclure », `t_tiers_payant.to_be_exclude = 1`). On le règle dans le menu **« Gérer les tp à
exclure »** (écran « Tiers-payants à exclure dans le chiffre d'affaire »). Chaque vente sur un tel organisme est
inscrite dans la table `vente_exclu`, et son montant va au solde de l'organisme au lieu de son encours.

**Défaut corrigé.** Après une vente sur un organisme exclu, le serveur gardait cet organisme en mémoire : les ventes
ordinaires suivantes étaient inscrites à tort comme « exclues », au nom de l'organisme exclu. Si cet organisme était
ensuite supprimé, toutes les clôtures de vente assurance échouaient.

**Test fait (automatique, cas CA-03)**

1. Création d'un organisme d'essai **exclu** (`to_be_exclude = 1`) et d'un client assuré à 80 % chez lui.
2. Création d'un organisme ordinaire et d'un second client assuré à 80 %.
3. Une vente assurance encaissée sur l'organisme exclu.
4. Huit ventes assurance encaissées sur l'organisme ordinaire.
5. Comptage, dans `vente_exclu`, des lignes des huit ventes ordinaires.
6. Remise en état : trois ventes sur un carnet dépôt, puis une vente ordinaire, et contrôle qu'elle n'est pas inscrite
   comme exclue.

**Résultat obtenu**

| Contrôle | Attendu | Obtenu |
|---|---|---|
| Vente de l'organisme exclu | inscrite dans `vente_exclu` | 1 ligne |
| Ventes ordinaires inscrites comme exclues | 0 sur 8 | **0** |
| Vente ordinaire après des ventes dépôt | non exclue | 0 ligne |

**À refaire à l'écran** : cocher « exclure » sur un organisme dans « Gérer les tp à exclure », faire une vente sur cet
organisme, puis une vente sur un organisme ordinaire. Seule la première doit apparaître dans le suivi des tiers payants
exclus.

---

## CA-09 : changement d'organisme et encours

**Défaut corrigé.** Après « Ventes terminées » → « Modifier info client » → remplacement de l'organisme A par B, la part
restait dans l'encours de A et n'entrait pas dans celui de B.

L'encours existe à deux niveaux :

- celui du **lien client–organisme** : l'encours du client chez cet organisme, `t_compte_client_tiers_payant` ;
- celui de l'**organisme**, tous clients confondus : `t_tiers_payant`.

La correction met les deux à jour.

**Test fait (automatique, cas CA-09)**

1. Création de deux organismes d'essai A et B, encours à 0, et d'un client assuré à 80 % chez A seulement.
2. Vente assurance d'une boîte, encaissée sur A : la part de A est de 564 F.
3. Envoi de la requête du bouton « Modifier info client » (`POST api/v1/vente/updateclientortierpayant`, même contenu
   que l'écran `UpdateVenteClientTpForm.js`), avec B à la place de A, 80 %, nouveau numéro de bon.
4. Relecture de l'encours **organisme** de A et de B.

**Résultat obtenu**

- réponse « Opération effectuée avec succès » ;
- encours de A : 564 → **0** ;
- encours de B : 0 → **564** ;
- la ligne de la vente porte maintenant B, à 80 %, avec une part de 564.

Limite du test : il relit l'encours de l'**organisme**, pas celui du **lien client**. C'est un manque du test ; je
l'ajoute.

**Ton essai du 28/10** (base `laborex_v1_db`, client `68dcd776-…`). Une seule modification a été enregistrée
aujourd'hui (journal des ventes modifiées) : vente **261028_00001** (1 570 F, part organisme 1 413 F à 90 %), à
**13:51:26**. Elle est passée du lien `7039c437` (organisme `14125182838458741740`) à un nouveau lien `9c1fc7f8`
(organisme `14611913527598381570`).

État actuel des encours **client** :

| Lien | Organisme | Encours du lien | Bons non facturés de ce lien |
|---|---|---|---|
| A `7039c437` | `1412…1740` | 43 478 | 3 bons, total 43 478 |
| B `9c1fc7f8` (créé à 13:51:26) | `1461…3570` | **1 413** | 1 bon (la vente 261028_00001), 1 413 |
| `9ecab183` (créé à 12:58:45, 10 %) | `1626…2657` | 0 | aucun bon |
| `2b314173` (créé à 14:01:09, 10 %) | `1572…2650`, nouvel organisme créé à 14:01:09 | 0 | aucun bon |

Pour la vente modifiée, les encours sont donc justes au niveau du client : A a perdu la part, B l'a reçue (1 413). Les
deux liens à 10 % (`9ecab183` et `2b314173`) sont à 0 parce qu'aucune vente n'y est rattachée. Aucune modification de
vente n'a été enregistrée à 14:01 : si tu as essayé de passer une vente sur l'organisme créé à 14:01, la modification
n'a pas été validée. Une cause probable : le taux du nouveau lien (10 %) diffère de celui de la vente (90 %), et le
serveur refuse alors avec « Les taux sont différents ».

**Ce qu'il me faut pour avancer** : l'écran où tu as lu « encours de B : 0 → 0 » (fiche client, liste des tiers
payants, état des encours…) et la vente concernée. L'encours **organisme** de `1461…3570` est de 10 140 612 F : je ne
peux pas dire après coup s'il a bien pris les 1 413 F, car je n'ai pas sa valeur d'avant.

## M3 (ton point) : une priorité utilisée par deux tiers payants

**Constat confirmé en base.** Le client `68dcd776-…` a deux liens actifs en **priorité 2** :

- `9ecab183`, créé à 12:58:45, 10 % ;
- `2b314173`, créé à 14:01:09, 10 %.

Le troisième lien, `9c1fc7f8`, est en priorité 3, et le RO (`7039c437`) en priorité 1.

Ce n'est pas le cas M3 du cahier : celui-ci porte sur un lien supprimé repris en priorité −1, et il est corrigé (test
PASS : priorités 1 et 2, lien supprimé ignoré). C'est un défaut voisin :

- **Chemins déjà sûrs** : la modification de vente et l'ajout d'un nouveau tiers payant depuis la vente prennent la
  priorité libre suivante (`ClientServiceImpl.prochainePriorite`).
- **Chemin probablement fautif** : l'enregistrement de la fiche client reprend telle quelle la priorité saisie à
  l'écran (`ClientServiceImpl`, lignes 824 et 857), sans vérifier qu'elle est libre.

Règle à appliquer : une priorité n'est portée que par un seul lien actif du client.

Je n'ai pas encore reproduit ce chemin par un test. Je te propose de le reproduire, puis de le corriger (voir la
question en fin de tour).

---

## DIF-02, DIF-03, DIF-07 : ventes différées

### Ta remarque : le bouton « Modifier » n'apparaît pas sur ta vente différée

**Comment le test a pu modifier** : il n'a pas cliqué sur le bouton. Il a appelé directement l'adresse du bouton,
`PUT api/v1/vente/modifier-vente-terme/{vente}` (voir « Ce qu'il faut savoir »). Le test ne prouve donc rien sur
l'affichage du bouton.

**Ce que dit le code** (`VentesFinis.js`, ligne 497) : le bouton « Modifier » s'affiche si les trois conditions sont
réunies :

- le montant de la vente est supérieur à 0 ;
- la vente n'est pas annulée ;
- l'utilisateur a le droit « modification de vente » (`P_BT_MODIFICATION_DE_VENTE`).

Le type de vente et le mode de règlement (différé ou non) n'interviennent pas. Cette condition n'a pas été modifiée par
les corrections d'audit : sa dernière modification vient de la branche principale (« toutes les actions dans une seule
colonne »). Le serveur calcule le droit une fois pour toute la liste : il ne varie pas d'une ligne à l'autre.

**Tes ventes différées du 28/10** :

| Vente | Montant | Réglé / reste | État | Bouton attendu |
|---|---|---|---|---|
| 261028_00002 (14:25) | 3 630 | 631 réglé, reste 2 999 | close, non annulée | **oui** |
| 261028_00003 (15:08) | 6 225 | dette supprimée | **annulée** à 15:14 (annulation 261028_00004) | non : vente annulée |

Si la ligne que tu regardais est 261028_00003, l'absence du bouton est normale : la vente a été annulée. Si c'est
261028_00002 et que le bouton manque alors qu'il apparaît sur les autres lignes, c'est un défaut que je n'ai pas encore
trouvé. Je n'ai pas pu ouvrir la liste moi-même : un autre test tournait sur domain1, et je n'en lance jamais deux en
même temps. Dis-moi laquelle des deux, et si le bouton apparaît sur les autres ventes avec le même utilisateur.

**À corriger dans les tests** : DIF-02 et DIF-03 doivent cliquer sur le vrai bouton « Modifier » de « Ventes
terminées ». Ils échoueront si le bouton manque.

### DIF-02 : acompte retiré deux fois

**Défaut corrigé.** Une vente différée avec acompte, modifiée sans rien changer puis revalidée en différé à 0 F : la
dette restante ne tenait plus compte de l'acompte. La caisse revenait à 0 et la dette restait à 2 755 : il manquait
2 755 F.

Règle de contrôle : caisse nette de la vente (vente, copies et annulations) + dette restante = prix.

**Test fait (automatique, `repro-differes.js`, cas DIF-02)**

1. Client d'essai `ZZAUDIT-CL-D02`.
2. Vente comptant de 2 boîtes à 2 755 F, soit **5 510 F**, en mode **différé** avec **2 755 F** reçus (acompte).
3. Contrôle : caisse 2 755 + dette 2 755 = 5 510.
4. « Modifier » la vente (appel direct de `modifier-vente-terme`) : une copie en cours est créée.
5. Clôture de la copie en différé, **0 F reçu**, même client, sans changer les lignes.
6. Relecture de la caisse nette (vente d'origine, copie et annulation) et de la dette du client.

**Résultat obtenu**

| Moment | Caisse nette | Dette restante | Total | Prix |
|---|---|---|---|---|
| Avant modification | 2 755 | 2 755 | 5 510 | 5 510 |
| Après modification | 0 | 5 510 | **5 510** | 5 510 |

La clôture de la copie a réussi. Pourquoi la caisse passe à 0 : l'annulation de la vente d'origine rend l'acompte de
2 755, et la copie est validée avec 0 reçu. La dette reprend donc le prix entier, et le total reste juste.

**Point à trancher (pas un défaut de calcul)** : si tu veux qu'une modification garde l'acompte en caisse, la copie doit
reprendre automatiquement le montant déjà reçu. Ce n'est pas le cas aujourd'hui : c'est à la caissière de le ressaisir.

### DIF-03 : changement de client après règlement

**Défaut corrigé.** Une vente différée déjà réglée en partie, modifiée pour un autre client : le nouveau client devait
le prix entier, et le règlement du premier client n'était ni reporté ni rendu.

**Décision appliquée** (décision 1, prise par défaut) : refus. Une vente déjà réglée, même en partie, ne change ni de
client ni de mode.

**Test fait (automatique, cas DIF-03)**

1. Deux clients d'essai, D03A et D03B.
2. Vente différée de 5 510 F pour D03A, 0 F reçu.
3. Règlement de **2 755 F** par D03A (adresse de l'écran « Faire un règlement »).
4. « Modifier » la vente (appel direct de `modifier-vente-terme`).
5. Clôture de la copie en différé pour **D03B**.
6. Relecture des dettes des deux clients et du montant réglé par D03A.

**Résultat obtenu**

| Élément | Attendu | Obtenu |
|---|---|---|
| Clôture de la copie | refusée | **refusée** |
| Dette de D03A | 2 755 | 2 755 |
| Dette de D03B | 0 | 0 |
| Réglé par D03A | 2 755 | 2 755 |
| Total dettes + réglé | 5 510 | 5 510 |

### DIF-07 : règlement partiel, montant reçu non contrôlé

**Défaut corrigé.** Un règlement de différé pouvait déclarer 1 F reçu pour 2 755 F réglés.

**Test fait (automatique, cas DIF-07)**

1. Client d'essai D07, vente différée de 5 510 F, 0 F reçu.
2. Règlement partiel par l'adresse de l'écran « Faire un règlement » (`POST api/v1/reglement/reglementdiffere`) :
   montant réglé **2 755**, montant reçu **1**, espèces.
3. Relecture de la dette.

**Résultat obtenu**

- réponse `success: false`, « Le montant reçu (1 F) est inférieur au montant réglé (2755 F). » ;
- dette inchangée : **5 510**.

L'écran calcule lui-même le montant reçu : ce cas n'arrive que par une requête modifiée ou par l'application mobile.

**À vérifier à l'écran (non-régression)** : un règlement partiel normal, par exemple 2 755 réglés avec 3 000 reçus et
245 rendus, est accepté et la dette baisse de 2 755.

---

## Suites

| Point | État | Suite proposée |
|---|---|---|
| VC-11 : stock restant dans « Recherche périmés » | **version de la branche claude/new-session-xm8ptu retenue** le 28/10 (« Quantité saisie » / « Quantité restante ») ; ma version retirée | — |
| VC-11 : « Quantité restante lot » dans la fiche article (« Voir les lots / péremptions ») | **fait** (lit le champ quantiteRestante de la version retenue) | test-fiche-article-qte-restante-lot.js |
| M3 et point 21 : priorité en double, ancien RO supprimé | **corrigé** : l'ancien RO reste actif en priorité libre, un seul lien par organisme, une priorité par lien actif | repro-assurances-liens.js P21-a à P21-e : 4 échecs avant correction, 15/15 après ; non-régression vente assurance 17/17, deuxième assurance 14/14, changement de tiers payant 7/7 |
| CA-09 : encours de B lu à 0 | données justes pour la vente 261028_00001 | j'attends l'écran consulté ; j'ajoute au test l'encours du client |
| DIF : bouton « Modifier » absent | conditions du code remplies pour 261028_00002 | j'attends le numéro de vente ; les tests DIF passeront par le bouton |

---

## Suite du 28/10 au soir : tests rejoués par l'écran, sur domain3

À ta demande, les tests font maintenant ce que fait l'utilisateur : menus, frappe au clavier, clics sur les boutons
visibles. Seule la préparation (client d'essai, vente encaissée) passe hors de l'écran. Ils ont tourné sur un serveur
Payara à part, **domain3** (`http://localhost:10090/prestige`), branché sur **`laborex_audit`**, une copie de
`laborex_v1_db` dont les envois (SMS, e-mail, WhatsApp, PharmaML) sont coupés. domain1 et `laborex_v1_db` n'ont pas été
touchés. Sorties : `preuves-audits-2026-10-25/retours-ecran-2026-10-28/`.

| Test (par l'écran) | Ancienne version (6724b004) | Version corrigée |
|---|---|---|
| CA-09 : « Ventes terminées » → « Modifier info client » → A remplacé par B ; encours lu dans « Tiers-payants » | 7/9 : **B : 0 → 0** reproduit, bon de B sans reste dû | **9/9** : A 2 551 → 0, B 0 → 2 552 |
| Ton scénario M3 : écran de vente → fiche client → principale A remplacée par B, puis « Associer une assurance » | 8/13 : A supprimée ; priorité 2 proposée alors qu'elle est prise ; **C et D en priorité 2** ; grille non modifiable | **13/13** : A gardée en priorité 3, D proposée et enregistrée en 4, taux et matricule modifiés dans la grille |
| Fiche article → « Voir les lots / péremptions » | 2/4 : pas de colonne | 3/4 : colonnes « Quantité saisie » et « Quantité restante lot » ; la valeur restante vient de la version de « Recherche périmés » de `claude/new-session-xm8ptu`, absente de cette branche (0 affiché) |

Non-régression sur domain3 : repro-assurances-liens 15/15, repro-vente-assurance 17/17, changement de tiers payant
7/7, deuxième assurance 14/14.

Constat en passant, non corrigé : à la modification de l'organisme, la part est recalculée et peut différer d'1 F de
celle de la vente (2 551 à la vente, 2 552 après).

Reprise des anciens bons sans reste dû : `outils/sql/corriger-reste-bons-modifies.sql`, à exécuter à la main.

---

## Suite du 29/10 : tes réponses au cahier de recette

Cahier mis à jour : `CAHIER_RECETTE_POINTS_A_REVOIR_2026-10-29.xlsx`. Il garde tes statuts et tes remarques, et ajoute
une colonne « Réponse du 29/10 », les cas 20 à 23 et deux questions. La synthèse, cassée par la suppression d'une
colonne, est refaite sur la colonne Statut ; « NOK » y est compté.

| Cas | Ta remarque | Suite |
|---|---|---|
| 5 | contrôle de la priorité déjà utilisée, contrôle du pourcentage | **Fait.** La grille et « Associer une assurance » refusent une priorité déjà portée et un taux hors de 1 à 100 (0 compris). Le motif s'affiche en rouge. Test par l'écran : 12/16 → **18/18**. Le total des taux au-delà de 100 % n'est pas bloqué (question posée). |
| 10 | quantité restante 0 sur 3232018 | **Corrigé.** La version retenue de « Recherche périmés » (`claude/new-session-xm8ptu`) est reprise à l'identique : `LotDTO`, `FicheArticleServiceImpl`, `peremptionManager.js`. Lot 01 de 3232018 : 2 restants affichés. Test : 3/4 → **4/4**. |
| 11 | pas vu sur cette branche | Même reprise : colonnes et exports maintenant présents sur cette branche. |
| 14, 16 | comment changer le client à l'écran ? | Il n'y a pas de chemin à l'écran : le « Modifier » de la zone client corrige la fiche du même client. Ces deux protections ne jouent que côté serveur. Le cas 22 remplace le 14 par un parcours jouable (passage en espèces). |
| 19 | non compris | Réécrit en cas 23, avec les deux menus « Gerer les tp a exclure » et « Tiers-payants exclus ». |

Non-régression sur domain3 après déploiement : repro-assurances-liens 15/15, repro-vente-assurance 17/17,
test-ecran-modifier-tp-vente-encours 9/9.

---

## Suite du 29/10 (2) : tes réponses aux questions

| Question | Ta réponse | Suite |
|---|---|---|
| Bouton « Modifier » absent sur une différée | il est visible | Rien à corriger. |
| Montant déjà reçu repris dans la copie (DIF-02) | la caissière le ressaisit | Comportement actuel gardé. |
| Script SQL des bons sans reste dû (CA-09) | donner les scripts et leurs notices | Notice écrite : `docs/notices/NOTICE_REPRISE_RESTE_BONS_MODIFIES.md`, avec le script `outils/sql/corriger-reste-bons-modifies.sql`. |
| Priorité d'une nouvelle assurance (M3) | cochée « Tiers payant principal » dans « Modifier info TP » : priorité 1, les autres décalées ; dans la fiche client, l'ancienne garde sa priorité | **Déjà le cas.** Nouveau test par l'écran `test-ecran-nouveau-tp-principal.js` : **10/10**, sans changer le code. Il joue A → B avec la case laissée cochée, puis C → B avec la case cochée sur B. Résultat dans les deux cas : B en 1, A en 2, C en 3. La fiche client était déjà couverte par `test-ecran-assurances-client-priorites.js`. |
| Grille des complémentaires de la vente en dépôt | de quelle grille ? | Voir plus bas. |
| Garder domain3 et `laborex_audit` | garder | Gardés. |
| Écart d'1 F | besoin d'explications | Voir plus bas. |

### L'écart d'1 F à la modification de l'organisme

**Ce que tu vois.** Une vente assurance donne une part de 2 551 F à l'organisme A. Dans « Ventes terminées » →
« Modifier info client », tu remplaces A par B au même taux de 90 %. Le bon de B porte 2 552 F, soit 1 F de plus.

**Pourquoi.** La part est calculée deux fois, de deux façons différentes :

- **à la vente** : produit par produit, avec le prix de référence de l'organisme s'il en a un, puis arrondie au franc
  **le plus proche** ;
- **à la modification** : sur le total de la vente, sans prix de référence, puis arrondie au franc **supérieur**.

Avec 90 % d'un montant qui tombe sur un demi-franc ou une fraction, les deux calculs peuvent différer d'1 F. Avec un
prix de référence, l'écart peut dépasser 1 F.

**Conséquence.** La part du client ne change pas à la modification. L'organisme B est donc facturé 1 F de plus que ce
que A devait, et le total client + organisme dépasse le prix de la vente d'1 F.

**Deux choix possibles** :

1. **Garder la part de la vente** (ma recommandation). Quand on change seulement d'organisme et que le taux est le même
   (le serveur refuse déjà un total de taux différent), le nouveau bon reprend la part de l'ancien. Le total reste égal
   au prix et la facture de B est juste.
2. **Accepter le recalcul.** Rien ne change ; l'écart d'1 F (ou plus avec un prix de référence) reste possible.

Dis-moi 1 ou 2. Pour le choix 1, j'écris d'abord le test qui montre l'écart, puis je corrige.

### La grille des complémentaires de la vente en dépôt

Il existe deux fiches client avec une grille « Infos Assurance Complémentaire » :

- celle de l'**écran de vente** (vente assurance → icône de modification du client) : grille rendue modifiable le 28/10
  (taux, matricule, priorité), avec les contrôles du 29/10 ;
- celle de l'**écran de vente en dépôt** (`view/vente/endepot/addClientAssurance.js`), ouverte de la même façon depuis
  une vente en dépôt. Sa grille est restée **en lecture seule** : on y voit les complémentaires, sans pouvoir changer
  leur taux, leur matricule ou leur priorité.

La question : faut-il rendre aussi modifiable celle de la vente en dépôt, avec les mêmes contrôles ?

## Suite du 29/10 (3) : tes deux décisions

### Écart d'1 F : la part de la vente est gardée (choix 1)

**Correction.** Dans « Ventes terminées » → « Modifier info client », quand un organisme est remplacé par un autre au
même taux, le nouveau bon reprend la part de l'ancien. Si le taux change, la part est recalculée comme avant
(`SalesServiceImpl.garderPartDeLaVente`).

**Test par l'écran** (`test-ecran-modifier-tp-vente-encours.js`, deux contrôles ajoutés) : **9/11 avant, 11/11 après**.

| Contrôle | Avant | Après |
|---|---|---|
| Part de B = part de A à la vente | 2 551 → **2 552** | 2 551 → 2 551 |
| Part du client + part de B = prix | 284 + 2 552 = **2 836** pour 2 835 | 284 + 2 551 = 2 835 |

Test unitaire `PartGardeeModificationTest` : 3/3.

### Vente en dépôt : grille des complémentaires modifiable, mêmes contrôles

**Correction.** La fiche client de la vente en dépôt reprend celle de l'écran de vente :

- taux, matricule et priorité modifiables d'un clic dans la grille ;
- priorité déjà portée et taux hors de 1 à 100 refusés, avec le motif en rouge ;
- dans « Associer une assurance », taux 0 et priorité prise refusés, et la priorité proposée est la première libre.

**Défaut trouvé en passant, corrigé.** Dans le contrôleur de la vente en dépôt, quatre appels visaient des éléments de
l'écran de l'officine, renommés lors de la copie. Effets avant correction :

- la fiche client ne se fermait pas après « Enregistrer », et « Annuler » ne la fermait pas non plus ;
- la fenêtre du carnet ne se fermait pas non plus ;
- la fenêtre de choix de l'ayant droit ne s'ouvrait pas ;
- la fenêtre des modes de règlement ne se fermait pas après le choix d'un mode ou « Annuler ».

**Test par l'écran** (`test-ecran-assurances-client-depot.js`, menu GESTION DES TIERS-PAYANTS > « Gestion depots
extensions », vente ASSURANCE_MUTUELLE) : échec avant (grille non enregistrée, fiche restée ouverte), **8/8 après**.

**Non-régression sur domain3** : test-ecran-nouveau-tp-principal 10/10, test-ecran-assurances-client-priorites 18/18,
repro-vente-assurance 17/17, repro-assurances-liens 15/15, test-ecran-modifier-vente-deja-modifiee 6/6.
`retours/test-vente-en-depot.js` : **31/31**. Il échouait d'abord (10/11) parce qu'il écrivait le dépôt d'essai dans
`laborex_audit` mais ouvrait l'écran sur domain1 (adresse 8080 écrite en dur), qui ne le voyait pas. Il prend maintenant
l'adresse réglable `BASE`, comme les autres tests ; sans `BASE`, il garde l'adresse 8080.
