<#
  REGLAGES PAYARA DU SERVEUR DE L'OFFICINE (rapport docs/notices/RAPPORT_CHARGE_2026-10-29.md, par. 4.1 et 6).

  Ce que le script regle :
   - fils HTTP : 32 au plus, 8 au minimum (par defaut Payara n'en a que 5 : les etats lourds bloquent les caisses) ;
   - memoire Java (-Xmx, 4 Go par defaut) ;
   - image de la memoire si elle sature (-XX:+HeapDumpOnOutOfMemoryError), dans DossierDiagnostic ;
   - journal du ramasse-miettes (-Xlog:gc*), 5 fichiers de 20 Mo au plus, dans DossierDiagnostic ;
   - pool de connexions a la base : verification des connexions avant emploi (apres une coupure de MariaDB).
  Sur demande seulement :
   - -DelaisJdbc : delai de requete (300 s) et reprise des connexions oubliees (120 s). A ne poser que si aucun etat
     ne depasse ces durees (voir par. 6 du rapport : la suggestion depassait 10 min avant sa correction) ;
   - -ArretSurSaturation : -XX:+ExitOnOutOfMemoryError. Seulement si Payara tourne en service Windows a redemarrage
     automatique : sinon le serveur s'arrete et ne repart pas.

  Le script lit d'abord l'etat, n'ecrit rien avec -Lire, et peut etre relance sans risque (il remplace les options
  qu'il a deja posees). Les reglages s'appliquent au redemarrage du domaine (-Redemarrer, ou plus tard a la main).
  Aucun mot de passe n'est lu ni affiche.

  Exemples :
    .\1-configurer-payara.ps1 -Lire
    .\1-configurer-payara.ps1 -Xmx 6g -Redemarrer
    .\1-configurer-payara.ps1 -DelaisJdbc -ArretSurSaturation -Redemarrer
    .\1-configurer-payara.ps1 -Annuler        # retour aux valeurs d'origine (5 fils, sans diagnostic ni delais)
#>
param(
    [string]$Asadmin = 'D:\payara5\payara5\bin\asadmin.bat',
    [int]$PortAdmin = 4848,
    [string]$Domaine = 'domain1',
    [string]$Pool = 'laborex_pool',
    [int]$FilsMax = 32,
    [int]$FilsMin = 8,
    [string]$Xmx = '4g',
    [string]$DossierDiagnostic = 'D:\payara5\diagnostic',
    [switch]$DelaisJdbc,
    [int]$DelaiRequete = 300,
    [int]$DelaiConnexionOubliee = 120,
    [switch]$ArretSurSaturation,
    [switch]$Lire,
    [switch]$Annuler,
    [switch]$Redemarrer
)
$ErrorActionPreference = 'Stop'
$FILS = 'configs.config.server-config.thread-pools.thread-pool.http-thread-pool'
$JDBC = "resources.jdbc-connection-pool.$Pool"

function Asadmin {
    # PowerShell 5 traiterait toute ligne d'erreur d'asadmin comme fatale : seul son code de sortie compte
    $ErrorActionPreference = 'Continue'
    $sortie = & $Asadmin --port $PortAdmin @args 2>&1 | ForEach-Object { "$_" }
    if ($LASTEXITCODE -ne 0) { throw "asadmin $($args -join ' ') : $sortie" }
    return $sortie
}

function Etat {
    Write-Host "--- Fils HTTP"
    Asadmin get "$FILS.*" | Select-String -Pattern '(max|min)-thread-pool-size' | ForEach-Object { Write-Host "  $_" }
    Write-Host "--- Options Java concernees"
    Options | Where-Object { $_ -match '^-Xmx|HeapDump|ExitOnOutOfMemory|^-Xlog:gc' } | ForEach-Object { Write-Host "  $_" }
    Write-Host "--- Pool $Pool"
    Asadmin get "$JDBC.*" | Select-String -Pattern 'statement-timeout|connection-leak|connection-validation|validation-classname|max-pool-size' |
        Where-Object { $_ -notmatch 'password' } | ForEach-Object { Write-Host "  $_" }
}

function Options {
    # list-jvm-options ajoute parfois une note ("--> JDK versions") : on ne garde que l'option
    Asadmin list-jvm-options | Where-Object { $_ -match '^\[?.*?\]?-' -and $_ -notmatch 'executed successfully' } |
        ForEach-Object { ($_ -replace '\s+-->.*$', '').Trim() }
}

# asadmin separe les options par ":" : il faut l'echapper dans la valeur
function Echapper([string]$o) { return $o -replace ':', '\:' }

function RetirerOptions([string]$motif) {
    foreach ($o in (Options | Where-Object { $_ -match $motif })) {
        $nue = $o -replace '^\[[^\]]*\]', ''   # option reservee a une version du JDK : asadmin la retire sans le prefixe
        if ($o -ne $nue) { Write-Host "  (laissee : $o, propre a une version du JDK)"; continue }
        Asadmin delete-jvm-options (Echapper $o) | Out-Null
        Write-Host "  retiree : $o"
    }
}

function AjouterOption([string]$o) {
    Asadmin create-jvm-options (Echapper $o) | Out-Null
    Write-Host "  ajoutee : $o"
}

Write-Host "Domaine $Domaine, port d'administration $PortAdmin"
Write-Host "=== Avant"
Etat
if ($Lire) { return }

Write-Host "=== Reglage"
if ($Annuler) {
    Asadmin set "$FILS.max-thread-pool-size=5" "$FILS.min-thread-pool-size=5" | Out-Null
    RetirerOptions 'HeapDump|ExitOnOutOfMemory|^-Xlog:gc'
    # la memoire n'est remise que si -Xmx est donne (l'ancienne valeur figure dans "Avant" du premier passage)
    if ($PSBoundParameters.ContainsKey('Xmx')) { RetirerOptions '^-Xmx'; AjouterOption "-Xmx$Xmx" }
    Asadmin set "$JDBC.statement-timeout-in-seconds=-1" "$JDBC.connection-leak-timeout-in-seconds=0" `
        "$JDBC.connection-leak-reclaim=false" "$JDBC.is-connection-validation-required=false" | Out-Null
    Asadmin set "$JDBC.connection-validation-method=table" | Out-Null
} else {
    if ($FilsMin -gt $FilsMax) { throw "FilsMin ($FilsMin) superieur a FilsMax ($FilsMax)" }
    Asadmin set "$FILS.max-thread-pool-size=$FilsMax" "$FILS.min-thread-pool-size=$FilsMin" | Out-Null
    Write-Host "  fils HTTP : $FilsMin a $FilsMax"

    New-Item -ItemType Directory -Force -Path $DossierDiagnostic | Out-Null
    $d = $DossierDiagnostic -replace '\\', '/'
    RetirerOptions '^-Xmx|HeapDump|ExitOnOutOfMemory|^-Xlog:gc'
    AjouterOption "-Xmx$Xmx"
    AjouterOption '-XX:+HeapDumpOnOutOfMemoryError'
    AjouterOption "-XX:HeapDumpPath=$d"
    AjouterOption "-Xlog:gc*:file=$d/gc.log:time:filecount=5,filesize=20m"
    if ($ArretSurSaturation) {
        $service = Get-Service | Where-Object { $_.Name -match $Domaine -or $_.DisplayName -match $Domaine }
        if (-not $service) {
            Write-Warning "Aucun service Windows pour $Domaine : -XX:+ExitOnOutOfMemoryError non pose (le serveur ne repartirait pas). Creer d'abord le service : asadmin create-service $Domaine, puis le regler en redemarrage automatique (sc.exe failure)."
        } else {
            AjouterOption '-XX:+ExitOnOutOfMemoryError'
        }
    }

    # verification des connexions : la classe de Payara pour MySQL/MariaDB, sans table a creer
    # la methode d'abord : Payara refuse d'activer la verification tant que la methode "table" n'a pas de table
    Asadmin set "$JDBC.connection-validation-method=custom-validation" `
        "$JDBC.validation-classname=org.glassfish.api.jdbc.validation.MySQLConnectionValidation" | Out-Null
    Asadmin set "$JDBC.is-connection-validation-required=true" | Out-Null
    Write-Host "  pool $Pool : connexions verifiees avant emploi"
    if ($DelaisJdbc) {
        Asadmin set "$JDBC.statement-timeout-in-seconds=$DelaiRequete" `
            "$JDBC.connection-leak-timeout-in-seconds=$DelaiConnexionOubliee" "$JDBC.connection-leak-reclaim=true" | Out-Null
        Write-Host "  pool $Pool : delai de requete $DelaiRequete s, connexions oubliees reprises apres $DelaiConnexionOubliee s"
    }
}

Write-Host "=== Apres"
Etat
if ($Redemarrer) {
    Write-Host "=== Redemarrage de $Domaine"
    & $Asadmin restart-domain $Domaine
} else {
    Write-Host "Redemarrer le domaine pour appliquer : $Asadmin restart-domain $Domaine"
}
