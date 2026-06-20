# Cahier de recettes — Classification ABC & SEMOIS par classe

> Fonctionnalité ABC (classification des produits par rotation) + intégration optionnelle SEMOIS.
> Branche : `claude/laughing-gauss-eycqgn`. Base PR : `dev`.

## Préalables
- Application déployée, migrations Flyway `V6.1.7 → V6.2.2` appliquées.
- Jeu de ventes sur ≥ 2–3 mois incluant : produits simples, une **boîte déconditionnée + son détail**, des produits à **CA/quantité identiques** (ex æquo), et des produits **invendus** sur la période.
- Paramètres par défaut au départ : `SEMOIS_ABC=0`, `ABC_AUTO_RECLASS=1`, `ABC_RECLASS_NB_MOIS=12`.
- Faire un **Ctrl+F5** après déploiement (cache JS ExtJS).
- Restitution par cas : **OK / KO / N/A** (+ capture si KO), navigateur + version, Ctrl+F5 effectué (oui/non).

---

## 0. Déploiement / socle
| ID | Étapes | Résultat attendu | Statut |
|---|---|---|---|
| 0.1 | Démarrer l'appli, ouvrir le log serveur | Aucune erreur EJB/JNDI/Flyway ; toutes migrations « Success » | |
| 0.2 | `SELECT * FROM t_classe_abc` | 3 lignes A/B/C (Q1=2/3/4, Q2=1/2/2, Q3=3, SEMAINE, bornes 0‑80 / 80‑95 / 95‑100) | |
| 0.3 | `SELECT` colonnes `t_famille` | `lg_CLASSE_ABC_ID`, `str_CODE_GEO_ARTICLE`, `dt_UPDATED_CLASSE_ABC` présentes | |
| 0.4 | `SELECT * FROM t_parameters WHERE str_KEY LIKE 'ABC%' OR str_KEY='SEMOIS_ABC'` | 4 paramètres présents, valeurs par défaut | |

## 1. Fiche article — Code Geo & Classe ABC (Lot 0)
| ID | Étapes | Résultat attendu | Statut |
|---|---|---|---|
| 1.1 | Fiche article → ouvrir un produit → saisir un **Code Geo** (ex. `A12-B03`) → Enregistrer → rouvrir | Code Geo **persisté** | |
| 1.2 | Vider le Code Geo → Enregistrer → rouvrir | Code Geo vidé | |
| 1.3 | Sur la fiche, repérer **Classe ABC** | Affichée en lecture seule ; « Non classé » tant qu'aucune classif appliquée | |
| 1.4 | **Créer** un nouveau produit avec un Code Geo | Création OK + Code Geo enregistré | |

## 2. Menu Classification ABC — grille (Lot 1)
| ID | Étapes | Résultat attendu | Statut |
|---|---|---|---|
| 2.1 | Ouvrir le menu **Classification ABC** | Menu présent (à côté du 20/80) ; grille se charge | |
| 2.2 | Période + type **CA** → Rechercher | Lignes A/B/C avec Part %, Cumul %, classe, CA, marge, quantité, stock, seuil, qté réappro | |
| 2.3 | Vérifier le **Cumul %** | Croissant, atteint 100 % sur la dernière ligne | |
| 2.4 | Type → **Quantité**, puis **Marge** | Classement et % recalculés selon le critère | |
| 2.5 | Filtre **Classe = A** | Seules les lignes A ; le **résumé A/B/C reste complet** | |
| 2.6 | Filtre **Stock** (= 0, < seuil, …) | Lignes filtrées correctement | |
| 2.7 | **Recherche** (CIP, libellé, EAN, Code Geo) | Filtrage correct | |
| 2.8 | Filtres **famille / rayon / grossiste** | Filtrage correct | |
| 2.9 | **Pagination** (changer de page) | Filtres conservés entre pages | |
| 2.10 | Ligne **résumé** en bas | `Classe A: n -> CA … F.CFA | B … | C …  ( N produits -> CA Total = … F.CFA )` avec couleurs (A vert, B orange, C rouge, nombre marron, montant bleu) | |

