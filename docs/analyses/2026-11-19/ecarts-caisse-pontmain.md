# Écarts de caisse de Pontmain, du 14 au 19/11/2026

Analyse en lecture seule de la copie locale `pontmain` (base du 19/11 au soir, dernière vente à 20:07), code lu sur `integration/recette-2026-10-29` (`f0282bf06`).
Aucune donnée modifiée. Les comptes sont désignés par une lettre, jamais par un nom :
caissière A (identifiant finissant par 105839), B (576420), C (314875), compte D (793170).

## Suite du 20/11 : dossier clos côté logiciel

L'officine a trouvé l'explication : une erreur de billetage des caissières (information rapportée par l'officine le
20/11, non vérifiable dans la base). Elle remplace la cause suspectée plus bas (retraits d'espèces non saisis).
Elle confirme que les écarts ne viennent pas de Prestige. Les défauts 1 à 3 décrits plus bas restent à traiter :
ils sont réels, mais sans lien avec ces écarts.

## Réponse courte

- **Le calcul de Prestige est juste.** La « Recette » de chaque clôture se retrouve à l'identique en repartant des
  ventes. Les écarts ne viennent pas d'une erreur de calcul.
- **Les écarts ne sont justifiés par aucune écriture.** Aucune sortie ni entrée de caisse n'a été saisie depuis le
  démarrage : la base ne contient aucun mouvement de caisse hors fonds de caisse.
- **Trois écarts sont graves, aucun ne vient du logiciel :**
  - −49 666 F le 16/11 matin (C) ;
  - −74 074 F le 19/11 (B) : la caisse est restée ouverte deux jours, et 72 253 F du 18/11 sont dans la Recette ;
  - −96 192 F le 19/11 (A) : aucune écriture ne l'explique.
- Cause suspectée des deux écarts sans explication : des retraits d'espèces non saisis (environ 50 000 F le 16/11,
  environ 100 000 F le 19/11).
- **Deux défauts du logiciel sont confirmés**, mais ils n'expliquent pas les écarts affichés : une vente modifiée
  après la clôture de sa caisse, et une annulation faite après clôture dont le remboursement ne tombe dans aucune caisse.
- L'officine a démarré sur Prestige le 14/11 : première vente et première caisse ce jour-là.

## Comment l'écran calcule

Écran « Gestion de caisse » (`GestionCaisse.js`, `CaisseServiceImpl.getResumeCaisse`, `ResumeCaisseDTO`).

- **Recette** : espèces des ventes clôturées par la caissière entre l'ouverture et la clôture, figées à la clôture
  (`BilletageServiceImpl.cloturerCaisse`, requête `SOLDE_SQL`), plus les mouvements de caisse en espèces.
- **Mt Billetage** : total des coupures saisies à la clôture.
- **Mt Écart** = Billetage − Recette. Le fond de caisse n'entre pas dans le calcul
  (`KEY_PRENDRE_EN_COMPTE_FOND_CAISSE` = 0) : la caissière doit le retirer avant de compter.
- **Montant annulé** : affiché pour information, non déduit de l'écart.

## Écarts jour par jour

