$ErrorActionPreference = 'Stop'

$script = & node (Join-Path $PSScriptRoot 'server-time-sync.test.js') --print-script
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($script)) {
    throw 'Cannot generate the trusted Windows server time sync command.'
}

$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseInput($script, [ref]$tokens, [ref]$errors)
if ($errors.Count -ne 0) {
    throw ('Invalid PowerShell 5.1 syntax: ' + (($errors | ForEach-Object { $_.Message }) -join '; '))
}

$commandNames = @($ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.CommandAst] }, $true) |
    ForEach-Object { $_.GetCommandName() })
if ($commandNames -notcontains 'Set-TimeZone' -or $commandNames -notcontains 'Get-TimeZone' -or
    $commandNames -notcontains 'Get-Date' -or $commandNames -notcontains 'Add-Type') {
    throw 'Windows clock precheck/read-back commands are missing.'
}
if ($script -notmatch 'SetSystemTime\(\[ref\]\$native\)' -or $script -notmatch 'partial-failure') {
    throw 'UTC-native and partial-failure contracts are missing.'
}

Write-Output 'Windows PowerShell 5.1 server clock script parser and contract: OK (read-only)'
