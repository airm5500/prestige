@echo off
REM ---------------------------------------------------------------------------
REM  Arret PROPRE du service compagnon WhatsApp Web de Prestige (lance par demarrer.bat).
REM  Le service ecrit sa file et ses caches puis ferme la connexion SANS delier le
REM  telephone : aucun QR a rescanner. C'est l'equivalent exact de Ctrl+C.
REM  Si le service est installe comme service Windows : service-windows\arreter-service.bat
REM ---------------------------------------------------------------------------
setlocal
cd /d "%~dp0"
title Arret du service WhatsApp Web - Prestige

echo ============================================================
echo   Arret du service WhatsApp Web - Prestige
echo ============================================================
echo.

if not exist "config.json" goto PAS_CONFIG
for /f "delims=" %%p in ('node src\lire-config.js PORT') do set "PORT=%%p"
for /f "delims=" %%j in ('node src\lire-config.js JETON') do set "JETON=%%j"
echo  Service vise : http://127.0.0.1:%PORT%
echo.

powershell -NoProfile -Command "try{Invoke-RestMethod -Uri 'http://127.0.0.1:%PORT%/sante' -TimeoutSec 5 | Out-Null;exit 0}catch{exit 1}"
if errorlevel 1 goto NE_REPOND_PAS

echo  Demande d'arret propre en cours...
powershell -NoProfile -Command "try{Invoke-RestMethod -Uri 'http://127.0.0.1:%PORT%/arret' -Method Post -Headers @{'Authorization'='Bearer %JETON%'} -TimeoutSec 10 | Out-Null;exit 0}catch{$c=$_.Exception.Response.StatusCode.value__;if($c -eq 404){exit 3};if($c -eq 401){exit 2};exit 1}"
if errorlevel 3 goto ANCIENNE_INSTANCE
if errorlevel 2 goto MAUVAIS_JETON
if errorlevel 1 goto ECHEC

powershell -NoProfile -Command "Start-Sleep -Seconds 4"
call :PORT_OCCUPE
if defined PIDPORT goto ENCORE_OCCUPE
echo.
echo  ** Service arrete proprement. ** Le telephone reste connecte (aucun QR a rescanner).
goto FIN

:NE_REPOND_PAS
call :PORT_OCCUPE
if defined PIDPORT goto ENCORE_OCCUPE
echo  Le service ne repond pas et le port %PORT% est libre : il est deja arrete.
goto FIN

:ENCORE_OCCUPE
echo.
echo  ATTENTION : le port %PORT% est encore occupe par le processus %PIDPORT%.
tasklist /fi "PID eq %PIDPORT%" 2>nul | findstr /i "node.exe" >nul
if errorlevel 1 goto PAS_NODE
echo  Il s'agit d'un processus node.exe (instance residuelle).
choice /c ON /n /m " Le terminer maintenant ? (O = oui / N = non) "
if errorlevel 2 goto REFUS_KILL
taskkill /PID %PIDPORT% /F >nul 2>&1
powershell -NoProfile -Command "Start-Sleep -Seconds 2"
call :PORT_OCCUPE
if defined PIDPORT goto KILL_ECHEC
echo  ** Processus residuel termine, port %PORT% libere. ** Vous pouvez relancer demarrer.bat.
goto FIN

:REFUS_KILL
echo  Processus laisse en place : le redemarrage echouera tant que le port %PORT% sera occupe.
goto FIN

:KILL_ECHEC
echo  Le port reste occupe. Fermez la fenetre du service, ou redemarrez le poste.
goto FIN

:PAS_NODE
echo  Ce processus n'est PAS node.exe : une autre application utilise le port %PORT%.
echo  Ne la terminez pas a l'aveugle : changez PORT dans config.json (et dans Prestige).
goto FIN

:ANCIENNE_INSTANCE
echo.
echo  L'instance en cours est ANCIENNE (avant la mise a jour) : appuyez sur Ctrl+C dans sa fenetre.
call :PORT_OCCUPE
if defined PIDPORT goto ENCORE_OCCUPE
goto FIN

:MAUVAIS_JETON
echo.
echo  ERREUR : jeton refuse par le service (401). Verifiez JETON dans config.json.
goto FIN

:PAS_CONFIG
echo  ERREUR : config.json introuvable dans ce dossier (%CD%).
goto FIN

:ECHEC
echo.
echo  ERREUR : la demande d'arret a echoue. Repli : Ctrl+C dans la fenetre du service.
goto FIN

:PORT_OCCUPE
set "PIDPORT="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /c:":%PORT% " ^| findstr /i "LISTENING"') do set "PIDPORT=%%p"
goto :eof

:FIN
echo.
pause
endlocal
