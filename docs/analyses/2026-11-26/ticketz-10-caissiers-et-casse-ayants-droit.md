# Ticket Z à 10 caissiers, et assurés en majuscules avec ayant droit en minuscules (clementine)

Essais du 26/11/2026 sur le poste local : domain3 (copie de travail `laborex_v1_db`) pour les écrans, base
`clementine` en lecture seule. Aucune colonne nominative de `clementine` n'a été affichée.

## 1. Ticket Z avec 10 caissiers le même jour

### Réponse courte

- **À l'écran** : tout s'affiche, rien n'est tronqué.
- **À l'impression, nouveau modèle de ticket** : tout sort, sur deux pages d'un même travail. La coupure de page
  tombe au milieu d'une ligne.
- **À l'impression, ancien modèle** (le seul qui existe dans la version des officines, schéma 6.9.35) : au-delà de
  40 lignes, le découpage est défectueux. Le corps sort deux fois et le premier morceau dépasse la page.

Le poste local n'a pas d'imprimante à tickets : l'impression est rejouée sur un banc, pas sur du papier.

### Écran (test `essais/test-ticketz-13-caissiers.js`, 7/7)

Journée du 29/10/2026 de la copie de travail : 10 caissiers dans le ticket Z.

| Contrôle | 1280×600 | 1600×950 |
|---|---|---|
| Une carte par caissier (10) et le total général | oui | oui |
| Carte ou ligne rognée | aucune | aucune |
| Total général atteint | par le défilement | sans défilement |
| Aperçu imprimable : 10 caissiers et le total | | oui |

Remarque : deux caissiers ont une carte vide (titre seul), leurs mouvements du jour ne donnant aucune ligne.

### Impression, nouveau modèle (banc `essais/BancTicketZ.java`)

Le banc appelle le vrai code d'impression du WAR déployé (`ImpressionServiceImpl.print`), page par page, sur une
image. La page fait 792 points (27,9 cm), celle que le code déclare à Java.

| Cas | Pages | Contenu | Ligne coupée entre deux pages |
|---|---:|---|---|
| 10 caissiers × 8 lignes, rouleau 80 mm | 2 | complet | oui |
| 10 caissiers × 12 lignes, rouleau 80 mm | 2 | complet | non (hasard de la hauteur) |
| 10 caissiers × 8 lignes, rouleau 58 mm | 2 | complet | oui |
| 13 caissiers × 10 lignes, rouleau 80 mm | 2 | complet | oui |

Les 10 caissiers, le total de l'officine et les signatures sont présents. La page se coupe à hauteur fixe, sans
regarder les lignes : dans `ticketz-10-caissiers-jonction-pages.png`, « CAISSIER : C.CAISSIER10 » est coupé en deux,
moitié en bas de la page 1, moitié en haut de la page 2.

Conséquence selon l'imprimante (non vérifiée ici) :

- si elle imprime les pages à la suite, sans avance ni coupe, le ticket est continu et lisible ;
- si elle coupe le papier ou laisse une marge à chaque page, une ligne est illisible à la jonction.

### Impression, ancien modèle (lu dans `GenerateTicketServiceImpl.printTicketZ`, boucle rejouée par le banc)

Le paramètre `BREAKING_TICKET_Z` vaut 40 sur `clementine`, `lagunes` et `danane`. Jusqu'à 40 lignes (corps et
total), le ticket sort en un seul travail. Au-delà :

| Corps | Travail 1 | Travaux suivants | Dernier travail |
|---|---|---|---|
| 80 lignes | lignes 1 à 79 | tout le corps, lignes 1 à 80 | total |
| 120 lignes | lignes 1 à 119 | lignes 41 à 80, puis tout le corps | total |
| 130 lignes | lignes 1 à 129 | 41 à 80, 81 à 120, puis tout le corps | total |

- Le premier travail contient tout le corps moins sa dernière ligne, au lieu des 40 premières lignes.
- Le dernier travail du corps réimprime tout le corps.
- Chaque travail ne dessine qu'une page. Une page de 792 points contient environ 52 lignes de ticket Z : ce qui
  dépasse n'est pas imprimé si le pilote limite la hauteur de la page.

Sur la journée réelle à 10 caissiers ci-dessus, le ticket fait 58 lignes de corps et 7 de total, donc plus de 40.

Niveau de preuve : défaut lu dans le code, boucle rejouée à l'identique ; pas d'impression sur papier. À confirmer
sur une imprimante d'officine avec un ticket Z de plus de 40 lignes.

## 2. clementine : assurés en majuscules, ayant droit en minuscules

### Recherche (`assures-majuscules-ayants-droit-minuscules.sql`)

