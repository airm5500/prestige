# Plan du 08/11/2026 : bilan

Branche `plan/08112026-evolutions-rattrapages`, poussée. Rien n'est fusionné.

- **Réalisés et testés :** 18 des 20 points, plus les sous-points 15.1, 15.2 et 15.4 à 15.8.
- **Reste :**
  - point 10 (icône), en cours dans une autre session ;
  - point 12 (tremblement), non reproduit ;
  - point 15.3 (vitesse des caissières), il manque une donnée.

Chaque test ci-dessous échoue d'abord sur l'ancien code, puis passe. Les tests d'écran passent par les vrais clics, un
à la fois. La suite unitaire complète passe : 1 937 tests verts.

## Ce qui est fait

| Point | Réalisation | Tests (rouge sur l'ancien code, puis vert) |
|---|---|---|
| 1 | Le rattrapage des clôtures d'inventaire (V6.9.36) devient un script manuel, avec sa notice. Flyway ne vide plus la base sur une erreur de validation. | `ScriptsManuelsHorsFlywayTest` |
| 2a | L'état de contrôle d'achat de la fiche grossiste passe en API REST (la JSP reste en place). | base = API = ancienne JSP = grille, 6 jeux : 36/36 |
| 2b, 2c | Fenêtres « Modifier » et « Détail » du grossiste sans barre de défilement. | 2 tailles d'écran : 13/13 |
| 3 | « Facture de groupe » et « Groupe et compagnie » occupent toute la hauteur dès l'ouverture. | 3 tailles d'écran : 13/13 |
| 4 | Repère ⇄ sur les ventes scindées (assurance + comptant), avec infobulle et clic vers la vente liée. | 6/6 |
| 5 | Courbe du comparateur du Pilotage expliquée par une phrase au-dessus et une en dessous. | `ComparateurSyntheseCoherenceTest`, écran 8/8 |
| 6 | Indicateur d'envoi dans le journal des campagnes. Les compteurs sont identiques au suivi. | `IndicateurEnvoiCoherenceTest`, écran 12/12 |
| 7 | PDF de l'analyse des avoirs et du tableau de bord des retours fournisseur. | `EditionSectionsTest`, écran = PDF cellule par cellule : 24/24 |
| 8 | PDF de la fenêtre « Seuil de réserve atteint ». Cette fenêtre ne montre plus que les mouvements liés à l'entrée. | écran = PDF : 12/12 ; sans répétition 9/9 |
| 9 | Réserve : suppression des suggestions cochées en une fois, avec motif ; repère « ancienne » ; colonnes sans défilement ; article décoché « réserve » retiré des suggestions. | 18/18, 19/19, 14/14 |
| 11 | Suggestion : nettoyage selon rayon + réserve, ajout d'un produit visible et mis en saisie, barre regroupée, Actualiser, nettoyage à l'ouverture (paramètre), VMJ et couverture. | `RegleSeuilSuggestionCoherenceTest`, `ReapproCouvertureTest`, écrans 10/10, 16/16, 14/14 |
| 13 | Une vente ratée passe « Commandé · BL <réf> » à l'entrée en stock de son produit. | `VenteRateeEntreeCoherenceTest`, écran 10/10 |
| 14 | Code PIN après le badge, facultatif, désactivé par défaut (`KEY_CONNEXION_BADGE_PIN`). | `BadgePinCoherenceTest`, écran 28/28 |
| 15.1 | Annulations rattachées à l'auteur de la vente. Suivi des caissières. Détail affiché sur place, sans fenêtre. | `AnnulationsAuteursCoherenceTest`, écran 13/13 |
| 15.2 | Clic sur une part du camembert « Délai de saisie des BL » : grossistes de la tranche, nombre de BL, délai moyen. | `RetardBlGrossistesCoherenceTest`, écran 5/5 |
| 15.4 | Préventes par vendeur. | `PreventesCoherenceTest`, écran 9/9 |
| 15.5, 15.7 | Vitesse par type de vente. | `VitesseTypeVenteCoherenceTest`, écran 7/7 |
| 15.6 | Onglet Anomalies réservé au privilège `P_ACTIVITE_ANOMALIES` (V7.2.47). | écran 9/9 |
| 15.8 | Carte d'affluence de 0 h à 23 h. Sélecteur de garde. Contrôles : garde sans vente de nuit, ventes de nuit sans garde. | `ControleGardesCoherenceTest`, écran 9/9 |
| 16 | Option « Afficher l'information promotion » des modèles de ticket. | 3 000 + 2 000 tickets tirés au hasard, écran 13/13 |
| 17 | Filtre « Prix achat > prix vente » de l'inventaire en cours, avec impression. | écran = base = PDF : 12/12 |
| 18 | Motif obligatoire pour annuler ou modifier une vente. Analyse par motif. | `MotifVenteCoherenceTest`, écran 17/17 |
| 19 | Ticket Z envoyé par WhatsApp, au même numéro que le SMS. | `TicketZTexteTest`, écran 9/9 |
| 20 | Contrôleur et date de contrôle dans le détail de l'état de contrôle des achats. | 9/9 |

La non-régression de chaque point (les tests existants de l'écran touché) est détaillée dans le message de son commit.

## Définitions retenues (point 15)

- **Prévente :** une vente saisie par un vendeur et encaissée par une autre personne.
  - Annulée : annulée hors modification.
  - Abandonnée : restée en attente après le jour de sa saisie.
  - Taux = (annulées + abandonnées) ÷ total.
- **15.1, par vendeur :** ses ventes de la période et celles annulées ensuite, quelle que soit la personne qui annule.
  Les ventes remplacées par une modification sont écartées. L'annuleur est affiché dans le détail.
- **15.1, par caissière** (celle qui a encaissé) :
  - annulations de ventes au comptant ;
  - modifications de ventes au comptant ;
  - modifications de ventes à crédit (assurance, carnet).
- **15.2 :** délai = date d'entrée du BL − date de livraison, en jours. Délai moyen par grossiste dans chaque tranche.

## Ce qui reste, et pourquoi

- **Point 10, icône :** vous avez choisi la proposition 4, « Pastille », à enrichir. Une session dédiée s'en charge
  (branche `PRES-/icone-pastille-bf4cf4`). La nouvelle icône d'onglet y est enregistrée. Le logo de l'écran de
  connexion attend votre validation.
- **Point 12, tremblement :** non reproduit. La sonde fait défiler à la molette jusqu'en bas de page, puis relève
  pendant 2 s les positions de défilement, la barre horizontale flottante et la hauteur de l'écran. Résultat : les
  223 écrans du menu restent stables, en 1366 × 768, 1280 × 650 et 1024 × 600. **Question :** sur quel écran l'avez-vous
  vu, avec quelle action, et sur quel poste (taille d'écran, zoom du navigateur) ?
- **Point 15.3, vitesse des caissières :** la base n'a pas de date fiable de prise en caisse d'une prévente.
  Seules existent la création, la dernière mise à jour et l'encaissement. Il faudrait enregistrer cette date quand la
  caissière ouvre la prévente, ce qui touche l'écran de vente. **Question :** faut-il l'ajouter ? Les mesures ne
  porteront alors que sur les ventes faites après la mise à jour.

## À savoir

- **Éditions jrxml (points 7, 8, 17) :** sur ce poste, `D:\CONF\LABOREX\REPORTS` prime sur le WAR. Les éditions
  nouvelles ou modifiées n'y sont copiées qu'avec votre accord.
- **Ventes ratées :** le PDF n'affiche pas la référence du BL. Elle figure à l'écran et dans les exports Excel et CSV.
- **Échecs déjà présents sur l'ancien code, inchangés :**
  - `test-campagnes` : « Menu… Modèles de messages » ;
  - `pilotage-besoins-1110-b` : « fondsDoux » et « Tranche de 2 heures ».
- **Serveur de test :** domain1 a manqué de mémoire le 08/11 à 17 h 01, au chargement de l'application juste après
  un redéploiement. C'est sans doute la fuite connue des redéploiements à répétition dans le même serveur, mais la
  cause n'a pas été établie. Après redémarrage du serveur, les tests sont repassés au vert.
