# Inventaire : écrans qui ne suivent pas la largeur de la fenêtre

**Date** : 13/11/2026. Relevé fait par lecture automatique du code de `general/app/view`, sans ouvrir les écrans. Il
signale des écrans **à risque**, pas des défauts prouvés.

## Chiffres

| Constat | Nombre de fichiers (sur 714 vues) | Effet à l'écran |
|---|---|---|
| Barre de filtres en parts relatives (`flex`) sans largeur minimale | **343** | dates, heures et listes coupées (« 13/11/2C ») dès que la place manque |
| Largeur de l'écran en pourcentage (`97%`, `99%`) | **257** | suit mal la fenêtre : ExtJS fige l'ancienne largeur (bande vide à droite) |
| Largeur fixe de 700 px ou plus | **151** | déborde sur un écran de 1 280 px, ou laisse du vide sur un écran de 1 920 px |
| Taille lue une seule fois sur la fenêtre, à l'ouverture | **26** | ne change plus si on agrandit la fenêtre ou si on change d'écran |

Au total, 1 853 champs de saisie sont concernés. Par module (fichiers à risque) :

| Module | Fichiers | Module | Fichiers |
|---|---|---|---|
| `sm_user` (ventes différées, règlements, factures) | 96 | `commandemanagement` | 21 |
| `configmanagement` (articles, paramètres) | 76 | `produits` | 20 |
| `stockmanagement` (inventaire, réserve, état du stock) | 48 | `Dashboard` | 17 |
| `Report` | 36 | `tierspayantmanagement` | 10 |
| `vente` | 30 | autres | 40 |

Les plus chargés : `garde/GardeManager.js` (75 largeurs fixes), `commandemanagement/order/action/add.js` (42),
`commandemanagement/suggestion/Suggestion_Manager.js` (37), `notification/WhatsAppComptes.js`,
`vente/user/UpdateVenteClientTpForm.js` (41 champs en `flex`, aucun minimum), `devis/DoDevis.js`,
`stockmanagement/inventaire/action/editInventaireManager.js`. Le détail par fichier est dans le tableau joint
(`inventaire.csv`).

## Proposition, court terme (ExtJS conservé)

1. **Une correction générale**, dans `correctifs-affichage.js`. Elle couvre la plupart des 343 barres d'un coup :
   - largeur minimale par défaut des champs de barre : date 128, heure 92, liste 160, texte 120 ;
   - une barre qui manque de place passe à la ligne au lieu de couper ses champs.
2. **Le recalage de la largeur après chaque geste** (en cours), pour la bande vide à droite.
3. **Les écrans les plus utilisés, un par un**, en remplaçant les grandes largeurs fixes par des parts relatives :
   vente, ventes terminées, entrée en stock, réserve, inventaire, articles, différés, tiers payant, tableau de bord.
   Chacun a un test d'écran à 1 280, 1 366 et 1 920 px, qui vérifie trois choses : rien n'est coupé, pas de bande
   vide, pas de barre de défilement horizontale.

Estimation :
- points 1 et 2 : environ une journée, tests compris ;
- point 3 : 2 à 3 écrans par jour, soit environ 2 semaines pour les 30 écrans principaux.

Les 700 vues restantes profitent de la correction générale. Elles ne seraient reprises une par une que sur
signalement.

## Long terme

Les nouveaux écrans, qui passent déjà par les API REST, seraient faits en HTML et CSS modernes (flexbox, grid), sans
ExtJS : ils sont alors réellement responsives. Les anciens écrans seraient remplacés au fil des évolutions.
