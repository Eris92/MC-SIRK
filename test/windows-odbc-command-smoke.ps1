$ErrorActionPreference = 'Stop'

$command = & node (Join-Path $PSScriptRoot 'odbc-command-contract.test.js') --print-script
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($command)) {
    throw 'Unable to load the validated ODBC preset.'
}

$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseInput($command, [ref]$tokens, [ref]$errors) | Out-Null
if ($errors.Count -ne 0) {
    throw ('Invalid ODBC PowerShell syntax: ' + ($errors | ForEach-Object { $_.Message }) -join '; ')
}

$script:scenario = ''
$script:launchCalls = 0

function Test-Path {
    [CmdletBinding()]
    param([string]$LiteralPath, [string]$PathType)
    if (-not $LiteralPath.EndsWith('\SysWOW64\odbcad32.exe', [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Unexpected ODBC executable path.'
    }
    return $script:scenario -ne 'missing'
}

function Start-Process {
    [CmdletBinding()]
    param([string]$FilePath, [string]$Verb, [switch]$PassThru)
    $script:launchCalls++
    if (-not $FilePath.EndsWith('\SysWOW64\odbcad32.exe', [StringComparison]::OrdinalIgnoreCase) -or
        $Verb -ne 'RunAs' -or -not $PassThru) {
        throw 'Unexpected ODBC launch arguments.'
    }
    if ($script:scenario -eq 'deny') {
        throw ([System.ComponentModel.Win32Exception]::new(1223))
    }
    return [pscustomobject]@{ Id = 12345 }
}

$script:scenario = 'missing'
try {
    & ([scriptblock]::Create($command)) | Out-Null
    throw 'Missing ODBC executable did not cause a failure.'
} catch {
    if ($_.Exception.Message -notlike '*executable was not found*') { throw }
}
if ($script:launchCalls -ne 0) {
    throw 'Missing ODBC executable must fail before launch.'
}

$script:scenario = 'deny'
try {
    & ([scriptblock]::Create($command)) | Out-Null
    throw 'Denied UAC consent did not cause a failure.'
} catch {
    if ($_.Exception.Message -notlike '*administrator launch denied or failed*') { throw }
}
if ($script:launchCalls -ne 1) {
    throw 'Denied UAC consent must invoke exactly one elevation request.'
}

$script:scenario = 'success'
$output = & ([scriptblock]::Create($command))
if ($script:launchCalls -ne 2 -or $null -ne $output) {
    throw 'Successful UAC launch did not return the expected result.'
}


# Validate the exact native CMD wrapper using harmless exit-code substitutes.
$nativeCmd = & node (Join-Path $PSScriptRoot 'odbc-command-contract.test.js') --print-cmd
if ($LASTEXITCODE -ne 0 -or -not $nativeCmd) {
    throw 'Unable to read the native CMD ODBC preset.'
}
$probePath = Join-Path $env:TEMP ('SIRK-ODBC-Probe-' + [guid]::NewGuid().ToString('N') + '.cmd')
try {
    [IO.File]::WriteAllText($probePath, $nativeCmd.Replace($command, 'exit 19'), [Text.Encoding]::ASCII)
    & $env:ComSpec '/d' '/c' $probePath | Out-Null
    if ($LASTEXITCODE -ne 1) {
        throw ('CMD wrapper failed to propagate a failed UAC launch. Exit code: ' + $LASTEXITCODE)
    }
    [IO.File]::WriteAllText($probePath, $nativeCmd.Replace($command, 'exit 0'), [Text.Encoding]::ASCII)
    & $env:ComSpec '/d' '/c' $probePath | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw ('CMD wrapper incorrectly rejected successful launch. Exit code: ' + $LASTEXITCODE)
    }
} finally {
    Remove-Item -LiteralPath $probePath -Force -ErrorAction SilentlyContinue
}

Write-Output 'ODBC native CMD start, PowerShell syntax, UAC denial and success smoke: OK'
