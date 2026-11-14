<#
  PAYARA EN SERVICE WINDOWS, DEMARRE AVEC LE PC (rapport d'exploitation du 13/11, point 4).

  Constat : de 07:24 a 07:42, les premieres requetes de chaque caisse prenaient 6 a 16 s. Chaque caisse demarrait son
  Payara a l'ouverture, et le prechauffage (factory JPA 23-25 s, scripts des ecrans 12-14 s) tournait en meme temps que
  les premieres connexions. En service Windows a demarrage automatique, Payara demarre avec le PC, avant l'arrivee de
  la caissiere ; s'il s'arrete, Windows le relance (1 min apres, trois fois, compteur remis a zero chaque jour).
  La page de connexion affiche « Demarrage en cours » tant que le prechauffage n'est pas fini.

  Modes :
   -Lire      (par defaut) : etat du service, type de demarrage, relance automatique, domaine en marche. N'ecrit rien.
   -Installer : cree le service (asadmin create-service), demarrage automatique, relance en cas d'arret, puis arrete le
                domaine lance a la main et demarre le service. A lancer EN ADMINISTRATEUR, hors des heures d'ouverture.
   -Retirer   : arrete et supprime le service (le domaine se lance de nouveau a la main).
  Aucun mot de passe n'est lu ni affiche. Le script peut etre relance sans risque.

  Exemples :
    .\7-service-payara.ps1
    .\7-service-payara.ps1 -Installer
    .\7-service-payara.ps1 -Domaine domain1 -Installer
    .\7-service-payara.ps1 -Retirer
#>
param(
    [string]$Asadmin = 'D:\payara5\payara5\bin\asadmin.bat',
    [string]$Domaine = 'domain1',
    [string]$NomService = '',
    [int]$PortHttp = 8080,
    [switch]$Lire,
    [switch]$Installer,
    [switch]$Retirer
)
$ErrorActionPreference = 'Stop'
if (-not $NomService) { $NomService = $Domaine }

function Asadmin {
    # PowerShell 5 traiterait toute ligne d'erreur d'asadmin comme fatale : seul son code de sortie compte
    $ErrorActionPreference = 'Continue'
    $sortie = & $Asadmin @args 2>&1 | ForEach-Object { "$_" }
    if ($LASTEXITCODE -ne 0) { throw "asadmin $($args -join ' ') : $sortie" }
    return $sortie
}

function Administrateur {
    $moi = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
    return $moi.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function TrouverService {
    return Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.Name -eq $NomService -or $_.Name -match "^$Domaine" -or $_.DisplayName -match $Domaine } | Select-Object -First 1
}

function DomaineRepond {
    try {
        $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 -Uri "http://localhost:$PortHttp/prestige/api/v1/app/info"
        return $r.StatusCode -eq 200
    } catch {
        return $false
    }
}

function AfficherEtat {
    $s = TrouverService
    Write-Host "Domaine Payara : $Domaine (port $PortHttp)"
    if (-not $s) {
        Write-Host "  service Windows : AUCUN - Payara se lance a la main ; a installer : .\7-service-payara.ps1 -Installer (administrateur)"
    } else {
        $demarrage = (Get-CimInstance Win32_Service -Filter "Name='$($s.Name)'").StartMode
        Write-Host "  service Windows : $($s.Name) ($($s.Status)), demarrage $demarrage"
        $relance = (& sc.exe qfailure $s.Name 2>&1 | Out-String)
        $relanceOk = $relance -match 'RESTART'
        Write-Host ("  relance si arret : " + $(if ($relanceOk) { 'oui' } else { 'NON' }))
        if ($demarrage -ne 'Auto') { Write-Warning "Le service ne demarre pas avec le PC : relancer -Installer." }
    }
    Write-Host ("  application : " + $(if (DomaineRepond) { 'repond' } else { 'ne repond pas' }))
}

if ($Retirer) {
    if (-not (Administrateur)) { throw 'A lancer en administrateur.' }
    $s = TrouverService
    if (-not $s) { Write-Host "Aucun service pour $Domaine : rien a retirer."; return }
    if ($s.Status -ne 'Stopped') { Stop-Service -Name $s.Name -Force }
    & sc.exe delete $s.Name | Out-Null
    Write-Host "Service $($s.Name) retire. Lancer le domaine a la main : asadmin start-domain $Domaine"
    return
}

if ($Installer) {
    if (-not (Administrateur)) { throw 'A lancer en administrateur.' }
    $s = TrouverService
    if (-not $s) {
        Asadmin create-service --name $NomService $Domaine | Out-Null
        $s = TrouverService
        if (-not $s) { throw "Service non trouve apres create-service ($NomService)." }
        Write-Host "  service cree : $($s.Name)"
    } else {
        Write-Host "  service deja present : $($s.Name)"
    }
    Set-Service -Name $s.Name -StartupType Automatic
    # relance 1 min apres un arret, trois fois ; compteur remis a zero chaque jour (86 400 s)
    & sc.exe failure $s.Name reset= 86400 actions= restart/60000/restart/60000/restart/60000 | Out-Null
    $s.Refresh()
    if ($s.Status -ne 'Running') {
        # le domaine lance a la main occupe les ports : on l'arrete avant de demarrer le service
        try { Asadmin stop-domain $Domaine | Out-Null; Write-Host "  domaine lance a la main arrete" } catch { }
        Start-Service -Name $s.Name
        Write-Host "  service demarre"
    }
    $fin = (Get-Date).AddMinutes(4)
    while (-not (DomaineRepond) -and (Get-Date) -lt $fin) { Start-Sleep -Seconds 5 }
}

AfficherEtat
