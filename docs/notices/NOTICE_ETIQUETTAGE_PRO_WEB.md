# Étiquettage Pro — version web (poste autonome)

Application à installer sur **un poste Windows** de la pharmacie : catalogue des produits (import CSV ou Excel,
fiches), impression d'étiquettes sur planches A4 avec le même moteur que Prestige. Elle s'utilise dans le navigateur
du poste, sans Internet. Rien à installer à côté : Java et la base (MariaDB) sont inclus.

## 1. Installation

1. Lancer `Etiquettage Pro-1.0.0.exe`. L'installation se fait **pour l'utilisateur Windows** (pas de droits
   d'administrateur). Dossier proposé : modifiable. Raccourcis : Bureau (proposé) et menu Démarrer.
2. Lancer **Étiquettage Pro** (raccourci). Au premier lancement, la base est créée (quelques secondes), puis le
   navigateur s'ouvre sur l'écran de connexion (`http://127.0.0.1:8095`).
3. Se connecter avec **admin / admin**. Un bandeau propose de changer le mot de passe (*Mon compte*, en cliquant
   sur le nom en haut à droite) ; c'est facultatif.

Un deuxième clic sur le raccourci n'ouvre pas une deuxième application : il ouvre seulement le navigateur sur celle
qui tourne. Si le port 8095 est déjà pris par un autre programme, un autre port est choisi automatiquement et le
navigateur s'ouvre dessus.

## 2. Écrans

- **Catalogue** — recherche « contient » (CIP, désignation, lot, code géo, plusieurs mots), **scanner accepté** :
  scanner un CIP, un EAN ou le code GS1 d'une boîte puis *Entrée* coche le produit pour l'impression et vide le champ
  pour le scan suivant. Filtres *Péremption* (moins de 3 ou 6 mois, dépassée) et *Dernier import*. Tri par clic sur
  un en-tête. *Colonnes affichées* : choix des colonnes (mémorisé sur le poste). Clavier : ↑ ↓, *Espace* coche,
  *Entrée* ouvre la fiche, *Ctrl+N* nouveau produit, *Ctrl+P* imprimer la sélection.
- **Fiche produit** — chaque champ est contrôlé pendant la saisie, l'erreur s'affiche sous le champ
  (« février n'a pas de 31 », « CIP de 6 chiffres ») et *Enregistrer* reste grisé tant qu'il en reste.
  *Entrée* passe au champ suivant, *Ctrl+S* enregistre, *Échap* revient au catalogue (avec un avertissement si des
  modifications ne sont pas enregistrées). Le CIP n'est plus modifiable après création. À droite : aperçu,
  *Aperçu réel (PDF)* et historique (qui, quand, ancien → nouveau).
- **Importer** — 4 étapes :
  1. *Fichier* : CSV (séparateur `;` `,` tabulation ou `|`, encodage reconnu) ou Excel (.xlsx, .xls), 30 Mo au plus ;
  2. *Champs* : chaque colonne est associée à un champ (proposé d'après le titre), devient un **nouveau champ** du
     catalogue (« Famille », « Rayon »…) ou est **ignorée**. Le CIP est obligatoire ;
  3. *Contrôle* : produits mis à jour, nouveaux, inchangés, lignes en erreur, CIP en double. **Rien n'est écrit**
     à cette étape. Erreurs ligne par ligne, *Exporter les erreurs (CSV)* ;
  4. *Résultat* : *Voir les produits de cet import*, *Imprimer les étiquettes de cet import*.

  Règles : le **CIP** identifie le produit (existant → mis à jour, sinon créé ; la désignation est alors
  obligatoire) ; **une cellule vide n'efface jamais** une valeur du catalogue ; pour un CIP présent plusieurs fois,
  **la dernière ligne** est gardée ; une ligne en erreur n'est pas importée. La correspondance des colonnes est
  **mémorisée** : le fichier suivant du même format la reprend.
- **Imprimer** — type de code (code-barres 1D, GS1 DataMatrix, QR GS1, DataMatrix+ et QR+ avec toutes les
  informations et un code unique par étiquette), planche, nombre d'étiquettes par produit (vide = celui de chaque
  fiche), **case de départ** (planche entamée), date imprimée. L'aperçu montre la première page ; *Imprimer (PDF)*
  affiche le PDF dans la page : l'imprimer **à 100 %** (sans « ajuster à la page »).
  *Réglages* : nom de la pharmacie, monnaie, type et planche par défaut, planche personnalisée (colonnes, lignes,
  dimensions, espaces) et **calage** : imprimer la *Page de test*, la poser sur une planche à contre-jour, reporter
  le décalage mesuré (mm).
- **Personnaliser** — disposition de l'étiquette par type de code et format : élément imprimé ou non, position,
  taille, police, alignement, « dans le code » (2D). L'aperçu est dessiné comme à l'impression ; ce qui serait
  illisible est signalé en rouge et empêche l'enregistrement. *Essai sur papier (PDF)*, *Rétablir la disposition
  d'origine*.

Aucune fenêtre surgissante : confirmations (suppression, arrêt) et messages s'affichent dans la page.

## 3. Données, sauvegarde, sécurité

- Données : `%LOCALAPPDATA%\EtiquettagePro` (base dans `base\`). Elles sont **gardées** à la mise à jour et à la
  désinstallation.
- **Sauvegarde** : *Mon compte › Arrêter l'application*, puis copier tout le dossier `%LOCALAPPDATA%\EtiquettagePro`
  (clé USB, disque réseau). Restauration : application arrêtée, remettre le dossier à sa place.
- L'application et la base n'écoutent **que sur le poste** (127.0.0.1) : aucun autre ordinateur ne peut s'y
  connecter. La base est protégée par un mot de passe tiré au hasard à la première ouverture, gardé dans
  `acces-base.properties` (dans le dossier des données, propre à l'utilisateur Windows) : **ne pas le diffuser**.
- Connexion obligatoire pour tout, mots de passe chiffrés (BCrypt), session de 8 h.

## 4. Mise à jour, arrêt, désinstallation

- **Arrêter** : *Mon compte › Arrêter l'application…* (confirmation dans la page). L'application s'arrête aussi à
  la fermeture de la session Windows.
- **Mettre à jour** : arrêter l'application, lancer le nouvel installateur (il remplace l'ancienne version ; les
  données restent).
- **Désinstaller** : Paramètres Windows › Applications › *Etiquettage Pro*. Les données restent dans
  `%LOCALAPPDATA%\EtiquettagePro` (à supprimer à la main si on ne veut plus les garder).

## 5. Dépannage

| Constat | Que faire |
| --- | --- |
| Le navigateur ne s'ouvre pas | Ouvrir `http://127.0.0.1:8095` à la main. |
| « Session expirée » | Se reconnecter : l'écran revient sur la page demandée. |
| Étiquettes décalées | *Imprimer › Réglages* : imprimer la page de test, corriger le décalage (mm) ; vérifier l'impression à 100 %. |
| Mot de passe admin oublié | Créer un fichier vide `reinitialiser-admin.txt` dans `%LOCALAPPDATA%\EtiquettagePro`, relancer l'application : le compte redevient **admin / admin** (le fichier est retiré). |

## 6. Construire l'installateur (équipe technique)

Sous **Windows**, avec JDK 21 (jpackage), WiX Toolset 3.14, Node.js 20+ et Maven :
`outils\etiquetage-pro-web\installateur\construire-windows.bat`. Résultat :
`outils\etiquetage-pro-web\backend\target\installateur\Etiquettage Pro-<version>.exe`. Sous Windows, les binaires
MariaDB pour Linux ne sont pas inclus (profil Maven `binaires-linux` actif sous Linux seulement) ; le script le
vérifie.

Tests (base de test `bd_etiquette_test` uniquement) : `outils/etiquetage-pro-web/tester.sh` — tests du serveur puis
test de bout en bout dans Chromium.
