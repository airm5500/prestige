# Mécanismes à corriger dans le code — Litiges (tiers-payant)

**Objet.** Document de transmission pour la branche/personne qui corrigera le
**menu Litiges** (gestion courante / configuration : litiges sur dossiers
tiers-payant facturés). **Aucune correction n'est appliquée ici.**

**Sources.** Analyse directe du code au commit `b3b3c8f4` de
`claude/new-session-xm8ptu` (pas de rapport d'audit antérieur sur ce module).
Pièces : écrans `view/configmanagement/litige/*` (ExtJS), services JSP
`webservices/configmanagement/litige/ws_data.jsp`, `ws_transaction.jsp`,
`ws_transaction2.jsp`, back `bll/configManagement/LitigeManager.java` et
`com/asc/prestige2/business/litiges/concrete/PrestigeLitige.java`, entités
`TLitige`/`TTypelitige`.

**Constat d'ensemble.** Le module est en **code historique JSP** (contraire à la
règle du projet « tout nouveau travail passe par les API REST ») et surtout il
est **à l'abandon fonctionnel** : les blocs métier du gestionnaire principal
sont **commentés dans le code**. En l'état, créer un litige sort
définitivement le dossier de la facturation sans créer de litige exploitable,
et ni la suppression ni la clôture ne font ce qu'elles affichent. Deux
générations de code coexistent sur le même écran et écrivent dans la même
table avec des champs différents.

---

## L1 — Créer un litige : enregistrement vide, dossier sorti de la facturation sans retour possible (critique)

**Analyse.** `ws_transaction.jsp` (mode `create`) → `LitigeManager.createLitige`
(`LitigeManager.java:61-108`) :
1. le bloc qui remplit le litige est **entièrement commenté** (`:82-91`) : le
   `TLitige` persisté n'a qu'un identifiant — **ni nom, ni type, ni statut, ni
   montants, ni `strREFCREATED`** (le lien vers la ligne de vente) ;
2. la ligne tiers-payant de la vente est pourtant basculée
   `str_STATUT_FACTURE = 'is_Litige'` (`:93-96`).

Or `is_Litige` n'est connu **nulle part ailleurs** dans le dépôt (vérifié :
une seule référence, dans `LitigeManager`). Conséquences :
- le dossier disparaît de la facturation (filtres `unpaid`) et de tous les
  écrans ;
- le litige créé est invisible des listes (statut nul, filtres
  `enable`/`is_Closed` de `listTLitigeByTypeLitige`, `:143-146`) ;
- la clôture est **impossible** : elle retrouve le litige par
  `strREFCREATED = référence de la ligne` (`closureLitige`, `:365-367`), qui
  n'est jamais renseigné → `getSingleResult` échoue → les deux clôtures
  (`closureLitigeWithRemboursement`, `closureLitigeWithoutRemboursement`)
  n'exécutent jamais leurs mises à jour.

**Reproduction.** Écran Litiges → créer un litige sur un dossier facturé non
réglé → le dossier sort de « Éditer facture » ; la table `t_litige` porte une
ligne presque vide ; aucune clôture ne le ramène.

**Détection (lecture seule).**
```sql
-- dossiers sortis du circuit par un litige
SELECT c.lg_PREENREGISTREMENT_COMPTECLIENT_PAYENT_ID, c.int_PRICE, c.dt_UPDATED, p.str_REF
FROM t_preenregistrement_compte_client_tiers_payent c
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = c.lg_PREENREGISTREMENT_ID
WHERE c.str_STATUT_FACTURE = 'is_Litige';
-- litiges vides (créés depuis la mise en commentaire du code)
SELECT * FROM t_litige WHERE str_STATUT IS NULL OR str_REF_CREATED IS NULL;
```

**Correction proposée.** Restaurer (réécrire) le remplissage du litige :
statut `enable`, type, montants, `strREFCREATED` = référence de la ligne —
dans un service REST transactionnel, pas dans la JSP. Reprise des données :
pour chaque ligne `is_Litige` sans litige exploitable, arbitrer (retour
`unpaid` ou clôture tracée).

## L2 — Supprimer et clôturer un litige : les écritures métier sont commentées (critique)

**Analyse.**
- `deleteLitige` (`:112-126`) : les lignes `setStrSTATUT(delete)` /
  `setDtUPDATED` sont **commentées** (`:116-117`) — la méthode re-persiste
  l'entité inchangée et répond « succès ». La suppression ne fait rien, et ne
  restaure pas la ligne de vente.
- `closureLitige` (`:361-384`) : montant, écart, statut `is_Closed`, libellé de
  traitement — **tout est commenté** (`:368-375`). Le litige reste `enable`
  pour toujours.

