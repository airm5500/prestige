# Module comptabilité — conception

**Date** : 20 septembre 2026
**Périmètre retenu** : interface comptable (niveau 1), complète dès la première livraison
**Destination des écritures** : Sage 100 / SAARI
**Référentiel** : SYSCOHADA révisé (zone OHADA)
**Statut** : conception à valider — aucune ligne de code écrite

---

## 1. Le principe

**Prestige ne tient pas les comptes.** Il produit des écritures justes, équilibrées et traçables, et les
remet au logiciel du cabinet.

Cela n'est pas une limitation, c'est le choix qui rend le module fiable : pas d'exercice à rouvrir, pas
d'à-nouveaux à recalculer, pas d'états financiers réglementaires à suivre à chaque évolution du
référentiel. Prestige fait ce qu'il est seul à pouvoir faire — connaître le détail de chaque vente, de
chaque encaissement, de chaque livraison — et le livre dans la forme attendue.

Toute écriture garde le **lien vers sa pièce d'origine** dans Prestige. Une question du comptable se
résout en un clic, pas en une fouille.

---

## 2. Ce qui existe déjà et sera réutilisé

Le codage comptable est déjà amorcé dans la base. Le module s'appuie dessus au lieu de le refaire :

| Élément existant | Ce qu'il porte déjà |
|---|---|
| `t_type_mvt_caisse.str_CODE_COMPTABLE` | le compte de chaque **type** de mouvement de caisse, plus un code de regroupement et une catégorie (VENTE, ENTREE_CAISSE, SORTIE_CAISSE, ACHAT) |
| `t_mvt_caisse.str_NUM_COMPTE` / `str_NUM_PIECE_COMPTABLE` | le compte et le numéro de pièce, estampillés sur **chaque** mouvement (`CaisseServiceImpl`, `ReglementServiceImpl`) |
| `t_type_depense.str_NUMERO_COMPTE` / `is_USE_TVA` | le compte de charge de chaque type de dépense, et s'il porte TVA |
| `t_facture.str_CODE_COMPTABLE` | le compte comptable du tiers payant sur la facture |
| `t_famille` → `t_code_tva.int_VALUE` | le taux de TVA, par produit |
| `t_bon_livraison` | MHT / TVA / TTC de chaque livraison fournisseur |
| `t_officine` | compte contribuable, registre de commerce, registre d'imposition |

**Ce qui manque et que le module apporte** : le plan comptable, les journaux, les règles de ventilation,
les écritures en partie double, les contrôles et l'export.

---

## 3. Modèle de données

Sept tables, toutes nouvelles, toutes préfixées `t_compta_`. **Aucune table existante n'est modifiée.**

| Table | Rôle |
|---|---|
| `t_compta_exercice` | période comptable : dates de début et de fin, statut (ouvert / clôturé) |
| `t_compta_compte` | le plan comptable : numéro, libellé, classe, sens normal, lettrable ou non, statut |
| `t_compta_journal` | code (VE, AC, CA, BQ, OD), libellé, type, compte de contrepartie par défaut |
| `t_compta_ventilation` | **la règle** : quel critère mène à quel compte (voir § 5) |
| `t_compta_piece` | une pièce = un événement source : journal, date, référence, origine (table + identifiant), exercice, statut |
| `t_compta_ecriture` | les lignes de la pièce : compte, libellé, débit, crédit, tiers auxiliaire, lettrage |
| `t_compta_export` | la trace : période, journaux, format, date, utilisateur, nombre d'écritures, empreinte du fichier |

