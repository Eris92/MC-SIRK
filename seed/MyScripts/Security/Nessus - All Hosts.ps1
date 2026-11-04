# PL: Nessus - wszystkie hosty | Raport podatności Nessus dla wszystkich hostów z prostymi filtrami i CSV do pobrania.
# EN: Nessus - all hosts | Nessus vulnerability report for all hosts with simple filters and a downloadable CSV.
# Approval: false
# SirkDataFeed: Nessus
# runAsUser: 0
# VariablePL: $HostFilter, Host | Fragment nazwy Host, Host Original lub Host ID (puste = wszystkie)
# VariableEN: $HostFilter, Host | Part of Host, Host Original or Host ID (empty = all)
# VariableSelectPL: $Risk=All, Ryzyko | Filtr ryzyka |All=Wszystkie|Critical=Krytyczne|High=Wysokie|Medium=Średnie|Low=Niskie
# VariableSelectEN: $Risk=All, Risk | Risk filter |All=All|Critical=Critical|High=High|Medium=Medium|Low=Low
# VariablePL: $Plugin, Plugin | Fragment nazwy lub dokładne ID pluginu (puste = wszystkie)
# VariableEN: $Plugin, Plugin | Part of plugin name or exact plugin ID (empty = all)
# VariableSelectPL: $Exploit=All, Exploit | Dostępny exploit |All=Wszystkie|True=Tak|False=Nie
# VariableSelectEN: $Exploit=All, Exploit | Exploit available |All=All|True=Yes|False=No
# VariablePL: $Category, Kategoria | Opcjonalny fragment kategorii
# VariableEN: $Category, Category | Optional part of the category
# VariablePL: $Authentication, Authentication | Opcjonalna wartość Authentication (np. True/False)
# VariableEN: $Authentication, Authentication | Optional Authentication value (e.g. True/False)

# Reads the read-only snapshot published by the MC-SIRK Nessus import (#422).
# The server passes its path in SIRK_NESSUS_SNAPSHOT only to Site Admin requests.
# Filters and the CSV format can be changed by editing this file.

$ErrorActionPreference = 'Stop'

function Get-Input {
    param([string]$Name, [string]$Default = '')
    $variable = Get-Variable -Name $Name -ErrorAction SilentlyContinue
    if ($variable -and $null -ne $variable.Value -and -not [string]::IsNullOrWhiteSpace([string]$variable.Value)) { return ([string]$variable.Value).Trim() }
    return $Default
}

$filterHost = Get-Input 'HostFilter'
$filterRisk = Get-Input 'Risk' 'All'
$filterPlugin = Get-Input 'Plugin'
$filterExploit = Get-Input 'Exploit' 'All'
$filterCategory = Get-Input 'Category'
$filterAuthentication = Get-Input 'Authentication'

if (@('All', 'Critical', 'High', 'Medium', 'Low') -notcontains $filterRisk) { throw "Invalid Risk filter: $filterRisk" }
if (@('All', 'True', 'False') -notcontains $filterExploit) { throw "Invalid Exploit filter: $filterExploit" }
foreach ($value in @($filterHost, $filterPlugin, $filterCategory, $filterAuthentication)) {
    if ($value.Length -gt 200 -or $value -match '[\x00-\x1F]') { throw 'Filter values must be single-line text up to 200 characters.' }
}

$snapshotPath = [Environment]::GetEnvironmentVariable('SIRK_NESSUS_SNAPSHOT')
if ([string]::IsNullOrWhiteSpace($snapshotPath)) { throw 'The Nessus data feed is not available for this execution.' }
if (-not (Test-Path -LiteralPath $snapshotPath -PathType Leaf)) {
    throw 'Brak zaimportowanych danych Nessus / No Nessus data has been imported. The report was not generated.'
}
$staleDays = 14
[void][int]::TryParse([string][Environment]::GetEnvironmentVariable('SIRK_NESSUS_STALE_DAYS'), [ref]$staleDays)

