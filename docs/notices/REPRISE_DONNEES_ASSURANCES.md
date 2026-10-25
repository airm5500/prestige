# Reprise des données historiques — Assurances (tiers-payant)

**Objet.** Des clients se retrouvent rattachés à plusieurs assurances, un compte
carnet devient le régime obligatoire (RO) d'un client assuré, des liens désactivés
« ressuscitent », des liens s'accumulent sans aucune vente. Ce document est destiné
à la personne/branche qui prend en charge la reprise : pour chaque famille,
**l'analyse** (origine dans le code, vérifiée au commit `540277cf` de
`claude/new-session-xm8ptu`), **la confirmation** (requêtes d'affichage et de
consolidation, lecture seule) et **la proposition de correction** (script à
exécuter **manuellement**).

**Règle métier (confirmée par le métier).** Un client a **un seul RO actif à la
fois** ; il peut avoir autant de complémentaires actives que voulu ; **un carnet
n'est jamais un RO**.

**Chiffres déjà constatés** (site audité, requêtes des 22-24/10/2026, lecture
seule) : **163 liens actifs en double** (même client, même assurance) sur 155
comptes, dont 106 MUGEF-CI ; **496 liens actifs sans aucune vente**, dont ~160
imports de 2017-2019 (dormants, à laisser) et **172 liens RO créés en 2025-2026** ;
**3 liens actifs à priorité < 1** (signature du clonage de lien désactivé, dont le
cas FADIGA/COULIBALY du 16/07/2026 : lien ressuscité `enable`, priorité −1, taux 70
d'une autre assurance). Le nombre de comptes **multi-RO** n'a pas encore été chiffré
(requête B1 ci-dessous). Chaque site doit être re-mesuré.

---

## Analyse : d'où viennent ces données (code vérifié au commit `540277cf`)

1. **Un carnet remplace l'assurance du client.** Créer/modifier un carnet pour un
   client déjà assuré passe par `updateClientCarnet`
   (`ClientServiceImpl.java:1195-1200`) : le lien carnet est créé **RO=1**
   (`createComptClientTierspayant(ClientDTO…)`, `:803-807`, `setBISRO(TRUE)`
   systématique) puis **le lien assurance est désactivé**
   (`desabledCompteClientTiersPayant(old)` : statut `delete`, priorité −1). C'est le
   cas rapporté « un compte carnet en tant que RO ».
2. **Accumulation de RO.** Le flux de vente (`updateOrCreateClientAssurance(TClient,
   p, taux)`, `:1438-1443`) crée un **nouveau lien RO priorité 1** et se contente de
   décaler les priorités des liens existants (`updateComptClientTierspayantPriority`,
   `:1403-1409`) **sans jamais désactiver l'ancien RO** → plusieurs RO actifs, le
   client apparaît chez plusieurs assurances.
3. **Résurrection de fantômes.** La variante à 4 arguments (`:1904-1908`) clone
   **le RO et la priorité d'un ancien lien, même désactivé**
   (`old.getBISRO(), old.getIntPRIORITY()`) → lien recréé `enable` avec priorité −1,
   invisible des écrans qui cherchent la priorité 1 mais actif en base.
4. **Bascule silencieuse du RO.** Après chaque modification de vente,
   `updateTiersPayantPriority` (`:1858-1900`) promeut RO=1 le lien coché
   « principal » à l'écran — case **pré-cochée d'après la priorité**
   (`TiersPayantParams` : `principal = int_PRIORITY == 1`), donc un carnet qui a
   volé la priorité 1 devient officiellement RO sans action de la caissière ; si
   aucun lien ne correspond, **tous** les liens passent RO=0 ; les liens `delete`
   sont reclassés aussi.
5. Les liens sont créés **indépendamment des ventes** (la vente peut être recorrigée
   ensuite) → liens actifs à zéro vente.

**Important pour la branche en charge :** des correctifs applicatifs de ces
mécanismes existent sur la branche `differe` (jamais fusionnée) ; sur
`claude/new-session-xm8ptu` rien n'est encore corrigé. **Tant que le code n'est pas
corrigé, toute reprise se recontamine** : corriger le code d'abord, reprendre les
données ensuite.

---

## Règles d'exécution (identiques à la reprise différés)

1. Jamais d'écriture automatique ; blocs « CORRECTION » exécutés à la main après
   lecture des blocs « AFFICHAGE » et « CONSOLIDATION ».
2. D'abord sur la copie locale `laborex_v1_db` (sauvegardée), puis en production
   après **sauvegarde complète**, dans une **transaction** (contrôle du nombre de
   lignes avant `COMMIT`).
3. **Ordre imposé : B3 → B2 → B1 → B4 → B5/B6.** (On retire d'abord le flag RO des
   carnets, on dédoublonne, puis on résout les multi-RO ; sinon la règle « garder le
   RO le plus récent » peut garder un carnet ou un doublon.)
4. Table de traçabilité :

```sql
CREATE TABLE IF NOT EXISTS reprise_assurances_rapport (
    id            BIGINT NOT NULL AUTO_INCREMENT,
    dt_EVENT      DATETIME NOT NULL,
    type_anomalie VARCHAR(40) NOT NULL,     -- B1..B6
    lien          VARCHAR(255) NULL,        -- t_compte_client_tiers_payant concerne
    compte        VARCHAR(255) NULL,
    client        VARCHAR(255) NULL,
    detail        VARCHAR(255) NULL,
    action        VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

---

## B3 — Carnets marqués RO, assurances débranchées au profit d'un carnet

**AFFICHAGE 1 : liens carnet actifs portant RO=1** (tous anormaux, règle métier).
```sql
SELECT ccl.lg_COMPTE_CLIENT_ID AS compte,
       CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME) AS client,
       tp.str_NAME AS carnet_en_ro, cctp.int_PRIORITY,
       cctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AS lien, cctp.dt_CREATED, cctp.dt_UPDATED
