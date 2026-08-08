# Prestige

Application web Java (Maven, packaging WAR) : `org.dici:prestige`.

## Bibliothèques internes (sources dans `libs/`)

Le projet dépend de deux bibliothèques internes publiées en `0.0.1-SNAPSHOT`,
dont les jars ne sont pas disponibles dans un dépôt Maven public. Leurs sources
complètes sont versionnées dans ce dépôt pour référence :

- `libs/TOOLKITS/` — `TOOLKITS:TOOLKITS:0.0.1-SNAPSHOT` : utilitaires généraux
  (package `toolkits.*`) — gestion de fichiers (CSV, XLS, PDF, XML, ZIP),
  sécurité/cryptage, envoi de mails, dates, chaînes, logs, paramètres communs
  (`toolkits.parameters.commonparameter`, `commonKeys`).
- `libs/MULTILANGUE/` — `MULTILANGUE:MULTILANGUE:0.0.1-SNAPSHOT` :
  internationalisation (package `multilangue.*`), clés de traduction dans
  `libs/MULTILANGUE/src/multilangue/source/Bundle*.properties`
  (fr_FR et en_GB). Dépend de TOOLKITS.

Quand du code de `src/main/java` importe `toolkits.*` ou `multilangue.*`,
consulter les sources correspondantes dans `libs/` au lieu de deviner leur
comportement.

## Build

Pour compiler `prestige`, installer d'abord les deux bibliothèques dans le
dépôt Maven local (TOOLKITS avant MULTILANGUE, qui en dépend) :

```bash
mvn -f libs/TOOLKITS/pom.xml install -DskipTests
mvn -f libs/MULTILANGUE/pom.xml install -DskipTests
mvn package -DskipTests
```

Java source/target : 1.8 pour les bibliothèques `libs/`.