| Jour | Caisse | Ouverture → clôture | Fond | Recette | Billetage | Écart | Recalcul depuis les ventes |
|---|---|---|---:|---:|---:|---:|---:|
| Sam. 14/11 | A | 07:41 → 13:18 | 7 000 | 92 173 | 92 635 | **+462** | 92 173 |
| Sam. 14/11 | D | 19:37 → jamais clôturée | 0 | – | – | – | 1 700 |
| Lun. 16/11 | C | 07:48 → 14:12 | 20 000 | 307 271 | 257 605 | **−49 666** | 303 461 (voir défaut 1) |
| Lun. 16/11 | B | 14:16 → 20:20 | 20 000 | 176 024 | 175 600 | **−424** | 176 024 |
| Lun. 16/11 | A | 16:10 → 20:12 | 0 | 137 460 | 144 675 | **+7 215** | 137 460 |
| Mar. 17/11 | A | 08:23 → 20:19 | 18 000 | 359 915 | 370 920 | **+11 005** | 359 915 |
| Mar. 17/11 | B | 08:25 → 12:36 | 10 000 | 106 075 | 109 100 | **+3 025** | 106 075 |
| Mar. 17/11 | C | 12:38 → 14:29 | 20 000 | 13 375 | 12 440 | **−935** | 13 375 |
| Mar. 17/11 | B | 14:47 → 20:18 | 20 000 | 235 792 | 236 700 | **+908** | 235 792 |
| Mer. 18/11 | B | 08:11 → 13:58 | 9 000 | 82 061 | 78 095 | **−3 966** | 82 061 |
| Mer. 18/11 | A | 08:32 → 20:36 | 9 000 | 316 834 | 313 960 | **−2 874** | 316 834 |
| Mer. 18/11 → jeu. 19/11 | B | 18/11 15:18 → 19/11 20:19 | 9 000 | 237 534 | 163 460 | **−74 074** | 237 534 (72 253 du 18/11 + 165 281 du 19/11) |
| Jeu. 19/11 | C | 07:45 → 09:54 | 20 000 | 28 205 | 29 210 | **+1 005** | 28 205 |
| Jeu. 19/11 | A | 07:49 → 20:18 | 20 500 | 434 567 | 338 375 | **−96 192** | 434 567 |

Dimanche 15/11 : aucune vente, aucune caisse.

Totaux par jour : 14/11 **+462** ; 16/11 **−42 875** ; 17/11 **+14 003** ; 18/11 **−6 840** ;
19/11 **−169 261** (clôture de B comprise).
Sur les treize clôtures : **−204 511 F**. Hors les trois écarts graves : **+15 421 F**.

## Ce qui a été vérifié et écarté

| Piste | Résultat |
|---|---|
| Recette mal calculée | Écartée : recalcul identique sur 12 clôtures sur 13 ; la treizième diffère de 3 810 F à cause du défaut 1, et la valeur affichée est celle qui était vraie à la clôture. |
| Ventes validées en double | Pas de double clic (aucune paire à la même seconde), mais neuf ressaisies probables : voir « Ventes saisies deux fois ». |
| Ventes encaissées hors caisse ouverte | Écartée : aucune, hormis l'annulation du défaut 2. |
| Arrondi de monnaie | Négligeable : 135 F sur toute la période (43 F au plus par clôture). |
| Sorties ou entrées de caisse | Aucune saisie depuis le démarrage. |
| Ventes à crédit ou tiers payant | Aucune : toutes les ventes sont au comptant. |
| Règlements incohérents | Écartée : sur les 14 sessions, le total des règlements égale le total des ventes ; aucune vente sans règlement, aucun règlement en double. |
| Prix modifiés à la vente | Sans effet : 314 changements journalisés, tous des arrondis au multiple de 5 F supérieur (1 184 → 1 185). La Recette suit le prix arrondi. |
| Annulations du 19/11 | Sans effet : deux ventes de A annulées par le compte D (2 260 F à 11:29, 4 865 F à 20:07), pendant que la caisse de A était ouverte. Elles sont bien déduites de sa Recette. |

## Ventes saisies deux fois

Recherche refaite le 19/11 au soir sur les 1 075 ventes : même caissière, mêmes produits et mêmes quantités, moins de
deux minutes d'écart. Neuf paires, 17 505 F.

| Jour | Caisse | Ventes | Écart | Montant | Lignes | 1re vente | 2e vente |
|---|---|---|---:|---:|---:|---|---|
| 16/11 | C | 261116_00001 / 00002 | 36 s | 1 405 | 1 | espèces | espèces |
| 16/11 | C | 261116_00029 / 00030 | 77 s | 2 305 | 2 | espèces | mobile |
| 16/11 | C | 261116_00074 / 00075 | 51 s | 100 | 1 | espèces | espèces |
| 16/11 | B | 261116_00086 / 00087 | 48 s | 1 060 | 1 | espèces | espèces |
| 16/11 | B | 261116_00112 / 00113 | 76 s | 1 595 | 1 | mobile | 1 500 espèces + 95 mobile |
| 16/11 | B | 261116_00193 / 00194 | 56 s | 1 060 | 1 | espèces | espèces |
| 17/11 | B | 261117_00165 / 00167 | 32 s | 100 | 1 | mobile | mobile |
| 18/11 | A | 261118_00061 / 00062 | 68 s | 2 950 | 2 | espèces | mobile |
| 19/11 | A | 261119_00267 / 00269 | 45 s | 6 930 | 2 | espèces | mobile |

