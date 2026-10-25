# Correction du Net TTC du dashboard après l'annulation d'une vente

## 1. Objet du document

Ce document décrit l'écart constaté dans le graphe **Évolution du Net TTC** du dashboard de Prestige, son origine technique, la correction applicative retenue et la procédure de rétablissement à appliquer si le statut comptable de la vente a été modifié manuellement.

L'incident analysé concerne une vente de **23 163 860** créée puis annulée le même jour.

---

## 2. Données de l'incident

### 2.1 Vente originale

| Champ | Valeur |
|---|---|
| Identifiant | `2bea8ee6-6260-41b3-9516-d6f2880b74b3` |
| Référence | `261019_00495` |
| Ticket | `4712988115` |
| Montant | `23 163 860` |
| Statut | `is_Closed` |
| Annulée | `b_IS_CANCEL = 1` |
| Date de vente | `2026-10-19 16:47:12` |
| Date d'annulation | `2026-10-19 17:20:49` |

### 2.2 Contre-écriture créée par l'annulation

| Champ | Valeur |
|---|---|
| Identifiant | `0ede0954-9afa-4e5f-9646-145e39fd7527` |
| Référence | `261019_00547` |
| Ticket | `2049475666` |
| Montant | `-23 163 860` |
| Statut | `is_Closed` |
| Annulée | `b_IS_CANCEL = 0` |
| Vente d'origine | `2bea8ee6-6260-41b3-9516-d6f2880b74b3` |
| Date | `2026-10-19 17:20:49` |

### 2.3 Résultat financier attendu

```text
Vente originale       +23 163 860
Contre-écriture        -23 163 860
---------------------------------
Impact net                       0
```

Les mouvements financiers confirment ces deux écritures opposées. L'annulation est donc présente et cohérente dans les données. L'anomalie se situe dans la sélection utilisée par le graphe, et non dans le mécanisme financier d'annulation.

---

## 3. Symptôme observé

Les journaux, balances et autres menus donnent un chiffre correct, tandis que le graphe **Évolution du Net TTC** conserve les `23 163 860` de la vente annulée.

L'écart reste visible parce que l'ancienne requête du graphe retient uniquement les lignes qui respectent notamment :

```sql
int_PRICE > 0
AND str_STATUT = 'is_Closed'
```

Elle ne contrôle pas le marqueur :

```sql
b_IS_CANCEL
```

La vente positive est donc conservée dans le calcul. La contre-écriture négative est ignorée à cause de `int_PRICE > 0`.

| Enregistrement | Montant | `int_PRICE > 0` | Résultat de l'ancienne requête |
|---|---:|---:|---|
| Vente originale annulée | `+23 163 860` | Oui | Incluse à tort |
| Contre-écriture | `-23 163 860` | Non | Exclue |

---

## 4. Cause technique

Le graphe est calculé à partir de la table :

```text
t_preenregistrement
```

Le Net TTC mensuel est obtenu avec la formule :

```text
SUM(int_PRICE - int_PRICE_REMISE)
```

La vente est rattachée au mois de `dt_UPDATED`.

L'ancienne implémentation avait deux défauts :

1. elle ne filtrait pas `b_IS_CANCEL = 0` ;
2. elle conservait le résultat pendant trois minutes dans un cache serveur.

Le cache n'est pas la cause principale : même après expiration, l'ancienne requête recalculait le même montant incorrect.

---

## 5. Correction applicative permanente

La correction consiste à exclure explicitement les ventes annulées :

```sql
AND COALESCE(o.b_IS_CANCEL, 0) = 0
```

La remise est également sécurisée :

```sql
o.int_PRICE - COALESCE(o.int_PRICE_REMISE, 0)
```

La requête cible est donc équivalente à :

```sql
SELECT
    SUM(o.int_PRICE - COALESCE(o.int_PRICE_REMISE, 0)) AS net_ttc,
    COUNT(o.lg_PREENREGISTREMENT_ID) AS nombre_ventes,
    DATE_FORMAT(o.dt_UPDATED, '%m/%Y') AS mois
FROM t_preenregistrement o
WHERE o.lg_TYPE_VENTE_ID <> '5'
  AND o.int_PRICE > 0
  AND o.str_STATUT = 'is_Closed'
  AND COALESCE(o.b_IS_CANCEL, 0) = 0
  AND o.dt_UPDATED >= :debut_annee
  AND o.dt_UPDATED < :debut_annee_suivante
GROUP BY DATE_FORMAT(o.dt_UPDATED, '%m/%Y')
ORDER BY DATE_FORMAT(o.dt_UPDATED, '%m/%Y');
```

Le cache du endpoint `dashboard/ca-graphe` est supprimé afin que le prochain rafraîchissement reflète immédiatement une annulation.

### Résultat attendu après déploiement

Pour l'incident étudié :

```text
Vente originale : exclue car b_IS_CANCEL = 1
Contre-écriture  : exclue car int_PRICE < 0
Impact graphe    : 0
```

Cette correction s'applique automatiquement aux futures ventes annulées.

---

## 6. Incident secondaire : balance vente/caisse faussée

