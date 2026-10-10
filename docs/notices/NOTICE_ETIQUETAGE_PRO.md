# Étiquetage Pro

Étiquetage Pro sert à imprimer des étiquettes de produits venant d'un fichier (CSV ou Excel) ou saisis à l'écran, en trois types de code :

- code-barres standard (le CIP) ;
- DataMatrix ;
- QR code.

DataMatrix et QR code suivent la norme GS1 et contiennent l'EAN, la péremption, le lot et le CIP.

Il existe sous deux formes :

- le menu **GESTION DU STOCK › Étiquetage Pro** de Prestige ;
- l'application autonome **EtiquetagePro.jar**, utilisable sur n'importe quel ordinateur, sans Prestige.

Étiquetage Pro ne fait qu'imprimer : rien n'est enregistré dans les fiches articles.

## L'assistant en 4 étapes

L'assistant se déroule dans l'écran, sans fenêtre.

### 1. Source

**Importer un fichier.** Les formats acceptés sont :

- CSV, avec l'un de ces séparateurs : `;` `,` tabulation ou `|` ;
- Excel, `.xlsx` ou `.xls`.

Le séparateur et l'encodage (UTF-8 ou Windows) sont reconnus seuls. Pour un classeur Excel, on choisit la feuille. On indique aussi si la 1re ligne porte les titres des colonnes. L'aperçu affiche le fichier tel qu'il a été lu.

**Saisir les produits à la main.** Ce choix va directement au tableau des produits (étape 3).

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

**Code unique** : chaque étiquette 2D porte un code de 5 caractères, jamais reproduit. Il passe à 6, puis 7, puis 8 caractères quand les codes d'une longueur s'épuisent.

## Droits (Prestige)

Le menu est protégé par le droit **P_SM_ETIQUETAGE_PRO**. Il a été donné aux rôles qui ont déjà la gestion des étiquettes, et à l'administrateur. Pour les autres rôles, on l'ajoute dans la gestion des rôles.

## Application autonome : EtiquetagePro.jar

- **Lancer** : double-clic sur `EtiquetagePro.jar`, ou `java -jar EtiquetagePro.jar`. Il faut Java 8 ou plus ; aucune installation, base de données ou connexion n'est nécessaire.
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
outils/etiquetage-pro/construire.sh  # donne outils/etiquetage-pro/dist/EtiquetagePro.jar
outils/etiquetage-pro/tester.sh      # essai de la fenêtre sur un écran virtuel
```

Le moteur est le même que dans Prestige : le paquet `etiquetagepro`, et les planches et codes GS1 de `rest.report.pdf`. Une correction faite d'un côté vaut pour les deux.
