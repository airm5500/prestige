<#
  ARCHIVES DE SAUVEGARDE CHIFFREES (cas 4, lot 4.C, S6) : fonctions partagees par 3-sauvegarde-complete.ps1,
  4-copier-journal.ps1, 6-essai-restauration.ps1 et 7-cle-archive.ps1 (chargees par « . »).

  Derriere KEY_SECURITE_BASE = 1 : le .sql.zst (ou .rar) et les journaux binaires sont chiffres AVANT toute copie.
  A 0 : aucune de ces fonctions n'est appelee, les fichiers sont produits comme avant, octet pour octet.

  Format d'une archive chiffree (suffixe .aes), le meme que celui lu et ecrit par Prestige (classe Java
  rest.service.impl.securite.ArchiveChiffree) :
     8 octets  'PRSTGA01'                      (magie et version)
    16 octets  sel                             (tire au hasard pour chaque fichier)
    16 octets  vecteur d'initialisation        (tire au hasard pour chaque fichier)
     4 octets  nombre d'iterations PBKDF2, gros-boutiste
     ...       AES-256-CBC, bourrage PKCS7, du contenu
    32 octets  HMAC-SHA256 de tout ce qui precede
  Cles : PBKDF2-HMAC-SHA256(cle du pharmacien, sel, iterations) -> 64 octets : 32 pour AES, 32 pour le HMAC.
  Le HMAC est verifie en entier AVANT de dechiffrer quoi que ce soit (deux lectures du fichier) : une archive
  alteree ou une mauvaise cle sont refusees sans ecrire un seul octet en clair.

  La cle (Q4.3) : 32 caracteres tires au hasard par 7-cle-archive.ps1, affiches UNE fois au pharmacien qui les
  garde hors du serveur (coffre, papier, cle USB). Sur le serveur elle n'existe que chiffree par DPAPI (portee
  machine, meme mecanisme que identifiants-sauvegarde.ps1) dans C:\ProgramData\Prestige\archive.cnf, lisible par
  SYSTEM, les administrateurs et le compte de Payara. Jamais en clair sur le disque, jamais dans un journal.
#>
Add-Type -AssemblyName System.Security
$script:ENTETE_CLE_ARCHIVE = '# Prestige : cle des archives chiffrees (DPAPI)'
$script:ARCHIVE_MAGIE = [System.Text.Encoding]::ASCII.GetBytes('PRSTGA01')
$script:ARCHIVE_ITERATIONS = 200000
$script:ARCHIVE_SUFFIXE = '.aes'
$script:ARCHIVE_ENTETE = 44   # 8 + 16 + 16 + 4
$script:ARCHIVE_HMAC = 32
$script:ARCHIVE_TAMPON = 1048576
$script:FICHIER_CLE_ARCHIVE = 'C:\ProgramData\Prestige\archive.cnf'

# taille exacte d'une archive chiffree d'apres la taille du clair (en-tete + blocs AES bourres + HMAC)
function Taille-Chiffree([long]$clair) {
    return [long]($script:ARCHIVE_ENTETE + ([math]::Floor($clair / 16) + 1) * 16 + $script:ARCHIVE_HMAC)
}

function Est-ArchiveChiffree([string]$nom) {
    return $nom.EndsWith($script:ARCHIVE_SUFFIXE, [System.StringComparison]::OrdinalIgnoreCase)
}

# KEY_SECURITE_BASE lu dans la base par le client mariadb et un fichier d'options en clair ; '0' si illisible
function Securite-Base([string]$client, [string]$options, [string]$base) {
    $ErrorActionPreference = 'Continue'
    $v = (& $client "--defaults-extra-file=$options" -N -B -e "SELECT str_VALUE FROM ``$base``.t_parameters WHERE str_KEY = 'KEY_SECURITE_BASE'" 2>&1)
    $code = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    if ($code -ne 0) { return '0' }
    return "$v".Trim()
}

# ----------------------------------------------------------------------------------------------------- la cle

