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

### Paramètres de calage (tous modèles)

| Clé | Valeur livrée | Rôle |
| --- | --- | --- |
| `KEY_ETIQUETTE_MARGE_GAUCHE_MM` | *(vide)* | Marge gauche réelle du papier en mm (vide = grille centrée) |
| `KEY_ETIQUETTE_MARGE_HAUT_MM` | *(vide)* | Marge haute réelle du papier en mm (vide = grille centrée) |
| `KEY_ETIQUETTE_DECALAGE_X_MM` | `0` | Décalage horizontal en mm (+ = droite, − = gauche) |
| `KEY_ETIQUETTE_DECALAGE_Y_MM` | `0` | Décalage vertical en mm (+ = bas, − = haut) |
| `KEY_ETIQUETTE_ECHELLE_POURCENT` | `100` | Échelle de la grille (50–150) pour compenser un pilote qui réduit la page |

Ces corrections s'appliquent à tous les modèles et prennent effet immédiatement, sans
redéploiement.

### Bascule de sécurité et mode d'ouverture

| Clé | Valeur livrée | Rôle |
| --- | --- | --- |
| `KEY_ETIQUETTE_MOTEUR` | `NOUVEAU` | `NOUVEAU` = PDF vectoriel ; `ANCIEN` = JasperReports historique (repli immédiat sans redéploiement) |
| `KEY_ETIQUETTE_TELECHARGEMENT` | `0` | `1` = le PDF est téléchargé et s'ouvre dans l'application PDF du poste au lieu du visionneur du navigateur |

En mode `ANCIEN`, le servlet redirige vers
`webservices/commandemanagement/bonlivraison/ws_generate_etiquette_pdf_legacy.jsp` (le code
d'origine conservé tel quel). La page de test reste toujours servie par le nouveau moteur.

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

## Réglages par lecteur PDF / navigateur

Le PDF demande l'impression à 100 % (`PrintScaling = None`), mais chaque logiciel garde ses propres
réglages. À faire **une fois par poste** :

| Logiciel | Réglage d'échelle | Où | Remarque |
| --- | --- | --- | --- |
| Adobe Reader | **Taille réelle** | Boîte d'impression | Cocher aussi « Choisir la source de papier selon le format de la page PDF ». Réglages mémorisés. Référence recommandée |
| Foxit Reader | **Taille réelle** (Aucune mise à l'échelle) | Boîte d'impression | Équivalent d'Adobe, réglages mémorisés |
| Chrome | Plus de paramètres → Échelle : **Par défaut** (ou Personnalisé = 100) | Boîte d'impression | Ne jamais laisser « Ajuster à la zone imprimable » |
| Edge | Plus de paramètres → Échelle : **100 %** | Boîte d'impression | Idem Chrome |
| Firefox | Ne pas cocher « Ajuster à la largeur de la page », échelle **100 %** | Boîte d'impression | Le visionneur pdf.js ignore `PrintScaling` |

Les navigateurs n'offrent pas l'option « source de papier selon le format PDF » : elle appartient à
l'application PDF et au pilote. Pour ne rien dépendre du navigateur, mettre
`KEY_ETIQUETTE_TELECHARGEMENT` à `1` : le PDF est alors téléchargé et s'ouvre dans l'application
PDF par défaut du poste (Adobe/Foxit), qui imprime toujours avec les mêmes réglages. C'est la
configuration la plus reproductible quand plusieurs navigateurs cohabitent.

Les décalages X/Y et l'échelle de la configuration sont propres à l'**imprimante** (mesurés avec la
page de test) ; les réglages ci-dessus sont propres au **logiciel** de chaque poste. Les deux se
cumulent.

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

## Calibrage avec la page de test

Le servlet fournit une page de test qui imprime les **contours et numéros** de toutes les
positions, ainsi qu'une règle de contrôle graduée tous les 10 mm :

```text
GET ../Etiquete?test=1&modele_ETIQUETTE=<modèle>
```

Elle est aussi accessible par le bouton « Page de test » de la fenêtre d'édition des étiquettes.

Procédure :

1. imprimer la page de test sur une feuille A4 ordinaire, à **100 % / taille réelle** ;
2. mesurer la règle au réglet : elle doit faire exactement **190 mm** (modèles sans espace).
   - Si elle est plus courte (ex. 182 mm), le pilote réduit la page : soit corriger le réglage
     d'impression, soit compenser avec `KEY_ETIQUETTE_ECHELLE_POURCENT` (ex. 190 ÷ 182 ≈ `104`).
     Une dérive progressive entre la première et la dernière ligne a la même cause ;
3. superposer la feuille imprimée et une planche d'étiquettes devant une source lumineuse ;
4. si toute la grille est décalée uniformément, renseigner `KEY_ETIQUETTE_DECALAGE_X_MM` et
   `KEY_ETIQUETTE_DECALAGE_Y_MM` avec l'écart mesuré en mm (+ = droite/bas, − = gauche/haut) ;
5. si les marges du papier ne sont pas symétriques, renseigner directement
   `KEY_ETIQUETTE_MARGE_GAUCHE_MM` et `KEY_ETIQUETTE_MARGE_HAUT_MM` ;
6. réimprimer la page de test jusqu'à superposition parfaite, puis valider avec de vraies
   étiquettes.

Un décalage uniforme de toute la page indique généralement un problème de prise papier ou de marges
physiques de l'imprimante (corrigeable par les décalages X/Y). Une dérive progressive entre la
première et la dernière étiquette indique une mise à l'échelle différente de 100 % (corrigeable par
l'échelle en %, ou en réglant la boîte d'impression).

### Note sur l'ancien gabarit JasperReports

L'ancien `rp_etiquette.jrxml` utilisait une page de 595 × 863 pt (plus haute qu'un A4 réel) avec
une grille surdimensionnée d'environ 4 %, prévue pour être imprimée avec Adobe Reader en mode
« Réduire au format » : le rétrécissement ramenait la grille sur le papier, avec un résultat
dépendant du lecteur PDF et des marges de chaque imprimante — d'où les décalages aléatoires. Le
nouveau PDF est aux cotes exactes et s'imprime toujours à 100 %.

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
