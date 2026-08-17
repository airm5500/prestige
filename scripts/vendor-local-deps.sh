#!/usr/bin/env bash
# ---------------------------------------------------------------------------
#  Alimente le depot Maven interne au projet (mvn-repo/) a partir du depot
#  local ~/.m2/repository.
#
#  Pourquoi : trois artefacts ne sont servis par aucun depot public joignable.
#    - TOOLKITS:TOOLKITS:0.0.1-SNAPSHOT       (bibliotheque interne)
#    - MULTILANGUE:MULTILANGUE:0.0.1-SNAPSHOT (bibliotheque interne)
#    - com.lowagie:itext:2.1.7.js9            (depot Pentaho, souvent filtre)
#  Une fois copies dans mvn-repo/ et commites, le build passe partout (poste
#  neuf, integration continue, session distante) avec Maven Central comme seul
#  depot distant necessaire.
#
#  Usage : a lancer UNE FOIS, sur un poste ou "mvn clean package -DskipTests"
#          fonctionne deja :
#
#              ./scripts/vendor-local-deps.sh
#
#          puis commiter le contenu de mvn-repo/.
#
#  Sous Windows, utiliser vendor-local-deps.bat : Git Bash expose les chemins
#  sous la forme /d/prestige, que la JVM ne sait pas resoudre en URL file://.
# ---------------------------------------------------------------------------
set -u

ROOT=$(cd "$(dirname "$0")/.." && pwd)
M2_REPO=${M2_REPO:-$HOME/.m2/repository}
DEST="file://$ROOT/mvn-repo"

echo "Depot local source : $M2_REPO"
echo "Depot cible        : $DEST"
echo

failed=()

vendor() {
    local group=$1 artifact=$2 version=$3 jar=$4

    if [ ! -f "$jar" ]; then
        echo "[ABSENT] $group:$artifact:$version  ->  $jar"
        failed+=("$group:$artifact:$version")
        return
    fi

    echo "[OK]     $group:$artifact:$version"

    # Purge de la version avant redeploiement : sans cela, chaque relance ajoute
    # un jar horodate supplementaire (semantique SNAPSHOT) et le depot grossit.
    rm -rf "$ROOT/mvn-repo/${group//.//}/$artifact/$version"

    if ! mvn -q -B deploy:deploy-file \
        -Dfile="$jar" \
        -DgroupId="$group" -DartifactId="$artifact" -Dversion="$version" -Dpackaging=jar \
        -Durl="$DEST" -DrepositoryId=project-local; then
        failed+=("$group:$artifact:$version")
    fi
}

vendor TOOLKITS TOOLKITS 0.0.1-SNAPSHOT \
    "$M2_REPO/TOOLKITS/TOOLKITS/0.0.1-SNAPSHOT/TOOLKITS-0.0.1-SNAPSHOT.jar"
vendor MULTILANGUE MULTILANGUE 0.0.1-SNAPSHOT \
    "$M2_REPO/MULTILANGUE/MULTILANGUE/0.0.1-SNAPSHOT/MULTILANGUE-0.0.1-SNAPSHOT.jar"
vendor com.lowagie itext 2.1.7.js9 \
    "$M2_REPO/com/lowagie/itext/2.1.7.js9/itext-2.1.7.js9.jar"

echo
if [ ${#failed[@]} -gt 0 ]; then
    echo "ECHEC pour : ${failed[*]}"
    echo "Ces artefacts sont absents de votre depot local. Lancez d'abord"
    echo "\"mvn clean package -DskipTests\" pour les y installer, puis relancez."
    exit 1
fi

echo "Termine. Verifiez puis commitez le contenu de mvn-repo/ :"
echo "    git add mvn-repo"
echo "    git commit -m \"Depot Maven interne : TOOLKITS, MULTILANGUE, itext js9\""
