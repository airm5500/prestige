# Avis clients

Les clients donnent leur avis en scannant le QR code affiché dans la pharmacie. La page d'avis s'ouvre sur leur
téléphone, hors de Prestige ; les avis arrivent dans le menu **AVIS CLIENTS**.

## 1. Mise en place (une fois)

1. **Port public dédié** — sur le serveur : `outils/avis-clients/configurer-port-public.sh` (port 8090 par défaut).
   Sur ce port, **seule la page d'avis répond** : écrans, API (même celles sans connexion) et pages du serveur
   rendent « introuvable ».
2. **Box / routeur** — rediriger le port public vers **ce port du serveur (8090)**, jamais vers le port de
   Prestige (8080).
3. **Réglages** — AVIS CLIENTS › *Réglages et affiche* : adresse IP publique fixe, port public, nombre d'avis
   acceptés par heure et par appareil, adresse affichée (vide = adresse et téléphone de la fiche officine).
4. **Affiche** — boutons *Affiche A4* / *Affiche A5* : nom et adresse de la pharmacie, QR code. L'imprimer et la
   poser au comptoir.

*Nouveau QR code…* crée un nouveau lien secret : les anciennes affiches cessent de fonctionner (à faire si une photo
de l'affiche circule ou en cas d'abus).

## 2. Ce que voit le client

Note de 1 à 5 étoiles (obligatoire), points appréciés / à améliorer (accueil, attente, conseils, disponibilité,
prix, propreté), ressenti libre, « problème avec un membre du personnel » (nom en saisie libre), puis **anonyme** ou
coordonnées (nom, téléphone/WhatsApp, e-mail) avec l'accord d'être recontacté.

Protections : lien secret exigé, saisies nettoyées (balises, caractères invisibles retirés, longueurs bornées),
enregistrement par requêtes paramétrées, nombre d'avis limité par appareil et par jour, robots écartés. L'adresse
de l'appareil n'est jamais conservée (seulement une empreinte pour repérer les envois en série).

## 3. Onglet Avis

- Filtres : période, note (dont « mécontents 1–2 ★ » / « satisfaits 4–5 ★ »), statut, **contient** (texte,
  employé, client, note interne), **mot clé**, thème, employé cité, « réponse attendue ». Tri par date ou par note
  (clic sur l'en-tête).
- *Imprimer* (PDF) et *Excel* reprennent exactement la liste filtrée.
- À droite, l'avis choisi (l'ouvrir le marque **Lu**) : statut Nouveau / Lu / Traité, note interne, et
  **réponse au client** par WhatsApp ou e-mail s'il l'a acceptée (modèle pré-rempli selon la note). La réponse est
  gardée avec l'avis, qui passe à *Traité*.

## 4. Onglet Analyse

Synthèse comparée à la période précédente, alertes (avis négatifs non traités, clients qui attendent une réponse,
employé cité plusieurs fois, baisse de note, thème en hausse), points forts / à améliorer, répartition des notes,
évolution, critères, thèmes reconnus dans les textes, mots clés (taille = fréquence, couleur = note moyenne) et
**récapitulatif par employé cité** : les écritures d'un même nom sont regroupées (« Mme Awa », « awah »), avec le
compte utilisateur correspondant quand il est unique. Chaque élément ouvre les avis concernés. *Imprimer
l'analyse* : PDF.

## 5. Droits

| Droit | Permet |
|---|---|
| `P_SM_AVIS_CLIENTS` | voir le menu, lire les avis et l'analyse |
| `P_AVIS_REPONDRE` | traiter les avis et répondre aux clients |
| `P_AVIS_REGLAGES` | réglages, nouveau QR code, affiche (le lien est secret) |

Donnés à l'administrateur seulement ; les autres rôles les reçoivent depuis la gestion des rôles.
