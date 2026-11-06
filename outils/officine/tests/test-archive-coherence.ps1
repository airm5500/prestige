<#
  TEST DE COHERENCE (regle du 05/11) des archives chiffrees des scripts (cas 4, lot 4.C) : archive-chiffree.ps1.

  Des milliers de contenus tires au hasard a graine fixe (tailles de 0 a plus d'un mega-octet, autour des multiples de
  16), chiffres puis dechiffres, verifies par des regles ecrites a part : aller-retour identique octet pour octet,
  taille exacte de l'archive (en-tete + blocs bourres + HMAC), en-tete attendu, deux archives du meme clair
  differentes, mauvaise cle et octet altere refuses avant tout octet rendu ; dechiffrement partiel (tete) ; passage
  par une commande (cmd) dans les deux sens ; cle DPAPI ecrite puis relue ; cles generees (alphabet, longueur, toutes
  differentes) ; vecteur produit par Prestige (Java) lu tel quel.

  -Defaut : defaut simule (le dechiffrement rend un octet de moins, comme un bourrage mal traite) : le test doit
  alors ECHOUER. Code de sortie 1 au premier ecart.

    powershell -ExecutionPolicy Bypass -File outils\officine\tests\test-archive-coherence.ps1
#>
param([switch]$Defaut, [int]$Cas = 2000)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\archive-chiffree.ps1')
# derivation rapide pour les milliers de cas (format : 1000 iterations au moins) ; quelques cas aux 200 000 reelles
$script:ARCHIVE_ITERATIONS = 1000
$res = @()
function Ok([string]$n, [bool]$c, [string]$d) {
    $script:res += [pscustomobject]@{ N = $n; C = $c }
    Write-Host ("{0}  {1}{2}" -f $(if ($c) { 'PASS' } else { 'FAIL' }), $n, $(if ($d) { "  [$($d.Substring(0, [math]::Min(400, $d.Length)))]" } else { '' }))
}
function Reference-Taille([long]$n) { return [long](8 + 16 + 16 + 4 + 16 * ([math]::Floor($n / 16) + 1) + 32) }
function Memes([byte[]]$a, [byte[]]$b) { if ($a.Length -ne $b.Length) { return $false }; for ($i = 0; $i -lt $a.Length; $i++) { if ($a[$i] -ne $b[$i]) { return $false } }; return $true }
if ($Defaut) {
    # defaut simule : un octet de moins au retour
    function Dechiffrer-Fichier([string]$fichier, [string]$sortie, [byte[]]$cle) {
        $s = New-Object System.IO.MemoryStream
        Dechiffrer-Vers $fichier $s $cle | Out-Null
        $o = $s.ToArray()
        [System.IO.File]::WriteAllBytes($sortie, $o[0..([math]::Max(0, $o.Length - 2))])
        return $o.Length - 1
    }
}
$d = Join-Path $env:TEMP ('test-archive-coherence-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $d | Out-Null
try {
    $r = New-Object System.Random(20261106)
    $cle = Octets-Cle 'ABCD-EFGH-JKLM-NPQR-STUV-WXYZ-2345-6789'
    $autre = Octets-Cle 'ABCD-EFGH-JKLM-NPQR-STUV-WXYZ-2345-678a'
    $src = Join-Path $d 'src.bin'; $enc = Join-Path $d 'src.aes'; $dec = Join-Path $d 'src.dec'
    $ecarts = @(); $vus = @{}; $refusesCle = 0; $refusesAlt = 0; $tailles = @{}
    $t0 = Get-Date
    for ($i = 0; $i -lt $Cas; $i++) {
        $n = if ($i % 100 -eq 0) { 1000000 + $r.Next(70000) } elseif ($i % 7 -eq 0) { $r.Next(64) } elseif ($i % 3 -eq 0) { [math]::Max(0, 16 * $r.Next(300) + $r.Next(3) - 1) } else { $r.Next(20000) }
        $b = New-Object byte[] $n; $r.NextBytes($b)
        [System.IO.File]::WriteAllBytes($src, $b)
        $lus = Chiffrer-Fichier $src $enc $cle
        $a = [System.IO.File]::ReadAllBytes($enc)
        if ($lus -ne $n) { $ecarts += "cas $i : $lus octets lus sur $n" }
        if ($a.Length -ne (Reference-Taille $n) -or $a.Length -ne (Taille-Chiffree $n)) { $ecarts += "cas $i : taille $($a.Length) pour n=$n (attendu $(Reference-Taille $n))" }
        if ([System.Text.Encoding]::ASCII.GetString($a, 0, 8) -ne 'PRSTGA01') { $ecarts += "cas $i : magie" }
        $it = ([int]$a[40] -shl 24) -bor ([int]$a[41] -shl 16) -bor ([int]$a[42] -shl 8) -bor [int]$a[43]
        if ($it -ne 1000) { $ecarts += "cas $i : iterations $it" }
        $selIv = [Convert]::ToBase64String($a[8..39])
        if ($vus.ContainsKey($selIv)) { $ecarts += "cas $i : sel et IV deja vus" } else { $vus[$selIv] = 1 }
        $ecrits = Dechiffrer-Fichier $enc $dec $cle
        $o = [System.IO.File]::ReadAllBytes($dec)
        if ($ecrits -ne $n -or -not (Memes $o $b)) { $ecarts += "cas $i : aller-retour different (n=$n, retour $($o.Length))" }
        $tailles["$([math]::Min(3, [math]::Floor($n / 10000)))"] = 1
        if ($i % 10 -eq 0) {
            try { Dechiffrer-Fichier $enc $dec $autre | Out-Null; $ecarts += "cas $i : mauvaise cle acceptee" } catch { $refusesCle++ }
        }
        if ($i % 10 -eq 5) {
            $k = $r.Next($a.Length); $a2 = [byte[]]$a.Clone(); $a2[$k] = $a2[$k] -bxor (1 -shl $r.Next(8))
            [System.IO.File]::WriteAllBytes($enc, $a2)
            try { Dechiffrer-Fichier $enc $dec $cle | Out-Null; $ecarts += "cas $i : alteration de l'octet $k acceptee" } catch { $refusesAlt++ }
        }
        if ($i % 200 -eq 0) {
            Chiffrer-Fichier $src "$enc.bis" $cle | Out-Null
            if (Memes $a ([System.IO.File]::ReadAllBytes("$enc.bis"))) { $ecarts += "cas $i : deux archives identiques" }
        }
        if ($ecarts.Count -gt 5) { break }
    }
    Ok "$Cas contenus (graine fixe, tailles 0 a 1 Mo, $($tailles.Count) ordres de grandeur) : aller-retour identique, taille exacte, en-tete, sel et IV jamais repetes, $refusesCle mauvaises cles et $refusesAlt alterations refusees ($([int]((Get-Date) - $t0).TotalSeconds) s)" ($ecarts.Count -eq 0 -and $refusesCle -eq [math]::Ceiling($Cas / 10) -and $refusesAlt -eq [math]::Floor($Cas / 10)) ($ecarts -join ' ; ')

    # troncatures et fichier etranger
    $b = [System.Text.Encoding]::UTF8.GetBytes('un contenu de plus de seize octets'); [System.IO.File]::WriteAllBytes($src, $b)
    Chiffrer-Fichier $src $enc $cle | Out-Null; $a = [System.IO.File]::ReadAllBytes($enc)
    $refus = 0
    foreach ($coupe in @(0, 10, 44, 60, ($a.Length - 1), ($a.Length - 33))) {
        [System.IO.File]::WriteAllBytes("$enc.t", $(if ($coupe -gt 0) { $a[0..($coupe - 1)] } else { New-Object byte[] 0 }))
        try { Dechiffrer-Fichier "$enc.t" $dec $cle | Out-Null } catch { $refus++ }
    }
    [System.IO.File]::WriteAllText("$enc.t", ('pas une archive, juste un texte assez long pour passer la taille minimale de 92 octets ' * 3))
    $m = ''; try { Dechiffrer-Fichier "$enc.t" $dec $cle | Out-Null } catch { $m = $_.Exception.Message }
    Ok 'Archive tronquee a 6 endroits et fichier etranger refuses, message explicite' ($refus -eq 6 -and $m -match "n'est pas une archive") $m

    # iterations reelles (200 000) : format par defaut, meme resultat
    $script:ARCHIVE_ITERATIONS = 200000
    $t0 = Get-Date
    Chiffrer-Fichier $src $enc $cle | Out-Null; $a = [System.IO.File]::ReadAllBytes($enc)
    $it = ([int]$a[40] -shl 24) -bor ([int]$a[41] -shl 16) -bor ([int]$a[42] -shl 8) -bor [int]$a[43]
    Dechiffrer-Fichier $enc $dec $cle | Out-Null
    Ok "Format par defaut : 200 000 iterations dans l'en-tete, aller-retour ($([int]((Get-Date) - $t0).TotalMilliseconds) ms)" ($it -eq 200000 -and (Memes ([System.IO.File]::ReadAllBytes($dec)) $b))
    $script:ARCHIVE_ITERATIONS = 1000

    # tete (prefixe) : les premiers octets du clair, sans tout dechiffrer
    $b = New-Object byte[] 300000; $r.NextBytes($b); [System.IO.File]::WriteAllBytes($src, $b)
    Chiffrer-Fichier $src $enc $cle | Out-Null
    $mem = New-Object System.IO.MemoryStream
    $np = Dechiffrer-PrefixeVers $enc $mem $cle 65536
    $p = $mem.ToArray()
    Ok "Prefixe : $np octets rendus sur 300 000, identiques au debut du clair" ($np -eq 65536 -and (Memes $p $b[0..65535]))
    try { Dechiffrer-PrefixeVers $enc $mem $autre 65536 | Out-Null; $okp = $false } catch { $okp = $true }
    Ok 'Prefixe : mauvaise cle refusee avant tout octet (HMAC entier verifie)' $okp

    # par une commande dans les deux sens : type -> chiffre ; dechiffre -> find /c /v "" (compte les lignes)
    $texte = (1..5000 | ForEach-Object { "ligne $_ : " + ('x' * ($r.Next(60))) }) -join "`r`n"
    [System.IO.File]::WriteAllText($src, $texte)
    $c1 = Chiffrer-Commande "type `"$src`"" $enc $cle
    Dechiffrer-Fichier $enc $dec $cle | Out-Null
    $c2 = Dechiffrer-VersCommande $enc "findstr /n `"^`" > `"$d\compte.txt`"" $cle
    $compte = [string]@(Get-Content "$d\compte.txt").Count
    Ok "Commande -> archive -> commande : codes $c1 / $c2, clair identique, 5000 lignes comptees par le lecteur" ($c1 -eq 0 -and $c2 -eq 0 -and ([System.IO.File]::ReadAllText($dec) -eq $texte) -and $compte -eq '5000') $compte

    # cle DPAPI ecrite puis relue ; cles generees
    $fc = Join-Path $d 'archive.cnf'
    Ecrire-CleArchive $fc $cle "$env:USERDOMAIN\$env:USERNAME"
    $txt = [System.IO.File]::ReadAllText($fc)
    $relue = Lire-CleArchive $fc
    Ok 'Cle DPAPI : fichier a en-tete, rien en clair, relue identique, comparaison a temps constant' ($txt.StartsWith($ENTETE_CLE_ARCHIVE) -and $txt.IndexOf('ABCD-EFGH') -lt 0 -and (Meme-Octets $cle $relue) -and -not (Meme-Octets $cle $autre))
    $cles = @{}; $mal = 0
    for ($i = 0; $i -lt 1000; $i++) { $k = Nouvelle-CleArchive; if ($k -notmatch '^([ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz]{4}-){7}[ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz]{4}$') { $mal++ }; $cles[$k] = 1 }
    $okSaisie = $true
    try { Octets-Cle 'ABCD-EFGH' | Out-Null; $okSaisie = $false } catch { }
    try { Octets-Cle 'ABCD-EFGH-JKLM-é' | Out-Null; $okSaisie = $false } catch { }
    if ([System.Text.Encoding]::ASCII.GetString((Octets-Cle " ABCD-EFGH-`nJKLM `r`n")) -ne 'ABCD-EFGH-JKLM') { $okSaisie = $false }
    Ok '1000 cles generees : 8 groupes de 4 sans 0/O/1/I/l, toutes differentes ; saisie : espaces retires, trop courte et accent refuses' ($mal -eq 0 -and $cles.Count -eq 1000 -and $okSaisie)

    # vecteur produit par Prestige (Java, ArchiveChiffree) : meme format
    $hex = Get-Content (Join-Path $PSScriptRoot 'vecteur-java.hex') -Raw
    $hex = $hex -replace '\s', ''
    $v = New-Object byte[] ($hex.Length / 2)
    for ($i = 0; $i -lt $v.Length; $i++) { $v[$i] = [Convert]::ToByte($hex.Substring(2 * $i, 2), 16) }
    [System.IO.File]::WriteAllBytes("$enc.java", $v)
    Dechiffrer-Fichier "$enc.java" $dec (Octets-Cle 'Essai-Cle-2026-ABCD-wxyz') | Out-Null
    $tj = [System.IO.File]::ReadAllText($dec)
    Ok 'Vecteur produit par Prestige (Java) dechiffre tel quel par les scripts' ($tj -eq 'Prestige lot 4.C : vecteur d essai Java -> PowerShell, meme format.') $tj
} finally {
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $d
}
$ko = @($res | Where-Object { -not $_.C }).Count
Write-Host ("`n{0}/{1} OK{2}" -f ($res.Count - $ko), $res.Count, $(if ($Defaut) { ' (defaut simule : le test doit echouer)' } else { '' }))
exit $(if ($ko) { 1 } else { 0 })
