# Écarts de caisse de Pontmain, du 14 au 18/11/2026

Analyse en lecture seule de la copie locale `pontmain`, code lu sur `integration/recette-2026-10-29` (`f0282bf06`).
Aucune donnée modifiée. Les comptes sont désignés par une lettre, jamais par un nom :
caissière A (identifiant finissant par 105839), B (576420), C (314875), compte D (793170).

## Réponse courte

- **Le calcul de Prestige est juste.** La « Recette » de chaque clôture se retrouve à l'identique en repartant des
  ventes. Les écarts ne viennent pas d'une erreur de calcul.
- **Les écarts ne sont justifiés par aucune écriture.** Aucune sortie ni entrée de caisse n'a été saisie depuis le
  démarrage : la base ne contient aucun mouvement de caisse hors fonds de caisse.
- **Un seul écart est grave : −49 666 F le 16/11 matin (caissière C).** Il ne vient pas du logiciel. Cause suspectée :
  un retrait d'environ 50 000 F non saisi, ou une erreur de comptage des billets.
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
| Mer. 18/11 | B | 15:18 → non clôturée | 9 000 | – | – | – | 72 253 |

Dimanche 15/11 : aucune vente, aucune caisse.

Totaux par jour : 14/11 **+462** ; 16/11 **−42 875** ; 17/11 **+14 003** ; 18/11 **−6 840**.
Sur les dix clôtures : **−35 250 F**. Hors l'écart du 16/11 matin : **+14 416 F**.

## Ce qui a été vérifié et écarté

| Piste | Résultat |
|---|---|
| Recette mal calculée | Écartée : recalcul identique sur 9 clôtures sur 10 ; la dixième diffère de 3 810 F à cause du défaut 1, et la valeur affichée est celle qui était vraie à la clôture. |
| Ventes validées en double | Écartée : aucune paire de ventes de même montant à la même seconde ; six paires à moins d'une minute, toutes de petits montants (100 à 1 405 F), avec des numéros distincts et proches. |
| Ventes encaissées hors caisse ouverte | Écartée : aucune, hormis l'annulation du défaut 2. |
| Arrondi de monnaie | Négligeable : 135 F sur toute la période (43 F au plus par clôture). |
| Sorties ou entrées de caisse | Aucune saisie depuis le démarrage. |
| Ventes à crédit ou tiers payant | Aucune : toutes les ventes sont au comptant. |

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
- **Les autres (+462, −424, −935, +908)** : écarts courants de comptage.

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
  entièrement en espèces : 28 586 F de trop en espèces du 14 au 18/11.
- La gestion de caisse lit `vente_reglement`, qui est juste. Les états bâtis sur `mvttransaction` sont à vérifier.

## Points d'organisation à signaler à l'officine

- La caisse du compte D est ouverte depuis le 14/11 à 19:37, fond 0, jamais clôturée. C'est elle qui permet les
  annulations et modifications à toute heure.
- La caisse de B ouverte le 18/11 à 15:18 n'a pas été clôturée le soir : 72 253 F d'espèces théoriques non comptés.
- Aucune sortie de caisse n'est saisie : tout retrait d'espèces devient un écart.

## Limites

- La base ne dit pas ce qui s'est passé physiquement dans les tiroirs : les causes des écarts sont « suspectées ».
- Les relevés mobile money n'ont pas été rapprochés.
- Aucun test n'a été écrit : c'est une analyse, pas une correction.
