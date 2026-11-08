# Plan du 08/11/2026 : évolutions et rattrapages, compréhension du besoin

Source : `PLAN_07112026_CORRECTIONS.md` (20 points).
Branche : `plan/08112026-evolutions-rattrapages`, partie de `integration/recette-2026-10-29` (`28e7ffad8`).
Worktree : `D:\projet\p3\prestige-plan-08112026`.

Pour chaque point, le rapport donne :
- **Compris** : ce que j'ai compris du besoin ;
- **Constaté** : ce que montre le code aujourd'hui ;
- **Proposé** : ce que je propose de faire ;
- **?** : les questions qui demandent votre avis, quand il y en a.

Rien n'est encore modifié dans le code.

---

## 1. Migration V6.9.36 (rattrapage des clôtures d'inventaire)

**Compris :** sortir ce script des mises à jour automatiques, parce qu'il est trop long sur certaines bases. Il sera
lancé à la main. Vous voulez aussi la liste des autres scripts du même genre.

**Constaté :**
- Flyway tolère le retrait d'un script, il n'y a donc pas de risque à le sortir. Sa configuration
  (`FlywayStartupBean.java:71`) ignore les scripts manquants (`ignoreMissingMigrations`) et ne fait pas de
  validation au démarrage (`validateOnMigrate(false)`).
- V6.9.36 peut être rejoué sans effet (il est idempotent) et il laisse une trace dans
  `rattrapage_cloture_inventaire`. On peut donc le lancer à la main sans risque.

**Autres scripts lents.** Taille des grosses tables sur la copie locale : `t_preenregistrement` 1,3 Go,
`hmvtproduit` 1,2 Go, `t_preenregistrement_detail` 1 Go, `mvttransaction` 0,8 Go.

| Script | Ce qu'il fait | Poids |
|---|---|---|
| V6.9.36 | réécrit des mouvements, des snapshots et des dates d'inventaire à partir de `hmvtproduit` et `t_inventaire_famille` | **lourd** (réécriture de données) |
| V6.9.101 | UPDATE de `t_order_detail` et de `t_famille` (prix de vente absents des commandes) | **lourd** (réécriture de données) |
| V6.9.132.2, V6.9.151 | index sur `hmvtproduit` | moyen : lecture complète de la table |
| V6.9.23, V6.9.43, V6.9.56, V7.0.8, V7.2.35 | index sur `t_preenregistrement` | moyen |
| V7.0.2 | index sur `vente_reglement` | faible |

Les index se construisent sans bloquer les ventes, mais allongent le démarrage.

Les ajouts de colonne (V6.9.124, V7.2.31.63, V7.2.41…) sont instantanés sous MariaDB 10.6.

**Proposé :**
- déplacer V6.9.36 dans `outils/scripts-manuels/`, avec une notice : quand le lancer, comment vérifier
  `rattrapage_cloture_inventaire` ;
- même traitement pour V6.9.101 si vous le souhaitez.

**? Q1** : V6.9.101 sort aussi, ou seulement V6.9.36 ?

Remarque : la configuration contient `cleanOnValidationError(true)`. Aujourd'hui elle est sans effet, parce que la
validation est coupée. Mais si quelqu'un réactive la validation, Flyway pourra **vider la base** à la première
erreur. Je propose de la passer à `false`.

---

## 2. Menu grossistes

**a. Détail d'un grossiste.**
- **Compris :** remplacer la JSP `commandemanagement/etats/ws_data.jsp` par une API REST.
- **Constaté :** cette JSP alimente la grille « État de contrôle d'achat » de `grossisteview.js`.
  - Elle appelle `WarehouseManager.listeEtatControleAchat`.
  - Pour obtenir le total, elle recharge toute la liste.
  - Aucun équivalent REST n'existe pour cette liste.
- **Proposé :**
  - créer `GET v1/grossistes/{id}/etat-controle-achat` (dates, recherche, pagination, total calculé en SQL) ;
  - garder les mêmes colonnes et faire pointer la grille dessus ;
  - écrire un test de rapprochement qui compare l'écran, l'API et la base ;
  - laisser la JSP en place, sans plus l'appeler.

