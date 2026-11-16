<#
  LANCEUR DE CAISSE : OUVRE PRESTIGE SEULEMENT QUAND IL EST PRET (retour du 16/11).

  Constat : Windows affiche le service Payara « en cours d'execution » des que le processus est lance, alors que
  Prestige n'est pret que 2 a 3 minutes plus tard (deploiement, migrations, prechauffage). La caisse ouverte trop tot
  tombe sur une page d'erreur ou une page qui ne repond pas.

  Le lanceur remplace le raccourci de la caisse :
   - si Prestige est deja pret, il ouvre la caisse tout de suite, sans fenetre ;
   - sinon il affiche une petite fenetre « Prestige demarre » avec l'etape en cours et le temps ecoule, interroge
     api/v1/app/info toutes les 2 s et ouvre la caisse des que la reponse dit « pret » ;
   - si rien ne repond et que Prestige tourne sur ce poste (-Url sur localhost) : il demarre le service Windows
     s'il existe et qu'il est arrete ; sans service, ou si Windows refuse (compte sans droit d'administration), il lance
     lui-meme Payara (asadmin start-domain), une seule fois par essai. La fenetre dit ce qu'il a fait. Un serveur
     d'un autre poste n'est jamais demarre d'ici ;
   - au bout de -DelaiMax secondes sans reponse, la fenetre le dit et propose de reessayer ;
   - lance deux fois, il ne s'ouvre qu'une fois (la deuxieme copie s'arrete aussitot).
  Il ne lit ni n'ecrit aucun mot de passe et ne modifie rien sur le serveur.

  Etapes reconnues :
   arrete       : rien n'ecoute sur le port (Payara se lance) ;
   chargement   : Payara repond mais Prestige n'est pas encore deploye (404, 503) ;
   prechauffage : Prestige repond, « pret » vaut false (factory JPA, scripts des ecrans) ;
   pret         : « pret » vaut true, ou une version plus ancienne qui ne donne pas ce champ.

  Exemples :
    .\8-lanceur-caisse.ps1
    .\8-lanceur-caisse.ps1 -Url http://serveur:8080/prestige
    .\8-lanceur-caisse.ps1 -Navigateur 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentsNavigateur '--start-maximized {url}'
    .\8-lanceur-caisse.ps1 -CreerRaccourci          (raccourci « Prestige » sur le bureau, memes options)
#>
param(
    [string]$Url = 'http://localhost:8080/prestige',
    # vide : navigateur par defaut de Windows
    [string]$Navigateur = '',
    # {url} est remplace par l'adresse ; sans {url}, l'adresse est ajoutee a la fin
    [string]$ArgumentsNavigateur = '',
    [int]$DelaiMax = 600,
    [int]$Intervalle = 2,
    # service Windows a demarrer s'il est arrete ; vide : aucun
    [string]$NomService = 'domain1',
    # Payara lance par le lanceur quand il n'y a pas de service (ou que Windows refuse de le demarrer)
    [string]$Asadmin = 'D:\payara5\payara5\bin\asadmin.bat',
    [string]$Domaine = 'domain1',
    [switch]$SansFenetre,
    [switch]$CreerRaccourci,
    # fichier ou chaque changement d'etape est note (essais) ; vide : aucun
    [string]$Journal = ''
)
$ErrorActionPreference = 'Stop'
$Url = $Url.TrimEnd('/')

function Noter([string]$texte) {
    if ($Journal) { Add-Content -Path $Journal -Value ("{0:HH:mm:ss.fff} {1}" -f (Get-Date), $texte) -Encoding UTF8 }
    if ($SansFenetre) { Write-Host $texte }
}

function Sonder {
    # renvoie @{ Etat = 'arrete'|'chargement'|'prechauffage'|'pret' ; Secondes = duree du prechauffage ou $null }
    try {
        $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 -Uri "$Url/api/v1/app/info" -Headers @{ 'Cache-Control' = 'no-cache' }
    } catch [System.Net.WebException] {
        if ($_.Exception.Response) { return @{ Etat = 'chargement'; Secondes = $null } }
        return @{ Etat = 'arrete'; Secondes = $null }
    } catch {
        return @{ Etat = 'arrete'; Secondes = $null }
    }
    if ($r.StatusCode -ne 200) { return @{ Etat = 'chargement'; Secondes = $null } }
    try { $info = $r.Content | ConvertFrom-Json } catch { return @{ Etat = 'chargement'; Secondes = $null } }
    if ($info.PSObject.Properties.Name -contains 'pret' -and -not $info.pret) {
        return @{ Etat = 'prechauffage'; Secondes = $info.demarrageSecondes }
    }
    return @{ Etat = 'pret'; Secondes = $null }
}

function OuvrirCaisse {
    Noter "ouverture $Url"
    if ($Navigateur) {
        $arguments = if ($ArgumentsNavigateur -match '\{url\}') { $ArgumentsNavigateur.Replace('{url}', $Url) } else { "$ArgumentsNavigateur $Url".Trim() }
        Start-Process -FilePath $Navigateur -ArgumentList $arguments
    } else {
        Start-Process $Url
    }
}

function DemarrerPayara {
    # renvoie la phrase a montrer a la caissiere ('' : rien a dire, Payara demarre deja)
    $hote = ([Uri]$Url).Host.Trim('[', ']')
    if (@('localhost', '127.0.0.1', '::1', $env:COMPUTERNAME) -notcontains $hote) {
        Noter "serveur $hote : rien a demarrer sur ce poste"
        return "Le serveur Prestige ($hote) ne répond pas encore."
    }
    $refus = $false
    if ($NomService) {
        $s = Get-Service -Name $NomService -ErrorAction SilentlyContinue
        if ($s -and $s.Status -ne 'Stopped') {
            Noter "service $NomService $($s.Status)"
            return ''
        }
        if ($s) {
            try {
                Start-Service -Name $NomService
                Noter "service $NomService demarre"
                return 'Service Prestige démarré par le lanceur.'
            } catch {
                # compte de caisse sans droit d'administration : Payara est lance a la main, sous ce compte
                Noter "service $NomService arrete, demarrage refuse"
                $refus = $true
            }
        }
    }
    if (-not (Test-Path -LiteralPath $Asadmin)) {
        Noter "asadmin introuvable : $Asadmin"
        return "Payara introuvable ($Asadmin) : appelez le support."
    }
    Start-Process -FilePath $Asadmin -ArgumentList "start-domain $Domaine" -WindowStyle Hidden
    Noter "payara lance : start-domain $Domaine"
    if ($refus) { return 'Service arrêté (démarrage refusé) : Payara lancé par le lanceur.' }
    return 'Payara lancé par le lanceur.'
}

function Libelle($sonde) {
    switch ($sonde.Etat) {
        'arrete' { return 'Le serveur Prestige se lance...' }
        'chargement' { return 'Chargement de Prestige...' }
        'prechauffage' { return 'Préparation des écrans...' }
        default { return 'Prestige est prêt.' }
    }
}

if ($CreerRaccourci) {
    $bureau = [Environment]::GetFolderPath('CommonDesktopDirectory')
    $lien = Join-Path $bureau 'Prestige.lnk'
    $parametres = @("-NoProfile", "-ExecutionPolicy Bypass", "-WindowStyle Hidden", "-File `"$PSCommandPath`"")
    foreach ($nom in 'Url', 'Navigateur', 'ArgumentsNavigateur', 'NomService') {
        if ($PSBoundParameters.ContainsKey($nom)) { $parametres += "-$nom `"$((Get-Variable $nom).Value)`"" }
    }
    if ($PSBoundParameters.ContainsKey('DelaiMax')) { $parametres += "-DelaiMax $DelaiMax" }
    try {
        $shell = New-Object -ComObject WScript.Shell
        $raccourci = $shell.CreateShortcut($lien)
    } catch {
        $lien = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Prestige.lnk'
        $raccourci = (New-Object -ComObject WScript.Shell).CreateShortcut($lien)
    }
    $raccourci.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $raccourci.Arguments = $parametres -join ' '
    $raccourci.WorkingDirectory = Split-Path $PSCommandPath
    $raccourci.IconLocation = if ($Navigateur -and (Test-Path $Navigateur)) { "$Navigateur,0" } else { "$env:SystemRoot\System32\SHELL32.dll,13" }
    $raccourci.Description = 'Ouvre Prestige quand il est prêt'
    try { $raccourci.Save() } catch {
        # bureau commun refuse sans droit d'administration : bureau de l'utilisateur
        $lien = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Prestige.lnk'
        $copie = (New-Object -ComObject WScript.Shell).CreateShortcut($lien)
        foreach ($p in 'TargetPath', 'Arguments', 'WorkingDirectory', 'IconLocation', 'Description') { $copie.$p = $raccourci.$p }
        $copie.Save()
    }
    Write-Host "Raccourci cree : $lien"
    return
}

# une seule copie a la fois : un double clic de trop n'ouvre pas deux caisses
$verrou = New-Object System.Threading.Mutex($false, 'Local\PrestigeLanceurCaisse')
if (-not $verrou.WaitOne(0)) { Noter 'deja lance'; exit 0 }
try {
    $sonde = Sonder
    Noter "etape $($sonde.Etat)"
    if ($sonde.Etat -eq 'pret') { OuvrirCaisse; exit 0 }
    $script:cause = if ($sonde.Etat -eq 'arrete') { DemarrerPayara } else { '' }
    $debut = Get-Date

    if ($SansFenetre) {
        $dernier = $sonde.Etat
        while ($true) {
            if (((Get-Date) - $debut).TotalSeconds -ge $DelaiMax) { Noter "delai depasse ($DelaiMax s)"; exit 1 }
            Start-Sleep -Seconds $Intervalle
            $sonde = Sonder
            if ($sonde.Etat -ne $dernier) { Noter "etape $($sonde.Etat)"; $dernier = $sonde.Etat }
            if ($sonde.Etat -eq 'pret') { OuvrirCaisse; exit 0 }
        }
    }

    Add-Type -AssemblyName System.Windows.Forms, System.Drawing
    [System.Windows.Forms.Application]::EnableVisualStyles()
    $police = New-Object System.Drawing.Font('Segoe UI', 10)
    $form = New-Object System.Windows.Forms.Form
    $form.Text = 'Prestige'
    $form.ClientSize = New-Object System.Drawing.Size(440, 194)
    $form.StartPosition = 'CenterScreen'
    $form.FormBorderStyle = 'FixedDialog'
    $form.MaximizeBox = $false
    $form.MinimizeBox = $true
    $form.TopMost = $true
    $form.Font = $police

    $titre = New-Object System.Windows.Forms.Label
    $titre.Text = 'Prestige démarre'
    $titre.Font = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold)
    $titre.SetBounds(20, 14, 400, 28)
    $etape = New-Object System.Windows.Forms.Label
    $etape.SetBounds(20, 46, 400, 22)
    $aide = New-Object System.Windows.Forms.Label
    $aide.Text = "La caisse s'ouvrira toute seule dès qu'elle sera prête."
    $aide.ForeColor = [System.Drawing.Color]::DimGray
    $aide.SetBounds(20, 70, 400, 22)
    $ligneCause = New-Object System.Windows.Forms.Label
    $ligneCause.ForeColor = [System.Drawing.Color]::DarkSlateBlue
    $ligneCause.SetBounds(20, 94, 400, 22)
    $ligneCause.Text = $script:cause
    $barre = New-Object System.Windows.Forms.ProgressBar
    $barre.Style = 'Marquee'
    $barre.MarqueeAnimationSpeed = 30
    $barre.SetBounds(20, 124, 400, 14)
    $chrono = New-Object System.Windows.Forms.Label
    $chrono.ForeColor = [System.Drawing.Color]::DimGray
    $chrono.SetBounds(20, 154, 200, 22)
    $bouton = New-Object System.Windows.Forms.Button
    $bouton.Text = 'Fermer'
    $bouton.SetBounds(320, 150, 100, 30)
    $form.Controls.AddRange(@($titre, $etape, $aide, $ligneCause, $barre, $chrono, $bouton))
    # pas de CancelButton : Windows fermerait la fenetre a chaque clic, « Reessayer » compris. Echap ferme seulement.
    $form.KeyPreview = $true
    $form.Add_KeyDown({ if ($_.KeyCode -eq 'Escape') { Noter 'fermeture par la caissiere'; $form.Close() } })
    $etape.Text = Libelle $sonde

    $script:ouvrir = $false
    $script:dernier = $sonde.Etat
    $script:enEchec = $false
    $minuterie = New-Object System.Windows.Forms.Timer
    $minuterie.Interval = $Intervalle * 1000
    $bouton.Add_Click({
            if ($script:enEchec) {
                # « Réessayer » : on repart pour un délai complet
                $script:enEchec = $false
                $script:debutAttente = Get-Date
                $bouton.Text = 'Fermer'
                $titre.Text = 'Prestige démarre'
                $titre.ForeColor = [System.Drawing.SystemColors]::ControlText
                $barre.Style = 'Marquee'
                $aide.Text = "La caisse s'ouvrira toute seule dès qu'elle sera prête."
                Noter 'nouvel essai'
                $ligneCause.Text = if ((Sonder).Etat -eq 'arrete') { DemarrerPayara } else { '' }
                $minuterie.Start()
            } else {
                Noter 'fermeture par la caissiere'
                $form.Close()
            }
        })
    $script:debutAttente = $debut
    $minuterie.Add_Tick({
            $ecoule = [int]((Get-Date) - $script:debutAttente).TotalSeconds
            $chrono.Text = 'Attente : {0} min {1:00} s' -f [math]::Floor($ecoule / 60), ($ecoule % 60)
            $s = Sonder
            if ($s.Etat -ne $script:dernier) { Noter "etape $($s.Etat)"; $script:dernier = $s.Etat }
            $etape.Text = Libelle $s
            if ($s.Etat -eq 'pret') {
                $minuterie.Stop()
                $script:ouvrir = $true
                $form.Close()
            } elseif ($ecoule -ge $DelaiMax) {
                $minuterie.Stop()
                $script:enEchec = $true
                Noter "delai depasse ($DelaiMax s)"
                $titre.Text = 'Prestige ne répond pas'
                $titre.ForeColor = [System.Drawing.Color]::Firebrick
                $barre.Style = 'Continuous'
                $barre.Value = 0
                $aide.Text = "Redémarrez le PC ou appelez le support, puis réessayez."
                $bouton.Text = 'Réessayer'
            }
        })
    $form.Add_Shown({ $minuterie.Start() })
    [void]$form.ShowDialog()
    $minuterie.Dispose()
    if ($script:ouvrir) { OuvrirCaisse; exit 0 }
    exit 1
} finally {
    $verrou.ReleaseMutex()
    $verrou.Dispose()
}
