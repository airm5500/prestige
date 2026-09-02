# Fiche des mouvements de l'article — le « Stock = 204 » : reproduction et correction

## Symptôme observé chez le client

Sur la **FICHE DES MOUVEMENTS DE L'ARTICLE** d'un produit vendu au détail
(article 8509708D, période 07/07 → 21/08/2026), la ligne du **20/08/2026**
affichait `Stock = 204` alors que l'arithmétique de la ligne donnait
`Qté.Initiale 11 − Vente 12 + Décon 100 = 99`. La ligne suivante (21/08)
ouvrait bien avec `Qté.Initiale = 99`, prouvant que la chaîne réelle valait 99
et que 204 était une valeur d'affichage erronée.

## Cause racine

Deux défauts se combinaient.

1. **Écriture (cause première).** Quand une vente de détail dépasse le stock
   rayon, la caisse déconditionne automatiquement une boîte. Le code
   (`MvtProduitServiceImpl` / `MouvementProduitImpl`) réutilisait une variable
   « stock initial » qu'une boucle `while` venait d'écraser : la ligne de
   déconditionnement (`typeMvt = '05'`) partait dans `hmvtproduit` avec un
   `qteDebut` et un `qteFinale` gonflés du nombre de détails déconditionnés.
   Pour une boîte de 100 sur un stock réel de 4, au lieu de `4 → 104` la ligne
   portait `104 → 204`.

2. **Lecture (déclencheur d'affichage).** La fiche recopie la `qteFinale` du
   **dernier** mouvement du jour. Or `createdAt` est stocké à la seconde près,
   et la ligne décon partage l'horodatage de la vente qui la déclenche :
   l'ordre entre les deux était indéterminé, donc le rapport recopiait parfois
   la ligne décon corrompue (204) au lieu de la vente (99). D'où un affichage
   **non déterministe** : 99 ou 204 selon les exécutions.

## Correctifs livrés (branche `valorisationstory`)

- **Écriture** : la variable « stock initial » n'est plus jamais mutée ; la
  ligne décon est écrite avec la vraie borne (`4 → 104`). Plus aucune ligne
  fausse produite. (Commit « Fiche des mouvements : corrige les instantanés du
  déconditionnement automatique ».)
- **Lecture** : à horodatage égal, la ligne **non-déconditionnement** prime
  (`ProduitServiceImpl.ligneBorneJournee`). Le rapport affiche donc 99 même sur
  l'historique déjà corrompu, sans toucher aux données.
- **Historique déjà en base** : le script `correction_204_suivi_mvt.sql` remet
  les lignes fausses à leur vraie valeur, pour les exports qui liraient
  `hmvtproduit` directement.

## Reproduire

1. Déployer le WAR sur un Payara de TEST, base de test avec un produit détail.
2. Jouer `reproduction_204_suivi_mvt.sql` (adapter `@fam`, `@empl`, `@usr`).
   Il crée trois journées, dont une ligne décon corrompue `104 → 204` au 20/08.
3. Ouvrir la FICHE DES MOUVEMENTS DE L'ARTICLE, période 19 → 21/08/2026.
   - WAR corrigé : le 20/08 affiche **Stock = 99**, chaîne 18 → 11 → 99 → 92.
   - (Un WAR d'avant le correctif de lecture pouvait afficher 204.)
4. Le test navigateur `ui-suivi-mvt-article.js` automatise exactement ce
   contrôle (5/5 assertions vérifiées le 02/09/2026).

## Corriger l'historique existant (SQL rejouable)

`correction_204_suivi_mvt.sql`, à jouer **après sauvegarde** de `hmvtproduit` :

1. l'étape 1 (SELECT) liste sans rien écrire les lignes qui seront corrigées et
   leurs valeurs cible ;
2. l'étape 2 (UPDATE, à décommenter) retranche `qteMvt` au `qteDebut` et au
   `qteFinale` des seules lignes portant la signature du bug ;
3. l'étape 1 rejouée doit alors renvoyer **0 ligne**.

### Signature de détection (100 % spécifique)

Une ligne décon positif (`typeMvt = '05'`) est corrigée **uniquement si** :

- elle est cohérente en interne (`qteFinale = qteDebut + qteMvt`, vrai de toute
  ligne décon), **et**
- il existe une **vente** (`typeMvt = '02'`) du même produit et du même
  emplacement au **même `createdAt`** (même seconde), **et**
- le `qteDebut` de la décon vaut exactement `qteDebut de la vente + qteMvt`
  (la marque du gonflement).

Un déconditionnement **manuel** (pas de vente à la même seconde) ou une ligne
déjà saine ne remplissent pas la jointure : ils ne sont jamais modifiés.
Vérifié : ni une décon saine `4 → 104`, ni une décon manuelle `50 → 150` ne
sont détectées. Le script est **idempotent** (un second passage corrige 0 ligne,
car après correction plus aucune vente n'a `qteDebut = qteDebut_décon − qteMvt`).