**b. Fenêtre « Modifier grossiste », vue tronquée.**
- **Constaté :** la fenêtre (`grossiste/action/add.js`) est plafonnée à 460 px de haut. Le formulaire (blocs
  « Information grossiste » et « PharmaML ») défile à l'intérieur. La fenêtre de détail est fixée à 600 px.

**c. Plus aucune barre de défilement**, ni horizontale ni verticale, en modification comme en visualisation.
- **Proposé :**
  - mettre les champs sur deux ou trois colonnes, pour réduire la hauteur ;
  - calculer la hauteur de la fenêtre sur l'écran disponible ;
  - test d'ergonomie : à 1366×768 et à 1920×1080, aucune barre de défilement, bas de la fenêtre visible.

**? Q2** : sur un petit écran (1366×768), si tout ne tient pas même sur trois colonnes, accepte-t-on de passer
PharmaML dans un onglet ?

---

## 3. Facture de groupe et Groupe et compagnie : le bas de l'écran remonte

**Compris :** au premier affichage, l'écran ne descend pas jusqu'en bas. Il ne prend toute la hauteur qu'après un clic
sur la navigation de Prestige.

**Constaté :**
- `groupe.js` et `groupeInvoices.js` ont une hauteur fixe (`minHeight` et `maxHeight` à 570).
- Les deux écrans sont bien déclarés dans `correctifs-affichage.js` (ECRANS_COLLES).
- Mais le recalcul de la hauteur n'a lieu qu'au prochain recalcul de la mise en page.

**Proposé :**
- d'abord un test d'écran qui échoue : mesurer, au premier affichage, l'écart entre le bas de la grille et le bas de
  la fenêtre ;
- ensuite, retirer les hauteurs fixes ou forcer l'ajustement au rendu.

---

## 4. Ventes terminées : repérer une vente scindée (assurance + comptant)

**Compris :** dans la liste, un signe distingue les deux ventes d'une vente scindée (cas 1 du 03/11).

**Constaté :** `lg_VENTE_LIEE_ID` n'est pas renvoyé par `ventestats` (liste). Seul le détail d'une vente le lit.

**Proposé :**
- renvoyer `venteLieeRef` dans la liste ;
- ajouter une petite pastille « ⇄ » dans la colonne Référence, avec une infobulle « Vente liée : n° … » ;
- la pastille apparaît sur les deux ventes du couple ;
- test de rapprochement : la liste, le détail et la base comparés pour le couple.

**? Q3** : un clic sur la pastille ouvre-t-il la vente liée, ou suffit-il d'une infobulle ?

---

## 5. Pilotage

**Affichage tronqué.** Je n'ai pas encore vu quel onglet est coupé. Je propose de passer chaque onglet aux trois tailles
d'écran et de mesurer ce qui dépasse.

**? Q4** : sur quel onglet l'avez-vous vu ? Ou bien tous ?

**Courbe du comparateur incomprise.**
- **Constaté :** l'onglet trace deux courbes mois par mois, A en bleu et B en orange, avec leur écart. On compare deux
  grandeurs, deux familles, deux rayons, deux grossistes, ou une grandeur croisée avec un axe. Aucun texte n'explique
  ce que l'on regarde.
- **Proposé :**
  - au-dessus du graphique, une phrase claire, par exemple : « CA mensuel de la famille X (bleu) comparé à celui de
    la famille Y (orange), de janvier à octobre 2026 » ;
  - les noms en clair dans la légende, au lieu de « A » et « B » ;
  - un tableau des valeurs sous la courbe ;
  - en dessous, une ligne de synthèse : « Y fait +12 % de plus que X sur la période ».

---

## 6. Campagnes SMS / WhatsApp : indicateur d'envoi

**Compris :** voir d'un coup d'œil si les messages d'une campagne sont partis.

**Constaté :**
- L'état de chaque message est déjà reconstitué dans « Suivi des messages » : envoyé, délivré, lu ou échec, pour
  WhatsApp comme pour le SMS.
- Mais la liste des campagnes n'affiche aucun résumé.

