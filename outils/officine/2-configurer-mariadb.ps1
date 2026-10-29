<#
  REGLAGES MARIADB DU SERVEUR DE L'OFFICINE (rapport docs/notices/RAPPORT_CHARGE_2026-10-29.md, par. 5.3 et 6).

  1. my.ini, section [mysqld] :
     - journal binaire (log_bin, binlog_format=ROW, expire_logs_days=8, server_id) : seule mesure qui tient
       l'objectif "une heure de perte au plus", avec la copie horaire (4-copier-journal.ps1) ;
     - innodb_buffer_pool_size (6 Go par defaut, pour un serveur dedie de 16 Go).
     Une copie datee de my.ini est faite avant toute modification ; une cle deja presente est remplacee, jamais
     dupliquee.
  2. -CreerCompte : compte MariaDB dedie aux sauvegardes, avec les seuls droits utiles. Son mot de passe est tire au
     hasard et range dans un fichier d'options lisible par SYSTEM et les administrateurs seulement. Il n'est jamais
     affiche. Le mot de passe root est demande par MariaDB lui-meme (saisie masquee) et n'est garde nulle part.

  Le journal binaire et la memoire ne s'appliquent qu'au redemarrage de MariaDB : -Redemarrer le fait (toutes les
  caisses sont coupees quelques secondes : a faire hors des heures d'ouverture).

  Exemples :
    .\2-configurer-mariadb.ps1 -Lire
    .\2-configurer-mariadb.ps1 -DossierJournal 'E:\mariadb-journal' -Redemarrer
    .\2-configurer-mariadb.ps1 -CreerCompte
#>
param(
    [string]$Ini = 'D:\Program Files\MariaDB 10.6\data\my.ini',
    [string]$Service = 'MariaDB',
    [string]$Client = 'D:\Program Files\MariaDB 10.6\bin\mariadb.exe',
    [int]$Port = 3306,
    # de preference sur un autre disque que les donnees ; par defaut a cote des donnees
    [string]$DossierJournal = '',
    [int]$JoursJournal = 8,
    [string]$Memoire = '6G',
    [switch]$SansMemoire,
    [switch]$CreerCompte,
    [string]$Compte = 'prestige_sauvegarde',
    [string]$FichierOptions = 'C:\ProgramData\Prestige\sauvegarde.cnf',
    [switch]$Lire,
    [switch]$Redemarrer
)
$ErrorActionPreference = 'Stop'

# remplace ou ajoute "cle=valeur" dans la section [mysqld] ; renvoie les nouvelles lignes
function Regler([string[]]$lignes, [string]$cle, [string]$valeur) {
    $res = New-Object System.Collections.Generic.List[string]
    $section = ''
    $fait = $false
    $motif = '^\s*#?\s*' + ($cle -replace '_', '[-_]') + '\s*(=|$)'
    foreach ($l in $lignes) {
        if ($l -match '^\s*\[(.+)\]') {
            if ($section -eq 'mysqld' -and -not $fait) { $res.Add("$cle=$valeur"); $fait = $true }
            $section = $Matches[1].Trim()
        } elseif ($section -eq 'mysqld' -and $l -match $motif -and $l -notmatch '^\s*#') {
            if (-not $fait) { $res.Add("$cle=$valeur"); $fait = $true }
            continue
        }
        $res.Add($l)
    }
    if (-not $fait) {
        if ($section -ne 'mysqld' -and -not ($lignes | Where-Object { $_ -match '^\s*\[mysqld\]' })) { $res.Add('[mysqld]') }
        $res.Add("$cle=$valeur")
    }
    return ,$res.ToArray()
}

function Lecture([string[]]$lignes) {
    $lignes | Select-String -Pattern '^\s*\[|log[-_]bin|binlog|expire_logs|server[-_]id|innodb_buffer_pool_size' | ForEach-Object { Write-Host "  $_" }
}

if (-not (Test-Path $Ini)) { throw "my.ini introuvable : $Ini" }
$avant = Get-Content -Path $Ini
Write-Host "=== $Ini, avant"
Lecture $avant
if ($Lire) { return }

$datadir = ($avant | Where-Object { $_ -match '^\s*datadir\s*=' } | Select-Object -First 1) -replace '^\s*datadir\s*=\s*', ''
if (-not $DossierJournal) { $DossierJournal = (Join-Path (Split-Path ($datadir -replace '/', '\') -Parent) 'journal-binaire') }
New-Item -ItemType Directory -Force -Path $DossierJournal | Out-Null
$base = ((Join-Path $DossierJournal 'prestige-bin') -replace '\\', '/')

$apres = $avant
$apres = Regler $apres 'server_id' '1'
$apres = Regler $apres 'log_bin' $base
$apres = Regler $apres 'binlog_format' 'ROW'
$apres = Regler $apres 'expire_logs_days' "$JoursJournal"
# chaque vente terminee est ecrite dans le journal avant d'etre confirmee
$apres = Regler $apres 'sync_binlog' '1'
if (-not $SansMemoire) { $apres = Regler $apres 'innodb_buffer_pool_size' $Memoire }

if (Compare-Object $avant $apres) {
    $copie = "$Ini.avant-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item -Path $Ini -Destination $copie
    # my.ini est lu par MariaDB : ASCII, sans marque d'ordre des octets
    [System.IO.File]::WriteAllLines($Ini, $apres, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "=== Apres (copie de l'ancien : $copie)"
    Lecture $apres
} else {
    Write-Host "=== Deja regle, my.ini inchange"
}

if ($CreerCompte) {
    # mot de passe : 24 caracteres tires par le generateur cryptographique, jamais affiches
    $octets = New-Object byte[] 18
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($octets)
    $mdp = [Convert]::ToBase64String($octets) -replace '[+/=]', 'x'
    $sql = @"
CREATE USER IF NOT EXISTS '$Compte'@'localhost' IDENTIFIED BY '$mdp';
ALTER USER '$Compte'@'localhost' IDENTIFIED BY '$mdp';
GRANT SELECT, SHOW VIEW, TRIGGER, EVENT, LOCK TABLES, RELOAD, REPLICATION CLIENT, BINLOG MONITOR ON *.* TO '$Compte'@'localhost';
"@
    # les ordres passent par l'entree du client, jamais par un fichier : rien ne reste sur le disque si on interrompt
    Write-Host "Mot de passe root de MariaDB (saisie masquee) :"
    $sql | & $Client "--port=$Port" --host=localhost -u root -p
    $sql = $null
    if ($LASTEXITCODE -ne 0) { throw "creation du compte $Compte refusee par MariaDB" }
    New-Item -ItemType Directory -Force -Path (Split-Path $FichierOptions -Parent) | Out-Null
    [System.IO.File]::WriteAllText($FichierOptions, "[client]`r`nuser=$Compte`r`npassword=$mdp`r`nport=$Port`r`nhost=localhost`r`n")
    $mdp = $null
    # lisible par SYSTEM (taches planifiees) et les administrateurs seulement
    icacls $FichierOptions /inheritance:r /grant:r '*S-1-5-18:F' '*S-1-5-32-544:F' | Out-Null
    Write-Host "Compte $Compte cree ; options dans $FichierOptions (acces : SYSTEM, administrateurs)"
}

if ($Redemarrer) {
    Write-Host "=== Redemarrage du service $Service"
    Restart-Service -Name $Service
    $s = Get-Service -Name $Service
    Write-Host "  $($s.Name) : $($s.Status)"
} else {
    Write-Host "Redemarrer MariaDB pour appliquer, hors des heures d'ouverture : Restart-Service $Service"
}
