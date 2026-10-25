# Mécanismes à corriger dans le code — Assurances (tiers-payant)

**Objet.** Document de transmission pour la branche/personne qui corrigera le
**code**. Il décrit, mécanisme par mécanisme, ce qui fabrique les anomalies de
données décrites dans `REPRISE_DONNEES_ASSURANCES.md` (familles B1 à B6) :
l'analyse (emplacement exact), l'effet sur les données, comment le confirmer sur un
banc, la correction proposée et les points de vigilance. **Aucune correction n'est
appliquée ici** ; les emplacements sont vérifiés au commit `910c18f6` de
`claude/new-session-xm8ptu`.

**Règle métier de référence (confirmée).** Un client a **un seul RO (régime
obligatoire) actif à la fois** ; les complémentaires actives sont illimitées ;
**un carnet n'est jamais un RO** (type de tiers-payant carnet :
`lg_TYPE_TIERS_PAYANT_ID = '2'`, constante `TYPE_TIERS_PAYANT_CARNET_ID`).

**Ordre conseillé :** M1 → M2 → M3 → M4 (indépendants mais de risque croissant),
M5 en chantier de fond, M6 en défense en profondeur. La reprise des données
(`REPRISE_DONNEES_ASSURANCES.md`) ne se joue **qu'après** M1-M4, sinon elle se
recontamine à la première vente modifiée.

---

## M1 — Créer un carnet pour un client assuré remplace son assurance

**Analyse.** `updateCreateClientCarnet` (`ClientServiceImpl.java:1292`, endpoint
`client/add/carnet`, appelé par les écrans de vente carnet `VenteCtr.js` /
`DevisCtr.js`) : pour un client existant, il cherche son lien **priorité 1**
(`findByClientTiersPayantId(clientId, 'enable', 1)`, `:1010`) — c'est-à-dire son
assurance — puis, le carnet étant différent, appelle `updateClientCarnet`
(`:1195-1200`) qui :
1. crée le lien carnet via `createComptClientTierspayant(ClientDTO…)` (`:803`),
   lequel force **`b_IS_RO = TRUE`** (`:807`) quel que soit le tiers-payant ;
2. **désactive le lien assurance** (`desabledCompteClientTiersPayant`,
   `:1209-1213` : statut `delete`, priorité −1).

**Effet.** Le client perd son assurance et son carnet devient son RO — le cas
rapporté en production (« un compte carnet en tant que RO »). Alimente B3.

**Confirmation (banc).** R1 : client avec une assurance active → écran de vente
carnet → créer/associer un carnet à ce client → en base : lien assurance `delete`
priorité −1, lien carnet `enable` RO=1.

**Correction proposée.**
- Dans `updateClientCarnet` (4 arguments) : ne désactiver l'ancien lien **que s'il
  est lui-même un carnet** (changement de carnet). Si c'est une assurance, la
  conserver telle quelle ; le lien carnet prend la **priorité libre suivante** du
  compte (pas la 1, sinon les recherches par priorité 1 deviennent ambiguës).
- Dans `createComptClientTierspayant(ClientDTO…)` (`:803`) : `b_IS_RO = FALSE` si
  le tiers-payant est de type carnet.

**Vigilance.** Clients « purement carnet » (aucune assurance) : leur lien carnet
reste trouvé par priorité 1 et les écrans carnet n'exploitent pas `b_IS_RO` —
comportement inchangé. Vérifier `findCompteClientTiersPayantByClientId` (filtre
priorité 1) après coup.

---

## M2 — Le flux de vente empile les RO sans désactiver l'ancien

**Analyse.** `updateOrCreateClientAssurance(TClient, TTiersPayant, int)`
(`:1435-1442`) : décale les priorités de **tous** les liens
(`updateComptClientTierspayantPriority`, `:1403-1409`, y compris les liens
`delete`) puis crée un **nouveau lien RO=TRUE priorité 1**
(`createComptClientTierspayant` paramétrique, `:1411-1436`) **sans jamais
désactiver le RO existant**. Appelée par la modification de vente :
`updateCompteClientVenteCarner` (`SalesServiceImpl.java:5388`, appel `:5407` —
y compris pour un **carnet**, donc lien carnet RO=1 priorité 1) et
`clonePreenregistrementTp` (`:5504`).