# 32 caracteres en 8 groupes de 4 (lisibles sur papier : ni 0/O, ni 1/I/l), tires par le generateur cryptographique
function Nouvelle-CleArchive {
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz'
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $b = New-Object byte[] 1
    $borne = $alphabet.Length * [math]::Floor(256 / $alphabet.Length)
    $s = ''
    for ($i = 0; $i -lt 32; $i++) {
        do { $rng.GetBytes($b); $v = [int]$b[0] } while ($v -ge $borne)
        $s += $alphabet[$v % $alphabet.Length]
        if ($i % 4 -eq 3 -and $i -lt 31) { $s += '-' }
    }
    return $s
}

# la cle telle que le pharmacien la tape (espaces et sauts de ligne retires) -> octets
function Octets-Cle([string]$cle) {
    $c = ($cle -replace '\s', '')
    if ($c.Length -lt 12) { throw 'cle trop courte (12 caracteres au moins)' }
    # ASCII seulement : Prestige (Java) derive la cle des memes octets
    if ($c -match '[^\x21-\x7e]') { throw 'cle des archives : lettres, chiffres et tirets seulement (pas d''accent)' }
    return [System.Text.Encoding]::UTF8.GetBytes($c)
}

# ecrit le fichier de la cle : en-tete, puis le bloc DPAPI (portee machine) en base64 ; droits SYSTEM,
# administrateurs et le compte de Payara s'il est donne (DOMAINE\compte)
function Ecrire-CleArchive([string]$fichier, [byte[]]$cle, [string]$comptePayara) {
    New-Item -ItemType Directory -Force -Path (Split-Path $fichier -Parent) | Out-Null
    if (Test-Path $fichier) {
        $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
        icacls $fichier /grant "*${sid}:F" 2>&1 | Out-Null
        Remove-Item -Force $fichier
    }
    $bloc = [System.Security.Cryptography.ProtectedData]::Protect($cle, $null, 'LocalMachine')
    $texte = $script:ENTETE_CLE_ARCHIVE + "`r`n" + [Convert]::ToBase64String($bloc) + "`r`n"
    [System.IO.File]::WriteAllText($fichier, $texte, (New-Object System.Text.UTF8Encoding($false)))
    $droits = @('/inheritance:r', '/grant:r', '*S-1-5-18:F', '*S-1-5-32-544:F')
    if ($comptePayara) { $droits += "${comptePayara}:R" }
    icacls $fichier @droits | Out-Null
}

# octets de la cle lus dans le fichier chiffre ; message sans valeur en cas d'echec
function Lire-CleArchive([string]$fichier) {
    if (-not (Test-Path $fichier)) { throw "cle des archives introuvable : $fichier (7-cle-archive.ps1 -Creer)" }
    $texte = [System.IO.File]::ReadAllText($fichier)
    $b64 = (($texte -split "`r?`n") | Where-Object { $_.Trim() -and -not $_.Trim().StartsWith('#') }) -join ''
    try {
        $bloc = [Convert]::FromBase64String($b64)
        return [System.Security.Cryptography.ProtectedData]::Unprotect($bloc, $null, 'LocalMachine')
    } catch {
        throw "cle des archives illisible sur ce poste ($fichier) : relancer 7-cle-archive.ps1 -Creer, ou saisir la cle gardee hors du serveur"
    }
}

# comparaison a temps constant de deux suites d'octets (cles, HMAC)
function Meme-Octets([byte[]]$a, [byte[]]$b) {
    if ($a.Length -ne $b.Length) { return $false }
    $d = 0
    for ($i = 0; $i -lt $a.Length; $i++) { $d = $d -bor ($a[$i] -bxor $b[$i]) }
    return ($d -eq 0)
}

# ----------------------------------------------------------------------------------------------------- derivation

