# Plan avoir du 08/11 : points 9 et 10 (WhatsApp Web)

## Point 9 : comptes WhatsApp, service compagnon

### Valeurs par défaut
- **Choix : une migration idempotente**, `V7.2.100__whatsapp_web_defauts.sql`.
  - Le compte Web est créé par `V6.9.83`, qu'on ne peut plus modifier (somme de contrôle Flyway).
  - Une valeur posée seulement à l'écran ne serait pas une vraie valeur en base.
- **Comptes touchés :** seulement un compte Web jamais configuré, c'est-à-dire sans adresse, sans dossier, sans
  jeton, et jamais enregistré depuis l'écran (`updated_at` et `updated_by` vides).
- **Valeurs posées :** `http://localhost:3010` et `C:\prestige\whatsapp-web`.
- Une installation déjà configurée n'est pas touchée. Si on rejoue la migration, rien ne change.
- **Garde ajoutée au lancement :** si le dossier indiqué n'est pas celui du service compagnon (par exemple seulement
  le dossier des données, ou un dossier absent), « Reconnecter » démarre le service Windows installé, comme avant
  quand le dossier était vide.

### Configuration détaillée
- **Accès :** `GET /api/v1/whatsapp/web/configuration`, réservé à l'administrateur.
- **Bouton :** « Configuration détaillée », à côté de « Enregistrer le compte Web ».
- **Fenêtre de consultation :**
  - mode de démarrage : 1 « par service Windows », 2 « par lancement direct ». C'est la même règle que
    « Reconnecter » ;
  - état du service ;
  - adresse et port ;
  - dossier ;
  - commande de démarrage ;
  - journaux : `logpath` du service Windows, ou `journaux\demarrer.log` ;
  - état du service Windows (`sc query`) ;
  - étapes des deux modes, avec le mode utilisé mis en évidence.
- Aucun jeton n'est montré.

### Lancement sans fenêtre
- Plus de `start /min`. Java lance `cmd.exe /c demarrer.bat /auto` sans fenêtre de console. Sur le poste, le script
  voit `GetConsoleWindow = 0`.
- **Entrée :** `NUL`.
- **Sortie :** `journaux\demarrer.log` du dossier du service. Au-delà de 5 Mo, l'ancien journal est gardé sous
  `demarrer.1.log`.
- Le mode service Windows est inchangé.
- La bannière ne parle plus d'une « fenêtre réduite » : elle renvoie au journal.

## Point 10 : réponse aux avis par WhatsApp Web
- **Ce qu'on a établi dans le code :** l'ancien `envoyerTexte` passait déjà par le compte du mode par défaut, donc par
  WhatsApp Web quand c'était le compte actif. Le test l'a confirmé : le faux service a bien reçu la réponse.
- **Ce qui manquait :**
  - la réponse n'entrait pas dans le fil ;
  - **défaut confirmé :** un client qui avait demandé STOP recevait quand même la réponse (test rouge sur l'ancien
    code).
- **Correction :**
  - la réponse passe par l'envoi des discussions (`repondreAvis`, même chemin que `repondreDiscussion`) : refus STOP,
    journal des envois, entrée dans le fil avec son état et son auteur, texte non personnalisé ;
  - en cas d'échec, « Échec » reste à l'avis : le détail et la liste se mettent à jour tout de suite, et le texte
    saisi est conservé ;
  - l'e-mail est inchangé.

## Endroits où la donnée apparaît et test de rapprochement
- **Point 10 :** `src/test/e2e/retours/test-avis-whatsapp-fil.js`, résultat 29/29. Le test compare, pour chaque cas :
  - l'avis en base : réponse, canal, état ;
  - l'écran de l'avis : message, détail, ligne de la liste ;
  - le fil en base : texte, état, identifiant WhatsApp, auteur ;
  - le journal des envois : mode, état, identifiant ;
  - l'écran des discussions : texte de la bulle, état ;
  - le faux service : numéro, texte.
- **Point 9 :** `src/test/e2e/retours/test-whatsapp-web-configuration.js`, résultat 18/18. Le test compare :
  - les champs de l'écran avec la base ;
  - la fenêtre avec l'API, la base et `sc query` ;
  - il vérifie aussi qu'aucun jeton n'apparaît dans la page ni dans les réponses du serveur.

## Règles et tests de cohérence (unitaires)
- `LancementServiceWhatsAppTest` : commande sans `start` ni `/min`, journal, entrée `NUL`, rotation du journal, choix
  du service Windows. Rouge sur l'ancien code (3 échecs), vert ensuite.
- `WhatsAppWebDefautsTest` : valeurs identiques à `config.exemple.json` et au service Windows, gardes de la migration.
- `ConfigurationWhatsAppWebTest` : modes 1 et 2, hors Windows, dossier inconnu, `sc query`, `logpath`, aucun jeton.
- `WhatsAppWebConfigurationTest` : port et libellés d'état.

## Traces attendues (bilan)
- **Point 10, par cas :**
  - WhatsApp Web ou API : une trace d'envoi et un message dans le fil ;
  - échec : une trace « ECHEC » et un message « échec » ;
  - e-mail, refus de recontact, STOP : aucune trace et aucun message.
- **Point 9 :**
  - la migration écrit seulement dans un compte vierge ;
  - les tests remettent les comptes à l'identique (contrôle en fin de test).

## Cas couverts
- **Point 10 :** WhatsApp Web, API WhatsApp (simulée), e-mail, client qui refuse d'être recontacté, échec d'envoi,
  client STOP. Les avis ont des notes et des statuts différents ; un numéro est saisi avec des espaces.
- **Migration :** nouvelle installation, migration rejouée, adresse saisie, jeton seul, compte déjà enregistré,
  dossier seul, compte API.

## Non-régression (domain1, `laborex_v1_db`, un test à la fois)
- **Tests verts :**
  - `test-whatsapp-discussions.js` : 15/15 ;
  - `test-whatsapp-web-reconnexion.js` : 12/12 ;
  - `test-whatsapp-session-alerte.js` : 12/12 ;
  - `test-whatsapp-web.js` : 16/16 ;
  - tests unitaires WhatsApp et avis : verts.
- **`test-avis-clients.js` : 8/10, à cause du poste.**
  - Il n'y a pas d'écoute sur le port public 8090 dans domain1 : le test s'arrête avant la partie réponse.
  - Les droits des avis sont sur 2 rôles dans cette copie de base.
  - Ces deux causes existaient avant ce travail. La réponse aux avis est couverte par le nouveau test.
  - Ce test met désormais les comptes WhatsApp en mode test pendant l'essai : le compte Web du poste envoie pour de
    vrai, et sa réponse partait sinon réellement.
- **Après les tests :** `test-whatsapp-web.js` laisse dans le compte le dossier de son service d'essai (comportement
  antérieur). La valeur du poste a été remise.