FROM t_compte_client_tiers_payant cctp
JOIN t_tiers_payant tp   ON tp.lg_TIERS_PAYANT_ID = cctp.lg_TIERS_PAYANT_ID
JOIN t_compte_client ccl ON ccl.lg_COMPTE_CLIENT_ID = cctp.lg_COMPTE_CLIENT_ID
JOIN t_client cl         ON cl.lg_CLIENT_ID = ccl.lg_CLIENT_ID
WHERE cctp.str_STATUT = 'enable' AND cctp.b_IS_RO = 1
  AND tp.lg_TYPE_TIERS_PAYANT_ID = '2'
ORDER BY cctp.dt_UPDATED DESC;
```

**AFFICHAGE 2 : assurances désactivées sur des comptes ayant un carnet actif**
(traces probables du mécanisme 1 ; corréler `desactivee_le` ~ `carnet_cree_le`).
```sql
SELECT ccl.lg_COMPTE_CLIENT_ID AS compte,
       CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME) AS client,
       tpa.str_NAME AS assurance_desactivee, a.dt_UPDATED AS desactivee_le,
       a.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AS lien_assurance,
       tpc.str_NAME AS carnet_actif, c.dt_CREATED AS carnet_cree_le
FROM t_compte_client_tiers_payant a
JOIN t_tiers_payant tpa  ON tpa.lg_TIERS_PAYANT_ID = a.lg_TIERS_PAYANT_ID
                        AND tpa.lg_TYPE_TIERS_PAYANT_ID <> '2'
JOIN t_compte_client_tiers_payant c
                         ON c.lg_COMPTE_CLIENT_ID = a.lg_COMPTE_CLIENT_ID
                        AND c.str_STATUT = 'enable'
