# Étiquettage Pro

Étiquettage Pro sert à imprimer des étiquettes de produits venant d'un fichier (CSV ou Excel) ou saisis à l'écran, en trois types de code :

- code-barres standard (le CIP) ;
- DataMatrix ;
- QR code.

DataMatrix et QR code suivent la norme GS1 et contiennent l'EAN, la péremption, le lot et le CIP.

Il existe sous deux formes :

- le menu **GESTION DU STOCK › Étiquettage Pro** de Prestige ;
- l'application autonome **EtiquettagePro.jar**, utilisable sur n'importe quel ordinateur, sans Prestige.

Étiquettage Pro ne fait qu'imprimer : rien n'est enregistré dans les fiches articles.

## L'assistant en 4 étapes

L'assistant se déroule dans l'écran, sans fenêtre.

### 1. Source

**Importer un fichier.** Les formats acceptés sont :

- CSV, avec l'un de ces séparateurs : `;` `,` tabulation ou `|` ;
- Excel, `.xlsx` ou `.xls`.

Le séparateur et l'encodage (UTF-8 ou Windows) sont reconnus seuls. Pour un classeur Excel, on choisit la feuille. On indique aussi si la 1re ligne porte les titres des colonnes. L'aperçu affiche le fichier tel qu'il a été lu.

**Saisir les produits à la main.** Ce choix va directement au tableau des produits (étape 3).