La modification manuelle du statut de la vente originale de `is_Closed` vers `cancel` ne doit **pas** être utilisée comme contournement. Elle corrige visuellement l'ancien graphe, mais elle rompt le mécanisme comptable utilisé par la balance vente/caisse.

La balance additionne les mouvements des ventes dont le statut est `is_Closed`. Dans le cas étudié, elle doit conserver les deux écritures :

```text
Vente originale clôturée       +23 163 860
Contre-écriture clôturée        -23 163 860
-------------------------------------------
Solde                                      0
```

Si la vente originale passe à `cancel`, seule la contre-écriture négative reste dans le périmètre de la balance :

```text
Vente originale au statut cancel          exclue
Contre-écriture au statut is_Closed   -23 163 860
-------------------------------------------------
Solde erroné                          -23 163 860
```

Le marqueur `b_IS_CANCEL = 1` sert à ne pas compter la vente originale dans le **nombre de ventes**, mais les montants positif et négatif restent nécessaires au calcul financier. La correction doit donc rester localisée dans la requête du graphe ; elle ne doit pas altérer l'état comptable des deux écritures.

---

## 7. Rétablissement immédiat des données

Si le statut de la vente originale a déjà été changé en `cancel`, il faut le restaurer à `is_Closed`. La requête suivante verrouille et contrôle précisément les deux écritures avant la modification.

> Exécuter cette procédure avec un compte autorisé, après sauvegarde, et conserver le résultat des contrôles dans le dossier d'incident.

```sql
START TRANSACTION;

SELECT
    lg_PREENREGISTREMENT_ID,
    str_REF,
    str_REF_TICKET,
    str_STATUT,
    b_IS_CANCEL,
    int_PRICE,
    dt_ANNULER,
    lg_PREENGISTREMENT_ANNULE_ID
FROM t_preenregistrement
WHERE lg_PREENREGISTREMENT_ID IN (
    '2bea8ee6-6260-41b3-9516-d6f2880b74b3',
    '0ede0954-9afa-4e5f-9646-145e39fd7527'
)
FOR UPDATE;

UPDATE t_preenregistrement
SET str_STATUT = 'is_Closed'
WHERE lg_PREENREGISTREMENT_ID =
      '2bea8ee6-6260-41b3-9516-d6f2880b74b3'
  AND str_REF = '261019_00495'
  AND str_REF_TICKET = '4712988115'
  AND str_STATUT = 'cancel'
  AND COALESCE(b_IS_CANCEL, 0) = 1
  AND int_PRICE = 23163860
  AND dt_ANNULER = '2026-10-19 17:20:49'
  AND EXISTS (
      SELECT 1
      FROM t_preenregistrement contre_ecriture
      WHERE contre_ecriture.lg_PREENREGISTREMENT_ID =
            '0ede0954-9afa-4e5f-9646-145e39fd7527'
        AND contre_ecriture.lg_PREENGISTREMENT_ANNULE_ID =
            '2bea8ee6-6260-41b3-9516-d6f2880b74b3'
        AND contre_ecriture.int_PRICE = -23163860
        AND contre_ecriture.str_STATUT = 'is_Closed'
  );

SELECT ROW_COUNT() AS lignes_restaurees;
```

Le résultat doit être exactement :

```text
lignes_restaurees = 1
```

Contrôler ensuite les données **avant** de valider :

```sql
SELECT
    lg_PREENREGISTREMENT_ID,
    str_REF,
    str_STATUT,
    b_IS_CANCEL,
    int_PRICE,
    dt_ANNULER,
    lg_PREENGISTREMENT_ANNULE_ID
FROM t_preenregistrement
WHERE lg_PREENREGISTREMENT_ID IN (
    '2bea8ee6-6260-41b3-9516-d6f2880b74b3',
    '0ede0954-9afa-4e5f-9646-145e39fd7527'
)
ORDER BY int_PRICE DESC;
```

Le résultat attendu est :

| Écriture | Statut | Annulée | Montant |
|---|---|---:|---:|
| Vente originale | `is_Closed` | `1` | `23 163 860` |
| Contre-écriture | `is_Closed` | `0` | `-23 163 860` |

Si les contrôles sont conformes :

```sql
COMMIT;
```

Si `lignes_restaurees` est différent de `1`, ou si le contrôle ne correspond pas au tableau ci-dessus :

```sql
ROLLBACK;
```

Après le `COMMIT`, recharger la balance vente/caisse. Son écart de `-23 163 860` doit disparaître.

### Conséquence sur le graphe

- si le correctif applicatif de la section 5 est déployé, le graphe restera correct, car il exclut la vente originale avec `b_IS_CANCEL = 1` ;
- si l'ancienne version est encore déployée, le graphe redeviendra incorrect après la restauration, car cette version ne lit pas `b_IS_CANCEL`.

### Contournement exceptionnel pour une ancienne version

Lorsque la mise à jour applicative est réellement impossible, le seul contournement cohérent pour **le graphe et la balance** consiste à exclure symétriquement les deux écritures des requêtes limitées à `str_STATUT = 'is_Closed'` : la vente originale et sa contre-écriture passent ensemble au statut `cancel`.

