# Prestige Veille : installateur Windows (.exe) avec Java embarque.
# A lancer SOUS WINDOWS (jpackage ne fabrique un .exe que sous Windows), dans PowerShell :
#   powershell -ExecutionPolicy Bypass -File outils\prestige-veille\installateur\construire-windows.ps1
# Prerequis sur le poste de construction (pas sur les serveurs des pharmacies) :
#   - JDK 21 (avec jpackage) : variable JAVA_HOME ;
#   - WiX Toolset 3.14 (candle.exe, light.exe dans le PATH) : exige par jpackage pour un .exe ;
#   - Maven 3.9.
# Resultat : outils\prestige-veille\backend\target\installateur\Prestige Veille-<version>.exe
#   installation pour la machine (droits d'administrateur) dans C:\Program Files\Prestige Veille, Java inclus ;
#   donnees dans C:\ProgramData\PrestigeVeille (gardees a la mise a jour et a la desinstallation) ;
#   apres l'installation : app\installer-service.bat (en administrateur) pour le demarrage automatique.
$ErrorActionPreference = 'Stop'
$ici = Split-Path -Parent $MyInvocation.MyCommand.Path
$racine = Split-Path -Parent $ici
if (-not $env:JAVA_HOME) { throw 'JAVA_HOME doit designer un JDK 21.' }
$jpackage = Join-Path $env:JAVA_HOME 'bin\jpackage.exe'
if (-not (Test-Path $jpackage)) { throw "jpackage introuvable : $jpackage (JDK 21 requis)." }
if (-not (Get-Command candle.exe -ErrorAction SilentlyContinue)) { throw 'WiX Toolset 3.14 requis (candle.exe dans le PATH).' }

# 1. application (tests compris)
Push-Location (Join-Path $racine 'backend')
mvn -B package
if ($LASTEXITCODE -ne 0) { throw 'construction de l application en echec' }
[xml]$pom = Get-Content pom.xml
$version = $pom.project.version
$entree = 'target\installateur-entree'
$sortie = 'target\installateur'
Remove-Item -Recurse -Force $entree, $sortie -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $entree | Out-Null
Copy-Item 'target\prestige-veille.jar' $entree
# scripts de demarrage automatique, installes a cote du jar (dossier app)
Copy-Item (Join-Path $ici 'service\*') $entree

# 2. installateur (.exe) : Java embarque, sans console, mise a jour sur place (meme upgrade-uuid)
& $jpackage --type exe `
  --name 'Prestige Veille' `
  --app-version $version `
  --vendor 'Prestige' `
  --description 'Surveillance de Prestige (Payara, MariaDB, postes)' `
  --copyright 'Prestige' `
  --input $entree `
  --main-jar 'prestige-veille.jar' `
  --dest $sortie `
  --icon (Join-Path $ici 'veille.ico') `
  --java-options '-Xmx256m' `
  --java-options '-Dfile.encoding=UTF-8' `
  --java-options '-DVEILLE_DONNEES=C:\ProgramData\PrestigeVeille' `
  --win-dir-chooser `
  --win-menu `
  --win-menu-group 'Prestige Veille' `
  --win-shortcut `
  --win-shortcut-prompt `
  --win-upgrade-uuid '3e8a1f42-9c6b-4d27-b5e0-71d4c2a9f863'
if ($LASTEXITCODE -ne 0) { throw 'jpackage en echec' }
Pop-Location
Get-ChildItem (Join-Path $racine "backend\$sortie") -Filter *.exe | ForEach-Object { Write-Host "Installateur : $($_.FullName)" }
