# CAHIER DE RECETTE — Gestion des différés

| | |
|---|---|
| **Projet** | Prestige — Gestion officine |
| **Branche livrée** | `differe` |
| **Périmètre** | Règlement des différés (sélectif et global), annulation de ventes différées, cohérence des soldes, nouvel onglet « Différés réglés », réparation des données historiques |
| **Version du document** | 1.0 |
| **Rédigé le** | 02/07/2026 |
| **Recette réalisée par** | ______________________ |
| **Date de la recette** | ______________________ |

---

## 1. Rappel des correctifs livrés

1. **Règlement sélectif** : on ne règle que les dossiers cochés. Le serveur vérifie chaque dossier (existence, appartenance au client, vente non annulée, non déjà réglé). Un montant payé supérieur au total coché est refusé (la monnaie est rendue, jamais imputée). Si l'imputation échoue, rien n'est enregistré.
2. **Règlement global** : le serveur recalcule le total réel en base et refuse si la liste affichée est périmée. Distribution ligne à ligne — plus jamais de dette effacée au-delà du montant encaissé.
3. **Annulation de vente** : toutes les lignes de dette de la vente sont soldées.
4. **Soldes harmonisés** : fiche client, écran de règlement et historique utilisent la même formule (lignes clôturées, ventes non annulées, somme nette avec avoirs).
5. **Nouvel onglet « DIFFÉRÉS RÉGLÉS »** sur l'écran Gestion différés.
6. **Script de réparation** des données historiques (`scripts/reparation_differes.sql`).

## 2. Prérequis de la recette

- [ ] Application de la branche `differe` déployée sur un **environnement de test** (jamais directement en production).
- [ ] Base de test = copie récente de la production (`mysqldump` puis import).
- [ ] **Sauvegarde** de la base de test réalisée avant la recette.
- [ ] Un utilisateur caissier avec **caisse ouverte** ; un second poste (ou second navigateur) disponible pour les tests de concurrence.
- [ ] Un client de test « CLIENT RECETTE » créé, avec compte client actif.
- [ ] Créer au préalable **7 ventes différées** pour ce client (montants conseillés : 1 000 / 1 000 / 1 000 / 2 000 / 5 000 / 4 000 / 6 000 = total 20 000).

**Convention** : chaque fiche se conclut par OK (conforme), KO (écart bloquant) ou R (réserve non bloquante). Tout KO doit être décrit en observations.

---

## 3. Fiches de test

### A. Règlement sélectif (écran « Faire un règlement », option partielle)

#### CR-01 — Règlement exact de la sélection
| | |
|---|---|
| **Objectif** | Vérifier le règlement nominal de dossiers cochés |
| **Étapes** | 1. Ouvrir « Faire un règlement », choisir CLIENT RECETTE. 2. Cocher 3 dossiers de 1 000 (total 3 000). 3. Saisir montant reçu = 3 000. 4. Valider. |
| **Résultat attendu** | Message « Opération effectuée ». Les 3 dossiers disparaissent de la liste des différés. Le solde du client baisse de 3 000. Proposition d'impression du ticket. |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

#### CR-02 — Monnaie à rendre (reçu > sélection)
| | |
|---|---|
| **Objectif** | Le surplus est rendu en monnaie, jamais imputé ni perdu |
| **Étapes** | 1. Cocher 3 dossiers = 3 000. 2. Saisir montant reçu = 5 000. 3. Vérifier le champ « monnaie » affiché. 4. Valider. |
| **Résultat attendu** | L'écran affiche 2 000 de monnaie à rendre. Le règlement enregistré est de **3 000** (vérifier dans l'historique des règlements et en caisse : mouvement de 3 000, pas 5 000). Les 3 dossiers sont soldés, les 4 autres inchangés. |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

#### CR-03 — Liste périmée : dossiers déjà réglés ailleurs
| | |
|---|---|
| **Objectif** | Refus si les dossiers cochés ont déjà été réglés entre-temps |
| **Étapes** | 1. Ouvrir l'écran de règlement du même client sur **deux postes** (ou deux onglets). 2. Sur le poste A, régler 2 dossiers. 3. Sur le poste B, **sans actualiser**, cocher les mêmes dossiers et valider un règlement. |
| **Résultat attendu** | Le poste B est refusé avec un message du type « Un des dossiers sélectionnés est déjà réglé. Veuillez actualiser la liste ». **Aucun** mouvement de caisse ni règlement n'est enregistré pour le poste B. Le solde du client n'a baissé qu'une seule fois. |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

#### CR-04 — Règlement partiel de la sélection (reçu < sélection)
| | |
|---|---|
| **Objectif** | Distribution du paiement partiel dans l'ordre d'ancienneté |
| **Étapes** | 1. Cocher 2 dossiers (2 000 + 5 000 = 7 000). 2. Saisir montant reçu = 4 000. 3. Valider. |
| **Résultat attendu** | Le dossier le plus ancien (2 000) est soldé ; le second passe de 5 000 à 3 000 de reste. Total imputé = 4 000 exactement. |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