Cette solution conserve un impact financier nul dans les écrans concernés, car aucun des deux montants n'est retenu. Elle reste toutefois un contournement de compatibilité : certains historiques filtrés sur `is_Closed` ne montreront plus cette paire. Il faut donc sauvegarder les lignes, documenter l'intervention et restaurer les deux statuts après le déploiement du correctif applicatif.

```sql
-- Sauvegarde préalable : le CREATE TABLE provoque un commit implicite sous MySQL.
CREATE TABLE IF NOT EXISTS support_annulation_261019_00495
LIKE t_preenregistrement;

INSERT IGNORE INTO support_annulation_261019_00495
SELECT *
FROM t_preenregistrement
WHERE lg_PREENREGISTREMENT_ID IN (
    '2bea8ee6-6260-41b3-9516-d6f2880b74b3',
    '0ede0954-9afa-4e5f-9646-145e39fd7527'
);

START TRANSACTION;

UPDATE t_preenregistrement origine
JOIN t_preenregistrement annulation
  ON annulation.lg_PREENGISTREMENT_ANNULE_ID =
     origine.lg_PREENREGISTREMENT_ID
SET origine.str_STATUT = 'cancel',
    annulation.str_STATUT = 'cancel'
WHERE origine.lg_PREENREGISTREMENT_ID =
      '2bea8ee6-6260-41b3-9516-d6f2880b74b3'
  AND origine.str_REF = '261019_00495'
  AND origine.str_REF_TICKET = '4712988115'
  AND origine.str_STATUT = 'is_Closed'
  AND origine.b_IS_CANCEL = 1
  AND origine.int_PRICE = 23163860
  AND annulation.lg_PREENREGISTREMENT_ID =
      '0ede0954-9afa-4e5f-9646-145e39fd7527'
  AND annulation.str_REF = '261019_00547'
  AND annulation.str_REF_TICKET = '2049475666'
  AND annulation.str_STATUT = 'is_Closed'
  AND COALESCE(annulation.b_IS_CANCEL, 0) = 0
  AND annulation.int_PRICE = -23163860;

SELECT ROW_COUNT() AS lignes_modifiees;
```

`lignes_modifiees` doit être exactement égal à `2`. Vérifier ensuite les deux lignes dans la même transaction :

```sql
SELECT
    lg_PREENREGISTREMENT_ID,
    str_REF,
    str_STATUT,
    b_IS_CANCEL,
    int_PRICE,
    lg_PREENGISTREMENT_ANNULE_ID
FROM t_preenregistrement
WHERE lg_PREENREGISTREMENT_ID IN (
    '2bea8ee6-6260-41b3-9516-d6f2880b74b3',
    '0ede0954-9afa-4e5f-9646-145e39fd7527'
)
ORDER BY int_PRICE DESC;
```

Si les deux lignes sont au statut `cancel` et que les montants restent opposés, exécuter `COMMIT`; sinon exécuter `ROLLBACK`.

---

## 8. Opérations interdites

Il ne faut pas :

- supprimer la vente originale ;
- supprimer la contre-écriture ;
- mettre `int_PRICE` à zéro ;
- modifier `int_PRICE_OTHER` ou `int_ACCOUNT` ;
- modifier `b_IS_CANCEL` ;
- changer artificiellement `lg_TYPE_VENTE_ID` ;
- supprimer les mouvements financiers associés.
- changer le statut d'une seule des deux écritures : sur une ancienne version, l'exclusion doit impérativement être symétrique et temporaire.

Ces actions détruiraient ou falsifieraient l'historique comptable et empêcheraient d'expliquer l'annulation.

---

## 9. Contrôles de recette

### Scénario 1 — Vente normale

Une vente positive, clôturée et non annulée doit être incluse dans le mois correspondant à `dt_UPDATED`.

### Scénario 2 — Vente annulée

Une vente positive avec `b_IS_CANCEL = 1` ne doit pas être incluse.

### Scénario 3 — Contre-écriture négative

La contre-écriture négative ne doit pas être ajoutée au graphe limité aux ventes positives.

### Scénario 4 — Remise nulle en base

Une valeur `int_PRICE_REMISE = NULL` doit être interprétée comme zéro.

### Scénario 5 — Rafraîchissement

Après une annulation, le prochain chargement du graphe doit afficher le nouveau montant sans conserver un résultat serveur périmé.

---

## 10. Conclusion

L'annulation analysée est financièrement cohérente : la vente positive et sa contre-écriture négative s'annulent. Le graphe était faux parce que son ancienne requête retenait la vente positive annulée et ignorait simultanément la contre-écriture négative.

La correction permanente consiste à filtrer `b_IS_CANCEL = 0` uniquement dans le graphe. La vente originale et sa contre-écriture doivent toutes les deux conserver le statut `is_Closed`, afin que la balance additionne `+23 163 860` et `-23 163 860` et obtienne un impact nul.

Sur une version corrigée, les deux écritures doivent conserver `is_Closed`. Sur une ancienne version qui ne peut pas être mise à jour immédiatement, le contournement temporaire consiste à passer les deux écritures ensemble à `cancel`; il ne faut jamais exclure seulement l'écriture positive.
