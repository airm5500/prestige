#!/bin/sh
# Etiquettage Pro (version web) : construit l'interface Angular puis l'application Spring Boot (un seul jar).
#   NODE : dossier de Node 20+ (defaut : celui du PATH) ; JAVA_HOME : JDK 21.
set -e
ici=$(cd "$(dirname "$0")" && pwd)
[ -n "$NODE" ] && PATH="$NODE:$PATH"
cd "$ici/frontend"
npm ci --no-audit --no-fund
npx ng build
cd "$ici/backend"
mvn -B -DskipTests package
echo "Jar : $ici/backend/target/etiquettage-pro.jar"
