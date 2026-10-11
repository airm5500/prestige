@echo off
rem Etiquettage Pro (version web) : installateur Windows. Voir construire-windows.ps1 (prerequis : JDK 21, WiX 3.14, Node, Maven).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0construire-windows.ps1"
if errorlevel 1 pause
