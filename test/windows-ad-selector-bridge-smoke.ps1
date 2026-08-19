$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$bridge = Join-Path $root 'server\core\ad-directory-query.ps1'
if (-not (Test-Path -LiteralPath $bridge)) { throw 'AD selector bridge is missing.' }

$tokens = $null
$errors = $null
[void][System.Management.Automation.Language.Parser]::ParseFile($bridge, [ref]$tokens, [ref]$errors)
if ($errors.Count -gt 0) {
    throw ('AD selector bridge has PowerShell parser errors: ' + (($errors | ForEach-Object { $_.Message }) -join '; '))
}

$source = [IO.File]::ReadAllText($bridge)
if ($source -match 'Import-Module\s+ActiveDirectory' -or $source -match '\bGet-ADUser\b') {
    throw 'AD selector bridge still imports the ActiveDirectory PowerShell module or uses Get-ADUser.'
}
if ($source -notmatch 'System\.DirectoryServices\.DirectoryEntry' -or $source -notmatch 'System\.DirectoryServices\.DirectorySearcher') {
    throw 'AD selector bridge does not use the bounded DirectoryServices query path.'
}
if ($source -notmatch '\$ProgressPreference\s*=\s*''SilentlyContinue''') {
    throw 'AD selector bridge does not suppress progress output.'
}
if ($source -notmatch 'OpenStandardOutput' -or $source -notmatch 'Encoding\]::UTF8\.GetBytes') {
    throw 'AD selector bridge does not own explicit UTF-8 machine output.'
}

if ($null -eq ([type]'System.DirectoryServices.DirectoryEntry')) { throw 'System.DirectoryServices.DirectoryEntry is unavailable.' }
if ($null -eq ([type]'System.DirectoryServices.DirectorySearcher')) { throw 'System.DirectoryServices.DirectorySearcher is unavailable.' }

Write-Host 'Windows PowerShell AD selector bridge parse/stream smoke: OK'