**Proposé :**
- ajouter dans la liste des campagnes une colonne « Envoi » : barre ou pastilles `12 envoyés · 9 délivrés ·
  4 lus · 1 échec`, avec un clic vers le suivi ;
- test de rapprochement : la colonne, le suivi et la base comparés.

**? Q5** : l'indicateur est-il voulu aussi pendant l'envoi, avec une progression en direct ? Ou un résumé après
l'envoi suffit-il ?

---

## 7. Imprimer en jrxml l'analyse des avoirs et le tableau de bord des retours fournisseur

**Constaté :**
- **Ventes avoir, onglet Analyse :** le bouton Imprimer est désactivé.
- **Retours fournisseur, tableau de bord :** le bouton imprime une page HTML par le navigateur (`window.print`).

**Proposé :**
- deux jrxml, sur le modèle des états existants : `rp_analyse_avoirs` et `rp_tableau_bord_retours_fournisseur` ;
- un PDF servi par REST ;
- test de rapprochement : l'écran et le PDF comparés ligne par ligne.

Les nouveaux jrxml seront aussi à copier dans `D:\CONF\LABOREX\REPORTS` du poste. Je ne touche pas à `CONF`.

---

## 8. Gestion des entrées : notifications « produits à envoyer en réserve »

**Impression.** Elle passe aujourd'hui par une iframe HTML et le navigateur. Je propose un jrxml, comme au point 7.

**Produits répétés.**
- **Constaté :** c'est un **défaut confirmable**. La requête (`lignesOuvertesAuto`) prend les lignes de **toutes** les
  suggestions automatiques ouvertes de l'emplacement pour les produits du bon, sans dédoublonnage. Un produit encore
  présent dans une ancienne suggestion ouverte sort donc deux fois. C'est pour cela qu'il a fallu vider des
  suggestions pour voir chaque produit une seule fois.
- **Proposé :**
  - ne montrer que les lignes nées de **ce** bon de livraison, une par produit ;
  - d'abord un test qui échoue : un produit dans une ancienne suggestion ouverte, puis une nouvelle entrée de ce
    produit ; on attend une seule ligne.