#### CR-05 — Aucune sélection
| | |
|---|---|
| **Étapes** | Valider un règlement sans cocher aucun dossier. |
| **Résultat attendu** | Message « Veuillez sélectionner au moins un dossier ». Rien n'est enregistré. |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

#### CR-06 — Double validation rapide
| | |
|---|---|
| **Objectif** | Un double-clic ne crée pas deux règlements |
| **Étapes** | 1. Cocher 1 dossier. 2. Saisir le montant. 3. Cliquer deux fois très vite sur Valider (ou valider, puis revalider sans actualiser). |
| **Résultat attendu** | Un seul règlement enregistré. La seconde tentative est refusée (« déjà réglé / actualiser »). Un seul mouvement de caisse. |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

### B. Règlement global (« régler tout »)

#### CR-07 — Règlement total nominal
| | |
|---|---|
| **Étapes** | 1. Choisir un client avec plusieurs différés sur la période affichée. 2. Choisir le règlement total. 3. Saisir le montant exact affiché. 4. Valider. |
| **Résultat attendu** | Tous les différés de la période sont soldés. Solde restant cohérent sur tous les écrans. |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

#### CR-08 — Liste périmée : refus avec le total réel
| | |
|---|---|
| **Objectif** | Plus jamais de dette effacée au-delà de l'encaissé |
| **Étapes** | 1. Afficher l'écran de règlement total d'un client. 2. Sur un autre poste, créer une **nouvelle vente différée** pour ce client (dans la période) OU régler un de ses différés. 3. Revenir au premier poste et valider **sans actualiser**. |
| **Résultat attendu** | Refus avec un message indiquant le **total réel** et demandant d'actualiser. Aucun règlement ni mouvement de caisse enregistré. Après actualisation et nouvelle validation avec le bon montant : succès. |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

#### CR-09 — Vente annulée exclue du règlement global
| | |
|---|---|
| **Étapes** | 1. Créer une vente différée puis l'**annuler**. 2. Faire un règlement total du client. |
| **Résultat attendu** | La vente annulée n'apparaît ni dans la liste ni dans le total. Le règlement n'y touche pas. |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

### C. Annulation de ventes différées

#### CR-10 — Annulation d'une vente différée non réglée
| | |
|---|---|
| **Étapes** | 1. Créer une vente différée de 5 000. 2. Noter le solde du client. 3. Annuler la vente. |
| **Résultat attendu** | Le solde du client baisse de 5 000 **sur tous les écrans** (fiche client, écran de règlement, gestion différés). La dette n'apparaît plus nulle part. |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

#### CR-11 — Annulation d'une vente différée partiellement réglée
| | |
|---|---|
| **Étapes** | 1. Créer une vente différée de 5 000. 2. Régler 2 000. 3. Annuler la vente. |
| **Résultat attendu** | Le reste (3 000) disparaît du solde du client. Aucune dette fantôme. |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

### D. Cohérence des soldes

#### CR-12 — Même solde sur tous les écrans
| | |
|---|---|
| **Étapes** | Pour 3 clients différents (dont un avec des règlements partiels), relever le solde différé affiché : 1. fiche client (liste des clients), 2. écran « Faire un règlement », 3. onglet « LISTE DES REGLEMENTS » (en-tête SOLDE), 4. onglet « LISTE DES DIFFERES » (total reste à payer, période large). |
| **Résultat attendu** | Le même montant partout, au franc près. |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

### E. Nouvel onglet « DIFFÉRÉS RÉGLÉS »

#### CR-13 — Affichage des dossiers soldés
| | |
|---|---|
| **Étapes** | 1. Régler entièrement 2 différés d'un client. 2. Ouvrir Gestion différés → onglet « DIFFERES REGLES » avec la date du jour. |
| **Résultat attendu** | Les 2 dossiers apparaissent avec : référence de vente, client, montant total vente, **montant payé**, date et heure du solde. Regroupement par client, total payé en pied de groupe. |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

