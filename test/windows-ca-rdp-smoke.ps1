$ErrorActionPreference = 'Stop'

# #406: validate the pure helpers of the signed RDP command without signing,
# touching certificate stores or writing to any Desktop.
$root = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $root 'seed\MyCommands\CA\Generate signed RDP file.ps1'
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$tokens, [ref]$errors)
if ($errors.Count -gt 0) { $errors | ForEach-Object { Write-Error $_.Message }; exit 1 }

$wanted = @('Test-HostName', 'New-RdpContent', 'Get-SigningCertificate')
$functions = $ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $wanted -contains $node.Name }, $false)
if ($functions.Count -ne $wanted.Count) { throw 'Expected RDP helper functions were not found.' }
foreach ($function in $functions) { . ([scriptblock]::Create($function.Extent.Text)) }

foreach ($valid in @('pc01', 'pc01.corp.local', 'SRV-01.example.com', '10.0.0.15')) {
    if (-not (Test-HostName $valid)) { throw "Valid host rejected: $valid" }
}
foreach ($invalid in @('', ' ', "pc01`r`nscreen mode id:i:1", 'pc 01', '-pc01', 'pc01;rm', ('a' * 254), "pc01`t")) {
    if (Test-HostName $invalid) { throw "Invalid host accepted: $invalid" }
}

$content = New-RdpContent 'pc01.corp.local'
$lines = $content -split "`r`n"
if ($lines[0] -ne 'full address:s:pc01.corp.local') { throw 'RDP content does not start with the target address.' }
if (@($lines | Where-Object { $_ -like 'full address:*' }).Count -ne 1) { throw 'RDP content must contain exactly one target.' }
if ($content -notmatch '(?m)^prompt for credentials:i:1$') { throw 'RDP content must prompt for credentials.' }
if ($content -match '(?i)password') { throw 'RDP content must never carry a password.' }

foreach ($badThumbprint in @('', 'ABC', ('Z' * 40))) {
    $failed = $false
    try { Get-SigningCertificate $badThumbprint | Out-Null } catch { $failed = $true }
    if (-not $failed) { throw "Invalid thumbprint accepted: '$badThumbprint'" }
}
$missing = $false
try { Get-SigningCertificate ('0' * 40) | Out-Null } catch { $missing = $_.Exception.Message -match 'not installed' }
if (-not $missing) { throw 'Missing signing certificate must fail closed.' }

Write-Host 'Windows PowerShell signed RDP helper smoke: OK'