function Deriver-Cles([byte[]]$cle, [byte[]]$sel, [int]$iterations) {
    $d = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($cle, $sel, $iterations, [System.Security.Cryptography.HashAlgorithmName]::SHA256)
    try {
        $o = $d.GetBytes(64)
        return @{ Aes = [byte[]]$o[0..31]; Mac = [byte[]]$o[32..63] }
    } finally { $d.Dispose() }
}

function Entier-GrosBoutiste([int]$n) {
    $o = [BitConverter]::GetBytes($n)
    if ([BitConverter]::IsLittleEndian) { [array]::Reverse($o) }
    return $o
}

function Nouvel-Aes([byte[]]$cleAes, [byte[]]$iv) {
    $aes = [System.Security.Cryptography.Aes]::Create()
    $aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
    $aes.Padding = [System.Security.Cryptography.PaddingMode]::PKCS7
    $aes.KeySize = 256
    $aes.Key = $cleAes
    $aes.IV = $iv
    return $aes
}

# ----------------------------------------------------------------------------------------------------- chiffrement

# chiffre tout ce que donne le flux d'entree dans le fichier de sortie ; renvoie le nombre d'octets en clair lus
function Chiffrer-Flux([System.IO.Stream]$entree, [string]$sortie, [byte[]]$cle) {
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $sel = New-Object byte[] 16; $rng.GetBytes($sel)
    $iv = New-Object byte[] 16; $rng.GetBytes($iv)
    $k = Deriver-Cles $cle $sel $script:ARCHIVE_ITERATIONS
    $aes = Nouvel-Aes $k.Aes $iv
    $hmac = New-Object System.Security.Cryptography.HMACSHA256(, $k.Mac)
    $f = [System.IO.File]::Create($sortie)
    $enc = $aes.CreateEncryptor()
    $lus = [long]0
    try {
        $entete = [byte[]]($script:ARCHIVE_MAGIE + $sel + $iv + (Entier-GrosBoutiste $script:ARCHIVE_ITERATIONS))
        $f.Write($entete, 0, $entete.Length)
        $hmac.TransformBlock($entete, 0, $entete.Length, $null, 0) | Out-Null
        $tampon = New-Object byte[] $script:ARCHIVE_TAMPON
        $chiffre = New-Object byte[] $script:ARCHIVE_TAMPON
        # TransformBlock ne prend que des blocs entiers de 16 : le reste ($reste octets en tete du tampon) attend
        $reste = 0
        while (($n = $entree.Read($tampon, $reste, $tampon.Length - $reste)) -gt 0) {
            $lus += $n
            $total = $reste + $n
            $entiers = $total - ($total % 16)
            if ($entiers -gt 0) {
                $m = $enc.TransformBlock($tampon, 0, $entiers, $chiffre, 0)
                $f.Write($chiffre, 0, $m)
                $hmac.TransformBlock($chiffre, 0, $m, $null, 0) | Out-Null
            }
            $reste = $total - $entiers
            if ($reste -gt 0) { [array]::Copy($tampon, $entiers, $tampon, 0, $reste) }
        }
        $dernier = $enc.TransformFinalBlock($tampon, 0, $reste)
        $f.Write($dernier, 0, $dernier.Length)
        $hmac.TransformBlock($dernier, 0, $dernier.Length, $null, 0) | Out-Null
        $hmac.TransformFinalBlock((New-Object byte[] 0), 0, 0) | Out-Null
        $f.Write($hmac.Hash, 0, $hmac.Hash.Length)
    } finally {
        $f.Dispose(); $enc.Dispose(); $aes.Dispose(); $hmac.Dispose()
    }
    return $lus
}

function Chiffrer-Fichier([string]$source, [string]$sortie, [byte[]]$cle) {
    $s = [System.IO.File]::OpenRead($source)
    try { return Chiffrer-Flux $s $sortie $cle } finally { $s.Dispose() }
}

