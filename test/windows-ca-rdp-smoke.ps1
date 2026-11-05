$ErrorActionPreference = 'Stop'

# #406: validate the pure helpers of the signed RDP command without signing,
# touching certificate stores or writing to any Desktop.
$root = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $root 'seed\MyCommands\CA\Generate signed RDP file.ps1'
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$tokens, [ref]$errors)
if ($errors.Count -gt 0) { $errors | ForEach-Object { Write-Error $_.Message }; exit 1 }

$wanted = @('Test-HostName', 'New-RdpContent', 'Get-SigningCertificate', 'Get-CertificateTemplateNames', 'Test-SigningCertificate')
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
if ($content -notmatch '(?m)^prompt for credentials:i:1\r?$') { throw 'RDP content must prompt for credentials.' }
if ($content -match '(?i)password') { throw 'RDP content must never carry a password.' }

foreach ($badThumbprint in @('', 'ABC', ('Z' * 40))) {
    $failed = $false
    try { Get-SigningCertificate $badThumbprint | Out-Null } catch { $failed = $true }
    if (-not $failed) { throw "Invalid thumbprint accepted: '$badThumbprint'" }
}
$missing = $false
try { Get-SigningCertificate ('0' * 40) | Out-Null } catch { $missing = $_.Exception.Message -match 'not installed' }
if (-not $missing) { throw 'Missing signing certificate must fail closed.' }
$noTemplate = $false
try { Get-SigningCertificate '' 'SIRK-NoSuchTemplate-Smoke' | Out-Null } catch { $noTemplate = $_.Exception.Message -match 'No valid certificate' }
if (-not $noTemplate) { throw 'Missing template certificate must fail closed.' }
$badTemplate = $false
try { Get-SigningCertificate '' 'bad;name' | Out-Null } catch { $badTemplate = $_.Exception.Message -match 'template name is invalid' }
if (-not $badTemplate) { throw 'Invalid template name must be rejected.' }
function New-FakeExtension([string]$Oid, [string]$Text) {
    $extension = [pscustomobject]@{ Oid = [pscustomobject]@{ Value = $Oid }; Text = $Text }
    $extension | Add-Member -MemberType ScriptMethod -Name Format -Value { param($multiLine) $this.Text } -PassThru
}
$fake = [pscustomobject]@{ Extensions = @(
    (New-FakeExtension '1.3.6.1.4.1.311.21.7' 'Szablon=RDP Signing(1.3.6.1.4.1.311.21.8.123.456), Wersja glowna=100, Wersja pomocnicza=2'),
    (New-FakeExtension '2.5.29.15' 'Digital Signature')
) }
$templateNames = @(Get-CertificateTemplateNames $fake)
if ($templateNames -notcontains 'RDP Signing' -or $templateNames -notcontains '1.3.6.1.4.1.311.21.8.123.456') { throw ("Template names not parsed from a localized extension: " + ($templateNames -join ', ')) }
$v1 = [pscustomobject]@{ Extensions = @((New-FakeExtension '1.3.6.1.4.1.311.20.2' 'WebServer')) }
if (@(Get-CertificateTemplateNames $v1) -notcontains 'WebServer') { throw 'V1 template name not parsed.' }
if ($content -notmatch '(?m)^alternate full address:s:pc01\.corp\.local\r?$') { throw 'RDP content must carry the alternate address.' }

# #407: Sign CSR must parse under Windows PowerShell 5.1.
$signPath = Join-Path $root 'seed\MyScripts\CA\Sign CSR.ps1'
$signErrors = $null
[System.Management.Automation.Language.Parser]::ParseFile($signPath, [ref]$null, [ref]$signErrors) | Out-Null
if ($signErrors.Count -gt 0) { $signErrors | ForEach-Object { Write-Error $_.Message }; exit 1 }

Write-Host 'Windows PowerShell signed RDP helper and Sign CSR parse smoke: OK'
