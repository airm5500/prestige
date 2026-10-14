# Prestige Veille : tache planifiee « Prestige Veille » (au demarrage de Windows, compte SYSTEM, relancee chaque minute
# si elle s'arrete), dossier de donnees protege et regle du pare-feu pour consulter la veille depuis le reseau local.
# Le compte SYSTEM est necessaire pour redemarrer le service Payara et pour afficher les alertes (msg *).
# -Retirer : supprime la tache et la regle du pare-feu ; les donnees (C:\ProgramData\PrestigeVeille) sont gardees.
param([switch]$Retirer)
$ErrorActionPreference = 'Stop'
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { throw 'A lancer en tant qu administrateur (clic droit > Executer en tant qu administrateur).' }
$tache = 'Prestige Veille'
$regle = 'Prestige Veille (8099)'

if ($Retirer) {
  if (Get-ScheduledTask -TaskName $tache -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $tache -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $tache -Confirm:$false
  }
  netsh advfirewall firewall delete rule name="$regle" | Out-Null
  Write-Host 'Demarrage automatique retire. Les donnees restent dans C:\ProgramData\PrestigeVeille.'
  exit 0
}

$app = Split-Path -Parent $MyInvocation.MyCommand.Path          # ...\Prestige Veille\app
$exe = Join-Path (Split-Path -Parent $app) 'Prestige Veille.exe'
if (-not (Test-Path $exe)) { throw "Programme introuvable : $exe" }

# donnees : SYSTEM et administrateurs seulement (mots de passe et historique)
$donnees = 'C:\ProgramData\PrestigeVeille'
New-Item -ItemType Directory -Force $donnees | Out-Null
icacls $donnees /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' | Out-Null

$action = New-ScheduledTaskAction -Execute $exe -Argument '--service' -WorkingDirectory $app
$declencheur = New-ScheduledTaskTrigger -AtStartup
$compte = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$reglages = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $tache -Action $action -Trigger $declencheur -Principal $compte -Settings $reglages `
  -Description 'Surveillance de Prestige (tableau de bord : http://127.0.0.1:8099)' -Force | Out-Null

# consultation depuis les postes du reseau local (profils prive et domaine seulement, jamais public)
netsh advfirewall firewall delete rule name="$regle" | Out-Null
netsh advfirewall firewall add rule name="$regle" dir=in action=allow protocol=TCP localport=8099 profile=private,domain | Out-Null

Start-ScheduledTask -TaskName $tache
Write-Host 'Prestige Veille demarre et redemarrera avec Windows.'
Write-Host 'Tableau de bord : http://127.0.0.1:8099 (sur ce serveur) ou http://<adresse du serveur>:8099 depuis un poste.'
Write-Host 'Premiere connexion : admin / admin, puis changement du mot de passe obligatoire.'
