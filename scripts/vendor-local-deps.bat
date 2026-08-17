@echo off
setlocal enabledelayedexpansion
rem ---------------------------------------------------------------------------
rem  Alimente le depot Maven interne au projet (mvn-repo\) a partir du depot
rem  local %USERPROFILE%\.m2\repository.
rem
rem  Pourquoi : trois artefacts ne sont servis par aucun depot public joignable.
rem    - TOOLKITS:TOOLKITS:0.0.1-SNAPSHOT       (bibliotheque interne)
rem    - MULTILANGUE:MULTILANGUE:0.0.1-SNAPSHOT (bibliotheque interne)
rem    - com.lowagie:itext:2.1.7.js9            (depot Pentaho, souvent filtre)
rem  Une fois copies dans mvn-repo\ et commites, le build passe partout
rem  (poste neuf, integration continue, session distante) avec Maven Central
rem  comme seul depot distant necessaire.
rem
rem  Usage : a lancer UNE FOIS, depuis la racine du projet, sur un poste ou
rem          "mvn clean package -DskipTests" fonctionne deja :
rem
rem              scripts\vendor-local-deps.bat
rem
rem          puis commiter le contenu de mvn-repo\.
rem ---------------------------------------------------------------------------

set "ROOT=%~dp0.."
pushd "%ROOT%" || exit /b 1
set "ROOT=%CD%"

if "%M2_REPO%"=="" set "M2_REPO=%USERPROFILE%\.m2\repository"
set "DEST=file:///%ROOT:\=/%/mvn-repo"

echo Depot local source : %M2_REPO%
echo Depot cible        : %DEST%
echo.

set "FAILED="

call :vendor TOOLKITS TOOLKITS 0.0.1-SNAPSHOT "%M2_REPO%\TOOLKITS\TOOLKITS\0.0.1-SNAPSHOT\TOOLKITS-0.0.1-SNAPSHOT.jar"
call :vendor MULTILANGUE MULTILANGUE 0.0.1-SNAPSHOT "%M2_REPO%\MULTILANGUE\MULTILANGUE\0.0.1-SNAPSHOT\MULTILANGUE-0.0.1-SNAPSHOT.jar"
call :vendor com.lowagie itext 2.1.7.js9 "%M2_REPO%\com\lowagie\itext\2.1.7.js9\itext-2.1.7.js9.jar"

echo.
if not "%FAILED%"=="" (
    echo ECHEC pour :%FAILED%
    echo Ces artefacts sont absents de votre depot local. Lancez d'abord
    echo "mvn clean package -DskipTests" pour les y installer, puis relancez.
    popd
    exit /b 1
)

echo Termine. Verifiez puis commitez le contenu de mvn-repo\ :
echo     git add mvn-repo
echo     git commit -m "Depot Maven interne : TOOLKITS, MULTILANGUE, itext js9"
popd
exit /b 0

rem --- vendor <groupId> <artifactId> <version> <chemin-du-jar> -----------------
:vendor
if not exist "%~4" (
    echo [ABSENT] %~1:%~2:%~3  ^-^>  %~4
    set "FAILED=!FAILED! %~1:%~2:%~3"
    exit /b 0
)
echo [OK]     %~1:%~2:%~3
rem Purge de la version avant redeploiement : sans cela, chaque relance ajoute
rem un jar horodate supplementaire (semantique SNAPSHOT) et le depot grossit.
set "GPATH=%~1"
set "GPATH=!GPATH:.=\!"
if exist "%ROOT%\mvn-repo\!GPATH!\%~2\%~3" rd /s /q "%ROOT%\mvn-repo\!GPATH!\%~2\%~3"
call mvn -q -B deploy:deploy-file ^
    -Dfile="%~4" ^
    -DgroupId=%~1 -DartifactId=%~2 -Dversion=%~3 -Dpackaging=jar ^
    -Durl="%DEST%" -DrepositoryId=project-local
if errorlevel 1 set "FAILED=!FAILED! %~1:%~2:%~3"
exit /b 0
