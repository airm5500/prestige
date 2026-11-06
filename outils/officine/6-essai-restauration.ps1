<#
  ESSAI DE RESTAURATION (rapport docs/notices/RAPPORT_CHARGE_2026-10-29.md, par. 5.3, point 7 ; OBLIGATOIRE chaque
  mois depuis le lot 4.C : l'onglet « Securite » de Prestige rappelle un essai qui a plus d'un mois).

  Recharge la derniere sauvegarde complete d'une base sur un AUTRE serveur MariaDB (instance d'essai), rejoue le
  journal binaire copie jusqu'a -Jusqua, puis compare avec la base d'origine :
  ventes terminees du jour de -Jusqua (nombre et total) jusqu'a cette heure. Mesure la duree de chaque etape.

  Archives chiffrees (cas 4, lot 4.C, .sql.zst.aes / .sql.rar.aes et journaux .aes) : dechiffrees avec la cle des
  archives, lue dans FichierCle (DPAPI, sur le serveur) ou SAISIE par le pharmacien (-CleSaisie, ou si le fichier est
  absent : c'est le cas sur un autre poste, et c'est ce qui prouve que la cle gardee hors du serveur fonctionne). Le
  HMAC est verifie avant tout dechiffrement ; avec zstd rien en clair ne touche le disque ; avec RAR l'archive en clair
  passe par le dossier prive puis est supprimee.

  Resultat consigne dans la base d'origine (compte de sauvegarde : 2-configurer-mariadb.ps1 -CreerCompte relance une
  fois) : KEY_SECURITE_DERNIER_ESSAI_RESTAURATION (date), KEY_SECURITE_DERNIER_ESSAI_RESULTAT (CONFORME, ECART ou
  ECHEC) et une ligne ESSAI_RESTAURATION du journal de securite (durees, archive, chiffree ou non : jamais une valeur,
  jamais une donnee). -SansTrace pour ne rien ecrire (essai sur un poste etranger).

  Garde-fous :
   - le serveur cible doit etre different du serveur d'origine (port et dossier de donnees compares) ;
   - la base cible ne doit pas exister, sauf -Remplacer ;
   - seules des lectures sont faites sur la base d'origine (comptes de ventes, aucune donnee nominative), plus la trace.
  Aucun mot de passe en clair : chaque serveur est decrit par un fichier d'options (--defaults-extra-file), chiffre
  par 2-configurer-mariadb.ps1 ou encore en clair (identifiants-sauvegarde.ps1 lit les deux, dans un fichier prive le
  temps du script).

  Exemple (instance d'essai sur le port 3307) :
    .\6-essai-restauration.ps1 -Base laborex_v1_db -OptionsCible 'C:\ProgramData\Prestige\essai.cnf' `
        -Jusqua '2026-10-29 15:00:00'
#>
param(
    [Parameter(Mandatory = $true)][string]$Base,
    [Parameter(Mandatory = $true)][string]$OptionsCible,
    [string]$OptionsOrigine = 'C:\ProgramData\Prestige\sauvegarde.cnf',
    [string]$FichierCle = 'C:\ProgramData\Prestige\archive.cnf',
    [switch]$CleSaisie,
    [switch]$SansTrace,
    [string]$Sauvegardes = 'D:\SAUVEGARDE_JOURNALIERE',
    [string]$Journal = 'D:\SAUVEGARDE_JOURNALIERE\journal-binaire',
    [string]$Jusqua = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'),
    [string]$BinMariaDB = 'D:\Program Files\MariaDB 10.6\bin',
    [string]$Zstd = '',
    [string]$UnRar = 'C:\Program Files\WinRAR\UnRAR.exe',
    [switch]$Remplacer
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'identifiants-sauvegarde.ps1')
. (Join-Path $PSScriptRoot 'archive-chiffree.ps1')
$client = Join-Path $BinMariaDB 'mariadb.exe'
$binlog = Join-Path $BinMariaDB 'mariadb-binlog.exe'
# fichiers d'options en clair, prives, le temps du script (les chemins donnes peuvent etre chiffres ou non)
$OptionsOrigine = Options-Temporaires $OptionsOrigine
$OptionsCible = Options-Temporaires $OptionsCible
$cle = $null
$temporaires = @()
$etapes = @()
$debut = Get-Date
$resultat = 'ECHEC'
$sortie = 1
try {
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
    $s = [int]((Get-Date) - $t0).TotalSeconds
    Write-Host ("{0} : {1:N0} s" -f $nom, $s)
    $script:etapes += "$nom $s s"
}
function Saisie-Masquee([string]$invite) {
    $s = Read-Host -Prompt $invite -AsSecureString
    $p = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
    try { return [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($p) } finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p) }
}
# premiere lignes du SQL d'une archive chiffree zstd : dechiffrement d'un prefixe vers zstd -dc, sortie lue en memoire
function Tete-Chiffree([string]$fichier) {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'cmd.exe'; $psi.Arguments = "/c `"`"$Zstd`" -dc 2>nul`""
    $psi.UseShellExecute = $false; $psi.RedirectStandardInput = $true; $psi.RedirectStandardOutput = $true
    $p = [System.Diagnostics.Process]::Start($psi)
    $mem = New-Object System.IO.MemoryStream
    $t = $p.StandardOutput.BaseStream.CopyToAsync($mem)
    try { Dechiffrer-PrefixeVers $fichier $p.StandardInput.BaseStream $cle 262144 | Out-Null } catch [System.IO.IOException] { }
    try { $p.StandardInput.Close() } catch { }
    $t.Wait(); $p.WaitForExit(); $p.Dispose()
    return ([System.Text.Encoding]::ASCII.GetString($mem.ToArray()) -split "`n") | Select-Object -First 80
}
# archive binaire (journal .aes) ou .rar chiffre : dechiffree dans le dossier prive, supprimee a la fin
function Dechiffrer-Temporaire([string]$fichier) {
    $f = Join-Path (Dossier-Prive) ([System.IO.Path]::GetFileNameWithoutExtension($fichier))
    Dechiffrer-Fichier $fichier $f $cle | Out-Null
    $script:temporaires += $f
    return $f
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
$fichier = Get-ChildItem -Path $Sauvegardes -File | Where-Object { $_.Name -match ('^' + [regex]::Escape($Base) + '-(\d{8}-\d{4})\.sql\.(zst|rar)(\.aes)?$') } |
    Where-Object { [datetime]::ParseExact(($_.Name -replace '^.*-(\d{8}-\d{4})\.sql\..*$', '$1'), 'yyyyMMdd-HHmm', $null) -le $fin } |
    Sort-Object Name -Descending | Select-Object -First 1
if (-not $fichier) { throw "aucune sauvegarde de $Base anterieure a $Jusqua dans $Sauvegardes" }
$chiffree = Est-ArchiveChiffree $fichier.Name
$zst = $fichier.Name -match '\.zst(\.aes)?$'
Write-Host "sauvegarde : $($fichier.FullName) ($([math]::Round($fichier.Length / 1MB, 1)) Mo)$(if ($chiffree) { ', chiffree' })"
Write-Host "cible      : $cible"
if ($zst -and -not $Zstd) { throw 'zstd introuvable' }

# 2. cle des archives : fichier du serveur, ou saisie du pharmacien (autre poste, ou -CleSaisie)
if ($chiffree) {
    if ($CleSaisie -or -not (Test-Path $FichierCle)) {
        $cle = Octets-Cle (Saisie-Masquee 'Cle des archives gardee hors du serveur (saisie masquee)')
    } else {
        $cle = Lire-CleArchive $FichierCle
    }
    Etape 'verification de l''archive (HMAC)' { Verifier-Archive $fichier.FullName $cle | Out-Null }
    $etapes += 'cle acceptee'
}

# 3. position du journal notee par --master-data=2 en tete de la sauvegarde
$source = $fichier.FullName
if ($chiffree -and -not $zst) { $source = Dechiffrer-Temporaire $fichier.FullName }
if ($zst) {
    if ($chiffree) { $tete = Tete-Chiffree $fichier.FullName; $lire = "`"$Zstd`" -dc" }
    else { $lire = "`"$Zstd`" -dc `"$source`""; $tete = cmd /c "$lire 2>nul" | Select-Object -First 80 }
} else {
    $lire = "`"$UnRar`" p -inul `"$source`""
    $tete = cmd /c "$lire 2>nul" | Select-Object -First 80
}
$position = $tete | Where-Object { $_ -match "MASTER_LOG_FILE='([^']+)',\s*MASTER_LOG_POS=(\d+)" } | Select-Object -First 1
if ($position -and $position -match "MASTER_LOG_FILE='([^']+)',\s*MASTER_LOG_POS=(\d+)") {
    $premierJournal = $Matches[1]; $depart = $Matches[2]
    Write-Host "journal    : a partir de $premierJournal, position $depart"
} else {
    Write-Warning 'position du journal absente (journal binaire inactif a la sauvegarde) : rechargement seul'
}

# 4. rechargement
Etape 'rechargement' {
    Sql $OptionsCible "DROP DATABASE IF EXISTS ``$Base``; CREATE DATABASE ``$Base``" | Out-Null
    $charge = "$lire | `"$client`" --defaults-extra-file=`"$OptionsCible`" $Base"
    if ($chiffree -and $zst) { $code = Dechiffrer-VersCommande $fichier.FullName $charge $cle } else { cmd /c $charge; $code = $LASTEXITCODE }
    if ($code -ne 0) { throw 'rechargement en echec' }
}

# 5. journal rejoue jusqu'a -Jusqua (copies en clair, ou chiffrees .aes dechiffrees dans le dossier prive)
if ($premierJournal) {
    $journaux = Get-ChildItem -Path $Journal -File | Where-Object { $_.Name -match '\.\d{6}(\.aes)?$' -and ($_.Name -replace '\.aes$', '') -ge $premierJournal } | Sort-Object Name
    if (-not $journaux -or ($journaux[0].Name -replace '\.aes$', '') -ne $premierJournal) { throw "journal $premierJournal absent de $Journal" }
    $chemins = @()
    foreach ($j in $journaux) {
        if (Est-ArchiveChiffree $j.Name) {
            if (-not $cle) { $cle = if (Test-Path $FichierCle) { Lire-CleArchive $FichierCle } else { Octets-Cle (Saisie-Masquee 'Cle des archives (journaux chiffres)') } }
            $chemins += Dechiffrer-Temporaire $j.FullName
        } else { $chemins += $j.FullName }
    }
    $liste = ($chemins | ForEach-Object { "`"$_`"" }) -join ' '
    Etape "journal ($($journaux.Count) fichier(s))" {
        cmd /c "`"$binlog`" --database=$Base --start-position=$depart --stop-datetime=`"$Jusqua`" $liste | `"$client`" --defaults-extra-file=`"$OptionsCible`" $Base"
        if ($LASTEXITCODE -ne 0) { throw 'journal rejoue en echec' }
    }
}

# 6. comparaison : ventes terminees du jour, jusqu'a l'heure demandee
$jour = $fin.ToString('yyyy-MM-dd')
$requete = "SELECT CONCAT(COUNT(*), ' ventes, total ', COALESCE(SUM(int_PRICE), 0)) FROM ``$Base``.t_preenregistrement " +
    "WHERE str_STATUT = 'is_Closed' AND dt_UPDATED >= '$jour' AND dt_UPDATED <= '$Jusqua'"
$a = Sql $OptionsOrigine $requete
$b = Sql $OptionsCible $requete
Write-Host "origine    : $a"
Write-Host "restauree  : $b"
if ($a -ne $b) { Write-Warning 'ecart entre la base d''origine et la base restauree'; $resultat = 'ECART'; $sortie = 1 }
else { Write-Host 'restauration conforme'; $resultat = 'CONFORME'; $sortie = 0 }
} catch {
    Write-Host "ECHEC : $($_.Exception.Message)"
    $etapes += "echec : $($_.Exception.Message -replace "'", '')"
    $resultat = 'ECHEC'
    $sortie = 1
} finally {
    foreach ($t in $temporaires) { Remove-Item -Force -ErrorAction SilentlyContinue $t }
    $cle = $null
    # 7. trace dans la base d'origine : date, resultat, journal (jamais une valeur ni une donnee)
    if (-not $SansTrace) {
        try {
            $duree = [int]((Get-Date) - $debut).TotalSeconds
            $detail = ("$(if ($fichier) { $fichier.Name } else { 'archive introuvable' })$(if ($chiffree) { ' (chiffree)' }) ; $($etapes -join ' ; ') ; $duree s" -replace "'", '')
            if ($detail.Length -gt 990) { $detail = $detail.Substring(0, 990) }
            $qui = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name -replace "'", ''
            Sql $OptionsOrigine ("INSERT INTO ``$Base``.t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED) VALUES " +
                "('KEY_SECURITE_DERNIER_ESSAI_RESTAURATION', DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i'), 'Securite de la base : date du dernier essai de restauration (6-essai-restauration.ps1)', 'SYSTEME', 'enable', NOW(), NOW()), " +
                "('KEY_SECURITE_DERNIER_ESSAI_RESULTAT', '$resultat', 'Securite de la base : resultat du dernier essai de restauration (CONFORME, ECART, ECHEC)', 'SYSTEME', 'enable', NOW(), NOW()) " +
                "ON DUPLICATE KEY UPDATE str_VALUE = VALUES(str_VALUE), dt_UPDATED = NOW(); " +
                "INSERT INTO ``$Base``.t_securite_journal (dt_DATE, str_LOGIN, str_ACTION, str_RESULTAT, str_DETAIL) VALUES (NOW(), '$qui', 'ESSAI_RESTAURATION', '$(if ($resultat -eq 'CONFORME') { 'OK' } else { 'ECHEC' })', '$detail')") | Out-Null
            Write-Host "trace      : $resultat consigne dans $Base (KEY_SECURITE_DERNIER_ESSAI_RESTAURATION, journal de securite)"
        } catch {
            Write-Warning "trace non consignee : $($_.Exception.Message) (relancer 2-configurer-mariadb.ps1 -CreerCompte pour les droits)"
        }
    }
    Retirer-OptionsTemporaires $OptionsOrigine
    Retirer-OptionsTemporaires $OptionsCible
}
exit $sortie