**? Q6** : une ancienne suggestion ouverte pour ce produit (venue d'un autre bon) doit-elle être fusionnée, annulée,
ou simplement ignorée par la vue ?

---

## 9. Gestion de la réserve

**a. Suppression en masse.** Ajouter un bouton « Supprimer la sélection » dans l'onglet Suggestions, lié aux cases à
cocher. La confirmation se fait dans le bouton lui-même, sans fenêtre surgissante.

**b. Filtre par période.**
- **Constaté :** par défaut, les dates Du et Au sont vides. Le filtre ne prend donc pas les dates en compte, ce qui
  explique les suggestions de septembre et d'octobre.
- **Q7** : quelle date doit servir au filtre ?
  - (a) la date de création seulement ;
  - (b) la date de création, plus toutes les suggestions encore ouvertes (à traiter ou en cours), quelle que soit leur
    date, pour ne rien oublier.
  
  Je recommande (b), avec un repère visuel pour les suggestions anciennes.

**c. Vue « Traitement de suggestion ».** La somme des largeurs minimales des colonnes (≈1 250 px) dépasse celle de la
fenêtre (1 150 px). Je propose :
- de réduire les largeurs des colonnes ;
- de fusionner « Stock à la création / Stock actuel » en une seule colonne « Stock (création → actuel) » ;
- d'adapter la fenêtre à la largeur de l'écran.

**d. CONFIG_STOCK_INCOMPLETE (DIACOL, CEFIM).**
- **Constaté :**
  - l'évaluation automatique vérifie bien la case `bool_RESERVE` de la fiche article ;
  - mais **l'ajout manuel** d'une ligne à une suggestion (`ajouterLigneSaisie`, puis `ajouterLigne`) ne la vérifie
    pas ;
  - décocher la case sur la fiche supprime le type de stock réserve, mais laisse les lignes déjà présentes dans les
    suggestions ouvertes.
  
  Au traitement, ces lignes tombent donc en CONFIG_STOCK_INCOMPLETE. Deux chemins sont possibles : (1) un ajout
  manuel d'un produit non coché, (2) la case décochée après la création de la suggestion.
- **Proposé :**
  - une requête qui sort tous les produits dans ce cas : lignes de suggestion de réserve dont le produit a
    `bool_RESERVE = 0`. Pour chaque produit, elle donne le chemin d'entrée (ajout manuel ou automatique), la date
    de la ligne et la date de la dernière modification de la fiche ;
  - bloquer l'ajout d'un produit non coché, avec un message clair ;
  - au décochage, retirer le produit des suggestions ouvertes, avec une trace ;
  - un test qui échoue d'abord.

**? Q8** : sur quelle base faut-il sortir la liste ? Je n'ai accès qu'aux copies locales (`laborex_v1_db`, banc).
Pour la base de l'officine, je vous fournirai la requête en lecture seule.

---

## 10. Icône de Prestige

Je propose de dessiner quatre ou cinq icônes en SVG, de les présenter sur une page de comparaison (onglet du
navigateur, barre des tâches, grande taille), puis vous choisissez.

**? Q9** : y a-t-il des couleurs ou un symbole à garder, par exemple le vert pharmacie, la croix, ou la lettre P ?

---

## 11. Suggestions de réapprovisionnement (gestion des commandes)

**1. Un produit ajouté n'apparaît pas tant qu'on ne rouvre pas la suggestion.**
- **Constaté :** après l'ajout, l'écran recharge la **page 1**. Or la liste est triée par nom et paginée, et la
  recherche reste appliquée. Le produit ajouté est donc souvent sur une autre page.
- **Proposé :**
  - après l'ajout, aller sur la page qui contient le produit, ou le mettre en tête et le surligner ;
  - effacer la recherche ;
  - d'abord un test d'écran qui échoue.

**2. « Nettoyer la suggestion ».**
- **Constaté :** la règle ne compare que le stock **rayon** au seuil, et ignore la réserve. Pourtant, la génération
  des suggestions, elle, compte rayon + réserve.
- **Proposé :** retirer le produit quand rayon + réserve dépasse le seuil. Exemple : 26 + 502 > 50, le produit sort.
  Le paramètre `KEY_OPTION_SUGGESTION` (supérieur ou supérieur ou égal) reste appliqué.
  - Test de cohérence : sur des milliers de cas tirés au hasard, le nettoyage et la génération appliquent la même
    règle.

**3. Boutons du bas.** Dix boutons, de style standard, dont les icônes se chevauchent. Je propose :
- de les regrouper par usage : Retour | Disponibilité ▾ (vérifier, revérifier, imprimer) | Exporter ▾ | Équivalents
  DCI | Produits retirés | **Nettoyer** | **Commander PharmaML** ;
- un style distinct pour les deux actions principales.

**4. Actualiser.**
- **Constaté :** il n'y a pas de bouton « Actualiser » dédié, seulement celui de la barre de pagination. Les couleurs
  viennent d'un appel séparé : bleu pour une commande en cours, vert pour un produit présent dans plusieurs
  suggestions, jaune pour un BL non clôturé.
- **Proposé :** un bouton « Actualiser » qui recharge les lignes **et** les couleurs. Test : un produit en bleu,
  dont la commande en cours est supprimée, n'est plus bleu après Actualiser.

**5. Nouveau paramètre.** `KEY_NETTOYER_SUGGESTION_OUVERTURE`, valeur 0 ou 1, 0 par défaut. Ajouté par une migration
et visible dans l'écran des paramètres. À 1, l'ouverture d'une suggestion lance le nettoyage, puis affiche la liste.
- Tests avec le paramètre à 0 et à 1.

**? Q10** : à l'ouverture, faut-il un court message « 3 produits retirés (voir Produits retirés) », ou un nettoyage
silencieux ?

**6. Traitement de suggestion.**
- **Bandeau du haut :**
  - retirer le nom et « Stock Res » ;
  - afficher la **VMJ** (vente moyenne journalière) et la **couverture du stock en jours**, soit stock rayon (et
    réserve ?) ÷ VMJ.
  
  **? Q11** : quelle période pour la VMJ (30 jours, 90 jours, celle du paramètre de prévision) ? Et la couverture
  compte-t-elle la réserve ?
- **« Prévision article » donne beaucoup moins que la suggestion.**
  - **Constaté :** ce sont deux calculs différents.
    - La suggestion propose `seuil − stock + quantité de réapprovisionnement de la fiche`, au moins 1. Elle n'a aucune
      prévision de ventes.
    - La prévision calcule `ventes par jour × (délai + couverture) + stock de sécurité − (rayon + réserve) −
      commandes en cours − équivalents DCI`.
    
    Quand la fiche porte un seuil et une quantité de réapprovisionnement élevés, ou quand une commande est déjà en
    cours, l'écart peut être grand.
  - **Proposé :**
    - dans la fenêtre Prévision, afficher les deux calculs côte à côte, avec leur décomposition, pour que l'écart soit
      lisible ;
    - ensuite, décider ensemble s'il faut rapprocher la règle de la suggestion de celle de la prévision. C'est une
      décision métier, à part.

---

## 12. Défilement automatique et tremblement en bas de page

**Constaté :** deux mécanismes globaux réagissent au défilement.
- `barre-horizontale.js` place une barre flottante en bas des grilles. Il la repositionne à chaque défilement, et
  aussi toutes les 600 ms.
- `correctifs-affichage.js` recalcule la mise en page à chaque redimensionnement.

Une boucle entre ces deux mécanismes est la cause la plus probable. Ce n'est pas prouvé.

**Proposé :** d'abord reproduire le défaut par un test d'écran (molette en bas de page, mesure de la position pendant
2 s, qui doit rester stable), puis corriger.

**? Q12** : sur quel écran l'avez-vous vu ?

---

## 13. Ventes ratées : marquer « commandé » à l'entrée en stock

**Compris :**
- quand un produit d'une vente ratée **entre en stock** (validation d'un BL), la vente ratée passe automatiquement
  à « commandé » ;