JOIN t_tiers_payant tpc  ON tpc.lg_TIERS_PAYANT_ID = c.lg_TIERS_PAYANT_ID
                        AND tpc.lg_TYPE_TIERS_PAYANT_ID = '2'
JOIN t_compte_client ccl ON ccl.lg_COMPTE_CLIENT_ID = a.lg_COMPTE_CLIENT_ID
JOIN t_client cl         ON cl.lg_CLIENT_ID = ccl.lg_CLIENT_ID
WHERE a.str_STATUT = 'delete'
ORDER BY a.dt_UPDATED DESC;
```

**CONSOLIDATION.** `SELECT COUNT(*)` sur chacun des deux affichages.

**CORRECTION (partie sûre) : retirer le flag RO des carnets actifs.**
```sql
START TRANSACTION;
INSERT INTO reprise_assurances_rapport (dt_EVENT, type_anomalie, lien, compte, action)
SELECT NOW(), 'B3', cctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID, cctp.lg_COMPTE_CLIENT_ID,
       'Carnet : flag RO retire (un carnet n est jamais RO)'
FROM t_compte_client_tiers_payant cctp
JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = cctp.lg_TIERS_PAYANT_ID
WHERE cctp.str_STATUT = 'enable' AND cctp.b_IS_RO = 1 AND tp.lg_TYPE_TIERS_PAYANT_ID = '2';

UPDATE t_compte_client_tiers_payant cctp
JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = cctp.lg_TIERS_PAYANT_ID
SET cctp.b_IS_RO = 0, cctp.dt_UPDATED = NOW()
WHERE cctp.str_STATUT = 'enable' AND cctp.b_IS_RO = 1 AND tp.lg_TYPE_TIERS_PAYANT_ID = '2';
-- COMMIT; (ou ROLLBACK;)
```

**CORRECTION (arbitrage) : ré-activer l'assurance débranchée.** Cas par cas sur la
liste de l'affichage 2 (le client est-il toujours assuré là-bas ?). Modèle par
ligne validée :
```sql
START TRANSACTION;
INSERT INTO reprise_assurances_rapport (dt_EVENT, type_anomalie, lien, action)
VALUES (NOW(), 'B3', '<lien_assurance>', 'Assurance reactivee (debranchee par creation carnet)');
UPDATE t_compte_client_tiers_payant
SET str_STATUT = 'enable', b_IS_RO = 1, int_PRIORITY = 1, dt_UPDATED = NOW()
WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '<lien_assurance>';
COMMIT;
```
*(Ne ré-activer en RO que si le compte n'a pas d'autre RO actif — contrôler avec
B1 ; sinon laisser B1 trancher ensuite.)*

---

## B2 — Doublons : plusieurs liens actifs vers la même assurance

**AFFICHAGE** (lien qui sera désactivé : on garde par (compte, assurance) le lien
RO, sinon le plus récemment mis à jour, départage par identifiant).
```sql
SELECT a.lg_COMPTE_CLIENT_ID AS compte,
       CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME) AS client,
       tp.str_NAME AS assurance, a.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AS lien_a_desactiver,
       a.int_POURCENTAGE, a.b_IS_RO, a.dt_CREATED
FROM t_compte_client_tiers_payant a
JOIN t_compte_client_tiers_payant b
      ON b.lg_COMPTE_CLIENT_ID = a.lg_COMPTE_CLIENT_ID
     AND b.lg_TIERS_PAYANT_ID = a.lg_TIERS_PAYANT_ID
     AND b.str_STATUT = 'enable'
     AND b.lg_COMPTE_CLIENT_TIERS_PAYANT_ID <> a.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
     AND ( COALESCE(b.b_IS_RO,0) > COALESCE(a.b_IS_RO,0)
           OR ( COALESCE(b.b_IS_RO,0) = COALESCE(a.b_IS_RO,0)
                AND ( COALESCE(b.dt_UPDATED,b.dt_CREATED) > COALESCE(a.dt_UPDATED,a.dt_CREATED)
                      OR ( COALESCE(b.dt_UPDATED,b.dt_CREATED) = COALESCE(a.dt_UPDATED,a.dt_CREATED)
                           AND b.lg_COMPTE_CLIENT_TIERS_PAYANT_ID > a.lg_COMPTE_CLIENT_TIERS_PAYANT_ID ) ) ) )
