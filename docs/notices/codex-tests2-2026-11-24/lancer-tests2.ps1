# Tests 2 (24/11/2026) : joue les tests d'écran de la liste un par un sur domain4 (laborex_audit).
# Aucun mot de passe ici : la connexion à la base est lue par les tests dans le domain.xml de PAYARA_DOMAINE.
param(
  [string]$Liste = 'liste-tests2.txt',
  [string]$Sortie = 'resultats-codex-tests2.txt',
  [string]$Racine = 'D:\projet\p3\prestige-integration',
  [string]$Base = 'http://localhost:11090/prestige',
  [string]$Db = 'laborex_audit',
  [string]$Domaine = 'D:/payara5/payara5/glassfish/domains/domain4'
)
$ici = Split-Path -Parent $MyInvocation.MyCommand.Path
$fListe = if ([IO.Path]::IsPathRooted($Liste)) { $Liste } else { Join-Path $ici $Liste }
$fSortie = if ([IO.Path]::IsPathRooted($Sortie)) { $Sortie } else { Join-Path $ici $Sortie }
$env:BASE = $Base; $env:DB_TEST = $Db; $env:E2E_BASE_LIBRE = '1'; $env:PAYARA_DOMAINE = $Domaine
$env:NODE_PATH = 'D:\outils-e2e\node_modules'; $env:PLAYWRIGHT_BROWSERS_PATH = 'D:\pw-browsers'; $env:E2E_CAPTURES = '0'
$tests = (Get-Content -Encoding utf8 $fListe -Raw).Trim().Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }
Set-Location (Join-Path $Racine 'src\test\e2e')
"Tests 2 du $(Get-Date -Format 'dd/MM/yyyy HH:mm') sur $Base ($Db), $($tests.Count) tests" | Out-File -Encoding utf8 $fSortie
$ok = 0
foreach ($t in $tests) {
  $debut = Get-Date
  $sortie = & node $t 2>&1 | ForEach-Object { "$_" }
  $code = $LASTEXITCODE
  if ($code -eq 0) { $ok++ }
  "=== $t" | Out-File -Append -Encoding utf8 $fSortie
  $sortie | Out-File -Append -Encoding utf8 $fSortie
  "--- code $code ($([int]((Get-Date) - $debut).TotalSeconds) s)" | Out-File -Append -Encoding utf8 $fSortie
  "$t : code $code"
}
"TOTAL : $ok / $($tests.Count) réussis" | Tee-Object -Append -FilePath $fSortie
