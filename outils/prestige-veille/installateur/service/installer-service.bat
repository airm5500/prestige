@echo off
rem Prestige Veille : demarrage automatique avec Windows (compte SYSTEM). Clic droit > Executer en tant qu'administrateur.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer-service.ps1"
pause
