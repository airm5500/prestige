#!/bin/bash
# Fils de traitement HTTP de Payara (rapport docs/notices/RAPPORT_CHARGE_2026-10-29.md, § 4.1).
#
# Par defaut, Payara ne traite que 5 requetes a la fois (http-thread-pool : 5 fils, domain.xml ne fixe rien). Des que
# 3 a 5 etats lourds tournent (suggestion, Ticket Z long, recap sur 3 mois), toutes les caisses attendent derriere eux.
# Ce script porte le pool a 32 fils (le niveau du pool de connexions a la base, max-pool-size=32), 8 au minimum.
#
# Usage :
#   PORT_ADMIN=4848 ./regler-fils.sh            # lit les valeurs, puis les regle
#   PORT_ADMIN=4848 LIRE_SEULEMENT=1 ./regler-fils.sh
#   PORT_ADMIN=4848 MAX=5 MIN=5 ./regler-fils.sh   # retour aux valeurs d'origine
# Puis redemarrer le domaine (asadmin restart-domain <domaine>) : le pool de fils est relu au demarrage.
set -eu
ASADMIN=${ASADMIN:-D:/payara5/payara5/bin/asadmin}
PORT_ADMIN=${PORT_ADMIN:-4848}
MAX=${MAX:-32}
MIN=${MIN:-8}
CLE=configs.config.server-config.thread-pools.thread-pool.http-thread-pool

echo "Avant :"
"$ASADMIN" --port "$PORT_ADMIN" get "$CLE.*" | grep -E "(max|min)-thread-pool-size"
[ "${LIRE_SEULEMENT:-0}" = "1" ] && exit 0
"$ASADMIN" --port "$PORT_ADMIN" set "$CLE.max-thread-pool-size=$MAX" "$CLE.min-thread-pool-size=$MIN"
echo "Apres :"
"$ASADMIN" --port "$PORT_ADMIN" get "$CLE.*" | grep -E "(max|min)-thread-pool-size"
echo "Redemarrer le domaine pour que le reglage s'applique."
