# Gestion des différés — correctifs, recette et mise en production

Ce dossier regroupe les livrables liés à la correction de la **gestion des
différés** (branche `differe`). Ce README explique **dans quel ordre** utiliser
chaque fichier.

---

## 1. Contexte

Des clients apparaissaient comme devant encore de l'argent alors que des
règlements avaient été effectués. Le diagnostic a identifié plusieurs causes
dans le code (règlements encaissés mais non imputés, dettes effacées au-delà du
montant payé, dettes fantômes sur ventes annulées, calculs de solde
incohérents entre écrans). Les correctifs applicatifs sont sur la branche
`differe` ; les scripts ci-dessous servent à **recetter** ces correctifs et à
**réparer** les données historiques.

---

## 2. Inventaire des fichiers

| Fichier | Rôle | Quand l'utiliser |
|---|---|---|
| `diagnostic_differes.sql` | **Lecture seule.** Identifie les anomalies (soldes divergents, dettes fantômes, paiements non imputés, dettes effacées). | Avant réparation, pour l'état des lieux. |
| `reparation_differes.sql` | **Écriture.** Répare les données historiques (ré-impute les paiements orphelins, purge les dettes fantômes, consomme les avoirs) et produit un rapport. | Après déploiement des correctifs, sur sauvegarde faite. |
| `cahier_recette_differes.xlsx` | Cahier de recette (paysage, 1 page en largeur) — 21 fiches à dérouler et signer. | Pendant la recette fonctionnelle. |
| `cahier_recette_differes.md` | Même cahier en Markdown (lecture rapide / versionnage). | Alternative au `.xlsx`. |
| `verifications_recette_differes.sql` | **Lecture seule.** Une requête de contrôle par fiche (CR-01 à CR-21). | Pendant la recette, pour vérifier chaque résultat en base. |
| `confirmation_diagnostics_differes.xlsx` / `.sql` | Prouve, sur la base actuelle, que les anomalies sont réelles avant correctif. | Avant déploiement, pour valider les diagnostics. |
| `db/migration/V6.3.2__differe_garde_fous_integrite.sql` | **Triggers SQL** (défense en profondeur) : pas de reste négatif sur différé positif ; annulation d'une vente ⇒ ses différés soldés (anti dette fantôme). Couvre les 5 chemins d'annulation. | Appliqué automatiquement par Flyway au déploiement. |
| `README_differes.md` | Ce document. | — |

---

## 3. Ordre d'utilisation

### Étape A — Préparer l'environnement de test
1. Déployer la branche `differe` sur un **environnement de test** (jamais la
   production directement).
2. Importer une **copie récente** de la base de production.
3. **Sauvegarder** cette base de test.
4. Créer un client « CLIENT RECETTE » et 7 ventes différées
   (voir les prérequis en tête du cahier de recette).

### Étape B — Recette fonctionnelle
1. Ouvrir `cahier_recette_differes.xlsx`.
2. Dérouler les fiches **CR-01 à CR-21**, rubrique par rubrique.
3. Pour contrôler chaque résultat en base, ouvrir
   `verifications_recette_differes.sql` :
   - renseigner les variables en tête (`@CLIENT_ID`, `@DOSSIER_ID`,
     `@VENTE_REF` — les *helpers* en bas du fichier aident à les retrouver) ;
   - exécuter la requête portant le **même numéro** que la fiche.
4. Noter OK / KO / R dans le cahier. Tout KO doit être décrit en observations.

### Étape C — Recette de la réparation des données (rubrique F du cahier)
1. Sur la **copie** de la base : exécuter `diagnostic_differes.sql`
   (au minimum sections 1, 2, 5) et noter les anomalies. **(CR-15)**
2. Exécuter `reparation_differes.sql`. **(CR-15)**
3. Consulter la table `reparation_differes_rapport` et
   ré-exécuter `diagnostic_differes.sql` : les anomalies doivent avoir disparu
   (hors montants à arbitrer). **(CR-16)**
4. Vérifier 2–3 clients témoins qui s'étaient plaints. **(CR-17)**

### Étape D — Décision de recette
Renseigner la synthèse et la feuille de décision (onglet du `.xlsx`).
Recette prononcée sans réserve / avec réserves / refusée.

---

## 4. Mise en production (après recette OK)

À faire **site par site** :

1. **Sauvegarde complète** de la base de production
   (`mysqldump -u root -p VOTRE_BASE > sauvegarde_avant_reparation.sql`).
2. **Déploiement** de l'application (branche `differe`).
3. Exécution de `reparation_differes.sql` sur la production.
4. Contrôle de `reparation_differes_rapport` et contre-diagnostic
   (`diagnostic_differes.sql`).
5. **Arbitrage** des deux listes du rapport :
   - `NON RE-IMPUTABLE` (section S2) : clients ayant payé d'avance
     → décider avoir client ou remboursement ;
   - section `S3` : dettes effacées au-delà du montant payé
     → décider réclamation ou passage en perte.

---

## 5. Points de vigilance

- Les scripts SQL sont écrits pour **MySQL / MariaDB**.
- `diagnostic_differes.sql` et `verifications_recette_differes.sql` sont en
  **lecture seule** : aucun risque à les exécuter.
- `reparation_differes.sql` **modifie les données** : toujours une sauvegarde
  préalable, et l'exécuter **après** le déploiement des correctifs (sinon les
  anomalies se recréent).
- Le déploiement doit précéder la réparation : les correctifs applicatifs
  empêchent la réapparition des anomalies que la réparation vient de corriger.
- Cas de test ajouté suite à une évolution parallèle de `dev`
  (« vente double règlement mobile ») : **CR-21** — vente différée réglée avec
  deux modes de paiement.
