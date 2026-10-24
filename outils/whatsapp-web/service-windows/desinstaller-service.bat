@echo off
REM  Arrete proprement puis desinstalle le service Windows "Prestige - WhatsApp".
REM  La session WhatsApp et la configuration (C:\prestige\whatsapp-web) sont conservees.
REM  A lancer en tant qu'administrateur.
cd /d "%~dp0"
prestige-whatsapp.exe stop
prestige-whatsapp.exe uninstall
echo.
pause
