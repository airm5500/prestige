# Mécanismes à corriger dans le code — Gestion de caisse (gestion courante)

**Objet.** Document de transmission pour la branche/personne qui corrigera la
**gestion de caisse** : ouverture (fond de caisse), mouvements de caisse
manuels, clôture par la caissière (billetage), validation et annulation de
clôture, point de caisse. **Aucune correction n'est appliquée ici.**

**Sources.** Analyse directe du code au commit `b3b3c8f4` de
`claude/new-session-xm8ptu` : `CaisseServiceImpl.java`,
`BilletageServiceImpl.java`, `CaisseRessource.java`,
`BilletageServiceRessource.java`. Le rapport d'audit 01 (vente comptant) a déjà
établi VC-16 (mouvement de caisse antidaté) et des acquis repris ci-dessous.

**Acquis à préserver** (vérifiés) :
- ouverture refusée si une caisse est déjà ouverte ou un fond déjà attribué,
  avec messages explicites (`CaisseServiceImpl.java:2216-2224`) ;
- validation de clôture refusée sur une caisse en cours ou déjà validée
  (`closeCaisse`, `:729-735`) ; double **envoi successif** du billetage refusé
  (le premier passe le statut à `is_Progress`,
  `BilletageServiceImpl.java:225-228`) ;
- mouvement de caisse refusé caisse fermée, mode de règlement inexistant
  refusé (`createMvt`, `:767-775`) ;
- analyse des écarts de caisse disponible (retours du 10/10,
  `CaisseRessource`, « analyse-ecarts »).

---

## G1 — Clôture (billetage) : ni appartenance, ni verrou, ni recalcul du total (critique)

**Analyse.** `POST /billetage/cloture` (`BilletageServiceRessource.java:74-85`)
transmet le `resumeCaisseId` du corps à `cloturerCaisse`
(`BilletageServiceImpl.java:220-281`) avec pour seul contrôle la session :
1. **Appartenance non vérifiée** : le résumé clôturé peut être celui d'un
   **autre caissier** (appel direct) ; le solde calculé est pourtant écrit dans
   la `TCaisse` de **l'appelant** (`getUserCaisse(user)`, `:234-243`) — la
   caisse d'autrui est fermée et les soldes se mélangent.
2. **Aucun verrou, aucune version** (`TResumeCaisse`/`TBilletage` sans
   `@Version`, vérifié) : deux envois **simultanés** passent tous deux le
   contrôle `is_Progress` → lignes de résumé **doublées**
   (`setLigneResumeCaisses...add`, `:230-233`), **deux billetages** persistés
   (`doBilletage`, `:309-313`), solde du soir écrasé. L'annulation de clôture
   ne supprime ensuite qu'**un** billetage (`rollbackcloseCaisse` →
   `getTBilletageDetails`, un seul), l'autre reste orphelin.
3. **Total du billetage non recalculé** : `doBilletage` enregistre
   `billetageDTO.getTotal()` tel quel et les coupures à part
   (`:309-329`) — un total incohérent avec les coupures (bug d'écran, appel
   modifié) est accepté et devient le montant officiel du billetage.

**Reproduction.** 1) Deux POST `/billetage/cloture` simultanés (même corps) →
deux `TBilletage` pour le même résumé, lignes de résumé en double. 2) POST avec
`total` ≠ somme des coupures → enregistré tel quel. 3) POST avec le
`resumeCaisseId` d'un autre utilisateur → sa caisse est clôturée.

**Correction proposée.** Vérifier `resumeCaisse.lgUSERID = utilisateur appelant`
(ou privilège explicite de clôture pour autrui) ; relire le résumé sous
`PESSIMISTIC_WRITE` et re-tester le statut ; recalculer le total depuis les
coupures et refuser l'écart ; écrire le solde dans la `TCaisse` du
**propriétaire du résumé**.

## G2 — Mouvements de caisse manuels : montant libre, signe inversable, pas d'idempotence (critique)

**Analyse.** `createMvt` (`CaisseServiceImpl.java:763-804`) ne contrôle pas le
montant :
- **zéro ou négatif accepté** ; pour un type « sortie », le montant est
  multiplié par −1 (`:776-778`) : une **sortie saisie négative devient une
  entrée positive** (et inversement une entrée négative est enregistrée en
  débit avec un type « entrée ») — le point de caisse et le journal se
  contredisent ;
