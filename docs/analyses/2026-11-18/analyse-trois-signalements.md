# Analyse de trois signalements d'officine (18/11/2026)

Analyse en **lecture seule** : uniquement des `SELECT` sur les copies locales `tiassale`, `moaye` et `simeon` ; code lu sur
`integration/recette-2026-10-29` (`f0282bf06`) ; modèles lus dans le dossier REPORTS transmis (`REPORTS.rar`). Aucune base, aucun
fichier de code modifié ; rien redéployé ; aucun test d'écran lancé ; aucune colonne nominative de client, d'ayant droit ou
d'ordonnance lue. Les chiffres clés de chaque cas ont été rejoués une seconde fois avant rédaction.

| Cas | Officine | Verdict | Nature |
|---|---|---|---|
| 1 | Tiassalé | **confirmé** | défaut de code : la liste des proformas exclut la nature « DEPOT » |
| 2 | Moaye | constat **confirmé**, déclencheur **suspecté** | double création de vente à l'ajout du premier article ; la prévente naît avant la validation, pas après |
| 3 | Siméon | **confirmé** | défaut du modèle `rp_facture_0303.jrxml` : le taux imprimé est celui de la fiche, pas celui de la vente |

---

## Cas 1 — Tiassalé : proforma présente en base, absente de la liste

### Constat

Enregistrement `11ba5c5b-aeef-4ee0-8cb6-bcf5d5b23810` de `t_preenregistrement` :