# lance « cmd /c <commande> » et chiffre sa sortie standard (octets bruts) dans le fichier ; renvoie le code de sortie
# de cmd (celui du dernier programme du tube). Rien en clair ne touche le disque.
function Chiffrer-Commande([string]$commande, [string]$sortie, [byte[]]$cle) {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'cmd.exe'
    # la commande entiere entre guillemets : cmd garde alors ceux des programmes et des chemins qu'elle contient
    $psi.Arguments = '/c "' + $commande + '"'
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $p = [System.Diagnostics.Process]::Start($psi)
    try {
        Chiffrer-Flux $p.StandardOutput.BaseStream $sortie $cle | Out-Null
        $p.WaitForExit()
        return $p.ExitCode
    } finally { $p.Dispose() }
}

# ----------------------------------------------------------------------------------------------------- dechiffrement

# lit l'en-tete et verifie le HMAC de tout le fichier (premiere lecture) ; renvoie les cles derivees et l'IV, ou leve
function Verifier-Archive([string]$fichier, [byte[]]$cle) {
    $f = [System.IO.File]::OpenRead($fichier)
    try {
        if ($f.Length -lt ($script:ARCHIVE_ENTETE + 16 + $script:ARCHIVE_HMAC)) { throw "archive tronquee : $fichier" }
        $entete = New-Object byte[] $script:ARCHIVE_ENTETE
        if ($f.Read($entete, 0, $entete.Length) -ne $entete.Length) { throw "archive tronquee : $fichier" }
        for ($i = 0; $i -lt 8; $i++) { if ($entete[$i] -ne $script:ARCHIVE_MAGIE[$i]) { throw "ce fichier n'est pas une archive chiffree Prestige : $fichier" } }
        $sel = [byte[]]$entete[8..23]; $iv = [byte[]]$entete[24..39]
        $it = ([int]$entete[40] -shl 24) -bor ([int]$entete[41] -shl 16) -bor ([int]$entete[42] -shl 8) -bor [int]$entete[43]
        if ($it -lt 1000 -or $it -gt 10000000) { throw "en-tete d'archive invalide : $fichier" }
        $longueur = $f.Length - $script:ARCHIVE_ENTETE - $script:ARCHIVE_HMAC
        if ($longueur % 16 -ne 0) { throw "archive tronquee : $fichier" }
        $k = Deriver-Cles $cle $sel $it
        $hmac = New-Object System.Security.Cryptography.HMACSHA256(, $k.Mac)
        $hmac.TransformBlock($entete, 0, $entete.Length, $null, 0) | Out-Null
        $reste = $longueur
        $tampon = New-Object byte[] $script:ARCHIVE_TAMPON
        while ($reste -gt 0) {
            $n = $f.Read($tampon, 0, [int][math]::Min($tampon.Length, $reste))
            if ($n -le 0) { throw "archive tronquee : $fichier" }
            $hmac.TransformBlock($tampon, 0, $n, $null, 0) | Out-Null
            $reste -= $n
        }
        $hmac.TransformFinalBlock((New-Object byte[] 0), 0, 0) | Out-Null
        $attendu = New-Object byte[] $script:ARCHIVE_HMAC
        if ($f.Read($attendu, 0, $attendu.Length) -ne $attendu.Length) { throw "archive tronquee : $fichier" }
        if (-not (Meme-Octets $hmac.Hash $attendu)) { throw "mauvaise cle ou archive alteree : $fichier" }
        return @{ Aes = $k.Aes; Iv = $iv; Longueur = $longueur }
    } finally { $f.Dispose() }
}