- on ne s'appuie pas sur la commande en cours, parce qu'une commande peut être supprimée : l'information serait
  fausse.

**Constaté :** le statut « commandé » existe (`bool_COMMANDE`, `dt_COMMANDE`, `lg_USER_COMMANDE_ID`), mais il n'est
posé qu'à la main.

**Proposé :**
- à la validation du BL, marquer les ventes ratées encore ouvertes pour ces produits ;
- tracer qui, quand et quel BL ;
- test de bilan : on valide un BL avec deux produits, dont un en vente ratée ; seule cette vente ratée change.

**? Q13** : faut-il prendre toutes les ventes ratées ouvertes du produit, quelle que soit leur date, ou seulement
celles d'avant la commande ? Je propose toutes celles qui sont antérieures à la date d'entrée.

---

## 14. Connexion par badge : et si quelqu'un photographie le badge ?

**Constaté :** ce qui existe aujourd'hui.
- Le QR contient un secret aléatoire de 32 octets. Seule son empreinte est gardée en base, jamais le mot de passe.
- Le badge a une date d'expiration et peut être régénéré, ce qui annule l'ancien QR.
- Les essais sont limités par badge et par poste.
- La connexion par badge peut être coupée par un paramètre.

**Rien ne protège contre la photo.** Une photo du QR permet de se connecter jusqu'à l'expiration ou la régénération du
badge. La seule protection prévue est qu'une photo ne révèle pas le mot de passe.

**Proposé**, au choix :
1. **Badge + code PIN à 4 chiffres** (recommandé). Une photo seule ne suffit plus. C'est la protection la plus simple
   pour l'utilisateur.
2. Badge accepté seulement sur les postes déclarés de l'officine.
3. Alerte au titulaire d'un badge utilisé sur deux postes en même temps, ou en dehors des horaires.

**? Q14** : retient-on le PIN, et faut-il y ajouter les points 2 et 3 ?

---

## 15. Activité des équipes