JOIN t_compte_client ccl ON ccl.lg_COMPTE_CLIENT_ID = a.lg_COMPTE_CLIENT_ID
JOIN t_client cl         ON cl.lg_CLIENT_ID = ccl.lg_CLIENT_ID
JOIN t_tiers_payant tp   ON tp.lg_TIERS_PAYANT_ID = a.lg_TIERS_PAYANT_ID
WHERE a.str_STATUT = 'enable'
ORDER BY a.lg_COMPTE_CLIENT_ID;
```
*(Un lien peut apparaître deux fois quand un compte a 3 liens ou plus vers la même
assurance : compter les liens **distincts**.)*

**CONSOLIDATION.**
```sql
SELECT COUNT(*) AS nb_comptes, SUM(x.nb_liens - 1) AS liens_en_trop FROM (
  SELECT lg_COMPTE_CLIENT_ID, lg_TIERS_PAYANT_ID, COUNT(*) AS nb_liens
  FROM t_compte_client_tiers_payant
  WHERE str_STATUT = 'enable'
  GROUP BY lg_COMPTE_CLIENT_ID, lg_TIERS_PAYANT_ID
  HAVING COUNT(*) > 1
) x;
```

**CORRECTION.** Même jointure que l'affichage :
```sql
START TRANSACTION;
INSERT INTO reprise_assurances_rapport (dt_EVENT, type_anomalie, lien, compte, action)
SELECT DISTINCT NOW(), 'B2', a.lg_COMPTE_CLIENT_TIERS_PAYANT_ID, a.lg_COMPTE_CLIENT_ID,
       'Doublon desactive (un seul lien par compte et assurance)'
FROM t_compte_client_tiers_payant a
JOIN t_compte_client_tiers_payant b
      ON b.lg_COMPTE_CLIENT_ID = a.lg_COMPTE_CLIENT_ID
     AND b.lg_TIERS_PAYANT_ID = a.lg_TIERS_PAYANT_ID
     AND b.str_STATUT = 'enable'
     AND b.lg_COMPTE_CLIENT_TIERS_PAYANT_ID <> a.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
     AND ( COALESCE(b.b_IS_RO,0) > COALESCE(a.b_IS_RO,0)
           OR ( COALESCE(b.b_IS_RO,0) = COALESCE(a.b_IS_RO,0)
                AND ( COALESCE(b.dt_UPDATED,b.dt_CREATED) > COALESCE(a.dt_UPDATED,a.dt_CREATED)
                      OR ( COALESCE(b.dt_UPDATED,b.dt_CREATED) = COALESCE(a.dt_UPDATED,a.dt_CREATED)
                           AND b.lg_COMPTE_CLIENT_TIERS_PAYANT_ID > a.lg_COMPTE_CLIENT_TIERS_PAYANT_ID ) ) ) )
WHERE a.str_STATUT = 'enable';

UPDATE t_compte_client_tiers_payant a
JOIN t_compte_client_tiers_payant b
      ON b.lg_COMPTE_CLIENT_ID = a.lg_COMPTE_CLIENT_ID
     AND b.lg_TIERS_PAYANT_ID = a.lg_TIERS_PAYANT_ID
     AND b.str_STATUT = 'enable'
     AND b.lg_COMPTE_CLIENT_TIERS_PAYANT_ID <> a.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
     AND ( COALESCE(b.b_IS_RO,0) > COALESCE(a.b_IS_RO,0)
           OR ( COALESCE(b.b_IS_RO,0) = COALESCE(a.b_IS_RO,0)
                AND ( COALESCE(b.dt_UPDATED,b.dt_CREATED) > COALESCE(a.dt_UPDATED,a.dt_CREATED)
                      OR ( COALESCE(b.dt_UPDATED,b.dt_CREATED) = COALESCE(a.dt_UPDATED,a.dt_CREATED)
                           AND b.lg_COMPTE_CLIENT_TIERS_PAYANT_ID > a.lg_COMPTE_CLIENT_TIERS_PAYANT_ID ) ) ) )
