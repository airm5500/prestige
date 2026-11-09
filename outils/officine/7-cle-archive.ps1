<#
  CLE DES ARCHIVES DE SAUVEGARDE (cas 4, lot 4.C, decision Q4.3 du 05/11/2026).

  Quand KEY_SECURITE_BASE vaut 1, les scripts 3 et 4 chiffrent les archives (.sql.zst, journaux binaires) et
  Prestige chiffre ses sauvegardes horaires (.sql.gz) avec UNE cle, celle que ce script pose :
   - -Creer : tire une cle de 32 caracteres (8 groupes de 4) et l'AFFICHE UNE SEULE FOIS. Le pharmacien la recopie
     sur papier (coffre) ou la copie sur une cle USB rangee hors du serveur (-CopieVers 'E:\'), puis ferme la
     fenetre. Sur le serveur elle n'est gardee que chiffree par DPAPI (portee machine) dans -FichierCle, lisible
     par SYSTEM, les administrateurs et le compte de Payara (-ComptePayara). Elle n'est ecrite dans aucun journal.
     -Saisir : le pharmacien choisit lui-meme la cle (saisie masquee, deux fois) au lieu du tirage.
     Un fichier deja present n'est remplace qu'avec -Remplacer : les archives chiffrees avec l'ancienne cle
     resteraient lisibles avec l'ancienne cle seulement.
   - -Verifier : le pharmacien tape la cle qu'il garde hors du serveur ; le script dit si c'est bien celle du
     serveur (rien n'est affiche d'autre). A faire apres la copie sur papier, et a chaque essai de restauration.
   - -Dechiffrer <archive.aes> [-Vers <fichier>] : rend le fichier en clair (par exemple la sauvegarde horaire
     prestige_<base>_AAAAMMJJ_HHMM.sql.gz.aes de Prestige avant une restauration a la main) ; cle lue dans
     -FichierCle, ou saisie (-CleSaisie, ou si le fichier est absent : autre poste). Le HMAC est verifie d'abord.
  Dans la base (compte de sauvegarde, 2-configurer-mariadb.ps1 -CreerCompte relance une fois) : la date de
  creation de la cle (KEY_SECURITE_CLE_ARCHIVE_DATE) et une ligne du journal de securite (CLE_ARCHIVE) : jamais
  la valeur. L'onglet « Securite » de Prestige affiche cet etat.

  Si la cle est perdue : les archives deja chiffrees sont illisibles pour tout le monde (la base en service, elle,
  n'est pas touchee). Relancer -Creer -Remplacer, puis une sauvegarde complete aussitot.

  Exemples :
    .\7-cle-archive.ps1 -Creer -ComptePayara 'RM\prestige-service' -CopieVers 'E:\'
    .\7-cle-archive.ps1 -Verifier
#>
param(
    [switch]$Creer,
    [switch]$Saisir,
    [switch]$Remplacer,
    [switch]$Verifier,
    [string]$Dechiffrer = '',
    [string]$Vers = '',
    [switch]$CleSaisie,
    [string]$FichierCle = 'C:\ProgramData\Prestige\archive.cnf',
    # dossier amovible (cle USB) ou deposer une copie de la cle, en clair, a garder hors du serveur ; vide : aucune
    [string]$CopieVers = '',
    # compte Windows de Payara s'il n'est ni SYSTEM ni administrateur (DOMAINE\compte)
    [string]$ComptePayara = '',
    [string]$Base = 'laborex_v1_db',
    [string]$FichierOptions = 'C:\ProgramData\Prestige\sauvegarde.cnf',
    [string]$Client = 'D:\Program Files\MariaDB 10.6\bin\mariadb.exe'
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'identifiants-sauvegarde.ps1')
. (Join-Path $PSScriptRoot 'archive-chiffree.ps1')

# valeur dans un litteral SQL : antislashs et apostrophes echappes (un chemin D:\tmp sinon devient D:<tab>mp)
function Sql-Texte([string]$v) { return ($v -replace '\\', '\\' -replace "'", "''") }

function Saisie-Masquee([string]$invite) {
    $s = Read-Host -Prompt $invite -AsSecureString
    $p = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
    try { return [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($p) } finally { [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p) }
}

# trace dans la base (date du parametre et ligne de journal) ; jamais la valeur ; un echec n'empeche rien
function Tracer([string]$resultat, [string]$detail) {
    if (-not (Test-Path $FichierOptions)) { Write-Host "  (base non mise a jour : $FichierOptions absent)"; return }
    $optionsClair = $null
    try {
        $optionsClair = Options-Temporaires $FichierOptions
        $qui = Sql-Texte ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name)
        $d = Sql-Texte $detail
        $sql = "INSERT INTO ``$Base``.t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT, dt_CREATED, dt_UPDATED) " +
            "VALUES ('KEY_SECURITE_CLE_ARCHIVE_DATE', DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i'), 'Securite de la base : date de creation de la cle des archives (7-cle-archive.ps1)', 'SYSTEME', 'enable', NOW(), NOW()) " +
            "ON DUPLICATE KEY UPDATE str_VALUE = VALUES(str_VALUE), dt_UPDATED = NOW(); " +
            "INSERT INTO ``$Base``.t_securite_journal (dt_DATE, str_LOGIN, str_ACTION, str_RESULTAT, str_DETAIL) VALUES (NOW(), '$qui', 'CLE_ARCHIVE', '$resultat', '$d');"
        $ErrorActionPreference = 'Continue'
        $r = (& $Client "--defaults-extra-file=$optionsClair" -e $sql 2>&1)
        $code = $LASTEXITCODE
        $ErrorActionPreference = 'Stop'
        if ($code -ne 0) { Write-Host "  (base non mise a jour : $r ; relancer 2-configurer-mariadb.ps1 -CreerCompte pour les droits)" } else { Write-Host "  Date et journal poses dans la base $Base (sans la valeur)." }
    } catch {
        Write-Host "  (base non mise a jour : $($_.Exception.Message))"
    } finally { Retirer-OptionsTemporaires $optionsClair }
}

if ($Creer) {
    if ((Test-Path $FichierCle) -and -not $Remplacer) {
        throw "une cle existe deja ($FichierCle). -Remplacer pour la changer : les archives deja chiffrees ne s'ouvriront alors qu'avec l'ancienne cle."
    }
    if ($Saisir) {
        $c1 = Saisie-Masquee 'Cle des archives (12 caracteres au moins ; saisie masquee)'
        $c2 = Saisie-Masquee 'Confirmer la cle'
        if (($c1 -replace '\s', '') -ne ($c2 -replace '\s', '')) { throw 'les deux saisies different' }
        $cle = $c1 -replace '\s', ''
        $c1 = $null; $c2 = $null
    } else {
        $cle = Nouvelle-CleArchive
    }
    $octets = Octets-Cle $cle
    Ecrire-CleArchive $FichierCle $octets $ComptePayara
    Write-Host ''
    Write-Host '==========================================================================='
    Write-Host '  CLE DES ARCHIVES DE SAUVEGARDE : a recopier MAINTENANT, elle ne sera plus affichee'
    Write-Host ''
    Write-Host "      $cle"
    Write-Host ''
    Write-Host '  A garder HORS du serveur (coffre, papier, cle USB rangee ailleurs). Sans elle, aucune'
    Write-Host '  archive chiffree ne peut etre ouverte, ni par le support, ni par Prestige sur un autre poste.'
    Write-Host '==========================================================================='
    if ($CopieVers) {
        New-Item -ItemType Directory -Force -Path $CopieVers | Out-Null
        $f = Join-Path $CopieVers ("cle-archives-prestige-" + (Get-Date -Format 'yyyyMMdd') + '.txt')
        [System.IO.File]::WriteAllText($f, "Cle des archives de sauvegarde Prestige (creee le $(Get-Date -Format 'dd/MM/yyyy HH:mm'))`r`n$cle`r`nA garder hors du serveur.`r`n")
        Write-Host "  Copie ecrite sur $f : retirer le support et le ranger."
    }
    Write-Host "  Sur le serveur : $FichierCle (DPAPI, portee machine ; acces : SYSTEM, administrateurs$(if ($ComptePayara) { ", $ComptePayara" }))."
    Tracer 'OK' "cle $(if ($Saisir) { 'saisie' } else { 'generee' })$(if ($Remplacer) { ' (remplacement)' }) ; fichier $FichierCle$(if ($CopieVers) { ' ; copie sur support amovible' })"
    $cle = $null; $octets = $null
    Write-Host '  Verifier la copie papier : .\7-cle-archive.ps1 -Verifier'
}

if ($Verifier) {
    $serveur = Lire-CleArchive $FichierCle
    $saisie = Octets-Cle (Saisie-Masquee 'Cle gardee hors du serveur (saisie masquee)')
    if (Meme-Octets $serveur $saisie) {
        Write-Host 'Cle CONFORME : c''est bien celle du serveur.'
        Tracer 'OK' 'copie de la cle verifiee conforme'
        exit 0
    }
    Write-Host 'Cle DIFFERENTE de celle du serveur : recopier la cle (7-cle-archive.ps1 -Creer -Remplacer si la copie est perdue, puis sauvegarde complete).'
    Tracer 'ECHEC' 'copie de la cle verifiee : differente'
    exit 1
}

if ($Dechiffrer) {
    if (-not (Test-Path $Dechiffrer)) { throw "archive introuvable : $Dechiffrer" }
    if (-not (Est-ArchiveChiffree $Dechiffrer)) { throw "ce fichier n'a pas le suffixe $ARCHIVE_SUFFIXE : il n'est pas chiffre" }
    if (-not $Vers) { $Vers = $Dechiffrer.Substring(0, $Dechiffrer.Length - $ARCHIVE_SUFFIXE.Length) }
    if (Test-Path $Vers) { throw "le fichier $Vers existe deja" }
    $cle = if ($CleSaisie -or -not (Test-Path $FichierCle)) { Octets-Cle (Saisie-Masquee 'Cle des archives (saisie masquee)') } else { Lire-CleArchive $FichierCle }
    $t0 = Get-Date
    $n = Dechiffrer-Fichier $Dechiffrer $Vers $cle
    $cle = $null
    Write-Host ("{0} : {1:N1} Mo en clair, {2:N0} s (HMAC verifie avant dechiffrement)" -f $Vers, ($n / 1MB), ((Get-Date) - $t0).TotalSeconds)
}

if (-not $Creer -and -not $Verifier -and -not $Dechiffrer) { Write-Host 'Rien a faire : -Creer, -Verifier ou -Dechiffrer (voir l''en-tete du script).' }
