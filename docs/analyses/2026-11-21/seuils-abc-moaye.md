# Moaye : seuils et quantités de réappro non calculés (SEMOIS ABC)

Analyse en lecture seule de la copie locale `moaye` (dernière vente le 20/11/2026 à 14:43), code lu sur
`integration/recette-2026-10-29` (`e68867362`), classe `job/SemoisService.java`. Aucune donnée modifiée.

## Réponse courte

- **Le calcul ABC ne traite que les produits vendus dans sa fenêtre de calcul.** Un produit sans vente dans cette
  fenêtre n'est pas touché : il garde ses anciennes valeurs.
- **À Moaye, la fenêtre se réduit à octobre 2026.** L'officine a démarré le 01/10/2026 et seuls les mois terminés
  comptent.
- **Le produit 1416831 n'a été vendu qu'en novembre** (une boîte), donc il est hors fenêtre. Il garde les valeurs
  posées à la reprise des données : seuil 100, quantité de réappro 1.
- **4 020 produits actifs sont dans le même cas** (seuil 100, quantité 1), dont 307 vendus en novembre.
- **Second défaut, plus large :** pour les produits calculés, la consommation d'un seul mois est divisée par
  12 semaines. Les seuils des 2 024 produits calculés sont environ trois fois trop bas.

## Paramétrage constaté

| Paramètre | Valeur |
|---|---|
| `SEMOIS` | 1 |
| `SEMOIS_ABC` | 1 |
| `SEMOIS_PAR_PRODUIT` | 0 |
| `Q1` / `Q2` / `Q3` globaux | 2 / 2 / 3 |
| Classe A | Q1 2, Q2 2, 3 mois, à la semaine |
| Classe B | Q1 2, Q2 1, 3 mois, à la semaine |
| Classe C | Q1 1, Q2 1, 3 mois, à la semaine |
| `KEY_DAY_SEUIL_REAPPRO` | 2026-11-21 (dernier calcul à 10:34) |

## Défaut 1 (confirmé) : les produits sans vente dans la fenêtre sont oubliés

`computeReapproAbc` charge la consommation mensuelle (`loadMonthlyConsoAbc`), puis ne parcourt que les produits
présents dans ce résultat (`produitIds = conso.keySet()`). Aucun passage ne traite les autres produits.

Le mode par défaut (`StockReapproServiceImpl.computeInvendus`) remet au contraire les invendus à zéro. Le mode ABC
n'a pas d'équivalent.

La fenêtre est construite par `nombreMoisPleinsConsommation` : les trois mois précédant le mois en cours, à condition
que le calendrier du mois compte au moins 20 jours. Le 21/11, cela donne août, septembre et octobre. Le calendrier de
Moaye ne commence qu'en octobre 2026, donc seul octobre est retenu.

Cas du produit 1416831 (02 NEX 50MG/125MG SUSP BUV F/60ML) :

| Élément | Valeur |
|---|---|
| Création de la fiche | 01/10/2026 (reprise des données) |
| Dernière entrée en stock | 13/11/2026 |
| Ventes en octobre | aucune |
| Ventes en novembre | 1 boîte |
| Classe ABC | C |
| Calcul du seuil autorisé (`bool_CALCUL_SEUIL`) | oui |
| Seuil / quantité de réappro | 100 / 1, valeurs de la reprise |
| Stock | 1 |

Mesure sur les 6 186 produits actifs (hors détails de déconditionnement) :

| Population | Nombre |
|---|---:|
| Vendus en octobre, donc calculés | 2 122 |
| Non vendus en octobre, donc oubliés | 4 064 |
| dont restés à seuil 100 / quantité 1 | 4 020 |
| dont vendus en novembre | 316 |
| dont exclus volontairement du calcul | 0 |

Sur les 4 064 oubliés, 3 744 n'ont aucune classe ABC et 320 en ont une (3 en A, 21 en B, 296 en C).

Conséquence : un seuil de 100 place ces produits sous leur seuil en permanence, avec une quantité de réappro de 1.

Le produit 1416831 sera calculé au prochain passage mensuel (décembre), puisque novembre entrera dans la fenêtre.
Les 3 748 produits jamais vendus resteront à 100 / 1 tant qu'ils ne se vendent pas.

## Défaut 2 (confirmé) : un mois de ventes divisé par douze semaines

La consommation hebdomadaire est `consoTotale / (q3 × 4)`, avec q3 = 3 mois, soit 12 semaines. Le diviseur ne tient
pas compte du nombre de mois réellement présents dans la fenêtre. À Moaye, la consommation est celle d'octobre seul,
divisée par 12.

Vérification : les 2 024 produits simples vendus en octobre ont tous un seuil et une quantité égaux à
`arrondi supérieur(conso d'octobre / 12 × Q)`.

| CIP | Ventes d'octobre | Classe | Seuil calculé | Seuil avec 4 semaines |
|---|---:|---|---:|---:|
| 3073979 | 336 | A | 56 | 168 |
| 3057331 | 282 | A | 47 | 141 |
| 8113867 | 196 | A | 33 | 98 |
| 8212003 | 179 | A | 30 | 90 |
| 2264298 | 171 | A | 29 | 86 |

Le défaut se résorbe seul : seuils trois fois trop bas en novembre, une fois et demie en décembre, justes en janvier.
Il touche toute officine pendant ses trois premiers mois sur Prestige. Le mode SEMOIS standard et le mode par produit
ont le même diviseur.

## Corrections proposées (non réalisées)

1. Dans les trois modes SEMOIS, diviser par le nombre de mois réellement retenus dans la fenêtre, et non par q3.
2. Dans le mode ABC et le mode par produit, traiter aussi les produits actifs sans vente dans la fenêtre : seuil et
   quantité à zéro, comme le mode par défaut, en respectant `bool_CALCUL_SEUIL`.
3. Décision métier à prendre : faut-il compter le mois en cours quand l'historique est inférieur à q3 mois ?

## Décisions du 21/11

- Les corrections 1 et 2 sont validées.
- Demande ajoutée : en SEMOIS ABC, un produit sans classe reçoit le calcul SEMOIS standard (Q1, Q2 et Q3 globaux)
  lors du recalcul.
- État du code sur ce point : le repli existe déjà pour les produits sans classe vendus dans la fenêtre
  (`cls == null`). Il manque pour les produits sans classe non vendus, qui sont oubliés comme les autres (3 744 à
  Moaye). La correction 2 les couvre : consommation nulle, donc seuil et quantité à zéro.
- Le point 3 (compter ou non le mois en cours) reste ouvert. Sans décision, le mois en cours n'est pas compté.
- Transmis à la session principale pour réalisation.

## Limites

- Les journaux de calcul (`~/Documents/reappro_logs/semois_abc_<date>.json`) sont sur le poste de l'officine, je ne
  les ai pas lus. Les conclusions reposent sur le code et sur l'état de la base.
- Je n'ai pas rejoué le calcul : la base n'a pas été modifiée.
