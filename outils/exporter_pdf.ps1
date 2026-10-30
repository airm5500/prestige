# Ajuste la hauteur des lignes d'un classeur de recette et l'exporte en PDF (une page par feuille), avec Excel.
#   powershell -File outils\exporter_pdf.ps1 -Classeur <chemin.xlsx> -Pdf <chemin.pdf>
param([Parameter(Mandatory = $true)][string]$Classeur, [Parameter(Mandatory = $true)][string]$Pdf)
$Classeur = (Resolve-Path $Classeur).Path
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
    $wb = $excel.Workbooks.Open($Classeur)
    foreach ($ws in $wb.Worksheets) {
        # hauteur des lignes du tableau selon le texte (openpyxl ne la calcule pas) ; les lignes d'en-tete fusionnees
        # (1 a 4) gardent la hauteur posee par le generateur, Excel ne sachant pas ajuster une cellule fusionnee
        $der = $ws.UsedRange.Row + $ws.UsedRange.Rows.Count - 1
        if ($der -ge 5) { $ws.Range("A5:A$der").EntireRow.AutoFit() | Out-Null }
        $ws.PageSetup.Zoom = $false
        $ws.PageSetup.FitToPagesWide = 1
        $ws.PageSetup.FitToPagesTall = 1
    }
    $wb.Worksheets.Item(1).Activate()
    $wb.Save()
    # 0 = xlTypePDF
    $wb.ExportAsFixedFormat(0, $Pdf)
    $wb.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}