## 3. Recalculer / Appliquer / Paramétrer
| ID | Étapes | Résultat attendu | Statut |
|---|---|---|---|
| 3.1 | **Recalculer classification** | Message nb produits A/B/C ; **pas** d'écriture en base | |
| 3.2 | **Appliquer aux fiches** → confirmer | Message « classes appliquées sur N fiches » | |
| 3.3 | Rouvrir une fiche article classée | Classe ABC renseignée ; `dt_UPDATED_CLASSE_ABC` à jour | |
| 3.4 | **Paramétrer les classes** | Fenêtre grille éditable (Q1, Q2, Q3, Unité, Cumul min/max, Statut) | |
| 3.5 | Modifier `Cumul max` de A (80 → 85) → fermer → relancer | Frontière A/B déplacée (plus de produits en A) | |
| 3.6 | Mettre une classe **Unité = JOUR** puis revenir SEMAINE | Valeur enregistrée | |

## 4. Détail consommation produit
| ID | Étapes | Résultat attendu | Statut |
|---|---|---|---|
| 4.1 | Icône **Détail** sur une ligne | Fenêtre **horizontale** : colonnes = **mois nommés** (Juin, Mai…), largeur ∝ nom, + **Total en rouge** | |
| 4.2 | Entête de la fenêtre | `[CIP] Libellé` (CIP avant le nom) | |
| 4.3 | Détail sur un **produit déconditionné (parent)** | Conso inclut les ventes **du détail consolidées** sur le parent | |
| 4.4 | Temps d'affichage | Rapide | |

## 5. Exports / PDF / Inventaire / Suggestion (Lot 2)
| ID | Étapes | Résultat attendu | Statut |
|---|---|---|---|
| 5.1 | Filtre (ex. Classe A + rayon) → **Exporter → Excel** | Contient **uniquement le résultat filtré** (toutes lignes) + colonnes Conso M…M‑6 | |
| 5.2 | **Exporter → CSV** | Idem, séparateur `;`, accents corrects (BOM UTF‑8) | |
| 5.3 | **Imprimer** (PDF) | Paysage : nom **sur une ligne**, Qté réappro après Seuil, colonnes **M, M‑1, M‑2, M‑3**, CA/Marge avec **séparateurs de milliers**, **résumé coloré** en haut | |
| 5.4 | **Créer inventaire** sur un filtre | Message « N produits » ; inventaire contient **exactement** ces produits | |
| 5.5 | **Créer suggestion** | Suggestions créées, **groupées par grossiste** | |
| 5.6 | Icônes des boutons | Toutes présentes (dont inventaire) ; export = **un seul bouton à flèche** Excel/CSV | |

## 6. Courbe d'évolution (Lot 3)
| ID | Étapes | Résultat attendu | Statut |
|---|---|---|---|
| 6.1 | Bouton **Courbe évolution** | Graphe ligne **A (vert) / B (orange) / C (rouge)** par mois | |
| 6.2 | Changer l'indicateur (CA / Quantité / Marge / Nombre de produits) | Courbes recalculées | |
| 6.3 | Cohérence | Classes **figées sur la période** (FIXED) ; valeurs cohérentes avec le résumé | |

## 7. Tooltips pédagogiques
| ID | Étapes | Résultat attendu | Statut |
|---|---|---|---|
| 7.1 | Survol cellule **Part %** | Bulle bleue (calcul) + **valeur en rouge** ; reste tant que la souris est dessus | |
| 7.2 | Survol **Cumul %** | Bulle explicative idem | |
| 7.3 | Déplacer la souris sur plusieurs cellules | **Aucun plantage / gel** | |

## 8. SEMOIS ABC (Lot 4)
| ID | Préconditions | Étapes | Résultat attendu | Statut |
|---|---|---|---|---|
| 8.1 | `SEMOIS_ABC=0`, mode réappro = semois | `GET /api/v1/update/compute-reappro` | Seuils/quantités **identiques** à l'existant (comparer un échantillon) | |
| 8.2 | `SEMOIS_ABC=1`, produits classés | Compute | Seuil/qté avec **Q1/Q2/Q3 de la classe** du produit | |
| 8.3 | Une classe en **Unité = JOUR** | Compute | Calcul basé sur les **jours calendaires** (≠ semaines) | |
| 8.4 | Produit **sans classe** (SEMOIS_ABC=1) | Compute | **Fallback** : SEMOIS standard global | |
| 8.5 | Classes avec **Q3 différents** (A=3, C=6) | Compute | Chaque produit utilise la **fenêtre d'historique de sa classe** | |
| 8.6 | Produit **déconditionné** | Compute | Conso détail consolidée sur le parent (équivalent‑boîte) | |