- **Trois cas sont très probables** (deux produits identiques, espèces puis mobile, à environ une minute) : 2 305 F,
  2 950 F et 6 930 F, soit 12 185 F. Suspecté : vente validée en espèces par erreur, puis refaite en mobile money
  sans annuler la première. La première gonfle alors la Recette en espèces sans argent dans le tiroir.
- Le 18/11, l'écart de A (−2 874 F) tombe à **+76 F** si l'on retire la vente de 2 950 F.
- **Un quatrième cas du même type, à douze minutes** : vente 261116_00081 de 4 910 F en espèces par C à 14:04 (sa
  dernière avant la clôture de 14:12), puis vente 261116_00083 du même produit en mobile par B à 14:16. Ce produit
  ne s'est vendu que ces deux fois dans la journée. Recherche élargie à 30 minutes et à toutes les caissières : aucun
  autre cas de contenu identique avec un autre mode de règlement, hors produits courants.
- Les six autres portent sur un seul produit courant : deux clients à la suite restent possibles.
- Ce n'est pas un double enregistrement par le logiciel : chaque vente a son numéro, son heure et souvent un autre
  mode de règlement. Au-delà de deux minutes, les paires trouvées sont des produits courants à 100, 900, 1 000 ou
  1 060 F vendus plusieurs fois par heure.
- Ces ressaisies n'expliquent pas les trois gros écarts : 2 305 F sur −49 666, 6 930 F sur −96 192, rien pour B.

## Écart par écart

- **16/11 matin, C : −49 666 F.** Non lié au logiciel. Les 83 ventes de la session donnent bien 307 271 F en espèces ;
  la plus grosse vaut 19 810 F, donc aucune vente isolée n'explique le manque. Le billetage saisi compte 23 billets de
  10 000. Suspecté : environ 50 000 F sortis de la caisse sans saisie (remise au titulaire, dépense, dépôt), ou
  cinq billets de 10 000 oubliés au comptage. À demander à l'officine.
- **16/11 soir, A : +7 215 F.** Fond de caisse déclaré à 0 ce jour-là, alors que la même caissière avait déclaré
  7 000 F le 14/11. Suspecté : un fond d'environ 7 000 F présent dans le tiroir et compté avec la recette.
- **17/11, A : +11 005 F et B : +3 025 F.** Plus d'espèces que de ventes en espèces. Suspecté : fond de caisse compté
  en partie avec la recette, ou ventes payées en espèces mais saisies en mobile money (environ un quart des
  encaissements passe par Wave). Non prouvable depuis la base : il faut le relevé Wave du jour.
- **18/11, B : −3 966 F et A : −2 874 F.** Moins d'espèces que prévu. Suspecté : l'inverse, des ventes payées par
  Wave et saisies en espèces, ou erreur de rendu. Même contrôle par le relevé Wave.
- **19/11, B : −74 074 F.** La caisse ouverte le 18/11 à 15:18 n'a été clôturée que le 19/11 à 20:19. Sa Recette
  cumule donc deux journées : 72 253 F du 18/11 après-midi et 165 281 F du 19/11. Le billetage (163 460 F) ne
  correspond qu'au 19/11. Suspecté : les espèces du 18/11 ont été retirées le soir sans clôturer. Indice : le 18/11
  B vendait sur le poste CAISSE3 ; le 19/11 matin, C y a ouvert sa propre caisse et l'a clôturée avec +1 005 F, puis
  B a vendu sur CAISSE2 à partir de 10:08. Le tiroir de CAISSE3 était donc vide le 19 au matin. Écart restant une
  fois les 72 253 F retirés : **−1 821 F**.
- **19/11, A : −96 192 F.** Non lié au logiciel. Les 174 ventes de la session, toutes saisies sur le poste SERVEUR,
  donnent bien 434 567 F en espèces ; la plus grosse vaut 16 790 F. Le billetage compte 29 billets de 10 000.
  Suspecté : environ 100 000 F sortis du tiroir en cours de journée sans saisie (il resterait alors +3 808 F), comme
  le 16/11. À demander à l'officine.
