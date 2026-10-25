# Mécanismes à corriger dans le code — Différés

**Objet.** Document de transmission pour la branche/personne qui corrigera le
**code** des différés. Pour chaque mécanisme : l'analyse (emplacement exact),
l'effet sur les données (familles A1-A6 de `REPRISE_DONNEES_DIFFERES.md`), la
reproduction sur banc, la correction proposée et les points de vigilance.
**Aucune correction n'est appliquée ici.**

**Sources.** Rapport d'audit du 11/10/2026 (anomalies DIF-01 à DIF-10, tests
exécutés hors serveur) et contre-audit du 25/10/2026 : chaque mécanisme a été
re-vérifié ligne à ligne. Les emplacements cités sont valides au commit
`a306c98a` de `claude/new-session-xm8ptu` (fichiers différés inchangés depuis
`cfdb7799`).

**Acquis à préserver.** Le règlement des différés est aujourd'hui bien protégé :
contrôles avant toute écriture (`ReglementDiffereControle.java:77-151` —
appartenance au client, statut, non annulée, restes vus = restes en base,
montant ≤ dû, total exact), verrous triés (`ReglementServiceImpl.java:751-754`,
`:811-818`), rejet du mode « Différé » et des modes inconnus (`:685-689`,
`:770-774`), un seul envoi côté écran (`FaireReglementCtr.js:400-403`), sélection
vidée à chaque recherche (`:310`). **Aucune correction ne doit affaiblir ces
contrôles.** Le point faible restant est la **modification/annulation de vente**.

**Ordre conseillé :** D1 (critique, cœur commun de DIF-01/02/03) → D2 (DIF-05) →
D3 (DIF-06, trivial) → D4 (DIF-04) → D5 (S1) → D6 (DIF-07/08/09/10) → D7
(défense en profondeur). La reprise des données (`REPRISE_DONNEES_DIFFERES.md`)
ne se joue qu'après D1-D5.

---

## D1 — Le « déjà réglé » d'une modification est une photo périmée
### (DIF-01, DIF-02, DIF-03 — critiques)

**Analyse.** À l'ouverture d'une modification (« Ventes terminées > Modifier »),
la ligne de dette est **copiée telle quelle** (`SalesServiceImpl.java:4322`,
`addDiffere(newP, old)` `:4442-4452` : prix et reste photographiés, statut
`is_Progress`) ; la vente d'origine reçoit seulement une `completionDate`
(`:4329`) et **reste clôturée, listée et réglable** (la liste ne filtre ni la
`completionDate` ni l'existence d'une copie : `ReglementServiceImpl.java:189-242` ;
le contrôle de règlement non plus : `ReglementDiffereControle.java:85`).
À la clôture de la copie (`updateDiffere`, `:3058-3097`) :

```java
int dejaRegle = !memeClient || STATUT_IS_CLOSED.equals(ctp.getStrSTATUT()) ? 0
        : Math.max(0, valeur(ctp.getIntPRICE()) - valeur(ctp.getIntPRICERESTE()));   // :3072-3073
ctp.setIntPRICERESTE(Math.max(0, prix - paye - dejaRegle));                           // :3076
```

Trois défauts dans cette formule :
1. **DIF-01** : un règlement fait sur l'origine **pendant** la modification n'est
   pas dans la photo → il est ignoré, la dette de la copie est trop élevée du
   montant réglé ; la ligne d'origine (qui porte le règlement) est mise à 0 et
   `delete` à la clôture (`annulerVenteAnterieur`, `:4745-4752`).
2. **DIF-02** : la photo inclut **l'acompte** versé à la vente d'origine
   (`addDiffere` : `RESTE = PRICE − montantPaye`, `:2238-2240`), or la transaction
   d'origine — acompte compris — est **contre-passée** à la clôture de la copie
   (`:4753-4763`, `(-1) * montantPaye` à `:381`). L'acompte est donc retiré
   **deux fois** : de la caisse et de la dette.
3. **DIF-03** : si le client change (`memeClient` faux, `:3070-3072`) ou si la
   copie est payée autrement (`:3090-3095`), `dejaRegle = 0` et la ligne copiée
   est neutralisée : les règlements déjà faits ne sont **ni reportés, ni rendus,
   ni portés en avoir**.

**Effet.** Dettes sur- ou sous-évaluées, règlements « perdus » (famille A6),
caisse et dette incohérentes (tests de l'audit : écarts +4 000 / −3 000 / +2 000
sur une vente de 10 000).

**Reproduction.**
- R1 (DIF-01) : vente différée 10 000 à 0 F reçu → ouvrir Modifier → dans un autre
  onglet, régler 4 000 (partiel) → clôturer la copie en différé 0 F → le client
  doit 10 000 alors que 4 000 sont en caisse.
- R2 (DIF-02) : vente différée 10 000 avec 3 000 reçus → Modifier sans rien
  changer → clôturer en différé 0 F → dette 7 000 mais caisse −3 000 (acompte
  contre-passé) : total 7 000 + 0 = il manque 3 000.