| Élément | Nombre |
|---|---:|
| Clients assurés | 1 600 |
| dont nom de l'assuré en majuscules | 1 600 |
| Ayants droit dont le nom n'est pas en majuscules | 178 |
| dont ayant droit principal d'un assuré (même numéro) | 176 |
| – tout en minuscules | 132 |
| – casse mélangée | 44 |
| dont autres ayants droit | 2 |

Les 176 clients ont été créés du 11/05 au 10/09/2026 : 23 en mai, 61 en juin, 70 en juillet, 17 en août, 5 en
septembre. 173 ont des ventes clôturées. La requête 1 du fichier donne la liste nominative.

### Cause

À la création d'un client assuré, `ClientServiceImpl.createAyantDroit` recopie le nom tel qu'il a été tapé, alors
que le nom de l'assuré est passé en majuscules. Depuis le commit `559f0ee54` (07/09/2026), l'identité est
normalisée avant l'enregistrement : plus aucun cas après le 10/09 sur `clementine`.

### Modification depuis « Liste des bons par organisme » (test `essais/test-casse-ayant-droit.js`, 8/8)

Jeu d'essai : un assuré d'essai en majuscules, son ayant droit principal en minuscules, une vente avec un bon. Le
test passe par le menu, la liste, l'icône « Modifier info client » du bon. Jeu d'essai retiré à la fin.

| Action dans la fenêtre « Modification vente » | Résultat |
|---|---|
| « Modifier infos ayant droit » | refusé : « Il n'est pas possible de modifier les informations de l'ayant droit principal à ce niveau » |
| « Modifier infos client », puis « Enregistrer » sans rien changer | l'ayant droit principal passe en majuscules, en base et à l'écran |

Le blocage vient du premier bouton : il refuse l'ayant droit principal, qui est justement celui à corriger. Le
chemin qui marche est « Modifier infos client » : son enregistrement réécrit le nom de l'assuré et celui de son
ayant droit principal en majuscules. Le code est le même dans la version de l'officine (6.9.35).

Deux points relevés en passant :

- le refus est une fenêtre surgissante, et son texte porte une faute (« inforamtions ») ;
- corriger les 176 clients un par un par l'écran est long : une seule requête de mise à jour ferait le rattrapage.

### Cas particuliers sur clementine (suspectés, non confirmés)

- 4 des 176 clients ont un numéro porté par plusieurs ayants droit, dont 3 chez un autre client. « Modifier infos
  client » cherche l'ayant droit par le seul numéro, sans le client : il peut réécrire celui d'un autre client.
  Essai avec deux clients d'essai de même numéro (`essais/test-casse-numero-en-double.js`) : le bon ayant droit a
  été réécrit, le défaut n'est pas reproduit.
- Pendant cet essai, une vente d'essai pour un client dont le numéro existait chez un autre a échoué avec une
  erreur interne du serveur. Cause non recherchée.
- 1 des 176 clients n'a pas de tiers payant actif de priorité 1 : « Modifier infos client » y échouera avec
  « Erreur de modification du client » (lu dans le code).

## Ce qui a été touché sur le poste

- domain3 était figé (4,6 Go, plus de réponse) : processus arrêté et domaine relancé, même application, même base.
- `laborex_v1_db` : jeux d'essai posés puis retirés par les tests.
- `clementine` : lecture seule.

## Suite : rattrapage `rattrapage-casse-ayants-droit-clementine.sql`

Le script est prêt et essayé sur une base jetable (copie des clients et ayants droit de `clementine`), supprimée
ensuite. La copie locale `clementine` n'a pas été modifiée.

Ce que fait le script :

1. Il crée une table de trace `rattrapage_casse_ayants_droit_20261126` avec le nom et le prénom d'avant. Si la table
   existe déjà, le script s'arrête.
2. Il passe en majuscules le nom et le prénom des ayants droit qui ne le sont pas, comme l'écran « Modifier infos
   client ». Numéros, dates et ventes ne changent pas.
3. Il affiche les contrôles et donne en commentaire le retour arrière.

| Contrôle de l'essai | Valeur |
|---|---:|
| Ayants droit corrigés | 178 |
| dont ayants droit principaux | 176 |
| Ayants droit restés hors majuscules | 0 |
| Noms changés autrement que par la casse | 0 |
| Empreinte des 1 606 ayants droit hors casse (nom, numéro, date) | identique avant et après |
| Second lancement | refusé |
| Retour arrière | 0 différence avec l'état d'origine |

Conditions d'exécution en officine : sauvegarde juste avant ; Prestige peut rester ouvert. Les 4 clients au numéro
partagé sont corrigés comme les autres : le script travaille par identifiant d'ayant droit, pas par numéro.
