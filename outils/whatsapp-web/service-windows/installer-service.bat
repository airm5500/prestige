@echo off
REM ---------------------------------------------------------------------------
REM  Installe le compagnon WhatsApp Web de Prestige comme SERVICE WINDOWS
REM  (demarrage automatique avec le poste, redemarrage en cas d'arret anormal).
REM  A lancer en tant qu'administrateur. Prealable : voir LISEZMOI.txt.
REM ---------------------------------------------------------------------------
setlocal
cd /d "%~dp0"
net session >nul 2>&1
if errorlevel 1 goto PAS_ADMIN
if not exist "prestige-whatsapp.exe" goto PAS_WINSW
where node >nul 2>&1
if errorlevel 1 goto PAS_DE_NODE
REM  le service lance %ProgramFiles%\nodejs\node.exe (prestige-whatsapp.xml) : il doit exister
if not exist "%ProgramFiles%\nodejs\node.exe" goto NODE_AILLEURS
if not exist "C:\prestige\whatsapp-web\config.json" goto PAS_CONFIG
set "WHATSAPP_CONFIG=C:\prestige\whatsapp-web\config.json"
for /f "delims=" %%r in ('node ..\src\lire-config.js VALIDE') do set "VALIDE=%%r"
if not "%VALIDE%"=="OK" goto CONFIG_INVALIDE
if not exist "..\node_modules\@whiskeysockets\baileys" (
  echo  Installation des dependances...
  pushd ..
  call npm install --omit=dev --omit=optional
  popd
)
prestige-whatsapp.exe install
if errorlevel 1 goto ECHEC
prestige-whatsapp.exe start
echo.
echo  ** Service "Prestige - WhatsApp" installe et demarre. **
echo  Il redemarrera seul avec Windows. Journaux : C:\prestige\whatsapp-web\journaux
goto FIN

:PAS_ADMIN
echo  ERREUR : lancez ce script en tant qu'administrateur (clic droit > Executer en tant qu'administrateur).
goto FIN
:PAS_WINSW
echo  ERREUR : prestige-whatsapp.exe absent de ce dossier. Voir LISEZMOI.txt (WinSW 2.12, renomme).
goto FIN
:NODE_AILLEURS
echo  ERREUR : Node.js n'est pas dans "%ProgramFiles%\nodejs". Indiquez le chemin de node.exe dans
echo  prestige-whatsapp.xml (balise executable), puis relancez.
goto FIN
:PAS_DE_NODE
echo  ERREUR : Node.js est introuvable. Installez Node.js 18 ou plus : https://nodejs.org
goto FIN
:PAS_CONFIG
echo  ERREUR : C:\prestige\whatsapp-web\config.json absent.
echo  Copiez-y ..\config.exemple.json, renseignez JETON, puis relancez.
goto FIN
:CONFIG_INVALIDE
echo  ERREUR dans C:\prestige\whatsapp-web\config.json : %VALIDE%
goto FIN
:ECHEC
echo  ERREUR : l'installation du service a echoue (service deja installe ?).
goto FIN
:FIN
echo.
pause
endlocal
