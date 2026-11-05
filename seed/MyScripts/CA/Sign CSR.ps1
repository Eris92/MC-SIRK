# PL: Podpisz CSR | Wysyła wskazany plik CSR (PKCS#10) do skonfigurowanego urzędu Enterprise CA i zwraca wydany certyfikat do pobrania.
# EN: Sign CSR | Submits the selected PKCS#10 CSR to the configured Enterprise CA and returns the issued certificate for download.
# Approval: false
# SirkSystemCredential: CA
# SirkCaTemplate:
# VariableFileRequiredPL: $CsrFile=csr, Plik CSR | Jeden plik PKCS#10 w formacie PEM lub DER, maks. 32 KB
# VariableFileRequiredEN: $CsrFile=csr, CSR file | One PKCS#10 file in PEM or DER format, max 32 KB

# #407. Runs server-side through the My Scripts executor.
# - $CsrFile is a server-controlled path to a CSR already validated by the server
#   (structure, supported algorithm, proof-of-possession signature).
# - CA config comes from the global CA integration (MYSCRIPTS_CA_CONFIG). The template
#   (MYSCRIPTS_CA_TEMPLATE) is the SirkCaTemplate header above when set, otherwise the
#   global default template; nothing is hard-coded.
# - certreq.exe receives every value as a separate argument; no command string is built.
# - The issued certificate is written to MYSCRIPTS_OUTPUT_DIR; the server verifies that its
#   public key matches the CSR and that the issuer is the configured CA before offering it.
# - Pending, denied or ambiguous CA answers fail closed. The CSR body is never printed.
# - certreq runs as the MeshCentral service identity; that account needs Enroll rights on the template.

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$caConfig = [string]$env:MYSCRIPTS_CA_CONFIG
$template = [string]$env:MYSCRIPTS_CA_TEMPLATE
$outputDirectory = [string]$env:MYSCRIPTS_OUTPUT_DIR
$csrPath = [string](Get-Variable -Name CsrFile -ValueOnly -ErrorAction SilentlyContinue)

if ([string]::IsNullOrWhiteSpace($caConfig)) { throw 'The CA integration is not configured (CA config is empty).' }
if ([string]::IsNullOrWhiteSpace($template)) { throw 'No certificate template: set # SirkCaTemplate in the script header or a default template in the CA integration.' }
if ($template -notmatch '^[A-Za-z0-9][A-Za-z0-9 ._-]{0,127}$') { throw 'The configured certificate template name is invalid.' }
if ([string]::IsNullOrWhiteSpace($outputDirectory) -or -not (Test-Path -LiteralPath $outputDirectory -PathType Container)) { throw 'The server did not provide an output directory.' }
if ([string]::IsNullOrWhiteSpace($csrPath) -or -not (Test-Path -LiteralPath $csrPath -PathType Leaf)) { throw 'The uploaded CSR is not available.' }

$certreq = Join-Path $env:SystemRoot 'System32\certreq.exe'
if (-not (Test-Path -LiteralPath $certreq -PathType Leaf)) { throw 'certreq.exe is not available on the MeshCentral server.' }

$work = Join-Path $outputDirectory ('req-' + [guid]::NewGuid().ToString('N'))
try {
    [void](New-Item -ItemType Directory -Path $work)
    $request = Join-Path $work 'request.req'
    $issued = Join-Path $work 'issued.cer'
    $chain = Join-Path $work 'chain.p7b'
    $response = Join-Path $work 'response.rsp'
    Copy-Item -LiteralPath $csrPath -Destination $request

    $arguments = @('-submit', '-q', '-config', $caConfig, '-attrib', ('CertificateTemplate:' + $template), $request, $issued, $chain, $response)
    $answer = & $certreq @arguments 2>&1 | Out-String
    $exitCode = $LASTEXITCODE
    $requestId = if ($answer -match 'RequestId:\s*"?(\d+)') { $Matches[1] } else { '' }

    if ($answer -match '(?i)pending|taken under submission') {
        throw ("The CA left the request pending (RequestId {0}). No certificate was issued." -f $requestId)
    }
    if ($answer -match '(?i)denied') {
        throw ("The CA denied the request (RequestId {0})." -f $requestId)
    }
    if ($exitCode -ne 0) {
        $reason = (($answer -split "`r?`n") | Where-Object { $_ -match '(?i)error|0x[0-9a-f]{8}' } | Select-Object -First 3) -join ' '
        throw ("certreq.exe failed with exit code {0}. {1}" -f $exitCode, $reason).Trim()
    }
    if (-not (Test-Path -LiteralPath $issued -PathType Leaf) -or (Get-Item -LiteralPath $issued).Length -eq 0) {
        throw 'The CA did not return a certificate.'
    }

    $certificate = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($issued)
    $fileName = 'certificate-' + ($certificate.SerialNumber -replace '[^0-9A-Fa-f]', '') + '.cer'
    [System.IO.File]::WriteAllBytes((Join-Path $outputDirectory $fileName), $certificate.RawData)

    Write-Output 'Certificate issued.'
    Write-Output ("CA request ID: {0}" -f $requestId)
    Write-Output ("Serial number: {0}" -f $certificate.SerialNumber)
    Write-Output ("Valid until: {0:yyyy-MM-dd HH:mm}" -f $certificate.NotAfter)
} finally {
    if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue }
}
