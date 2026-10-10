#!/bin/sh
# Essai de l'application autonome (fenetre reelle sur un ecran virtuel) : construire.sh d'abord.
# Usage : ./tester.sh [dossier des captures d'ecran]
set -e
ICI=$(cd "$(dirname "$0")" && pwd)
JAVAC=${JAVAC:-javac}
JAVA=${JAVA:-java}
rm -rf "$ICI/build/essai" && mkdir -p "$ICI/build/essai"
"$JAVAC" --release 8 -encoding UTF-8 -nowarn -cp "$ICI/dist/EtiquetagePro.jar" -d "$ICI/build/essai" $(find "$ICI/src/test/java" -name "*.java")
if [ -n "$DISPLAY" ]; then
  "$JAVA" -Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8 -cp "$ICI/dist/EtiquetagePro.jar:$ICI/build/essai" etiquetagepro.autonome.EssaiAutonome "$@"
else
  xvfb-run -a -s "-screen 0 1400x900x24" "$JAVA" -Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8 -cp "$ICI/dist/EtiquetagePro.jar:$ICI/build/essai" etiquetagepro.autonome.EssaiAutonome "$@"
fi
