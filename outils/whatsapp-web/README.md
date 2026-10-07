# Service compagnon WhatsApp Web de Prestige

Envoi des messages WhatsApp **par WhatsApp Web** (numéro de l'officine connecté par QR code, comme ubisenderpro),
avec des règles anti-bannissement. Prestige ne parle qu'à ce service ; il ne voit jamais la session WhatsApp.

Bibliothèque : [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) 1.34.7 (la plus utilisée et la plus
suivie des bibliothèques Node pour WhatsApp Web), session gardée sur le disque (`LocalAuth`) : pas de nouveau scan
après un redémarrage.

## Installation (poste serveur de l'officine)

1. Node 18 ou plus récent ; Chrome / Chromium installé (sinon `npm install` télécharge le Chromium de Puppeteer).
2. `npm install --omit=dev` dans ce dossier.
3. Créer `config.json` à côté de `package.json` (jamais dans Git, déjà ignoré) :
   ```json
   { "PORT": 3010, "JETON": "<au moins 16 caractères, le même que dans Prestige>",
     "PRESTIGE_WEBHOOK": "http://localhost:8080/prestige/api/v1/whatsapp/webhook-web",
     "DOSSIER": "C:/prestige/whatsapp-web" }
   ```
4. Dans Prestige, menu **Paramétrage WhatsApp** › onglet *Comptes* : compte de type **WEB**, adresse
   `http://127.0.0.1:3010`, jeton = `JETON`. Puis onglet *WhatsApp Web : connexion et règles* : scanner le QR code
   avec le téléphone (WhatsApp › Appareils connectés › Connecter un appareil).

## Lancer en service Windows

- avec **NSSM** : `nssm install PrestigeWhatsApp "C:\Program Files\nodejs\node.exe" "C:\prestige\whatsapp-web\src\serveur.js"`,
  répertoire de démarrage = ce dossier, puis `nssm start PrestigeWhatsApp` ;
- ou avec **pm2** : `pm2 start src/serveur.js --name prestige-whatsapp && pm2 save` (+ `pm2-installer` pour Windows).

Le service n'écoute que sur `127.0.0.1` : il n'est pas joignable depuis le réseau.

## Règles anti-bannissement (réglables dans Prestige)

| Règle | Défaut |
|---|---|
| Délai aléatoire entre deux messages | 20 à 60 s (jamais un intervalle fixe) |
| Longue pause | 5 à 12 min toutes les 15 messages |
| Plafonds | 40 / heure, 150 / jour |
| Montée en charge d'un numéro récent | 20 le premier jour, +20 par jour jusqu'au plafond |
| Heures d'envoi | 8 h à 20 h (hors heures, le message attend l'ouverture) |
| « En train d'écrire » simulé | proportionnel à la longueur du texte (1,5 à 8 s) |
| Variation des textes | `{Bonjour|Bonsoir}` tiré au hasard à chaque envoi |
| Numéro vérifié avant envoi | un numéro sans WhatsApp est refusé, pas tenté |
| Doublon du jour | même numéro + même texte le même jour refusé |
| Pause de protection | 30 min après 3 échecs consécutifs |
| Mots d'arrêt | STOP, ARRÊT, DÉSABONNER… : le numéro n'est plus jamais servi |

Conseils : utiliser un numéro ancien et actif, ne pas écrire à des personnes qui n'ont jamais donné leur numéro,
garder des textes utiles et personnalisés. Pour les envois de masse ou marketing, préférer l'API officielle
(onglet *Modèles*).

## Sécurité et données

- Toutes les routes exigent `Authorization: Bearer <JETON>` (comparaison à temps constant).
- Le jeton n'est jamais renvoyé au navigateur ni écrit dans les journaux ; le texte des messages n'est jamais journalisé.
- `DOSSIER/session` contient la session WhatsApp : à protéger comme un mot de passe. `POST /deconnecter` la supprime.
- `DOSSIER/file.json` garde la file d'envoi **avec le texte des messages** sur le poste, 7 jours au plus, pour les
  accusés de réception et le contrôle des doublons.

## Routes

`GET /etat`, `GET /qr` (image data-URL), `POST /deconnecter`, `GET|PUT /regles`, `POST /messages`
(`{numero, texte, reference}`). Les statuts (envoyé, distribué, lu, échec) et les messages entrants sont renvoyés à
`PRESTIGE_WEBHOOK`.

## Tests

`npm test` (règles et file, sans réseau). Essai sans téléphone : `WHATSAPP_FAUX=1 JETON=... node src/serveur.js`.
