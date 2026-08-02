# Impression des étiquettes A4 (65 étiquettes)

## Formats pris en charge

Une feuille contient **65 étiquettes**, réparties en **5 colonnes et 13 lignes**.

| Modèle affiché dans l'application | Valeur technique | Dimensions d'une étiquette | Espacement |
| --- | --- | --- | --- |
| Carré | `CARRE_38X21_2` | 38 × 21,2 mm | aucun |
| Carré à bouts arrondis | `ARRONDI_38X21` | 38 × 21 mm | aucun |
| Carré avec espaces | `CARRE_38_1X21_2` | 38,1 × 21,2 mm | 2,54 mm entre colonnes |
| Personnalisé | `PERSONNALISE` | lue dans la configuration | lue dans la configuration |

Le modèle « Carré — 38 × 21,2 mm » est utilisé par défaut si aucun modèle n'est transmis et si le
paramètre de configuration `KEY_ETIQUETTE_MODELE` n'est pas renseigné. Les bouts arrondis sont ceux
du papier prédécoupé : le PDF ne dessine ni bordure ni trait de découpe. La grille est toujours
centrée sur la page A4 (210 × 297 mm).

## Paramétrage (table `t_parameters`, écran de configuration)

| Clé | Valeur livrée | Rôle |
| --- | --- | --- |
| `KEY_ETIQUETTE_MODELE` | `CARRE_38X21_2` | Modèle appliqué quand l'écran choisit « Défaut (configuration) » |
| `KEY_ETIQUETTE_NB_COLONNES` | `5` | Modèle PERSONNALISE : nombre de colonnes |
| `KEY_ETIQUETTE_NB_LIGNES` | `13` | Modèle PERSONNALISE : nombre de lignes |
| `KEY_ETIQUETTE_LARGEUR_MM` | `38` | Modèle PERSONNALISE : largeur d'une étiquette (mm) |
| `KEY_ETIQUETTE_HAUTEUR_MM` | `21.2` | Modèle PERSONNALISE : hauteur d'une étiquette (mm) |
| `KEY_ETIQUETTE_ESPACE_H_MM` | `0` | Modèle PERSONNALISE : espace horizontal entre étiquettes (mm) |
| `KEY_ETIQUETTE_ESPACE_V_MM` | `0` | Modèle PERSONNALISE : espace vertical entre étiquettes (mm) |

Le nombre d'étiquettes par page est le produit colonnes × lignes. Le séparateur décimal peut être
le point ou la virgule.

## Utilisation

Le modèle de feuille peut être choisi :

1. lors de l'entrée en stock, avant la proposition d'impression des étiquettes (écran de validation
   du bon de livraison) ;
2. lors de la réédition des étiquettes d'un bon de livraison (édition des entrées, bouton
   « Reediter les etiquettes ») — la même fenêtre est utilisée.

Le champ « Commencer l'impression à partir de » accepte une position comprise entre **1 et 65**. Il
permet de réutiliser une feuille dont les premières étiquettes ont déjà été consommées.

## Génération du PDF

Le navigateur appelle le servlet suivant :

```text
GET ../Etiquete?lg_BON_LIVRAISON_ID=<identifiant>&int_NUMBER=<1-65>&modele_ETIQUETTE=<modèle>
```

Paramètres :

- `lg_BON_LIVRAISON_ID` : identifiant du bon de livraison ;
- `int_NUMBER` : première position à utiliser sur la feuille ;
- `modele_ETIQUETTE` : `CARRE_38X21_2`, `ARRONDI_38X21`, `CARRE_38_1X21_2` ou `PERSONNALISE`
  (vide = valeur de `KEY_ETIQUETTE_MODELE`).

L'ancien point d'entrée `webservices/commandemanagement/bonlivraison/ws_generate_etiquette_pdf.jsp`
redirige vers ce servlet en conservant les paramètres.

Le PDF est généré directement en mémoire avec des dimensions exprimées en millimètres, puis streamé
au navigateur (aucun fichier temporaire). Les codes-barres sont **vectoriels** (Code 128). Chaque
étiquette contient le nom de l'officine, **le grossiste** (récupéré depuis le bon de livraison :
bon → commande → grossiste), la désignation, le code-barres, le prix, la date et le CIP.

## Réglages d'impression obligatoires

Pour conserver les dimensions physiques du document :

1. sélectionner le papier **A4** et l'orientation portrait ;
2. choisir **Taille réelle**, **Échelle 100 %** ou **Dimensions réelles** selon le lecteur PDF ;
3. désactiver **Ajuster**, **Réduire les pages trop grandes** et toute mise à l'échelle automatique ;
4. désactiver les options du pilote telles que « Ajuster à la zone imprimable » ou « Sans bordure »
   si elles modifient l'échelle ;
5. vérifier que l'imprimante ne force pas un autre format de papier.

Le PDF demande aux lecteurs de ne pas appliquer de mise à l'échelle (`PrintScaling = None`). Le
pilote de l'imprimante peut néanmoins remplacer ce réglage : l'échelle à 100 % doit donc être
contrôlée dans la boîte de dialogue d'impression. Sous Firefox, utiliser la boîte d'impression et
vérifier que l'option « Ajuster à la page » est décochée (échelle 100 %).

## Contrôle avant utilisation en production

Effectuer une première impression sur une feuille A4 ordinaire :

1. superposer la feuille imprimée et une feuille d'étiquettes devant une source lumineuse ;
2. contrôler la première et la dernière ligne ainsi que les colonnes gauche et droite ;
3. mesurer un bloc de cinq colonnes : il doit occuper **190 mm** (modèles sans espace) ;
4. mesurer les treize lignes : elles doivent occuper **275,6 mm** pour le modèle 38 × 21,2 mm, ou
   **273 mm** pour le modèle 38 × 21 mm.

Un décalage uniforme de toute la page indique généralement un problème de prise papier ou de marges
physiques de l'imprimante. Une dérive progressive entre la première et la dernière étiquette
indique généralement une mise à l'échelle différente de 100 % ou la sélection du mauvais modèle.

## Fichiers concernés

- `src/main/java/rest/report/pdf/Etiquete.java` : collecte les données (dont le grossiste) et
  streame le PDF ;
- `src/main/java/rest/report/pdf/LabelSheetPdf.java` : définit la grille, les formats et dessine
  les étiquettes ;
- `src/main/resources/db/migration/V6.5.23__parametrage_etiquettes.sql` : paramètres de
  configuration ;
- `src/main/webapp/general/app/view/commandemanagement/bonlivraison/action/add.js` : choix du
  modèle lors de l'entrée en stock ;
- `src/main/webapp/general/app/view/stockmanagement/etiquette/action/add.js` : choix du modèle lors
  d'une réédition.