- **Les autres (+462, −424, −935, +908, +1 005)** : écarts courants de comptage.

Le fond de caisse est saisi par chaque caissière pour elle-même et varie de 0 à 20 500 F d'une session à l'autre.
Comme l'écart suppose que ce fond a été retiré avant le comptage, toute imprécision sur le fond devient un écart.

## Défauts du logiciel

### Défaut 1 (confirmé) : vente modifiée après la clôture de sa caisse

- Vente 261116_00015, 3 810 F en espèces, encaissée par C le 16/11 à 09:06.
- C clôture à 14:12 : Recette 307 271 F, vente comprise.
- À 14:32, le compte D modifie la vente (journal, type 18). Elle devient la vente 261116_00089 de 1 700 F.
- Ce que Prestige a écrit :
  - une contre-passation de −3 810 F, datée de 09:06 et rattachée à la caisse de C, déjà clôturée ;
  - la nouvelle vente de 1 700 F, datée de 09:06 aussi, mais rattachée à la caisse de D.
- Conséquences :
  - la Recette figée de C (307 271) ne correspond plus aux ventes (303 461) ;
  - les 2 110 F rendus au client ne sont dans aucune caisse ;
  - la caisse de D attendra 1 700 F qu'elle n'a jamais reçus.
- Code : `SalesServiceImpl.clonePrevente` (ligne 1024) garde la caissière d'origine sur la contre-passation ; la
  clôture de la copie pose la caisse de celui qui modifie (lignes 3332, 3794) ; les dates sont reprises de la vente
  d'origine (lignes 5325-5327, décision VC-12 du 26/10).
- Effet sur l'écart affiché du 16/11 matin : aucun, l'écran lit la valeur figée.

### Défaut 2 (confirmé) : annulation après clôture, remboursement dans aucune caisse

- Vente 261116_00098, 4 280 F en espèces, encaissée par B le 16/11 à 15:09. B clôture à 20:20.
- À 22:10, le compte D annule la vente (journal, type 2).
- La contre-passation de −4 280 F reste sur la caissière B, hors de toute session.
- L'écran l'affiche en « Montant annulé » sur la ligne de B, mais l'écart ne la déduit pas : la déduction est en
  commentaire dans `ResumeCaisseDTO`.
- Si le client a été remboursé, l'argent est sorti d'un tiroir sans trace de caisse. À demander à l'officine.

### Défaut 3 (confirmé, sans effet sur l'écran) : paiements mixtes comptés en espèces dans le journal

- 34 ventes payées en partie en espèces et en partie en mobile money sont écrites dans `mvttransaction` comme
  entièrement en espèces : 28 586 F de trop en espèces du 14 au 18/11 (non recompté pour le 19/11, où le défaut
  se voit encore : 449 607 F en espèces pour A dans ce journal, contre 441 692 F de règlements avant annulations).
- La gestion de caisse lit `vente_reglement`, qui est juste. Les états bâtis sur `mvttransaction` sont à vérifier.

## Points d'organisation à signaler à l'officine

- La caisse du compte D est ouverte depuis le 14/11 à 19:37, fond 0, jamais clôturée. C'est elle qui permet les
  annulations et modifications à toute heure.
- La caisse de B ouverte le 18/11 à 15:18 n'a pas été clôturée le soir : d'où l'écart de −74 074 F du 19/11.
  Une caisse se clôture à chaque fin de service, avant de vider le tiroir.
- Aucune sortie de caisse n'est saisie : tout retrait d'espèces devient un écart. Les deux gros écarts sans
  explication sont proches de montants ronds (50 000 et 100 000 F).
- Prestige n'empêche pas de laisser une caisse ouverte plusieurs jours et ne le signale pas.

## Limites

- La base ne dit pas ce qui s'est passé physiquement dans les tiroirs : les causes des écarts sont « suspectées ».
- Les relevés mobile money n'ont pas été rapprochés.
- Aucun test n'a été écrit : c'est une analyse, pas une correction.
