#!/bin/sh
# Prestige Veille : construit l'application Spring Boot (un seul jar, interface comprise). JAVA_HOME : JDK 21.
#   Lancement d'essai : java -jar backend/target/prestige-veille.jar  puis http://127.0.0.1:8099 (admin / admin)
set -e
ici=$(cd "$(dirname "$0")" && pwd)
cd "$ici/backend"
mvn -B package
echo "Jar : $ici/backend/target/prestige-veille.jar"
