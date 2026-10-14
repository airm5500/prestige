# Prestige Veille — notice

Prestige Veille est un petit programme installé **sur le serveur de la pharmacie**, à côté de Prestige.
Il surveille Prestige **depuis l'extérieur**. Il continue donc de fonctionner quand Prestige est planté : c'est
justement à ce moment-là qu'on en a besoin.

| Ce qu'il surveille (toutes les 30 secondes) | Ce qu'il mesure |
|---|---|
| Prestige du serveur | réponse, mémoire du serveur Java, pool de connexions, requêtes en cours, connexions à la base, expérience des utilisateurs |
| MariaDB | réponse, connexions ouvertes, pic de connexions |
| Postes de caisse (chacun a son Payara) | réponse de chaque poste déclaré |
| Services Windows | Payara et MariaDB démarrés ou arrêtés |
| Machine | processeur, mémoire libre, espace disque |

Il garde l'historique dans **sa propre base** (30 jours par défaut). Il ouvre un **incident** quand un élément ne répond
plus (2 échecs de suite, soit environ 1 minute) et le ferme quand il répond à nouveau. Chaque incident déclenche une
**alerte** : message sur l'écran du serveur et, si c'est activé, un e-mail.

Le tableau de bord se consulte dans un navigateur, sur le serveur ou depuis n'importe quel poste du réseau.

---

## 0. Récupérer l'installateur

L'installateur `Prestige Veille-<version>.exe` est construit par GitHub, sur une machine Windows, à chaque
modification de `outils/prestige-veille` :

1. sur GitHub, ouvrir le dépôt, onglet **Actions**, puis le workflow **« Prestige Veille - installateur Windows »** ;
2. ouvrir la dernière exécution en vert ;
3. en bas de la page, section **Artifacts**, télécharger **Prestige-Veille-installateur** (un .zip qui contient
   le .exe, gardé 30 jours).

Pour le reconstruire à la demande : même workflow, bouton **Run workflow**.

## 1. Installation (sur le serveur, une seule fois)

1. Lancer `Prestige Veille-1.0.0.exe` **en administrateur**. Java est inclus : il n'y a rien d'autre à installer.
   Le programme va dans `C:\Program Files\Prestige Veille` et ses données dans `C:\ProgramData\PrestigeVeille`.
2. Ouvrir le dossier `C:\Program Files\Prestige Veille\app`, faire un clic droit sur **`installer-service.bat`**, puis
   choisir **Exécuter en tant qu'administrateur**. Ce script :
   - crée la tâche planifiée « Prestige Veille ». Elle démarre avec Windows, avant toute ouverture de session, sous
     le compte SYSTEM, et elle est relancée chaque minute si elle s'arrête ;
   - protège le dossier de données : seuls SYSTEM et les administrateurs y ont accès ;
   - ouvre le port **8099** dans le pare-feu, pour le réseau privé ou de domaine uniquement (jamais un réseau public) ;
   - démarre la veille.
3. Ouvrir **http://127.0.0.1:8099** sur le serveur, ou **http://ADRESSE-DU-SERVEUR:8099** depuis un poste. Le
   raccourci « Prestige Veille » du menu Démarrer ouvre aussi le tableau de bord.
4. Se connecter avec **admin / admin**. La veille **impose de changer ce mot de passe** (8 caractères au moins)
   avant d'afficher quoi que ce soit.

> Pourquoi le compte SYSTEM ? Il faut ce compte pour redémarrer le service Payara et pour afficher les alertes sur
> l'écran du serveur. Il n'a pas d'autre usage.

**Mise à jour** : relancer le nouvel `.exe`. La tâche planifiée et les données sont gardées.

**Désinstallation** : d'abord `retirer-service.bat` en administrateur, puis la désinstallation par Windows. Les
données restent dans `C:\ProgramData\PrestigeVeille` ; ce dossier peut être supprimé à la main.

---

## 2. Réglages (onglet Réglages)