**Conséquence aggravante.** Pour les **anciens** litiges (créés quand
`strREFCREATED` était rempli), `closureLitigeWithRemboursement` (`:303-331`)
fonctionne, et comme le litige n'est jamais clos, elle est **rejouable à
volonté** : à chaque rejeu elle réécrit `int_PRICE` et `int_PRICE_RESTE` de la
ligne avec le montant saisi et la repasse `unpaid` → la part refacturable est
réécrite sans limite.

**Correction proposée.** Rétablir les transitions d'état (suppression =
`delete` + restauration de la ligne ; clôture = litige `is_Closed` + écart) ;
rendre la clôture **idempotente** (refus si litige déjà clos).

## L3 — Clôture avec remboursement : montant libre, sans aucun contrôle (critique)

**Analyse.** `closureLitigeWithRemboursement` (`:303-331`) écrit
`int_PRICE = int_PRICE_RESTE = int_AMOUNT` et repasse la ligne `unpaid`. Le
montant vient de `ws_transaction.jsp` (`Integer.parseInt` sans garde, `:49-52`) :
**zéro, négatif ou supérieur à la part d'origine sont acceptés** — la part
refacturable à l'organisme devient une saisie libre. La variante « sans
remboursement » (`:335-359`) met la part à 0 et `is_Closed` : la créance est
effacée **sans contrepartie tracée** (ni avoir, ni perte, ni ajustement
d'encours).

**Correction proposée.** Côté serveur : `0 < montant ≤ part d'origine`
(conserver la part d'origine sur le litige pour la borne) ; tracer l'abandon
(montant, motif, utilisateur) ; ajuster les compteurs d'encours en cohérence
avec le chantier A1 (notice ventes assurance/carnet).

## L4 — Éligibilité et doublons de création (majeure)

**Analyse.** La requête d'éligibilité (`:73-76`) vérifie seulement « facturé et
non réglé » (via `TFactureDetail` hors `TDossierReglementDetail`) :
- elle ne filtre pas une ligne **déjà en litige** → recréer un litige sur le
  même dossier passe (nouvelle bascule + nouveau `TLitige` vide) ;
- produit cartésien + `list.get(0)` : si la vente porte plusieurs lignes pour
  le même organisme, la ligne traitée est arbitraire ;
- la vente annulée n'est pas exclue.

**Correction proposée.** Refuser si `str_STATUT_FACTURE` n'est pas
`charged`/`unpaid` attendu, exclure les ventes annulées, cibler la ligne par
identifiant explicite (l'écran l'a).

## L5 — Deux générations de code sur le même écran, infrastructure JSP partagée (majeure)

**Analyse.**
- `ws_transaction.jsp` (ancienne génération → `LitigeManager`, agit sur les
  lignes de vente) et `ws_transaction2.jsp` (nouvelle → `PrestigeLitige`,
  **purement déclarative** : elle enregistre libellé/état/conséquence et ne
  touche jamais les lignes) écrivent dans la même table `t_litige` avec des
  champs différents. Selon le bouton utilisé, un « litige » a ou non un effet
  sur la facturation.
- `PrestigeLitige.deleteLitige` (`PrestigeLitige.java:81-88`) fait `em.remove`
  **hors transaction** (`BeginTransaction` n'existe que dans les créations) :
  la suppression n'est jamais commitée ; `em.contains` après remove renvoie
  faux ; litige introuvable → `getSingleResult` lève une exception.
- `ws_transaction.jsp` déclare `dataManager OdataManager` en **champ de
  servlet** (`<%! %>`, `:19`) : une seule instance partagée par toutes les
  requêtes — deux utilisateurs simultanés partagent le même EntityManager
  (même famille d'anomalie que CA-03). `PrestigeLitige` crée un EntityManager
  par requête sans jamais le fermer. `Integer.parseInt` et l'utilisateur de
  session ne sont pas gardés (erreur 500 brute).

**Correction proposée.** Porter le module entier en **API REST** (règle du
projet), un seul service transactionnel, une seule écriture de `t_litige`,
privilège dédié ; retirer les deux JSP du circuit (sans les supprimer).

---

## Critères d'acceptation

1. Chaque mécanisme d'abord reproduit par un test qui échoue (création →
   litige complet et dossier marqué ; suppression → restauration ; clôture →
   litige clos, non rejouable, montant borné).
2. Invariants : un dossier en litige est toujours rattaché à un litige
   exploitable (jamais de ligne `is_Litige` orpheline) ; clôture avec
   remboursement ⇒ `0 < montant ≤ part d'origine` ; clôture sans
   remboursement ⇒ abandon tracé ; un litige clos ne se rejoue pas.
3. Reprise des données (lecture seule d'abord, correction manuelle) : lignes
   `is_Litige` orphelines (requête L1), litiges vides, litiges `enable`
   anciens à solder.
4. Aucune régression sur la facturation : les filtres `unpaid`/`charged`
   doivent continuer d'exclure les dossiers en litige **tant qu'ils le sont**.