**Effet.** Comptes à plusieurs RO actifs : le client apparaît chez plusieurs
assurances (B1) ; carnets RO=1 (B3).

**Confirmation.** R2 : modifier une vente en désignant un tiers-payant non encore
rattaché au client → le client a deux liens RO actifs. R2bis : même chose sur une
vente carnet → le lien carnet est créé RO=1 priorité 1.

**Correction proposée.** Dans `createComptClientTierspayant` paramétrique
(point de passage des trois appelants) :
- si le tiers-payant est un carnet → `isRO = false` ;
- si `isRO` → **désactiver d'abord les liens RO actifs du compte** (même geste que
  l'écran client, qui fait déjà la paire création + désactivation à `:1269`),
  en épargnant le lien éventuellement réutilisé (voir M3).

**Vigilance.** L'écran « fiche client » (`updateOrCreateClientAssurance(ClientDTO)`)
désactive déjà l'ancien RO : la correction ne doit pas désactiver deux fois ni
toucher les complémentaires (RO=0).

---

## M3 — Le clonage d'un lien désactivé ressuscite des fantômes

**Analyse.** `updateOrCreateClientAssurance(TClient, TTiersPayant, int,
TCompteClientTiersPayant old)` (`:1444-1448`) crée un lien neuf en **copiant
`old.getBISRO()` et `old.getIntPRIORITY()`**, même si `old` est un lien `delete`
(priorité −1). Appelée par la modification de vente multi-tiers-payants
(`SalesServiceImpl.java:5501`) quand la ligne de vente pointe encore un lien
désactivé.

