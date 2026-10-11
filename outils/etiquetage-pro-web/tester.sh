#!/bin/sh
# Etiquettage Pro (version web) : tests du serveur puis test de bout en bout dans Chromium.
# Base de TEST uniquement (bd_etiquette_test, utilisateur etiquettage_test) : jamais une base de production.
set -e
ici=$(cd "$(dirname "$0")" && pwd)
cd "$ici/backend"
mvn -B test
export ETIQUETTAGE_BASE=externe ETIQUETTAGE_NAVIGATEUR=false ETIQUETTAGE_PORT=${ETIQUETTAGE_PORT:-8095}
export ETIQUETTAGE_DB_URL="jdbc:mariadb://127.0.0.1:3306/bd_etiquette_test?createDatabaseIfNotExist=true"
export ETIQUETTAGE_DB_USER=${DB_USER:-etiquettage_test} ETIQUETTAGE_DB_PASSWORD=${DB_PASSWORD:-etiquettage_test}
if curl -s -m 2 "http://127.0.0.1:$ETIQUETTAGE_PORT/api/etat" >/dev/null 2>&1; then
  echo "Une instance d'Etiquettage Pro tourne deja sur le port $ETIQUETTAGE_PORT : arretez-la avant les tests." >&2
  exit 1
fi
java -jar target/etiquettage-pro.jar > target/e2e-serveur.log 2>&1 &
serveur=$!
trap 'kill $serveur 2>/dev/null' EXIT
for i in $(seq 1 60); do curl -s "http://127.0.0.1:$ETIQUETTAGE_PORT/api/etat" >/dev/null 2>&1 && break; sleep 1; done
cd "$ici/e2e"
ETIQUETTAGE_URL="http://127.0.0.1:$ETIQUETTAGE_PORT" node test-etiquettage-web.js
