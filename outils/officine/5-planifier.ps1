<#
  TACHES PLANIFIEES DES SAUVEGARDES (rapport docs/notices/RAPPORT_CHARGE_2026-10-29.md, par. 5.3).

  Cree (ou remplace) deux taches Windows, executees par SYSTEM, meme sans session ouverte :
   - "Prestige - sauvegarde complete" aux heures -Heures (par defaut 12:30 et 21:30 : midi et soir) ;
   - "Prestige - copie du journal" toutes les heures.
  Les taches qui lancent encore SAUVEGARDE_COMPRESSION.bat sont seulement listees : les desactiver a la main une fois
  la nouvelle sauvegarde verifiee (Disable-ScheduledTask), pour ne pas sauvegarder deux fois.
  A lancer en administrateur. -Retirer supprime les deux taches.

  Exemples :
    .\5-planifier.ps1 -Bases laborex_v1_db -Destination 'D:\SAUVEGARDE_JOURNALIERE' -CopieVers 'E:\Sauvegardes'
    .\5-planifier.ps1 -Heures '13:00','22:00'
    .\5-planifier.ps1 -Retirer
#>
param(
    [string[]]$Bases = @('laborex_v1_db'),
    [string]$Destination = 'D:\SAUVEGARDE_JOURNALIERE',
    [string]$CopieVers = '',
    [string[]]$Heures = @('12:30', '21:30'),
    [string]$Dossier = $PSScriptRoot,
    [switch]$Retirer
)
$ErrorActionPreference = 'Stop'
$COMPLETE = 'Prestige - sauvegarde complete'
$JOURNAL = 'Prestige - copie du journal'

foreach ($t in @($COMPLETE, $JOURNAL)) {
    if (Get-ScheduledTask -TaskName $t -ErrorAction SilentlyContinue) { Unregister-ScheduledTask -TaskName $t -Confirm:$false; Write-Host "retiree : $t" }
}
if ($Retirer) { return }

$systeme = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$reglages = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Hours 3) -MultipleInstances IgnoreNew
function Action([string]$script, [string]$arguments) {
    New-ScheduledTaskAction -Execute 'powershell.exe' `
        -Argument "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$(Join-Path $Dossier $script)`" $arguments"
}
$copie = if ($CopieVers) { " -CopieVers `"$CopieVers`"" } else { '' }

# powershell -File recoit "a,b" comme un seul texte : 3-sauvegarde-complete.ps1 le redecoupe
$bases = $Bases -join ','
$declencheurs = $Heures | ForEach-Object { New-ScheduledTaskTrigger -Daily -At $_ }
Register-ScheduledTask -TaskName $COMPLETE -Principal $systeme -Settings $reglages -Trigger $declencheurs `
    -Action (Action '3-sauvegarde-complete.ps1' "-Bases $bases -Destination `"$Destination`"$copie") | Out-Null
Write-Host "creee : $COMPLETE, chaque jour a $($Heures -join ' et ')"

$copieJournal = if ($CopieVers) { " -CopieVers `"$(Join-Path $CopieVers 'journal-binaire')`"" } else { '' }
$chaqueHeure = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(5) -RepetitionInterval (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName $JOURNAL -Principal $systeme -Settings $reglages -Trigger $chaqueHeure `
    -Action (Action '4-copier-journal.ps1' "-Destination `"$(Join-Path $Destination 'journal-binaire')`"$copieJournal") | Out-Null
Write-Host "creee : $JOURNAL, toutes les heures (a la 5e minute)"

$anciennes = Get-ScheduledTask | Where-Object { $_.Actions | Where-Object { "$($_.Execute) $($_.Arguments)" -match 'SAUVEGARDE_COMPRESSION' } }
foreach ($a in $anciennes) { Write-Warning "ancienne sauvegarde encore planifiee : $($a.TaskPath)$($a.TaskName) ($($a.State))" }
