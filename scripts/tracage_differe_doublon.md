# Traçage du doublon de différé (2 lignes sur la même vente)

But : identifier le geste/chemin exact qui crée une **seconde** ligne de différé
sur une même vente (`lg_PREENREGISTREMENT_ID`), à l'origine des rares dettes
fantômes (type BEUGRE).

## Ce qui a été instrumenté

Dans `SalesServiceImpl`, les **deux** méthodes `addDiffere` journalisent, à chaque
tentative de création d'une ligne de différé, une entrée taguée `[TRACE_DIFFERE]` :

- `source` : quelle méthode (modification de vente vs règlement/clôture) ;
- `venteId` : la vente concernée ;
- `lignesDeja` : nombre de lignes de différé **déjà présentes** pour cette vente ;
- `thread` : le thread HTTP (pour repérer une concurrence) ;
- `pile` : la pile d'appel (pour voir le flux appelant exact).

Une ligne `[TRACE_DIFFERE] BLOQUE (doublon evite)` est journalisée quand la garde
d'idempotence empêche une seconde création.

## Comment l'utiliser

1. **Déployer** ce build (branche `differe`) sur l'environnement de TEST.
2. **Suivre les logs** applicatifs en filtrant le tag :
   ```
   tail -f <fichier_log_serveur> | grep TRACE_DIFFERE
   ```
   (fichier de log = celui configuré pour l'application ; sinon la sortie standard
   du serveur d'applications.)
3. **Rejouer** les scénarios de modification de vente différée :
   - Vente différée → clôturer.
   - « Ventes finies » → « Modifier » → re-valider en différé.
   - Recommencer la modification / re-valider.
   - **Cas concurrence** (le plus suspect) : lancer une modification **et** une
     re-validation quasi simultanément (deux onglets, ou deux caissiers), ou
     cliquer « Valider » deux fois très vite pendant une latence.
4. **Repérer l'anomalie** dans les logs : une **seconde** entrée `[TRACE_DIFFERE]`
   pour le **même `venteId`**. Deux cas :
   - `BLOQUE` : la garde a évité le doublon → la `pile` de cette entrée montre le
     chemin fautif (c'est l'info recherchée).
   - création réelle avec `lignesDeja=0` alors qu'une ligne existe déjà en base non
     committée → signe d'une **course** (deux transactions concurrentes).

## Corréler avec la base

Après les tests, lister les ventes ayant plusieurs lignes de différé :

```sql
SELECT lg_PREENREGISTREMENT_ID, COUNT(*) AS nb_lignes,
       GROUP_CONCAT(CONCAT(str_STATUT, ':', int_PRICE_RESTE) ORDER BY dt_CREATED) AS lignes,
       GROUP_CONCAT(dt_CREATED ORDER BY dt_CREATED) AS horodatages
FROM t_preenregistrement_compte_client
GROUP BY lg_PREENREGISTREMENT_ID
HAVING COUNT(*) > 1;
```

Rapprocher les `venteId` obtenus des entrées `[TRACE_DIFFERE]` : la `pile` de la
seconde création révèle le flux exact (nom de méthode + ligne).

## Retrait du traçage

Le traçage est en INFO et sans effet métier. Une fois le déclencheur identifié et
corrigé, retirer les appels `traceAddDiffere(...)` et la méthode `traceAddDiffere`
(ou baisser le niveau de log). Il peut rester en test sans risque.
