<#
  IDENTIFIANTS DU COMPTE DE SAUVEGARDE (cas 4, lot 4.A) : fonctions partagees par 2-configurer-mariadb.ps1,
  3-sauvegarde-complete.ps1, 4-copier-journal.ps1 et 6-essai-restauration.ps1 (chargees par « . »).

  Le fichier d'options du compte prestige_sauvegarde (C:\ProgramData\Prestige\sauvegarde.cnf) n'est plus en clair :
  il contient le texte [client] chiffre par DPAPI de Windows, portee machine (ProtectedData, LocalMachine) :
   - seul un programme qui tourne SUR CE POSTE et qui a le droit de lire le fichier (ACL : SYSTEM, administrateurs,
     et le compte de Payara s'il est autre) peut le dechiffrer : une copie emportee sur une cle ou un disque est
     illisible ;
   - la portee machine, et non utilisateur (ConvertFrom-SecureString sans cle), parce que le fichier est ecrit par
     l'administrateur qui installe, puis lu par SYSTEM (taches planifiees) et par le compte de Payara (sauvegarde
     integree de Prestige, parametre KEY_SECURITE_BASE = 1) : trois comptes differents.
  Le clair n'existe qu'en memoire, puis dans un fichier d'options temporaire du dossier prive
  C:\ProgramData\Prestige\prive (ACL : le seul compte qui lance le script), supprime a la fin, meme en cas d'erreur.
  Un fichier encore en clair ([client] en tete) est accepte tel quel (installation d'avant le lot 4.A) :
  2-configurer-mariadb.ps1 -Chiffrer le convertit.
#>
Add-Type -AssemblyName System.Security
$script:ENTETE_IDENTIFIANTS = '# Prestige : identifiants de sauvegarde chiffres (DPAPI)'

# texte [client] -> contenu du fichier chiffre (en-tete puis bloc DPAPI en base64)
function Chiffrer-Options([string]$clair) {
    $octets = [System.Text.Encoding]::UTF8.GetBytes($clair)
    $bloc = [System.Security.Cryptography.ProtectedData]::Protect($octets, $null, 'LocalMachine')
    return $script:ENTETE_IDENTIFIANTS + "`r`n" + [Convert]::ToBase64String($bloc) + "`r`n"
}

# contenu du fichier (chiffre, ou encore en clair) -> texte [client] ; jamais affiche, jamais journalise
function Dechiffrer-Options([string]$fichier) {
    if (-not (Test-Path $fichier)) { throw "fichier d'options introuvable : $fichier (2-configurer-mariadb.ps1 -CreerCompte)" }
    $texte = [System.IO.File]::ReadAllText($fichier)
    if ($texte -match '^\s*\[client\]') { return $texte }
    $b64 = (($texte -split "`r?`n") | Where-Object { $_.Trim() -and -not $_.Trim().StartsWith('#') }) -join ''
    try {
        $bloc = [Convert]::FromBase64String($b64)
        $octets = [System.Security.Cryptography.ProtectedData]::Unprotect($bloc, $null, 'LocalMachine')
    } catch {
        throw "identifiants de sauvegarde illisibles sur ce poste ($fichier) : relancer 2-configurer-mariadb.ps1 -CreerCompte"
    }
    return [System.Text.Encoding]::UTF8.GetString($octets)
}

# dossier prive : SYSTEM, administrateurs et le compte courant ; les fichiers qu'on y cree n'ont que le compte courant
function Dossier-Prive {
    $d = Join-Path $env:ProgramData 'Prestige\prive'
    New-Item -ItemType Directory -Force -Path $d | Out-Null
    $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    icacls $d /inheritance:r /grant:r "*S-1-5-18:(OI)(CI)F" "*S-1-5-32-544:(OI)(CI)F" "*${sid}:(OI)(CI)F" | Out-Null
    return $d
}

# fichier d'options temporaire en clair, lisible par le seul compte courant ; a supprimer par l'appelant (finally)
function Options-Temporaires([string]$fichier) {
    $clair = Dechiffrer-Options $fichier
    $d = Dossier-Prive
    $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
    $f = Join-Path $d ('options-' + [guid]::NewGuid().ToString('N') + '.cnf')
    [System.IO.File]::WriteAllText($f, '')
    icacls $f /inheritance:r /grant:r "*${sid}:F" | Out-Null
    [System.IO.File]::WriteAllText($f, $clair, (New-Object System.Text.UTF8Encoding($false)))
    $clair = $null
    return $f
}

function Retirer-OptionsTemporaires([string]$f) {
    if ($f -and (Test-Path $f)) { Remove-Item -Force -ErrorAction SilentlyContinue $f }
}
