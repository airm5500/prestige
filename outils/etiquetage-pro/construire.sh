#!/bin/sh
# Etiquettage Pro autonome : construit dist/EtiquettagePro.jar (un seul fichier, Java 8 ou plus, double-clic pour lancer).
# Reprend le moteur d'Etiquettage Pro de Prestige (paquet etiquetagepro, planches et codes GS1 de rest.report.pdf) et ses
# bibliotheques (celles du WAR : lancer d'abord « mvn package » a la racine du projet, ou donner LIBS=dossier des .jar).
set -e
ICI=$(cd "$(dirname "$0")" && pwd)
RACINE=$(cd "$ICI/../.." && pwd)
LIBS=${LIBS:-$RACINE/target/prestige/WEB-INF/lib}
JAVAC=${JAVAC:-javac}
JAR=${JAR:-jar}
TRAVAIL="$ICI/build"
rm -rf "$TRAVAIL" "$ICI/dist"
mkdir -p "$TRAVAIL/classes" "$ICI/dist"

DEPENDANCES="itextpdf barcode4j avalon-framework-impl commons-lang3 commons-csv poi poi-ooxml poi-ooxml-schemas xmlbeans commons-compress commons-collections4 commons-math3 commons-codec"
CP=""
for d in $DEPENDANCES; do
  f=$(ls "$LIBS"/$d-[0-9]*.jar 2>/dev/null | head -1)
  if [ -z "$f" ]; then echo "Bibliotheque absente : $d (dans $LIBS)" >&2; exit 1; fi
  CP="$CP:$f"
done

SOURCES="$TRAVAIL/sources.txt"
ls "$RACINE"/src/main/java/etiquetagepro/*.java > "$SOURCES"
for f in LabelSheetPdf Gs1 Gs1DataMatrix; do echo "$RACINE/src/main/java/rest/report/pdf/$f.java" >> "$SOURCES"; done
find "$ICI/src/main/java" -name "*.java" >> "$SOURCES"
"$JAVAC" --release 8 -encoding UTF-8 -nowarn -d "$TRAVAIL/classes" -cp "${CP#:}" @"$SOURCES"

# un seul jar : les classes des bibliotheques a cote des notres (sans les signatures)
cd "$TRAVAIL/classes"
for f in $(echo "$CP" | tr ':' ' '); do
  unzip -qo "$f" -x 'META-INF/*.SF' 'META-INF/*.RSA' 'META-INF/*.DSA' 'META-INF/MANIFEST.MF' 'module-info.class' 'META-INF/versions/*' 2>/dev/null || true
done
printf 'Main-Class: etiquetagepro.autonome.EtiquetageProApp\nImplementation-Title: Etiquettage Pro\n' > "$TRAVAIL/manifeste.txt"
"$JAR" cfm "$ICI/dist/EtiquettagePro.jar" "$TRAVAIL/manifeste.txt" -C "$TRAVAIL/classes" .
echo "Construit : $ICI/dist/EtiquettagePro.jar ($(du -h "$ICI/dist/EtiquettagePro.jar" | cut -f1))"
