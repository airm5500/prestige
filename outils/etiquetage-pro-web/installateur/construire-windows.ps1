# Etiquettage Pro (version web) : installateur Windows (.exe) avec Java embarque.
# A lancer SOUS WINDOWS (jpackage ne fabrique un .exe que sous Windows), dans PowerShell :
#   powershell -ExecutionPolicy Bypass -File outils\etiquetage-pro-web\installateur\construire-windows.ps1
# Prerequis sur le poste de construction (pas sur les postes des pharmacies) :
#   - JDK 21 (avec jpackage) : variable JAVA_HOME ;
#   - WiX Toolset 3.14 (candle.exe, light.exe dans le PATH) : exige par jpackage pour un .exe ;
#   - Node.js 20 ou plus, Maven 3.9.
# Resultat : outils\etiquetage-pro-web\backend\target\installateur\Etiquettage Pro-<version>.exe
#   installation par utilisateur (sans droits d'administrateur), raccourcis Bureau et menu Demarrer ;
#   Java et MariaDB inclus ; les donnees restent dans %LOCALAPPDATA%\EtiquettagePro (gardees a la mise a jour).
$ErrorActionPreference = 'Stop'
$ici = Split-Path -Parent $MyInvocation.MyCommand.Path
$racine = Split-Path -Parent $ici
if (-not $env:JAVA_HOME) { throw 'JAVA_HOME doit designer un JDK 21.' }
$jpackage = Join-Path $env:JAVA_HOME 'bin\jpackage.exe'
if (-not (Test-Path $jpackage)) { throw "jpackage introuvable : $jpackage (JDK 21 requis)." }
if (-not (Get-Command candle.exe -ErrorAction SilentlyContinue)) { throw 'WiX Toolset 3.14 requis (candle.exe dans le PATH).' }

# 1. interface Angular puis application (sous Windows, les binaires MariaDB pour Linux ne sont pas inclus)
Push-Location (Join-Path $racine 'frontend')
npm ci --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw 'npm ci en echec' }
npx ng build
if ($LASTEXITCODE -ne 0) { throw 'construction de l interface en echec' }
Pop-Location
Push-Location (Join-Path $racine 'backend')
mvn -B -DskipTests package
if ($LASTEXITCODE -ne 0) { throw 'construction de l application en echec' }
[xml]$pom = Get-Content pom.xml
$version = $pom.project.version
$entree = 'target\installateur-entree'
$sortie = 'target\installateur'
Remove-Item -Recurse -Force $entree, $sortie -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $entree | Out-Null
Copy-Item 'target\etiquettage-pro.jar' $entree
$binairesLinux = & "$env:JAVA_HOME\bin\jar.exe" tf "$entree\etiquettage-pro.jar" | Select-String 'mariaDB4j-db-linux64'
if ($binairesLinux) { throw 'Le jar contient les binaires MariaDB pour Linux : construire sous Windows.' }

# 2. installateur (.exe) : Java embarque, sans console, mise a jour sur place (meme upgrade-uuid)
& $jpackage --type exe `
  --name 'Etiquettage Pro' `
  --app-version $version `
  --vendor 'Prestige' `
  --description "Catalogue et impression d'etiquettes" `
  --copyright 'Prestige' `
  --input $entree `
  --main-jar 'etiquettage-pro.jar' `
  --dest $sortie `
  --icon (Join-Path $ici 'etiquettage.ico') `
  --java-options '-Xmx768m' `
  --java-options '-Dfile.encoding=UTF-8' `
  --win-per-user-install `
  --win-dir-chooser `
  --win-menu `
  --win-menu-group 'Etiquettage Pro' `
  --win-shortcut `
  --win-shortcut-prompt `
  --win-upgrade-uuid '7c2f0b9e-5d4a-4f3e-9a61-3b8e2d1c4a77'
if ($LASTEXITCODE -ne 0) { throw 'jpackage en echec' }
Pop-Location
Get-ChildItem (Join-Path $racine "backend\$sortie") -Filter *.exe | ForEach-Object { Write-Host "Installateur : $($_.FullName)" }