Les comptes pivots (caisse, banque, clients, fournisseurs, TVA collectée, TVA récupérable, compte
d'attente) sont des paramètres, pas des valeurs en dur.

---

## 4. Les journaux et leur origine exacte

| Journal | Source dans Prestige | Écriture produite |
|---|---|---|
| **VE — Ventes** | `t_preenregistrement` + `t_preenregistrement_detail`, journée close | **Débit** caisse/banque pour la part encaissée, client ou tiers payant pour la part différée · **Crédit** ventes de marchandises, ventilées par taux de TVA (et par famille si demandé) · **Crédit** TVA facturée |
| **CA — Caisse** | `t_mvt_caisse` de catégorie ENTREE_CAISSE / SORTIE_CAISSE, recoupé avec `t_resume_caisse` | **Débit ou Crédit** caisse contre le compte porté par le type de mouvement |
| **BQ — Banque** | `t_mvt_caisse` dont le mode de règlement est bancaire ou mobile money | même principe, sur le compte banque ou mobile money du mode de règlement |
| **AC — Achats** | `t_bon_livraison` (+ détail) et `t_depenses` | **Débit** achats de marchandises ou compte de charge du type de dépense, **Débit** TVA récupérable · **Crédit** fournisseur |
| **OD — Opérations diverses** | `t_facture` tiers payants, `t_dossier_reglement`, avoirs, écarts d'inventaire | facturation et règlement des organismes, variation de stock sur écart d'inventaire |

Les numéros de compte cités en § 7 sont une **proposition de départ**, à valider par le cabinet.

---

## 5. Les règles de ventilation

Le cœur du module. Une règle dit : *telle nature d'opération, sous tel critère, va sur tel compte.*

Critères prévus :

- **mode de règlement** (espèces, chèque, mobile money, virement, carnet, différé)
- **type de mouvement de caisse** (déjà porteur d'un compte)
- **type de dépense** (déjà porteur d'un compte)
- **taux de TVA** du produit
- **groupe / type de tiers payant** (assurance, carnet)
- **famille d'article**, si la ventilation des ventes par famille est souhaitée
- **grossiste**, pour le compte fournisseur

Les règles sont **saisies à l'écran**, pas codées. Le cabinet peut affiner sans passer par une livraison.

---

## 6. Les règles de sûreté

C'est ce qui rend le module acceptable pour un comptable. Chacune est un critère de recette.

1. **Équilibre garanti.** Une pièce dont le total débit diffère du total crédit n'est jamais enregistrée.
   Le contrôle est fait à la pièce, pas au fichier.
2. **Idempotence.** Régénérer une période ne duplique rien : les pièces de la période sont annulées puis
   reconstruites, tant que la période n'est pas verrouillée.
3. **Verrouillage de période.** Une fois la période exportée et validée par le cabinet, elle est close.
   Toute correction ultérieure passe par une opération diverse datée — jamais par une réécriture du passé.
4. **Traçabilité.** Chaque écriture porte l'origine (table + identifiant) et remonte à la pièce Prestige.
5. **Rien n'est perdu en silence.** Une opération sans règle de ventilation part sur un **compte
   d'attente**, jamais à la poubelle, et l'écran de contrôle la liste pour traitement.
6. **Rapprochement.** Le module compare ses totaux à ceux que Prestige affiche déjà (recette du jour,
   chiffre d'affaires, TVA) et signale tout écart. Si le journal des ventes ne retombe pas sur la recette
   du jour, l'écran le dit avant l'export, pas le cabinet trois semaines après.

---

## 7. Plan comptable de départ (à valider)

Proposition SYSCOHADA révisé, à confirmer avec le cabinet — notamment la longueur des numéros de
compte, qu'ils imposent souvent :

| Compte | Libellé | Usage |
|---|---|---|
| 401 | Fournisseurs | grossistes, par auxiliaire |
| 411 | Clients | comptant collectif, carnets |
| 4118 | Clients — tiers payants | un auxiliaire par organisme |
| 4431 | TVA facturée sur ventes | collectée |
| 4452 | TVA récupérable sur achats | déductible |
| 471 | Compte d'attente | opérations non ventilées |
| 521 | Banques | virements, chèques |
| 53x | Établissements financiers | mobile money (sous-compte à définir) |
| 571 | Caisse | espèces |
| 601 | Achats de marchandises | livraisons fournisseurs |
| 6031 | Variations des stocks de marchandises | écarts d'inventaire |
| 6xx | Charges par nature | selon le type de dépense |
| 701 | Ventes de marchandises | par taux de TVA |

---

## 8. Les écrans

1. **Paramétrage** — plan comptable (avec import d'un plan de départ), journaux, règles de ventilation,
   comptes pivots. Écran de saisie, réservé par privilège.
2. **Génération** — choix de la période et des journaux, aperçu des compteurs avant écriture, génération.
3. **Contrôle** — balance de contrôle, liste des opérations en compte d'attente, rapprochement avec les
   chiffres de Prestige. **Aucun export n'est proposé tant qu'un contrôle est en échec.**
4. **Export** — Sage et Excel, avec l'historique horodaté des exports et la possibilité de rejouer un
   export passé à l'identique.

---

## 9. Le point bloquant : le format d'import Sage

**Je ne peux pas deviner le gabarit d'import attendu par le cabinet.** Sage 100 / SAARI accepte
plusieurs formats — format Sage texte, import paramétrable en CSV — et chaque cabinet a ses habitudes
de colonnes, de séparateur, de format de date et de longueur de compte.

Il me faut **l'un des deux** :

- un **fichier d'exemple** d'import que le cabinet utilise déjà (même vide de vos données), ou
- sa **fiche de spécification** d'import.

En attendant, la conception prévoit un **export paramétrable** — colonnes, ordre, séparateur, format de
date, longueur et cadrage des comptes — pour coller à leur gabarit sans redéveloppement. L'export Excel,
lui, ne dépend de rien et marchera dès la première livraison.

---

## 10. À trancher avec le cabinet

| Question | Ma recommandation |
|---|---|
| Granularité du journal des ventes : par ticket, par jour, ou par jour et par compte ? | **par jour et par compte** — volume tenable, détail suffisant, et le détail au ticket reste consultable dans Prestige |
| Clients au comptant : compte collectif ou compte par client ? | **collectif** |
| Tiers payants : un auxiliaire par organisme ? | **oui** — c'est ce que le lettrage exigera ensuite |
| Fournisseurs : un auxiliaire par grossiste ? | **oui** |
| TVA : régime exact (produits pharmaceutiques exonérés, parapharmacie taxée ?) | à confirmer — la base porte déjà un taux par produit, le module s'y conforme |
| Longueur des numéros de compte et codes journaux imposés | à obtenir du cabinet |
| Facture normalisée / e-facturation DGI : déjà en place chez vous ? | à vérifier — cela peut ajouter une contrainte sur les pièces de vente |

---

## 11. Garantie de non-régression

Le module est **additif** :

- sept tables nouvelles, aucune table existante modifiée ;
- il **lit** les données de vente, de caisse, d'achat et de facturation, il n'en écrit aucune ;
- un menu nouveau, protégé par privilège ; aucun écran existant modifié ;
- s'il est désactivé, Prestige se comporte exactement comme aujourd'hui.

C'est le point qui justifie de le construire d'un bloc comme vous le souhaitez : le risque pour
l'existant est structurellement nul, et la recette porte sur des chiffres vérifiables — la balance
équilibre, les totaux retombent sur la recette du jour.

---

## 12. Découpage interne

Une seule livraison, mais construite et recettée dans cet ordre :

1. socle — migration, plan comptable, journaux, exercices, paramètres, écrans de paramétrage
2. moteur de ventilation et règles
3. journaux VE et CA/BQ (le gros du volume, et ce qui se rapproche de la recette du jour)
4. journaux AC et OD
5. contrôles, rapprochement, export Excel puis export Sage
6. campagne de banc sur vos données réelles, et jeu de tests sur les règles d'équilibre et d'idempotence

Le module n'est montré comme terminé qu'une fois la balance équilibrée et le rapprochement réussi sur
un mois complet de vos données.
