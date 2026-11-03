#!/bin/bash
# Serie complete des tests d'ecran contre domain2 (http://localhost:9080/prestige, base laborex_perf sur le port 3307),
# avec le dossier e2e de l'integration. Claude ne joue pas de serie en meme temps.
#
# usage : bash lancer-serie-domaine2.sh fichier-resultats [liste]
#   liste : par defaut serie-2026-11-03.txt (a cote de ce script), jouee dans l ordre (serie seule, Claude ne joue pas en meme temps)
#
# Aucun mot de passe dans ce fichier : l'utilisateur et le mot de passe du pool sont lus dans domain.xml de domain2 au
# lancement, ecrits dans un fichier d'options temporaire, supprime a la fin.
set -u
ICI="$(cd "$(dirname "$0")" && pwd)"
SORTIE="$1"
LISTE="${2:-$ICI/serie-2026-11-03.txt}"
E2E=/d/projet/p3/prestige-integration/src/test/e2e
X=/d/payara5/payara5/glassfish/domains/domain2/config/domain.xml

export NODE_PATH=D:/outils-e2e/node_modules PLAYWRIGHT_BROWSERS_PATH=D:/pw-browsers
export PATH="/c/Program Files/nodejs:/d/Program Files/MariaDB 10.6/bin:$PATH"

CNF="$(mktemp -d)/e2e-d2.cnf"
trap 'rm -f "$CNF"' EXIT
pw=$(grep -A12 'name="laborex_pool"' $X | grep -o 'name="[Pp]assword" value="[^"]*"' | head -1 | sed 's/.*value="//;s/"$//')
us=$(grep -A12 'name="laborex_pool"' $X | grep -o 'name="[Uu]ser" value="[^"]*"' | head -1 | sed 's/.*value="//;s/"$//')
printf "[client]\nuser=%s\npassword=%s\nhost=127.0.0.1\nport=3307\n" "$us" "$pw" > "$CNF"

export MARIADB_OPTIONS="$CNF" E2E_CAPTURES=0 DB_TEST=laborex_perf E2E_BASE_LIBRE=1 \
  E2E_URL=http://localhost:9080/prestige PAYARA_DOMAINE=D:/payara5/payara5/glassfish/domains/domain2

# Les tests « identique au pixel » (cas 1 et 2 du 03/11) comparent leurs captures avec une tolerance d'arrondi de
# couleur ; sans dossier de captures, ils comparent des empreintes exactes et echouent a tort. Ils recoivent donc un
# dossier de captures, les autres tests n'en ont pas (pas de videos).
PIXEL="$ICI/captures-pixel"

: > "$SORTIE"
for t in $(tr -d '\r' < "$LISTE" ); do
  echo "=== $t" >> "$SORTIE"
  case "$t" in
    prix-reference/test-grille-identique-parametre-0.js|ligne-comptant/test-parametre-0-identique.js)
      mkdir -p "$PIXEL"; CAPT="$PIXEL" ;;
    *) CAPT=0 ;;
  esac
  (cd "$E2E" && E2E_CAPTURES="$CAPT" timeout 1200 node "$t" >> "$SORTIE" 2>&1); echo "--- code $?" >> "$SORTIE"
done
echo "Termine : $(grep -c '^--- code 0' "$SORTIE") reussis sur $(grep -c '^=== ' "$SORTIE")" >> "$SORTIE"
