# PL: Podpisz plik RDP (etap serwerowy) | Etap serwerowy polecenia „Podpisany plik RDP”: tworzy i podpisuje plik .rdp na serwerze MeshCentral.
# EN: Sign RDP file (server stage) | Server stage of the "Signed RDP file" command: builds and signs the .rdp file on the MeshCentral server.
# Approval: false
# SirkStageFor: MyCommands

# Internal (_ prefix): not listed in My Scripts; started only by My Commands scripts
# that declare `# SirkServerStage: CA/_Sign RDP file.ps1`.
# - Runs on the MeshCentral server as the MeshCentral service identity; the signing
#   certificate (with private key) must be in LocalMachine\My on the server.
# - Certificate: MYSCRIPTS_RDP_SIGNING_THUMBPRINT when set, otherwise the newest valid
#   certificate from template MYSCRIPTS_CA_TEMPLATE (autoenrollment / renewal friendly).
#   Both come from the calling My Commands script (its SirkRdpSigningThumbprint /
#   SirkCaTemplate headers) or the global CA defaults.
# - Target host: the command's TargetHost variable, otherwise the target device name
#   resolved through DNS. Values arrive as JSON environment variables, never as code.
# - The single signed file is written to MYSCRIPTS_OUTPUT_DIR; the server passes it
#   to the agent-side script, which only saves it on the user's Desktop.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Test-HostName([string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value) -or $Value.Length -gt 253) { return $false }
    if ($Value -match '[\x00-\x1F\x7F]') { return $false }
    if ($Value -match '^\d{1,3}(\.\d{1,3}){3}$') { return $true }
    return $Value -match '^(?=.{1,253}$)([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$'
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
            # When Format() shows only the OID, ask CryptoAPI/AD for the template's friendly name.
            foreach ($templateOid in @($names | Where-Object { $_ -match '^1\.3\.6\.1\.4\.1\.311\.21\.8\.' })) {
                $friendly = try { [string](New-Object System.Security.Cryptography.Oid($templateOid)).FriendlyName } catch { '' }
                if ($friendly -and $friendly -ne $templateOid) { $names += $friendly }
            }
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
    if ($candidates.Count -eq 0) {
        # Show what is installed so a template name mismatch is visible (no secrets: subject, template, validity).
        $found = @(Get-ChildItem -Path Cert:\LocalMachine\My | Sort-Object -Property NotAfter -Descending | Select-Object -First 10 | ForEach-Object {
            $templates = @(Get-CertificateTemplateNames $_) -join ' / '
            if (-not $templates) { $templates = 'no template' }
            "{0} [{1}] key={2} valid {3:yyyy-MM-dd}..{4:yyyy-MM-dd} {5}" -f $_.Subject, $templates, $_.HasPrivateKey, $_.NotBefore, $_.NotAfter, $_.Thumbprint
        })
        $list = if ($found.Count) { "`r`nCertificates in LocalMachine\My on {0}:`r`n  {1}" -f $env:COMPUTERNAME, ($found -join "`r`n  ") } else { "`r`nLocalMachine\My on {0} is empty." -f $env:COMPUTERNAME }
        throw ("No valid certificate with a private key from template '{0}' is installed in LocalMachine\My on {1} (check the template name and autoenrollment).{2}" -f $templateName, $env:COMPUTERNAME, $list)
    }
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

$variables = try { [string]$env:SIRK_STAGE_VARIABLES_JSON | ConvertFrom-Json } catch { $null }
$node = try { [string]$env:SIRK_STAGE_NODE_JSON | ConvertFrom-Json } catch { $null }
$outputDirectory = [string]$env:MYSCRIPTS_OUTPUT_DIR
if ([string]::IsNullOrWhiteSpace($outputDirectory) -or -not (Test-Path -LiteralPath $outputDirectory -PathType Container)) { throw 'The server did not provide an output directory.' }

$targetHost = if ($variables -and $variables.TargetHost) { ([string]$variables.TargetHost).Trim() } else { '' }
if (-not $targetHost) {
    $deviceName = if ($node -and $node.name) { ([string]$node.name).Trim() } else { '' }
    if (-not $deviceName) { throw 'The target device has no name; set Target host.' }
    $targetHost = try { [System.Net.Dns]::GetHostEntry($deviceName).HostName } catch { $deviceName }
}
$targetHost = $targetHost.TrimEnd('.')
if (-not (Test-HostName $targetHost)) { throw ("Invalid target host name '{0}'. Set Target host to a DNS name or IPv4 address." -f $targetHost) }

if (-not [string]$env:MYSCRIPTS_CA_CONFIG) { throw 'The CA integration is not configured. Configure it in SIRK settings and assign the CA profile to this command.' }
$signer = Get-SigningCertificate ([string]$env:MYSCRIPTS_RDP_SIGNING_THUMBPRINT) ([string]$env:MYSCRIPTS_CA_TEMPLATE)
$rdpsign = Join-Path $env:SystemRoot 'System32\rdpsign.exe'
if (-not (Test-Path -LiteralPath $rdpsign -PathType Leaf)) { throw 'rdpsign.exe is not available on the MeshCentral server.' }

$work = Join-Path ([System.IO.Path]::GetTempPath()) ('sirk-rdp-' + [guid]::NewGuid().ToString('N'))
$fileName = ($targetHost -replace '[^A-Za-z0-9.-]', '_') + '.rdp'
try {
    [void](New-Item -ItemType Directory -Path $work)
    $temporaryFile = Join-Path $work $fileName
    [System.IO.File]::WriteAllText($temporaryFile, (New-RdpContent $targetHost) + "`r`n", [System.Text.Encoding]::Unicode)
    $signOutput = & $rdpsign /sha256 $signer.Thumbprint $temporaryFile 2>&1
    if ($LASTEXITCODE -ne 0) { throw ("rdpsign.exe failed with exit code {0}: {1}" -f $LASTEXITCODE, (($signOutput | Out-String).Trim())) }
    $signed = [System.IO.File]::ReadAllText($temporaryFile)
    if ($signed -notmatch '(?m)^signscope:s:' -or $signed -notmatch '(?m)^signature:s:\S+') { throw 'The RDP file was not signed.' }
    if ($signed -notmatch ('(?m)^full address:s:' + [regex]::Escape($targetHost) + '\r?$')) { throw 'Signed RDP file does not contain the expected target.' }
    Copy-Item -LiteralPath $temporaryFile -Destination (Join-Path $outputDirectory $fileName)
    Write-Output ("Signed on {0}: {1} | Signer: {2} [{3}] (valid to {4:yyyy-MM-dd}, selected by {5})" -f $env:COMPUTERNAME, $fileName, $signer.Subject, $signer.Thumbprint, $signer.NotAfter, $signer.Source)
} finally {
    if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue }
}
