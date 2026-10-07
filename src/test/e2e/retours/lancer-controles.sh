#!/bin/bash
# Controles generaux de qualite (docs/QUALITE_TESTS.md) : a relancer avant de livrer un lot.
# Usage : lancer-controles.sh [rapide]   (rapide : sans les onglets des ecrans)
cd "$(dirname "$0")" || exit 1
export NODE_PATH=${NODE_PATH:-/opt/node22/lib/node_modules}
NODE=${NODE:-/opt/node22/bin/node}
[ "$1" = "rapide" ] && export RAPIDE=1
echo "== Tests unitaires (Java)"
(cd ../../../.. && mvn -o -q test 2>&1 | grep -E "Tests run:|FAIL" | tail -3)
echo "== Tests unitaires (service WhatsApp Web)"
(cd ../../../../outils/whatsapp-web && $NODE --test test/regles.test.js test/file.test.js 2>&1 | grep -E "^# (pass|fail)")
code=0
for t in test-saisie-enregistrements test-saisie-api test-saisie-ecrans test-defilement-ecrans test-ergonomie-ecrans; do
  echo "== $t"
  timeout 5400 $NODE $t.js > "/tmp/$t.log" 2>&1 || code=1
  grep -E "^FAIL|OK$|✗" "/tmp/$t.log" | head -40
done
exit $code