$snapshot = [System.IO.File]::ReadAllText($snapshotPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
if (-not $snapshot -or $snapshot.schema -ne 1) { throw 'Unsupported Nessus snapshot format.' }

$headers = @('Plugin ID', 'Plugin Name', 'Plugin Score', 'Plugin Published', 'Plugin Modified', 'Risk', 'Host', 'Host Original', 'Host ID', 'Host OS', 'Week', 'History ID', 'Generation Date', 'Rating Risk', 'Authentication', 'Category', 'Exploit')
$derived = @('SIRK Host Status', 'SIRK Occurrences')
$now = [DateTime]::UtcNow
$findingFilterActive = ($filterRisk -ne 'All') -or $filterPlugin -or ($filterExploit -ne 'All') -or $filterCategory -or $filterAuthentication

function Test-Contains([string]$Value, [string]$Needle) {
    return [string]::IsNullOrEmpty($Needle) -or ([string]$Value).IndexOf($Needle, [StringComparison]::OrdinalIgnoreCase) -ge 0
}

function Get-HostStatus($HostEntry) {
    if (-not $HostEntry.generatedAt) { return 'stale' }
    $generated = if ($HostEntry.generatedAt -is [DateTime]) { $HostEntry.generatedAt.ToUniversalTime() } else { [DateTime]::Parse([string]$HostEntry.generatedAt, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AdjustToUniversal) }
    if (($now - $generated).TotalDays -gt $staleDays) { return 'stale' }
    if (@($HostEntry.findings).Count -gt 0) { return 'available' }
    return 'no_findings'
}

function Test-Finding($Finding) {
    $fields = $Finding.fields
    if ($filterRisk -ne 'All' -and [string]$Finding.risk -ne $filterRisk.ToLowerInvariant()) { return $false }
    if ($filterExploit -eq 'True' -and -not $Finding.exploit) { return $false }
    if ($filterExploit -eq 'False' -and $Finding.exploit) { return $false }
    if ($filterPlugin -and -not ((Test-Contains $fields.'Plugin Name' $filterPlugin) -or [string]$fields.'Plugin ID' -eq $filterPlugin)) { return $false }
    if ($filterCategory -and -not (Test-Contains $fields.Category $filterCategory)) { return $false }
    if ($filterAuthentication -and -not ([string]$fields.Authentication -ieq $filterAuthentication)) { return $false }
    return $true
}

function Protect-CsvCell([AllowNull()][string]$Value) {
    if ($null -eq $Value) { $Value = '' }
    if ($Value -match '^[\s\x00-\x1F]*[=+\-@]') { $Value = "'" + $Value }
    return '"' + $Value.Replace('"', '""') + '"'
}

$hostRows = New-Object System.Collections.Generic.List[object]
$csvLines = New-Object System.Collections.Generic.List[string]
$csvLines.Add((($headers + $derived) | ForEach-Object { Protect-CsvCell $_ }) -join ';')
$totals = [ordered]@{ critical = 0; high = 0; medium = 0; low = 0 }
$findingCount = 0

foreach ($hostEntry in @($snapshot.hosts)) {
    if ($filterHost -and -not ((Test-Contains $hostEntry.host $filterHost) -or (Test-Contains $hostEntry.hostOriginal $filterHost) -or ([string]$hostEntry.hostId -eq $filterHost))) { continue }
    $status = Get-HostStatus $hostEntry
    $matched = @(@($hostEntry.findings) | Where-Object { $_ -and (Test-Finding $_) })
    if ($findingFilterActive -and $matched.Count -eq 0) { continue }
    $counts = [ordered]@{ critical = 0; high = 0; medium = 0; low = 0 }
    foreach ($finding in $matched) {
        $risk = [string]$finding.risk
        if ($counts.Contains($risk)) { $counts[$risk]++; $totals[$risk]++ }
        $findingCount++
        $cells = @($headers | ForEach-Object { Protect-CsvCell ([string]$finding.fields.$_) })
        $cells += Protect-CsvCell $status
        $cells += Protect-CsvCell ([string]$finding.occurrences)
        $csvLines.Add($cells -join ';')
    }
    if ($matched.Count -eq 0) {
        # Host present in the dataset without findings (e.g. Plugin ID=0 sentinel): inventory row, not a vulnerability.
        $values = @{ 'Host' = $hostEntry.host; 'Host Original' = $hostEntry.hostOriginal; 'Host ID' = $hostEntry.hostId; 'Host OS' = $hostEntry.hostOs; 'Week' = $hostEntry.week; 'History ID' = $hostEntry.historyId; 'Generation Date' = $hostEntry.generationDate }
        $cells = @($headers | ForEach-Object { Protect-CsvCell ([string]$values[$_]) })
        $cells += Protect-CsvCell $status
        $cells += Protect-CsvCell '0'
        $csvLines.Add($cells -join ';')
    }
    $hostRows.Add([ordered]@{
        'Host' = [string]$hostEntry.host
        'Host Original' = [string]$hostEntry.hostOriginal
        'Host ID' = [string]$hostEntry.hostId
        'Host OS' = [string]$hostEntry.hostOs
        'Status' = $status
        'Critical' = $counts.critical
        'High' = $counts.high
        'Medium' = $counts.medium
        'Low' = $counts.low
        'Findings' = $matched.Count
        'Generation Date' = [string]$hostEntry.generationDate
    })
}

# Unique per-execution file below a Site Admin-only download folder; the marker
# is printed only after the complete file has been moved into place.
$reportDirectory = Join-Path $PSScriptRoot '_siteadmin-reports'
if (-not (Test-Path -LiteralPath $reportDirectory)) { [void](New-Item -ItemType Directory -Path $reportDirectory) }
Get-ChildItem -LiteralPath $reportDirectory -Filter 'NessusAllHosts_*' -File -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTimeUtc -lt $now.AddDays(-7) } |
    Remove-Item -Force -ErrorAction SilentlyContinue