| Réglage | Quoi mettre |
|---|---|
| **Jeton de veille** | Dans Prestige : *Centre de support > Stabilité du serveur > Réglages conseillés > **Jeton Prestige Veille***. Cliquer, confirmer dans le bouton, puis copier le jeton affiché et le coller ici. Sans jeton, la veille sait seulement si Prestige répond, sans les détails (mémoire, pool, base). |
| Adresse de Prestige | `http://127.0.0.1:8080/prestige` (Prestige du serveur) |
| **Postes de caisse** | Une ligne par poste : `CAISSE-1=http://192.168.1.21:8080/prestige`. Utiliser l'**adresse IP fixe** du poste, pas son nom. |
| Base MariaDB | `jdbc:mariadb://127.0.0.1:3306/NOM_DE_LA_BASE`, avec l'utilisateur et le mot de passe MariaDB |
| Services Windows | Nom du service Payara (souvent `domain1`) et du service MariaDB (souvent `MariaDB`) |
| asadmin | Chemin de `asadmin.bat` (ex. `C:/payara5/bin/asadmin.bat`), utilisé pour vider le pool |
| Seuils | Échecs avant incident (2), mémoire Java (90 %), disque libre (2 048 Mo) |
| Alertes | Écran du serveur (activé), e-mail (désactivé : renseigner le serveur SMTP pour l'activer) |
| Redémarrage automatique | **Désactivé par défaut** (voir § 4) |

Les mots de passe et le jeton ne sont **jamais réaffichés**. Le champ montre « déjà renseigné ». Le laisser vide garde
la valeur en place.

---

## 3. Le tableau de bord

- **Vue d'ensemble** : une tuile par élément, verte (OK), orange (attention) ou rouge (en panne), avec ses dernières
  valeurs. Le bandeau rouge liste les incidents en cours, et la pastille de l'en-tête résume l'état général. En
  dessous, la disponibilité sur 24 heures.
- **Courbes** : choisir un élément et une période, de 1 heure à 30 jours. Le survol d'une courbe affiche l'heure et
  la valeur. Les bandes rouges marquent les moments où l'élément ne répondait pas.
- **Expérience utilisateur** : ce que vivent les caissières, c'est-à-dire le temps d'ouverture des écrans, le temps
  des appels au serveur et les erreurs. Le détail par écran et par poste est dans Prestige > Stabilité du serveur >
  Expérience utilisateur.
- **Incidents** : début, fin, durée, élément et message. Pratique pour répondre à la question « depuis quand ça
  plante ? ».
- **Actions** : la confirmation se fait dans le bouton lui-même (deux clics, aucune fenêtre).
  - *Vider le pool de connexions* : Prestige répond mais les données ne s'affichent plus. Sans risque pour les ventes.
  - *Redémarrer le service Payara* : de 1 à 3 minutes, pendant lesquelles les caisses perdent leur écran.
  - *Envoyer une alerte d'essai*.
- **Journal** : qui s'est connecté, qui a changé un réglage, quelles alertes et quelles actions, avec leur résultat.

Les pages se rafraîchissent seules toutes les 30 secondes. Le bouton **Sonder** relance toutes les mesures tout de
suite.

---

## 4. Redémarrage automatique (désactivé par défaut)

Quand il est activé (Réglages > Actions), la veille redémarre seule le service Payara uniquement si **toutes** ces
conditions sont réunies :

- Prestige ne répond plus depuis le délai choisi (5 minutes par défaut) ;
- **MariaDB, elle, répond**. Si la base est arrêtée, redémarrer Payara ne servirait à rien : la veille alerte sans
  redémarrer ;
- la limite n'est pas atteinte : 2 redémarrages automatiques par heure au plus, pour ne pas boucler.

Chaque redémarrage est noté dans le journal et déclenche une alerte.

---

## 5. Sécurité et données

- La veille ne lit **aucune vente, aucun client, aucun patient**. Elle reçoit seulement des mesures techniques
  (mémoire, temps, nombres de connexions).
- Le lien avec Prestige se fait par le **jeton**, que Prestige génère au hasard et n'affiche qu'une fois. Pour le
  changer, il suffit d'en générer un nouveau dans Prestige : l'ancien cesse aussitôt de fonctionner.
- Le mot de passe par défaut doit être changé avant tout accès. Les sessions sont protégées contre les requêtes
  forgées (CSRF).
- Port 8099 : réseau local uniquement. **Ne jamais l'ouvrir sur Internet** (pas de redirection de port sur la box).

---

## 6. En cas de souci

| Ce qu'on voit | Que faire |
|---|---|
| Tuile Prestige « Jeton de veille non renseigné » | Générer le jeton dans Prestige et le coller dans Réglages (§ 2) |
| Tuile Prestige « Jeton de veille refusé » | Le jeton a été régénéré dans Prestige : coller le nouveau |
| Tuile MariaDB « Identifiant ou mot de passe MariaDB refusé » | Corriger l'utilisateur ou le mot de passe dans Réglages > MariaDB |
| Tuile MariaDB « MariaDB injoignable » | Service MariaDB arrêté (voir la tuile Services) ou mauvaise adresse |
| Poste « Injoignable » | Poste éteint, Payara du poste arrêté, ou mauvaise adresse IP dans Réglages |
| Vidage du pool « en échec » | Vérifier le chemin d'asadmin et le nom du pool dans Réglages |
| Le tableau de bord ne s'ouvre pas | Sur le serveur, ouvrir le Planificateur de tâches et vérifier que « Prestige Veille » est « En cours », sinon relancer `installer-service.bat` |

## 7. Pour l'équipe technique

- Construction du jar : `outils/prestige-veille/construire.sh` (JDK 21, Maven).
- Construction de l'installateur : sous Windows, `outils\prestige-veille\installateur\construire-windows.bat`
  (JDK 21 avec jpackage, WiX 3.14, Maven).
- Test de bout en bout : `outils/prestige-veille/e2e/test-veille.js`, avec la veille lancée sur le port 8099 et
  Prestige sur le port 8080.
- Variables : `VEILLE_PORT` (8099), `VEILLE_ADRESSE` (0.0.0.0), `VEILLE_DONNEES` (dossier de la base).
