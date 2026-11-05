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
- **Obligatoire pour toute nouvelle fonctionnalité et toute modification** : un travail n'est pas fini sans ses tests
  de rapprochement et de cohérence. Le but : aucun défaut ne doit arriver en production.
  - Test de rapprochement (e2e) : une donnée visible à plusieurs endroits (écran, ticket, PDF, export, base) est
    comparée partout, ligne par ligne. Exemple : `prix-reference/test-rapprochement-ticket.js`.
  - Test de cohérence (unitaire) : un calcul (montant, taux, répartition, plafond, arrondi, stock, date) est vérifié
    par ses règles (part = base × taux, somme = total, jamais négatif), sur des milliers de cas tirés au hasard avec
    une graine fixe. Exemple : `CreditLigneCoherenceTest`.
  - Jeux d'essai variés, jamais un seul cas : valeurs différentes d'une ligne à l'autre, quantité supérieure à 1, zéro,
    plafond atteint, plusieurs organismes, annulation, paramètre à 0 et à 1.
  - Chaque nouveau test doit d'abord échouer sur l'ancien code (ou sur le défaut remis à l'essai), puis passer.
  - Toute donnée écrite en base doit avoir un lecteur et un test qui la relit ; une donnée écrite et jamais relue est
    un défaut.
- Avant de dire « fini », le compte rendu liste : les endroits où la donnée apparaît, et le test de rapprochement qui
  les compare ; les règles de calcul, et le test de cohérence qui les vérifie ; les cas variés couverts.
- Construction :
  - build : `mvn -o -q -DskipTests package` (JDK 11) ;
  - déploiement : `asadmin redeploy --name prestige --contextroot prestige target/prestige.war` ;
  - Prestige répond sur `http://localhost:8080/prestige`.

## Suivi
- Lenteurs et mesures : `docs/notices/RAPPORT_LENTEUR_CONNEXION.md`.
- Banc peuplé (3 ans de données générées) : `outils/banc/peupler_banc.py`.