**Constaté, point important.** Quand une vente est annulée, la vente d'origine garde le vendeur et le caissier.
Mais son `lg_USER_ID` est **remplacé par celui qui annule**, et les statistiques actuelles attribuent l'annulation à
ce `lg_USER_ID`. Les analyses demandées devront donc s'appuyer sur le **vendeur** et le **caissier** d'origine, et
garder l'annuleur à part. C'est faisable sans changer la base.

**1. Annulations associées.**
- **Compris :** pour chaque opérateur et sur la période, afficher :
  - le nombre de ventes et la vitesse moyenne ;
  - le nombre de ses ventes annulées ensuite, et le taux d'annulation ;
  - un clic vers le détail : vente, motif (voir le point 18), annulé par qui et quand.
  
  À ajouter aux deux graphiques, par heure et par opérateur, puis au tableau de bord du pharmacien après votre
  validation.
- **Suivi des caissiers :**
  - modifications de ventes à crédit ;
  - modifications et annulations de ventes au comptant, rattachées à la caissière qui a fait la vente.
  
  La table `vente_modifiee` contient déjà les modifications.

**? Q15** : faut-il rattacher l'annulation au **vendeur**, au **caissier**, ou aux deux dans deux colonnes ? Je
recommande deux colonnes, parce qu'avec les préventes ce ne sont souvent pas les mêmes personnes.

**2. Délai de saisie des BL.** Au clic sur une part du camembert, une petite fenêtre liste les grossistes ou
fournisseurs de cette tranche, avec le nombre de BL et le délai moyen. C'est une fenêtre de **consultation** : la
règle « pas de fenêtre surgissante » vise les modifications.

**3. Activité par opérateur et par tranche horaire, avec le CA réalisé.**
- **Compris :** savoir quelles caissières valident vite et libèrent plus de clients.
- **Proposé :** avec les préventes, la caissière ne fait que valider. Son temps doit donc être mesuré **de la prise
  en caisse à l'encaissement**, pas depuis le début de la saisie. Le temps de saisie de la prévente reste attribué au
  vendeur.
- **? Q16** : a-t-on une date de prise en caisse fiable ? À vérifier dans les données. Sinon, il faudra l'ajouter.

**4. Meilleurs utilisateurs en préventes.** Un classement par nombre de préventes, CA, nombre de lignes et taux de
préventes abandonnées ou annulées.

**5 et 7. Vitesse par opérateur, par type de vente.** Les points 5 et 7 sont identiques, je les traite comme un seul.
Une nouvelle carte à côté de « Vitesse par opérateur », par type de vente : comptant, assurance, avoir, dépôt.

**6. Onglet Anomalies.** Un privilège dédié. L'onglet est caché si l'utilisateur ne l'a pas. Le privilège est créé
par une migration et donné aux administrateurs par défaut.

**8. Carte d'affluence jour × heure.**
- **Constaté :** les heures affichées vont de la première à la dernière heure qui a des ventes.
- **Proposé :** toujours afficher 0 h à 23 h, ou au moins 21 h à 6 h, en grisé quand il n'y a pas d'activité.
- **Sélecteur de garde :** j'ai compris un filtre « jours de garde » qui ne montre que les gardes déclarées, et
  signale une garde déclarée sans aucune vente la nuit (garde mal créée), ou des ventes de nuit sans garde déclarée.
- **? Q17** : c'est bien cela ?

---

## 16. Modèle de ticket : afficher ou masquer la ligne promotion

**Constaté :** il existe déjà une option « Afficher la remise ». La ligne « PROMOTION … OFFERT(S) » est toujours
imprimée.

**Proposé :**
- une option « Afficher l'information promotion », oui par défaut, dans le même écran ;
- elle s'applique au nouveau modèle de ticket comme à l'ancien, et à l'aperçu ;
- tests avec l'option à 0 et à 1, et un rapprochement entre l'aperçu et le ticket imprimé.

---

## 17. Inventaire en cours : filtre « prix d'achat > prix de vente »

**Constaté :** le combo Filtre propose aujourd'hui : Tous, Manquants, Surplus, Écarts, Alertes, Inventoriés, Non
inventoriés, Encore négatifs.