**Effet.** Lien recréé `enable` **priorité −1** : invisible des écrans (qui
cherchent la priorité 1) mais actif en base ; un tiers-payant retiré du client
revient tout seul. Cas prouvé en production (lien FADIGA recréé le 16/07/2026 sur
COULIBALY avec le taux d'une autre assurance). Alimente B4, B2 et le phénomène
« le même tiers-payant se retrouve sur plein de clients ».

**Confirmation.** R3 : vente multi-TP dont une ligne référence un lien désactivé →
modifier la vente → un nouveau lien `enable` priorité −1 apparaît.

**Correction proposée.** Toujours dans `createComptClientTierspayant`
paramétrique :
- **un seul lien par (compte, tiers-payant)** : si un lien existe déjà (actif ou
  désactivé), le **réutiliser/réactiver** (mettre à jour taux, matricule, statut)
  au lieu d'insérer un doublon ;
- **jamais de priorité < 1** : si l'ordre reçu est < 1, prendre la priorité active
  suivante du compte ;
- si `old` est `delete`, ne pas hériter de son RO : créer/réactiver en
  complémentaire (RO=0).

**Vigilance.** La réutilisation d'un lien préserve l'historique : les attributions
de ventes (`t_preenregistrement_compte_client_tiers_payent`) pointent déjà ce lien.

---

## M4 — `updateTiersPayantPriority` rebascule le RO en silence

**Analyse.** Appelée après **chaque** modification de vente
(`SalesServiceImpl.java` → `updateVenteInfosClientOrtierspayant`),
`updateTiersPayantPriority` (`ClientServiceImpl.java:1858-1900`) :
1. promeut `RO=TRUE` priorité 1 le lien correspondant au paramètre coché
   « principal » à l'écran — or cette case est **pré-cochée d'après la priorité**
   (`TiersPayantParams.java:195` et `:255` : `principal = int_PRIORITY == 1` ;
   formulaire `UpdateVenteClientTpForm.js:418` pré-cochage, `:1377` envoi). Un
   carnet qui a pris la priorité 1 (M1/M2) devient donc RO **sans action de la
   caissière** ;
2. si **aucun** lien ne correspond au « principal » envoyé, la première boucle ne
   retient rien et la seconde passe **tous les liens du client à RO=FALSE** — le
   client perd son RO ;
3. la liste traitée (`getClientTiersPayants`) inclut les liens **`delete`**, qui
   sont reclassés avec les actifs.

**Effet.** Bascules de RO inexpliquées (B1/B3), clients sans RO, priorités
corrompues.

**Confirmation.** R4 : client dont le carnet a la priorité 1 → ouvrir la
modification d'une de ses ventes → ne rien changer → enregistrer → le carnet est
RO=1, l'assurance RO=0.

**Correction proposée.**
- ne traiter que les liens `enable` ;
- si aucun lien ne correspond au « principal » : **ne rien toucher** (sortir) ;
- si le lien désigné est un **carnet** : ne pas toucher aux flags RO (sortir) ;
- sinon : lui donner RO=TRUE priorité 1 et RO=FALSE aux autres (comportement
  actuel conservé pour le cas légitime).

**Vigilance.** C'est le filet de sécurité final : même corrigée ailleurs, une
priorité historique corrompue (données non reprises) déclenche la bascule. Tester
avec des données sales (carnet en priorité 1, liens delete présents).

---

## M5 — Chantier de fond : « principal » = priorité au lieu de `b_IS_RO`

**Analyse.** Plusieurs chemins identifient le RO par `int_PRIORITY == 1` et non
par `b_IS_RO` : `findByClientTiersPayantId(client, statut, 1)` (`:1010`, utilisé
par `updateCreateClientCarnet` et `updateOrCreateClientAssurance(ClientDTO)`),
`findCompteClientTiersPayantByClientId` (filtre priorité 1),
`TiersPayantParams` (`:195`, `:255`). Dès que priorité et `b_IS_RO` divergent
(ce que M1-M4 produisent), chaque écran « voit » un RO différent.

**Correction proposée (après M1-M4).** Déterminer le RO par
`b_IS_RO = 1 AND statut = 'enable' AND type ≠ carnet` partout ; réserver la
priorité à l'ordre d'affichage. À traiter comme un chantier transversal avec ses
propres tests (fiche client, vente, modification, carnet).

---

## M6 — Défense en profondeur (optionnel mais recommandé)

Aucune création/bascule de lien n'est tracée aujourd'hui : quand une anomalie
apparaît, on ne sait ni quand ni par quel écran. Proposition :
- **table d'audit** `t_cctp_audit` + triggers `AFTER INSERT/UPDATE` sur
  `t_compte_client_tiers_payant` journalisant les changements de statut, RO,
  priorité, tiers-payant, compte (coût : quelques écritures par jour, aucune sur
  la validation de vente ordinaire) ;
- **log applicatif** avec pile d'appel sur chaque création/désactivation/
  reclassement de lien, pour relier l'événement à l'écran.

---

## Implémentations de référence (à porter, PAS à fusionner)

La branche **`differe`** (jamais fusionnée, base de juillet 2026) contient des
implémentations éprouvées de M1-M4 et M6 dans `ClientServiceImpl` :
- `8f1c21f5` : un seul RO actif (désactivation de l'ancien RO à la création) ;
- `2b12a292` : garde-fous carnet (jamais RO, assurance conservée), réécriture de
  `updateTiersPayantPriority` (liens actifs seuls, aucun match → ne rien faire,
  carnet ignoré), traçage `[TRACE_ASSURANCE]`, migration d'audit `t_cctp_audit` ;
- `8b0eebf1` : anti-résurrection/anti-doublon (un lien par compte et tiers-payant,
  priorité jamais < 1, réutilisation du lien existant).

**Attention :** ne pas fusionner la branche `differe` telle quelle — elle porte
aussi d'anciens correctifs **différés** aujourd'hui remplacés par
`ReglementDiffereControle` sur cette branche (risque de régression). Porter
uniquement les changements de `ClientServiceImpl` (et la migration d'audit, en la
renumérotant), en les adaptant au code actuel.

---

## Critères d'acceptation

1. Conformément aux règles du projet : chaque mécanisme est d'abord **reproduit par
   un test qui échoue** (R1 à R4 ci-dessus), puis corrigé ; les tests passent par le
   vrai chemin de l'écran et retirent leurs données.
2. Après correctifs, les requêtes **B1, B3 et B4** de
   `REPRISE_DONNEES_ASSURANCES.md` ne produisent **aucune ligne nouvelle**
   (`dt_CREATED`/`dt_UPDATED` postérieurs au déploiement) sur un banc où l'on
   rejoue R1-R4.
3. Aucune régression sur : création de client assuré, création de client carnet
   pur, changement d'assurance depuis la fiche client (`:1269`, déjà correct),
   vente carnet, vente assurance multi-tiers-payants.
4. Ensuite seulement : reprise des données (`REPRISE_DONNEES_ASSURANCES.md`,
   ordre B3 → B2 → B1 → B4 → B5/B6).