| Champ | Valeur |
|---|---|
| `str_REF` / `str_REF_TICKET` | `260923_00001` / `5522859852` |
| `int_PRICE` | 1 548 724 (égal à la somme de ses 290 lignes, quantité 782) |
| `str_STATUT` | `devis` |
| `str_TYPE_VENTE` / `lg_TYPE_VENTE_ID` | `VO` / `3` |
| **`lg_NATURE_VENTE_ID`** | **`3` (DEPOT)** |
| `PK_BRAND` | vide (ce n'est pas une vente de dépôt) |
| dates | créée et mise à jour le 23/09/2026 14:55:22 |
| annulation, avoir, copie, import, parent, vente liée | aucun |

L'enregistrement est sain. Il ne diffère des 15 autres proformas de la base que par sa **nature** : 15 proformas en nature 1,
une seule en nature 3, celle-ci. C'est aussi la seule ligne de toute la table à porter la nature 3.

### Cause (confirmée par le code et les données)

- L'écran « Liste Des Proforma » (`general/app/view/devis/Devis.js`) appelle `GET api/v1/ventestats/devis`, servi par
  `SalesStatsServiceImpl.listePreenregistrement` (`SalesStatsServiceImpl.java:505-550`).
- Cette requête ajoute, hors liste dépôt, le critère **`lg_NATURE_VENTE_ID <> '3'`** (lignes 513-516), alors que la liste dépôt,
  elle, se reconnaît à `PK_BRAND <> ''` (511-512). Une proforma de nature DEPOT dont `PK_BRAND` est vide n'apparaît donc dans
  **aucune** des deux listes.
- La nature vient de l'écran de saisie : la liste déroulante « nature » de `DoDevis.js` charge `api/v1/common/natures`, qui renvoie
  toutes les natures actives, « DEPOT » comprise ; `SalesServiceImpl.initVente` l'écrit sans contrôle.
- Preuve rejouée sur `tiassale` : du 01/01 au 18/11/2026, la requête ramène 15 proformas avec le critère et 16 sans ; sur le seul
  23/09, 0 avec et 1 sans.
- Le critère est ancien (au moins février 2025) : il est très probablement dans la version installée à Tiassalé.

Suspecté seulement : que l'opérateur ait choisi « DEPOT » à la main. C'est le seul chemin d'écriture trouvé, mais aucune trace ne
l'atteste.

Remarque d'ergonomie : la liste s'ouvre avec Du = Au = aujourd'hui. Une proforma ancienne n'apparaît qu'après élargissement des
dates ; ici, même élargie, elle reste invisible.

### Autres enregistrements dans le même cas

| Base | Proformas de nature 3 | Autres ventes de nature 3 sans dépôt |
|---|---|---|
| `tiassale` | 1 (celle-ci) | 0 |
| `moaye` | 0 | 2 en cours |
| `simeon` | 0 | 1 en cours, 1 close |
| `laborex_v1_db` | 0 | 1 close |

Les ventes en cours de nature 3 de Moaye et de Siméon sont vraisemblablement absentes de la liste des ventes en attente (même
critère) ; ce point n'a pas été rejoué.

### Correction proposée (non appliquée)

1. **Code** : dans `listePreenregistrement`, reconnaître une vente de dépôt à `PK_BRAND` et non à la nature, au moins pour le statut
   `devis`. Avant de coder, vérifier sur une base qui a de vraies ventes de dépôt que `PK_BRAND` y est toujours renseigné.
2. **À décider** : `VENTE_ATTENTE_CONDITIONS` (`SalesStatsServiceImpl.java:138-140`) porte le même critère et sert au traitement de
   nuit qui archive puis supprime. Ne pas le modifier dans le même lot sans décision.
3. **À décider** : faut-il autoriser une proforma de nature « DEPOT » ? Sinon, retirer ce choix de l'écran ou le refuser au serveur.
4. **Donnée, dépannage immédiat** (à faire par l'officine ou le support, pas depuis ce poste) : passer la nature de cette proforma
   de 3 à 1 ; une ligne, réversible. En attendant, elle reste imprimable par son identifiant.

### Tests à écrire

- Reproduction par l'écran : créer une proforma en nature « DEPOT », revenir à la liste, constater son absence (rouge), puis vert.
- Rapprochement : total de la liste = nombre de `devis` en base sur la même période (16 attendu sur `tiassale`, 15 aujourd'hui).
- Cohérence : toute proforma figure dans une liste et une seule (officine ou dépôt).
- Bilan avant / après : ventes en attente, ventes terminées et liste dépôt inchangées ; seules les proformas de nature 3 s'ajoutent.

---

## Cas 2 — Moaye : préventes « apparues après validation », 16/11/2026 avant 15 h

### Constat

- La copie s'arrête le 16/11 à 14:00. Version de l'officine : migrations jusqu'à **6.2.5** (base créée le 01/10/2026).
- Le 16/11 de 07:32 à 13:59 : 292 ventes, dont 15 restées ouvertes (`is_Process`). **14 d'entre elles sont les jumelles de 12
  ventes validées** : même utilisateur, **même seconde de création**.
- **Aucune jumelle n'est créée après la validation** : la prévente naît en même temps que la vente, donc avant sa clôture (de 2 s
  à 111 s avant, le 16/11). L'impression « elle apparaît après » vient du fait qu'on ne la découvre qu'ensuite, dans la liste des
  ventes en attente.
- **Numéros différents, comme signalé** : la prévente garde un numéro provisoire, la vente validée reçoit un numéro définitif à la
  clôture. Les deux compteurs divergent (277 en définitif, 334 en provisoire le 16/11).
- 10 jumelles sont vides (montant 0, aucune ligne), 4 portent le même produit, la même quantité et le même montant que la vente.
  Une jumelle vide a manifestement eu une ligne retirée ensuite (son lien tiers-payant porte encore 70 % du montant de la vente).
- Créations simultanées avérées : deux préventes portent la même référence provisoire `261116_00278`, et deux cas montrent trois
  créations dans la même seconde.

Exemples du 16/11 (références, sans donnée nominative) :

| Prévente | Type | Créée | Vente jumelle | Montant | Clôturée | Écart |
|---|---|---|---|---|---|---|
| 261116_00148 | VO | 10:57:41 | 261116_00131 | 7 605 | 10:57:51 | 10 s |
| 261116_00199 | VNO | 11:49:49 | 261116_00173 | 3 595 | 11:49:53 | 4 s |
| 261116_00278 (deux fois) | VNO | 13:04:27 | 261116_00236 | 200 | 13:04:29 | 2 s |
| 261116_00285 | VO | 13:12:16 | 261116_00244 | 1 665 | 13:12:18 | 2 s |
| 261116_00305 et 00306 | VNO | 13:29:52 | 261116_00257 | 1 375 | 13:29:56 | 4 s |

### Stock et caisse : non touchés

- Chaque ligne des ventes closes du 16/11 (511 lignes) a exactement un mouvement de stock.
- Les jumelles n'ont aucun mouvement de stock ni de caisse.
- À examiner à part : deux paires de ventes **closes** créées à la même seconde avec le même montant (22/10 et 30/10), possible
  double vente validée.

### Fréquence : chronique depuis le 18/10/2026

- Aucune jumelle du 01/10 au 17/10 ; **307 jumelles du 18/10 au 16/11** (234 en comptant, 73 en assurance, soit 2,4 % et 3,3 % des
  ventes).
- **304 des 307 jumelles viennent d'un seul compte utilisateur** (identifiant technique finissant par `271535`), apparu le 17/10.
  Un autre compte très actif (3 365 ventes) n'en a aucune.
- Pour ce compte : aucune jumelle avant 10 h, concentration de 11 h à 14 h et vers 17 h.
- Ce compte sert sur plusieurs postes en même temps. Cette version n'enregistre pas le poste sur la vente : la base ne permet pas
  de désigner le poste.

### Cause

**Confirmé par le code** : l'écran peut envoyer deux créations de vente.

- À l'ajout du premier article, l'écran choisit « créer une vente » tant qu'aucune vente courante n'est connue, et la vente courante
  n'est renseignée qu'à la **réponse** du serveur (`VenteCtr.js`, `addVenteVno` et `addVenteAssuarnce`). Aucun verrou entre l'envoi
  et la réponse : un second déclenchement arrivé entre-temps (double Entrée, douchette qui envoie deux fins de ligne, scan pendant
  l'attente, lenteur aux heures de pointe) crée une seconde vente.
- Le serveur crée une vente à chaque appel, sans clé d'idempotence (`SalesRessource.java`, `add/vno` et `add/assurance`).
- Le compteur provisoire est lu puis incrémenté sans verrou (`buildRefTmp`), d'où la référence en double.
- Aucun chemin ne crée de prévente après la clôture : la remise à zéro de l'écran ne fait aucun appel au serveur.
- **La branche d'intégration a toujours ce défaut côté écran web** : le serveur sait rendre la création idempotente par l'en-tête
  `X-Client-Ref` (`SalesRessource.java:215-240`, prévu pour le mobile), mais `VenteCtr.js` ne l'envoie jamais (0 occurrence).

**Suspecté, non confirmé** : le déclencheur réel à Moaye. Le profil (un seul compte, depuis le 18/10, aux heures de pointe) désigne
soit un poste ou une douchette mis en service les 17 et 18/10, soit la lenteur aux heures de pointe.

### Ce qu'il faut demander à l'officine pour confirmer

- Le journal d'accès Payara du 16/11 autour de 13:04:27 et 13:29:52 : deux ou trois `POST` de création de vente de la même adresse
  dans la même seconde. Il donnera aussi le poste.
- Quel poste et quelle douchette servent avec ce compte entre 11 h et 14 h ; réglage du suffixe de la douchette.
- Ce qui a changé les 17 et 18/10 (nouveau compte, poste, douchette, redéploiement).
- Si le personnel vide ces préventes à la main depuis la liste des ventes en attente.

### Correction proposée (non appliquée)

1. **Écran** : verrou d'ajout pris avant le premier appel et rendu au succès comme à l'échec ; un second ajout pendant la création
   est mis en file puis envoyé sur la vente reçue, pour ne perdre aucun scan.
2. **Serveur** : l'écran web envoie un `X-Client-Ref` par nouvelle vente ; le serveur le gère déjà.
3. **Compteur provisoire** : incrément atomique.
4. **Données** : les 307 jumelles sont identifiables par requête ; leur nettoyage est une écriture en production, à décider.

### Tests à écrire

- Écran, d'abord en échec : deux Entrée sur la quantité du premier article ; scan suivi d'Entrée avec réponse retardée ; en comptant
  et en assurance. Attendu : une seule vente, une seule ligne.
- Rapprochement : écran, base et ticket identiques après clôture ; aucune vente en cours supplémentaire.
- Cohérence : N créations concurrentes avec la même clé donnent une vente ; N références provisoires distinctes sinon.
- Bilan avant / après : ventes en cours de l'utilisateur, compteurs, mouvements de stock et de caisse.

---

## Cas 3 — Siméon : taux incompris sur les factures « Willis »

### Organismes et modèle

- `LIKE '%willis%'` ne ramène qu'un organisme ancien (modèle `0202`, sans colonne de taux, factures de 2022-2023).
- Les organismes Willis actuels sont les 41 « WTW … » du **groupe `WILLIS`** : modèle de facture `0303`, soit le fichier
  **`rp_facture_0303.jrxml`** du dossier REPORTS (197 factures du 04/07/2023 au 05/11/2026, 2 302 dossiers).
- Ce modèle n'existe que dans le dossier REPORTS de l'officine : aucun `rp_facture_*.jrxml` n'est dans le dépôt.

### D'où vient le taux imprimé (confirmé)

- `rp_facture_0303.jrxml:38` : la requête sélectionne `cctp.int_POURCENTAGE`, c'est-à-dire le taux **de la fiche du compte assuré**
  (`t_compte_client_tiers_payant`).
- `rp_facture_0303.jrxml:578` : la colonne « TAUX » imprime `$F{int_POURCENTAGE}+"%"`.
- Le taux **appliqué à la vente** est ailleurs : `t_preenregistrement_compte_client_tiers_payent.int_PERCENT`.
- Le taux imprimé est donc la valeur de la fiche **le jour de l'impression** : une réimpression peut donner un autre taux pour le
  même bon. `rp_facture_0303RECOUR.jrxml` a le même défaut.

### Chiffres

| Taux imprimé (fiche) | Taux de la vente | Taux réel (crédit / total) | Dossiers |
|---|---|---|---|
| 100 | 100 | 100 | 993 |
| 80 | 80 | 80 | 575 |
| **100** | **80** | 80 | **350** |
| **80** | **100** | 100 | **254** |
| 90 | 90 | 90 | 65 |
| **100** | **90** | 90 | **31** |
| **90** | **100** | 100 | **18** |
| **80** | **90** | 90 | **8** |
| 70 | 70 | 70 | 5 |
| **90** | **80** | 80 | **3** |

- **664 dossiers sur 2 302 (28,8 %) portent un taux imprimé faux** ; en 2026, 653 sur 2 014 (32,4 %), sur 10 factures.
- **Les montants sont justes partout** : crédit = total du bon × taux de la vente sur 2 302 lignes sur 2 302 ; somme des détails =
  montant de la facture sur 197 factures sur 197 ; total = comptant + crédit partout.
- Causes écartées par ces chiffres : plafond, prix de référence, produits exclus, complémentaire, arrondi, remise.

Exemple, facture 1753 du 05/11/2026 (226 dossiers, 59 taux faux) :

| Total bon | Comptant | Crédit | Taux imprimé | Taux de la vente |
|---|---|---|---|---|
| 6 560 | 0 | 6 560 | 80 % | 100 |
| 10 130 | 2 026 | 8 104 | 100 % | 80 |
| 13 750 | 0 | 13 750 | 90 % | 100 |
| 20 935 | 4 187 | 16 748 | 100 % | 80 |

### Pourquoi la fiche diffère de la vente

- **Confirmé** : le taux dépend du **bénéficiaire** et non du compte. Sur 469 comptes, 171 ont deux ou trois taux selon le patient ;
  la fiche n'a qu'un seul taux par compte et `t_ayant_droit` n'en porte aucun.
- **Confirmé** : la fiche garde le taux de la **dernière vente** du compte (477 comptes sur 484).
- **Suspecté** : le taux est changé au comptoir par la fiche client ouverte depuis la vente (chemin de code repéré, non rejoué).

En clair : un assuré couvert à 100 % dont l'enfant est couvert à 80 %. Si la dernière vente du mois est pour l'enfant, toutes les
lignes de la famille sortent à « 80 % », y compris celles de l'assuré dont tout le bon est en crédit. D'où l'incompréhension.

### Portée

- Défaut du **modèle**, pas du calcul. Toute officine qui a ce fichier a le même défaut.
- Chez Siméon, 165 organismes utilisent ce modèle : hors Willis, 63 dossiers sur 1 191 en 2026 ont aussi un taux imprimé faux.

### Correction proposée (non appliquée)

1. Dans `rp_facture_0303.jrxml` et `rp_facture_0303RECOUR.jrxml`, ligne 38 : remplacer `cctp.int_POURCENTAGE` par
   `pctp.int_PERCENT AS int_POURCENTAGE`. Le champ et l'expression d'affichage restent inchangés.
2. Copier le fichier corrigé dans le dossier REPORTS de l'officine (sans cela les PDF ne changent pas) et le verser au dépôt.
3. **À décider, hors de ce défaut** : porter un taux par ayant droit sur la fiche, pour éviter la ressaisie à chaque vente.

### Tests à écrire

- Rapprochement PDF / base sur la facture 1753 : taux de chaque ligne = taux de la vente, et total × taux = crédit à 1 F près.
  Attendu avant correction : 59 lignes en échec sur 226 ; après : 0.
- Rapprochement PDF / écran : même taux que le détail de facture à l'écran.
- Cohérence : somme des crédits = montant de la facture ; nombre de lignes = nombre de dossiers.
- Stabilité : modifier le taux d'une fiche sur la copie de travail, réimprimer une facture ancienne, taux inchangés.
- Bilan avant / après sur les 197 factures : 664 taux changent, 0 montant change.
- Délai d'affichage de l'impression, avec plafond.

---

## Incertitudes communes

- Les bases analysées sont les copies locales, pas les bases des officines.
- Le code lu est celui de l'intégration ; les versions installées diffèrent (Moaye est en 6.2.5 ; le code proche de cette version a
  aussi été relu pour le cas 2).
- Aucun PDF n'a été généré ; le taux « imprimé » du cas 3 est reconstitué en rejouant la requête du modèle.
- Aucune reproduction à l'écran n'a été faite : elle fait partie des tests proposés.