- R3 (DIF-03) : vente différée 10 000, régler 2 000 → Modifier → clôturer pour un
  autre client → le nouveau doit 10 000, l'ancien n'a ni dette ni avoir, les
  2 000 restent en caisse.

**Correction proposée.**
- À la clôture de la copie, **relire la ligne d'origine sous verrou** et calculer
  le « déjà réglé » depuis les **règlements réels** :
  `SUM(t_dossier_reglement_detail.dbl_AMOUNT)` dont `str_REF` est la ligne
  d'origine (et la ligne copiée). **Ne jamais y inclure l'acompte** : il est
  contre-passé et se ressaisit à la nouvelle clôture.
- Fermer DIF-01 par l'autre bout : **refuser le règlement** d'une ligne dont la
  vente a une copie de modification ouverte (ajouter l'information au chargement
  des lignes, `lignesControle` `ReglementServiceImpl.java:820-835`, et un contrôle
  dans `ReglementDiffereControle.controleLignes`) avec message « vente en cours de
  modification, terminez ou abandonnez la modification ».
- Pour DIF-03 : **refuser** le changement de client / le passage au comptant quand
  la vente porte des règlements de différé, ou reporter explicitement (avoir
  tracé + complément à encaisser). Décision métier à acter avant implémentation.

**Vigilance.** L'abandon de modification (`:4387-4390`) supprime la ligne copiée
et libère l'origine : les nouveaux contrôles doivent couvrir ce chemin (un refus
de règlement pour « modification en cours » doit se lever à l'abandon). Rejouer le
cycle complet clôture → règlement → modification → clôture de la copie, avec et
sans acompte.

---

## D2 — L'annulation accepte une vente déjà réglée, sans contrepartie
### (DIF-05 — majeure)

**Analyse.** `annulerVente` (`SalesServiceImpl.java:588-651`) contrôle la caisse,
la facturation et le stock (`:596-613`) mais **pas les règlements de différé**.
La ligne de dette est mise à 0/`delete` (`:622-629`) et seule la transaction de la
vente (acompte) est contre-passée (`:635-637`) : les `mvttransaction` de type « 2 »
(règlements, `pkey` = dossier) restent en caisse. Le verrou anti double-annulation
ajouté le 14/10 (`refusAnnulation`, `:403-428`) ne traite pas ce point.

