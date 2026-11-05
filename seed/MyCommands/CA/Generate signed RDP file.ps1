# PL: Podpisany plik RDP | Generuje plik .rdp, podpisuje go certyfikatem RDP signing z konfiguracji CA i zapisuje na pulpicie zalogowanego użytkownika.
# EN: Signed RDP file | Generates an .rdp file, signs it with the configured RDP signing certificate and saves it to the logged-on user's Desktop.
# runAsUser: 0
# SirkSystemCredential: CA
# SirkRdpSigningThumbprint:
# VariablePL: $TargetHost, Host docelowy | Nazwa lub FQDN hosta w pliku RDP (puste = ten komputer)
# VariableEN: $TargetHost, Target host | Host name or FQDN written to the RDP file (empty = this computer)

# #406. Runs on the selected Windows device through the MeshAgent (SYSTEM).
# - The signing certificate is selected by the non-secret thumbprint
#   ($SirkRdpSigningThumbprint): the SirkRdpSigningThumbprint header above when
#   set, otherwise the global CA default; nothing is hard-coded.
# - The private key never leaves the certificate store; the system rdpsign.exe is used.
# - The Desktop of the interactive user is resolved from the console session
#   owner's profile (honouring Desktop folder redirection), never from input.
# - Existing <host>.rdp on the Desktop is overwritten only after successful
#   signing and verification (deterministic policy: latest signed file wins).

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Get-Setting([string]$Name) {
    $variable = Get-Variable -Name $Name -ErrorAction SilentlyContinue
    if ($variable -and $null -ne $variable.Value) { return ([string]$variable.Value).Trim() }
    return ''
}

function Test-HostName([string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value) -or $Value.Length -gt 253) { return $false }
    if ($Value -match '[\x00-\x1F\x7F]') { return $false }
    if ($Value -match '^\d{1,3}(\.\d{1,3}){3}$') { return $true }
    return $Value -match '^(?=.{1,253}$)([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$'
}

function Get-InteractiveDesktop {
    $account = [string](Get-CimInstance -ClassName Win32_ComputerSystem).UserName
    if ([string]::IsNullOrWhiteSpace($account)) { throw 'No interactive user is logged on; the RDP file cannot be delivered to a Desktop.' }
    $sid = (New-Object System.Security.Principal.NTAccount($account)).Translate([System.Security.Principal.SecurityIdentifier]).Value
    $profile = Get-CimInstance -ClassName Win32_UserProfile -Filter ("SID='{0}'" -f $sid)
    if (-not $profile -or -not $profile.LocalPath) { throw "Profile of the interactive user was not found." }
    $desktop = Join-Path $profile.LocalPath 'Desktop'
    $shellFolders = "Registry::HKEY_USERS\$sid\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders"
    $configured = (Get-ItemProperty -LiteralPath $shellFolders -Name Desktop -ErrorAction SilentlyContinue).Desktop
    if ($configured) {
        $expanded = ([string]$configured) -replace '%USERPROFILE%', $profile.LocalPath
        if ($expanded -notmatch '%') { $desktop = $expanded }
    }
    $desktop = [System.IO.Path]::GetFullPath($desktop)
    if (-not (Test-Path -LiteralPath $desktop -PathType Container)) { throw "Desktop folder of the interactive user does not exist: $desktop" }
    return [pscustomobject]@{ Account = $account; Path = $desktop }
}

