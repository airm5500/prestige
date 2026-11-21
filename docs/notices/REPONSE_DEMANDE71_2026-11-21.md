# Réponse à la demande 71 : Analyse Article lente pour les produits très vendus (21/11/2026)

**De** : l'équipe du serveur Prestige.
**Pour** : la session de l'application Prestige Pharmacien (3.17.1+58).
**Code** : branche `correctif/demande71-2111` (`975f28f9a`), à partir de l'intégration `719f696ed`. Elle n'est pas
encore fusionnée, ni livrée en officine.

Merci pour l'analyse : elle est juste. Le temps venait de la lecture de la dernière vente. Ni la route, ni ses
paramètres, ni la forme de la réponse ne changent : rien à modifier dans l'application.

## Ce qui change

1. **Dernière vente lue d'abord sur les 7 derniers jours** (`ProduitExtraInfoServiceImpl.getExtraInfos`, utilisé par
   `v1/info` et `v1/checkproduit`) :
   - les ventes clôturées sont d'abord lues depuis minuit, il y a 7 jours, grâce à l'index (statut, date) des ventes ;
   - la fenêtre commence à minuit, donc le dernier jour vendu y est entier : la date et la quantité de ce jour sont
     exactement celles de la lecture complète ;
   - seuls les produits dont un emplacement demandé n'a aucune vente dans la fenêtre sont relus sur tout leur
     historique, comme avant.

   Nous n'avons pas retenu une fenêtre de 90 jours : sur `appaul`, elle prend encore 2,9 s pour le paracétamol, contre
   0,3 s pour 7 jours.
2. **Lectures groupées sans vidage du contexte de persistance** : `v1/checkproduit` charge d'abord tout le stock du
   catalogue. Avant chacune de ses lectures groupées (une centaine), le serveur repassait sur tous ces objets. Ces
   lectures n'écrivent rien : elles partent désormais directement.
3. **Achats et inventaires** : inchangés. Sur `appaul`, pour le produit le plus vendu, ils prennent 95 ms et 108 ms.

## Mesures

| Lecture | Base | Avant | Après |
|---|---|---|---|
| `v1/info?search=8054082D` (paracétamol, 81 235 lignes de vente) | appaul | 6,2 s | 0,58 s |
| `v1/info` (tout le catalogue, 7 534 produits) | appaul | 130 s | 44 s |
| `v1/checkproduit` (tout le catalogue) | appaul | 167 s | 77 s |
| `v1/checkproduit` (tout le catalogue, 11 650 produits) | banc | 87 s | 12,6 s |

Mesures sur le poste local : copie `appaul` en lecture seule, et banc d'essai.

## Pool de fils `http-thread-pool`

Sur le poste local (domain1), il est de 8 fils au minimum et 100 au maximum, pas 5. Nous vérifierons la valeur en
officine au prochain déploiement, par la commande ci-dessous :

```powershell
asadmin get configs.config.server-config.thread-pools.thread-pool.http-thread-pool.max-thread-pool-size
```

Avec le correctif, une ouverture de fiche ne garde plus un fil plusieurs secondes.

## Tests

Chaque nouveau test a d'abord échoué sur l'ancien code.

- **`ProduitExtraInfoVentesRecentesTest`** (unitaire) :
  - un produit vendu dans la fenêtre n'est pas relu ; un produit sans vente récente l'est ;
  - deux emplacements demandés, un seul vendu récemment : le produit est relu en entier, une seule fois ;
  - une demande sans emplacement ne force pas de relecture ;
  - cohérence sur 5 000 tranches tirées au hasard (graine fixe) : fenêtre puis relecture donne, clé par clé, la même
    date et la même quantité que la lecture complète. Les cas couvrent une dernière vente aujourd'hui, dans la
    semaine, au bord de la fenêtre (7 et 8 jours) et bien avant, plusieurs ventes le même jour, un ou deux
    emplacements, et aucune vente.
- **Test d'écran `test-demande71-2111.js`**, par l'API de l'application avec une vraie session :
  - délai :
    - `v1/info?search=<CIP>` du produit le plus vendu de la semaine passe sous 3 s ;
    - au volume d'une officine, il prend aussi moins de la moitié de la seule requête d'origine ;
    - sur `appaul`, l'ancien code prend 6 174 ms et échoue ; le nouveau prend 582 ms ;
  - rapprochement : 19 produits, dont 7 très vendus, comparés aux requêtes d'origine (un produit à la fois) sur
    11 informations. L'échantillon mêle des produits très vendus avec et sans vente dans la semaine, des produits
    peu vendus, des produits jamais vendus et des produits quelconques ;
  - bilan : les lectures n'écrivent rien. Sur le banc, où la dernière vente date du 14/11, le test vend deux fois
    le produit le plus vendu (quantités 2 et 3), puis retire ces ventes et remet le stock. Sur `appaul`, il reste en
    lecture seule.
- **Rapprochement complet** :
  - les réponses entières de `v1/info` et de `v1/checkproduit` sont identiques, ligne par ligne, entre l'ancien et le
    nouveau code ;
  - cela vaut sur `appaul` (7 534 produits, ancien code sur domain1, nouveau code sur un second serveur de la même
    copie) et sur le banc (11 650 produits).
- **Non-régression** : `test-info-articles-rapide.js` passe 10/10. Son contrôle « `v1/checkproduit` (tout) en moins
  de 20 s » échouait sur l'ancien code (87 s) et passe maintenant (12,6 s).

## Limites

- Un produit très vendu sans vente depuis plus de 7 jours (pharmacie fermée, produit en rupture) est relu sur tout
  son historique, comme avant. Il ne coûte que la lecture de la fenêtre en plus, quelques dizaines de millisecondes.
- Les requêtes déjà lancées quand l'écran se ferme continuent côté serveur. Elles sont maintenant courtes.
