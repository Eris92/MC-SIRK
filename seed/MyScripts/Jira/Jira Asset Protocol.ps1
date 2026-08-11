# Jira Asset Protocol|Generuje chroniony protokół PDF na podstawie aktualnych danych Jira Assets.
# PL: Protokół Jira Asset|Wybierz użytkownika, przypisany sprzęt, tryb operacji i osobę IT.
# EN: Jira Asset Protocol|Select a Jira user, assigned asset, operation type and IT person.
# VariableUserRequired: $JiraUser, Użytkownik Jira|Dane są pobierane z aktualnego profilu Jira i cache MC-SIRK.
# VariableAssetRequired: $PcName, Sprzęt|Lista jest zawężona do sprzętu przypisanego do wybranego użytkownika.
# VariableSwitchRequired: $IsTransferProtocol, false, Przekazanie sprzętu|Włącz dla przekazania; wyłącz dla zwrotu.
# VariableUserRequired: $ItPerson, Osoba IT|Możesz wybrać osobę z Jira albo wpisać bezpieczną wartość własną.
# SirkWorkflow: JiraAssetProtocol
# SirkSystemCredential: Jira
# SirkAllowCustom: ItPerson
# SirkJiraAssetAql: objectType = Computer
# SirkJiraAssetLabelAttribute: Hostname
# SirkJiraAssetUserVariable: JiraUser
# MultiHost: false
# runAsUser: 0

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

function Get-ProtocolValue {
    param([object]$Value)
    if ($null -eq $Value) { return '' }
    return [string]$Value
}

function Encode-Html {
    param([object]$Value)
    return [System.Net.WebUtility]::HtmlEncode((Get-ProtocolValue $Value))
}

$assets = @()
if (-not [string]::IsNullOrWhiteSpace($env:SIRK_PROTOCOL_ASSETS_JSON)) {
    $parsedAssets = ConvertFrom-Json -InputObject $env:SIRK_PROTOCOL_ASSETS_JSON
    if ($parsedAssets -is [System.Array]) { $assets = @($parsedAssets) }
    elseif ($null -ne $parsedAssets) { $assets = @($parsedAssets) }
}
if ($assets.Count -eq 0) { throw 'Brak znormalizowanych danych sprzętu.' }

$transfer = [string]::Equals($env:SIRK_PROTOCOL_MODE, 'transfer', [System.StringComparison]::OrdinalIgnoreCase)
$modeLabel = if ($transfer) { 'PRZEKAZANIA SPRZĘTU' } else { 'ZWROTU SPRZĘTU' }
$title = 'PROTOKÓŁ ' + $modeLabel
$jiraUser = Get-ProtocolValue $JiraUser
$itPerson = Get-ProtocolValue $ItPerson
$dateText = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')

$rows = foreach ($asset in $assets) {
    $hostname = Encode-Html $asset.hostname
    $model = Encode-Html $asset.model
    $serial = Encode-Html $asset.serialNumber
    $inventory = Encode-Html $asset.inventoryNumber
    $objectKey = Encode-Html $asset.objectKey
    '<tr><td>' + $hostname + '</td><td>' + $model + '</td><td>' + $serial + '</td><td>' + $inventory + '</td><td>' + $objectKey + '</td></tr>'
}

$html = @"
<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<title>$(Encode-Html $title)</title>
<style>
body { font-family: Arial, sans-serif; margin: 36px; color: #111; }
h1 { text-align: center; font-size: 20px; margin-bottom: 28px; }
.meta { margin-bottom: 20px; }
.meta div { margin: 5px 0; }
table { width: 100%; border-collapse: collapse; margin-top: 18px; }
th, td { border: 1px solid #555; padding: 7px; font-size: 11px; text-align: left; }
th { background: #eee; }
.signatures { display: flex; gap: 60px; margin-top: 70px; }
.signature { flex: 1; border-top: 1px solid #333; padding-top: 8px; text-align: center; }
</style>
</head>
<body>
<h1>$(Encode-Html $title)</h1>
<div class="meta">
<div><strong>Data:</strong> $(Encode-Html $dateText)</div>
<div><strong>Użytkownik Jira:</strong> $(Encode-Html $jiraUser)</div>
<div><strong>Osoba IT:</strong> $(Encode-Html $itPerson)</div>
</div>
<table>
<thead><tr><th>Hostname</th><th>Model</th><th>Serial</th><th>Inventory</th><th>Asset key</th></tr></thead>
<tbody>$($rows -join [Environment]::NewLine)</tbody>
</table>
<div class="signatures">
<div class="signature">Użytkownik</div>
<div class="signature">IT</div>
</div>
</body>
</html>
"@

$outputPath = $env:SIRK_PROTOCOL_HTML_PATH
if ([string]::IsNullOrWhiteSpace($outputPath)) { throw 'Brak ścieżki wyjściowej protokołu.' }
[System.IO.File]::WriteAllText($outputPath, $html, [System.Text.UTF8Encoding]::new($false))

[pscustomobject]@{
    status = 'ok'
    mode = if ($transfer) { 'transfer' } else { 'return' }
    jiraUser = $jiraUser
    itPerson = $itPerson
    assets = $assets.Count
    htmlPath = $outputPath
} | ConvertTo-Json -Depth 5