# dechiffre (seconde lecture, apres Verifier-Archive) vers un flux de sortie ; renvoie le nombre d'octets en clair
function Dechiffrer-Vers([string]$fichier, [System.IO.Stream]$sortie, [byte[]]$cle) {
    $v = Verifier-Archive $fichier $cle
    $aes = Nouvel-Aes $v.Aes $v.Iv
    $dec = $aes.CreateDecryptor()
    $f = [System.IO.File]::OpenRead($fichier)
    $ecrits = [long]0
    try {
        $f.Position = $script:ARCHIVE_ENTETE
        $reste = $v.Longueur
        $tampon = New-Object byte[] $script:ARCHIVE_TAMPON
        $clair = New-Object byte[] $script:ARCHIVE_TAMPON
        # le dernier bloc (bourrage) passe par TransformFinalBlock : on le garde pour la fin
        while ($reste -gt 16) {
            $n = $f.Read($tampon, 0, [int][math]::Min($tampon.Length, $reste - 16))
            if ($n -le 0) { throw "archive tronquee : $fichier" }
            $m = $dec.TransformBlock($tampon, 0, $n, $clair, 0)
            $sortie.Write($clair, 0, $m)
            $ecrits += $m
            $reste -= $n
        }
        if ($f.Read($tampon, 0, 16) -ne 16) { throw "archive tronquee : $fichier" }
        $dernier = $dec.TransformFinalBlock($tampon, 0, 16)
        $sortie.Write($dernier, 0, $dernier.Length)
        $ecrits += $dernier.Length
        $sortie.Flush()
    } finally { $f.Dispose(); $dec.Dispose(); $aes.Dispose() }
    return $ecrits
}

# dechiffre les $max premiers octets du chiffre seulement (apres verification du HMAC entier) : pour lire la tete
# d'une archive sans tout dechiffrer ; sans bourrage final (le dernier bloc entier n'est pas rendu si tronque)
function Dechiffrer-PrefixeVers([string]$fichier, [System.IO.Stream]$sortie, [byte[]]$cle, [long]$max) {
    $v = Verifier-Archive $fichier $cle
    if ($v.Longueur -le $max + 32) { return Dechiffrer-Vers $fichier $sortie $cle }
    $aes = Nouvel-Aes $v.Aes $v.Iv
    $dec = $aes.CreateDecryptor()
    $f = [System.IO.File]::OpenRead($fichier)
    $ecrits = [long]0
    try {
        $f.Position = $script:ARCHIVE_ENTETE
        # le dechiffreur CBC retient toujours un bloc (bourrage) : un bloc de plus est lu pour rendre $max octets
        $reste = $max - ($max % 16) + 16
        $tampon = New-Object byte[] ($script:ARCHIVE_TAMPON + 16)
        $clair = New-Object byte[] ($script:ARCHIVE_TAMPON + 16)
        while ($reste -gt 0) {
            $n = $f.Read($tampon, 0, [int][math]::Min($tampon.Length, $reste))
            if ($n -le 0) { break }
            $m = $dec.TransformBlock($tampon, 0, $n, $clair, 0)
            $sortie.Write($clair, 0, $m)
            $ecrits += $m
            $reste -= $n
        }
        $sortie.Flush()
    } finally { $f.Dispose(); $dec.Dispose(); $aes.Dispose() }
    return $ecrits
}

function Dechiffrer-Fichier([string]$fichier, [string]$sortie, [byte[]]$cle) {
    $s = [System.IO.File]::Create($sortie)
    try { return Dechiffrer-Vers $fichier $s $cle } finally { $s.Dispose() }
}

# dechiffre l'archive vers l'entree standard de « cmd /c <commande> » (ex. zstd -dc | mariadb ...) ; code de sortie
function Dechiffrer-VersCommande([string]$fichier, [string]$commande, [byte[]]$cle) {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'cmd.exe'
    # la commande entiere entre guillemets : cmd garde alors ceux des programmes et des chemins qu'elle contient
    $psi.Arguments = '/c "' + $commande + '"'
    $psi.UseShellExecute = $false
    $psi.RedirectStandardInput = $true
    $p = [System.Diagnostics.Process]::Start($psi)
    try {
        try { Dechiffrer-Vers $fichier $p.StandardInput.BaseStream $cle | Out-Null } catch [System.IO.IOException] { <# le lecteur a ferme le tube : son code de sortie dira pourquoi #> }
        try { $p.StandardInput.Close() } catch { }
        $p.WaitForExit()
        return $p.ExitCode
    } finally { $p.Dispose() }
}
