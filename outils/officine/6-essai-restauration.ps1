<#
  ESSAI DE RESTAURATION (rapport docs/notices/RAPPORT_CHARGE_2026-10-29.md, par. 5.3, point 7 ; a faire chaque mois).

  Recharge la derniere sauvegarde complete d'une base sur un AUTRE serveur MariaDB (instance d'essai), rejoue le
  journal binaire copie jusqu'a -Jusqua, puis compare avec la base d'origine :
  ventes terminees du jour de -Jusqua (nombre et total) jusqu'a cette heure. Mesure la duree de chaque etape.

  Garde-fous :
   - le serveur cible doit etre different du serveur d'origine (port et dossier de donnees compares) ;
   - la base cible ne doit pas exister, sauf -Remplacer ;
   - seules des lectures sont faites sur la base d'origine (comptes de ventes, aucune donnee nominative).
  Aucun mot de passe en clair : chaque serveur est decrit par un fichier d'options (--defaults-extra-file).

  Exemple (instance d'essai sur le port 3307) :
    .\6-essai-restauration.ps1 -Base laborex_v1_db -OptionsCible 'C:\ProgramData\Prestige\essai.cnf' `
        -Jusqua '2026-10-29 15:00:00'
#>
param(
    [Parameter(Mandatory = $true)][string]$Base,
    [Parameter(Mandatory = $true)][string]$OptionsCible,
    [string]$OptionsOrigine = 'C:\ProgramData\Prestige\sauvegarde.cnf',
    [string]$Sauvegardes = 'D:\SAUVEGARDE_JOURNALIERE',
    [string]$Journal = 'D:\SAUVEGARDE_JOURNALIERE\journal-binaire',
    [string]$Jusqua = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'),
    [string]$BinMariaDB = 'D:\Program Files\MariaDB 10.6\bin',
    [string]$Zstd = '',
    [string]$UnRar = 'C:\Program Files\WinRAR\UnRAR.exe',
    [switch]$Remplacer
)
$ErrorActionPreference = 'Stop'
$client = Join-Path $BinMariaDB 'mariadb.exe'
$binlog = Join-Path $BinMariaDB 'mariadb-binlog.exe'
if (-not $Zstd) { $c = Get-Command zstd -ErrorAction SilentlyContinue; if ($c) { $Zstd = $c.Source } }
function Sql([string]$options, [string]$requete) {
    # PowerShell 5 traiterait toute ligne d'erreur du client comme fatale : seul son code de sortie compte
    $ErrorActionPreference = 'Continue'
    $r = & $client "--defaults-extra-file=$options" -N -B -e $requete 2>&1
    if ($LASTEXITCODE -ne 0) { throw "MariaDB : $r" }
    return "$r".Trim()
}
function Etape([string]$nom, [scriptblock]$f) {
    $t0 = Get-Date
    & $f
    Write-Host ("{0} : {1:N0} s" -f $nom, ((Get-Date) - $t0).TotalSeconds)
}

# 1. garde-fous
# apostrophes seulement : PowerShell 5 retire les guillemets doubles des arguments d'un programme
$qui = 'SELECT CONCAT(@@hostname, '':'', @@port, '':'', @@datadir)'
$origine = Sql $OptionsOrigine $qui
$cible = Sql $OptionsCible $qui
if ($origine -eq $cible) { throw "le serveur cible est le serveur d'origine ($cible) : refuse" }
if ((Sql $OptionsCible "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '$Base'") -ne '0') {
    if (-not $Remplacer) { throw "la base $Base existe deja sur le serveur cible ($cible) : -Remplacer pour l'ecraser" }
}
$fin = [datetime]::ParseExact($Jusqua, 'yyyy-MM-dd HH:mm:ss', $null)
$fichier = Get-ChildItem -Path $Sauvegardes -File | Where-Object { $_.Name -match ('^' + [regex]::Escape($Base) + '-(\d{8}-\d{4})\.sql\.(zst|rar)$') } |
    Where-Object { [datetime]::ParseExact(($_.Name -replace '^.*-(\d{8}-\d{4})\.sql\..*$', '$1'), 'yyyyMMdd-HHmm', $null) -le $fin } |
    Sort-Object Name -Descending | Select-Object -First 1
if (-not $fichier) { throw "aucune sauvegarde de $Base anterieure a $Jusqua dans $Sauvegardes" }
Write-Host "sauvegarde : $($fichier.FullName) ($([math]::Round($fichier.Length / 1MB, 1)) Mo)"
Write-Host "cible      : $cible"
$lire = if ($fichier.Extension -eq '.zst') {
    if (-not $Zstd) { throw 'zstd introuvable' }; "`"$Zstd`" -dc `"$($fichier.FullName)`""
} else { "`"$UnRar`" p -inul `"$($fichier.FullName)`"" }

# 2. position du journal notee par --master-data=2 en tete de la sauvegarde
$tete = cmd /c "$lire 2>nul" | Select-Object -First 80
$position = $tete | Where-Object { $_ -match "MASTER_LOG_FILE='([^']+)',\s*MASTER_LOG_POS=(\d+)" } | Select-Object -First 1
if ($position -and $position -match "MASTER_LOG_FILE='([^']+)',\s*MASTER_LOG_POS=(\d+)") {
    $premierJournal = $Matches[1]; $depart = $Matches[2]
    Write-Host "journal    : a partir de $premierJournal, position $depart"
} else {
    Write-Warning 'position du journal absente (journal binaire inactif a la sauvegarde) : rechargement seul'
}

# 3. rechargement
Etape 'rechargement' {
    Sql $OptionsCible "DROP DATABASE IF EXISTS ``$Base``; CREATE DATABASE ``$Base``" | Out-Null
    cmd /c "$lire | `"$client`" --defaults-extra-file=`"$OptionsCible`" $Base"
    if ($LASTEXITCODE -ne 0) { throw 'rechargement en echec' }
}

# 4. journal rejoue jusqu'a -Jusqua
if ($premierJournal) {
    $journaux = Get-ChildItem -Path $Journal -File | Where-Object { $_.Name -match '\.\d{6}$' -and $_.Name -ge $premierJournal } | Sort-Object Name
    if (-not $journaux -or $journaux[0].Name -ne $premierJournal) { throw "journal $premierJournal absent de $Journal" }
    $liste = ($journaux | ForEach-Object { "`"$($_.FullName)`"" }) -join ' '
    Etape "journal ($($journaux.Count) fichier(s))" {
        cmd /c "`"$binlog`" --database=$Base --start-position=$depart --stop-datetime=`"$Jusqua`" $liste | `"$client`" --defaults-extra-file=`"$OptionsCible`" $Base"
        if ($LASTEXITCODE -ne 0) { throw 'journal rejoue en echec' }
    }
}

# 5. comparaison : ventes terminees du jour, jusqu'a l'heure demandee
$jour = $fin.ToString('yyyy-MM-dd')
$requete = "SELECT CONCAT(COUNT(*), ' ventes, total ', COALESCE(SUM(int_PRICE), 0)) FROM ``$Base``.t_preenregistrement " +
    "WHERE str_STATUT = 'is_Closed' AND dt_UPDATED >= '$jour' AND dt_UPDATED <= '$Jusqua'"
$a = Sql $OptionsOrigine $requete
$b = Sql $OptionsCible $requete
Write-Host "origine    : $a"
Write-Host "restauree  : $b"
if ($a -ne $b) { Write-Warning 'ecart entre la base d''origine et la base restauree'; exit 1 }
Write-Host 'restauration conforme'
