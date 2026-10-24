# Service compagnon WhatsApp Web de Prestige

Envoi des messages WhatsApp **par WhatsApp Web** (numéro de l'officine connecté par QR code, comme ubisenderpro),
avec des règles anti-bannissement. Prestige ne parle qu'à ce service ; il ne voit jamais la session WhatsApp.

Moteur : **Baileys** (`@whiskeysockets/baileys` **6.7.24**, version figée), repris du service WhatsApp Web du CRM
UBIPHARM. Pas de navigateur : le protocole de WhatsApp Web est parlé directement (plus léger et plus stable que
l'ancien moteur whatsapp-web.js, qui embarquait Chromium). Ce que le moteur reprend du CRM :

- cache des clés de chiffrement et **réponse aux demandes de renvoi** (les 300 derniers messages envoyés sont gardés
  sur disque) : moins de « En attente de ce message » chez le destinataire, même après un redémarrage ;
- **adresses masquées `@lid`** : la correspondance avec le numéro est apprise et gardée, la réponse d'un client n'est
  pas perdue ;
- **santé de la réception** : si les réponses arrivent illisibles (chiffrement désynchronisé après une longue
  coupure), l'état passe à `DEGRADE` et Prestige en est averti ;
- reconnexion automatique, avec des tentatives qui s'espacent quand le réseau est coupé (2 s, 4 s… jusqu'à 1 min) ;
- **arrêt propre** qui ferme sans délier l'appareil : aucun QR à rescanner après un redémarrage.

La session est gardée dans `DOSSIER/session-baileys` : pas de nouveau scan au redémarrage. En passant de l'ancien
moteur à Baileys, **un seul nouveau scan du QR** est nécessaire (les deux moteurs n'ont pas le même format de
session). Retour à l'ancien moteur possible : `"MOTEUR": "wwebjs"` dans `config.json` et
`npm install whatsapp-web.js@1.34.7`.

## Installation (poste serveur de l'officine)

1. Node 18 ou plus récent (aucun navigateur n'est nécessaire).
2. `npm install --omit=dev --omit=optional` dans ce dossier.
3. Créer `config.json` à côté de `package.json` (jamais dans Git, déjà ignoré) :
   ```json
   { "PORT": 3010, "JETON": "<au moins 16 caractères, le même que dans Prestige>",
     "PRESTIGE_WEBHOOK": "http://localhost:8080/prestige/api/v1/whatsapp/webhook-web",
     "DOSSIER": "C:/prestige/whatsapp-web" }
   ```
4. Dans Prestige, menu **Paramétrage WhatsApp** › onglet *Comptes* : compte de type **WEB**, adresse
   `http://127.0.0.1:3010`, jeton = `JETON`. Puis onglet *WhatsApp Web : connexion et règles* : scanner le QR code
   avec le téléphone (WhatsApp › Appareils connectés › Connecter un appareil).

Notice pas à pas, avec les écrans de Prestige : `docs/notices/NOTICE_WHATSAPP_WEB.md`.

## Lancer et arrêter (Windows)

- **Dans une fenêtre** : double-cliquer `demarrer.bat`. Il vérifie Node, crée `config.json` depuis
  `config.exemple.json` s'il manque et refuse un jeton laissé à sa valeur d'exemple. Il installe ou met à jour les
  dépendances si la version de Baileys ne correspond pas. Si le service tourne déjà, il propose de l'arrêter
  proprement et de le relancer.
- **Arrêt** : `arreter.bat` ou Ctrl+C dans la fenêtre. Les deux font un arrêt propre : file et clés écrites, téléphone
  **non** délié. Si le port reste tenu par un processus résiduel, `arreter.bat` vérifie que c'est bien `node.exe`
  avant de proposer de le terminer.
- **En service Windows** (démarrage avec le poste, redémarrage en cas d'arrêt anormal) : WinSW 2.12, comme le CRM.
  Voir `service-windows/LISEZMOI.txt` ; scripts `installer-service.bat`, `arreter-service.bat`,
  `desinstaller-service.bat`. La configuration et la session restent dans `C:\prestige\whatsapp-web` (variable
  `WHATSAPP_CONFIG`), qu'une mise à jour du service ne remplace pas.
- **Ne jamais** arrêter le service par « Fin de tâche » ni `taskkill /F` : les clés de chiffrement peuvent rester à
  demi écrites, et les messages deviennent illisibles ensuite.

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

`GET /etat` (état, numéro, santé de la réception, moteur, file), `GET /qr` (image data-URL), `POST /deconnecter`
(délie l'appareil : changement de téléphone), `POST /arret` (arrêt propre, appareil **non** délié), `GET /sante`
(`{"ok":true}`, seule route sans jeton, sans aucune information), `GET|PUT /regles`, `POST /messages`
(corps `{"id", "to", "text"}` : identifiant Prestige du message, numéro du destinataire, texte ; réponse `200` avec
l'identifiant mis en file, ou `422 {"erreur"}` si le message est refusé : doublon du jour, numéro invalide…).
Toutes les routes sauf `/sante` demandent l'en-tête `Authorization: Bearer <JETON>`. Les statuts (envoyé, distribué,
lu, échec), les messages entrants et les changements de santé de la réception sont renvoyés à `PRESTIGE_WEBHOOK`.

## Tests

`npm test` : règles, file, outils et connecteur Baileys (avec une fausse bibliothèque qui rejoue les événements de
WhatsApp : QR, connexion, réponses `@lid`, réponses illisibles, accusés, coupure, appareil délié), sans réseau ni
téléphone. Essai de Prestige sans téléphone : `WHATSAPP_FAUX=1 JETON=... node src/serveur.js`.
