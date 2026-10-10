# Application mobile `prestige_vente_app` — écran « Pointage présence »

Cahier destiné à la session qui travaille sur le dépôt de l'application mobile (Flutter).
Côté Prestige (serveur), **tout est déjà en place et testé** : il ne reste qu'à écrire l'écran dans l'application.

---

## 1. Ce qu'on veut

Un employé de la pharmacie pointe **son arrivée et son départ** depuis son téléphone :

1. il se connecte une fois avec ses identifiants Prestige (le téléphone est enregistré) ;
2. à la pharmacie, il **scanne le QR code affiché à l'écran de Prestige** (il change chaque minute) ;
3. le téléphone envoie aussi **sa position GPS** ;
4. Prestige vérifie le QR code et la distance à la pharmacie, puis enregistre « Entrée » ou « Sortie ».

Les pointages apparaissent dans Prestige, menu RH, onglet « Présence du jour », avec ceux de la pointeuse
(empreinte / badge) et les saisies manuelles.

> À ne pas confondre avec le « Pointage BL Stock » déjà présent dans l'application (contrôle des quantités d'un BL) :
> il reste tel quel.

---

## 2. API à utiliser (déjà en service)

Base : `https://<serveur>/prestige/api/v1/mobile/`

Tous les appels sauf `connexion` exigent l'en-tête :

```
Authorization: Bearer <jeton>
```

Sans jeton valable, la réponse est **HTTP 401** :
`{"success": false, "expire": true, "message": "Session du téléphone expirée : reconnectez-vous."}`
→ l'application revient à l'écran de connexion.

Toutes les réponses sont en JSON. En cas de refus : `{"success": false, "message": "<texte à afficher tel quel>"}`.

### 2.1 Connexion — `POST connexion`

Corps :
```json
{ "login": "…", "motDePasse": "…", "appareil": "<identifiant stable du téléphone>", "nomAppareil": "Samsung A14 de Awa" }
```
- `appareil` : identifiant **stable** de l'installation (UUID généré au premier lancement et conservé). Il sert à
  reconnaître le téléphone ; l'officine peut le retirer depuis Prestige.
- Réponse :
```json
{
  "success": true,
  "jeton": "…", "expiration": "2026-10-10T22:15:00Z",
  "utilisateur": { "id": "…", "login": "…", "nom": "…" },
  "employe": { "id": "…", "matricule": "…", "nom": "…" },
  "droits": { "pointage": true, "photos": false },
  "pointage": { "qr": true, "gps": false }
}
```
- `employe` vaut `null` si le compte n'est rattaché à aucun employé : **ne pas proposer le pointage**.
- `droits.pointage` faux : le pointage est désactivé par l'officine → ne pas afficher l'écran.
- `pointage.qr` / `pointage.gps` : ce que l'officine exige (voir 2.3). Durée du jeton : 12 h par défaut
  (paramètre `KEY_MOBILE_JETON_HEURES`).

### 2.2 Qui suis-je — `GET moi`

Même contenu que la connexion, sans le jeton. À appeler à l'ouverture de l'écran : les réglages (`qr`, `gps`) et les
droits peuvent avoir changé depuis la connexion.

### 2.3 Pointer — `POST pointages`

