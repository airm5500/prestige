# Demande à l'application mobile de vente : envoyer le nom de l'appareil

**Date** : 25/10/2026 (retours des tests, point 4)

## Le problème

Dans Prestige, « Ventes terminées » affiche le poste d'où chaque vente a été saisie (colonne P) et permet de filtrer
par poste. Pour les ventes faites sur un terminal Sunmi avec l'application mobile Prestige, ce poste n'est pas le nom
de l'appareil : l'application n'envoie pas d'en-tête `X-Poste`, et le serveur garde alors le nom réseau de la machine,
souvent son adresse IP.

## Ce que fait déjà le serveur (rien à changer côté Prestige)

- Chaque requête de l'API (`/api/...`), routes mobiles comprises, passe par le filtre qui lit l'en-tête `X-Poste`.
- À la création d'une vente, ce nom est gardé comme **poste de saisie** ; à la clôture, comme **poste
  d'encaissement** (avec l'adresse IP).
- Le même nom figure dans le fichier journal (connexions, actions).
- Valeur acceptée :
  - texte **encodé en URL** (UTF-8), décodé par le serveur ;
  - lettres (accents compris), chiffres, espace, point, tiret, souligné ; les autres caractères sont retirés ;
  - **60 caractères** au plus (coupé au-delà).
- Sans `X-Poste`, le serveur reprend le nom réseau (ou l'adresse IP), comme aujourd'hui.

Le navigateur fait déjà de même : le nom saisi une fois sur le poste part avec chaque requête.

## À faire dans l'application

1. **Nom par défaut** : marque et modèle de l'appareil (par exemple « SUNMI V2s »), lus par exemple avec le paquet
   `device_info_plus` (`AndroidDeviceInfo.manufacturer` + `model`) s'il n'est pas déjà dans l'application.
2. **Nom modifiable** dans les réglages de l'application (« Nom de cet appareil », par exemple « Caisse mobile 1 »),
   gardé sur le téléphone. C'est ce nom qui distingue deux terminaux du même modèle : à proposer à la première
   connexion si aucun nom n'est saisi.
3. **Envoyer l'en-tête sur toutes les requêtes** vers Prestige : un intercepteur Dio qui ajoute
   `X-Poste: Uri.encodeComponent(nom)`. Appliquer côté application les mêmes règles que le serveur (caractères
   permis, 60 au plus) pour que l'utilisateur voie le nom tel qu'il sera enregistré.
4. Ne rien changer d'autre : ni les routes, ni le corps des requêtes, ni la connexion.

## Vérification

1. Dans l'application, régler le nom « Caisse mobile 1 », puis faire et terminer une vente.
2. Dans Prestige, ouvrir « Ventes terminées » :
   - la vente montre « Caisse mobile 1 » dans la colonne P ;
   - « Caisse mobile 1 » figure dans la liste des postes du filtre, et ce filtre retrouve la vente.
3. Sans nom saisi, la vente montre la marque et le modèle de l'appareil.

## Sécurité

- Le nom de l'appareil n'est pas un secret : aucun jeton ni identifiant ne doit y figurer.
- Ne pas journaliser le contenu des ventes ni les demandes des patients pour cette évolution.
