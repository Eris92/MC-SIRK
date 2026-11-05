# PL: Podpisany plik RDP | Generuje plik .rdp, podpisuje go certyfikatem wskazanym odciskiem albo szablonem (autoenroll) i zapisuje na pulpicie zalogowanego użytkownika.
# EN: Signed RDP file | Generates an .rdp file, signs it with the certificate selected by thumbprint or template (autoenroll) and saves it to the logged-on user's Desktop.
# runAsUser: 0
# SirkSystemCredential: CA
# SirkRdpSigningThumbprint:
# SirkCaTemplate:
# VariablePL: $TargetHost, Host docelowy | Nazwa lub FQDN hosta w pliku RDP (puste = ten komputer)
# VariableEN: $TargetHost, Target host | Host name or FQDN written to the RDP file (empty = this computer)

# #406. Runs on the selected Windows device through the MeshAgent (SYSTEM).
# - Signing certificate (LocalMachine\My on this device), nothing is hard-coded:
#   1. thumbprint ($SirkRdpSigningThumbprint: header above, else global CA default), or
#   2. when no thumbprint is set, certificate template ($SirkCaTemplate: header above,
#      else global CA default) - the newest valid certificate with a private key issued
#      from that template is used, so an autoenrolled/renewed certificate is picked up
#      automatically. Template = name, display name or OID.
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

function Get-CertificateTemplateNames($Certificate) {
    $names = @()
    foreach ($extension in @($Certificate.Extensions)) {
        $oid = [string]$extension.Oid.Value
        if ($oid -ne '1.3.6.1.4.1.311.21.7' -and $oid -ne '1.3.6.1.4.1.311.20.2') { continue }
        $text = [string]$extension.Format($false)
        if ($oid -eq '1.3.6.1.4.1.311.21.7') {
            # Format() is localized ("Template=" / "Szablon="), so match by the template OID arc.
            if ($text -match '=\s*([^=,(]*?)\s*\((1\.3\.6\.1\.4\.1\.311\.21\.8\.[0-9.]+)\)') { $names += $Matches[1].Trim(); $names += $Matches[2] }
            elseif ($text -match '(1\.3\.6\.1\.4\.1\.311\.21\.8\.[0-9.]+)') { $names += $Matches[1] }
        } else {
            $names += ($text -replace '[\x00-\x1F]', '').Trim()
        }
    }
    return @($names | Where-Object { $_ })
}

function Test-SigningCertificate($Certificate, [string]$Label) {
    if (-not $Certificate.HasPrivateKey) { throw "The $Label RDP signing certificate has no private key on this device." }
    $now = Get-Date
    if ($Certificate.NotBefore -gt $now -or $Certificate.NotAfter -lt $now) { throw "The $Label RDP signing certificate is not currently valid." }
    $allowedEku = @('1.3.6.1.5.5.7.3.1', '1.3.6.1.4.1.311.54.1.2', '1.3.6.1.5.5.7.3.3')
    $eku = @($Certificate.EnhancedKeyUsageList | ForEach-Object { $_.ObjectId })
    if ($eku.Count -gt 0 -and -not ($eku | Where-Object { $allowedEku -contains $_ })) { throw "The $Label certificate does not allow Server Authentication, Remote Desktop Authentication or Code Signing." }
}

function Get-SigningCertificate([string]$Thumbprint, [string]$Template) {
    $normalized = ($Thumbprint -replace '[\s:\u200e\u200f]', '').ToUpperInvariant()
    $templateName = ([string]$Template).Trim()
    if ($normalized) {
        if ($normalized -notmatch '^[0-9A-F]{40}$') { throw 'RDP signing thumbprint is invalid: it must be 40 hex characters (SHA-1).' }
        $certificate = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object { $_.Thumbprint -eq $normalized } | Select-Object -First 1
        if (-not $certificate) { throw 'The configured RDP signing certificate is not installed in LocalMachine\My on this device.' }
        Test-SigningCertificate $certificate 'configured'
        return [pscustomobject]@{ Thumbprint = $normalized; Subject = $certificate.Subject; NotAfter = $certificate.NotAfter; Source = 'thumbprint' }
    }
    if (-not $templateName) { throw 'No RDP signing certificate is configured: set # SirkRdpSigningThumbprint or # SirkCaTemplate in the script header, or a default in the CA integration.' }
    if ($templateName -notmatch '^[A-Za-z0-9][A-Za-z0-9 ._-]{0,127}$') { throw 'The certificate template name is invalid.' }
    $wanted = $templateName.ToLowerInvariant()
    $compact = $wanted -replace ' ', ''
    $now = Get-Date
    $matching = @()
    foreach ($item in @(Get-ChildItem -Path Cert:\LocalMachine\My)) {
        if (-not $item.HasPrivateKey -or $item.NotBefore -gt $now -or $item.NotAfter -le $now) { continue }
        foreach ($name in @(Get-CertificateTemplateNames $item)) {
            $lower = $name.ToLowerInvariant()
            if ($lower -eq $wanted -or ($lower -replace ' ', '') -eq $compact) { $matching += $item; break }
        }
    }
    $candidates = @($matching | Sort-Object -Property NotAfter -Descending)
    if ($candidates.Count -eq 0) { throw ("No valid certificate with a private key from template '{0}' is installed in LocalMachine\My on this device (check autoenrollment)." -f $templateName) }
    $certificate = $candidates[0]
    Test-SigningCertificate $certificate ('template ' + $templateName)
    return [pscustomobject]@{ Thumbprint = $certificate.Thumbprint.ToUpperInvariant(); Subject = $certificate.Subject; NotAfter = $certificate.NotAfter; Source = ('template ' + $templateName) }
}

function New-RdpContent([string]$HostName) {
    @(
        "full address:s:$HostName",
        "alternate full address:s:$HostName",
        'enablerdsaadauth:i:1',
        'authentication level:i:2',
        'prompt for credentials:i:1',
        'enablecredsspsupport:i:1',
        'redirectclipboard:i:1',
        'redirectwebauthn:i:1',
        'redirectsmartcards:i:0',
        'redirectprinters:i:0',
        'drivestoredirect:s:',
        'devicestoredirect:s:',
        'usbdevicestoredirect:s:',
        'use multimon:i:1',
        'remoteapplicationmode:i:0'
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
$signer = Get-SigningCertificate (Get-Setting 'SirkRdpSigningThumbprint') (Get-Setting 'SirkCaTemplate')
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
    Write-Output ("Target: {0} | User: {1} | Signer: {2} [{3}] (valid to {4:yyyy-MM-dd}, selected by {5})" -f $targetHost, $desktop.Account, $signer.Subject, $signer.Thumbprint, $signer.NotAfter, $signer.Source)
} finally {
    if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue }
}
