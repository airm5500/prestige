<#
  COPIE HORAIRE DU JOURNAL BINAIRE (rapport docs/notices/RAPPORT_CHARGE_2026-10-29.md, par. 5.3, point 1).

  Avec la derniere sauvegarde complete (3-sauvegarde-complete.ps1), ce journal permet de tout rejouer jusqu'a la
  derniere copie : c'est ce qui tient l'objectif "une heure de perte au plus", a condition de le lancer toutes les
  heures (5-planifier.ps1) et de copier hors du disque de la base.

  A chaque passage :
   1. FLUSH BINARY LOGS : MariaDB ferme le fichier en cours et en ouvre un nouveau ;
   2. chaque fichier ferme absent de Destination (ou de taille differente) y est copie, puis dans -CopieVers ;
   3. les copies de plus de JoursGardes jours sont supprimees (MariaDB purge les siens apres expire_logs_days).
  Aucun mot de passe : le compte de sauvegarde lit le sien dans FichierOptions. Journal : journal.log dans Destination.
  Code de sortie 1 si la copie a echoue.

  Exemple :
    .\4-copier-journal.ps1 -Destination 'E:\Sauvegardes\journal-binaire' -CopieVers '\\nas\pharmacie\journal-binaire'
#>
param(
    [string]$Destination = 'D:\SAUVEGARDE_JOURNALIERE\journal-binaire',
    [string]$CopieVers = '',
    [string]$FichierOptions = 'C:\ProgramData\Prestige\sauvegarde.cnf',
    [string]$Client = 'D:\Program Files\MariaDB 10.6\bin\mariadb.exe',
    [int]$JoursGardes = 14
)
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$journal = Join-Path $Destination 'journal.log'
function Note([string]$m) {
    $l = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $m"
    Write-Host $l
    Add-Content -Path $journal -Value $l
}
function Sql([string]$requete) {
    # PowerShell 5 traiterait toute ligne d'erreur du client comme fatale : seul son code de sortie compte
    $ErrorActionPreference = 'Continue'
    $r = & $Client "--defaults-extra-file=$FichierOptions" -N -B -e $requete 2>&1
    if ($LASTEXITCODE -ne 0) { throw "MariaDB : $r" }
    return $r
}

function Copier([string]$source, [string]$vers) {
    $n = 0
    New-Item -ItemType Directory -Force -Path $vers | Out-Null
    foreach ($f in $fermes) {
        $src = Join-Path $source $f
        $dst = Join-Path $vers $f
        if ((Test-Path $dst) -and (Get-Item $dst).Length -eq (Get-Item $src).Length) { continue }
        Copy-Item -Path $src -Destination $dst -Force
        $n++
    }
    return $n
}

function Purger([string]$dossier) {
    Get-ChildItem -Path $dossier -File | Where-Object { $_.Name -match '\.\d{6}$' -and $_.LastWriteTime -lt (Get-Date).AddDays(-$JoursGardes) } |
        ForEach-Object { Remove-Item -Force $_.FullName; Note "purge : $($_.FullName)" }
}

try {
    if ("$(Sql 'SELECT @@log_bin')".Trim() -ne '1') { throw 'journal binaire inactif (2-configurer-mariadb.ps1, puis redemarrer MariaDB)' }
    $racine = "$(Sql 'SELECT @@log_bin_basename')".Trim() -replace '/', '\'
    $source = Split-Path $racine -Parent
    Sql 'FLUSH BINARY LOGS' | Out-Null
    # SHOW BINARY LOGS : nom <tab> taille ; le dernier est le fichier en cours, jamais copie
    $liste = @(Sql 'SHOW BINARY LOGS' | ForEach-Object { ($_ -split "`t")[0] })
    $fermes = $liste | Select-Object -First ([math]::Max(0, $liste.Count - 1))
    $n = Copier $source $Destination
    $message = "$n fichier(s) copie(s) dans $Destination"
    if ($CopieVers) {
        $m = Copier $source $CopieVers
        $message += ", $m dans $CopieVers"
        Purger $CopieVers
    }
    Purger $Destination
    Note "$message (dernier ferme : $($fermes | Select-Object -Last 1))"
} catch {
    Note "ECHEC : $($_.Exception.Message)"
    exit 1
}