SET a.str_STATUT = 'delete', a.int_PRIORITY = -1, a.dt_UPDATED = NOW()
WHERE a.str_STATUT = 'enable';
-- COMMIT; (ou ROLLBACK;)
```
Les ventes déjà rattachées aux liens désactivés restent lisibles (l'attribution
`t_preenregistrement_compte_client_tiers_payent` pointe toujours le lien).

---

## B1 — Plusieurs RO actifs sur un même compte

**AFFICHAGE.**
```sql
SELECT ccl.lg_COMPTE_CLIENT_ID AS compte,
       CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME) AS client,
       COUNT(*) AS nb_ro_actifs,
       GROUP_CONCAT(tp.str_NAME ORDER BY cctp.dt_CREATED SEPARATOR ' | ') AS assurances_ro
FROM t_compte_client_tiers_payant cctp
JOIN t_compte_client ccl ON ccl.lg_COMPTE_CLIENT_ID = cctp.lg_COMPTE_CLIENT_ID
JOIN t_client cl         ON cl.lg_CLIENT_ID = ccl.lg_CLIENT_ID
JOIN t_tiers_payant tp   ON tp.lg_TIERS_PAYANT_ID = cctp.lg_TIERS_PAYANT_ID
WHERE cctp.str_STATUT = 'enable' AND cctp.b_IS_RO = 1
GROUP BY ccl.lg_COMPTE_CLIENT_ID, client
HAVING COUNT(*) > 1
ORDER BY nb_ro_actifs DESC;
```

**CONSOLIDATION.**
```sql
SELECT COUNT(*) AS nb_comptes_multi_ro FROM (
  SELECT lg_COMPTE_CLIENT_ID FROM t_compte_client_tiers_payant
  WHERE str_STATUT = 'enable' AND b_IS_RO = 1
  GROUP BY lg_COMPTE_CLIENT_ID HAVING COUNT(*) > 1
) x;
```

**CORRECTION.** On garde, par compte, **le RO le plus récent** (`dt_CREATED`, puis
identifiant) — c'est l'intention du dernier rattachement — et on retire le flag RO
des autres **sans les désactiver** (ils redeviennent des complémentaires, les
ventes passées restent lisibles ; les désactiver est un arbitrage, pas un défaut).
```sql
START TRANSACTION;
INSERT INTO reprise_assurances_rapport (dt_EVENT, type_anomalie, lien, compte, action)
SELECT NOW(), 'B1', a.lg_COMPTE_CLIENT_TIERS_PAYANT_ID, a.lg_COMPTE_CLIENT_ID,
       'Multi-RO : flag RO retire (RO plus recent conserve)'
FROM t_compte_client_tiers_payant a
JOIN t_compte_client_tiers_payant b
      ON b.lg_COMPTE_CLIENT_ID = a.lg_COMPTE_CLIENT_ID
     AND b.str_STATUT = 'enable' AND b.b_IS_RO = 1
     AND ( b.dt_CREATED > a.dt_CREATED
           OR ( b.dt_CREATED = a.dt_CREATED
                AND b.lg_COMPTE_CLIENT_TIERS_PAYANT_ID > a.lg_COMPTE_CLIENT_TIERS_PAYANT_ID ) )
WHERE a.str_STATUT = 'enable' AND a.b_IS_RO = 1;

