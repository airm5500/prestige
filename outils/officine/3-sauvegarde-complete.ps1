<#
  SAUVEGARDE COMPLETE (rapport docs/notices/RAPPORT_CHARGE_2026-10-29.md, par. 5.3, points 2 a 5).

  Remplace SAUVEGARDE_COMPRESSION.bat :
   - mariadb-dump --single-transaction : image figee de la base, sans verrou (les caisses ne ralentissent pas, par. 3.2) ;
   - compression a la volee (zstd s'il est installe, sinon RAR) : aucun .sql intermediaire sur le disque ;
   - position du journal binaire notee en tete du fichier (--master-data=2) : point de depart pour rejouer le journal ;
   - copie hors de la machine (-CopieVers : second disque, NAS, dossier synchronise) ;
   - rotation : toutes les sauvegardes des JoursGardes derniers jours, puis la plus recente de chacune des
     SemainesGardees dernieres semaines et des MoisGardes derniers mois ; le reste est supprime ;
   - aucun mot de passe : le compte de sauvegarde lit le sien dans FichierOptions (2-configurer-mariadb.ps1 -CreerCompte).
  Journal du script : sauvegarde.log dans Destination (noms de fichiers, tailles, durees ; jamais de donnees).
  Code de sortie 1 si une base n'a pas ete sauvegardee.

  Exemples :
    .\3-sauvegarde-complete.ps1 -Bases laborex_v1_db -Destination 'D:\SAUVEGARDE_JOURNALIERE' -CopieVers 'E:\Sauvegardes'
    .\3-sauvegarde-complete.ps1 -Rotation      # rotation seule, sans nouvelle sauvegarde
#>
param(
    [string[]]$Bases = @('laborex_v1_db'),
    [string]$Destination = 'D:\SAUVEGARDE_JOURNALIERE',
    [string]$CopieVers = '',
    [string]$FichierOptions = 'C:\ProgramData\Prestige\sauvegarde.cnf',
    [string]$BinMariaDB = 'D:\Program Files\MariaDB 10.6\bin',
    [string]$Zstd = '',
    [string]$Rar = 'C:\Program Files\WinRAR\Rar.exe',
    [int]$JoursGardes = 7,
    [int]$SemainesGardees = 4,
    [int]$MoisGardes = 12,
    [switch]$Rotation
)
$ErrorActionPreference = 'Stop'
# lance par une tache planifiee (powershell -File), "a,b" arrive en un seul texte
$Bases = @($Bases | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$journal = Join-Path $Destination 'sauvegarde.log'
function Note([string]$m) {
    $l = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $m"
    Write-Host $l
    Add-Content -Path $journal -Value $l
}

function Rotation([string]$dossier, [string]$base) {
    $fichiers = Get-ChildItem -Path $dossier -File | Where-Object { $_.Name -match ('^' + [regex]::Escape($base) + '-(\d{8}-\d{4})\.sql\.(zst|rar)$') } |
        ForEach-Object { [pscustomobject]@{ F = $_; Date = [datetime]::ParseExact(($_.Name -replace '^.*-(\d{8}-\d{4})\.sql\..*$', '$1'), 'yyyyMMdd-HHmm', $null) } } |
        Sort-Object Date -Descending
    if (-not $fichiers) { return }
    $garder = @{}
    $limite = (Get-Date).Date.AddDays(-($JoursGardes - 1))
    $fichiers | Where-Object { $_.Date -ge $limite } | ForEach-Object { $garder[$_.F.FullName] = $true }
    $cal = [System.Globalization.CultureInfo]::InvariantCulture.Calendar
    $semaines = $fichiers | Group-Object { '{0}-{1:00}' -f $_.Date.Year, $cal.GetWeekOfYear($_.Date, 'FirstFourDayWeek', 'Monday') } | Select-Object -First $SemainesGardees
    $semaines | ForEach-Object { $garder[$_.Group[0].F.FullName] = $true }
    $mois = $fichiers | Group-Object { $_.Date.ToString('yyyy-MM') } | Select-Object -First $MoisGardes
    $mois | ForEach-Object { $garder[$_.Group[0].F.FullName] = $true }
    # jamais la toute derniere, quoi qu'il arrive
    $garder[$fichiers[0].F.FullName] = $true
    foreach ($x in $fichiers) {
        if (-not $garder[$x.F.FullName]) {
            Remove-Item -Force $x.F.FullName
            Note "rotation : supprime $($x.F.FullName)"
        }
    }
}

if (-not $Zstd) { $c = Get-Command zstd -ErrorAction SilentlyContinue; if ($c) { $Zstd = $c.Source } }
$client = Join-Path $BinMariaDB 'mariadb.exe'
$dump = Join-Path $BinMariaDB 'mariadb-dump.exe'
$echecs = 0

foreach ($base in $Bases) {
    if (-not $Rotation) {
        if (-not (Test-Path $FichierOptions)) { throw "fichier d'options introuvable : $FichierOptions (2-configurer-mariadb.ps1 -CreerCompte)" }
        $horodatage = Get-Date -Format 'yyyyMMdd-HHmm'
        $erreurs = Join-Path $env:TEMP "sauvegarde-$base-$horodatage.err"
        $ErrorActionPreference = 'Continue'
        $logBin = (& $client "--defaults-extra-file=$FichierOptions" -N -B -e 'SELECT @@log_bin' 2>&1)
        $codeClient = $LASTEXITCODE
        $ErrorActionPreference = 'Stop'
        if ($codeClient -ne 0) {
            $echecs++
            Note "$base : ECHEC, connexion a MariaDB impossible : $("$logBin".Trim())"
            continue
        }
        $options = "--defaults-extra-file=`"$FichierOptions`" --single-transaction --routines --triggers --events --hex-blob --log-error=`"$erreurs`""
        if ("$logBin".Trim() -eq '1') { $options += ' --master-data=2' } else { Note "$base : journal binaire inactif, position non notee" }
        if ($Zstd) {
            $fichier = Join-Path $Destination "$base-$horodatage.sql.zst"
            $commande = "`"$dump`" $options $base | `"$Zstd`" -q -T0 -10 -o `"$fichier`""
        } else {
            $fichier = Join-Path $Destination "$base-$horodatage.sql.rar"
            $commande = "`"$dump`" $options $base | `"$Rar`" a -inul -m3 -si$base-$horodatage.sql `"$fichier`""
        }
        $t0 = Get-Date
        # cmd pour le tube : PowerShell 5 abime les octets qui passent entre deux programmes
        cmd /c $commande
        $codeCompression = $LASTEXITCODE
        $duree = [int]((Get-Date) - $t0).TotalSeconds
        $messages = if (Test-Path $erreurs) { (Get-Content $erreurs | Where-Object { $_ -match '\S' -and $_ -notmatch '^\s*(--\s*)?Warning' }) } else { @() }
        Remove-Item -Force -ErrorAction SilentlyContinue $erreurs
        if ($messages -or $codeCompression -ne 0 -or -not (Test-Path $fichier) -or (Get-Item $fichier).Length -lt 1024) {
            $echecs++
            Note "$base : ECHEC en $duree s (compression : code $codeCompression) $($messages -join ' / ')"
            if (Test-Path $fichier) { Remove-Item -Force $fichier }
            continue
        }
        $taille = [math]::Round((Get-Item $fichier).Length / 1MB, 1)
        Note "$base : $fichier, $taille Mo, $duree s"
        if ($CopieVers) {
            try {
                New-Item -ItemType Directory -Force -Path $CopieVers | Out-Null
                Copy-Item -Path $fichier -Destination $CopieVers
                Note "$base : copie dans $CopieVers"
            } catch {
                $echecs++
                Note "$base : ECHEC de la copie dans $CopieVers : $($_.Exception.Message)"
            }
        }
    }
    Rotation $Destination $base
    if ($CopieVers -and (Test-Path $CopieVers)) { Rotation $CopieVers $base }
}
if ($echecs) { exit 1 }
