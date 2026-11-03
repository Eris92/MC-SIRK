# Windows PowerShell smoke for the editable Nessus all-host My Script (#425).
$ErrorActionPreference = 'Stop'
$source = Resolve-Path '.\seed\MyScripts\Security\Nessus - All Hosts.ps1'
$tokens = $null; $errors = $null
[System.Management.Automation.Language.Parser]::ParseFile($source, [ref]$tokens, [ref]$errors) | Out-Null
if ($errors.Count -gt 0) { $errors | ForEach-Object { Write-Error $_.Message }; exit 1 }

$work = Join-Path ([IO.Path]::GetTempPath()) ('sirk-nessus-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $work | Out-Null
try {
    $script = Join-Path $work 'Nessus - All Hosts.ps1'
    Copy-Item -LiteralPath $source -Destination $script
    $generated = [DateTime]::UtcNow.AddDays(-1).ToString('o')
    function Fields($id, $name, $risk, $hostName, $exploit) {
        [ordered]@{ 'Plugin ID' = $id; 'Plugin Name' = $name; 'Plugin Score' = '9.8'; 'Plugin Published' = ''; 'Plugin Modified' = ''; 'Risk' = $risk; 'Host' = $hostName; 'Host Original' = '10.0.0.1'; 'Host ID' = '1'; 'Host OS' = 'Windows'; 'Week' = '44'; 'History ID' = '5'; 'Generation Date' = '2026-11-01'; 'Rating Risk' = $risk; 'Authentication' = 'True'; 'Category' = 'Windows'; 'Exploit' = $exploit }
    }
    $snapshot = [ordered]@{
        schema = 1; importedAt = $generated; latestGeneratedAt = $generated; records = 3; hostCount = 2
        hosts = @(
            [ordered]@{ key = 'pc01.corp.local'; host = 'pc01.corp.local'; hostOriginal = '10.0.0.1'; hostId = '1'; hostOs = 'Windows'; week = '44'; historyId = '5'; generationDate = '2026-11-01'; generatedAt = $generated; historyCount = 1
                counts = @{ critical = 1; high = 1; medium = 0; low = 0; info = 0 }
                findings = @(
                    [ordered]@{ risk = 'critical'; score = 9.8; exploit = $true; occurrences = 1; fields = (Fields '100' '=HYPERLINK("x") Zażółć' 'Critical' 'pc01.corp.local' 'True') },
                    [ordered]@{ risk = 'high'; score = 7.5; exploit = $false; occurrences = 2; fields = (Fields '200' 'High "quoted"; thing' 'High' 'pc01.corp.local' 'False') }
                ) },
            [ordered]@{ key = 'pc02.corp.local'; host = 'pc02.corp.local'; hostOriginal = '10.0.0.2'; hostId = '2'; hostOs = 'Windows'; week = '44'; historyId = '5'; generationDate = '2026-11-01'; generatedAt = $generated; historyCount = 1
                counts = @{ critical = 0; high = 0; medium = 0; low = 0; info = 0 }; findings = @() }
        )
    }
    $snapshotPath = Join-Path $work 'snapshot.json'
    [IO.File]::WriteAllText($snapshotPath, ($snapshot | ConvertTo-Json -Depth 8), (New-Object Text.UTF8Encoding($false)))
    $env:SIRK_NESSUS_SNAPSHOT = $snapshotPath
    $env:SIRK_NESSUS_STALE_DAYS = '14'

    function Invoke-Report($vars) {
        foreach ($key in $vars.Keys) { Set-Variable -Name $key -Value $vars[$key] }
        $output = @(& $script) | ForEach-Object { [string]$_ }
        foreach ($key in $vars.Keys) { Remove-Variable -Name $key }
        return ,$output
    }

    $output = Invoke-Report @{ HostFilter = ''; Risk = 'All'; Plugin = ''; Exploit = 'All'; Category = ''; Authentication = '' }
    $marker = $output | Where-Object { $_ -like 'CSV_DOWNLOAD:*' } | Select-Object -First 1
    if (-not $marker) { throw 'CSV_DOWNLOAD marker missing.' }
    $csvPath = $marker.Substring('CSV_DOWNLOAD:'.Length).Trim()
    if ($csvPath -notlike '*\_siteadmin-reports\NessusAllHosts_*.csv') { throw "Unexpected CSV path: $csvPath" }
    $lines = [IO.File]::ReadAllLines($csvPath, [Text.Encoding]::UTF8)
    if ($lines.Count -ne 4) { throw "Expected header + 2 findings + 1 no-finding host, got $($lines.Count) lines." }
    if (-not $lines[0].StartsWith('"Plugin ID";"Plugin Name"')) { throw 'CSV header must use ; and the Nessus column order.' }
    if (-not ($lines -match [regex]::Escape('"''=HYPERLINK(""x"") Zażółć"'))) { throw 'Formula cell must be neutralized and Unicode preserved.' }
    if (-not ($lines -match 'pc02\.corp\.local.*"no_findings";"0"')) { throw 'Host without findings must be an inventory row with no_findings.' }
    $json = $output[-1] | ConvertFrom-Json
    if (-not $json.meshTable -or @($json.rows).Count -ne 2) { throw 'Results table must list both hosts.' }

    $filtered = Invoke-Report @{ HostFilter = ''; Risk = 'Critical'; Plugin = ''; Exploit = 'All'; Category = ''; Authentication = '' }
    $filteredCsv = (($filtered | Where-Object { $_ -like 'CSV_DOWNLOAD:*' }) -replace '^CSV_DOWNLOAD:\s*', '')
    if ($filteredCsv -eq $csvPath) { throw 'Every run must produce a unique file.' }
    $filteredLines = [IO.File]::ReadAllLines($filteredCsv, [Text.Encoding]::UTF8)
    if ($filteredLines.Count -ne 2) { throw 'Risk=Critical must return exactly one finding row.' }

    $env:SIRK_NESSUS_SNAPSHOT = (Join-Path $work 'missing.json')
    $failed = $false
    try { Invoke-Report @{ Risk = 'All'; Exploit = 'All' } | Out-Null } catch { $failed = $true }
    if (-not $failed) { throw 'Missing snapshot must fail without a report.' }
    Write-Output 'Nessus all-host My Script Windows smoke: OK'
} finally {
    Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item Env:\SIRK_NESSUS_SNAPSHOT -ErrorAction SilentlyContinue
    Remove-Item Env:\SIRK_NESSUS_STALE_DAYS -ErrorAction SilentlyContinue
}