UPDATE t_compte_client_tiers_payant a
JOIN t_compte_client_tiers_payant b
      ON b.lg_COMPTE_CLIENT_ID = a.lg_COMPTE_CLIENT_ID
     AND b.str_STATUT = 'enable' AND b.b_IS_RO = 1
     AND ( b.dt_CREATED > a.dt_CREATED
           OR ( b.dt_CREATED = a.dt_CREATED
                AND b.lg_COMPTE_CLIENT_TIERS_PAYANT_ID > a.lg_COMPTE_CLIENT_TIERS_PAYANT_ID ) )
SET a.b_IS_RO = 0, a.dt_UPDATED = NOW()
WHERE a.str_STATUT = 'enable' AND a.b_IS_RO = 1;
-- COMMIT; (ou ROLLBACK;)
```

---

## B4 — Liens actifs à priorité < 1 (fantômes ressuscités)

**AFFICHAGE.**
```sql
SELECT ccl.lg_COMPTE_CLIENT_ID AS compte,
       CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME) AS client,
       tp.str_NAME AS assurance, cctp.int_PRIORITY, cctp.b_IS_RO,
       cctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AS lien, cctp.dt_CREATED
FROM t_compte_client_tiers_payant cctp
JOIN t_compte_client ccl ON ccl.lg_COMPTE_CLIENT_ID = cctp.lg_COMPTE_CLIENT_ID
JOIN t_client cl         ON cl.lg_CLIENT_ID = ccl.lg_CLIENT_ID
JOIN t_tiers_payant tp   ON tp.lg_TIERS_PAYANT_ID = cctp.lg_TIERS_PAYANT_ID
WHERE cctp.str_STATUT = 'enable' AND cctp.int_PRIORITY < 1
ORDER BY cctp.dt_CREATED DESC;
```
Décision par ligne : lien légitime (le client a bien cette assurance) → re-prioriser ;
contamination (ex. FADIGA sur COULIBALY, zéro vente) → désactiver.

**CORRECTION (re-priorisation des liens validés).**
```sql
START TRANSACTION;
INSERT INTO reprise_assurances_rapport (dt_EVENT, type_anomalie, lien, compte, action)
SELECT NOW(), 'B4', c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID, c.lg_COMPTE_CLIENT_ID,
       'Priorite invalide reassignee en fin de liste'
FROM t_compte_client_tiers_payant c
WHERE c.str_STATUT = 'enable' AND c.int_PRIORITY < 1;

UPDATE t_compte_client_tiers_payant c
LEFT JOIN ( SELECT lg_COMPTE_CLIENT_ID, MAX(int_PRIORITY) AS maxp
            FROM t_compte_client_tiers_payant
            WHERE str_STATUT = 'enable' AND int_PRIORITY >= 1
            GROUP BY lg_COMPTE_CLIENT_ID ) m
       ON m.lg_COMPTE_CLIENT_ID = c.lg_COMPTE_CLIENT_ID
SET c.int_PRIORITY = COALESCE(m.maxp, 0) + 1, c.dt_UPDATED = NOW()
WHERE c.str_STATUT = 'enable' AND c.int_PRIORITY < 1;
-- COMMIT; (ou ROLLBACK;)
```
*(Si un compte a plusieurs liens à priorité < 1, les re-prioriser un par un.)*
Pour une contamination avérée, modèle par ligne :
```sql
UPDATE t_compte_client_tiers_payant
SET str_STATUT = 'delete', int_PRIORITY = -1, b_IS_RO = 0, dt_UPDATED = NOW()
WHERE lg_COMPTE_CLIENT_TIERS_PAYANT_ID = '<lien>';
```

---

## B5 — Liens actifs sans aucune vente (arbitrage)

**AFFICHAGE.**
```sql
SELECT ccl.lg_COMPTE_CLIENT_ID AS compte,
       CONCAT(cl.str_FIRST_NAME,' ',cl.str_LAST_NAME) AS client,
       tp.str_NAME AS assurance, cctp.b_IS_RO, cctp.int_PRIORITY,
       cctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID AS lien, cctp.dt_CREATED AS lien_cree_le