$baseName = 'NessusAllHosts_{0}_{1}' -f (Get-Date -Format 'yyyyMMdd_HHmmss'), [guid]::NewGuid().ToString('N')
$temporaryPath = Join-Path $reportDirectory ($baseName + '.tmp')
$csvPath = Join-Path $reportDirectory ($baseName + '.csv')
try {
    [System.IO.File]::WriteAllLines($temporaryPath, $csvLines, (New-Object System.Text.UTF8Encoding($true)))
    Move-Item -LiteralPath $temporaryPath -Destination $csvPath
} finally {
    if (Test-Path -LiteralPath $temporaryPath) { Remove-Item -LiteralPath $temporaryPath -Force -ErrorAction SilentlyContinue }
}

$filters = @()
if ($filterHost) { $filters += "Host=$filterHost" }
if ($filterRisk -ne 'All') { $filters += "Risk=$filterRisk" }
if ($filterPlugin) { $filters += "Plugin=$filterPlugin" }
if ($filterExploit -ne 'All') { $filters += "Exploit=$filterExploit" }
if ($filterCategory) { $filters += "Category=$filterCategory" }
if ($filterAuthentication) { $filters += "Authentication=$filterAuthentication" }
$filterText = if ($filters.Count) { $filters -join ', ' } else { 'brak / none' }
$staleCount = @($hostRows | Where-Object { $_.Status -eq 'stale' }).Count

Write-Output "Wygenerowano raport CSV: $csvPath"
Write-Output "Liczba rekordow: $($csvLines.Count - 1)"
Write-Output "CSV_DOWNLOAD: $csvPath"

$tableLimit = 1000
$title = ('Nessus: {0} hosts, {1} findings | Critical {2} | High {3} | Medium {4} | Low {5} | stale hosts {6} | filters: {7} | imported {8} | latest scan {9}' -f
    $hostRows.Count, $findingCount, $totals.critical, $totals.high, $totals.medium, $totals.low, $staleCount, $filterText, $snapshot.importedAt, $snapshot.latestGeneratedAt)
if ($hostRows.Count -gt $tableLimit) { $title += " | table shows first $tableLimit hosts, CSV contains all" }
[ordered]@{
    meshTable = $true
    title = $title
    columns = @('Host', 'Host Original', 'Host ID', 'Host OS', 'Status', 'Critical', 'High', 'Medium', 'Low', 'Findings', 'Generation Date')
    rows = @($hostRows | Select-Object -First $tableLimit)
} | ConvertTo-Json -Depth 5 -Compress
