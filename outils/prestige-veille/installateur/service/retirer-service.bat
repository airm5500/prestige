@echo off
rem Prestige Veille : retire le demarrage automatique (a faire AVANT de desinstaller). Executer en tant qu'administrateur.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer-service.ps1" -Retirer
pause