FROM t_compte_client_tiers_payant cctp
JOIN t_compte_client ccl ON ccl.lg_COMPTE_CLIENT_ID = cctp.lg_COMPTE_CLIENT_ID
JOIN t_client cl         ON cl.lg_CLIENT_ID = ccl.lg_CLIENT_ID
JOIN t_tiers_payant tp   ON tp.lg_TIERS_PAYANT_ID = cctp.lg_TIERS_PAYANT_ID
WHERE cctp.str_STATUT = 'enable'
  AND NOT EXISTS (SELECT 1 FROM t_preenregistrement_compte_client_tiers_payent pcctp
      WHERE pcctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = cctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID)
ORDER BY tp.str_NAME, cctp.dt_CREATED DESC;
```

**Lecture.** Deux populations très différentes (constaté sur le site audité) :
les imports historiques 2017-2019 (dormants, **à laisser**) et les liens récents,
surtout RO=1 de 2025-2026 — contamination probable **mais** une souscription
récente légitime n'a pas encore de vente non plus : **pas de désactivation en
masse**, décision au cas par cas. Les RO sans vente dont le compte possède un
autre RO actif qui a des ventes sont déjà traités par B1.

---

## B6 — Attribution croisée des ventes (informatif, arbitrage)

Ventes dont le client diffère du client du lien assurance utilisé :
```sql
SELECT p.str_REF AS vente, p.dt_CREATED, tp.str_NAME AS assurance,
       CONCAT(clv.str_FIRST_NAME,' ',clv.str_LAST_NAME) AS client_vente,
       CONCAT(cll.str_FIRST_NAME,' ',cll.str_LAST_NAME) AS client_du_lien,
       pcctp.int_PRICE AS montant
FROM t_preenregistrement_compte_client_tiers_payent pcctp
JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = pcctp.lg_PREENREGISTREMENT_ID
JOIN t_compte_client_tiers_payant cctp
      ON cctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = pcctp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
JOIN t_compte_client ccl ON ccl.lg_COMPTE_CLIENT_ID = cctp.lg_COMPTE_CLIENT_ID
JOIN t_client cll        ON cll.lg_CLIENT_ID = ccl.lg_CLIENT_ID
JOIN t_tiers_payant tp   ON tp.lg_TIERS_PAYANT_ID = cctp.lg_TIERS_PAYANT_ID
LEFT JOIN t_client clv   ON clv.lg_CLIENT_ID = p.lg_CLIENT_ID
WHERE p.lg_CLIENT_ID IS NOT NULL AND ccl.lg_CLIENT_ID <> p.lg_CLIENT_ID
ORDER BY p.dt_CREATED DESC;
```
**Pas de correction automatique** : réattribuer une vente (facturation déjà émise à
l'assurance) est une décision de gestion. Liste à sortir, chiffrer et arbitrer.

---

## Contrôles de fin

Dans l'ordre : B3 affichage 1 → 0 ligne ; B2 consolidation → 0 ; B1 consolidation →
0 ; B4 affichage → 0 (hors lignes volontairement laissées) ; B5/B6 → listes
d'arbitrage consignées dans `reprise_assurances_rapport`.

**Rappels.** Requêtes MySQL/MariaDB, type de tiers-payant carnet =
`lg_TYPE_TIERS_PAYANT_ID = '2'` (constante `TYPE_TIERS_PAYANT_CARNET_ID`). Les
chiffres cités viennent du site audité les 22-24/10/2026 et doivent être re-mesurés
sur chaque site. La reprise se joue **après** correction des mécanismes 1 à 4
ci-dessus dans le code, sinon les anomalies se recréent à la première vente
modifiée.
