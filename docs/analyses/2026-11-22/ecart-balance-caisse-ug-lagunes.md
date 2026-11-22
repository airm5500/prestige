# Lagunes : écart entre la balance, la visualisation de caisse et les ventes UG

Analyse en lecture seule de la copie locale `lagunes` (dernière vente le 21/11/2026 à 12:41, donc le 21/11 est
incomplet). Aucune donnée modifiée. Code lu sur `integration/recette-2026-10-29` ; la base de l'officine est au schéma
5.9.7 (juin 2026), sa version de Prestige est donc plus ancienne que le code lu.

Contrôle fait par l'officine : espèces de la visualisation de caisse = espèces de la balance + ventes UG.

## Réponse courte

L'égalité ne peut pas tomber juste, parce que les trois écrans ne comptent pas les mêmes choses. Trois causes,
toutes retrouvées dans les données :

1. **La caisse compte les règlements de tiers payant encaissés en espèces**, la balance ne compte que les ventes.
2. **L'écran des ventes UG compte toutes les ventes au comptant, quel que soit le mode de paiement.** Une UG payée
   par Wave y figure, alors que la balance la retire de la colonne Wave et non des espèces.
3. **Suspecté comme défaut : une vente encaissée restée à l'état « en cours »** est dans la caisse mais pas dans la
   balance (22 ventes en 2026, 132 835 F).

## Ce que compte chaque écran

| Écran | Espèces retenues | Date retenue |
|---|---|---|
| Visualisation de caisse | règlements en espèces de toutes les ventes, plus les autres mouvements de caisse en espèces | date du mouvement de caisse |
| Balance vente/caisse | règlements en espèces des ventes clôturées, moins la part UG du règlement (ventes au comptant) | date de la vente |
| Ventes UG | quantité UG × prix unitaire des ventes au comptant clôturées, non annulées, tous modes de paiement | date de la vente |

## 20/11/2026

| Élément | Montant |
|---|---:|
| Caisse, espèces des ventes (348 règlements) | 1 260 186 |
| Caisse, règlements de tiers payant en espèces (2) | 7 570 |
| **Caisse, total espèces** | **1 267 756** |
| UG retirées des espèces par la balance (4 ventes) | 10 375 |
| **Balance, espèces** | **1 249 811** |
| **Écran des ventes UG (7 ventes)** | **14 375** |
| Écart : caisse − balance − UG | 3 570 |

L'écart de 3 570 F se décompose exactement :

- + 7 570 : deux règlements de tiers payant en espèces, à 19:55 (4 280 et 3 290), présents dans la caisse seulement ;
- − 4 000 : trois ventes UG payées par Wave (tickets `261120_00097`, `00112`, `00172` : 2 000, 1 000, 1 000),
  présentes dans l'écran des UG mais sans effet sur les espèces.

Ventes UG du jour : `00097` (Wave), `00098`, `00112` (Wave), `00159`, `00172` (Wave), `00223`, `00406`.

## 21/11/2026 (jusqu'à 12:41)

| Élément | Montant |
|---|---:|
| **Caisse, total espèces** (130 règlements) | **625 008** |
| UG retirées des espèces par la balance (7 ventes) | 22 145 |
| **Balance, espèces** | **598 763** |
| **Écran des ventes UG (7 ventes)** | **22 145** |
| Écart : caisse − balance − UG | 4 100 |

L'écart de 4 100 F vient d'une seule vente : `261121_00113`, au comptant, 4 100 F en espèces, à 11:23.

- Elle a un ticket, un mouvement de caisse, un règlement, ses deux lignes clôturées et ses deux sorties de stock.
- Son en-tête est resté à l'état « en cours » (`is_Process`) au lieu de « clôturé ».
- La caisse la compte, la balance l'ignore.

Les sept ventes UG du jour sont toutes payées en espèces : elles ne créent pas d'écart. Les deux annulations du jour
(2 990 et 4 770) s'annulent dans les deux écrans.

## La vente restée « en cours » : cas répété

22 ventes au comptant de 2026 sont dans cet état (première le 16/01, dernière le 21/11), pour 132 835 F encaissés.
Toutes ont leurs lignes clôturées, 21 ont un ticket. Ces ventes manquent à la balance et au chiffre d'affaires.

Je n'ai pas cherché la cause dans le code : c'est un défaut suspecté, à instruire à part.

## Limites

- Je n'ai pas vu vos écrans : les montants ci-dessus sont recalculés depuis la base avec les règles du code actuel.
  Si vos écarts ne sont pas 3 570 et 4 100, la version de l'officine calcule autrement et il faut me donner vos
  chiffres.
- La journée du 21/11 s'arrête à 12:41 sur la copie.
- Aucune colonne nominative lue.
