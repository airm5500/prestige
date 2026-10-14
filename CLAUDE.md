# Prestige : règles de travail

## Échanges
- Répondre en français.
- Ne pas attendre une validation, sauf s'il y a une vraie question. Sans réponse au bout de 5 min, mettre le point en
  fin de file et passer à un point qui ne demande pas d'avis.

## Git
- Travailler sur la branche `claude/new-session-xm8ptu`. Commit et push après chaque étape.
- Ne jamais pousser sur `dev`, ne jamais fusionner.
- Aucun identifiant de modèle dans le code ni dans les commits.

## Code
- Aucune régression, sous aucune forme.
- Aucune fenêtre surgissante pour une modification : la confirmation se fait dans le bouton lui-même.
- Plus de nouvelles JSP : on ne supprime pas les anciennes, mais tout nouveau travail passe par les API REST.
- Ne jamais écrire « mediciel » : le remplacer partout où il apparaît.
- Tout nouveau menu est déclaré dans `correctifs-affichage.js`.

## Sécurité
- Aucun secret dans le JavaScript, dans Git, dans les statuts ou dans les journaux.
- Les jetons WhatsApp restent côté serveur.
- Ne jamais journaliser le texte des messages ni les demandes des patients.
- **Ne jamais écrire dans une base de production.**
  - La copie de travail `laborex_v1_db` du poste local peut être modifiée par les tests (voir
    `outils/poste-local/LISEZMOI.md`).
  - Sauvegarder cette copie avant chaque série de tests.
- Ne pas ouvrir `D:\CONF\LABOREX\CONF` : la configuration contient des mots de passe.
- Ne pas lire les colonnes nominatives (clients, ayants droit, ordonnances) sans accord.
- Aucune recherche de clé par force brute.

## Tests
- Reproduire d'abord un défaut par un test qui échoue.
- Les tests passent par le vrai chemin de l'écran et retirent leurs données.
- L'ergonomie se teste aussi.
- Lancer les tests d'écran un par un, jamais deux en même temps : sinon, faux échecs et mesures faussées.
- Construction :
  - build : `mvn -o -q -DskipTests package` (JDK 11) ;
  - déploiement : `asadmin redeploy --name prestige --contextroot prestige target/prestige.war` ;
  - Prestige répond sur `http://localhost:8080/prestige`.

## Suivi
- Lenteurs et mesures : `docs/notices/RAPPORT_LENTEUR_CONNEXION.md`.
- Banc peuplé (3 ans de données générées) : `outils/banc/peupler_banc.py`.
