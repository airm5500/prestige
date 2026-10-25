@echo off
REM ---------------------------------------------------------------------------
REM  Demarrage du service compagnon WhatsApp Web de Prestige (sans service Windows).
REM  Double-cliquez sur ce fichier. Configuration : config.json dans ce dossier.
REM  Pour un demarrage automatique avec Windows : voir service-windows\LISEZMOI.txt
REM  demarrer.bat /auto : lance par Prestige ("Reconnecter" de la banniere) : ni pause ni question ; si le
REM  service tourne deja, il est garde.
REM ---------------------------------------------------------------------------
setlocal
cd /d "%~dp0"
set "AUTO="
if /i "%~1"=="/auto" set "AUTO=1"
title Service WhatsApp Web - Prestige

echo ============================================================
echo   Service WhatsApp Web - Prestige
echo ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 goto PAS_DE_NODE
for /f "delims=" %%v in ('node --version') do echo  Node.js detecte : %%v

if not exist "config.json" goto CREER_CONFIG
for /f "delims=" %%r in ('node src\lire-config.js VALIDE') do set "VALIDE=%%r"
if not "%VALIDE%"=="OK" goto CONFIG_INVALIDE
echo  Fichier config.json trouve.

if not exist "node_modules" goto INSTALLER
REM --- Version de Baileys conforme a package.json ? ---
node -e "var d=require('./package.json').dependencies['@whiskeysockets/baileys'];var i='';try{i=require('./node_modules/@whiskeysockets/baileys/package.json').version}catch(e){};if(d!==i){console.log(' Baileys installe : '+(i||'aucun')+'  /  attendu : '+d);process.exit(1)}"
if errorlevel 1 goto INSTALLER
echo  Dependances a jour.
goto DEMARRER

:INSTALLER
echo.
echo  Installation des dependances (premiere execution, patientez)...
echo.
call npm install --omit=dev --omit=optional
if errorlevel 1 goto ECHEC_NPM

:DEMARRER
for /f "delims=" %%p in ('node src\lire-config.js PORT') do set "PORT=%%p"
for /f "delims=" %%j in ('node src\lire-config.js JETON') do set "JETON=%%j"
powershell -NoProfile -Command "try{Invoke-RestMethod -Uri 'http://127.0.0.1:%PORT%/sante' -TimeoutSec 3 | Out-Null;exit 0}catch{exit 1}"
if not errorlevel 1 goto DEJA_LANCE

:LANCER
echo.
echo  Demarrage du service sur le port %PORT%... (laissez cette fenetre OUVERTE)
echo  Pour ARRETER : Ctrl+C dans cette fenetre, ou arreter.bat (arret propre).
echo  Ne fermez pas la fenetre d'un coup : les cles de chiffrement risquent
echo  d'etre a demi ecrites (messages illisibles ensuite).
echo.
node src\serveur.js
echo.
echo  ** Le service s'est arrete. **
goto FIN

:DEJA_LANCE
echo.
echo  ** Le service tourne DEJA sur le port %PORT%. **
if defined AUTO goto GARDER
echo  Apres une mise a jour, il faut le relancer pour qu'elle soit prise en compte.
echo.
choice /c ON /n /m " L'arreter proprement et relancer maintenant ? (O/N) "
if errorlevel 2 goto GARDER
powershell -NoProfile -Command "try{Invoke-RestMethod -Uri 'http://127.0.0.1:%PORT%/arret' -Method Post -Headers @{'Authorization'='Bearer %JETON%'} -TimeoutSec 10 | Out-Null;exit 0}catch{$c=$_.Exception.Response.StatusCode.value__;if($c -eq 404){exit 3};if($c -eq 401){exit 2};exit 1}"
if errorlevel 3 goto ANCIENNE_INSTANCE
if errorlevel 1 goto ARRET_KO
powershell -NoProfile -Command "Start-Sleep -Seconds 5"
powershell -NoProfile -Command "try{Invoke-RestMethod -Uri 'http://127.0.0.1:%PORT%/sante' -TimeoutSec 3 | Out-Null;exit 0}catch{exit 1}"
if not errorlevel 1 goto ARRET_LENT
echo  Instance precedente arretee.
goto LANCER

:GARDER
echo  Instance en cours conservee. Rien n'a ete modifie.
goto FIN

:ANCIENNE_INSTANCE
echo.
echo  L'instance en cours est ANCIENNE (avant la mise a jour) : elle ne connait pas
echo  l'arret propre. Appuyez sur Ctrl+C dans sa fenetre, ou lancez arreter.bat.
goto FIN

:ARRET_KO
echo.
echo  L'arret a echoue (jeton refuse ?). Lancez arreter.bat pour un diagnostic.
goto FIN

:ARRET_LENT
echo.
echo  L'instance precedente repond encore. Patientez puis relancez ce script.
goto FIN

:CREER_CONFIG
copy /y "config.exemple.json" "config.json" >nul
echo.
echo  Un fichier config.json vient d'etre cree a partir de config.exemple.json.
echo  Ouvrez-le et renseignez JETON (le meme que dans Prestige), puis relancez.
goto FIN

:CONFIG_INVALIDE
echo.
echo  ERREUR dans config.json : %VALIDE%
echo  Corrigez-le puis relancez ce script.
goto FIN

:PAS_DE_NODE
echo.
echo  ERREUR : Node.js est introuvable. Installez Node.js 18 ou plus : https://nodejs.org
goto FIN

:ECHEC_NPM
echo.
echo  ERREUR : l'installation des dependances a echoue (npm install).
echo  Verifiez la connexion reseau puis relancez.
goto FIN

:FIN
echo.
if not defined AUTO pause
endlocal