> Pour 8.x : noter quelques produits (CIP, seuil/qté avant/après) pour comparaison chiffrée.

## 9. Reclassification automatique
| ID | Étapes | Résultat attendu | Statut |
|---|---|---|---|
| 9.1 | Vider `ABC_LAST_RECLASS_DATE` → `POST /api/v1/articles/abc/auto-reclassify` | `count` > 0 ; `ABC_LAST_RECLASS_DATE` = date du jour | |
| 9.2 | Rejouer l'appel le **même mois** | `skipped: already-done` | |
| 9.3 | `ABC_AUTO_RECLASS=0` → rappeler | `skipped: disabled` | |
| 9.4 | Vérifier les fiches après 9.1 | Classes ABC renseignées (pharmacie entière) | |

## 10. NON‑RÉGRESSION (existant) — priorité haute
| ID | Étapes | Résultat attendu | Statut |
|---|---|---|---|
| 10.1 | Connexion + ouvrir **tous les menus** existants | Aucun écran cassé | |
| 10.2 | **Fiche article** : liste se charge | OK | |
| 10.3 | **Créer** un produit (flux normal) | OK + (si Code Geo saisi) persisté | |
| 10.4 | **Modifier** un produit | OK | |
| 10.5 | **Déconditionner** (créer un détail) | OK, comme avant | |
| 10.6 | Désactiver / réactiver un produit | OK | |
| 10.7 | Modifier **EAN / rayon** (« lite ») | OK | |
| 10.8 | **Menu 20/80** : grille + Excel + CSV + PDF + inventaire + suggestion | **Identiques à avant** | |
| 10.9 | **SEMOIS standard** (`SEMOIS_ABC=0`) | Seuils inchangés (cf. 8.1) | |
| 10.10 | **Suggestions** réappro existantes | Inchangées | |
| 10.11 | **Droits/menus par rôle** (≥ 2 profils) | Aucun accès perdu ; menu ABC visible pour les rôles qui voient le 20/80 | |
| 10.12 | Zones géographiques / rayons existants | Affichage inchangé | |

## 11. Cas limites / robustesse
| ID | Étapes | Résultat attendu | Statut |
|---|---|---|---|
| 11.1 | Période **sans aucune vente** | Grille vide, résumé à 0, pas d'erreur | |
| 11.2 | Période très courte (1 jour) | Pas d'erreur | |
| 11.3 | **Ex æquo** (2 produits même CA et même quantité) | Classement **stable et reproductible** entre 2 recherches identiques | |
| 11.4 | Produit **invendu** sur la période | **Absent** de la grille (base = produits vendus) | |
| 11.5 | Classe **désactivée** (Statut = disable) puis recherche | Bornes par défaut (80/95) ; pas d'erreur | |
| 11.6 | Très **longue période** (12 mois) sur gros catalogue | Se charge (noter le temps de réponse) | |

---

## Annexe — Endpoints REST (`/api/v1/articles/abc`)
`GET /` · `POST /recalculate` · `POST /apply` · `GET /excel` · `GET /csv` · `GET /print` · `POST /inventaire` · `POST /suggestion` · `GET /produit/conso` · `GET /evolution` · `POST /auto-reclassify` · `GET /classes` · `POST /classes/update`

## Annexe — Paramètres (`t_parameters`)
| Clé | Défaut | Rôle |
|---|---|---|
| `SEMOIS_ABC` | `0` | SEMOIS par classe (0 = standard) |
| `ABC_AUTO_RECLASS` | `1` | Reclassification auto mensuelle |
| `ABC_RECLASS_NB_MOIS` | `12` | Historique de la classif auto |
| `ABC_LAST_RECLASS_DATE` | (vide) | Date du dernier recalcul auto (système) |
| Bornes de classe (A/B/C) | 80 / 95 | Éditables via « Paramétrer les classes » |

## Annexe — Filet de sécurité (rollback sans redéploiement)
- `SEMOIS_ABC=0` → calcul réappro standard.
- `ABC_AUTO_RECLASS=0` → pas de reclassification automatique.
- Désactiver le privilège du menu ABC pour le masquer.