- aucune protection contre la **double soumission** (pas de verrou, pas de clé
  d'idempotence) : deux clics = deux mouvements identiques ;
- **dates** (VC-16, toujours présent, `:857`, `:882`) : la date saisie ne va
  que dans `t_mvt_caisse.dt_DATE_MVT` et `t_reglement`, la transaction reste au
  jour ; une date **future** est acceptée par appel direct.

**Reproduction.** « Mouvement de caisse », type sortie, montant `-5000` → le
tiroir gagne 5 000 au point de caisse. Double clic rapide sur Enregistrer →
deux mouvements.

**Correction proposée.** Refuser `montant ≤ 0` (le type porte le sens, jamais
le signe) ; borne haute paramétrable ; anti double-clic écran + contrainte
d'unicité courte côté serveur (utilisateur, type, montant, minute) ou jeton
d'idempotence ; refuser une date future et aligner les dates (règle unique,
chantier C7 du comptant).

## G3 — Annulation de clôture : possible même après validation, sans garde sur la période (majeure)

**Analyse.** `rollbackcloseCaisse` (`CaisseServiceImpl.java:670-721`) ne refuse
que deux cas : résumé encore `is_Using`, ou utilisateur ayant déjà une caisse
ouverte. Une clôture **déjà validée** (`is_Closed` par `closeCaisse`) est donc
annulable ; le billetage est supprimé (perte de la pièce comptable), le résumé
repasse `is_Using` avec sa **date d'ouverture d'origine** : la caisse rouverte
couvre alors plusieurs jours (le solde théorique est calculé d'ouverture à
maintenant, `SOLDE_SQL`, `BilletageServiceImpl.java:78-80`), et les éditions
déjà produites ne correspondent plus à rien. Seule la session est exigée côté
ressource (`CaisseRessource.java:168-178`).

**Correction proposée.** Refuser l'annulation d'une clôture **validée** (ou la
réserver à un privilège explicite avec motif journalisé) ; conserver le
billetage annulé (statut `annulé`) au lieu de le supprimer ; à la réouverture,
tracer l'événement dans le résumé.

## G4 — Solde théorique : héritier des écarts des ventes et des dates (majeure, transversal)

**Analyse.** Le solde attendu à la clôture est :
`SUM(vente_reglement.montant)` des ventes `is_Closed` du caissier avec
`p.dt_UPDATED` entre l'ouverture et maintenant (`SOLDE_SQL`, `:78-79`), plus
les mouvements manuels par `dt_CREATED` (`SOLDE_SQL_OTHERS`, `:80`). Il hérite
donc directement de :
- **VC-06/07/14** : `vente_reglement.montant` peut différer du net encaissé
  (remises mobiles, arrondis, montants du poste) → écarts de caisse
  « inexpliqués » ;
- **VC-12** : une vente d'un jour passé modifiée aujourd'hui est datée du jour
  d'origine → l'encaissement du jour n'apparaît pas dans la caisse du jour ;
- **VC-16** : un mouvement antidaté compte dans la caisse du jour
  (`dt_CREATED`) mais s'édite à une autre date.

**Correction proposée.** Pas de correctif local : c'est la **conséquence** des
chantiers C4/C7 (comptant) et A5/A6 (assurance/carnet). À inscrire comme test
de recette transversal : après ces chantiers, l'écart billetage/solde théorique
d'une journée de banc complète doit être nul.

## G5 — Attribution du fond de caisse : montant non contrôlé (mineure)

**Analyse.** `attribuerFondDeCaisse` (`CaisseServiceImpl.java:948-971`)
contrôle l'utilisateur (connecté, caisse fermée, pas de fond en attente) mais
**pas le montant** : zéro ou négatif accepté, enregistré et notifié tel quel ;
le solde du matin du résumé en héritera (`setIntSOLDEMATIN`).

**Correction proposée.** Refuser `montant ≤ 0` (et borne haute paramétrable)
dans le service — même garde dans `ouvrirCaisse` (`:2210-2241`) où le montant
du fond vient de l'écran.

## G6 — « Recette » ≠ « balance vente caisse » : les deux chiffres ne sont pas construits pareil (majeure — symptôme constaté en officine)

**Symptôme rapporté (02/11).** La recette affichée diffère parfois de la
balance vente caisse, alors qu'elles devraient être égales.

