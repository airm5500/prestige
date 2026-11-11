# Fusion de `plan/09112026` dans l'intégration (BL importé avec un produit répété), 11/11/2026

**Demande de l'utilisateur (11/11) :** « fusionne dans l'intégration », après la correction du BL R20285250 de Tiassale.

**Branche fusionnée :** `plan/09112026` au commit `4481d05a3`.

**Branche cible :** `integration/recette-2026-10-29`, qui passe de `86318d3c0` à `4c83f9924`.

**Mode de fusion :** commit de fusion, sans conflit.

## 1. Ce qui arrive dans l'intégration

| Sujet | Contenu |
|---|---|
| Import DPCI : produit répété dans le fichier | Avant, quand un produit revenait dans le fichier du grossiste, l'import ajoutait un second lot vide (ni numéro ni date). L'écran du BL ne montrait et ne complétait qu'un lot par ligne, si bien que l'entrée en stock était refusée. Désormais, la quantité s'ajoute au lot de même numéro et de même date (`LotsImport`). |
| Refus « dates de péremption » | Le message garde son début (« Certaines dates de péremptions ne sont pas renseignées »), puis nomme les produits qui bloquent : CIP, libellé, lots sans date. La réponse contient aussi le code `PEREMPTION_MANQUANTE` et la liste des produits. |
| Script de déblocage | `outils/sql/regrouper-lots-bl-importe.sql` sert aux bases déjà touchées, avec l'ancienne version. Pour un BL ouvert, il verse les lots vides dans le lot daté et vérifie que les quantités n'ont pas changé avant de valider. Il est à lancer à la main, après sauvegarde. |
| Tests | Deux tests de cohérence, un test d'écran, et l'adresse `BASE` dans deux tests de correspondance. |

**Migrations Flyway :** aucune. **Nouvel EJB :** aucun.

## 2. Tests unitaires

`mvn -o package` sur `4c83f9924` (JDK 11) : **2 313 tests, 0 échec**.

Une erreur est apparue au premier passage : `FichierMyIniTest` n'a pas pu supprimer son dossier temporaire, verrouillé par Windows. Elle ne vient pas de la fusion. Rejoué seul, ce test passe : 14/14.

Les nouveaux tests de cohérence utilisent la graine 20261111 et 20 000 cas chacun :
- `LotsImportCoherenceTest` vérifie que la quantité totale est conservée, qu'il n'y a jamais deux lots de même numéro et de même date, que chaque lot vaut la somme de ses lignes du fichier, et que l'ordre d'apparition est respecté ;
- `PeremptionProduitsCoherenceTest` vérifie qu'on trouve exactement les produits suivis qui bloquent, une fois chacun, dans l'ordre du BL, avec le bon détail.

## 3. Tests d'écran sur l'intégration

**Conditions :** le WAR de `4c83f9924` est déployé sur domain3 (port 10090, copie `laborex_audit`). Un seul test à la fois, sous le verrou.

**Résultat : 12 tests verts sur 12.**

| Test | Résultat |
|---|---|
| retours/test-import-bl-produit-repete-1111 (nouveau ; 13/17 sur l'ancien code) | 17/17 |
| retours/test-entree-stock-0825 | 16/16 |
| retours/test-bl-quantite-sans-lot | 9/9 |
| retours/test-demande59-bl-recu | 40/40 |
| retours/test-reserve-apres-entree | 21/21 |
| retours/test-reserve-apres-entree-droit-suggestions | 9/9 |
| retours/test-decision-12-reception-bl | 9/9 |
| retours/test-reconciliation-0911 | 21/21 |
| retours/test-retours-0910-cec | 19/19 |
| support/anomalies-centre/test-import-commande-annuler | OK |
| correspondance/test-correspondance-import-validee | 9/9 |
| correspondance/test-correspondance-lot2 | 28/28 |

**Test non joué :** `audits/test-ecran-import-bl-meme-produit` demande le fichier de facture du 02/11, qui n'est plus sur le poste.

**Ce que contrôle le nouveau test d'écran**
- **Rapprochement :** les quantités sont les mêmes dans le fichier, dans la commande, dans les lots de la commande, sur le BL et dans `t_lot`, avec un seul lot par produit.
- **Refus :** le message nomme le produit sans date, avec « (1 lot sans date sur 1) » ; on vérifie aussi le code et la liste des produits.
- **Bilan :** le BL reste ouvert, le stock ne change pas, les lots ne changent pas et aucun mouvement n'est créé.
- **Jeu d'essai :** produits répétés (2+2, 1+1) et non répétés, suivis et non suivis, paramètre de péremption à 1.

## 4. Script de déblocage, essayé sur la copie de Tiassale

L'essai s'est fait sur domain2 (port 9080), sur la base `tiassale`, copie locale sauvegardée avant l'essai. domain2 fait tourner l'ancienne version, sans la correction.

1. **Le script :**
   - DEPOFEM passe de deux lots de 2 (dont un vide) à un seul lot de 4, avec la date ;
   - EOSINE passe de deux lots de 1 à un seul lot de 2 ;
   - le contrôle est à OK.
2. **L'entrée en stock de R20285250 à l'écran :** elle réussit et le BL est clos. Le stock augmente d'exactement la quantité reçue, sans double entrée :

| Produit | Stock avant | Stock après | Écart |
|---|---|---|---|
| DEPOFEM | −1 | 3 | +4 |
| EOSINE | 0 | 2 | +2 |
| AKEROL | 1 | 2 | +1 |

3. **Script relancé sur le BL clos :** il affiche « ARRET », ne regroupe aucun lot et ne modifie rien.

**À noter :** domain2 pointe encore sur `tiassale`. Il faudra le remettre sur `laborex_perf` (port 3307) pour les essais de charge.