function Get-SigningCertificate([string]$Thumbprint) {
    $normalized = ($Thumbprint -replace '[\s:\u200e\u200f]', '').ToUpperInvariant()
    if ($normalized -notmatch '^[0-9A-F]{40}$') { throw 'RDP signing thumbprint is missing or invalid: set # SirkRdpSigningThumbprint in the script header or a default thumbprint in the CA integration.' }
    $certificate = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object { $_.Thumbprint -eq $normalized } | Select-Object -First 1
    if (-not $certificate) { throw 'The configured RDP signing certificate is not installed in LocalMachine\My on this device.' }
    if (-not $certificate.HasPrivateKey) { throw 'The configured RDP signing certificate has no private key on this device.' }
    $now = Get-Date
    if ($certificate.NotBefore -gt $now -or $certificate.NotAfter -lt $now) { throw 'The configured RDP signing certificate is not currently valid.' }
    $allowedEku = @('1.3.6.1.5.5.7.3.1', '1.3.6.1.4.1.311.54.1.2', '1.3.6.1.5.5.7.3.3')
    $eku = @($certificate.EnhancedKeyUsageList | ForEach-Object { $_.ObjectId })
    if ($eku.Count -gt 0 -and -not ($eku | Where-Object { $allowedEku -contains $_ })) { throw 'The configured certificate does not allow Server Authentication, Remote Desktop Authentication or Code Signing.' }
    return [pscustomobject]@{ Thumbprint = $normalized; Subject = $certificate.Subject; NotAfter = $certificate.NotAfter }
}

function New-RdpContent([string]$HostName) {
    @(
        "full address:s:$HostName",
        'prompt for credentials:i:1',
        'administrative session:i:0',
        'screen mode id:i:2',
        'use multimon:i:0',
        'session bpp:i:32',
        'authentication level:i:2',
        'enablecredsspsupport:i:1',
        'negotiate security layer:i:1',
        'redirectclipboard:i:1',
        'redirectprinters:i:0',
        'redirectsmartcards:i:1',
        'redirectdrives:i:0',
        'audiomode:i:0',
        'autoreconnection enabled:i:1'
    ) -join "`r`n"
}

$targetHost = Get-Setting 'TargetHost'
if (-not $targetHost) {
    $targetHost = try { [System.Net.Dns]::GetHostEntry([string]$env:COMPUTERNAME).HostName } catch { [string]$env:COMPUTERNAME }
}
$targetHost = $targetHost.TrimEnd('.')
if (-not (Test-HostName $targetHost)) { throw 'Invalid target host name. Only DNS names or IPv4 addresses without control characters are allowed.' }

$caConfig = Get-Setting 'SirkCaConfig'
if (-not $caConfig) { throw 'The CA integration is not configured. Configure it in SIRK settings and assign the CA profile to this command.' }
$signer = Get-SigningCertificate (Get-Setting 'SirkRdpSigningThumbprint')
$rdpsign = Join-Path $env:SystemRoot 'System32\rdpsign.exe'
if (-not (Test-Path -LiteralPath $rdpsign -PathType Leaf)) { throw 'rdpsign.exe is not available on this device.' }
$desktop = Get-InteractiveDesktop

$work = Join-Path ([System.IO.Path]::GetTempPath()) ('sirk-rdp-' + [guid]::NewGuid().ToString('N'))
$fileName = ($targetHost -replace '[^A-Za-z0-9.-]', '_') + '.rdp'
try {
    [void](New-Item -ItemType Directory -Path $work)
    $temporaryFile = Join-Path $work $fileName
    [System.IO.File]::WriteAllText($temporaryFile, (New-RdpContent $targetHost) + "`r`n", [System.Text.Encoding]::Unicode)
    $signOutput = & $rdpsign /sha256 $signer.Thumbprint $temporaryFile 2>&1
    if ($LASTEXITCODE -ne 0) { throw ("rdpsign.exe failed with exit code {0}: {1}" -f $LASTEXITCODE, (($signOutput | Out-String).Trim())) }
    $signed = [System.IO.File]::ReadAllText($temporaryFile)
    if ($signed -notmatch '(?m)^signscope:s:' -or $signed -notmatch '(?m)^signature:s:\S+') { throw 'The RDP file was not signed; it was not delivered.' }
    if ($signed -notmatch ('(?m)^full address:s:' + [regex]::Escape($targetHost) + '\r?$')) { throw 'Signed RDP file does not contain the expected target.' }
    $destination = Join-Path $desktop.Path $fileName
    Copy-Item -LiteralPath $temporaryFile -Destination $destination -Force
    Write-Output ("Signed RDP file delivered: {0}" -f $destination)
    Write-Output ("Target: {0} | User: {1} | Signer: {2} (valid to {3:yyyy-MM-dd})" -f $targetHost, $desktop.Account, $signer.Subject, $signer.NotAfter)
} finally {
    if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue }
}