Corps :
```json
{ "code": "<contenu du QR scanné>", "latitude": 5.3364, "longitude": -4.0267, "precision": 12, "sens": "ENTREE" }
```
- `code` : le texte **brut** du QR code (il commence par `PRESTIGE-POINTAGE:` ; l'envoyer tel quel). Obligatoire si
  `pointage.qr` est vrai. Le code change **toutes les 60 secondes** : scanner puis envoyer aussitôt.
- `latitude`, `longitude` (degrés décimaux) et `precision` (mètres) : obligatoires si `pointage.gps` est vrai,
  recommandés sinon (ils sont conservés avec le pointage).
- `sens` : `ENTREE` ou `SORTIE`. **Facultatif** : s'il manque, Prestige prend l'inverse du dernier pointage des
  16 dernières heures. Recommandé : deux gros boutons « Arrivée » et « Départ ».
- Réponse : `{"success": true, "sens": "ENTREE", "heure": "08:02", "message": "Entrée enregistrée à 08:02."}`

Refus possibles (afficher `message` tel quel) :

| Cas | Message |
|---|---|
| Pointage désactivé | Le pointage par téléphone est désactivé par l'officine. |
| Compte sans employé | Votre compte n'est rattaché à aucun employé actif : voyez le responsable RH. |
| QR absent, faux ou expiré | Code de pointage invalide ou expiré : scannez le QR code affiché à l'officine. |
| Position non paramétrée côté officine | La position de l'officine n'est pas paramétrée : voyez le responsable RH. |
| GPS exigé mais absent | Activez la localisation du téléphone pour pointer. |
| Position trop imprécise | Position trop imprécise (N m) : réessayez à l'extérieur ou près d'une fenêtre. |
| Trop loin | Vous êtes à N m de l'officine (maximum R m). |
| Double appui | Pointage déjà enregistré il y a moins de deux minutes. |

### 2.4 Mes pointages — `GET pointages`

`{"success": true, "data": [{"heure": "08:02", "sens": "ENTREE", "source": "MOBILE"}, …]}`
Pointages des 16 dernières heures (toutes sources), pour l'historique en bas de l'écran.

---

## 3. Écran à construire

1. **Connexion** (si pas de jeton valable) : identifiant, mot de passe, bouton « Se connecter ». Message d'erreur du
   serveur affiché tel quel.
2. **Pointage présence** :
   - en-tête : nom de l'employé et matricule ;
   - deux boutons : **Arrivée** (vert) et **Départ** (rouge doux) ;
   - un appui ouvre le **scanner QR** (si `qr` vrai), récupère la **position** (si `gps` vrai, ou si l'autorisation
     est déjà donnée), puis envoie `POST pointages` ;
   - résultat en grand : « Entrée enregistrée à 08:02 » (vert) ou le message de refus (rouge) ;
   - en dessous : la liste « Mes pointages » (`GET pointages`), rechargée après chaque pointage.
3. **Déconnexion** : efface le jeton du téléphone.

Ergonomie : un pointage doit se faire en **deux gestes** (bouton, scan). Pas d'écran intermédiaire de confirmation.

---

## 4. Règles de sécurité (obligatoires)

- Le **jeton** est stocké dans le stockage sécurisé du téléphone (`flutter_secure_storage` ou équivalent), jamais en
  clair, jamais dans les journaux.
- Le **mot de passe** n'est jamais conservé.
- Ne jamais journaliser le contenu du QR, la position ni les réponses complètes du serveur.
- HTTPS uniquement en production.
- Le jeton mobile est **distinct** de la session `/user/auth` déjà utilisée par l'application : ne pas les mélanger.
  Si l'application a déjà un écran de connexion, on peut enchaîner les deux connexions avec les mêmes identifiants.

---

## 5. Réglages côté Prestige (pour les essais)

Menu RH → onglet **« Pointage mobile »** : QR code qui change chaque minute (à afficher sur un écran de la pharmacie),
liste des téléphones enregistrés (retirer / réactiver).

Paramètres (Paramètres généraux) :

| Clé | Rôle | Défaut |
|---|---|---|
| `KEY_MOBILE_ACTIF` | connexion des téléphones autorisée | 1 |
| `KEY_RH_MOBILE_POINTAGE` | pointage par téléphone autorisé | 1 |
| `KEY_RH_MOBILE_QR` | QR code exigé | 1 |
| `KEY_RH_MOBILE_GPS` | position exigée | 0 |
| `KEY_RH_MOBILE_LATITUDE` / `KEY_RH_MOBILE_LONGITUDE` | position de la pharmacie | — |
| `KEY_RH_MOBILE_RAYON_M` | distance maximale (m, 20 au moins) | 150 |
| `KEY_MOBILE_JETON_HEURES` | durée du jeton (h) | 12 |

Le compte utilisé pour les essais doit être **rattaché à un employé actif** (menu RH → Employés).

---

## 6. Tests à faire (aucune régression)

Sur un serveur de test, jamais en production :

1. Connexion avec un mauvais mot de passe → message du serveur.
2. Connexion d'un compte sans employé → pas d'écran de pointage.
3. QR valable, GPS non exigé → « Entrée enregistrée » ; le pointage apparaît dans Prestige (RH → Présence du jour).
4. Deuxième appui dans les deux minutes → refus « moins de deux minutes ».
5. QR d'il y a plus de deux minutes (capture d'écran ancienne) → refus « invalide ou expiré ».
6. `KEY_RH_MOBILE_GPS = 1` : localisation refusée → message ; à plus de `RAYON` mètres → « Vous êtes à N m » ;
   sur place → accepté.
7. Téléphone retiré dans Prestige → l'appel suivant rend 401 → retour à la connexion.
8. Jeton expiré (mettre `KEY_MOBILE_JETON_HEURES = 1` et attendre) → retour à la connexion.
9. Le « Pointage BL Stock » et les autres écrans existants de l'application fonctionnent comme avant.

---

## 7. Livraison attendue

- L'écran « Pointage présence » et son entrée dans le menu de l'application.
- Les tests (unitaires pour la couche API, et un test d'intégration sur un serveur de test).
- Une courte note de version : ce qui a changé, comment l'essayer.
