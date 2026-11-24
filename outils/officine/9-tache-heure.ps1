<#
  TACHE DE MISE A L'HEURE (cahier des charges du 24/11, point 1).

  Le bouton « Mettre a jour » de la fenetre de blocage de Prestige doit remettre l'heure du serveur sans droits
  d'administrateur. Ce script, lance UNE FOIS en administrateur :
   - cree (ou remplace) la tache Windows "Prestige - Heure", executee par SYSTEM, sans declencheur : elle demarre le
     service de temps, puis lance w32tm /resync /force ;
   - permet aux utilisateurs authentifies de la LANCER seulement (lecture et execution : ni modification ni
     suppression) : Prestige la declenche par "schtasks /run /tn "Prestige - Heure"" ;
   - leve les limites de correction du service de temps (MaxPosPhaseCorrection / MaxNegPhaseCorrection) : sinon
     Windows refuse de corriger une horloge partie en 2189 (pile de la carte mere).
  Une copie des deux valeurs d'origine est affichee avant modification ; -Annuler les remet.

  Exemples :
    .\9-tache-heure.ps1 -Lire       (affiche l'etat, ne change rien)
    .\9-tache-heure.ps1
    .\9-tache-heure.ps1 -Retirer    (supprime la tache)
    .\9-tache-heure.ps1 -Annuler -MaxPos 54000 -MaxNeg 54000   (remet les limites relevees avant)
#>
param(
    [switch]$Lire,
    [switch]$Retirer,
    [switch]$Annuler,
    [uint32]$MaxPos = 54000,
    [uint32]$MaxNeg = 54000
)
$ErrorActionPreference = 'Stop'
$TACHE = 'Prestige - Heure'
$CONFIG = 'HKLM:\SYSTEM\CurrentControlSet\Services\W32Time\Config'

function Etat {
    $t = Get-ScheduledTask -TaskName $TACHE -ErrorAction SilentlyContinue
    Write-Host ("tache `"$TACHE`" : " + $(if ($t) { "presente ($($t.State))" } else { 'absente' }))
    $c = Get-ItemProperty -Path $CONFIG -ErrorAction SilentlyContinue
    if ($c) { Write-Host "limites de correction : MaxPosPhaseCorrection=$($c.MaxPosPhaseCorrection) MaxNegPhaseCorrection=$($c.MaxNegPhaseCorrection)" }
    $s = Get-Service w32time -ErrorAction SilentlyContinue
    Write-Host ("service de temps : " + $(if ($s) { "$($s.Status), demarrage $($s.StartType)" } else { 'absent' }))
}

Etat
if ($Lire) { return }

if ($Annuler) {
    Set-ItemProperty -Path $CONFIG -Name MaxPosPhaseCorrection -Value $MaxPos -Type DWord
    Set-ItemProperty -Path $CONFIG -Name MaxNegPhaseCorrection -Value $MaxNeg -Type DWord
    Write-Host "limites remises : $MaxPos / $MaxNeg"
    Etat
    return
}

if (Get-ScheduledTask -TaskName $TACHE -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TACHE -Confirm:$false
    Write-Host "retiree : $TACHE"
}
if ($Retirer) { return }

# service de temps : demarrage automatique, sinon w32tm /resync echoue apres un redemarrage
Set-Service w32time -StartupType Automatic
# 0xFFFFFFFF : aucune limite de correction (une horloge en 2189 doit pouvoir revenir)
Set-ItemProperty -Path $CONFIG -Name MaxPosPhaseCorrection -Value 0xFFFFFFFF -Type DWord
Set-ItemProperty -Path $CONFIG -Name MaxNegPhaseCorrection -Value 0xFFFFFFFF -Type DWord

$systeme = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$reglages = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 2) -MultipleInstances IgnoreNew
$action = New-ScheduledTaskAction -Execute 'cmd.exe' `
    -Argument '/c net start w32time & w32tm /config /update & w32tm /resync /force'
Register-ScheduledTask -TaskName $TACHE -Principal $systeme -Settings $reglages -Action $action | Out-Null

# Utilisateurs authentifies (AU) : lecture et execution de cette tache seulement
$service = New-Object -ComObject 'Schedule.Service'
$service.Connect()
$tache = $service.GetFolder('\').GetTask($TACHE)
$sd = $tache.GetSecurityDescriptor(0xF)
if ($sd -notmatch '\(A;;GRGX;;;AU\)') {
    # l'entree va dans la DACL (D:...), avant une eventuelle SACL (S:...)
    $i = $sd.IndexOf('S:')
    $nouveau = if ($i -ge 0) { $sd.Insert($i, '(A;;GRGX;;;AU)') } else { $sd + '(A;;GRGX;;;AU)' }
    $tache.SetSecurityDescriptor($nouveau, 0)
}
Write-Host "creee : $TACHE (SYSTEM ; lancement permis aux utilisateurs authentifies)"
Etat
