<#
  COPIE HORAIRE DU JOURNAL BINAIRE (rapport docs/notices/RAPPORT_CHARGE_2026-10-29.md, par. 5.3, point 1).

  Avec la derniere sauvegarde complete (3-sauvegarde-complete.ps1), ce journal permet de tout rejouer jusqu'a la
  derniere copie : c'est ce qui tient l'objectif "une heure de perte au plus", a condition de le lancer toutes les
  heures (5-planifier.ps1) et de copier hors du disque de la base.

  A chaque passage :
   1. FLUSH BINARY LOGS : MariaDB ferme le fichier en cours et en ouvre un nouveau ;
   2. chaque fichier ferme absent de Destination (ou de taille differente) y est copie, puis dans -CopieVers ;
   3. les copies de plus de JoursGardes jours sont supprimees (MariaDB purge les siens apres expire_logs_days).
  Aucun mot de passe : le compte de sauvegarde lit le sien dans FichierOptions (chiffre, dechiffre le temps du script
  dans un fichier prive : identifiants-sauvegarde.ps1). Journal : journal.log dans Destination.
  Cas 4, lot 4.C : si KEY_SECURITE_BASE vaut 1 dans la base -Base, chaque copie est CHIFFREE (AES, archive-chiffree.ps1,
  cle de 7-cle-archive.ps1 dans FichierCle) : fichier <journal>.aes, de taille connue d'avance (Taille-Chiffree), rien
  en clair hors du dossier de MariaDB. Cle absente : copie en clair et AVERTISSEMENT dans journal.log. A 0 : inchange.
  Code de sortie 1 si la copie a echoue.

  Exemple :
    .\4-copier-journal.ps1 -Destination 'E:\Sauvegardes\journal-binaire' -CopieVers '\\nas\pharmacie\journal-binaire'
#>
param(
    [string]$Destination = 'D:\SAUVEGARDE_JOURNALIERE\journal-binaire',
    [string]$CopieVers = '',
    [string]$FichierOptions = 'C:\ProgramData\Prestige\sauvegarde.cnf',
    [string]$FichierCle = 'C:\ProgramData\Prestige\archive.cnf',
    # base ou lire KEY_SECURITE_BASE (le journal binaire, lui, couvre tout le serveur)
    [string]$Base = 'laborex_v1_db',
    [string]$Client = 'D:\Program Files\MariaDB 10.6\bin\mariadb.exe',
    [int]$JoursGardes = 14
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'identifiants-sauvegarde.ps1')
. (Join-Path $PSScriptRoot 'archive-chiffree.ps1')
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$journal = Join-Path $Destination 'journal.log'
$optionsClair = $null
$cle = $null
function Note([string]$m) {
    $l = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $m"
    Write-Host $l
    Add-Content -Path $journal -Value $l
}
function Sql([string]$requete) {
    # PowerShell 5 traiterait toute ligne d'erreur du client comme fatale : seul son code de sortie compte
    $ErrorActionPreference = 'Continue'
    $r = & $Client "--defaults-extra-file=$optionsClair" -N -B -e $requete 2>&1
    if ($LASTEXITCODE -ne 0) { throw "MariaDB : $r" }
    return $r
}

function Copier([string]$source, [string]$vers) {
    $n = 0
    New-Item -ItemType Directory -Force -Path $vers | Out-Null
    foreach ($f in $fermes) {
        $src = Join-Path $source $f
        $taille = (Get-Item $src).Length
        if ($cle) {
            $dst = Join-Path $vers ($f + $ARCHIVE_SUFFIXE)
            if ((Test-Path $dst) -and (Get-Item $dst).Length -eq (Taille-Chiffree $taille)) { continue }
            Chiffrer-Fichier $src $dst $cle | Out-Null
        } else {
            $dst = Join-Path $vers $f
            if ((Test-Path $dst) -and (Get-Item $dst).Length -eq $taille) { continue }
            Copy-Item -Path $src -Destination $dst -Force
        }
        $n++
    }
    return $n
}

function Purger([string]$dossier) {
    Get-ChildItem -Path $dossier -File | Where-Object { $_.Name -match '\.\d{6}(\.aes)?$' -and $_.LastWriteTime -lt (Get-Date).AddDays(-$JoursGardes) } |
        ForEach-Object { Remove-Item -Force $_.FullName; Note "purge : $($_.FullName)" }
}

try {
    $optionsClair = Options-Temporaires $FichierOptions
    if ("$(Sql 'SELECT @@log_bin')".Trim() -ne '1') { throw 'journal binaire inactif (2-configurer-mariadb.ps1, puis redemarrer MariaDB)' }
    # cas 4, lot 4.C : copies chiffrees quand KEY_SECURITE_BASE vaut 1 et que la cle est lisible
    if ((Securite-Base $Client $optionsClair $Base) -eq '1') {
        try { $cle = Lire-CleArchive $FichierCle } catch { Note "AVERTISSEMENT, copies NON chiffrees : $($_.Exception.Message)" }
    }
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
    Note "$message$(if ($cle) { ', chiffres (AES)' }) (dernier ferme : $($fermes | Select-Object -Last 1))"
} catch {
    Note "ECHEC : $($_.Exception.Message)"
    exit 1
} finally {
    Retirer-OptionsTemporaires $optionsClair
    $cle = $null
}
