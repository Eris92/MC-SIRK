# Jira Asset Protocol|Generuje chroniony protokół PDF na podstawie aktualnych danych Jira Assets.
# PL: Protokół Jira Asset|Wybierz użytkownika, przypisany sprzęt, tryb operacji i osobę IT.
# EN: Jira Asset Protocol|Select a Jira user, assigned asset, operation type and IT person.
# VariableUserRequired: $JiraUser, Użytkownik Jira|Dane są pobierane z aktualnego profilu Jira i cache MC-SIRK.
# VariableAssetRequired: $PcName, Sprzęt|Lista jest zawężona do sprzętu przypisanego do wybranego użytkownika.
# VariableSwitchRequired: $IsTransferProtocol, false, Przekazanie sprzętu|Włącz dla przekazania; wyłącz dla zwrotu.
# VariableUserRequired: $ItPerson, Osoba IT|Lista użytkowników MeshCentral; domyślnie aktualnie zalogowany operator.
# SirkWorkflow: JiraAssetProtocol
# SirkSystemCredential: Jira
# SirkJiraAssetAql: objectType in objectTypeAndChildren("Sprzęt użytkownika") OR objectType = "Users" OR object HAVING outboundReferences(objectType = "Users") OR object HAVING inboundReferences(objectType = "Users")
# SirkJiraAssetLabelAttribute: Nazwa_sieciowa
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

$assets = @()
if (-not [string]::IsNullOrWhiteSpace($env:SIRK_PROTOCOL_ASSETS_JSON)) {
    $parsedAssets = ConvertFrom-Json -InputObject $env:SIRK_PROTOCOL_ASSETS_JSON
    if ($parsedAssets -is [System.Array]) { $assets = @($parsedAssets) }
    elseif ($null -ne $parsedAssets) { $assets = @($parsedAssets) }
}
if ($assets.Count -eq 0) { throw 'Brak znormalizowanych danych sprzętu.' }

$transfer = [string]::Equals($env:SIRK_PROTOCOL_MODE, 'transfer', [System.StringComparison]::OrdinalIgnoreCase)
$mode = if ($transfer) { 'transfer' } else { 'return' }
$modeLabel = if ($transfer) { 'PRZEKAZANIA SPRZĘTU' } else { 'ZWROTU SPRZĘTU' }
$title = 'PROTOKÓŁ ' + $modeLabel

$generatedAt = Get-Date
if (-not [string]::IsNullOrWhiteSpace($env:SIRK_PROTOCOL_GENERATED_AT)) {
    try { $generatedAt = [DateTime]::Parse($env:SIRK_PROTOCOL_GENERATED_AT).ToLocalTime() } catch {}
}

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add($title)
$lines.Add('')
$lines.Add('Data: ' + $generatedAt.ToString('yyyy-MM-dd HH:mm:ss'))
$lines.Add('Użytkownik: ' + (Get-ProtocolValue $env:SIRK_PROTOCOL_USER_NAME))
if (-not [string]::IsNullOrWhiteSpace($env:SIRK_PROTOCOL_USER_EMAIL)) { $lines.Add('E-mail: ' + $env:SIRK_PROTOCOL_USER_EMAIL) }
$lines.Add('Osoba IT: ' + (Get-ProtocolValue $env:SIRK_PROTOCOL_IT_NAME))
if (-not [string]::IsNullOrWhiteSpace($env:SIRK_PROTOCOL_IT_EMAIL)) { $lines.Add('E-mail IT: ' + $env:SIRK_PROTOCOL_IT_EMAIL) }
$lines.Add('')
$lines.Add('SPRZĘT:')

$assetRows = New-Object System.Collections.Generic.List[object]
$index = 0
foreach ($asset in $assets) {
    $index++
    $hostname = Get-ProtocolValue $asset.hostname
    if ([string]::IsNullOrWhiteSpace($hostname)) { $hostname = Get-ProtocolValue $asset.value }
    $model = Get-ProtocolValue $asset.model
    $manufacturer = Get-ProtocolValue $asset.manufacturer
    $serial = Get-ProtocolValue $asset.serialNumber
    $inventory = Get-ProtocolValue $asset.inventoryNumber
    $identifier = Get-ProtocolValue $asset.objectKey
    if ([string]::IsNullOrWhiteSpace($identifier)) { $identifier = Get-ProtocolValue $asset.objectId }

    $lines.Add(([string]$index) + '. Hostname: ' + $hostname)
    $lines.Add('   Model: ' + $(if ($model) { $model } else { '-' }))
    $lines.Add('   Serial: ' + $(if ($serial) { $serial } else { '-' }))
    $lines.Add('   Inventory/Asset: ' + $(if ($inventory) { $inventory } elseif ($identifier) { $identifier } else { '-' }))

    $assetRows.Add([pscustomobject]@{
        hostname = $hostname
        manufacturer = $manufacturer
        model = $model
        serialNumber = $serial
        inventoryNumber = $inventory
        assetIdentifier = $identifier
    })
}

$lines.Add('')
if ($transfer) {
    $lines.Add('Potwierdzam przekazanie powyższego sprzętu wskazanemu użytkownikowi.')
} else {
    $lines.Add('Potwierdzam zwrot powyższego sprzętu przez wskazanego użytkownika.')
}
$lines.Add('')
$lines.Add('Użytkownik: ______________________________')
$lines.Add('Osoba IT: ________________________________')

$text = $lines -join [Environment]::NewLine
[pscustomobject]@{
    protocol = $true
    message = 'Jira Asset Protocol jest gotowy.'
    text = $text
    data = [pscustomobject]@{
        mode = $mode
        generatedAt = $generatedAt.ToString('o')
        user = [pscustomobject]@{
            id = (Get-ProtocolValue $env:SIRK_PROTOCOL_USER_ID)
            name = (Get-ProtocolValue $env:SIRK_PROTOCOL_USER_NAME)
            email = (Get-ProtocolValue $env:SIRK_PROTOCOL_USER_EMAIL)
        }
        itPerson = [pscustomobject]@{
            id = (Get-ProtocolValue $env:SIRK_PROTOCOL_IT_ID)
            name = (Get-ProtocolValue $env:SIRK_PROTOCOL_IT_NAME)
            email = (Get-ProtocolValue $env:SIRK_PROTOCOL_IT_EMAIL)
        }
        assets = $assetRows.ToArray()
    }
}
