@echo off
REM  Arret propre du service Windows "Prestige - WhatsApp" (Ctrl+C transmis a Node :
REM  file et cles ecrites, telephone non delie). A lancer en tant qu'administrateur.
cd /d "%~dp0"
prestige-whatsapp.exe stop
echo.
pause