#### CR-14 — Filtres de l'onglet
| | |
|---|---|
| **Étapes** | 1. Tester le filtre par période (dossier soldé hier vs aujourd'hui). 2. Tester le filtre par client. 3. Tester la recherche par nom. |
| **Résultat attendu** | Chaque filtre restreint correctement la liste ; un dossier partiellement réglé n'y apparaît **pas** ; une vente annulée n'y apparaît pas. |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

### F. Réparation des données historiques (sur copie de la base réelle)

#### CR-15 — Exécution du script de réparation
| | |
|---|---|
| **Étapes** | 1. Sur la **copie** de la base de production : exécuter `scripts/diagnostic_differes.sql` (sections 1, 2, 5) et noter les anomalies. 2. Exécuter `scripts/reparation_differes.sql`. 3. Consulter la table `reparation_differes_rapport`. |
| **Résultat attendu** | Le script se termine sans erreur. Le rapport liste : S1 (dettes fantômes purgées), S2 (paiements ré-imputés + « NON RE-IMPUTABLE » à arbitrer), S3 (dettes effacées, à arbitrer), S4 (avoirs consommés). |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

#### CR-16 — Contre-diagnostic après réparation
| | |
|---|---|
| **Étapes** | Ré-exécuter `scripts/diagnostic_differes.sql` (sections 1, 2, 5) après la réparation. |
| **Résultat attendu** | Section 1 : plus d'écart de solde (hors avoirs conservés de clients à zéro). Section 2 : plus aucune dette fantôme. Section 5 : plus aucun reliquat positif **sauf** les dossiers « NON RE-IMPUTABLE » et les S3 listés pour arbitrage. |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

#### CR-17 — Vérification de clients témoins
| | |
|---|---|
| **Étapes** | Choisir 2 ou 3 clients qui s'étaient plaints. Vérifier leur solde avant/après réparation et le rapprocher des paiements réellement effectués (reçus, tickets). |
| **Résultat attendu** | Le solde après réparation correspond à ce que le client doit réellement. |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

### G. Non-régression

#### CR-18 — Vente différée standard
| | |
|---|---|
| **Étapes** | Créer une vente différée classique (avec et sans acompte à la caisse). |
| **Résultat attendu** | Vente clôturée normalement ; la dette créée = montant différé − acompte ; jamais de reste négatif. |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

#### CR-19 — Ticket et historique
| | |
|---|---|
| **Étapes** | 1. Imprimer le ticket après un règlement. 2. Consulter l'onglet « LISTE DES REGLEMENTS » et le détail d'un règlement (loupe). 3. Vérifier le PDF « imprimer ». |
| **Résultat attendu** | Ticket correct (montant réglé, pas le montant reçu). Historique : montant attendu / réglé / restant cohérents avec la réalité. |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

#### CR-20 — Règlements par chèque / mobile money / virement
| | |
|---|---|
| **Étapes** | Refaire CR-01 avec chaque mode de règlement autre qu'espèces (champs banque/référence). |
| **Résultat attendu** | Comportement identique ; les informations bancaires sont conservées. |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

#### CR-21 — Vente différée avec 2 modes de règlement
| | |
|---|---|
| **Étapes** | 1. Clôturer une vente avec 2 modes de règlement dont un différé. 2. Vérifier la dette créée. |
| **Résultat attendu** | La dette différée créée correspond exactement à la part différée. Pas de reste négatif, pas de double comptage. |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

#### CR-22 — Annulation d'une vente ORDONNANCÉE / tiers-payant (point sensible : trigger V6.3.2)
| | |
|---|---|
| **Étapes** | 1. Faire une vente ordonnancée / avec tiers-payant, la clôturer. 2. L'annuler. 3. Vérifier la comptabilité tiers-payant (part organisme) ET la dette différée du client. |
| **Résultat attendu** | La part tiers-payant reste correctement contre-passée (identique à avant). La dette différée du client de la vente annulée est soldée (reste 0, statut delete). Aucun écart comptable nouveau introduit par le trigger. |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

#### CR-23 — Clôture d'une vente DÉPÔT différée (point sensible : garde d'idempotence)
| | |
|---|---|
| **Étapes** | 1. Faire une vente de type dépôt / extension réglée en différé. 2. La clôturer. 3. Requête : nb de lignes de différé de la vente. |
| **Résultat attendu** | La dette différée est bien créée (exactement UNE ligne active). La garde d'idempotence ne bloque pas la création légitime sur ce chemin (addDiffere @2948). |
| **Résultat obtenu** | |
| **Statut** | OK ☐ KO ☐ R ☐ |

---

## 4. Synthèse de la recette

| Rubrique | Nb fiches | OK | KO | Réserves |
|---|---|---|---|---|
| A. Règlement sélectif | 6 | | | |
| B. Règlement global | 3 | | | |
| C. Annulation | 2 | | | |
| D. Cohérence des soldes | 1 | | | |
| E. Onglet Différés réglés | 2 | | | |
| F. Réparation des données | 3 | | | |
| G. Non-régression | 6 | | | |
| **Total** | **23** | | | |

## 5. Décision

- ☐ **Recette prononcée sans réserve** — déploiement en production autorisé.
- ☐ **Recette prononcée avec réserves** (lister ci-dessous) — déploiement autorisé, réserves à lever.
- ☐ **Recette refusée** — corrections requises puis nouvelle recette.

**Réserves / observations :**

&nbsp;

&nbsp;

| | Nom | Date | Signature |
|---|---|---|---|
| **Testeur** | | | |
| **Responsable officine** | | | |

## 6. Rappel de la procédure de mise en production (après recette OK)

1. Sauvegarde complète de la base de production.
2. Déploiement de l'application (branche `differe`).
3. Exécution de `scripts/reparation_differes.sql` sur la production.
4. Contrôle de `reparation_differes_rapport` et contre-diagnostic (`scripts/diagnostic_differes.sql`).
5. Arbitrage des listes « NON RE-IMPUTABLE » (S2) et « dettes effacées » (S3).
6. À refaire **site par site**.