**Effet.** Client ayant payé une vente annulée : solde 0, aucun avoir, relevé
négatif (famille A5 ; test de l'audit : relevé −3 000).

**Reproduction.** Vente différée 8 000 → régler 3 000 → annuler la vente :
acceptée ; les 3 000 restent en caisse sans trace côté client.

**Correction proposée.** Dans `refusAnnulation` (ou juste après) : si
`EXISTS (t_dossier_reglement_detail d WHERE d.str_REF = <ligne de dette>)` avec
somme > 0 → **refuser** (« vente déjà réglée en partie : rembourser ou créer un
avoir avant d'annuler »), ou créer l'avoir/remboursement **tracé dans la même
transaction**. Décision métier à acter (refus simple = plus sûr).

**Vigilance.** Même contrôle dans `annulerVenteAnterieur` (chemin de la
modification, `:4737+`) — c'est lui qui neutralise la ligne d'origine porteuse des
règlements (voir D1).

---

## D3 — Un client sans différé rend l'onglet « Règlements » vide pour tous
### (DIF-06 — majeure, correction triviale)

**Analyse.** `reglementsDifferesDto` (`ReglementServiceImpl.java:1090-1097`) :
`getSoldeByClient` (`:1024-1050`) fait une jointure interne filtrée (clôturées,
non annulées, `:1030`) → un client qui a un règlement mais plus aucun différé
actif (cas produit par D1/D2) n'a pas de ligne de solde → `soldes.get(...)` vaut
`null` → `solde.getClientFullName()` lève une NullPointerException → le `catch`
(`:1100-1103`) renvoie une **liste vide pour toute la période**.

**Reproduction.** Jouer R-D2, puis ouvrir « Liste des règlements » sur la période,
sans filtre client : grille vide pour tous les clients, erreur SEVERE au journal.

**Correction proposée.** Solde absent = 0, nom lu sur `t_client` ; ne pas avaler
l'exception pour toute la liste (au pire, ignorer la ligne fautive).

---

## D4 — Le relevé compte l'acompte comme encore dû
### (DIF-04 — majeure)

**Analyse.** Le relevé débite `SUM(tp.int_PRICE)` — le prix entier
(`:1175`, `:1183`, constante `VENTES_DIFFEREES` `:1152-1157`) — et ne crédite que
les `mvttransaction` de type « 2 » (`REGLEMENTS`, `:1160-1162`, `:1178`).
L'acompte encaissé à la clôture (transaction de la vente, pas de type « 2 »)
n'est **jamais crédité**. Test de l'audit : vente 10 000 avec 3 000 d'acompte puis
2 000 réglés → liste clients 5 000, relevé 8 000.

**Correction proposée.** Débiter la part réellement différée
(`int_PRICE − acompte`) **ou** créditer l'acompte comme opération du relevé —
au choix, mais aligné avec la liste des clients (même total final). Corriger
l'écran, le PDF et l'Excel (`ReglementRessource.java:172-261`), puis compléter
`test-differes-modification.js` avec une vente **avec acompte** (l'audit a montré
qu'il clôture tout à 0 F reçu et ne voit donc ni DIF-02 ni DIF-04).

---

## D5 — Une seule ligne de dette supposée par vente, choisie au hasard
### (complément S1 du contre-audit)

**Analyse.** `findOptionalCmt` (`SalesServiceImpl.java:449-456`) fait
`setMaxResults(1)` **sans ORDER BY** et sert partout : annulation (`:622`),
clôture de copie (`:4745`), modification (`:3060`), ouverture de copie (`:4322`).
Aucun chemin de création de doublon n'a été identifié sur cette branche, mais les
données de production **en contiennent** (constaté en juillet 2026 sur les dumps
de deux sites) : sur une vente à deux lignes, chaque opération n'en traite
qu'une, **non déterministe**.

**Correction proposée.** Au minimum : `ORDER BY dt_CREATED` (déterminisme) et un
`LOG.warning` si la vente porte plus d'une ligne active. Mieux : traiter **toutes**
les lignes actives de la vente à l'annulation et à la modification. En parallèle,
la famille A3 de la reprise purge les doublons existants.

---

## D6 — Contrôles secondaires (mineurs, à grouper)

| Réf. | Mécanisme | Correction proposée |
|---|---|---|
| DIF-07 | En partiel, `montantRecu` et `totalRecap` ne sont pas contrôlés (`ReglementServiceImpl.java:777-791`) ; `montantRegle = min(net, versé)` (`TransactionServiceImpl.java:245-252`) fausse le relevé si `montantRecu < montantPaye`. Atteignable par HTTP direct seulement. | Refuser `montantRecu < montantPaye` ; recalculer `totalRecap` côté serveur comme au règlement total. |
| DIF-08 | Le règlement réécrit `dtUPDATED` de la ligne (`appliquer`, `:861-863`) qui sert de « Date Vente », de tri et de filtre (`:213-215`, `:242`, `:961-962` ; `DelayedDTO.java:210-217`). Un différé de janvier réglé en octobre sort des recherches de janvier. | Afficher/filtrer sur la date de la **vente** ; garder `dtUPDATED` pour la trace. |
| DIF-09 | Ventilation d'un partiel dans l'**ordre des clics** (`:744-759` ; `ReglementDiffereControle.java:117-124` ; `FaireReglementCtr.js:181-183`). | Trier côté serveur par date de vente (plus ancienne d'abord) avant ventilation. |
| DIF-10 | Valider à 0 F ne fait rien, sans message (`FaireReglementCtr.js:508`, pas de `else`). | Message « Saisissez le montant reçu » + focus. |

---

## D7 — Défense en profondeur (optionnel mais recommandé)

Indépendamment des correctifs applicatifs, deux garde-fous côté base protègent
les données quel que soit le chemin (présent et futur) — implémentations de
référence sur la branche `differe` (migration `V6.3.3__differe_garde_fous_integrite.sql`,
**à porter et renuméroter, pas à fusionner** — cette branche-là contient aussi
d'anciens correctifs de `ReglementServiceImpl` remplacés depuis par
`ReglementDiffereControle` : une fusion brute régresserait) :
1. trigger `BEFORE INSERT/UPDATE` sur `t_preenregistrement_compte_client` :
   jamais de reste négatif sur un différé positif ;
2. trigger `AFTER UPDATE` sur `t_preenregistrement` : quand `b_IS_CANCEL` passe à
   1, les lignes de dette encore dues de la vente sont soldées (anti dette
   fantôme, couvre tous les chemins d'annulation) — **à n'activer qu'avec D2**,
   sinon il masque le cas « annulée avec règlements » au lieu de le refuser.

---

## Critères d'acceptation

1. Règles du projet : chaque mécanisme est d'abord **reproduit par un test qui
   échoue** (R1-R3, R-D2, scénarios DIF-04/06), via le vrai chemin de l'écran,
   données retirées ensuite. Les tests d'écran se lancent un par un.
2. Invariant global à vérifier sur chaque scénario (celui du banc de l'audit) :
   **caisse nette de la vente + dette restante = prix de la vente**, avec et sans
   acompte, avec et sans règlement intermédiaire, pour les quatre sorties
   (différé même client, différé autre client, comptant, annulation).
3. `test-differes-modification.js` complété avec une vente clôturée **avec
   acompte** (couvre DIF-02 et DIF-04).
4. Aucune régression sur les acquis listés en tête (contrôles du règlement,
   verrous, écran) ni sur l'annulation simple d'une vente sans règlement.
5. Ensuite seulement : reprise des données (`REPRISE_DONNEES_DIFFERES.md`,
   ordre A4 → A3 → A6 → A1 → A2/A5).