**Panneau « Colonnes »** (à droite de l'aperçu). Il sert à savoir comment préparer un nouveau modèle de fichier avant de l'apporter :

- **Colonnes du fichier en cours** : chaque colonne lue, un exemple tiré de la 1re ligne, et la zone de l'étiquette qui la reprend (« → CIP », « → Prix »…), ou « non utilisée ». Le tableau suit les changements faits à l'étape 2.
- **Titres reconnus automatiquement** : pour chaque zone, les titres de colonne pris sans réglage, par exemple « Code produit » ou « CIP7 » pour le CIP, « Libellé » pour la désignation, « PV » pour le prix. Les accents et les majuscules ne comptent pas.
- **Fichier modèle (CSV)** : il contient une colonne par zone et deux lignes d'exemple. Importé tel quel, chaque colonne va dans sa zone. Partez de ce modèle pour tester avant d'apporter un nouveau fichier.

### 2. Zones

Les zones de l'étiquette sont : CIP, désignation, prix, grossiste, lot, péremption, EAN, nombre d'étiquettes, date imprimée et mention libre.

Pour chaque zone, la **source** peut être :

- une **colonne** du fichier ;
- un **texte fixe**, le même pour toutes les lignes (pratique pour une zone absente du fichier) ;
- un **modèle** qui combine les deux, par exemple `Lot {N° lot} - {Rayon}`.

Une proposition est faite d'après les titres des colonnes. Par exemple, « Libellé » va dans la désignation, « PV » dans le prix et « Qté » dans le nombre d'étiquettes. Le bouton « Proposer d'après les titres » la remet.

**Obligatoire / facultatif.** On coche les zones sans lesquelles une ligne ne doit pas être imprimée. Le CIP est toujours obligatoire.

**Ajouter une zone.** On peut créer une zone qui n'existe pas, avec un nom libre, par exemple « Emplacement » = `Rayon {Rayon}`. On la reprend ensuite dans un modèle par son nom, par exemple `{Emplacement}` dans la mention libre.

Si toutes les colonnes citées dans un modèle sont vides pour une ligne, la zone reste vide. Par exemple, `Lot {Lot}` sans lot ne donne pas « Lot » tout seul.

La correspondance est retenue : un fichier de même forme la retrouve automatiquement.

### 3. Produits

Le tableau des produits est modifiable cellule par cellule. On peut ajouter ou supprimer des lignes.

Chaque ligne est contrôlée. Une **ligne en erreur** apparaît en rouge et n'est pas imprimée. Exemples d'erreur :

- CIP manquant ;
- prix illisible ;
- date impossible ;
- nombre d'étiquettes hors de 0 à 999.

Un **avertissement** n'empêche pas l'impression. Exemples :

- lot périmé ;
- EAN invalide (il est alors omis du code 2D).

Les prix sont lus quelle que soit leur écriture : « 1 500 », « 1500 F », « 1.500 », « 1 500,50 », « 12,5 € ».

Les dates sont lues sous ces formes : jj/mm/aaaa, jj/mm/aa, aaaa-mm-jj, mm/aaaa (dernier jour du mois), ou date Excel.

Dans Prestige, le bouton **Compléter depuis Prestige** reprend, par le CIP, la désignation, le prix, l'EAN et le grossiste des produits. Il ne remplit que les cases vides.

### 4. Impression

On choisit :

- le **type de code** ;
- la **planche** : les modèles de Prestige (carré 38 x 21,2 ; carré 38,1 x 21,2 espacé ; arrondi 38 x 21) ou un **format libre** (colonnes, lignes, largeur, hauteur, espaces) ;
- le **calage** : marges, décalages, échelle ;
- la **position de départ**, pour finir une planche entamée ;
- le nom de la pharmacie, la monnaie du prix et la date imprimée.

Ces réglages ne valent que pour l'impression : la configuration de Prestige n'est pas modifiée.

**Page de test** imprime les contours numérotés de la planche. Imprimez-la à 100 % et superposez-la sur une planche pour vérifier le calage.

Ce que l'étiquette affiche dépend du type de code :

- **Code-barres standard** : pharmacie, puis « grossiste - date - mention », puis désignation, puis le code du CIP, puis « CIP -- prix ». Si cette 2e ligne est trop longue, le grossiste est abrégé, puis la date est retirée : la mention reste lisible.
- **DataMatrix / QR code** : pharmacie en haut. À gauche : CIP, prix, grossiste, mention et code unique de l'étiquette. Le code est à droite.
- **DataMatrix+ / QR+** : disposition de la Personnalisation (voir plus bas).

Une disposition validée dans l'onglet **Personnalisation** remplace ce dessin pour son type de code et sa dimension.

**Code unique** : chaque étiquette 2D porte un code de 5 caractères, jamais reproduit. Il passe à 6, puis 7, puis 8 caractères quand les codes d'une longueur s'épuisent.

**Code géo** : nouvelle zone facultative (titres reconnus : « code géo », « position », « zone géo »…). « Compléter depuis Prestige » reprend le **code géo de l'article** (fiche article, `str_CODE_GEO_ARTICLE`). Il n'est pas affiché par défaut sur l'étiquette : on le coche dans la Personnalisation.

## Codes étendus : DataMatrix+ et QR+ (hors vente)

Deux types de code s'ajoutent aux trois habituels, **sans rien changer à ces derniers**. Ils servent à la commande, à la réception, à l'inventaire et au contrôle de rayon : au scan, on récupère tout d'un coup.

| Type | Contenu | Pour qui |
|---|---|---|
| **DataMatrix+** | La chaîne GS1 habituelle — (01) GTIN, (17) péremption, (10) lot, (240) CIP — puis les champs « usage interne » de la norme (jeu de caractères GS1 : l'espace s'écrit « _ », Prestige le remet à la lecture) : (91) marqueur `EPLUS1`, (92) désignation, (93) prix, (94) pharmacie, (95) grossiste, (96) code géo, (97) code de l'étiquette. | Douchettes. Une douchette ou un logiciel tiers lit toujours le produit, le lot et la péremption ; Prestige lit tout. |
| **QR+** | Un texte clair sur une ligne : `EP1\|CIP:3400930000014\|NOM:DOLIPRANE 1000MG\|PRIX:1250\|LOT:A2410B\|PER:31/12/2027\|PHA:…\|GEO:B-04` | Téléphones (lisible tel quel). Prestige le lit aussi. |

- Le CIP, le lot, la péremption (et l'EAN) y sont toujours. Les autres informations se choisissent dans la Personnalisation (case **« Dans le code »**) ; par défaut : désignation, prix, pharmacie (le code géo, facultatif, se coche).
- Les accents sont retirés (les douchettes les déforment) et chaque information est bornée en longueur.
- **Le prix du code est figé au jour de l'impression** : il ne sert jamais à la vente. Hors vente, « Lire une étiquette » signale l'écart avec le prix actuel.
- **À la caisse, les deux codes étendus sont refusés** (vente, vente en dépôt, devis), quel que soit le paramètre de lecture GS1 : « Cette étiquette est réservée à la commande, à la réception et à l'inventaire ». L'étiquette GS1 habituelle passe comme avant.
- Plus d'informations = un code plus dense. Sur une petite étiquette, la disposition proposée met moins d'informations dans le code pour qu'il reste lisible ; si le format est vraiment trop petit, l'impression est refusée avec la raison.

## Personnalisation (onglet en haut à droite)

Une **vue réelle** de l'étiquette, pour un type de code et une planche (dimension en mm). Une disposition est enregistrée **par type de code et par dimension**, et choisie automatiquement à l'impression.

- **Informations** à cocher : nom de la pharmacie, désignation (nom en machine, deux lignes possibles), CIP, prix, grossiste, code géo, lot, péremption, code de l'étiquette, date, mention ; pour DataMatrix+ / QR+, la case « Dans le code ».
- **Déplacer** : glisser à la souris, ou flèches du clavier (0,1 mm ; Maj + flèches : 1 mm).
- **Agrandir** : les points d'extension autour de l'élément sélectionné. Un texte agrandi en hauteur grossit sa police ; le code 2D reste carré.
- **Police et alignement** : colonne « Police (pt) » et boutons Gauche / Centre / Droite.
- **Zoom** : agrandit la zone de travail, jamais la taille réelle de l'étiquette.
- **Aperçu avec un produit** (son CIP) et **Pire cas** (nom, prix et lot les plus longs).
- **Garde-fous** (en rouge, « Valider » grisé tant qu'il en reste) :
  - rien ne sort de l'étiquette (1 mm de marge au bord) et rien ne se chevauche ; le cadre du code comprend sa zone de silence ;
  - code 2D : point de 0,25 mm au moins, contrôlé sur le contenu le plus long possible (avertissement sous 0,33 mm : limite sur une imprimante thermique de base) ;
  - code-barres : barre fine de 0,19 mm au moins, 5 mm de haut au moins ;
  - texte : 4,5 pt au moins, cadre assez haut pour une ligne.
- Un texte trop long : la police descend jusqu'au minimum lisible (la désignation passe d'abord sur deux lignes), puis il est abrégé. La vue montre exactement ce que donnera l'impression.
- **Valider** enregistre ; **Essai (PDF)** imprime une étiquette d'exemple ; **Rétablir la disposition d'origine** supprime la disposition enregistrée.
- Sans disposition enregistrée, les étiquettes code-barres, QR et DataMatrix gardent **exactement** leur dessin d'origine. La disposition proposée ne sert qu'une fois validée : pharmacie en haut, désignation dessous, puis à gauche CIP, prix, date d'édition, grossiste et code de l'étiquette (le grossiste reste aussi sur le 38 x 21,2), le code à droite. Le code géo est facultatif : non affiché par défaut.
- Une information cochée se pose toute seule sur une place libre (police réduite si besoin, jamais sous le minimum lisible) ; s'il n'y a pas de place, elle apparaît en rouge avec la raison.
- Changement de planche : la disposition d'un autre format du même type est reportée à l'échelle, à vérifier puis valider.
- Les étiquettes QR / DataMatrix imprimées depuis la gestion des étiquettes et les bons de livraison suivent aussi la disposition validée ; le code-barres classique n'est pas concerné.

## Date d'édition

La date d'impression (« Date d'édition », date du jour par défaut, modifiable à l'impression) s'affiche sur les 5 types de code et se place dans la Personnalisation comme les autres informations. Elle n'entre jamais dans le code.

## Types d'étiquette des produits (onglet en haut à droite)

Chaque produit porte un **type d'étiquette** (fiche article, `lg_TYPEETIQUETTE_ID`). Cinq types reliés à un code s'ajoutent : **Code-barres** (par défaut), **DataMatrix**, **QR code**, **DataMatrix+**, **QR+**. On peut en créer d'autres (nom unique, code obligatoire) ; ils sont proposés sur la fiche article.

Les 5 types d'origine (CIP, CIP_PRIX, CIP_DESIGNATION, CIP_PRIX_DESIGNATION, POSITION) sont **gardés tels quels** : aucun produit n'a été modifié. Un produit sur un type d'origine s'imprime comme aujourd'hui (code du paramétrage).

**Mise à jour sélective** :

1. Filtres : zone géographique, famille, grossiste, type actuel, recherche (CIP ou désignation).
2. Cocher des produits, ou prendre tout le filtre.
3. Choisir le nouveau type, puis « Appliquer » : une confirmation s'affiche dans l'écran (nombre de produits, type visé). Rien n'est écrit avant « Confirmer ».
4. Chaque mise à jour est notée (qui, quand, ancien et nouveau type) dans « Dernières mises à jour » ; le lien **Annuler** remet les produits sur leur type d'avant (sauf ceux modifiés depuis).

Droit **P_SM_ETIQUETTE_TYPE** (administrateur par défaut) ; sans lui, l'onglet est en lecture seule.

**À l'impression**, l'option « Selon le type d'étiquette de chaque produit » (cochée par défaut, paramètre `KEY_ETIQUETTE_CODE_PAR_PRODUIT`) imprime chaque produit avec le code de son type : une même planche peut mélanger code-barres, DataMatrix et DataMatrix+. Décochée, le code choisi vaut pour tous. Cela vaut pour l'assistant d'Étiquettage Pro et pour les impressions de Prestige.

## Impression Prestige (onglet en haut à droite)

L'aperçu avant impression des étiquettes de Prestige, comme l'étape 4 de l'assistant :

- étiquettes à imprimer : **panier de l'étiquetage massif** ou **bon de livraison** (quantités reçues) ;
- réglages de Prestige affichés et modifiables à l'écran : type de code, « selon le type de chaque produit », planche, format libre et calage, position de départ, date d'édition ;
- **aperçu de la planche** : cases déjà utilisées en gris, étiquettes à imprimer en couleur par type ; **un clic sur une case** choisit la position de départ ;
- résumé : nombre d'étiquettes par type et nombre de planches ;
- **Page de test** et **Générer le PDF** (moteur de Prestige, avec les réglages de l'écran) ; le panier est soldé après l'impression, comme avant ;
- **Enregistrer comme réglages par défaut** : les réglages de l'écran deviennent ceux de toutes les impressions d'étiquettes de Prestige (administrateur seulement).

Les impressions depuis la gestion des étiquettes et les bons de livraison fonctionnent toujours comme avant.

## Lire une étiquette (onglet en haut à droite)

On scanne (ou on colle) une étiquette DataMatrix+, QR+, GS1 habituelle ou un simple CIP, puis Entrée : toutes les informations s'affichent, avec le produit de Prestige et les **alertes** : prix étiqueté différent du prix actuel (« étiquette à refaire »), lot périmé ou péremption à moins de 3 mois, produit inconnu. Le champ se vide et garde le focus : on enchaîne les scans.

## Droits (Prestige)

Le menu est protégé par le droit **P_SM_ETIQUETAGE_PRO**. Il a été donné aux rôles qui ont déjà la gestion des étiquettes, et à l'administrateur. Pour les autres rôles, on l'ajoute dans la gestion des rôles.

**Modifier la personnalisation** demande le droit **P_SM_ETIQUETTE_PERSO**, donné au seul administrateur par défaut. Sans lui, l'onglet est en lecture seule.

## Application autonome : EtiquettagePro.jar

- **Lancer** : double-clic sur `EtiquettagePro.jar`, ou `java -jar EtiquettagePro.jar`. Il faut Java 8 ou plus ; aucune installation, base de données ou connexion n'est nécessaire.
- **Utilisation** : c'est le même assistant en 4 étapes. Le PDF est enregistré là où vous l'indiquez, puis ouvert pour l'impression.
- **Codes uniques** : chaque poste a son **préfixe** de 2 caractères, affiché à l'étape 4 et tiré au premier lancement. Tous ses codes commencent par ce préfixe. Deux postes n'ont donc jamais le même code, à condition que leurs préfixes soient différents. Les codes donnés sont tenus dans un registre local, et un code n'est jamais redonné, même avec deux fenêtres ouvertes.
- **Réglages du poste** : nom de la pharmacie, monnaie, planche, calage, type de code et correspondances des fichiers sont retenus d'une fois sur l'autre. Ils sont rangés dans :
  - sous Windows : `%APPDATA%\EtiquetagePro` ;
  - ailleurs : `~/.etiquetage-pro`.

  Pour changer de dossier, lancez avec `-Detiquetagepro.dossier=...`.
- **À sauvegarder** : `codes.txt` (le registre des codes) et `prefixe.txt`. Si vous réinstallez sur le même poste, gardez ces deux fichiers pour ne pas redonner d'anciens codes.

### Construire le JAR (développeurs)

```
mvn package                          # à la racine du projet (bibliothèques du WAR)
outils/etiquetage-pro/construire.sh  # donne outils/etiquetage-pro/dist/EtiquettagePro.jar
outils/etiquetage-pro/tester.sh      # essai de la fenêtre sur un écran virtuel
```

Le moteur est le même que dans Prestige : le paquet `etiquetagepro`, et les planches et codes GS1 de `rest.report.pdf`. Une correction faite d'un côté vaut pour les deux.