**Analyse.** Les deux écrans ne lisent **ni la même table, ni les mêmes
montants, ni les mêmes dates** :
- la **recette** est écrite à chaque clôture dans `t_recettes` avec le
  **`montantPaye` envoyé par le poste** (`addRecette`, appels
  `SalesServiceImpl.java:2831` (assurance), `:3186` (comptant), `:4174`
  (dépôt)), puis le journal recette lit un **snapshot journalier figé**
  (`TSnapShopDalyRecette`, `webservices/sm_user/journalrecette/ws_data.jsp:96`,
  construit par `bll/teller/SnapshotManager`) ;
- la **balance vente caisse** recalcule en direct depuis `mvttransaction`
  (`montantRegle`/`montantPaye`/`montantNet` par `mvtDate`,
  `BalanceServiceImpl.java:73-119`, `CaisseServiceImpl.balanceVenteCaisse`
  `:2031-2046`).

D'où quatre sources d'écart, toutes déjà prouvées par ailleurs :
1. **Vente VO avec remise** (CR-05) : `montantRegle` est sous-évalué de la
   remise à la clôture, la recette reçoit le `montantPaye` → écart égal à la
   remise sur chaque vente concernée.
2. **Net ≠ encaissé** (VC-06 mobile, VC-07 arrondi à 5 F, VC-14 montants du
   poste) : la recette porte l'encaissé, la balance le net/réglé → écarts de
   1-2 F par vente remisée, 10 % sur une prévente remisée encaissée au mobile.
3. **Dates divergentes** (VC-12) : annulation ou modification d'une vente d'un
   jour passé → la transaction négative **et** la recette négative sont
   antidatées au jour d'origine (`copyRecette`,
   `SalesServiceImpl.java:1046-1051` : `dtCREATED = dt_UPDATED de la vente
   clonée`, montant × −1) mais la recette **positive** de la nouvelle vente est
   datée du jour (`addRecette` → `new Date()`) ; de plus la recette
   d'annulation complémentaire n'est créée **que si la caisse du caissier
   d'origine est fermée** (`:733`). Le jour J de la balance et le jour J de la
   recette ne reçoivent donc pas les mêmes composantes.
4. **Snapshot figé** : toute opération postérieure à la construction du
   snapshot journalier (annulation tardive, modification antidatée) met à jour
   la balance recalculée mais pas le journal recette.

**Rapprochement (lecture seule — identifie la composante en écart, vente par
vente).**
```sql
SELECT p.str_REF, r.int_AMOUNT AS recette, m.montantPaye, m.montantRegle,
       m.mvtDate AS date_balance, DATE(r.dt_CREATED) AS date_recette
FROM t_recettes r
JOIN mvttransaction m      ON m.pkey = r.str_REF_FACTURE
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = m.pkey
WHERE r.int_AMOUNT <> m.montantPaye
   OR DATE(r.dt_CREATED) <> m.mvtDate
ORDER BY r.dt_CREATED DESC;
```

**Correction proposée.** Pas de rustine locale : l'égalité découle des
chantiers **C4/C7** (comptant : serveur autorité sur les montants, règle de
date unique) et **A5/A6** (VO/carnet : remise et `montantRegle`), plus une
décision sur le snapshot (le recalculer à l'affichage ou le rafraîchir après
toute opération antidatée). À inscrire en test de recette transversal :
**sur une journée de banc complète, recette = balance = billetage, au franc
près**, y compris après une annulation et une modification antidatées.

---

## Critères d'acceptation

1. Reproductions G1-G3/G5 d'abord en tests qui échouent (deux clôtures
   simultanées, clôture du résumé d'autrui, total ≠ coupures, sortie négative,
   double soumission, annulation d'une clôture validée, fond ≤ 0).
2. Invariants : un résumé de caisse a **au plus un** billetage actif ; total du
   billetage = somme des coupures ; un mouvement de caisse a le signe de son
   type ; une clôture validée est immuable (sauf privilège tracé) ; le solde
   écrit dans `TCaisse` appartient au propriétaire du résumé.
3. Aucune régression sur les acquis listés en tête (refus d'ouverture double,
   refus de validation double, refus caisse fermée, analyse des écarts).
4. Reprise des données (lecture seule d'abord) : billetages multiples pour un
   même résumé, billetages dont le total ≠ somme des coupures, mouvements de
   caisse de signe incohérent avec leur type, fonds de caisse ≤ 0 — à chiffrer
   puis arbitrer site par site.