**Proposé :**
- ajouter « Prix achat > prix vente » ;
- une modification depuis la grille fait sortir la ligne du filtre ;
- le filtre est pris en charge par « Imprimer filtre courant » ;
- un test de cohérence sur le comptage.

---

## 18. Motif obligatoire pour l'annulation et la modification de vente

**Compris :**
- un motif obligatoire, choisi dans une liste, pour **annuler** une vente et pour la **modifier** ;
- les modifications des informations du tiers payant ne sont pas concernées ;
- les motifs sont gérés dans une table ; motifs par défaut : erreur de saisie, confusion de produit, erreur client ;
- un récapitulatif par motif, à deux endroits :
  - dans un nouvel onglet « Analyse » de la liste des ventes annulées ;
  - dans une nouvelle rubrique d'Activité des équipes (lié au point 15.1).

**Constaté :** aucun motif n'existe aujourd'hui. Les modifications sont déjà tracées dans `vente_modifiee`, sans
motif.

**Proposé :**
- une table `t_motif_annulation_vente` avec trois motifs de départ et un écran de gestion des motifs ;
- dans `t_preenregistrement`, une colonne pour le motif d'annulation ;
- dans `vente_modifiee`, une colonne pour le motif de modification ;
- le motif est choisi dans le bouton lui-même : un menu déroulant du bouton Annuler, sans fenêtre surgissante ;
- tests de bilan (le motif est écrit, puis relu dans la liste, l'analyse et Activité des équipes) et de
  rapprochement.

**? Q18** : faut-il un motif « Autre » avec un texte libre ?

---

## 19. WhatsApp : envoyer le ticket Z

**Constaté :**
- l'envoi par SMS existe (bouton « Envoyer SMS » du récapitulatif Z, vers le numéro de l'administrateur) ;
- le service WhatsApp existe aussi, mais il n'envoie pas le ticket Z.

**Proposé :**
- un bouton « Envoyer WhatsApp » à côté du bouton SMS, avec le même texte ;
- en option, le ticket Z en PDF joint ;
- le jeton reste côté serveur, et le texte du message n'est jamais écrit dans les journaux.

**? Q19** : qui reçoit le message, le même numéro que le SMS ou une liste de destinataires ? Et faut-il le texte seul,
ou le texte + le PDF ?

---

## 20. État de contrôle des achats : « Voir le détail du contrôle »

**Constaté :**
- la donnée « qui a contrôlé » existe au niveau de chaque ligne de BL (`lg_CONTROLE_USER`), mais elle n'est affichée
  qu'au niveau du bon ;
- l'auteur d'un **retour fournisseur** existe aussi (`t_retour_fournisseur.lg_USER_ID`) ;
- la fenêtre de détail n'affiche aujourd'hui ni l'un ni l'autre.

**? Q20** : quelle colonne voulez-vous ? Le choix change ce que je développe.
- (a) l'utilisateur qui a **contrôlé** chaque ligne (comptage) ;
- (b) l'utilisateur qui a fait le **retour fournisseur** associé ;
- (c) les deux.

---

## Ordre de travail proposé

Chaque lot est livré avec ses tests de rapprochement, de cohérence et de bilan.

1. **Défauts confirmables :**
   - 8 (doublons de la vue réserve) ;
   - 9d (produits non réserve) ;
   - 11.1 (produit ajouté invisible) ;
   - 11.2 (nettoyage sans la réserve) ;
   - 3 et 12 (affichage).
2. **Rattrapage technique :** 1 (V6.9.36), 2 (JSP vers REST, fenêtre grossiste), 9b et 9c, 4.
3. **Ergonomie et impressions :** 7, 8 (jrxml), 11.3, 11.4, 11.5, 16, 17, 20.
4. **Évolutions métier :** 18 (motifs), puis 15 (activité des équipes, qui s'appuie sur 18), 13, 6, 19, 5.
5. **À part :** 10 (icônes), 14 (badge), 11.6 (prévision), après vos réponses.

Les points sans question (3, 7, 8 pour l'impression, 9a, 9c, 11.1 à 11.4, 16, 17) peuvent démarrer tout de suite.
