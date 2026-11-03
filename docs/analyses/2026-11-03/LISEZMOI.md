# Analyses du 3 novembre 2026 — quatre fonctionnalités à venir

Demande d'origine : [analyse_new.md](analyse_new.md) (copie du fichier de l'utilisateur, noms de personnes masqués).
Réponses et décisions du 03/11 : [reponses_evolution.md](reponses_evolution.md) — chaque analyse commence par un §0 « Décisions » et les maquettes sont la version validée.
Ce dossier ne contient **que des documents et des maquettes HTML statiques** : aucun code de l'application n'a été modifié.
Les maquettes s'ouvrent directement dans un navigateur (largeur recommandée ≥ 1 280 px pour les écrans de vente).

| Cas | Analyse | Maquettes |
|-----|---------|-----------|
| 1. Ligne au comptant dans une vente à crédit (une saisie, deux tickets) | [cas1-ligne-comptant-vente-credit.md](cas1-ligne-comptant-vente-credit.md) | [cas1-ligne-comptant.html](cas1-ligne-comptant.html) · [cas1-tickets.html](cas1-tickets.html) |
| 2. Prix et taux de référence par tiers-payant saisis à la caisse | [cas2-prix-taux-reference-caisse.md](cas2-prix-taux-reference-caisse.md) | [cas2-prix-reference-caisse.html](cas2-prix-reference-caisse.html) |
| 3. Ordonnancier : onglet Produits et produits sensibles | [cas3-ordonnancier-produits.md](cas3-ordonnancier-produits.md) | [cas3-ordonnancier-produits.html](cas3-ordonnancier-produits.html) |
| 4. Cacher le mot de passe de la base (configuration et sauvegardes) | [cas4-mot-de-passe-base.md](cas4-mot-de-passe-base.md) | [cas4-securite-base.html](cas4-securite-base.html) |

Chaque analyse suit le même plan : existant dans le code (fichiers et lignes), ce qui est possible, règles métier à trancher
(questions numérotées Qx.y), risques de régression, ce qu'il faudrait toucher. Les questions sont reprises en fin de chaque document ;
rien n'est à réaliser avant qu'elles soient tranchées.
